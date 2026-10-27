from typing import Optional
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from agent_platform.harness.state.principal import Principal
from agent_platform.api.deps import get_principal
from agent_platform.api.sse import format_sse_event

router = APIRouter(prefix="/v1", tags=["Chat"])

class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    thread_id: Optional[str] = None

class ChatResponse(BaseModel):
    thread_id: str
    run_id: str
    final_answer: Optional[str]
    status: str
    grounding_score: Optional[float]
    citations: list[str] = []

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    req: ChatRequest,
    request: Request,
    principal: Principal = Depends(get_principal),
):
    """Synchronous JSON chat endpoint."""
    harness = request.app.state.harness
    state = await harness.execute(
        query=req.query,
        principal=principal,
        thread_id=req.thread_id,
    )

    citations = [ev.source_document for ev in state.get("evidence", [])]
    return ChatResponse(
        thread_id=state["thread_id"],
        run_id=state["run_id"],
        final_answer=state.get("final_answer"),
        status=state.get("status", "unknown"),
        grounding_score=state.get("grounding_score"),
        citations=list(dict.fromkeys(citations)),
    )

@router.post("/chat/stream")
async def chat_stream_endpoint(
    req: ChatRequest,
    request: Request,
    principal: Principal = Depends(get_principal),
):
    """Server-Sent Events (SSE) streaming chat endpoint."""
    harness = request.app.state.harness

    async def sse_generator():
        yield format_sse_event("run.started", {"query": req.query, "user_id": principal.user_id})

        state = await harness.execute(
            query=req.query,
            principal=principal,
            thread_id=req.thread_id,
        )

        if state.get("final_answer"):
            yield format_sse_event("answer.final", {"text": state["final_answer"]})

        citations = [ev.source_document for ev in state.get("evidence", [])]
        if citations:
            yield format_sse_event("citations", {"sources": list(dict.fromkeys(citations))})

        yield format_sse_event("run.done", {"status": state.get("status", "done")})

    return StreamingResponse(sse_generator(), media_type="text/event-stream")
