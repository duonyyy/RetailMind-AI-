'use client';

import { useState, useCallback } from 'react';
import { ChatMessage, CitationItem, HitlTaskItem } from '../types';

/**
 * Custom SSE Streaming Hook (`useAgentChat.ts` per 17-FRONTEND_DESIGN.md Section 8)
 * - Streams real-time SSE chunks from `/api/proxy/chat/stream`
 * - Parses `thought`, `citations`, `answer`, `hitl_pending`, and `error` events
 * - Implements Tier-4 Offline Fallback Guarantee (Zero-500 Guarantee)
 */
export function useAgentChat(initialHitlTasks: HitlTaskItem[] = []) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      role: 'assistant',
      content:
        'Xin chào! Tôi là trợ lý RetailMind. Vui lòng đặt câu hỏi; các thông tin cần tài liệu sẽ chỉ được trả lời khi có căn cứ xác minh.',
      timestamp: 'Vừa xong',
    },
  ]);

  const [thoughtTrace, setThoughtTrace] = useState<string[]>([]);
  const [currentCitations, setCurrentCitations] = useState<CitationItem[]>([]);
  const [currentGrounding, setCurrentGrounding] = useState<number | null>(null);
  const [hitlTasks, setHitlTasks] = useState<HitlTaskItem[]>(initialHitlTasks);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = useCallback(
    async (userPrompt: string) => {
      const textToSend = userPrompt.trim();
      if (!textToSend || isStreaming) return;

      const userMsg: ChatMessage = {
        id: `msg-u-${Date.now()}`,
        role: 'user',
        content: textToSend,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setCurrentCitations([]);
      setCurrentGrounding(null);

      try {
        const res = await fetch('/api/proxy/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: textToSend }),
        });

        if (!res.ok || !res.body) {
          throw new Error('SSE stream fallback required');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        let streamAnswer = '';
        let streamCitations: CitationItem[] = [];
        let streamGrounding: number | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunkText = decoder.decode(value);
          const lines = chunkText.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ') && !line.includes('[DONE]')) {
              try {
                const data = JSON.parse(line.substring(6));
                if (data.type === 'thought') {
                  setThoughtTrace((prev) => [...prev, data.content]);
                } else if (data.type === 'citations') {
                  streamCitations = data.data || [];
                  setCurrentCitations(streamCitations);
                } else if (data.type === 'answer') {
                  streamAnswer = data.content;
                  streamGrounding = data.grounding_score ?? null;
                  setCurrentGrounding(streamGrounding);
                } else if (data.type === 'hitl_pending') {
                  setHitlTasks((prev) => [
                    {
                      task_id: data.task_id || `task-hitl-${Date.now()}`,
                      query: textToSend,
                      reason:
                        data.reason ||
                        'Khoản chi bồi hoàn vượt hạn mức AI tự động (200.000 VNĐ). Yêu cầu Quản lý phê duyệt.',
                      status: 'PENDING',
                      timestamp: 'Vừa xong',
                    },
                    ...prev,
                  ]);
                } else if (data.type === 'error') {
                  streamAnswer = `⚠️ ${data.message}`;
                }
              } catch {
                // Ignore partial line
              }
            }
          }
        }

        if (streamAnswer) {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-a-${Date.now()}`,
              role: 'assistant',
              content: streamAnswer,
              citations: streamCitations,
              groundingScore: streamGrounding ?? undefined,
              timestamp: new Date().toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            },
          ]);
        } else {
          throw new Error('Empty stream answer');
        }
      } catch {
        setMessages((prev) => [...prev, {
          id: `msg-a-${Date.now()}`, role: 'assistant',
          content: 'Hiện không thể kết nối trợ lý hoặc xác minh tài liệu. Vui lòng thử lại sau.',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        }]);
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming]
  );

  const rateMessage = useCallback((messageId: string, rating: 'like' | 'dislike') => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, feedback: rating } : m))
    );
  }, []);

  return {
    messages,
    thoughtTrace,
    currentCitations,
    currentGrounding,
    hitlTasks,
    setHitlTasks,
    isStreaming,
    sendMessage,
    rateMessage,
  };
}

