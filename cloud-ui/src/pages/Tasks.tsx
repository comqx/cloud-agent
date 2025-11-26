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
  Upload,
} from 'antd';
import { PlayCircleOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
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
  const [uploadedFile, setUploadedFile] = useState<any>(null);

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
      setAgents(res.data.filter(a => a.status === 'online'));
    } catch (error: any) {
      message.error('加载 Agent 列表失败');
    }
  };

  const loadFiles = async () => {
    try {
      const res = await fileAPI.list({ limit: 100 });
      setFiles(res.data);
    } catch (error: any) {
      message.error('加载文件列表失败');
    }
  };

  const loadTasks = async () => {
    try {
      const res = await taskAPI.list({ limit: 50 });
      setTasks(res.data);
    } catch (error: any) {
      // 静默失败，避免频繁提示
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      let fileId = values.file_id;

      // If file task and user uploaded a file, upload it first
      if (taskType === 'file' && uploadedFile) {
        const uploadRes = await fileAPI.upload(uploadedFile);
        fileId = uploadRes.data.id;
      }

      const agentIds = Array.isArray(values.agent_ids) ? values.agent_ids : [values.agent_ids];
      const promises = agentIds.map((agentId: string) =>
        taskAPI.create({
          agent_id: agentId,
          type: values.type,
          command: values.command || '',
          params: values.params ? JSON.parse(values.params) : undefined,
          file_id: fileId,
        })
      );

      await Promise.all(promises);
      message.success(`成功创建 ${agentIds.length} 个任务`);
      form.resetFields();
      setUploadedFile(null);
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
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString(),
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
          <Form.Item name="agent_ids" label="Agent" rules={[{ required: true, message: '请选择至少一个 Agent' }]}>
            <Select
              placeholder="选择 Agent (可多选)"
              mode="multiple"
              showSearch
              optionFilterProp="children"
              allowClear
            >
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
              <Option value="file">传递文件</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="command"
            label={
              taskType === 'api' ? 'HTTP 方法'
                : taskType === 'k8s' ? 'YAML/JSON 内容'
                  : taskType === 'elasticsearch' ? 'Elasticsearch DSL (JSON)'
                    : taskType === 'mongo' ? 'MongoDB 操作 (JSON)'
                      : '命令/内容'
            }
            rules={[{ required: taskType !== 'file', message: '请输入命令或内容' }]}
            help={
              taskType === 'api'
                ? '例如: GET, POST, PUT, DELETE 等'
                : taskType === 'k8s'
                  ? '输入 Kubernetes 资源的 YAML 或 JSON 配置。支持多资源（使用 --- 分隔）'
                  : taskType === 'elasticsearch'
                    ? '输入 Elasticsearch 操作 JSON，例如: {"operation": "bulk", "index": "test", "actions": [...]}'
                    : taskType === 'mongo'
                      ? '输入 MongoDB 操作 JSON，例如: {"operation": "insert", "collection": "users", "documents": [...]}'
                      : undefined
            }
          >
            <TextArea
              rows={
                taskType === 'api' ? 1
                  : taskType === 'k8s' ? 10
                    : taskType === 'elasticsearch' || taskType === 'mongo' ? 8
                      : 4
              }
              placeholder={
                taskType === 'api'
                  ? 'GET'
                  : taskType === 'k8s'
                    ? 'YAML 格式:\napiVersion: v1\nkind: Pod\nmetadata:\n  name: my-pod\n  namespace: default\nspec:\n  containers:\n  - name: nginx\n    image: nginx:1.21\n\n或 JSON 格式:\n{"apiVersion":"v1","kind":"Pod","metadata":{"name":"my-pod"},"spec":{...}}'
                    : taskType === 'elasticsearch'
                      ? '{"operation": "bulk", "index": "test_index", "actions": [{"index": {"_source": {"field": "value"}}}]}'
                      : taskType === 'mongo'
                        ? '{"operation": "insert", "collection": "users", "documents": [{"name": "test"}]}'
                        : taskType === 'shell'
                          ? '输入命令或内容'
                          : '输入 SQL 或命令'
              }
            />
          </Form.Item>
          <Form.Item
            name="params"
            label="参数 (JSON)"
            help={
              taskType === 'api'
                ? '示例: {"url": "https://api.example.com/users", "headers": {"Authorization": "Bearer token"}, "body": {"name": "test"}}'
                : taskType === 'k8s'
                  ? '操作参数：{"operation": "create|update|delete|patch|apply", "namespace": "default", "patch_type": "strategic|merge|json"}。operation 默认为 apply'
                  : taskType === 'mysql' || taskType === 'postgres' || taskType === 'clickhouse' || taskType === 'doris'
                    ? '数据库参数：{"target": {"host": "...", "port": 3306, "user": "...", "secret_ref": "...", "db": "..."}, "connection": "default", "database": "test_db", "exec_options": {"trans_batch_size": 200, "backup": true, "timeout_ms": 600000}}'
                    : taskType === 'mongo' || taskType === 'elasticsearch'
                      ? '连接参数：{"connection": "default", "database": "test_db", "exec_options": {"timeout_ms": 600000}}'
                      : undefined
            }
          >
            <TextArea
              rows={
                taskType === 'api' ? 6
                  : taskType === 'k8s' ? 3
                    : taskType === 'mysql' || taskType === 'postgres' || taskType === 'clickhouse' || taskType === 'doris' || taskType === 'mongo' || taskType === 'elasticsearch' ? 6
                      : 2
              }
              placeholder={
                taskType === 'api'
                  ? '{\n  "url": "https://api.example.com/endpoint",\n  "headers": {\n    "Content-Type": "application/json",\n    "Authorization": "Bearer your-token"\n  },\n  "body": {\n    "key": "value"\n  }\n}'
                  : taskType === 'k8s'
                    ? '{\n  "operation": "apply",\n  "namespace": "default"\n}'
                    : taskType === 'mysql' || taskType === 'postgres' || taskType === 'clickhouse' || taskType === 'doris'
                      ? '{\n  "connection": "default",\n  "database": "test_db",\n  "exec_options": {\n    "trans_batch_size": 200,\n    "backup": true,\n    "timeout_ms": 600000\n  },\n  "metadata": {\n    "env": "prod",\n    "creator": "user"\n  }\n}'
                      : taskType === 'mongo' || taskType === 'elasticsearch'
                        ? '{\n  "connection": "default",\n  "database": "test_db",\n  "exec_options": {\n    "timeout_ms": 600000\n  }\n}'
                        : '{"key": "value"}'
              }
            />
          </Form.Item>
          {taskType === 'file' ? (
            <Form.Item label="上传文件">
              <Upload
                beforeUpload={(file) => {
                  setUploadedFile(file);
                  message.success(`${file.name} 已选择`);
                  return false;
                }}
                onRemove={() => {
                  setUploadedFile(null);
                }}
                maxCount={1}
              >
                <Button icon={<UploadOutlined />}>选择文件</Button>
              </Upload>
            </Form.Item>
          ) : (
            <Form.Item name="file_id" label="关联文件">
              <Select placeholder="选择文件（可选）" allowClear>
                {files.map((file) => (
                  <Option key={file.id} value={file.id}>
                    {file.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
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

