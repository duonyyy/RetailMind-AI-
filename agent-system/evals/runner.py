import json
import time
from pathlib import Path
from typing import Dict, Any, List
from agent_platform.harness.state.principal import Principal
from agent_platform.domain.pack import DomainPack
from agent_platform.harness import AgentHarness
from agent_platform.config.loader import load_settings
from evals.checks import DeterministicEvalChecks

class EvaluationRunner:
    """Automated benchmark driver executing golden datasets against AgentHarness."""

    def __init__(self, domain_name: str = "retail_store", env: str = "test") -> None:
        self.domain_name = domain_name
        self.settings = load_settings(env=env)
        root = Path(__file__).parents[1]
        domain_dir = root / "domains" / domain_name
        self.pack = DomainPack.load_from_dir(domain_dir)
        self.harness = AgentHarness(self.settings, self.pack)

    async def run(self) -> Dict[str, Any]:
        golden_file = self.pack.pack_dir / self.pack.evals.golden
        if not golden_file.exists():
            raise FileNotFoundError(f"Golden dataset missing: {golden_file}")

        cases: List[Dict[str, Any]] = []
        with open(golden_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    cases.append(json.loads(line))

        results: List[Dict[str, Any]] = []
        tools_passed = 0
        refusal_passed = 0
        approval_passed = 0
        all_passed = 0

        for case in cases:
            principal = Principal(user_id=f"eval_user_{case['id']}", role=case.get("role", "customer"))
            state = await self.harness.execute(query=case["input"], principal=principal)

            actual_tools = [e.tool_name for e in state.get("tool_events", [])]
            actual_calls = [{"name": e.tool_name, "arguments": e.arguments} for e in state.get("tool_events", [])]

            tool_ok = DeterministicEvalChecks.check_tools(actual_tools, case.get("expected_tools", []))
            args_ok = DeterministicEvalChecks.check_arguments(actual_calls, case.get("expected_args_subset"))
            refusal_ok = DeterministicEvalChecks.check_refusal(state.get("status", ""), case.get("must_refuse", False))
            approval_ok = DeterministicEvalChecks.check_approval(state.get("status", ""), case.get("must_require_approval", False))
            citation_ok = DeterministicEvalChecks.check_citation(state.get("evidence", []), case.get("must_cite", False))

            is_case_success = tool_ok and args_ok and refusal_ok and approval_ok and citation_ok
            if tool_ok:
                tools_passed += 1
            if refusal_ok:
                refusal_passed += 1
            if approval_ok:
                approval_passed += 1
            if is_case_success:
                all_passed += 1

            results.append({
                "id": case["id"],
                "input": case["input"],
                "passed": is_case_success,
                "tool_ok": tool_ok,
                "refusal_ok": refusal_ok,
                "approval_ok": approval_ok,
                "citation_ok": citation_ok,
                "status": state.get("status"),
            })

        total = len(cases)
        summary = {
            "domain": self.domain_name,
            "total_cases": total,
            "passed_cases": all_passed,
            "pass_rate": round(all_passed / total, 4) if total > 0 else 0.0,
            "tool_selection_accuracy": round(tools_passed / total, 4) if total > 0 else 0.0,
            "refusal_accuracy": round(refusal_passed / total, 4) if total > 0 else 0.0,
            "approval_accuracy": round(approval_passed / total, 4) if total > 0 else 0.0,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "details": results,
        }

        # Save report
        report_dir = Path(__file__).parents[1] / "evals" / "reports"
        report_dir.mkdir(parents=True, exist_ok=True)
        report_file = report_dir / f"eval_report_{self.domain_name}_{int(time.time())}.json"
        with open(report_file, "w", encoding="utf-8") as rf:
            json.dump(summary, rf, indent=2, ensure_ascii=False)

        return summary
