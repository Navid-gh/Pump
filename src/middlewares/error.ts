import { Request, Response, NextFunction } from 'express';

// Error middleware to catch and handle errors in the request chain
const errorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction): void => {
    if (!res.statusCode) res.status(500);
    res.json({ error: err.message });
    next();
};

export default errorMiddleware;
