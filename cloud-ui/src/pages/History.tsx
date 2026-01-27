import { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, message, Modal, Space } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { taskAPI, Task } from '../services/api';
import LogViewer from '../components/LogViewer';

export default function History() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await taskAPI.list({ limit: 100 });
      const tasksData: Task[] = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setTasks(tasksData);
    } catch (error: any) {
      message.error('加载任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleViewLogs = (taskId: string) => {
    setSelectedTaskId(taskId);
    setLogModalVisible(true);
  };

  const handleRetry = async (task: Task) => {
    setLoading(true);
    try {
      // 解析 params（可能是字符串或对象）
      let params: Record<string, any> | undefined;
      if (task.params) {
        if (typeof task.params === 'string') {
          try {
            params = JSON.parse(task.params);
          } catch {
            params = undefined;
          }
        } else {
          params = task.params;
        }
      }

      // 创建新任务，使用原任务的参数
      await taskAPI.create({
        agent_id: task.agent_id,
        type: task.type,
        command: task.command,
        params: params,
        file_id: task.file_id || undefined,
      });
      message.success('任务重新执行成功');
      loadTasks();
    } catch (error: any) {
      message.error('重新执行任务失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 200,
      render: (text: string) => <code>{text.substring(0, 8)}...</code>,
    },
    {
      title: 'Agent',
      dataIndex: 'agent_id',
      key: 'agent_id',
      width: 150,
      render: (text: string) => <code>{text.substring(0, 8)}...</code>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          pending: 'default',
          running: 'processing',
          success: 'success',
          failed: 'error',
          canceled: 'warning',
        };
        return <Tag color={colorMap[status]}>{status}</Tag>;
      },
    },
    {
      title: '命令',
      dataIndex: 'command',
      key: 'command',
      ellipsis: true,
    },
    {
      title: '结果',
      dataIndex: 'result',
      key: 'result',
      ellipsis: true,
      render: (text: string) => (text ? <code>{text.substring(0, 100)}...</code> : '-'),
    },
    {
      title: '错误',
      dataIndex: 'error',
      key: 'error',
      ellipsis: true,
      render: (text: string) => (text ? <Tag color="red">{text.substring(0, 50)}...</Tag> : '-'),
    },
    {
      title: '开始时间',
      dataIndex: 'started_at',
      key: 'started_at',
      width: 180,
      render: (text: string) => (text ? new Date(text).toLocaleString() : '-'),
    },
    {
      title: '完成时间',
      dataIndex: 'finished_at',
      key: 'finished_at',
      width: 180,
      render: (text: string) => (text ? new Date(text).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: Task) => (
        <Space>
          <Button size="small" onClick={() => handleViewLogs(record.id)}>
            查看日志
          </Button>
          <Button 
            size="small" 
            icon={<ReloadOutlined />}
            onClick={() => handleRetry(record)}
            disabled={loading}
          >
            重新执行
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card title="任务历史记录">
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title="任务日志"
        open={logModalVisible}
        onCancel={() => setLogModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedTaskId && <LogViewer taskId={selectedTaskId} />}
      </Modal>
    </>
  );
}

