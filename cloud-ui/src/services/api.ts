import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
});

export interface Agent {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  version: string;
  env?: string; // K8s 集群名称
  protocol?: string; // 连接协议: ws 或 wss
  status: 'online' | 'offline' | 'error';
  last_seen?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  agent_id: string;
  type: 'shell' | 'mysql' | 'postgres' | 'redis' | 'mongo' | 'elasticsearch' | 'clickhouse' | 'doris' | 'k8s' | 'api' | 'file';
  status: 'pending' | 'running' | 'success' | 'failed' | 'canceled';
  command: string;
  params?: string;
  file_id?: string;
  result?: string;
  error?: string;
  started_at?: string;
  finished_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Log {
  id: number;
  task_id: string;
  level: string;
  message: string;
  timestamp: string;
}

export interface File {
  id: string;
  name: string;
  path: string;
  size: number;
  content_type: string;
  md5: string;
  created_at: string;
  updated_at: string;
}

// Agent API
export const agentAPI = {
  list: () => api.get<Agent[]>('/agents'),
  get: (id: string) => api.get<Agent>(`/agents/${id}`),
  getStatus: (id: string) => api.get<{ status: string }>(`/agents/${id}/status`),
  update: (id: string, data: Partial<Agent>) => api.put<Agent>(`/agents/${id}`, data),
  delete: (id: string) => api.delete(`/agents/${id}`),
};

// Task API
export const taskAPI = {
  create: (data: {
    agent_id: string;
    type: Task['type'];
    command: string;
    params?: Record<string, any>;
    file_id?: string;
  }) => api.post<Task>('/tasks', data),
  list: (params?: { agent_id?: string; limit?: number; offset?: number }) =>
    api.get<Task[]>('/tasks', { params }),
  get: (id: string) => api.get<Task>(`/tasks/${id}`),
  getLogs: (id: string, limit?: number) =>
    api.get<Log[]>(`/tasks/${id}/logs`, { params: { limit } }),
  cancel: (id: string) => api.post(`/tasks/${id}/cancel`),
};

// File API
export const fileAPI = {
  upload: (file: globalThis.File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<File>('/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  list: (params?: { limit?: number; offset?: number }) =>
    api.get<File[]>('/files', { params }),
  get: (id: string) => api.get<File>(`/files/${id}`),
  download: (id: string) => api.get(`/files/${id}/download`, { responseType: 'blob' }),
  distribute: (id: string, data: { agent_ids: string[]; path?: string }) =>
    api.post(`/files/${id}/distribute`, data),
};

