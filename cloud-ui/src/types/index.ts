export interface Message {
  type: string;
  id?: string;
  request_id?: string;
  data?: any;
  error?: string;
  timestamp: number;
}

export interface TaskLogData {
  task_id: string;
  level: string;
  message: string;
  timestamp: number;
}

