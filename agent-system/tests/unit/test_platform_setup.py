import os
from pathlib import Path
import pytest
from agent_platform.config.loader import load_settings
from agent_platform.config.settings import PlatformSettings
from agent_platform.domain.pack import DomainPack
from agent_platform.domain.registry import DomainRegistry

def test_load_settings_dev_default():
    """Verifies default settings load properly under dev environment."""
    settings = load_settings(env="dev")
    assert settings.app.env == "dev"
    assert settings.app.version == "3.0.0"
    assert settings.llm.provider == "scripted"
    assert settings.persistence.adapter == "memory"
    assert settings.harness.max_steps == 8

def test_load_settings_test_overlay():
    """Verifies test.yaml overlay applies properly."""
    settings = load_settings(env="test")
    assert settings.app.env == "test"
    assert settings.harness.max_steps == 4
    assert settings.harness.max_critic_cycles == 1

def test_production_lock_rejects_scripted_llm():
    """Enforces DoD: prod environment cannot run on scripted LLM."""
    with pytest.raises(ValueError, match="Production environment 'prod' cannot use mock or scripted LLM provider"):
        PlatformSettings(
            app={"env": "prod"},
            llm={"provider": "scripted"},
            persistence={"adapter": "postgres", "postgres_url": "postgresql://localhost/db"},
        )

def test_production_lock_rejects_memory_persistence():
    """Enforces DoD: prod environment cannot run on in-memory persistence."""
    with pytest.raises(ValueError, match="cannot use in-memory persistence adapter"):
        PlatformSettings(
            app={"env": "prod"},
            llm={"provider": "openai_compat"},
            persistence={"adapter": "memory"},
        )

def test_domain_pack_loading_retail_store():
    """Verifies that domains/retail_store loads cleanly with expected metadata."""
    template_root = Path(__file__).parents[2]
    retail_dir = template_root / "domains" / "retail_store"
    pack = DomainPack.load_from_dir(retail_dir)

    assert pack.name == "retail_store"
    assert pack.version == "1.0.0"
    assert "guest" in pack.roles
    assert "lookup_laptop_catalog" in pack.tools.enabled
    assert "request_return_or_refund" in pack.tools.enabled
    assert pack.limits.max_steps == 8

    # Check reading prompt from disk
    system_prompt = pack.get_system_prompt()
    assert "RetailMind AI" in system_prompt

def test_domain_registry_discovery():
    """Verifies discovery and registration of all available domains."""
    template_root = Path(__file__).parents[2]
    domains_dir = template_root / "domains"
    registry = DomainRegistry()
    count = registry.discover_and_load(domains_dir)

    assert count >= 1
    assert "retail_store" in registry.list_domains()
    pack = registry.require("retail_store")
    assert pack.name == "retail_store"

def test_zero_domain_in_core_platform():
    """
    CI Safety Gate (Principle 1):
    src/agent_platform/ MUST NOT contain hardcoded domain strings like 'Điều 301', 'BLDS 418', 'hoàn tiền'.
    """
    template_root = Path(__file__).parents[2]
    core_dir = template_root / "src" / "agent_platform"

    forbidden_domain_keywords = [
        "Điều 301",
        "Dieu 301",
        "BLDS 418",
        "hoàn tiền",
        "hoan tien",
        "IMEI",
        "laptop",
    ]

    violations = []
    for py_file in core_dir.rglob("*.py"):
        content = py_file.read_text(encoding="utf-8")
        for kw in forbidden_domain_keywords:
            if kw.lower() in content.lower():
                violations.append(f"{py_file.name} contains domain keyword '{kw}'")

    assert not violations, f"Violations found in core platform: {violations}"
