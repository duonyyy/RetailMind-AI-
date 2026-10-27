from pathlib import Path
from typing import Dict, List, Optional
from agent_platform.domain.pack import DomainPack

class DomainRegistry:
    """Central registry holding all loaded Domain Packs."""

    def __init__(self, domains_dir: Optional[str | Path] = None) -> None:
        self._packs: Dict[str, DomainPack] = {}
        if domains_dir is not None:
            self.discover_and_load(domains_dir)

    def register(self, pack: DomainPack) -> None:
        """Registers a domain pack in memory."""
        self._packs[pack.name] = pack

    def get(self, name: str) -> Optional[DomainPack]:
        """Gets a domain pack by unique name."""
        return self._packs.get(name)

    def require(self, name: str) -> DomainPack:
        """Gets a domain pack by name or raises KeyError."""
        if name not in self._packs:
            raise KeyError(f"Domain pack '{name}' is not registered. Available: {list(self._packs.keys())}")
        return self._packs[name]

    def list_domains(self) -> List[str]:
        """Returns list of registered domain names."""
        return list(self._packs.keys())

    def discover_and_load(self, domains_dir: str | Path) -> int:
        """Discovers and loads all valid domain packs from a root directory."""
        root = Path(domains_dir).resolve()
        if not root.is_dir():
            return 0

        count = 0
        for item in root.iterdir():
            if item.is_dir() and (item / "domain.yaml").exists():
                pack = DomainPack.load_from_dir(item)
                self.register(pack)
                count += 1
        return count

# Global default registry instance
global_domain_registry = DomainRegistry()
