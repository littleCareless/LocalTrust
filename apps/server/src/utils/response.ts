/**
 * 统一 API 响应格式
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 成功响应
 */
export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message
  };
}

/**
 * 错误响应
 */
export function errorResponse(error: string, message?: string): ApiResponse {
  return {
    success: false,
    error,
    message
  };
}

/**
 * 处理异步操作并返回统一格式
 */
export async function handleAsync<T>(
  operation: () => Promise<T>,
  errorMessage = '操作失败'
): Promise<ApiResponse<T>> {
  try {
    const data = await operation();
    return successResponse(data);
  } catch (error) {
    console.error(errorMessage, error);
    return errorResponse(
      error instanceof Error ? error.message : String(error),
      errorMessage
    );
  }
}
