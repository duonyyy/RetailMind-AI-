"""RetailMind AI — Enterprise Agentic AI Platform v3.

Production Gateway with ADR-007 Polyglot & 10-Layer Harness.
Drop-in replacement for apps/agent serving Next.js Frontend Client (apps/frontend).
"""

import os
import sys
from pathlib import Path

# Ensure 'src' directory is in python path
SRC_DIR = Path(__file__).resolve().parent / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from agent_platform.config.loader import load_settings
from agent_platform.domain.pack import DomainPack
from agent_platform.api.app import create_app

# 1. Load platform settings
settings = load_settings(env=os.getenv("PLATFORM_ENV", "dev"))

# 2. Load domain pack (default: retail_store)
domain_name = os.getenv("DEFAULT_DOMAIN", "retail_store")
domain_dir = Path(__file__).resolve().parent / "domains" / domain_name

if not domain_dir.exists():
    domain_dir = Path(__file__).resolve().parent / "domains" / "retail_store"

pack = DomainPack.load_from_dir(domain_dir)

# 3. Create hardened enterprise application
app = create_app(settings=settings, pack=pack)

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("APP_HOST", settings.app.host)
    port = int(os.getenv("APP_PORT", str(settings.app.port)))
    uvicorn.run("main:app", host=host, port=port, reload=True)
