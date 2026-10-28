import os
from decimal import Decimal
from typing import Literal, List, Dict
from pydantic import BaseModel, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class AppSettings(BaseModel):
    name: str = "RetailMind AI Platform"
    version: str = "3.0.0"
    env: Literal["dev", "test", "prod"] = "dev"
    domain: str = "retail_store"
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: List[str] = Field(default_factory=lambda: ["*"])
    trusted_proxies: List[str] = Field(default_factory=lambda: ["127.0.0.1"])

class HarnessSettings(BaseModel):
    max_steps: int = Field(default=8, ge=1, le=50)
    max_critic_cycles: int = Field(default=2, ge=0, le=10)
    grounding_threshold: float = Field(default=0.75, ge=0.0, le=1.0)
    context_token_budget: int = Field(default=16000, ge=1024)
    hedge_delay_seconds: float = Field(default=1.5, ge=0.1)
    circuit_failure_threshold: int = Field(default=3, ge=1)
    circuit_reset_seconds: int = Field(default=30, ge=1)
    rate_limit_requests: int = Field(default=60, ge=1)
    rate_limit_window_seconds: int = Field(default=60, ge=1)

class PersistenceSettings(BaseModel):
    adapter: Literal["memory", "sqlite", "postgres", "redis"] = Field(
        default_factory=lambda: os.getenv("PERSISTENCE_ADAPTER", os.getenv("PERSISTENCE__ADAPTER", "memory"))
    )
    sqlite_path: str = Field(
        default_factory=lambda: os.getenv("SQLITE_PATH", os.getenv("PERSISTENCE_SQLITE_PATH", "agent_data.db"))
    )
    postgres_url: str = Field(
        default_factory=lambda: os.getenv("POSTGRES_URL", os.getenv("PERSISTENCE_POSTGRES_URL", ""))
    )
    redis_url: str = Field(
        default_factory=lambda: os.getenv("REDIS_URL", os.getenv("PERSISTENCE_REDIS_URL", ""))
    )

class LLMSettings(BaseModel):
    provider: Literal["scripted", "mock", "openai_compat", "gemini"] = "scripted"
    model_name: str = "default"
    temperature: float = Field(default=0.0, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2048, ge=64)
    timeout_seconds: float = Field(default=20.0, ge=1.0)
    base_url: str = ""
    api_key: str = ""

class TokenPrice(BaseModel):
    input_per_1k: Decimal = Decimal("0.0")
    output_per_1k: Decimal = Decimal("0.0")

class FeatureFlags(BaseModel):
    enable_pii_masking: bool = True
    enable_sanitizer: bool = True
    enable_injection_guard: bool = True
    enable_hitl: bool = True
    enable_rate_limiter: bool = True
    enable_cache: bool = True

class PlatformSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_nested_delimiter="__",
        extra="ignore",
    )

    app: AppSettings = Field(default_factory=AppSettings)
    harness: HarnessSettings = Field(default_factory=HarnessSettings)
    persistence: PersistenceSettings = Field(default_factory=PersistenceSettings)
    llm: LLMSettings = Field(default_factory=LLMSettings)
    pricing: Dict[str, TokenPrice] = Field(default_factory=dict)
    feature_flags: FeatureFlags = Field(default_factory=FeatureFlags)

    @model_validator(mode="after")
    def validate_production_constraints(self) -> "PlatformSettings":
        """Enforces DoD Phase 0: Production environment cannot run on mock/scripted or memory persistence."""
        if self.app.env == "prod":
            if self.llm.provider in ("scripted", "mock"):
                raise ValueError(
                    f"Production environment 'prod' cannot use mock or scripted LLM provider! "
                    f"Got llm.provider='{self.llm.provider}'."
                )
            if self.persistence.adapter == "memory":
                raise ValueError(
                    "Production environment 'prod' cannot use in-memory persistence adapter! "
                    "Must configure 'postgres' or 'sqlite'."
                )
        return self
