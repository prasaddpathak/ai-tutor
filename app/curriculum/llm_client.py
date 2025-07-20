
# app/curriculum/llm_client.py

import os
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_LLM_URL = os.getenv("BASE_LLM_URL")
if not BASE_LLM_URL:
    raise ValueError("BASE_LLM_URL not found in .env file")

def query_llm(prompt: str) -> str:
    """Sends a prompt to the local LLM and returns the response."""
    headers = {"Content-Type": "application/json"}
    data = {
        "model": "local-model",  # some local models require this
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
    }

    try:
        response = requests.post(f"{BASE_LLM_URL}/v1/chat/completions", headers=headers, json=data)
        response.raise_for_status()
        
        json_response = response.json()

        if "choices" not in json_response or not json_response["choices"]:
            error_details = json_response.get("error", {}).get("message", str(json_response))
            raise RuntimeError(f"LLM API returned no choices. Details: {error_details}")

        first_choice = json_response["choices"][0]
        if "message" not in first_choice or "content" not in first_choice["message"]:
            raise RuntimeError(f"LLM API response is malformed. Full response: {json_response}")

        return first_choice["message"]["content"]

    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Failed to connect to LLM: {e}") from e
    except KeyError as e:
        raise RuntimeError(f"Unexpected LLM API response format. Missing key: {e}") from e
