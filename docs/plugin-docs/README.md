# 插件文档索引

本目录包含 Tiangong-Deploy 所有支持的插件使用文档。

## 📚 插件列表

### 基础插件

1. **[Shell 插件](./01-Shell插件.md)** - 执行 Shell 命令和脚本
   - 支持命令安全验证
   - 实时日志输出
   - 超时控制

2. **[文件操作插件](./04-文件操作插件.md)** - 文件上传、分发和管理
   - 批量文件分发
   - 文件权限设置
   - 多节点同步

3. **[API 调用插件](./05-API调用插件.md)** - HTTP/HTTPS 请求
   - 支持所有 HTTP 方法
   - Webhook 通知
   - 自定义请求头

### 数据库插件

4. **[MySQL 插件](./02-MySQL插件.md)** - MySQL 数据库操作
   - SQL 审核（goInception）
   - 自动备份和回滚
   - 事务批量执行

5. **[PostgreSQL 插件](./07-PostgreSQL插件.md)** - PostgreSQL 数据库操作
   - 直接连接执行
   - 事务支持
   - 多连接管理

6. **[MongoDB 插件](./08-MongoDB插件.md)** - MongoDB 数据库操作
   - 文档 CRUD 操作
   - 聚合查询
   - 索引管理

7. **[Redis 插件](./09-Redis插件.md)** - Redis 缓存操作
   - 键值操作
   - 批量操作
   - 过期时间设置

8. **[Elasticsearch 插件](./10-Elasticsearch插件.md)** - Elasticsearch 搜索引擎操作
   - 索引管理
   - 文档操作
   - 批量导入

9. **[ClickHouse 插件](./11-ClickHouse插件.md)** - ClickHouse 分析型数据库操作
   - 高性能查询
   - 批量插入
   - 数据导入

10. **[Doris 插件](./12-Doris插件.md)** - Apache Doris 分析型数据库操作
    - MPP 查询
    - 数据导入
    - 表管理

### 容器和编排插件

11. **[Kubernetes 插件](./03-Kubernetes插件.md)** - Kubernetes 集群管理
    - 资源创建和更新
    - YAML/JSON 支持
    - 多资源批量操作

12. **[Helm 插件](./06-Helm插件.md)** - Helm Chart 部署管理
    - Chart 安装和升级
    - Release 管理
    - 自定义 Values

## 🚀 快速开始

1. 选择需要使用的插件
2. 查看对应的插件文档
3. 参考示例配置和使用
4. 在 UI 或 API 中创建任务

## 📖 相关文档

- [项目概述](../0-项目概述.md)
- [架构设计](../1-架构设计.md)
- [部署指南](../2-部署指南.md)
- [API 文档](../3-API文档.md)
- [安全配置](../4-安全配置.md)
- [开发指南](../5-开发指南.md)

## 💡 使用建议

- **开发环境**：可以使用所有插件进行测试
- **生产环境**：建议配置安全策略，限制危险操作
- **监控审计**：定期检查任务执行日志和审计记录
