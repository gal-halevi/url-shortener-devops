import { Request, Response, NextFunction } from 'express';

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error handling middleware
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log the error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error values
  let statusCode = 500;
  let message = 'Internal server error';
  let isOperational = false;

  // If it's our custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }
  // Database errors
  else if ((err as any).code === '23505') {
    statusCode = 409;
    message = 'Resource already exists';
    isOperational = true;
  }
  // Validation errors
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
    isOperational = true;
  }
  // JWT errors (for future use)
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    isOperational = true;
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    isOperational = true;
  }

  // Response object
  const errorResponse: any = {
    error: message,
    timestamp: new Date().toISOString(),
    path: req.path
  };

  // In development, include stack trace
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);

  // If error is not operational, we might want to exit process
  // For now, we just log it
  if (!isOperational) {
    console.error('CRITICAL: Non-operational error occurred');
  }
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new AppError(404, `Route ${req.originalUrl} not found`);
  next(error);
}

/**
 * Validation error helper
 */
export function createValidationError(message: string): AppError {
  return new AppError(400, message);
}

/**
 * Authentication error helper
 */
export function createAuthError(message: string = 'Authentication required'): AppError {
  return new AppError(401, message);
}

/**
 * Authorization error helper
 */
export function createForbiddenError(message: string = 'Access forbidden'): AppError {
  return new AppError(403, message);
}

/**
 * Not found error helper
 */
export function createNotFoundError(message: string = 'Resource not found'): AppError {
  return new AppError(404, message);
}