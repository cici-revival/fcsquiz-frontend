export class ApiError extends Error {
  public status: number;
  public statusText: string;
  public data?: unknown;

  constructor(
    message: string,
    status: number,
    statusText: string,
    data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Требуется авторизация') {
    super(message, 401, 'Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Доступ запрещен') {
    super(message, 403, 'Forbidden');
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Ресурс не найден') {
    super(message, 404, 'Not Found');
    this.name = 'NotFoundError';
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = 'Внутренняя ошибка сервера') {
    super(message, 500, 'Internal Server Error');
    this.name = 'InternalServerError';
  }
}
