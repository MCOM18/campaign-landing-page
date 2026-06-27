import { apiClient } from "@/lib/api/client";

const api = {
  post: async (endpoint: string, body: any, options: any = {}) => {
    const headers = options.headers || {};
    const res = await apiClient.post<any>(endpoint, body, {
      encrypt: true,
      headers
    });
    
    // Wrap to match the structure expected by the original hooks:
    // response.data contains {"meta-data": ..., data: ...}
    const rawData = {
      "meta-data": res?.metaData || res?.["meta-data"] || { status: 200 },
      data: res?.data !== undefined ? res.data : res
    };
    
    return {
      data: rawData
    };
  },
  get: async (endpoint: string, options: any = {}) => {
    const headers = options.headers || {};
    const res = await apiClient.get<any>(endpoint, {
      headers
    });
    
    const rawData = {
      "meta-data": res?.metaData || res?.["meta-data"] || { status: 200 },
      data: res?.data !== undefined ? res.data : res
    };
    
    return {
      data: rawData
    };
  }
};

export default api;
