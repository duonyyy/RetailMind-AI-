import json
import time
from typing import Dict, Any

def format_sse_event(event_name: str, payload: Dict[str, Any], version: str = "1.0") -> str:
    """Formats standardized SSE event with versioning and timestamp."""
    envelope = {
        "version": version,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "payload": payload,
    }
    return f"event: {event_name}\ndata: {json.dumps(envelope, default=str)}\n\n"
