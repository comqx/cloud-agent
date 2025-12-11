#!/usr/bin/env python3
"""
Cloud Agent MCP Tools
将 Cloud 执行任务相关的接口转换为 MCP tools，供 AI 调用
"""

import os
import json
import requests
from typing import Optional, Dict, Any, List
from mcp.server import Server
from mcp.server.models import InitializationOptions
from mcp.types import Tool, TextContent


class CloudTaskClient:
    """Cloud API 客户端"""
    
    def __init__(self, base_url: str = None):
        self.base_url = base_url or os.getenv("CLOUD_API_URL", "http://localhost:8080/api/v1")
        if not self.base_url.endswith("/api/v1"):
            if self.base_url.endswith("/"):
                self.base_url = self.base_url.rstrip("/") + "/api/v1"
            else:
                self.base_url = self.base_url + "/api/v1"
    
    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """发送 HTTP 请求"""
        url = f"{self.base_url}{endpoint}"
        try:
            response = requests.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"error": str(e)}
    
    def create_task(
        self,
        agent_id: str,
        task_type: str,
        command: str = "",
        params: Dict[str, Any] = None,
        file_id: str = None,
        sync: bool = False,
        timeout: int = 60
    ) -> Dict[str, Any]:
        """创建任务"""
        data = {
            "agent_id": agent_id,
            "type": task_type,
            "command": command,
            "params": params or {},
            "sync": sync,
            "timeout": timeout
        }
        if file_id:
            data["file_id"] = file_id
        
        return self._request("POST", "/tasks", json=data)
    
    def get_task(self, task_id: str) -> Dict[str, Any]:
        """查询任务状态"""
        return self._request("GET", f"/tasks/{task_id}")
    
    def get_task_logs(self, task_id: str, limit: int = 1000) -> List[Dict[str, Any]]:
        """获取任务日志"""
        return self._request("GET", f"/tasks/{task_id}/logs", params={"limit": limit})
    
    def upload_file(self, file_path: str) -> Dict[str, Any]:
        """上传文件"""
        with open(file_path, "rb") as f:
            files = {"file": f}
            return self._request("POST", "/files", files=files)
    
    def list_agents(self) -> List[Dict[str, Any]]:
        """列出所有 Agent"""
        return self._request("GET", "/agents")


# 创建全局客户端实例
client = CloudTaskClient()


# 定义 MCP Tools
def create_tools() -> List[Tool]:
    """创建所有 MCP tools"""
    return [
        Tool(
            name="execute_shell_command",
            description="在指定的 Agent 节点上执行 Shell 命令。支持同步和异步模式。",
            inputSchema={
                "type": "object",
                "properties": {
                    "agent_id": {
                        "type": "string",
                        "description": "Agent 节点 ID"
                    },
                    "command": {
                        "type": "string",
                        "description": "要执行的 Shell 命令"
                    },
                    "params": {
                        "type": "object",
                        "description": "额外参数（可选）",
                        "default": {}
                    },
                    "file_id": {
                        "type": "string",
                        "description": "关联的文件 ID（如果命令需要文件）"
                    },
                    "sync": {
                        "type": "boolean",
                        "description": "是否同步等待任务完成，默认 false（异步模式）",
                        "default": False
                    },
                    "timeout": {
                        "type": "integer",
                        "description": "同步模式超时时间（秒），默认 60，最大 300",
                        "default": 60,
                        "minimum": 1,
                        "maximum": 300
                    }
                },
                "required": ["agent_id", "command"]
            }
        ),
        Tool(
            name="execute_api_request",
            description="通过 Agent 节点执行 HTTP/HTTPS 请求，支持 GET、POST、PUT、DELETE 等方法。",
            inputSchema={
                "type": "object",
                "properties": {
                    "agent_id": {
                        "type": "string",
                        "description": "Agent 节点 ID"
                    },
                    "method": {
                        "type": "string",
                        "description": "HTTP 方法（GET、POST、PUT、DELETE 等），默认为 GET",
                        "enum": ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
                        "default": "GET"
                    },
                    "url": {
                        "type": "string",
                        "description": "请求的目标 URL"
                    },
                    "headers": {
                        "type": "object",
                        "description": "HTTP 请求头，键值对形式"
                    },
                    "body": {
                        "type": ["string", "object"],
                        "description": "请求体。可以是字符串或 JSON 对象"
                    },
                    "sync": {
                        "type": "boolean",
                        "description": "是否同步等待任务完成，默认 false（异步模式）",
                        "default": False
                    },
                    "timeout": {
                        "type": "integer",
                        "description": "同步模式超时时间（秒），默认 60，最大 300",
                        "default": 60,
                        "minimum": 1,
                        "maximum": 300
                    }
                },
                "required": ["agent_id", "url"]
            }
        ),
        Tool(
            name="execute_k8s_operation",
            description="操作 Kubernetes 集群中的资源，支持创建、更新、删除、补丁和应用等操作。支持 YAML 和 JSON 两种格式。",
            inputSchema={
                "type": "object",
                "properties": {
                    "agent_id": {
                        "type": "string",
                        "description": "Agent 节点 ID（必须是在 Kubernetes 集群中运行的 Agent）"
                    },
                    "resource_config": {
                        "type": "string",
                        "description": "Kubernetes 资源的 YAML 或 JSON 配置内容"
                    },
                    "operation": {
                        "type": "string",
                        "description": "操作类型：create（创建）、update（更新）、delete（删除）、patch（补丁）、apply（应用，默认值）",
                        "enum": ["create", "update", "delete", "patch", "apply"],
                        "default": "apply"
                    },
                    "namespace": {
                        "type": "string",
                        "description": "命名空间，如果不指定则使用配置中的 namespace 或默认命名空间 default"
                    },
                    "patch_type": {
                        "type": "string",
                        "description": "仅当 operation 为 patch 时有效。补丁类型：strategic（战略合并补丁，默认）、merge（合并补丁）、json（JSON 补丁）",
                        "enum": ["strategic", "merge", "json"],
                        "default": "strategic"
                    },
                    "file_id": {
                        "type": "string",
                        "description": "关联的文件 ID（如果配置内容在文件中）"
                    },
                    "sync": {
                        "type": "boolean",
                        "description": "是否同步等待任务完成，默认 false（异步模式）",
                        "default": False
                    },
                    "timeout": {
                        "type": "integer",
                        "description": "同步模式超时时间（秒），默认 60，最大 300",
                        "default": 60,
                        "minimum": 1,
                        "maximum": 300
                    }
                },
                "required": ["agent_id", "resource_config"]
            }
        ),
        Tool(
            name="execute_mysql_query",
            description="执行 MySQL SQL 语句，支持 SQL 审核、执行、备份和回滚 SQL 生成。通过 goInception 执行。",
            inputSchema={
                "type": "object",
                "properties": {
                    "agent_id": {
                        "type": "string",
                        "description": "Agent 节点 ID"
                    },
                    "sql": {
                        "type": "string",
                        "description": "SQL 语句（支持多语句，用分号分隔）"
                    },
                    "target": {
                        "type": "object",
                        "description": "目标数据库连接信息（推荐，支持多实例）",
                        "properties": {
                            "host": {"type": "string", "description": "数据库主机"},
                            "port": {"type": "integer", "description": "端口，默认 3306", "default": 3306},
                            "user": {"type": "string", "description": "用户名"},
                            "password": {"type": "string", "description": "密码"},
                            "db": {"type": "string", "description": "数据库名（可选，可在 SQL 中使用 库名.表名 指定）"}
                        },
                        "required": ["host"]
                    },
                    "connection": {
                        "type": "string",
                        "description": "使用配置文件中的连接名（向后兼容，不推荐用于多实例场景）"
                    },
                    "database": {
                        "type": "string",
                        "description": "数据库名（可选，优先使用 target.db）"
                    },
                    "file_id": {
                        "type": "string",
                        "description": "SQL 文件 ID（如果提供了 file_id，则从文件读取 SQL）"
                    },
                    "exec_options": {
                        "type": "object",
                        "description": "执行选项",
                        "properties": {
                            "trans_batch_size": {"type": "integer", "description": "事务批次大小，默认 200", "default": 200},
                            "backup": {"type": "boolean", "description": "是否备份，默认 true", "default": True},
                            "sleep_ms": {"type": "integer", "description": "批次间休眠时间（毫秒）"},
                            "timeout_ms": {"type": "integer", "description": "执行超时时间（毫秒），默认 600000", "default": 600000},
                            "concurrency": {"type": "integer", "description": "并发数，默认 1", "default": 1}
                        }
                    },
                    "metadata": {
                        "type": "object",
                        "description": "审计元数据",
                        "properties": {
                            "env": {"type": "string", "description": "环境标识"},
                            "creator": {"type": "string", "description": "创建者"},
                            "ticket": {"type": "string", "description": "工单号"}
                        }
                    },
                    "sync": {
                        "type": "boolean",
                        "description": "是否同步等待任务完成，默认 false（异步模式）",
                        "default": False
                    },
                    "timeout": {
                        "type": "integer",
                        "description": "同步模式超时时间（秒），默认 60，最大 300",
                        "default": 60,
                        "minimum": 1,
                        "maximum": 300
                    }
                },
                "required": ["agent_id"]
            }
        ),
        Tool(
            name="execute_postgres_query",
            description="执行 PostgreSQL SQL 语句，支持事务批次处理。",
            inputSchema={
                "type": "object",
                "properties": {
                    "agent_id": {
                        "type": "string",
                        "description": "Agent 节点 ID"
                    },
                    "sql": {
                        "type": "string",
                        "description": "SQL 语句（支持多语句，用分号分隔）"
                    },
                    "target": {
                        "type": "object",
                        "description": "目标数据库连接信息（推荐，支持多实例）",
                        "properties": {
                            "host": {"type": "string", "description": "数据库主机"},
                            "port": {"type": "integer", "description": "端口，默认 5432", "default": 5432},
                            "user": {"type": "string", "description": "用户名，默认 postgres", "default": "postgres"},
                            "password": {"type": "string", "description": "密码"},
                            "database": {"type": "string", "description": "数据库名（可选，可在 SQL 中使用 库名.表名 指定）"},
                            "sslmode": {"type": "string", "description": "SSL 模式，默认 disable", "default": "disable"}
                        },
                        "required": ["host"]
                    },
                    "connection": {
                        "type": "string",
                        "description": "连接名（向后兼容，不推荐用于多实例场景）"
                    },
                    "file_id": {
                        "type": "string",
                        "description": "SQL 文件 ID"
                    },
                    "exec_options": {
                        "type": "object",
                        "description": "执行选项",
                        "properties": {
                            "trans_batch_size": {"type": "integer", "description": "事务批次大小，默认 200", "default": 200},
                            "sleep_ms": {"type": "integer", "description": "批次间休眠时间"},
                            "timeout_ms": {"type": "integer", "description": "执行超时时间（毫秒），默认 600000", "default": 600000}
                        }
                    },
                    "sync": {
                        "type": "boolean",
                        "description": "是否同步等待任务完成，默认 false（异步模式）",
                        "default": False
                    },
                    "timeout": {
                        "type": "integer",
                        "description": "同步模式超时时间（秒），默认 60，最大 300",
                        "default": 60,
                        "minimum": 1,
                        "maximum": 300
                    }
                },
                "required": ["agent_id"]
            }
        ),
        Tool(
            name="upload_file",
            description="上传文件到 Cloud 服务，文件会被存储并返回文件 ID，可用于后续的文件分发或任务执行。",
            inputSchema={
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "要上传的文件路径"
                    }
                },
                "required": ["file_path"]
            }
        ),
        Tool(
            name="get_task_status",
            description="根据任务 ID 查询任务的状态和结果。",
            inputSchema={
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "string",
                        "description": "任务 ID"
                    }
                },
                "required": ["task_id"]
            }
        ),
        Tool(
            name="get_task_logs",
            description="获取任务的执行日志，支持实时查看任务执行过程。",
            inputSchema={
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "string",
                        "description": "任务 ID"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "返回的日志条数，默认 1000",
                        "default": 1000
                    }
                },
                "required": ["task_id"]
            }
        ),
        Tool(
            name="list_agents",
            description="列出所有可用的 Agent 节点及其状态信息。",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        )
    ]


# 工具处理函数
async def handle_execute_shell_command(arguments: Dict[str, Any]) -> List[TextContent]:
    """处理 Shell 命令执行"""
    agent_id = arguments.get("agent_id")
    command = arguments.get("command")
    params = arguments.get("params", {})
    file_id = arguments.get("file_id")
    sync = arguments.get("sync", False)
    timeout = arguments.get("timeout", 60)
    
    result = client.create_task(
        agent_id=agent_id,
        task_type="shell",
        command=command,
        params=params,
        file_id=file_id,
        sync=sync,
        timeout=timeout
    )
    
    return [TextContent(type="text", text=json.dumps(result, indent=2, ensure_ascii=False))]


async def handle_execute_api_request(arguments: Dict[str, Any]) -> List[TextContent]:
    """处理 API 请求执行"""
    agent_id = arguments.get("agent_id")
    method = arguments.get("method", "GET")
    url = arguments.get("url")
    headers = arguments.get("headers", {})
    body = arguments.get("body")
    sync = arguments.get("sync", False)
    timeout = arguments.get("timeout", 60)
    
    params = {
        "url": url,
        "headers": headers
    }
    if body:
        params["body"] = body
    
    result = client.create_task(
        agent_id=agent_id,
        task_type="api",
        command=method,
        params=params,
        sync=sync,
        timeout=timeout
    )
    
    return [TextContent(type="text", text=json.dumps(result, indent=2, ensure_ascii=False))]


async def handle_execute_k8s_operation(arguments: Dict[str, Any]) -> List[TextContent]:
    """处理 Kubernetes 资源操作"""
    agent_id = arguments.get("agent_id")
    resource_config = arguments.get("resource_config")
    operation = arguments.get("operation", "apply")
    namespace = arguments.get("namespace")
    patch_type = arguments.get("patch_type", "strategic")
    file_id = arguments.get("file_id")
    sync = arguments.get("sync", False)
    timeout = arguments.get("timeout", 60)
    
    params = {
        "operation": operation
    }
    if namespace:
        params["namespace"] = namespace
    if operation == "patch" and patch_type:
        params["patch_type"] = patch_type
    
    result = client.create_task(
        agent_id=agent_id,
        task_type="k8s",
        command=resource_config,
        params=params,
        file_id=file_id,
        sync=sync,
        timeout=timeout
    )
    
    return [TextContent(type="text", text=json.dumps(result, indent=2, ensure_ascii=False))]


async def handle_execute_mysql_query(arguments: Dict[str, Any]) -> List[TextContent]:
    """处理 MySQL 查询执行"""
    agent_id = arguments.get("agent_id")
    sql = arguments.get("sql", "")
    target = arguments.get("target")
    connection = arguments.get("connection")
    database = arguments.get("database")
    file_id = arguments.get("file_id")
    exec_options = arguments.get("exec_options", {})
    metadata = arguments.get("metadata", {})
    sync = arguments.get("sync", False)
    timeout = arguments.get("timeout", 60)
    
    params = {}
    if target:
        params["target"] = target
    if connection:
        params["connection"] = connection
    if database:
        params["database"] = database
    if exec_options:
        params["exec_options"] = exec_options
    if metadata:
        params["metadata"] = metadata
    
    result = client.create_task(
        agent_id=agent_id,
        task_type="mysql",
        command=sql,
        params=params,
        file_id=file_id,
        sync=sync,
        timeout=timeout
    )
    
    return [TextContent(type="text", text=json.dumps(result, indent=2, ensure_ascii=False))]


async def handle_execute_postgres_query(arguments: Dict[str, Any]) -> List[TextContent]:
    """处理 PostgreSQL 查询执行"""
    agent_id = arguments.get("agent_id")
    sql = arguments.get("sql", "")
    target = arguments.get("target")
    connection = arguments.get("connection")
    file_id = arguments.get("file_id")
    exec_options = arguments.get("exec_options", {})
    sync = arguments.get("sync", False)
    timeout = arguments.get("timeout", 60)
    
    params = {}
    if target:
        params["target"] = target
    if connection:
        params["connection"] = connection
    if exec_options:
        params["exec_options"] = exec_options
    
    result = client.create_task(
        agent_id=agent_id,
        task_type="postgres",
        command=sql,
        params=params,
        file_id=file_id,
        sync=sync,
        timeout=timeout
    )
    
    return [TextContent(type="text", text=json.dumps(result, indent=2, ensure_ascii=False))]


async def handle_upload_file(arguments: Dict[str, Any]) -> List[TextContent]:
    """处理文件上传"""
    file_path = arguments.get("file_path")
    
    if not os.path.exists(file_path):
        return [TextContent(type="text", text=json.dumps({"error": f"文件不存在: {file_path}"}, ensure_ascii=False))]
    
    result = client.upload_file(file_path)
    return [TextContent(type="text", text=json.dumps(result, indent=2, ensure_ascii=False))]


async def handle_get_task_status(arguments: Dict[str, Any]) -> List[TextContent]:
    """处理任务状态查询"""
    task_id = arguments.get("task_id")
    
    result = client.get_task(task_id)
    return [TextContent(type="text", text=json.dumps(result, indent=2, ensure_ascii=False))]


async def handle_get_task_logs(arguments: Dict[str, Any]) -> List[TextContent]:
    """处理任务日志查询"""
    task_id = arguments.get("task_id")
    limit = arguments.get("limit", 1000)
    
    result = client.get_task_logs(task_id, limit)
    return [TextContent(type="text", text=json.dumps(result, indent=2, ensure_ascii=False))]


async def handle_list_agents(arguments: Dict[str, Any]) -> List[TextContent]:
    """处理 Agent 列表查询"""
    result = client.list_agents()
    return [TextContent(type="text", text=json.dumps(result, indent=2, ensure_ascii=False))]


# 工具名称到处理函数的映射
TOOL_HANDLERS = {
    "execute_shell_command": handle_execute_shell_command,
    "execute_api_request": handle_execute_api_request,
    "execute_k8s_operation": handle_execute_k8s_operation,
    "execute_mysql_query": handle_execute_mysql_query,
    "execute_postgres_query": handle_execute_postgres_query,
    "upload_file": handle_upload_file,
    "get_task_status": handle_get_task_status,
    "get_task_logs": handle_get_task_logs,
    "list_agents": handle_list_agents,
}


# 创建 MCP 服务器
server = Server("cloud-tasks")


@server.list_tools()
async def list_tools() -> List[Tool]:
    """列出所有可用的工具"""
    return create_tools()


@server.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """调用工具"""
    handler = TOOL_HANDLERS.get(name)
    if not handler:
        return [TextContent(type="text", text=json.dumps({"error": f"未知的工具: {name}"}, ensure_ascii=False))]
    
    try:
        return await handler(arguments)
    except Exception as e:
        return [TextContent(type="text", text=json.dumps({"error": str(e)}, ensure_ascii=False))]


# 主函数
if __name__ == "__main__":
    import asyncio
    from mcp.server.stdio import stdio_server
    
    async def main():
        """主函数"""
        async with stdio_server() as (read_stream, write_stream):
            await server.run(
                read_stream,
                write_stream,
                InitializationOptions(
                    server_name="cloud-tasks",
                    server_version="1.0.0",
                    capabilities=server.get_capabilities(
                        notification_options=None,
                        experimental_capabilities={}
                    )
                )
            )
    
    asyncio.run(main())