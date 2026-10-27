export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(message: string, details?: unknown): never {
  throw new ApiError(400, 'BAD_REQUEST', message, details);
}

export function unauthorized(message = 'Giriş yapmanız gerekiyor.'): never {
  throw new ApiError(401, 'UNAUTHORIZED', message);
}

export function forbidden(message = 'Bu işlem için yetkiniz yok.'): never {
  throw new ApiError(403, 'FORBIDDEN', message);
}

export function notFound(message = 'Kayıt bulunamadı.'): never {
  throw new ApiError(404, 'NOT_FOUND', message);
}

export function conflict(message: string, details?: unknown): never {
  throw new ApiError(409, 'CONFLICT', message, details);
}
