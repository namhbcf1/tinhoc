import { Context } from 'hono';
import { z } from 'zod';

export type SuccessResponse<T> = {
  success: true;
  data: T;
  meta?: any;
};

export type ErrorResponse = {
  success: false;
  error: {
    message: string;
    code: string;
    details?: any;
  };
};

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export interface GetEndpointConfig<
  ParamsSchema extends z.ZodTypeAny,
  QuerySchema extends z.ZodTypeAny,
  ResponseType
> {
  params?: ParamsSchema;
  query?: QuerySchema;
  handler: (
    c: Context,
    input: {
      params: z.infer<ParamsSchema>;
      query: z.infer<QuerySchema>;
    }
  ) => Promise<ApiResponse<ResponseType>> | ApiResponse<ResponseType>;
}

export interface PostEndpointConfig<
  ParamsSchema extends z.ZodTypeAny,
  QuerySchema extends z.ZodTypeAny,
  BodySchema extends z.ZodTypeAny,
  ResponseType
> {
  params?: ParamsSchema;
  query?: QuerySchema;
  body?: BodySchema;
  handler: (
    c: Context,
    input: {
      params: z.infer<ParamsSchema>;
      query: z.infer<QuerySchema>;
      body: z.infer<BodySchema>;
    }
  ) => Promise<ApiResponse<ResponseType>> | ApiResponse<ResponseType>;
}
