import { useEffect, useRef, useState } from 'react';
import { Tag } from 'antd';
import { Log } from '../services/api';
import { wsService } from '../services/websocket';
import { TaskLogData } from '../types';

interface LogViewerProps {
  taskId: string;
}

export default function LogViewer({ taskId }: LogViewerProps) {
  const [logs, setLogs] = useState<Log[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [connected, setConnected] = useState(false);
  const seenLogsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // 重置去重 Set 和日志列表
    seenLogsRef.current.clear();
    setLogs([]);
    
    // 订阅实时日志（包括历史日志）
    wsService.connect().then(() => {
      setConnected(true);
      
      // 发送订阅消息
      wsService.send({
        type: 'task.subscribe_logs',
        data: { task_id: taskId },
        timestamp: Date.now(),
      });

      // 监听日志消息
      const unsubscribe = wsService.subscribe('task.log', (data: TaskLogData) => {
        if (data.task_id === taskId) {
          // 创建唯一标识符，用于去重（使用 timestamp + message）
          const logKey = `${data.timestamp}-${data.message}`;
          
          // 如果已经存在，跳过
          if (seenLogsRef.current.has(logKey)) {
            return;
          }
          
          seenLogsRef.current.add(logKey);
          
          setLogs((prev) => [
            ...prev,
            {
              id: prev.length + 1,
              task_id: data.task_id,
              level: data.level,
              message: data.message,
              timestamp: new Date(data.timestamp * 1000).toISOString(),
            },
          ]);
          scrollToBottom();
        }
      });

      return () => {
        unsubscribe();
      };
    }).catch(console.error);

    return () => {
      // 清理工作
      seenLogsRef.current.clear();
    };
  }, [taskId]);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  const getLevelColor = (level: string) => {
    const colorMap: Record<string, string> = {
      info: 'blue',
      error: 'red',
      warn: 'orange',
      debug: 'default',
    };
    return colorMap[level] || 'default';
  };

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Tag color={connected ? 'green' : 'red'}>
          {connected ? '已连接' : '未连接'}
        </Tag>
      </div>
      <div
        ref={containerRef}
        style={{
          height: '500px',
          overflow: 'auto',
          background: '#001529',
          padding: '12px',
          fontFamily: 'monospace',
          fontSize: '12px',
        }}
      >
        {logs.map((log, index) => (
          <div key={index} style={{ marginBottom: '4px', color: '#fff' }}>
            <span style={{ color: '#888', marginRight: '8px' }}>
              [{new Date(log.timestamp).toLocaleTimeString()}]
            </span>
            <Tag color={getLevelColor(log.level)} style={{ marginRight: '8px' }}>
              {log.level.toUpperCase()}
            </Tag>
            <span>{log.message}</span>
          </div>
        ))}
        {logs.length === 0 && (
          <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
            暂无日志
          </div>
        )}
      </div>
    </div>
  );
}

