import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Upload,
  message,
  Modal,
  Form,
  Input,
  Select,
  Space,
} from 'antd';
import { UploadOutlined, SendOutlined } from '@ant-design/icons';
import { fileAPI, agentAPI, File as FileType, Agent } from '../services/api';

export default function Files() {
  const [files, setFiles] = useState<FileType[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [distributeModalVisible, setDistributeModalVisible] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [form] = Form.useForm();

  useEffect(() => {
    loadFiles();
    loadAgents();
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const res = await fileAPI.list({ limit: 100 });
      setFiles(res.data);
    } catch (error: any) {
      message.error('加载文件列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const res = await agentAPI.list();
      const agentsData: Agent[] = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setAgents(agentsData.filter((a: Agent) => a.status === 'online'));
    } catch (error: any) {
      message.error('加载 Agent 列表失败');
    }
  };

  const handleUpload = async (file: File) => {
    setLoading(true);
    try {
      await fileAPI.upload(file);
      message.success('文件上传成功');
      loadFiles();
    } catch (error: any) {
      message.error('文件上传失败: ' + error.message);
    } finally {
      setLoading(false);
    }
    return false; // 阻止默认上传行为
  };

  const handleDistribute = async (values: any) => {
    try {
      await fileAPI.distribute(selectedFileId, {
        agent_ids: values.agent_ids,
        path: values.path,
      });
      message.success('文件分发任务已创建');
      setDistributeModalVisible(false);
      form.resetFields();
    } catch (error: any) {
      message.error('文件分发失败: ' + error.message);
    }
  };

  const handleDownload = async (fileId: string) => {
    try {
      const res = await fileAPI.download(fileId);
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = files.find(f => f.id === fileId)?.name || 'download';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      message.error('文件下载失败');
    }
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
      },
    },
    {
      title: '类型',
      dataIndex: 'content_type',
      key: 'content_type',
    },
    {
      title: 'MD5',
      dataIndex: 'md5',
      key: 'md5',
      render: (text: string) => <code>{text.substring(0, 16)}...</code>,
    },
    {
      title: '上传时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: FileType) => (
        <Space>
          <Button size="small" onClick={() => handleDownload(record.id)}>
            下载
          </Button>
          <Button
            size="small"
            icon={<SendOutlined />}
            onClick={() => {
              setSelectedFileId(record.id);
              setDistributeModalVisible(true);
            }}
          >
            分发
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title="文件管理"
        extra={
          <Upload
            beforeUpload={handleUpload}
            showUploadList={false}
            accept="*/*"
          >
            <Button icon={<UploadOutlined />} loading={loading}>
              上传文件
            </Button>
          </Upload>
        }
      >
        <Table
          columns={columns}
          dataSource={files}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title="分发文件"
        open={distributeModalVisible}
        onCancel={() => {
          setDistributeModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleDistribute}>
          <Form.Item
            name="agent_ids"
            label="目标 Agent"
            rules={[{ required: true, message: '请选择至少一个 Agent' }]}
          >
            <Select mode="multiple" placeholder="选择 Agent">
              {agents.map((agent) => (
                <Select.Option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.id.substring(0, 8)})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="path" label="目标路径">
            <Input placeholder="留空则使用默认路径" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

