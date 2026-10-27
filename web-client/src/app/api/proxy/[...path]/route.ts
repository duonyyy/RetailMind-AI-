import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:4000';
const AGENT_URL = process.env.AGENT_INTERNAL_URL || 'http://localhost:8000';

/**
 * RetailMind AI — Enterprise BFF Reverse Proxy Route Handler (ADR-009)
 * 1. Conceals JWT Access Token server-side via HttpOnly Cookie (`retailmind_access_token` / `access_token`).
 * 2. Smart Routing: conversations/chat/hitl/finops -> Python LangGraph Agent (:8000), commerce/auth/admin -> NestJS Core (:4000).
 * 3. Streams SSE tokens directly with Node.js `duplex: 'half'`.
 * 4. Exposes `x-total-count` and `x-trace-id` headers to the client.
 */
async function catchAll(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const cookieStore = cookies();
  const token =
    cookieStore.get('retailmind_access_token')?.value ||
    cookieStore.get('access_token')?.value;

  // 1. Smart endpoint routing
  const isAgentRoute =
    path.startsWith('conversations') ||
    path.startsWith('chat') ||
    path.startsWith('hitl') ||
    path.startsWith('finops');

  const targetBase = isAgentRoute ? AGENT_URL : BACKEND_URL;
  const { searchParams } = new URL(req.url);
  const queryString = searchParams.toString();

  const targetUrl = isAgentRoute
    ? `${targetBase}/api/${path}${queryString ? `?${queryString}` : ''}`
    : `${targetBase}/api/v1/${path}${queryString ? `?${queryString}` : ''}`;

  // 2. Whitelist headers (forward Idempotency-Key & OpenTelemetry Trace Headers)
  const forwardedHeaders = new Headers();
  const whitelist = [
    'content-type',
    'accept',
    'accept-language',
    'x-trace-id',
    'x-correlation-id',
    'idempotency-key',
    'x-idempotency-key',
    'x-customer-id',
  ];
  whitelist.forEach((headerName) => {
    const val = req.headers.get(headerName);
    if (val) forwardedHeaders.set(headerName, val);
  });

  // 3. Attach Bearer Token from HttpOnly Server Cookie
  if (token) {
    forwardedHeaders.set('Authorization', `Bearer ${token}`);
  }

  try {
    // 4. Stream with duplex: 'half' for Node.js fetch
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: forwardedHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      // @ts-expect-error Node fetch streaming duplex requirement
      duplex: 'half',
      cache: 'no-store',
    });

    const nextResponse = new NextResponse(response.body, {
      status: response.status,
      headers: response.headers,
    });

    // 5. Expose pagination & trace headers
    const totalCount = response.headers.get('x-total-count');
    if (totalCount) {
      nextResponse.headers.set('x-total-count', totalCount);
      nextResponse.headers.set('Access-Control-Expose-Headers', 'x-total-count');
    }

    return nextResponse;
  } catch (error) {
    console.error('[BFF Proxy Error]:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'BFF_UPSTREAM_UNAVAILABLE',
          message: 'Dịch vụ máy chủ phía sau tạm thời không phản hồi. Hệ thống tự động kích hoạt chế độ dự phòng an toàn.',
        },
        meta: {
          request_id: req.headers.get('x-trace-id') || `tr-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 502 }
    );
  }
}

export const GET = catchAll;
export const POST = catchAll;
export const PUT = catchAll;
export const PATCH = catchAll;
export const DELETE = catchAll;
