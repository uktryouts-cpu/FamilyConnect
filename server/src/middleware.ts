import type { Request, Response, NextFunction } from 'express';

export const logRequest = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'error' : 'info';
    console.log(`[${level}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  console.error(`[error] ${err.message}`, err);
  res.status(statusCode).json({ error: message });
};
