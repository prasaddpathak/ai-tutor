#!/usr/bin/env python3
"""Test script for the updated Ollama LLM integration."""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from backend.core.curriculum.llm_client import query_llm
    
    print("Testing Ollama LLM integration...")
    print("=" * 50)
    
    # Simple test prompt
    test_prompt = "What is 2 + 2? Answer in one sentence."
    
    print(f"Prompt: {test_prompt}")
    print("-" * 30)
    
    try:
        response = query_llm(test_prompt)
        print(f"Response: {response}")
        print("\n[SUCCESS] LLM integration test successful!")
        
    except Exception as e:
        print(f"[ERROR] LLM integration test failed: {str(e)}")
        print("\nTroubleshooting tips:")
        print("1. Make sure Ollama is running: ollama serve")
        print("2. Pull the model: ollama pull gemma-3n-e2b-it")
        print("3. Check if model exists: ollama list")
        
except ImportError as e:
    print(f"[ERROR] Import error: {e}")
    print("Make sure you're running from the correct directory.")