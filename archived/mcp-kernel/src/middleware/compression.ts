import { Middleware } from '../types';

export const compressionMiddleware: Middleware = async (ctx, next) => {
  await next();
};
