from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from agent_platform.harness.tools.spec import tool, ToolContext, ToolUnavailableError

class SearchKnowledgeInput(BaseModel):
    query: str = Field(..., description="Nội dung hoặc câu hỏi cần tra cứu trong kho tri thức")
    top_k: int = Field(default=3, ge=1, le=10, description="Số lượng kết quả trích dẫn tối đa")

@tool(
    name="search_knowledge",
    description="Tra cứu tài liệu, chính sách, và quy định doanh nghiệp từ cơ sở tri thức (RAG Engine).",
    input_model=SearchKnowledgeInput,
    side_effect=False,
    allowed_roles=["*"],
    timeout_s=8.0,
)
async def search_knowledge(args: SearchKnowledgeInput, ctx: ToolContext) -> Dict[str, Any]:
    """Connects to RAG retrieval engine to fetch relevant factual context."""
    raise ToolUnavailableError("Chưa thể xác minh tài liệu chính sách đang được công bố. Vui lòng thử lại sau.")
