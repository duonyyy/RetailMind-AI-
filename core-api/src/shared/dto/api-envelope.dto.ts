export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiMeta {
  traceId: string;
  timestamp: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: ApiErrorDetail | null;
  meta: ApiMeta;
}

export class ApiEnvelopeDto<T> implements ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: ApiErrorDetail | null;
  meta: ApiMeta;

  constructor(partial: Partial<ApiEnvelope<T>>) {
    this.success = partial.success ?? true;
    this.data = partial.data ?? null;
    this.error = partial.error ?? null;
    this.meta = partial.meta ?? {
      traceId: 'unknown',
      timestamp: new Date().toISOString(),
    };
  }

  static success<T>(data: T, traceId = 'unknown'): ApiEnvelopeDto<T> {
    return new ApiEnvelopeDto<T>({
      success: true,
      data,
      error: null,
      meta: {
        traceId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  static error<T = null>(
    code: string,
    message: string,
    details?: unknown,
    traceId = 'unknown',
  ): ApiEnvelopeDto<T> {
    return new ApiEnvelopeDto<T>({
      success: false,
      data: null,
      error: { code, message, details },
      meta: {
        traceId,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

