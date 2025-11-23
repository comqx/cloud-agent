import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Select,
  Input,
  Button,
  Table,
  Tag,
  Modal,
  message,
  Space,
} from 'antd';
import { PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { taskAPI, agentAPI, fileAPI, Task, Agent, File as FileType } from '../services/api';
import LogViewer from '../components/LogViewer';

const { TextArea } = Input;
const { Option } = Select;

export default function Tasks() {
  const [form] = Form.useForm();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<FileType[]>([]);
  const [loading, setLoading] = useState(false);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [taskType, setTaskType] = useState<string>('shell');

  useEffect(() => {
    loadAgents();
    loadFiles();
    loadTasks();
    const interval = setInterval(loadTasks, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadAgents = async () => {
    try {
      const res = await agentAPI.list();
      setAgents(res.data.data.filter((a: Agent) => a.status === 'online'));
    } catch (error: any) {
      message.error('加载 Agent 列表失败');
    }
  };

  const loadFiles = async () => {
    try {
      const res = await fileAPI.list({ limit: 100 });
      setFiles(res.data.data);
    } catch (error: any) {
      message.error('加载文件列表失败');
    }
  };

  const loadTasks = async () => {
    try {
      const res = await taskAPI.list({ limit: 50 });
      setTasks(res.data.data);
    } catch (error: any) {
      // 静默失败，避免频繁提示
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await taskAPI.create({
        agent_id: values.agent_id,
        type: values.type,
        command: values.command,
        params: values.params ? JSON.parse(values.params) : undefined,
        file_id: values.file_id,
      });
      message.success('任务创建成功');
      form.resetFields();
      loadTasks();
    } catch (error: any) {
      message.error('创建任务失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewLogs = (taskId: string) => {
    setSelectedTaskId(taskId);
    setLogModalVisible(true);
  };

  const handleCancel = async (taskId: string) => {
    try {
      await taskAPI.cancel(taskId);
      message.success('任务已取消');
      loadTasks();
    } catch (error: any) {
      message.error('取消任务失败');
    }
  };

  const handleRetry = async (task: Task) => {
    setLoading(true);
    try {
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
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text: string) => (text ? new Date(text).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Task) => (
        <Space>
          <Button size="small" onClick={() => handleViewLogs(record.id)}>
            日志
          </Button>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => handleRetry(record)}
            disabled={loading}
          >
            重新执行
          </Button>
          {(record.status === 'pending' || record.status === 'running') && (
            <Button size="small" danger onClick={() => handleCancel(record.id)}>
              取消
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card title="创建任务" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="agent_id" label="Agent" rules={[{ required: true }]}>
            <Select placeholder="选择 Agent" showSearch>
              {agents.map((agent) => (
                <Option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.id.substring(0, 8)})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="type" label="任务类型" rules={[{ required: true }]}>
            <Select onChange={(value) => setTaskType(value)}>
              <Option value="shell">Shell 命令</Option>
              <Option value="mysql">MySQL</Option>
              <Option value="postgres">PostgreSQL</Option>
              <Option value="redis">Redis</Option>
              <Option value="mongo">MongoDB</Option>
              <Option value="elasticsearch">Elasticsearch</Option>
              <Option value="clickhouse">ClickHouse</Option>
              <Option value="doris">Doris</Option>
              <Option value="k8s">Kubernetes</Option>
              <Option value="api">API 调用</Option>
              <Option value="file">文件操作</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="command"
            label="命令/内容"
            rules={[{ required: true }]}
          >
            <TextArea rows={4} placeholder="输入命令或内容" />
          </Form.Item>
          <Form.Item name="params" label="参数 (JSON)">
            <TextArea rows={2} placeholder='{"key": "value"}' />
          </Form.Item>
          <Form.Item name="file_id" label="关联文件">
            <Select placeholder="选择文件（可选）" allowClear>
              {files.map((file) => (
                <Option key={file.id} value={file.id}>
                  {file.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} icon={<PlayCircleOutlined />}>
              执行任务
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="任务列表">
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
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

