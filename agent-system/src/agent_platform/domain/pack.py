from pathlib import Path
from typing import List, Dict, Any, Optional
import yaml
from pydantic import BaseModel, Field

class PromptConfig(BaseModel):
    system: str = "prompts/system.md"
    critic: str = "prompts/critic.md"
    version: str = "1.0.0"

class SourceConfig(BaseModel):
    path: str = "corpus/"
    loader: str = "auto"
    chunker: str = "markdown"

class RetrievalConfig(BaseModel):
    top_k: int = 4
    candidate_pool: int = 12
    dense_weight: float = 0.7
    sparse_weight: float = 0.3
    reranker: str = "none"

class KnowledgeConfig(BaseModel):
    sources: List[SourceConfig] = Field(default_factory=list)
    retrieval: RetrievalConfig = Field(default_factory=RetrievalConfig)

class ToolsConfig(BaseModel):
    module: str = "tools.py"
    enabled: List[str] = Field(default_factory=list)

class GuardConfig(BaseModel):
    sanitizer: bool = True
    pii_packs: List[str] = Field(default_factory=lambda: ["vn_decree13"])
    injection_check: str = "regex_and_heuristic"

class LimitsConfig(BaseModel):
    max_steps: int = 8
    max_critic_cycles: int = 2
    grounding_threshold: float = 0.75
    context_token_budget: int = 16000

class EvalsConfig(BaseModel):
    golden: str = "evals/golden.jsonl"

class DomainPack(BaseModel):
    name: str
    version: str = "1.0.0"
    locale: str = "vi-VN"
    description: str = ""
    roles: List[str] = Field(default_factory=lambda: ["guest", "customer", "admin"])
    prompts: PromptConfig = Field(default_factory=PromptConfig)
    knowledge: KnowledgeConfig = Field(default_factory=KnowledgeConfig)
    tools: ToolsConfig = Field(default_factory=ToolsConfig)
    policies: str = "policies.yaml"
    guards: GuardConfig = Field(default_factory=GuardConfig)
    limits: LimitsConfig = Field(default_factory=LimitsConfig)
    evals: EvalsConfig = Field(default_factory=EvalsConfig)

    # Runtime path to domain directory
    pack_dir: Optional[Path] = None

    def get_system_prompt(self) -> str:
        """Reads system prompt content from disk."""
        if not self.pack_dir:
            return "You are an enterprise AI assistant."
        prompt_file = self.pack_dir / self.prompts.system
        if prompt_file.exists():
            return prompt_file.read_text(encoding="utf-8")
        return "You are an enterprise AI assistant."

    def get_critic_prompt(self) -> str:
        """Reads critic prompt content from disk."""
        if not self.pack_dir:
            return "Evaluate the grounding and truthfulness of the response."
        prompt_file = self.pack_dir / self.prompts.critic
        if prompt_file.exists():
            return prompt_file.read_text(encoding="utf-8")
        return "Evaluate the grounding and truthfulness of the response."

    @classmethod
    def load_from_dir(cls, domain_dir: str | Path) -> "DomainPack":
        """Loads domain pack metadata from domain.yaml within target directory."""
        dir_path = Path(domain_dir).resolve()
        if not dir_path.is_dir():
            raise FileNotFoundError(f"Domain pack directory not found: {dir_path}")

        yaml_file = dir_path / "domain.yaml"
        if not yaml_file.exists():
            raise FileNotFoundError(f"domain.yaml missing in {dir_path}")

        with open(yaml_file, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            if not isinstance(data, dict):
                raise ValueError(f"Invalid domain.yaml format in {dir_path}")

        pack = cls(**data)
        pack.pack_dir = dir_path
        return pack
