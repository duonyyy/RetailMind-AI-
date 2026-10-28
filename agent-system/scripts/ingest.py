#!/usr/bin/env python3
"""
CLI Corpus Ingestion Tool for Enterprise Agentic AI Platform v3.
Computes SHA-256 document checksums, chunks markdown/policy files,
and synchronizes Hybrid (BM25 + Dense) and Qdrant vector indices.

Usage:
    python scripts/ingest.py --domain retail_store
"""
import sys
import hashlib
import argparse
from pathlib import Path
from typing import List, Dict, Any

# Add root directory to sys.path
root_dir = Path(__file__).parents[1]
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))
src_dir = root_dir / "src"
if str(src_dir) not in sys.path:
    sys.path.insert(0, str(src_dir))

from agent_platform.domain.pack import DomainPack
from agent_platform.rag.retrieval.hybrid_engine import ProductionHybridRetriever


def chunk_markdown_file(file_path: Path, max_chunk_chars: int = 800) -> list[str]:
    """Splits markdown file into logical paragraphs/sections."""
    content = file_path.read_text(encoding="utf-8", errors="ignore")
    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
    chunks = []
    current_chunk = []
    current_length = 0

    for p in paragraphs:
        if current_length + len(p) > max_chunk_chars and current_chunk:
            chunks.append("\n\n".join(current_chunk))
            current_chunk = [p]
            current_length = len(p)
        else:
            current_chunk.append(p)
            current_length += len(p)

    if current_chunk:
        chunks.append("\n\n".join(current_chunk))
    return chunks


def ingest_domain(domain_name: str, max_files: int = 25) -> Dict[str, Any]:
    domain_dir = root_dir / "domains" / domain_name
    if not domain_dir.is_dir():
        print(f"Error: Domain directory not found: {domain_dir}")
        sys.exit(1)

    pack = DomainPack.load_from_dir(domain_dir)
    print("=" * 60)
    print(f"Ingesting Corpus for Domain: {pack.name} (v{pack.version})")
    print(f"Locale: {pack.locale}")
    print("=" * 60)

    total_files = 0
    total_chunks = 0
    chunk_records: List[Dict[str, Any]] = []

    for source in pack.knowledge.sources:
        corpus_path = domain_dir / source.path
        if not corpus_path.exists():
            print(f"[!] Warning: Source path does not exist: {corpus_path}")
            continue

        # Prioritize root and policies/*.md before massive catalog files
        md_files = sorted(corpus_path.glob("*.md"))
        policies_dir = corpus_path / "policies"
        if policies_dir.exists():
            md_files.extend(sorted(policies_dir.glob("*.md")))

        for f in md_files[:max_files]:
            raw_bytes = f.read_bytes()
            sha256_hash = hashlib.sha256(raw_bytes).hexdigest()[:16]
            chunks = chunk_markdown_file(f)
            total_files += 1
            total_chunks += len(chunks)
            for idx, c_text in enumerate(chunks):
                chunk_records.append({
                    "id": f"{f.stem}_{idx + 1:03d}_{sha256_hash[:6]}",
                    "title": f.name,
                    "statute": f"Đoạn {idx + 1}",
                    "page": idx + 1,
                    "content": c_text,
                    "checksum_sha256": sha256_hash,
                })
            print(f"  • Ingested {f.name} [sha256={sha256_hash}]: {len(chunks)} chunks generated")

    # Build Hybrid (BM25 + Dense / Qdrant) Vector Index
    retriever = ProductionHybridRetriever(
        corpus=chunk_records,
        collection_name=f"{domain_name}_policies",
    )
    upserted = len(retriever.doc_vectors)

    print("\nCorpus Ingestion Summary:")
    print(f"  • Files Processed : {total_files}")
    print(f"  • Chunks Created   : {total_chunks}")
    print(f"  • Qdrant Upserted  : {upserted} vectors")
    print(f"  • Vector Ready     : Primary dense + sparse BM25 indices synchronized.")
    print("✓ Ingestion completed successfully.")
    return {
        "files_processed": total_files,
        "chunks_created": total_chunks,
        "vectors_upserted": upserted,
        "retriever": retriever,
    }


def main():
    parser = argparse.ArgumentParser(description="Ingest domain corpus documents")
    parser.add_argument("--domain", default="retail_store", help="Target domain pack name")
    args = parser.parse_args()
    ingest_domain(args.domain)


if __name__ == "__main__":
    main()
