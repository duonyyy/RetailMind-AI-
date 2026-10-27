#!/usr/bin/env python3
"""
CLI Evaluation Driver for Enterprise Agentic AI Platform v3.
Usage:
    python scripts/run_evals.py --domain retail_store --env test
"""
import sys
import asyncio
import argparse
from pathlib import Path

# Add root directory to sys.path
root_dir = Path(__file__).parents[1]
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))
src_dir = root_dir / "src"
if str(src_dir) not in sys.path:
    sys.path.insert(0, str(src_dir))

from evals.runner import EvaluationRunner

async def main_async():
    parser = argparse.ArgumentParser(description="Run domain evaluation benchmark")
    parser.add_argument("--domain", default="retail_store", help="Target domain pack name")
    parser.add_argument("--env", default="test", help="Execution environment configuration (dev/test/prod)")
    parser.add_argument("--min-pass-rate", type=float, default=0.0, help="Minimum pass rate required to exit 0")
    args = parser.parse_args()

    print("=" * 60)
    print(f"Enterprise Agent Platform — Evaluation Suite")
    print(f"Target Domain : {args.domain}")
    print(f"Environment   : {args.env}")
    print("=" * 60)

    try:
        runner = EvaluationRunner(domain_name=args.domain, env=args.env)
        report = await runner.run()
    except Exception as e:
        print(f"Evaluation failed to execute: {e}")
        sys.exit(1)

    print("\nBenchmark Execution Results:")
    print(f"  • Total Cases Evaluated   : {report['total_cases']}")
    print(f"  • Passed Cases            : {report['passed_cases']}")
    print(f"  • Overall Pass Rate       : {report['pass_rate'] * 100:.1f}%")
    print(f"  • Tool Selection Accuracy : {report['tool_selection_accuracy'] * 100:.1f}%")
    print(f"  • Refusal Accuracy        : {report['refusal_accuracy'] * 100:.1f}%")
    print(f"  • Approval Gating Accuracy: {report['approval_accuracy'] * 100:.1f}%")

    print("\nCase Details:")
    for detail in report["details"]:
        mark = "✓ PASS" if detail["passed"] else "✗ FAIL"
        status = detail.get("status", "unknown")
        print(f"  [{mark}] {detail['id']}: status={status} (tool={detail['tool_ok']}, refusal={detail['refusal_ok']}, approval={detail['approval_ok']})")

    if report["pass_rate"] < args.min_pass_rate:
        print(f"\n[!] Failure: Pass rate {report['pass_rate']:.2f} below required minimum {args.min_pass_rate:.2f}")
        sys.exit(1)

    print("\n✓ Evaluation suite completed successfully.")
    sys.exit(0)

def main():
    asyncio.run(main_async())

if __name__ == "__main__":
    main()
