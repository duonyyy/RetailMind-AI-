import importlib.util
from pathlib import Path
from typing import Dict, List, Optional, Any
from agent_platform.harness.tools.spec import ToolSpec

class ToolRegistry:
    """Registry maintaining active ToolSpec instances for an execution context."""

    def __init__(self) -> None:
        self._tools: Dict[str, ToolSpec] = {}

    def register(self, spec: ToolSpec) -> None:
        """Registers a tool specification."""
        self._tools[spec.name] = spec

    def get(self, name: str) -> Optional[ToolSpec]:
        """Retrieves a tool by name."""
        return self._tools.get(name)

    def list_tools(self) -> List[str]:
        """Lists all registered tool names."""
        return list(self._tools.keys())

    def get_schemas(self, allowed_for_role: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns OpenAI-compatible schemas, optionally filtered by role."""
        schemas: List[Dict[str, Any]] = []
        for tool_spec in self._tools.values():
            if allowed_for_role is None or "*" in tool_spec.allowed_roles or allowed_for_role in tool_spec.allowed_roles:
                schemas.append(tool_spec.to_openai_schema())
        return schemas

    def load_from_module_file(self, file_path: str | Path) -> int:
        """Dynamically imports a Python module file and registers all declared ToolSpecs."""
        path = Path(file_path).resolve()
        if not path.is_file():
            return 0

        spec = importlib.util.spec_from_file_location(path.stem, str(path))
        if not spec or not spec.loader:
            return 0

        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        count = 0
        for attr_name in dir(mod):
            val = getattr(mod, attr_name)
            if isinstance(val, ToolSpec):
                self.register(val)
                count += 1
        return count
