"""
Translation service for educational content
Handles LLM-based translation of topics, chapters, and detailed content
"""

import json
import uuid
import logging
from typing import Dict, Optional, List
from .llm_client import query_llm
from .prompts import get_translation_prompt
from ..database import db

# Setup logging
logger = logging.getLogger(__name__)

class TranslationService:
    """Service for handling content translations."""
    
    def __init__(self):
        self.supported_languages = ['es']  # Spanish for now
    
    def translate_content(self, content_id: str, target_language: str = 'es', 
                         retry_count: int = 0, max_retries: int = 1) -> Optional[Dict]:
        """
        Translate content to target language with retry logic.
        
        Args:
            content_id: ID of the content to translate
            target_language: Target language code (default: 'es')
            retry_count: Current retry attempt
            max_retries: Maximum number of retries
            
        Returns:
            Dictionary with translation result or None on failure
        """
        if target_language not in self.supported_languages:
            logger.error(f"Unsupported target language: {target_language}")
            return None
        
        try:
            # Get the original content
            content_data = self._get_content_by_id(content_id)
            if not content_data:
                logger.error(f"Content not found: {content_id}")
                return None
            
            # Check if translation already exists and is completed
            existing_translation = db.get_content_translation(content_id, target_language)
            if existing_translation and existing_translation['translation_status'] == 'completed':
                logger.info(f"Translation already exists for {content_id} in {target_language}")
                return {
                    'content_id': content_id,
                    'language_code': target_language,
                    'translated_content': json.loads(existing_translation['translated_content_json']),
                    'status': 'completed'
                }
            
            # Update status to in_progress
            translation_id = existing_translation['id'] if existing_translation else str(uuid.uuid4())
            if not existing_translation:
                db.create_translation_entry(translation_id, content_id, target_language)
            
            db.update_translation_status(content_id, target_language, 'in_progress')
            logger.info(f"Starting translation for {content_id} to {target_language} (attempt {retry_count + 1})")
            
            # Generate translation prompt
            content_type = content_data['content_type']
            original_content = content_data['content_json']
            
            prompt = get_translation_prompt(content_type, original_content, target_language)
            
            # Call LLM for translation
            response = query_llm(prompt)
            
            # Parse and validate the translation
            translated_content = self._parse_translation_response(response, content_type)
            if not translated_content:
                raise ValueError("Failed to parse translation response")
            
            # Save the translation
            db.save_content_translation(
                translation_id=translation_id,
                content_id=content_id,
                language_code=target_language,
                translated_content_json=json.dumps(translated_content),
                translation_status='completed'
            )
            
            logger.info(f"Translation completed successfully for {content_id} to {target_language}")
            return {
                'content_id': content_id,
                'language_code': target_language,
                'translated_content': translated_content,
                'status': 'completed'
            }
            
        except Exception as e:
            logger.error(f"Translation failed for {content_id} to {target_language} (attempt {retry_count + 1}): {str(e)}")
            logger.error(f"Exception type: {type(e).__name__}")
            
            # Retry logic with exponential backoff
            if retry_count < max_retries:
                logger.info(f"Retrying translation for {content_id} (attempt {retry_count + 2}/{max_retries + 1})")
                # Small delay before retry (exponential backoff)
                import time
                time.sleep(min(2 ** retry_count, 10))  # Cap at 10 seconds
                return self.translate_content(content_id, target_language, retry_count + 1, max_retries)
            else:
                logger.error(f"Max retries ({max_retries + 1}) exceeded for {content_id} translation to {target_language}")
                # Update status to failed only after all retries
                db.update_translation_status(content_id, target_language, 'failed')
                return None
    
    def _get_content_by_id(self, content_id: str) -> Optional[Dict]:
        """Get content data by ID from database."""
        with db.get_connection() as conn:
            row = conn.execute('SELECT * FROM generated_content WHERE id = ?', (content_id,)).fetchone()
            return dict(row) if row else None
    
    def _parse_translation_response(self, response: str, content_type: str) -> Optional[Dict]:
        """Parse and validate translation response with focused strategies."""
        logger.info(f"Parsing response of length: {len(response)}")
        logger.debug(f"Response preview (first 500 chars): {response[:500]}")
        
        # Clean the response
        clean_response = response.strip()
        
        # List of strategies to try in order
        strategies = []
        
        # Strategy 1: Direct JSON parsing
        strategies.append(("direct", clean_response))
        
        # Strategy 2: Remove markdown code blocks (prioritize this since LLM keeps using them)
        if '```json' in clean_response:
            start_idx = clean_response.find('```json') + 7
            end_idx = clean_response.find('```', start_idx)
            if end_idx != -1:
                extracted_json = clean_response[start_idx:end_idx].strip()
                strategies.append(("markdown_json_block", extracted_json))
                logger.debug(f"Extracted from ```json block: {extracted_json[:200]}...")
        elif clean_response.startswith('```') and clean_response.endswith('```'):
            extracted_json = clean_response[3:-3].strip()
            strategies.append(("generic_markdown", extracted_json))
            logger.debug(f"Extracted from generic ``` block: {extracted_json[:200]}...")
        
        # Also try removing any ```json and ``` markers more aggressively
        if '```' in clean_response:
            # Remove all markdown code block markers
            no_markdown = clean_response.replace('```json', '').replace('```', '').strip()
            if no_markdown != clean_response:
                strategies.append(("strip_all_markdown", no_markdown))
        
        # Strategy 3: Extract JSON object/array based on content type
        if content_type == 'chapter_detail':
            # Look for the main JSON object containing page_1, page_2, etc.
            first_brace = clean_response.find('{')
            if first_brace != -1:
                # Find the closing brace that matches our expected structure
                # Look for the last occurrence of "chapter_summary" to find the end
                chapter_summary_idx = clean_response.rfind('"chapter_summary"')
                if chapter_summary_idx != -1:
                    # Find the end of the chapter_summary value
                    # Look for the closing quote and then the closing brace
                    remaining = clean_response[chapter_summary_idx:]
                    quote_start = remaining.find(':', remaining.find('"chapter_summary"')) + 1
                    if remaining[quote_start:].strip().startswith('"'):
                        quote_end = remaining.find('"', quote_start + 1)
                        if quote_end != -1:
                            # Found the end quote, now find the closing brace
                            potential_end = chapter_summary_idx + quote_end + 1
                            closing_brace = clean_response.find('}', potential_end)
                            if closing_brace != -1:
                                strategies.append(("extract_object_to_summary", clean_response[first_brace:closing_brace + 1]))
                
                # Fallback: find the last closing brace
                last_brace = clean_response.rfind('}')
                if last_brace > first_brace:
                    strategies.append(("extract_object_simple", clean_response[first_brace:last_brace + 1]))
        
        elif content_type in ['topics', 'chapters']:
            first_bracket = clean_response.find('[')
            last_bracket = clean_response.rfind(']')
            if first_bracket != -1 and last_bracket > first_bracket:
                strategies.append(("extract_array", clean_response[first_bracket:last_bracket + 1]))
        
        # Strategy 4: Fix common JSON issues
        import re
        # Remove control characters that break JSON
        cleaned_chars = re.sub(r'[\x00-\x1f\x7f-\x9f]', ' ', clean_response)
        if cleaned_chars != clean_response:
            strategies.append(("clean_control_chars", cleaned_chars))
            
            # Also try extracting from the cleaned version
            if content_type == 'chapter_detail':
                first_brace = cleaned_chars.find('{')
                last_brace = cleaned_chars.rfind('}')
                if first_brace != -1 and last_brace > first_brace:
                    strategies.append(("clean_and_extract_object", cleaned_chars[first_brace:last_brace + 1]))
        
        # Try each strategy
        for strategy_name, candidate_json in strategies:
            try:
                logger.info(f"Trying parsing strategy: {strategy_name}")
                logger.debug(f"Candidate JSON (first 300 chars): {candidate_json[:300]}")
                
                # Parse JSON
                translated_data = json.loads(candidate_json)
                
                # Validate structure based on content type
                validation_result = self._validate_translation_structure(translated_data, content_type)
                if validation_result['valid']:
                    logger.info(f"Successfully parsed using strategy: {strategy_name}")
                    return translated_data
                else:
                    logger.warning(f"Strategy {strategy_name} parsed JSON but failed validation: {validation_result['error']}")
                    continue
                    
            except json.JSONDecodeError as e:
                logger.debug(f"Strategy {strategy_name} failed JSON parsing: {str(e)}")
                continue
            except Exception as e:
                logger.debug(f"Strategy {strategy_name} failed with error: {str(e)}")
                continue
        
        # All strategies failed - provide detailed error info
        logger.error(f"All parsing strategies failed for response of length {len(response)}")
        logger.error(f"Response preview: {response[:1000]}")
        
        # Try to identify the specific issue
        try:
            # Check if it looks like valid JSON but has trailing content
            first_brace = response.find('{')
            if first_brace != -1:
                # Try to find where the main JSON object ends
                # Look for the last occurrence of "chapter_summary" to find the end
                potential_json = response[first_brace:]
                brace_count = 0
                end_idx = -1
                for i, char in enumerate(potential_json):
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            end_idx = first_brace + i + 1
                            break
                
                if end_idx != -1:
                    main_json = response[first_brace:end_idx]
                    remaining = response[end_idx:].strip()
                    logger.error(f"Found potential main JSON ending at position {end_idx}")
                    logger.error(f"Main JSON: {main_json[:300]}...")
                    logger.error(f"Remaining content: {remaining[:200]}...")
                    
                    # Try parsing just the main JSON
                    try:
                        parsed = json.loads(main_json)
                        validation_result = self._validate_translation_structure(parsed, content_type)
                        if validation_result['valid']:
                            logger.info("Successfully parsed main JSON object, ignoring trailing content")
                            return parsed
                    except Exception as parse_error:
                        logger.error(f"Even main JSON failed to parse: {parse_error}")
        except Exception as analysis_error:
            logger.error(f"Error during response analysis: {analysis_error}")
        
        return None
    
    def _validate_translation_structure(self, translated_data, content_type: str) -> Dict[str, any]:
        """Validate the structure of translated data."""
        try:
            if content_type == 'topics':
                if not isinstance(translated_data, list):
                    return {'valid': False, 'error': "Topics translation must be a JSON array"}
                if len(translated_data) == 0:
                    return {'valid': False, 'error': "Topics array cannot be empty"}
                for i, item in enumerate(translated_data):
                    if not isinstance(item, dict):
                        return {'valid': False, 'error': f"Topic {i} must be an object"}
                    if 'title' not in item:
                        return {'valid': False, 'error': f"Topic {i} missing 'title' field"}
                    if 'description' not in item:
                        return {'valid': False, 'error': f"Topic {i} missing 'description' field"}
            
            elif content_type == 'chapters':
                if not isinstance(translated_data, list):
                    return {'valid': False, 'error': "Chapters translation must be a JSON array"}
                if len(translated_data) == 0:
                    return {'valid': False, 'error': "Chapters array cannot be empty"}
                for i, item in enumerate(translated_data):
                    if not isinstance(item, dict):
                        return {'valid': False, 'error': f"Chapter {i} must be an object"}
                    if 'title' not in item:
                        return {'valid': False, 'error': f"Chapter {i} missing 'title' field"}
                    if 'content' not in item:
                        return {'valid': False, 'error': f"Chapter {i} missing 'content' field"}
            
            elif content_type == 'chapter_detail':
                if not isinstance(translated_data, dict):
                    return {'valid': False, 'error': "Chapter detail translation must be a JSON object"}
                required_keys = ['page_1', 'page_2', 'page_3', 'page_4', 'page_5', 'page_6', 'chapter_summary']
                missing_keys = [key for key in required_keys if key not in translated_data]
                if missing_keys:
                    return {'valid': False, 'error': f"Missing required keys: {missing_keys}"}
                
                # Log extra keys for debugging (but don't fail)
                extra_keys = [key for key in translated_data.keys() if key not in required_keys]
                if extra_keys:
                    logger.info(f"Translation contains extra keys (will be preserved): {extra_keys}")
            
            return {'valid': True, 'error': None}
            
        except Exception as e:
            return {'valid': False, 'error': f"Validation error: {str(e)}"}
    
    def queue_translation(self, content_id: str, target_language: str = 'es') -> str:
        """
        Queue a translation for processing.
        
        Args:
            content_id: ID of the content to translate
            target_language: Target language code
            
        Returns:
            Translation ID
        """
        translation_id = str(uuid.uuid4())
        db.create_translation_entry(translation_id, content_id, target_language)
        logger.info(f"Translation queued: {translation_id} for content {content_id} to {target_language}")
        return translation_id
    
    def get_translated_content(self, content_id: str, language_code: str) -> Optional[Dict]:
        """
        Get translated content if available.
        
        Args:
            content_id: ID of the original content
            language_code: Language code
            
        Returns:
            Translated content dictionary or None
        """
        translation = db.get_content_translation(content_id, language_code)
        if translation and translation['translation_status'] == 'completed':
            return {
                'content_id': content_id,
                'language_code': language_code,
                'translated_content': json.loads(translation['translated_content_json']),
                'status': 'completed'
            }
        return None
    
    def process_pending_translations(self, batch_size: int = 5) -> List[Dict]:
        """
        Process pending translations in batches.
        
        Args:
            batch_size: Number of translations to process in one batch
            
        Returns:
            List of processing results
        """
        pending_translations = db.get_pending_translations()
        results = []
        
        for translation in pending_translations[:batch_size]:
            content_id = translation['content_id']
            language_code = translation['language_code']
            
            logger.info(f"Processing pending translation: {content_id} to {language_code}")
            result = self.translate_content(content_id, language_code)
            results.append({
                'content_id': content_id,
                'language_code': language_code,
                'success': result is not None,
                'result': result
            })
        
        return results

# Global translation service instance
translation_service = TranslationService()