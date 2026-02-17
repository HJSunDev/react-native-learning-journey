import type { AxiosRequestConfig } from 'axios';

/**
 * 封装后的 API 客户端接口。
 * 响应拦截器已将 AxiosResponse 解包为 response.data，
 * 因此所有请求方法直接返回 T（实际数据），而非 AxiosResponse<T>。
 */
export interface ApiClient {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
}
