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
  Checkbox,
  Divider,
} from 'antd';
import { PlayCircleOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { Resizable } from 'react-resizable';
import { taskAPI, agentAPI, fileAPI, Task, Agent, File as FileType } from '../services/api';
import LogViewer from '../components/LogViewer';

const { TextArea } = Input;
const { Option } = Select;

const ResizableTitle = (props: any) => {
  const { onResize, width, ...restProps } = props;

  if (!width) {
    return <th {...restProps} />;
  }

  return (
    // @ts-ignore
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          className="react-resizable-handle"
          onClick={(e) => {
            e.stopPropagation();
          }}
        />
      }
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} />
    </Resizable>
  );
};

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

  // 监听选中的 Agent ID 列表
  const selectedAgentIds = Form.useWatch('agent_ids', form);

  // 表格列宽状态
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    id: 200,
    agent_id: 150,
    type: 100,
    status: 100,
    sync_mode: 120,
    command: 300,
    created_at: 180,
    action: 200,
  });

  const handleResize = (key: string) => (_: any, { size }: any) => {
    setColumnWidths((prev) => ({
      ...prev,
      [key]: size.width,
    }));
  };

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
      console.log('[DEBUG] loadAgents response:', res);
      console.log('[DEBUG] loadAgents res.data:', res.data);
      const agentsData: Agent[] = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      console.log('[DEBUG] loadAgents agentsData:', agentsData);
      setAgents(agentsData.filter((a: Agent) => a.status === 'online'));
    } catch (error: any) {
      console.error('[ERROR] loadAgents failed:', error);
      message.error('加载 Agent 列表失败: ' + (error.message || '未知错误'));
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

  // 注：这里不再把“全选”作为一个特殊 Option 混入表单值。
  // 表单字段 `agent_ids` 只保存真实的 agent id 列表；“全选”使用 `dropdownRender` 提供的复选框实现。


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
      const tasksData: Task[] = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setTasks(tasksData);
    } catch (error: any) {
      // 静默失败，避免频繁提示
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      let agentIds = Array.isArray(values.agent_ids) ? values.agent_ids : [values.agent_ids];

      // If file task and user uploaded files, upload them first and create tasks
      if (taskType === 'file' && uploadedFiles.length > 0) {
        let successCount = 0;
        let failCount = 0;

        for (const file of uploadedFiles) {
          try {
            const uploadRes = await fileAPI.upload(file);
            const fileId = uploadRes.data.id;

            // Create task for each agent
            // 确保 sync 值正确
            const syncValue = values.sync === true || values.sync === 'true' || values.sync === 1;
            const timeoutValue = values.timeout ? Number(values.timeout) : 60;

            const promises = agentIds.map((agentId: string) =>
              taskAPI.create({
                agent_id: agentId,
                type: values.type,
                command: values.command || '',
                params: values.params ? JSON.parse(values.params) : undefined,
                file_id: fileId,
                sync: syncValue,
                timeout: timeoutValue,
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

        // 确保 sync 值正确
        const syncValue = values.sync === true || values.sync === 'true' || values.sync === 1;
        const timeoutValue = values.timeout ? Number(values.timeout) : 60;

        // Create tasks
        const promises = agentIds.map((agentId: string) =>
          taskAPI.create({
            agent_id: agentId,
            type: values.type,
            command: values.command || '',
            params: params,
            sync: syncValue,
            timeout: timeoutValue,
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

        // 确保 sync 值正确（Switch 组件返回的是 boolean）
        const syncValue = values.sync === true || values.sync === 'true' || values.sync === 1;
        const timeoutValue = values.timeout ? Number(values.timeout) : 60;

        console.log('[DEBUG] Creating task with sync:', syncValue, 'timeout:', timeoutValue, 'values.sync:', values.sync);

        const promises = agentIds.map((agentId: string) => {
          const taskData = {
            agent_id: agentId,
            type: values.type,
            command: values.command || '',
            params: Object.keys(params).length > 0 ? params : undefined,
            file_id: fileId,
            sync: syncValue,
            timeout: timeoutValue,
          };
          console.log('[DEBUG] Task data:', JSON.stringify(taskData, null, 2));
          return taskAPI.create(taskData);
        });

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
      width: columnWidths.id,
      render: (text: string) => <div style={{ wordBreak: 'break-all', whiteSpace: 'normal' }}>{text}</div>,
    },
    {
      title: 'Agent',
      dataIndex: 'agent_id',
      key: 'agent_id',
      width: columnWidths.agent_id,
      render: (text: string) => {
        const agent = agents.find(a => a.id === text);
        const display = agent ? `${agent.hostname} (${agent.ip})` : text;
        return <div style={{ wordBreak: 'break-all', whiteSpace: 'normal' }}>{display}</div>;
      },
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: columnWidths.type,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: columnWidths.status,
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
      title: '执行模式',
      key: 'sync_mode',
      width: columnWidths.sync_mode,
      render: (_: any, record: Task) => {
        let isSync = false;
        let timeout = 60;
        
        // 从 params 中解析 sync 信息
        if (record.params) {
          try {
            const params = typeof record.params === 'string' 
              ? JSON.parse(record.params) 
              : record.params;
            if (params && typeof params === 'object' && params !== null) {
              // 检查 _sync 字段（可能是 boolean true 或字符串 "true"）
              const syncValue = params._sync;
              isSync = syncValue === true || syncValue === 'true' || syncValue === 1;
              timeout = params._timeout || 60;
            }
          } catch (e) {
            // 解析失败，默认为异步
          }
        }
        
        return (
          <Tag color={isSync ? 'blue' : 'default'}>
            {isSync ? `同步(${timeout}s)` : '异步'}
          </Tag>
        );
      },
    },
    {
      title: '命令',
      dataIndex: 'command',
      key: 'command',
      width: columnWidths.command,
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: columnWidths.created_at,
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: columnWidths.action,
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

  const mergedColumns = columns.map((col) => ({
    ...col,
    onHeaderCell: (column: any) => ({
      width: column.width,
      onResize: handleResize(column.key as string),
    }),
  }));

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
              optionLabelProp="label"
              optionFilterProp="children"
              allowClear
              value={selectedAgentIds || []}
              onChange={(values) => {
                form.setFieldValue('agent_ids', values);
              }}
              dropdownRender={(menu) => {
                const currentFilteredAgents = getFilteredAgents();
                const allAgentIds = currentFilteredAgents.map(a => a.id);
                const currentSelected = selectedAgentIds || [];
                const selectedInCurrent = currentSelected.filter((id: string) => allAgentIds.includes(id));
                const allSelected = allAgentIds.length > 0 && selectedInCurrent.length === allAgentIds.length;
                const indeterminate = selectedInCurrent.length > 0 && selectedInCurrent.length < allAgentIds.length;

                return (
                  <>
                    <div 
                      style={{ padding: '8px 12px', display: 'flex', alignItems: 'center' }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <Checkbox
                        checked={allSelected}
                        indeterminate={indeterminate}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // 保留已选中的非当前集群的 agent（如果需要跨集群多选），或者直接覆盖
                            // 这里假设是简单的全选当前列表
                            const newSelected = Array.from(new Set([...currentSelected, ...allAgentIds]));
                            form.setFieldValue('agent_ids', newSelected);
                          } else {
                            // 取消全选：移除当前列表中的 ID
                            const newSelected = currentSelected.filter((id: string) => !allAgentIds.includes(id));
                            form.setFieldValue('agent_ids', newSelected);
                          }
                        }}
                      >
                        全选（{allAgentIds.length} 个）
                      </Checkbox>
                    </div>
                    <Divider style={{ margin: '0' }} />
                    {menu}
                  </>
                );
              }}
              filterOption={(input, option) => {
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
              {getFilteredAgents().map((agent) => (
                <Option key={agent.id} value={agent.id} label={agent.hostname}>
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
              <Option value="k8s">k8s-api</Option>
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
                  ? '输入 Kubernetes 资源的 YAML 或 JSON 配置。Cloud 会调用 Agent，Agent 通过 k8s API 执行操作。支持多资源（使用 --- 分隔）'
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
              onChange={(checked) => {
                // 确保值正确设置
                form.setFieldsValue({ sync: checked });
              }}
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
          bordered
          components={{
            header: {
              cell: ResizableTitle,
            },
          }}
          columns={mergedColumns}
          dataSource={tasks}
          rowKey="id"
          pagination={{ pageSize: 20 }}
          scroll={{ x: 'max-content' }}
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

