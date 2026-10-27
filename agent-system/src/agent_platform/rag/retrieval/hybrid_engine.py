"""Production Hybrid Retrieval Engine: BM25Okapi + Dense Vector Mock with RRF k=60 Fusion,

Two-Stage Retrieval (Candidate Pool -> Reranker), and Lost in the Middle Re-ordering.
"""

from __future__ import annotations
import re
import unicodedata
from difflib import SequenceMatcher
from typing import List, Dict, Any, Tuple, TypeVar, Optional
from agent_platform.rag.embedding.client import BaseEmbeddingClient, EmbeddingClientFactory
from agent_platform.rag.embedding.cache import compute_cosine_similarity
from agent_platform.rag.ingestion.sanitizer import IngestionSanitizer
from .reranker import BaseReranker, RerankerFactory
from rank_bm25 import BM25Okapi


T = TypeVar('T')


class TextNormalizer:
    """Normalize Vietnamese text using Unicode NFKC before verification."""
    _WS = re.compile(r'\s+')

    @classmethod
    def normalize(cls, text: str) -> str:
        if not text:
            return ""
        text = unicodedata.normalize("NFKC", text).lower()
        text = text.replace("’", "'").replace("“", '"').replace("”", '"')
        text = text.replace("–", "-").replace("—", "-")
        text = re.sub(r"[()\[\]{},;:\"']", " ", text)
        return cls._WS.sub(" ", text).strip()


def quote_is_grounded_nfkc(quote: str, source_text: str, threshold: float = 0.80) -> bool:
    """Verify if a quote is grounded in the source text to prevent hallucination."""
    needle = TextNormalizer.normalize(quote)
    haystack = TextNormalizer.normalize(source_text)

    if not needle or not haystack or len(needle) < 10:
        return False
    if needle in haystack:
        return True

    matcher = SequenceMatcher(None, needle, haystack, autojunk=False)
    match = matcher.find_longest_match(0, len(needle), 0, len(haystack))
    return match.size >= threshold * len(needle)


def reorder_context_lost_in_the_middle(documents: List[T]) -> List[T]:
    """Khắc phục hiện tượng 'Lost in the Middle' (Liu et al., Stanford 2023):
    Đặt tài liệu quan trọng nhất (Rank 1) ở đầu prompt, Rank 2 ở cuối prompt, các rank thấp hơn xếp dần vào giữa.
    """
    if len(documents) <= 2:
        return documents

    reordered: List[Any] = [None] * len(documents)
    left = 0
    right = len(documents) - 1

    for i, doc in enumerate(documents):
        if i % 2 == 0:
            reordered[left] = doc
            left += 1
        else:
            reordered[right] = doc
            right -= 1

    return [d for d in reordered if d is not None]


class ProductionHybridRetriever:
    """Hybrid search combining Dense Embeddings and Sparse BM25Okapi via RRF k=60,
    with Two-Stage Re-ranking and Context Re-ordering.
    """

    STOP_WORDS = {"là", "gì", "của", "và", "các", "có", "trong", "được", "cho", "với", "nhất", "như", "thế", "nào", "ở", "tại", "một", "những"}

    def __init__(
        self,
        corpus: Optional[List[Dict[str, Any]]] = None,
        rrf_k: int = 60,
        embedder: Optional[BaseEmbeddingClient] = None,
        reranker: Optional[BaseReranker] = None,
    ):
        self.corpus = list(corpus) if corpus else []
        self.rrf_k = rrf_k
        self.embedder: BaseEmbeddingClient = embedder or EmbeddingClientFactory.create_client()
        self.reranker: BaseReranker = reranker or RerankerFactory.create_reranker()
        self.doc_vectors: Dict[str, List[float]] = {}
        self.tokenized_corpus: List[List[str]] = []
        self.bm25: Optional[BM25Okapi] = None
        self._build_index()

    def _build_index(self) -> None:
        """Re-index corpus with Vietnamese Word Segmentation for BM25Okapi and precompute dense vector embeddings."""
        self.tokenized_corpus = []
        missing_embed_docs: List[Tuple[str, str]] = []

        for doc in self.corpus:
            doc_id = doc.get("id", "")
            content = doc.get("content", doc.get("snippet", doc.get("text", "")))
            segmented = IngestionSanitizer.segment_vietnamese(content).lower()
            self.tokenized_corpus.append(segmented.split())
            if doc_id and doc_id not in self.doc_vectors and content:
                missing_embed_docs.append((doc_id, content))

        self.bm25 = BM25Okapi(self.tokenized_corpus) if self.tokenized_corpus else None

        if missing_embed_docs:
            texts = [item[1] for item in missing_embed_docs]
            embeddings = self.embedder.embed_documents(texts)
            for (doc_id, _), emb in zip(missing_embed_docs, embeddings):
                self.doc_vectors[doc_id] = emb

    def add_documents(self, documents: List[Dict[str, Any]]) -> None:
        """Dynamically add new documents or chunks into the retriever corpus and update indices."""
        for idx, doc in enumerate(documents):
            d = dict(doc)
            if "id" not in d:
                d["id"] = f"doc_{len(self.corpus) + idx + 1:04d}"
            if "content" not in d and "text" in d:
                d["content"] = d["text"]
            self.corpus.append(d)
        self._build_index()

    def index_corpus(self, documents: List[Dict[str, Any]]) -> None:
        """Replace the active corpus completely and rebuild search indices."""
        self.corpus = list(documents)
        self.doc_vectors = {}
        self._build_index()

    def ingest_from_loader(
        self,
        loader: Any,
        chunker: Any = None,
        use_hierarchical_children: bool = True,
        dir_path: Optional[str] = None
    ) -> int:
        """Ingest raw documents via EnterpriseDocumentLoader and LegalHierarchyChunker into retriever index.
        
        Args:
            loader: Instance of EnterpriseDocumentLoader.
            chunker: Optional custom chunker (defaults to LegalHierarchyChunker).
            use_hierarchical_children: If True, uses child chunks for precision indexing.
            dir_path: Optional directory path to load from.
            
        Returns:
            Number of indexed chunks.
        """
        from agent_platform.rag.ingestion.legal_chunker import LegalHierarchyChunker


        chunk_engine = chunker or LegalHierarchyChunker
        docs = loader.load_directory(dir_path) if dir_path else loader.load_directory("data/raw_documents")
        
        new_records: List[Dict[str, Any]] = []
        for doc in docs:
            if not doc.content:
                continue
            if use_hierarchical_children:
                parents, children = chunk_engine.chunk_hierarchical_parent_child(
                    text=doc.content,
                    doc_id=doc.doc_id,
                    source_title=doc.filename,
                )
                items_to_index = children if children else parents
                for c in items_to_index:
                    new_records.append({
                        "id": c.id,
                        "title": doc.filename,
                        "statute": c.metadata.get("statute", "Điều khoản"),
                        "page": c.metadata.get("page", 1),
                        "content": c.text,
                        "parent_id": c.parent_id,
                        "breadcrumb": c.breadcrumb,
                    })
            else:
                chunks = chunk_engine.chunk_document(
                    text=doc.content,
                    doc_title=doc.filename,
                    doc_id=doc.doc_id,
                )
                for c in chunks:
                    new_records.append({
                        "id": c.id,
                        "title": doc.filename,
                        "statute": c.metadata.get("statute", "Điều khoản"),
                        "page": 1,
                        "content": c.text,
                        "breadcrumb": c.breadcrumb,
                    })

        self.add_documents(new_records)
        return len(new_records)


    def search_sparse_bm25(self, query: str, top_k: int = 10) -> List[Tuple[Dict[str, Any], int]]:
        if not self.bm25:
            return []
        seg_query = IngestionSanitizer.segment_vietnamese(query).lower().split()
        if not seg_query:
            return []
        scores = self.bm25.get_scores(seg_query)
        ranked_idx = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]
        return [(self.corpus[idx], rank + 1) for rank, idx in enumerate(ranked_idx) if scores[idx] > 0]

    def search_dense(self, query: str, top_k: int = 10) -> List[Tuple[Dict[str, Any], int]]:
        """Dense semantic similarity search using real embedding cosine similarity."""
        if not self.corpus or not self.doc_vectors:
            return []
        query_vec = self.embedder.embed_query(query)
        scored: List[Tuple[Dict[str, Any], float]] = []

        for doc in self.corpus:
            doc_id = doc.get("id")
            doc_vec = self.doc_vectors.get(doc_id)
            sim = compute_cosine_similarity(query_vec, doc_vec) if doc_vec else 0.0
            scored.append((doc, sim))

        # Sort descending by cosine similarity
        scored.sort(key=lambda x: x[1], reverse=True)

        # Return (doc, rank 1-based) for top_k items with positive similarity
        return [(doc, rank + 1) for rank, (doc, sim) in enumerate(scored[:top_k]) if sim > 0.0]

    def retrieve_hybrid_rrf(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Reciprocal Rank Fusion: RRF(d) = sum(1 / (k + rank))."""
        dense_hits = self.search_dense(query, top_k=10)
        sparse_hits = self.search_sparse_bm25(query, top_k=10)

        rrf_scores: Dict[str, float] = {}
        doc_map: Dict[str, Dict[str, Any]] = {}

        for doc, rank in dense_hits:
            doc_id = doc["id"]
            doc_map[doc_id] = doc
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (self.rrf_k + rank))

        for doc, rank in sparse_hits:
            doc_id = doc["id"]
            doc_map[doc_id] = doc
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (self.rrf_k + rank))

        sorted_ids = sorted(rrf_scores.keys(), key=lambda d_id: rrf_scores[d_id], reverse=True)[:top_k]

        results = []
        for doc_id in sorted_ids:
            item = doc_map[doc_id]
            results.append({
                "source_id": item["id"],
                "title": item.get("title", "Tài liệu"),
                "statute": item.get("statute", "Mục"),
                "page": item.get("page", 1),
                "snippet": item["content"],
                "rrf_score": round(rrf_scores[doc_id], 4)
            })
        return results

    def retrieve_two_stage(
        self,
        query: str,
        top_k: int = 3,
        candidate_pool_size: int = 10,
        enable_lost_in_middle_reorder: bool = True
    ) -> List[Dict[str, Any]]:
        """GIAI ĐOẠN 1: Thu thập ứng viên (Candidate Pool) qua Hybrid RRF.
           GIAI ĐOẠN 2: Tái xếp hạng qua Cross-Encoder Re-ranker (Mock / FlashRank / BGE / Cohere).
           GIAI ĐOẠN 3: Tái cấu trúc bối cảnh chống Lost in the Middle.
        """
        candidates = self.retrieve_hybrid_rrf(query, top_k=candidate_pool_size)
        if not candidates:
            return []

        # Giai đoạn 2: Tái xếp hạng bằng Cross-Encoder
        reranked_results = self.reranker.rerank(query, candidates, top_k=top_k)

        # Giai đoạn 3: Tái cấu trúc bối cảnh chống Lost in the Middle
        if enable_lost_in_middle_reorder and len(reranked_results) >= 3:
            return reorder_context_lost_in_the_middle(reranked_results)
        return reranked_results

    def verify_answer_grounding(self, generated_answer: str, contexts: List[Dict[str, Any]]) -> float:
        """Calculate grounding faithfulness score across answer sentences."""
        if not contexts:
            return 0.0
        full_context = " ".join([c.get("snippet", "") for c in contexts])
        sentences = [s.strip() for s in generated_answer.split(".") if len(s.strip()) > 15]
        if not sentences:
            return 1.0
        grounded_count = 0
        for s in sentences:
            if quote_is_grounded_nfkc(s, full_context, threshold=0.60):
                grounded_count += 1
            else:
                for c in contexts:
                    snip = c.get("snippet", "")
                    if snip and (snip in s or quote_is_grounded_nfkc(snip, s, threshold=0.60)):
                        grounded_count += 1
                        break
        return round(grounded_count / len(sentences), 2)
