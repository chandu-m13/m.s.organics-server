import { Request, Response, NextFunction, RequestHandler } from 'express';
import HttpStatusCodes from './HTTP_STATUS_CODES';

const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let response = await fn(req, res, next);
      res.status(response.statusCode || 200).json(response).end();
    } catch (error: any) {
      console.error('Caught error in asyncHandler:', error);
      
      // Create a clean error response to avoid circular references
      const errorResponse = {
        statusCode: error.statusCode || HttpStatusCodes.INTERNAL_SERVER_ERROR,
        message: error.message || 'Internal server error',
        success: false,
        ...(error.data && { data: error.data }),
        ...(error.errors && { errors: error.errors })
      };
      
      res.status(errorResponse.statusCode).json(errorResponse).end();
      next(error);
    }
  };
};

export default asyncHandler;
