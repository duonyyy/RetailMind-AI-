"""Data Lineage Graph & BFS Blast Radius Engine for Knowledge Governance.

Complies with Section 7.3 & Checklist Item 28 of Enterprise Agentic AI Architecture:
Tracks provenance from Document -> Chunks -> Search Queries -> Agent Decisions -> User Sessions.
Performs Breadth-First Search (BFS) to compute the exact 'Blast Radius' when knowledge is tainted.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import StrEnum
from typing import Dict, List, Set, Any, Optional
from pydantic import BaseModel, Field


class LineageNodeType(StrEnum):
    DOCUMENT = "document"
    CHUNK = "chunk"
    QUERY = "query"
    DECISION = "decision"


@dataclass
class LineageNode:
    node_id: str
    node_type: LineageNodeType
    label: str
    session_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class BlastRadiusReport(BaseModel):
    """Report detailing all entities impacted by a tainted knowledge source."""
    tainted_root_id: str
    root_type: str
    affected_chunks: List[str] = Field(default_factory=list)
    affected_queries: List[str] = Field(default_factory=list)
    affected_decisions: List[str] = Field(default_factory=list)
    affected_sessions: List[str] = Field(default_factory=list)
    total_impacted_nodes: int = 0
    blast_radius_severity_score: float = 0.0
    action_items: List[str] = Field(default_factory=list)


class DataLineageGraph:
    """Directed acyclic graph tracking data flow from ingestion to agent decisions."""

    def __init__(self):
        # node_id -> LineageNode
        self.nodes: Dict[str, LineageNode] = {}
        # node_id -> Set of downstream node_ids (outgoing edges)
        self.adjacency: Dict[str, Set[str]] = {}
        # node_id -> Set of upstream node_ids (incoming edges)
        self.reverse_adjacency: Dict[str, Set[str]] = {}

    def add_node(
        self,
        node_id: str,
        node_type: LineageNodeType,
        label: str,
        session_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> LineageNode:
        """Register a node in the lineage graph."""
        if node_id not in self.nodes:
            node = LineageNode(
                node_id=node_id,
                node_type=node_type,
                label=label,
                session_id=session_id,
                metadata=metadata or {}
            )
            self.nodes[node_id] = node
            self.adjacency[node_id] = set()
            self.reverse_adjacency[node_id] = set()
        return self.nodes[node_id]

    def add_edge(self, from_node_id: str, to_node_id: str) -> None:
        """Connect upstream node to downstream node."""
        if from_node_id not in self.nodes or to_node_id not in self.nodes:
            raise KeyError(f"Both nodes must exist before creating edge: {from_node_id} -> {to_node_id}")
        self.adjacency[from_node_id].add(to_node_id)
        self.reverse_adjacency[to_node_id].add(from_node_id)

    def record_ingestion(self, doc_id: str, title: str, chunk_ids: List[str]) -> None:
        """Record raw document and its decomposed chunks."""
        self.add_node(doc_id, LineageNodeType.DOCUMENT, label=title)
        for cid in chunk_ids:
            self.add_node(cid, LineageNodeType.CHUNK, label=f"Chunk of {title}", metadata={"doc_id": doc_id})
            self.add_edge(doc_id, cid)

    def record_retrieval(self, query_id: str, query_text: str, retrieved_chunk_ids: List[str], session_id: Optional[str] = None) -> None:
        """Record query and link retrieved chunks to this query."""
        self.add_node(query_id, LineageNodeType.QUERY, label=query_text, session_id=session_id)
        for cid in retrieved_chunk_ids:
            if cid in self.nodes:
                self.add_edge(cid, query_id)

    def record_decision(
        self,
        decision_id: str,
        decision_text: str,
        query_id: str,
        cited_chunk_ids: List[str],
        session_id: Optional[str] = None
    ) -> None:
        """Record an agent's final decision/answer, linking from query and cited chunks."""
        self.add_node(decision_id, LineageNodeType.DECISION, label=decision_text, session_id=session_id)
        if query_id in self.nodes:
            self.add_edge(query_id, decision_id)
        for cid in cited_chunk_ids:
            if cid in self.nodes:
                self.add_edge(cid, decision_id)

    def calculate_blast_radius(self, tainted_root_id: str) -> BlastRadiusReport:
        """Execute Breadth-First Search (BFS) to discover all downstream tainted nodes."""
        if tainted_root_id not in self.nodes:
            raise KeyError(f"Tainted node '{tainted_root_id}' does not exist in lineage graph.")

        root_node = self.nodes[tainted_root_id]
        visited: Set[str] = set()
        queue: deque[str] = deque([tainted_root_id])

        affected_chunks: List[str] = []
        affected_queries: List[str] = []
        affected_decisions: List[str] = []
        affected_sessions: Set[str] = set()

        while queue:
            curr_id = queue.popleft()
            if curr_id in visited:
                continue
            visited.add(curr_id)

            node = self.nodes[curr_id]
            if curr_id != tainted_root_id:
                if node.node_type == LineageNodeType.CHUNK:
                    affected_chunks.append(curr_id)
                elif node.node_type == LineageNodeType.QUERY:
                    affected_queries.append(curr_id)
                elif node.node_type == LineageNodeType.DECISION:
                    affected_decisions.append(curr_id)

                if node.session_id:
                    affected_sessions.add(node.session_id)

            for neighbor_id in self.adjacency.get(curr_id, set()):
                if neighbor_id not in visited:
                    queue.append(neighbor_id)

        total_impacted = len(affected_chunks) + len(affected_queries) + len(affected_decisions)
        severity = min(
            1.0,
            (len(affected_decisions) * 0.4 + len(affected_sessions) * 0.3 + len(affected_queries) * 0.2 + len(affected_chunks) * 0.1) / 5.0
        )

        action_items = []
        if affected_decisions:
            action_items.append(f"Thu hồi/Gắn cờ kiểm toán {len(affected_decisions)} quyết định/câu trả lời của Agent.")
        if affected_sessions:
            action_items.append(f"Gửi thông báo đính chính tới {len(affected_sessions)} phiên làm việc bị ảnh hưởng.")
        if affected_chunks:
            action_items.append(f"Vô hiệu hóa và re-embed {len(affected_chunks)} chunks trong Vector Store.")

        return BlastRadiusReport(
            tainted_root_id=tainted_root_id,
            root_type=root_node.node_type.value,
            affected_chunks=affected_chunks,
            affected_queries=affected_queries,
            affected_decisions=affected_decisions,
            affected_sessions=list(affected_sessions),
            total_impacted_nodes=total_impacted,
            blast_radius_severity_score=round(severity, 3),
            action_items=action_items
        )
