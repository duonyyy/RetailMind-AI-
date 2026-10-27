import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:4000';
const AGENT_URL = process.env.AGENT_INTERNAL_URL || 'http://localhost:8000';

/**
 * RetailMind AI — Enterprise BFF Reverse Proxy Route Handler
 * 1. Che giấu Access Token an toàn phía Server qua HttpOnly Cookie.
 * 2. Phân luồng thông minh: hội thoại -> Python AI Agent, nghiệp vụ -> NestJS Backend.
 * 3. Hỗ trợ truyền dòng SSE streaming trực tiếp với duplex: 'half'.
 * 4. Tự động chuyển tiếp header x-total-count phục vụ phân trang.
 */
async function catchAll(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const cookieStore = cookies();
  const token = cookieStore.get('retailmind_access_token')?.value;

  // 1. Phân luồng endpoint thông minh
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

  // 2. Whitelist Headers an toàn (chuyển tiếp Idempotency-Key và Trace Headers)
  const forwardedHeaders = new Headers();
  const whitelist = [
    'content-type',
    'accept',
    'accept-language',
    'x-trace-id',
    'idempotency-key',
    'x-idempotency-key',
    'x-customer-id',
  ];
  whitelist.forEach((headerName) => {
    const val = req.headers.get(headerName);
    if (val) forwardedHeaders.set(headerName, val);
  });

  // 3. Đính kèm Bearer Token từ Server Cookie
  if (token) {
    forwardedHeaders.set('Authorization', `Bearer ${token}`);
  }

  try {
    // 4. Stream với duplex: 'half' cho Node.js fetch
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

    // 5. Expose header phân trang cho Client
    const totalCount = response.headers.get('x-total-count');
    if (totalCount) {
      nextResponse.headers.set('x-total-count', totalCount);
      nextResponse.headers.set('Access-Control-Expose-Headers', 'x-total-count');
    }

    return nextResponse;
  } catch (error) {
    console.error('[BFF Proxy Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Dịch vụ máy chủ tạm thời không phản hồi. Vui lòng thử lại sau.' },
      { status: 502 }
    );
  }
}

export const GET = catchAll;
export const POST = catchAll;
export const PUT = catchAll;
export const PATCH = catchAll;
export const DELETE = catchAll;
