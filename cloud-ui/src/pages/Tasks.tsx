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
  Switch,
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
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<string | undefined>(undefined);
  const [helmOperation, setHelmOperation] = useState<string>('install');
  const [helmChartFile, setHelmChartFile] = useState<any>(null);
  const [helmValuesFile, setHelmValuesFile] = useState<any>(null);

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

  // 获取所有唯一的集群名称
  const getClusters = () => {
    const clusters = Array.from(new Set(agents.map(a => a.env).filter(Boolean))) as string[];
    return clusters.sort();
  };

  // 根据选择的集群筛选 agent
  // 如果没有选择集群，返回空数组（必须先选择集群才能选择 Agent）
  const getFilteredAgents = () => {
    if (!selectedCluster) {
      return [];
    }
    return agents.filter(a => a.env === selectedCluster);
  };

  // 处理集群选择变化
  const handleClusterChange = (cluster: string | undefined) => {
    setSelectedCluster(cluster);
    // 清空已选择的 agent
    form.setFieldsValue({ agent_ids: undefined });
  };

  // 检查是否已全选
  const isAllSelected = () => {
    const filteredAgents = getFilteredAgents();
    if (filteredAgents.length === 0) return false;
    const currentValues = form.getFieldValue('agent_ids') || [];
    const filteredAgentIds = filteredAgents.map(a => a.id);
    return filteredAgentIds.every((id: string) => currentValues.includes(id));
  };

  // 处理选项选择
  const handleOptionSelect = (value: string) => {
    if (value === '__SELECT_ALL__') {
      // 全选：添加所有 agent ID
      const filteredAgents = getFilteredAgents();
      const allAgentIds = filteredAgents.map(a => a.id);
      const currentValues = form.getFieldValue('agent_ids') || [];
      const newValues = Array.from(new Set([...currentValues, ...allAgentIds]));
      form.setFieldsValue({ agent_ids: newValues });
    }
  };

  // 处理选项取消选择
  const handleOptionDeselect = (value: string) => {
    if (value === '__SELECT_ALL__') {
      // 取消全选：移除所有当前筛选的 agent
      const filteredAgents = getFilteredAgents();
      const filteredAgentIds = filteredAgents.map(a => a.id);
      const currentValues = form.getFieldValue('agent_ids') || [];
      const newValues = currentValues.filter((id: string) => !filteredAgentIds.includes(id));
      form.setFieldsValue({ agent_ids: newValues });
    }
  };

  // 处理 Select 值变化
  const handleAgentIdsChange = (values: string[]) => {
    const filteredAgents = getFilteredAgents();
    const filteredAgentIds = filteredAgents.map(a => a.id);
    const hasSelectAll = values.includes('__SELECT_ALL__');
    const agentValues = values.filter(v => v !== '__SELECT_ALL__');
    const allSelected = filteredAgentIds.length > 0 && filteredAgentIds.every((id: string) => agentValues.includes(id));

    // 如果全选选项被选中
    if (hasSelectAll) {
      // 确保所有 agent 都被选中
      const allAgentIds = filteredAgents.map(a => a.id);
      const newValues = Array.from(new Set([...agentValues, ...allAgentIds, '__SELECT_ALL__']));
      form.setFieldsValue({ agent_ids: newValues });
    } else {
      // 如果全选选项未选中
      if (allSelected) {
        // 如果所有 agent 都被选中，自动添加全选标记（让复选框显示为选中）
        const newValues = [...agentValues, '__SELECT_ALL__'];
        form.setFieldsValue({ agent_ids: newValues });
      } else {
        // 如果未全选，保持当前状态（不包含全选标记）
        form.setFieldsValue({ agent_ids: agentValues });
      }
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
      // 过滤掉全选选项
      let agentIds = Array.isArray(values.agent_ids) ? values.agent_ids : [values.agent_ids];
      agentIds = agentIds.filter((id: string) => id !== '__SELECT_ALL__');

      // If file task and user uploaded files, upload them first and create tasks
      if (taskType === 'file' && uploadedFiles.length > 0) {
        let successCount = 0;
        let failCount = 0;

        for (const file of uploadedFiles) {
          try {
            const uploadRes = await fileAPI.upload(file);
            const fileId = uploadRes.data.id;

            // Create task for each agent
            const promises = agentIds.map((agentId: string) =>
              taskAPI.create({
                agent_id: agentId,
                type: values.type,
                command: values.command || '',
                params: values.params ? JSON.parse(values.params) : undefined,
                file_id: fileId,
                sync: values.sync || false,
                timeout: values.timeout || 60,
              })
            );

            await Promise.all(promises);
            successCount++;
          } catch (error) {
            failCount++;
          }
        }

        if (failCount > 0) {
          message.warning(`上传完成: ${successCount} 个文件成功, ${failCount} 个失败`);
        } else {
          message.success(`成功上传并分发 ${successCount} 个文件到 ${agentIds.length} 个 Agent`);
        }
      } else if (taskType === 'helm' && (helmChartFile || helmValuesFile)) {
        // Helm task with file uploads
        let chartFileId = '';
        let valuesFileId = '';

        // Upload chart file if provided
        if (helmChartFile) {
          try {
            const uploadRes = await fileAPI.upload(helmChartFile);
            chartFileId = uploadRes.data.id;
            message.success(`Chart 文件上传成功: ${helmChartFile.name}`);
          } catch (error: any) {
            message.error(`Chart 文件上传失败: ${error.message}`);
            setLoading(false);
            return;
          }
        }

        // Upload values file if provided
        if (helmValuesFile) {
          try {
            const uploadRes = await fileAPI.upload(helmValuesFile);
            valuesFileId = uploadRes.data.id;
            message.success(`Values 文件上传成功: ${helmValuesFile.name}`);
          } catch (error: any) {
            message.error(`Values 文件上传失败: ${error.message}`);
            setLoading(false);
            return;
          }
        }

        // Parse params and add file IDs
        let params: any = values.params ? JSON.parse(values.params) : {};
        params.operation = helmOperation;
        if (chartFileId) {
          params.chart_file_id = chartFileId;
        }
        if (valuesFileId) {
          params.values_file_id = valuesFileId;
        }

        // Create tasks
        const promises = agentIds.map((agentId: string) =>
          taskAPI.create({
            agent_id: agentId,
            type: values.type,
            command: values.command || '',
            params: params,
            sync: values.sync || false,
            timeout: values.timeout || 60,
          })
        );

        await Promise.all(promises);
        message.success(`成功创建 ${agentIds.length} 个 Helm 任务`);
      } else {
        // Non-file task or no files uploaded
        let fileId = values.file_id;

        // For helm tasks, ensure operation is in params
        let params: any = values.params ? JSON.parse(values.params) : {};
        if (taskType === 'helm') {
          params.operation = helmOperation;
        }

        const promises = agentIds.map((agentId: string) =>
          taskAPI.create({
            agent_id: agentId,
            type: values.type,
            command: values.command || '',
            params: Object.keys(params).length > 0 ? params : undefined,
            file_id: fileId,
            sync: values.sync || false,
            timeout: values.timeout || 60,
          })
        );

        await Promise.all(promises);
        message.success(`成功创建 ${agentIds.length} 个任务`);
      }

      form.resetFields();
      setUploadedFiles([]);
      setHelmChartFile(null);
      setHelmValuesFile(null);
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
          <Form.Item name="cluster" label="集群">
            <Select
              placeholder="选择集群（可选，用于筛选 Agent）"
              allowClear
              onChange={handleClusterChange}
              showSearch
              optionFilterProp="children"
            >
              {getClusters().map((cluster) => (
                <Option key={cluster} value={cluster}>
                  {cluster}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="agent_ids"
            label="Agent"
            rules={[
              {
                required: true,
                message: '请选择至少一个 Agent',
                validator: (_, value) => {
                  if (!value || value.length === 0) {
                    return Promise.reject(new Error('请选择至少一个 Agent'));
                  }
                  // 如果只有全选选项，也不算有效
                  const validValues = value.filter((v: string) => v !== '__SELECT_ALL__');
                  if (validValues.length === 0) {
                    return Promise.reject(new Error('请选择至少一个 Agent'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
            dependencies={['cluster']}
          >
            <Select
              placeholder={
                selectedCluster
                  ? `选择 ${selectedCluster} 集群下的 Agent (可多选)`
                  : getClusters().length > 0
                    ? "请先选择集群"
                    : "暂无可用集群"
              }
              disabled={!selectedCluster && getClusters().length > 0}
              mode="multiple"
              showSearch
              optionFilterProp="children"
              allowClear
              onSelect={handleOptionSelect}
              onDeselect={handleOptionDeselect}
              onChange={handleAgentIdsChange}
              maxTagCount="responsive"
              dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
              tagRender={(props) => {
                // 不显示全选选项的标签
                if (props.value === '__SELECT_ALL__') {
                  return <></>;
                }
                // 使用默认的标签渲染
                return (
                  <span
                    style={{
                      display: 'inline-block',
                      margin: '2px 4px',
                      padding: '2px 8px',
                      background: '#f0f0f0',
                      borderRadius: '4px',
                    }}
                  >
                    {props.label}
                    <span
                      onClick={props.onClose}
                      style={{ marginLeft: '4px', cursor: 'pointer' }}
                    >
                      ×
                    </span>
                  </span>
                );
              }}
              filterOption={(input, option) => {
                // 全选选项始终显示
                if (option?.value === '__SELECT_ALL__') return true;
                const agent = getFilteredAgents().find(a => a.id === option?.value);
                if (!agent) return false;
                const searchText = input.toLowerCase();
                return (
                  agent.hostname.toLowerCase().includes(searchText) ||
                  (agent.env && agent.env.toLowerCase().includes(searchText)) ||
                  agent.ip.toLowerCase().includes(searchText)
                );
              }}
            >
              {getFilteredAgents().length > 0 && (
                <Option
                  key="__SELECT_ALL__"
                  value="__SELECT_ALL__"
                >
                  <span style={{ fontWeight: 'bold' }}>
                  {isAllSelected() ? '✓ 已全选' : `全选 (${getFilteredAgents().length} 个)`}
                  </span>
                </Option>
              )}
              {getFilteredAgents().map((agent) => (
                <Option key={agent.id} value={agent.id}>
                  <span>{agent.hostname}</span>
                  {agent.env && <span style={{ color: '#999', marginLeft: '8px' }}>({agent.env})</span>}
                  {agent.ip && <span style={{ color: '#999', marginLeft: '8px', fontSize: '12px' }}>{agent.ip}</span>}
                </Option>
              ))}
            </Select>
            {!selectedCluster && getClusters().length > 0 && (
              <div style={{ color: '#faad14', fontSize: '12px', marginTop: '4px' }}>
                请先选择集群，然后选择该集群下的 Agent
              </div>
            )}
            {selectedCluster && getFilteredAgents().length === 0 && (
              <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
                该集群下没有可用的 Agent
              </div>
            )}
            {selectedCluster && getFilteredAgents().length > 0 && (
              <div style={{ color: '#52c41a', fontSize: '12px', marginTop: '4px' }}>
                找到 {getFilteredAgents().length} 个可用 Agent
              </div>
            )}
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
              <Option value="helm">Helm 部署</Option>
            </Select>
          </Form.Item>
          {taskType === 'helm' && (
            <Form.Item name="helm_operation" label="Helm 操作" rules={[{ required: true }]} initialValue="install">
              <Select onChange={(value) => setHelmOperation(value)}>
                <Option value="install">Install - 安装 Chart</Option>
                <Option value="upgrade">Upgrade - 升级 Release</Option>
                <Option value="list">List - 列出 Releases</Option>
                <Option value="delete">Delete - 删除 Release</Option>
                <Option value="get-values">Get Values - 获取 Values</Option>
              </Select>
            </Form.Item>
          )}
          {/* Command 字段 - 根据任务类型显示不同的标签和帮助 */}
          {taskType !== 'file' && (
          <Form.Item
            name="command"
            label={
              taskType === 'api' ? 'HTTP 方法'
                : taskType === 'k8s' ? 'YAML/JSON 内容'
                  : taskType === 'helm' ? 'Release 名称'
                    : taskType === 'elasticsearch' ? 'Elasticsearch DSL (JSON)'
                      : taskType === 'mongo' ? 'MongoDB 操作 (JSON)'
                          : taskType === 'shell' ? 'Shell 命令'
                            : taskType === 'mysql' || taskType === 'postgres' || taskType === 'clickhouse' || taskType === 'doris' ? 'SQL 语句'
                        : '命令/内容'
            }
              rules={[{ required: !(taskType === 'helm' && helmOperation === 'list'), message: '请输入命令或内容' }]}
            help={
              taskType === 'api'
                ? '例如: GET, POST, PUT, DELETE 等'
                : taskType === 'k8s'
                  ? '输入 Kubernetes 资源的 YAML 或 JSON 配置。支持多资源（使用 --- 分隔）'
                  : taskType === 'helm'
                    ? (helmOperation === 'list' ? '列出操作不需要 Release 名称' : '输入 Helm Release 名称，例如: my-nginx')
                    : taskType === 'elasticsearch'
                      ? '输入 Elasticsearch 操作 JSON，例如: {"operation": "bulk", "index": "test", "actions": [...]}'
                      : taskType === 'mongo'
                        ? '输入 MongoDB 操作 JSON，例如: {"operation": "insert", "collection": "users", "documents": [...]}'
                          : taskType === 'shell'
                            ? '输入要执行的 Shell 命令'
                            : taskType === 'mysql' || taskType === 'postgres' || taskType === 'clickhouse' || taskType === 'doris'
                              ? '输入 SQL 语句（支持多语句，用分号分隔）。也可以选择下方的 SQL 文件'
                        : undefined
            }
          >
            <TextArea
              rows={
                taskType === 'api' ? 1
                  : taskType === 'k8s' ? 10
                    : taskType === 'helm' ? 1
                      : taskType === 'elasticsearch' || taskType === 'mongo' ? 8
                          : taskType === 'shell' ? 4
                            : 6
              }
              placeholder={
                taskType === 'api'
                  ? 'GET'
                  : taskType === 'k8s'
                    ? 'YAML 格式:\napiVersion: v1\nkind: Pod\nmetadata:\n  name: my-pod\n  namespace: default\nspec:\n  containers:\n  - name: nginx\n    image: nginx:1.21\n\n或 JSON 格式:\n{"apiVersion":"v1","kind":"Pod","metadata":{"name":"my-pod"},"spec":{...}}'
                    : taskType === 'helm'
                      ? (helmOperation === 'list' ? '列出操作不需要 Release 名称' : 'my-nginx')
                      : taskType === 'elasticsearch'
                        ? '{"operation": "bulk", "index": "test_index", "actions": [{"index": {"_source": {"field": "value"}}}]}'
                        : taskType === 'mongo'
                          ? '{"operation": "insert", "collection": "users", "documents": [{"name": "test"}]}'
                          : taskType === 'shell'
                              ? '例如: ls -la /tmp'
                              : taskType === 'mysql' || taskType === 'postgres' || taskType === 'clickhouse' || taskType === 'doris'
                                ? '例如: SELECT * FROM users; INSERT INTO users (name) VALUES (\'test\');'
                                : '输入命令或内容'
              }
              disabled={taskType === 'helm' && helmOperation === 'list'}
            />
          </Form.Item>
          )}
          {taskType === 'helm' && (helmOperation === 'install' || helmOperation === 'upgrade') && (
            <>
              <Form.Item label="Chart 文件 (.tgz)">
                <Upload
                  beforeUpload={(file) => {
                    if (!file.name.endsWith('.tgz')) {
                      message.error('请上传 .tgz 格式的 Helm Chart 文件');
                      return false;
                    }
                    setHelmChartFile(file);
                    message.success(`${file.name} 已选择`);
                    return false;
                  }}
                  onRemove={() => setHelmChartFile(null)}
                  maxCount={1}
                  fileList={helmChartFile ? [{ uid: helmChartFile.uid, name: helmChartFile.name, status: 'done' }] : []}
                >
                  <Button icon={<UploadOutlined />}>选择 Chart 文件</Button>
                </Upload>
              </Form.Item>
              <Form.Item label="自定义 Values 文件 (.yaml, 可选)">
                <Upload
                  beforeUpload={(file) => {
                    if (!file.name.endsWith('.yaml') && !file.name.endsWith('.yml')) {
                      message.error('请上传 .yaml 或 .yml 格式的 Values 文件');
                      return false;
                    }
                    setHelmValuesFile(file);
                    message.success(`${file.name} 已选择`);
                    return false;
                  }}
                  onRemove={() => setHelmValuesFile(null)}
                  maxCount={1}
                  fileList={helmValuesFile ? [{ uid: helmValuesFile.uid, name: helmValuesFile.name, status: 'done' }] : []}
                >
                  <Button icon={<UploadOutlined />}>选择 Values 文件</Button>
                </Upload>
              </Form.Item>
            </>
          )}
          {/* Params 字段 - 只在需要参数的任务类型显示 */}
          {(taskType === 'api' || taskType === 'k8s' || taskType === 'helm' || 
            taskType === 'mysql' || taskType === 'postgres' || taskType === 'clickhouse' || 
            taskType === 'doris' || taskType === 'mongo' || taskType === 'elasticsearch') && (
          <Form.Item
            name="params"
            label="参数 (JSON)"
            help={
              taskType === 'api'
                ? '示例: {"url": "https://api.example.com/users", "headers": {"Authorization": "Bearer token"}, "body": {"name": "test"}}'
                : taskType === 'k8s'
                  ? '操作参数：{"operation": "create|update|delete|patch|apply", "namespace": "default", "patch_type": "strategic|merge|json"}。operation 默认为 apply'
                  : taskType === 'helm'
                    ? 'Helm 参数：{"namespace": "default", "repository": {"url": "https://charts.bitnami.com/bitnami", "name": "bitnami"}, "chart": "bitnami/nginx", "version": "1.0.0", "values": {"key": "value"}, "flags": {"create_namespace": true, "wait": true, "timeout": "5m"}}'
                    : taskType === 'mysql' || taskType === 'postgres' || taskType === 'clickhouse' || taskType === 'doris'
                        ? '数据库参数：{"target": {"host": "...", "port": 3306, "user": "...", "password": "...", "db": "..."}, "connection": "default", "database": "test_db", "exec_options": {"trans_batch_size": 200, "backup": true, "timeout_ms": 600000}}'
                      : taskType === 'mongo' || taskType === 'elasticsearch'
                          ? '连接参数：{"target": {"host": "...", "port": 27017, "user": "...", "password": "...", "db": "..."}, "connection": "default", "database": "test_db", "exec_options": {"timeout_ms": 600000}}'
                        : undefined
            }
          >
            <TextArea
              rows={
                taskType === 'api' ? 6
                  : taskType === 'k8s' ? 3
                    : taskType === 'helm' ? 8
                      : taskType === 'mysql' || taskType === 'postgres' || taskType === 'clickhouse' || taskType === 'doris' || taskType === 'mongo' || taskType === 'elasticsearch' ? 6
                        : 2
              }
              placeholder={
                taskType === 'api'
                  ? '{\n  "url": "https://api.example.com/endpoint",\n  "headers": {\n    "Content-Type": "application/json",\n    "Authorization": "Bearer your-token"\n  },\n  "body": {\n    "key": "value"\n  }\n}'
                  : taskType === 'k8s'
                    ? '{\n  "operation": "apply",\n  "namespace": "default"\n}'
                    : taskType === 'helm'
                        ? '{\n  "namespace": "default",\n  "repository": {\n    "url": "https://charts.bitnami.com/bitnami",\n    "name": "bitnami"\n  },\n  "chart": "bitnami/nginx",\n  "version": "1.0.0",\n  "values": {},\n  "flags": {\n    "create_namespace": true,\n    "wait": true,\n    "timeout": "5m"\n  }\n}'
                      : taskType === 'mysql' || taskType === 'postgres' || taskType === 'clickhouse' || taskType === 'doris'
                          ? '{\n  "target": {\n    "host": "mysql.example.com",\n    "port": 3306,\n    "user": "admin",\n    "password": "password",\n    "db": "test_db"\n  },\n  "exec_options": {\n    "trans_batch_size": 200,\n    "backup": true,\n    "timeout_ms": 600000\n  }\n}'
                        : taskType === 'mongo' || taskType === 'elasticsearch'
                            ? '{\n  "target": {\n    "host": "mongo.example.com",\n    "port": 27017,\n    "user": "admin",\n    "password": "password",\n    "db": "test_db"\n  },\n  "exec_options": {\n    "timeout_ms": 600000\n  }\n}'
                          : '{"key": "value"}'
              }
            />
          </Form.Item>
          )}
          {/* 文件上传/选择 - 根据任务类型显示不同的文件处理方式 */}
          {taskType === 'file' ? (
            <Form.Item label="上传文件" required>
              <Upload
                multiple
                beforeUpload={(file) => {
                  setUploadedFiles(prev => [...prev, file]);
                  message.success(`${file.name} 已选择`);
                  return false;
                }}
                onRemove={(file) => {
                  setUploadedFiles(prev => prev.filter(f => f.uid !== file.uid));
                }}
                maxCount={50}
                fileList={uploadedFiles.map(f => ({
                  uid: f.uid,
                  name: f.name,
                  status: 'done',
                }))}
              >
                <Button icon={<UploadOutlined />}>选择文件 (最多50个)</Button>
              </Upload>
              <div style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
                文件将被上传并分发到选定的 Agent
              </div>
            </Form.Item>
          ) : (taskType === 'mysql' || taskType === 'postgres' || taskType === 'clickhouse' || taskType === 'doris' || taskType === 'k8s') ? (
            <Form.Item name="file_id" label="SQL/配置文件（可选）">
              <Select placeholder="选择已上传的 SQL 或配置文件" allowClear showSearch>
                {files
                  .filter(file => {
                    if (taskType === 'k8s') {
                      return file.name.endsWith('.yaml') || file.name.endsWith('.yml') || file.name.endsWith('.json');
                    }
                    return file.name.endsWith('.sql') || file.name.endsWith('.zip');
                  })
                  .map((file) => (
                    <Option key={file.id} value={file.id}>
                      {file.name}
                    </Option>
                  ))}
              </Select>
              <div style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
                {taskType === 'k8s' 
                  ? '如果选择文件，将从文件读取 YAML/JSON 配置，command 字段将被忽略'
                  : '如果选择文件，将从文件读取 SQL，command 字段将被忽略'}
              </div>
            </Form.Item>
          ) : taskType !== 'helm' ? (
            <Form.Item name="file_id" label="关联文件（可选）">
              <Select placeholder="选择已上传的文件" allowClear showSearch>
                {files.map((file) => (
                  <Option key={file.id} value={file.id}>
                    {file.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          ) : null}
          
          {/* 同步模式选项 - 所有任务类型都支持 */}
          <Form.Item 
            name="sync" 
            label="执行模式" 
            initialValue={false}
            valuePropName="checked"
            tooltip="同步模式：等待任务执行完成后返回结果。异步模式：立即返回，不等待执行完成。"
          >
            <Switch 
              checkedChildren="同步模式" 
              unCheckedChildren="异步模式（默认）"
            />
          </Form.Item>
          
          <Form.Item 
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.sync !== currentValues.sync}
          >
            {({ getFieldValue }) =>
              getFieldValue('sync') ? (
                <Form.Item 
                  name="timeout" 
                  label="同步超时时间（秒）" 
                  initialValue={60}
                  rules={[
                    { required: true, message: '请输入超时时间' },
                    { type: 'number', min: 1, max: 300, message: '超时时间必须在 1-300 秒之间' }
                  ]}
                >
                  <Input type="number" min={1} max={300} placeholder="60" />
                </Form.Item>
              ) : null
            }
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

