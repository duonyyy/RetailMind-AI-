import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const TRACE_ID_HEADER = 'x-trace-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incomingTraceId = req.headers[TRACE_ID_HEADER] as string | undefined;
    const traceId = incomingTraceId && incomingTraceId.trim() ? incomingTraceId.trim() : uuidv4();

    req['traceId'] = traceId;
    res.setHeader(TRACE_ID_HEADER, traceId);
    res.setHeader('X-Trace-Id', traceId);

    next();
  }
}

