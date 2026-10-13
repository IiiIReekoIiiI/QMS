export interface AuthenticatedUser {
  id: string;
  roles?: readonly string[];
  permissions?: readonly string[];
}

export interface ExpressRequestLike {
  body: unknown;
  params: Record<string, string>;
  headers: Record<string, string | readonly string[] | undefined>;
  user?: AuthenticatedUser;
  get(name: string): string | undefined;
}

export interface ExpressResponseLike {
  headersSent?: boolean;
  status(code: number): this;
  json(body: unknown): this;
  setHeader(name: string, value: string): void;
}

export type ExpressNext = (error?: unknown) => void;
export type ExpressHandler = (
  request: ExpressRequestLike,
  response: ExpressResponseLike,
  next: ExpressNext
) => void;

export type ExpressErrorHandler = (
  error: unknown,
  request: ExpressRequestLike,
  response: ExpressResponseLike,
  next: ExpressNext
) => void;

export interface ExpressRouterLike {
  post(path: string, handler: ExpressHandler): this;
  put(path: string, handler: ExpressHandler): this;
  delete(path: string, handler: ExpressHandler): this;
}

export interface ExpressFactoryLike {
  Router(): ExpressRouterLike;
}

export interface StructuredLogger {
  error(event: {
    correlation_id: string;
    event: 'http_request_failed';
    error_name: string;
  }): void;
}
