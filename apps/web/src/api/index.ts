import axios from 'axios';
import { ElMessage } from 'element-plus';

// 创建 axios 实例
const api = axios.create({
  baseURL: 'http://localhost:3001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 可以在这里添加 token 等认证信息
    return config;
  },
  (error) => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    const { data } = response;

    // 统一处理响应格式
    if (data.success === false) {
      ElMessage.error(data.error || data.message || '请求失败');
      return Promise.reject(new Error(data.error || data.message || '请求失败'));
    }

    return data.data;
  },
  (error) => {
    console.error('响应错误:', error);

    // 处理不同的错误状态码
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 400:
          ElMessage.error(data.error || '请求参数错误');
          break;
        case 404:
          ElMessage.error(data.error || '请求的资源不存在');
          break;
        case 409:
          ElMessage.error(data.error || '资源冲突');
          break;
        case 500:
          ElMessage.error(data.error || '服务器错误');
          break;
        default:
          ElMessage.error(data.error || '请求失败');
      }
    } else if (error.request) {
      ElMessage.error('网络错误，请检查网络连接');
    } else {
      ElMessage.error(error.message || '请求失败');
    }

    return Promise.reject(error);
  }
);

export default api;
