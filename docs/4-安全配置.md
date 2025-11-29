# Agent 安全加固方案

## 当前安全风险

### 🔴 高危风险

1. **完全宿主机访问权限**
   - `nsenter -t 1 -m -u -i -n`：进入宿主机所有命名空间
   - `privileged: true`：特权容器
   - `hostPID/hostNetwork/hostIPC: true`：共享宿主机资源

2. **集群管理员权限**
   - ClusterRole 中 `apiGroups: ["*"]` + `resources: ["*"]` + `verbs: ["*"]`
   - 可以创建/删除任何 Kubernetes 资源

3. **无命令限制**
   - 可以执行任意 shell 命令
   - 可以访问宿主机所有文件

---

## 限制方案

### 方案 1：应用层命令白名单（推荐）

在 Agent 代码中实现命令验证，只允许执行预定义的安全命令。

#### 实现位置
`internal/agent/plugins/shell.go`

#### 配置文件示例
```yaml
# configs/agent-security.yaml
security:
  # 命令白名单模式
  command_whitelist_enabled: true
  
  # 允许的命令列表
  allowed_commands:
    # 系统信息查询
    - pattern: "^(hostname|uptime|date|whoami)$"
      description: "基本系统信息"
    
    # 文件操作（限制路径）
    - pattern: "^ls\\s+-[a-z]*\\s+/tmp/.*"
      description: "查看 /tmp 目录"
    
    - pattern: "^cat\\s+/tmp/.*"
      description: "读取 /tmp 文件"
    
    # Docker 操作
    - pattern: "^docker\\s+(ps|images|inspect)\\s+.*"
      description: "Docker 只读操作"
    
    # Kubernetes 操作（只读）
    - pattern: "^kubectl\\s+get\\s+.*"
      description: "Kubernetes 查询"
    
    - pattern: "^kubectl\\s+describe\\s+.*"
      description: "Kubernetes 描述"
  
  # 禁止的命令模式
  blocked_patterns:
    - pattern: ".*rm\\s+-rf\\s+/.*"
      reason: "禁止删除根目录文件"
    
    - pattern: ".*shutdown.*"
      reason: "禁止关机命令"
    
    - pattern: ".*reboot.*"
      reason: "禁止重启命令"
    
    - pattern: ".*(mkfs|fdisk|parted).*"
      reason: "禁止磁盘格式化"
```

#### 代码实现示例
```go
// internal/agent/security/validator.go
package security

import (
    "fmt"
    "regexp"
)

type CommandValidator struct {
    allowedPatterns []*regexp.Regexp
    blockedPatterns []*regexp.Regexp
}

func (v *CommandValidator) ValidateCommand(cmd string) error {
    // 1. 检查黑名单
    for _, pattern := range v.blockedPatterns {
        if pattern.MatchString(cmd) {
            return fmt.Errorf("command blocked by security policy: %s", cmd)
        }
    }
    
    // 2. 检查白名单
    if len(v.allowedPatterns) > 0 {
        allowed := false
        for _, pattern := range v.allowedPatterns {
            if pattern.MatchString(cmd) {
                allowed = true
                break
            }
        }
        if !allowed {
            return fmt.Errorf("command not in whitelist: %s", cmd)
        }
    }
    
    return nil
}
```

---

### 方案 2：最小化 RBAC 权限

根据实际需求，精简 ClusterRole 权限。

#### 修改 `deployments/agent-daemonset.yaml`

```yaml
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cloud-agent
rules:
  # 只读权限：查看资源
  - apiGroups: [""]
    resources:
      - pods
      - pods/log
      - pods/status
      - services
      - nodes
      - namespaces
    verbs: ["get", "list", "watch"]
  
  # 只读权限：应用资源
  - apiGroups: ["apps"]
    resources:
      - deployments
      - replicasets
      - statefulsets
      - daemonsets
    verbs: ["get", "list", "watch"]
  
  # 有限的写权限：只能操作特定资源
  - apiGroups: ["batch"]
    resources:
      - jobs
    verbs: ["get", "list", "watch", "create", "delete"]
  
  # 移除通配符权限
  # - apiGroups: ["*"]  # ❌ 删除
  #   resources: ["*"]  # ❌ 删除
  #   verbs: ["*"]      # ❌ 删除
```

---

### 方案 3：审计日志

记录所有执行的命令，便于审计和追溯。

#### 实现方式

```go
// internal/agent/audit/logger.go
package audit

import (
    "encoding/json"
    "log"
    "time"
)

type AuditLog struct {
    Timestamp   time.Time `json:"timestamp"`
    AgentID     string    `json:"agent_id"`
    TaskID      string    `json:"task_id"`
    TaskType    string    `json:"task_type"`
    Command     string    `json:"command"`
    User        string    `json:"user"`        // Cloud 用户
    Result      string    `json:"result"`      // success/failed
    Error       string    `json:"error,omitempty"`
    Duration    int64     `json:"duration_ms"`
}

func LogCommand(log *AuditLog) {
    data, _ := json.Marshal(log)
    // 写入审计日志文件或发送到日志系统
    log.Printf("[AUDIT] %s", string(data))
}
```

#### 配置日志收集

```yaml
# 在 DaemonSet 中添加日志卷
volumeMounts:
- name: audit-logs
  mountPath: /var/log/agent-audit

volumes:
- name: audit-logs
  hostPath:
    path: /var/log/agent-audit
    type: DirectoryOrCreate
```

---

### 方案 4：移除 nsenter（降低权限）

如果不需要完全的宿主机访问权限，可以移除 `nsenter`。

#### 修改 DaemonSet

```yaml
containers:
- name: agent
  # 移除 nsenter 命令
  # command: [nsenter, -t, "1", ...]  # ❌ 删除
  
  # 直接运行 agent
  command: ["/app/agent"]
  args:
    - -cloud
    - $(CLOUD_URL)
    - -id
    - $(AGENT_ID)
    - -name
    - $(AGENT_NAME)
  
  # 降低权限
  securityContext:
    privileged: false  # ✅ 改为 false
    capabilities:
      add:
        - NET_ADMIN  # 只添加需要的能力
```

**注意**：移除 `nsenter` 后，Agent 将无法访问宿主机文件系统。

---

## 推荐的安全配置

### 分级权限模型

```yaml
# 生产环境：最小权限
security_level: production
features:
  - read_k8s_resources
  - execute_whitelisted_commands
  - audit_logging

# 开发环境：中等权限
security_level: development
features:
  - read_k8s_resources
  - write_k8s_resources (limited)
  - execute_whitelisted_commands
  - audit_logging

# 调试环境：完全权限（当前配置）
security_level: debug
features:
  - full_host_access
  - full_k8s_access
  - no_command_restrictions
```

---

## 实施建议

1. **立即实施**
   - ✅ 添加命令白名单验证
   - ✅ 启用审计日志
   - ✅ 精简 RBAC 权限

2. **短期实施**
   - 🔄 根据实际使用情况调整白名单
   - 🔄 实现基于角色的命令权限

3. **长期规划**
   - 📋 实现细粒度的权限控制
   - 📋 集成企业级审计系统
   - 📋 定期安全审计和渗透测试

---

## 监控和告警

### 可疑行为检测

```yaml
alerts:
  # 检测危险命令
  - name: dangerous_command_executed
    condition: command matches blocked_pattern
    severity: critical
    action: block_and_alert
  
  # 检测异常频率
  - name: high_command_frequency
    condition: commands_per_minute > 100
    severity: warning
    action: alert
  
  # 检测权限提升
  - name: privilege_escalation_attempt
    condition: command contains "sudo" or "su"
    severity: critical
    action: block_and_alert
```

---

## 总结

当前配置适合**调试和开发环境**，但**不适合生产环境**。

建议：
1. 在 Agent 代码层面实现**命令白名单**（最灵活）
2. 精简 **RBAC 权限**到最小必要集合
3. 启用**审计日志**记录所有操作
4. 根据环境使用不同的安全级别配置
