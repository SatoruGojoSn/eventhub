export class ApiError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message, details) => new ApiError(400, message, details);
export const notFound = (message) => new ApiError(404, message);
export const conflict = (message) => new ApiError(409, message);
export const serviceUnavailable = (message) => new ApiError(503, message);
