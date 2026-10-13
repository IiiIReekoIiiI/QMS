import {
  ExpressErrorHandler,
  StructuredLogger,
} from './http-types';
import { createUuidV7 } from '../persistence/uuid-v7';

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly publicCode: string,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function createErrorMiddleware(logger: StructuredLogger): ExpressErrorHandler {
  return (failure, _request, response, next) => {
    if (response.headersSent) {
      next(failure);
      return;
    }

    const correlationId = createUuidV7();
    const statusCode = failure instanceof HttpError ? failure.statusCode : 500;

    logger.error({
      correlation_id: correlationId,
      event: 'http_request_failed',
      error_name: failure instanceof Error ? failure.name : 'UnknownError',
    });

    response.setHeader('x-correlation-id', correlationId);
    response.status(statusCode).json({
      error: {
        code: failure instanceof HttpError ? failure.publicCode : 'INTERNAL_ERROR',
        message:
          failure instanceof HttpError
            ? failure.message
            : 'An unexpected error occurred.',
        correlation_id: correlationId,
      },
    });
  };
}
