
# app/curriculum/llm_client.py

import os
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_LLM_URL = os.getenv("BASE_LLM_URL", "http://localhost:11434")  # Default Ollama port
LLM_MODEL = os.getenv("LLM_MODEL", "hf.co/unsloth/gemma-3n-E2B-it-GGUF")  # Gemma 3n E2B IT model

def query_llm(prompt: str) -> str:
    """Sends a prompt to Ollama and returns the response."""
    headers = {"Content-Type": "application/json"}
    data = {
        "model": LLM_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.7,
        }
    }

    try:
        response = requests.post(f"{BASE_LLM_URL}/api/generate", headers=headers, json=data)
        response.raise_for_status()
        
        json_response = response.json()

        if "response" not in json_response:
            error_details = json_response.get("error", str(json_response))
            raise RuntimeError(f"Ollama API returned no response. Details: {error_details}")

        return json_response["response"].strip()

    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Failed to connect to Ollama: {e}") from e
    except KeyError as e:
        raise RuntimeError(f"Unexpected Ollama API response format. Missing key: {e}") from e
