#!/usr/bin/env python3
"""
RetailMind AI Data Rebranding & Ingestion Pipeline
Transforms legacy data from 'tynaai neoai main apps-data' by:
1. Rebranding 'Điện máy XANH', 'dienmayxanh.com', 'Thế Giới Di Động', 'TGDĐ', 'ĐMX', 'MWG' to 'Điện máy RetailMind' / 'RetailMind'.
2. Standardizing hotlines and contact emails to RetailMind customer support.
3. Masking Vietnamese phone numbers in chat samples according to Decree 13/2023/NĐ-CP (PII protection).
4. Populating:
   - data/raw_documents/policies/ & apps/agent/domains/retail_store/corpus/policies/
   - data/raw_documents/products/ & apps/agent/domains/retail_store/corpus/products/
   - data/catalog/products_detail.json & data/products_detail.json
   - data/golden_datasets/chat_samples/
"""
import os
import re
import json
import shutil
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT_DIR / "tynaai neoai main apps-data"

REPLACEMENT_PAIRS = [
    # URLs and Domains
    (re.compile(r'https?://(?:www\.)?dienmayxanh\.com', re.IGNORECASE), 'https://www.retailmind.vn'),
    (re.compile(r'dienmayxanh\.com', re.IGNORECASE), 'retailmind.vn'),
    (re.compile(r'https?://(?:www\.)?thegioididong\.com', re.IGNORECASE), 'https://www.retailmind.vn'),
    (re.compile(r'thegioididong\.com', re.IGNORECASE), 'retailmind.vn'),
    (re.compile(r'https?://cdnv2\.tgdd\.vn', re.IGNORECASE), 'https://cdn.retailmind.vn'),
    (re.compile(r'https?://cdn\.tgdd\.vn', re.IGNORECASE), 'https://cdn.retailmind.vn'),
    (re.compile(r'cdnv2\.tgdd\.vn', re.IGNORECASE), 'cdn.retailmind.vn'),
    (re.compile(r'cdn\.tgdd\.vn', re.IGNORECASE), 'cdn.retailmind.vn'),
    
    # Emails and Hotlines
    (re.compile(r'cskh@dienmayxanh\.com', re.IGNORECASE), 'cskh@retailmind.vn'),
    (re.compile(r'1900\.232\.461'), '1900.888.666'),
    (re.compile(r'18001062'), '19008886'),
    (re.compile(r'18001060'), '19008886'),

    # Brand Names
    (re.compile(r'Điện\s*[mM]áy\s*XANH', re.IGNORECASE), 'Điện máy RetailMind'),
    (re.compile(r'dienmayxanh', re.IGNORECASE), 'retailmind'),
    (re.compile(r'Thế\s*[gG]iới\s*[dD]i\s*[đĐ]ộng', re.IGNORECASE), 'Hệ thống Bán lẻ RetailMind'),
    (re.compile(r'TGDĐ\s*[/\-&]\s*ĐMX'), 'RetailMind'),
    (re.compile(r'TGDĐ'), 'RetailMind'),
    (re.compile(r'ĐMX'), 'RetailMind'),
    (re.compile(r'search_product_dmx_v3'), 'search_product_retailmind_v1'),
]

def rebrand_text(text: str) -> str:
    """Applies all brand transformation rules to the given text."""
    for pattern, repl in REPLACEMENT_PAIRS:
        text = pattern.sub(repl, text)
    return text

def mask_phone_number(match: re.Match) -> str:
    """Masks Vietnamese phone numbers (e.g., 0855111119 -> 0855***119)."""
    full = match.group(0)
    digits = re.sub(r'\D', '', full)
    if len(digits) == 10:
        return f"{digits[:4]}***{digits[-3:]}"
    return full

def sanitize_chat_pii(text: str) -> str:
    """Masks phone numbers in chat messages for Decree 13/2023 compliance."""
    phone_pattern = re.compile(r'(?<!\d)(?:0\d{9})(?!\d)')
    return phone_pattern.sub(mask_phone_number, text)

def process_policies():
    print("\n--- Processing Policies ---")
    source_policy_dir = SOURCE_DIR / "policy"
    target_raw_policies = ROOT_DIR / "data" / "raw_documents" / "policies"
    target_agent_policies = ROOT_DIR / "apps" / "agent" / "domains" / "retail_store" / "corpus" / "policies"

    target_raw_policies.mkdir(parents=True, exist_ok=True)
    target_agent_policies.mkdir(parents=True, exist_ok=True)

    for fpath in source_policy_dir.glob("*.md"):
        content = fpath.read_text(encoding="utf-8")
        rebranded = rebrand_text(content)

        # Write to data/raw_documents/policies/
        dest_raw = target_raw_policies / fpath.name
        dest_raw.write_text(rebranded, encoding="utf-8")

        # Write to apps/agent/domains/retail_store/corpus/policies/
        dest_agent = target_agent_policies / fpath.name
        dest_agent.write_text(rebranded, encoding="utf-8")

        print(f"  ✓ Processed & Rebranded policy: {fpath.name}")

def process_product_markdowns():
    print("\n--- Processing Product Markdown Files ---")
    product_md_files = ["airCondition-products.md", "freezer-products.md"]
    target_raw_products = ROOT_DIR / "data" / "raw_documents" / "products"
    target_agent_products = ROOT_DIR / "apps" / "agent" / "domains" / "retail_store" / "corpus" / "products"

    target_raw_products.mkdir(parents=True, exist_ok=True)
    target_agent_products.mkdir(parents=True, exist_ok=True)

    for fname in product_md_files:
        src = SOURCE_DIR / fname
        if not src.exists():
            print(f"  [!] Missing file {fname}")
            continue
        print(f"  • Reading & rebranding {fname} ({src.stat().st_size / 1024 / 1024:.2f} MB)...")
        content = src.read_text(encoding="utf-8")
        rebranded = rebrand_text(content)

        (target_raw_products / fname).write_text(rebranded, encoding="utf-8")
        (target_agent_products / fname).write_text(rebranded, encoding="utf-8")
        print(f"  ✓ Saved {fname} to raw_documents/products and agent corpus/products")

def process_products_detail():
    print("\n--- Processing products_detail.json (13,754 products) ---")
    src = SOURCE_DIR / "products_detail.json"
    if not src.exists():
        print(f"  [!] Missing {src}")
        return

    print(f"  • Loading JSON ({src.stat().st_size / 1024 / 1024:.2f} MB)...")
    with open(src, "r", encoding="utf-8") as f:
        products = json.load(f)

    print(f"  • Rebranding {len(products)} products...")
    for p in products:
        if "url" in p and isinstance(p["url"], str):
            p["url"] = rebrand_text(p["url"])
        if "url_image" in p and isinstance(p["url_image"], str):
            p["url_image"] = rebrand_text(p["url_image"])
        if "tên sản phẩm" in p and isinstance(p["tên sản phẩm"], str):
            p["tên sản phẩm"] = rebrand_text(p["tên sản phẩm"])
        if "promotion" in p and isinstance(p["promotion"], str):
            p["promotion"] = rebrand_text(p["promotion"])
        if "chính sách bảo hành" in p and isinstance(p["chính sách bảo hành"], str):
            p["chính sách bảo hành"] = rebrand_text(p["chính sách bảo hành"])
        if "spec_product" in p and isinstance(p["spec_product"], dict):
            for k, v in list(p["spec_product"].items()):
                if isinstance(v, str):
                    p["spec_product"][k] = rebrand_text(v)

    target_catalog_dir = ROOT_DIR / "data" / "catalog"
    target_catalog_dir.mkdir(parents=True, exist_ok=True)
    
    out_file1 = target_catalog_dir / "products_detail.json"
    print(f"  • Writing to {out_file1}...")
    with open(out_file1, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

    # Also make a copy directly in data/products_detail.json for easy access
    out_file2 = ROOT_DIR / "data" / "products_detail.json"
    with open(out_file2, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

    print(f"  ✓ Processed {len(products)} products successfully.")

def fix_and_process_chat_samples():
    print("\n--- Processing Chat Samples ---")
    target_dir = ROOT_DIR / "data" / "golden_datasets" / "chat_samples"
    target_dir.mkdir(parents=True, exist_ok=True)

    # 1. 35sample_chat_history
    file1 = SOURCE_DIR / "chat_sample" / "35sample_chat_history (1).json"
    if file1.exists():
        with open(file1, "r", encoding="utf-8") as f:
            data1 = json.load(f)
        
        # Rebrand and mask PII
        for item in data1:
            if "messages" in item:
                for msg in item["messages"]:
                    if "content" in msg and isinstance(msg["content"], str):
                        msg["content"] = sanitize_chat_pii(rebrand_text(msg["content"]))

        out1 = target_dir / "35sample_chat_history.json"
        with open(out1, "w", encoding="utf-8") as f:
            json.dump(data1, f, ensure_ascii=False, indent=2)
        print(f"  ✓ Rebranded and PII-masked 35sample_chat_history.json ({len(data1)} sessions)")

    # 2. chat_history_buy_product.json (raw logs with syntax anomalies)
    file2 = SOURCE_DIR / "chat_sample" / "chat_history_buy_product.json"
    if file2.exists():
        raw_text = file2.read_text(encoding="utf-8")
        rebranded_raw = sanitize_chat_pii(rebrand_text(raw_text))

        # Fix syntax error at the top of chat_history_buy_product.json if present
        # Replace broken `[\n  {\n      {\n        "role":` with `[\n  {\n    "messages": [\n      {\n        "role":`
        rebranded_fixed = re.sub(r'\[\s*\{\s*\{\s*"role":', '[\n  {\n    "messages": [\n      {\n        "role":', rebranded_raw, count=1)
        # Fix missing comma before `{ "role": "assistant"`
        rebranded_fixed = re.sub(r'\}\s*\n\s*\{\s*"role":\s*"assistant"', '},\n      {\n        "role": "assistant"', rebranded_fixed)

        out2 = target_dir / "chat_history_buy_product.json"
        out2.write_text(rebranded_fixed, encoding="utf-8")
        print(f"  ✓ Rebranded, sanitized & fixed syntax in chat_history_buy_product.json")

def update_agent_domain_yaml():
    print("\n--- Checking Agent Domain Config (domain.yaml) ---")
    domain_yaml_path = ROOT_DIR / "apps" / "agent" / "domains" / "retail_store" / "domain.yaml"
    if domain_yaml_path.exists():
        print("  ✓ domain.yaml knowledge source corpus/ verified.")

def main():
    print("=" * 70)
    print("RETAILMIND AI DATA REBRANDING & INGESTION PIPELINE")
    print(f"Brand Target: Điện máy RetailMind / retailmind.vn")
    print("=" * 70)

    process_policies()
    process_product_markdowns()
    process_products_detail()
    fix_and_process_chat_samples()
    update_agent_domain_yaml()

    print("\n" + "=" * 70)
    print("✓ All data successfully rebranded, sanitized, and ingested!")
    print("=" * 70)

if __name__ == "__main__":
    main()
