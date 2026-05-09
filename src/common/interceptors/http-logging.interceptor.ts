import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly log = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: { userId?: string } }>();
    const res = http.getResponse<{ statusCode?: number }>();

    // If it's not an HTTP request (e.g. WS), skip.
    if (!req || typeof (req as any).method !== 'string') {
      return next.handle();
    }

    const start = Date.now();
    const method = (req as any).method;
    const url = (req as any).originalUrl ?? (req as any).url ?? '';
    const userId = (req as any).user?.userId;

    // Redact Authorization header to avoid leaking tokens.
    const headers = { ...((req as any).headers ?? {}) };
    if (headers.authorization) headers.authorization = '[REDACTED]';

    this.log.log(
      `${method} ${url}${userId ? ` user=${userId}` : ''} headers=${JSON.stringify(headers)}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          const status = (res as any)?.statusCode;
          this.log.log(`${method} ${url} -> ${status} ${ms}ms`);
        },
        error: (err) => {
          const ms = Date.now() - start;
          const status = (res as any)?.statusCode;
          this.log.error(
            `${method} ${url} -> ${status ?? 'ERR'} ${ms}ms ${String(err?.message ?? err)}`,
          );
        },
      }),
    );
  }
}

