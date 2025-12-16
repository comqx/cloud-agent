package client

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"net"
	"net/url"
	"os"
	"strconv"
	"time"

	"github.com/cloud-agent/internal/common"
	"github.com/gorilla/websocket"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// Client Agent 客户端
type Client struct {
	cloudURL    string
	agentID     string
	agentName   string
	conn        *common.WSConnection
	connected   bool
	messageChan chan *common.Message
	done        chan struct{}
}

// NewClient 创建 Agent 客户端
func NewClient(cloudURL, agentID, agentName string) *Client {
	return &Client{
		cloudURL:    cloudURL,
		agentID:     agentID,
		agentName:   agentName,
		messageChan: make(chan *common.Message, 100),
		done:        make(chan struct{}),
	}
}

// Connect 连接到 Cloud
func (c *Client) Connect() error {
	u, err := url.Parse(c.cloudURL)
	if err != nil {
		return fmt.Errorf("invalid cloud URL: %w", err)
	}

	// 转换为 WebSocket URL
	// 支持直接使用 ws:// 或 wss:// 协议，也支持 http:// 或 https:// 自动转换
	if u.Scheme == "http" {
		u.Scheme = "ws"
	} else if u.Scheme == "https" {
		u.Scheme = "wss"
	}
	// 如果已经是 ws:// 或 wss://，保持不变
	// 确保路径是 /ws
	if u.Path == "" || u.Path == "/" {
		u.Path = "/ws"
	}

	// 创建 WebSocket Dialer
	dialer := websocket.DefaultDialer

	// 如果是 WSS，配置 TLS
	if u.Scheme == "wss" {
		// 检查是否跳过证书验证（通过环境变量配置）
		skipVerify := false
		if skipVerifyStr := os.Getenv("WS_SKIP_VERIFY"); skipVerifyStr != "" {
			if parsed, err := strconv.ParseBool(skipVerifyStr); err == nil {
				skipVerify = parsed
			}
		}

		// 如果未设置环境变量，默认跳过验证（适用于自签证书）
		if os.Getenv("WS_SKIP_VERIFY") == "" {
			skipVerify = true
		}

		if skipVerify {
			log.Println("WSS: Skipping certificate verification (for self-signed certificates)")
			dialer.TLSClientConfig = &tls.Config{
				InsecureSkipVerify: true,
			}
		}
	}

	conn, _, err := dialer.Dial(u.String(), nil)
	if err != nil {
		return fmt.Errorf("failed to connect: %w", err)
	}

	c.conn = common.NewWSConnection(conn)
	c.conn.Start()
	c.connected = true

	// 启动消息处理
	go c.handleMessages()

	// 注册 Agent
	if err := c.register(); err != nil {
		c.conn.Close()
		c.connected = false
		return fmt.Errorf("failed to register: %w", err)
	}

	// 启动心跳
	go c.heartbeat()

	log.Printf("Agent connected to cloud: %s", u.String())
	return nil
}

// register 注册 Agent
func (c *Client) register() error {
	hostname, _ := os.Hostname()

	// 从环境变量获取 K8s 集群名称
	env := os.Getenv("K8S_CLUSTER_NAME")
	if env == "" {
		env = os.Getenv("CLUSTER_NAME") // 兼容其他环境变量名
	}

	registerData := common.AgentRegisterData{
		AgentID:  c.agentID,
		Name:     c.agentName,
		Hostname: hostname,
		IP:       c.getLocalIP(),
		Version:  "1.0.0",
		Env:      env,
		Metadata: map[string]string{
			"os": os.Getenv("GOOS"),
		},
	}

	msg := common.NewMessage(common.MessageTypeAgentRegister, registerData)
	return c.conn.WriteMessage(msg)
}

// heartbeat 心跳保持
func (c *Client) heartbeat() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if !c.connected {
				return
			}

			heartbeatData := map[string]interface{}{
				"agent_id": c.agentID,
			}
			msg := common.NewMessage(common.MessageTypeAgentHeartbeat, heartbeatData)
			if err := c.conn.WriteMessage(msg); err != nil {
				log.Printf("Failed to send heartbeat: %v", err)
				c.reconnect()
				return
			}

		case <-c.done:
			return
		}
	}
}

// handleMessages 处理来自 Cloud 的消息
func (c *Client) handleMessages() {
	for {
		msg, err := c.conn.ReadMessage()
		if err != nil {
			log.Printf("Failed to read message: %v", err)
			if c.connected {
				c.reconnect()
			}
			return
		}

		select {
		case c.messageChan <- msg:
		default:
			log.Printf("Message channel full, dropping message")
		}
	}
}

// GetMessageChan 获取消息通道
func (c *Client) GetMessageChan() <-chan *common.Message {
	return c.messageChan
}

// SendMessage 发送消息到 Cloud
func (c *Client) SendMessage(msg *common.Message) error {
	if !c.connected {
		return fmt.Errorf("not connected")
	}
	return c.conn.WriteMessage(msg)
}

// reconnect 重连
func (c *Client) reconnect() {
	c.connected = false
	c.conn.Close()

	log.Println("Reconnecting to cloud...")
	for {
		if err := c.Connect(); err != nil {
			log.Printf("Reconnect failed: %v, retrying in 5 seconds...", err)
			time.Sleep(5 * time.Second)
			continue
		}
		break
	}
}

// getLocalIP 获取本地 IP（优先获取节点 IP）
func (c *Client) getLocalIP() string {
	// 1. 优先从环境变量获取（Kubernetes 环境）
	// K8s Pod 可以通过环境变量获取节点 IP 或 Pod IP
	if nodeIP := os.Getenv("NODE_IP"); nodeIP != "" && nodeIP != "127.0.0.1" {
		return nodeIP
	}
	if hostIP := os.Getenv("HOST_IP"); hostIP != "" && hostIP != "127.0.0.1" {
		return hostIP
	}
	if podIP := os.Getenv("POD_IP"); podIP != "" && podIP != "127.0.0.1" {
		// 如果使用 hostNetwork，Pod IP 就是节点 IP
		// 否则，尝试通过 Kubernetes API 查询节点 IP
		if os.Getenv("HOST_NETWORK") != "true" {
			if nodeIP := c.getNodeIPFromK8s(); nodeIP != "" {
				return nodeIP
			}
		}
		return podIP
	}

	// 2. 尝试通过 Kubernetes API 查询节点 IP（如果在 K8s 环境中）
	if nodeIP := c.getNodeIPFromK8s(); nodeIP != "" {
		return nodeIP
	}

	// 3. 尝试从网络接口获取真实的 IP 地址
	// 获取所有网络接口
	interfaces, err := net.Interfaces()
	if err == nil {
		for _, iface := range interfaces {
			// 跳过回环接口和未启用的接口
			if iface.Flags&net.FlagLoopback != 0 || iface.Flags&net.FlagUp == 0 {
				continue
			}

			// 获取接口地址
			addrs, err := iface.Addrs()
			if err != nil {
				continue
			}

			for _, addr := range addrs {
				var ip net.IP
				switch v := addr.(type) {
				case *net.IPNet:
					ip = v.IP
				case *net.IPAddr:
					ip = v.IP
				}

				// 跳过回环地址和 IPv6 地址
				if ip == nil || ip.IsLoopback() || ip.To4() == nil {
					continue
				}

				// 返回第一个有效的 IPv4 地址
				return ip.String()
			}
		}
	}

	// 4. 如果都获取不到，尝试通过连接外部地址获取本地 IP
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err == nil {
		defer conn.Close()
		localAddr := conn.LocalAddr().(*net.UDPAddr)
		if localAddr.IP != nil && !localAddr.IP.IsLoopback() {
			return localAddr.IP.String()
		}
	}

	// 5. 最后返回回环地址作为兜底
	return "127.0.0.1"
}

// getNodeIPFromK8s 通过 Kubernetes API 查询节点 IP
func (c *Client) getNodeIPFromK8s() string {
	// 尝试使用 in-cluster 配置
	config, err := rest.InClusterConfig()
	if err != nil {
		return ""
	}

	// 创建 clientset
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return ""
	}

	// 获取 Pod 所在节点名称
	nodeName := os.Getenv("NODE_NAME")
	if nodeName == "" {
		// 尝试从 Pod spec 获取节点名称
		podName := os.Getenv("HOSTNAME")
		if podName == "" {
			hostname, _ := os.Hostname()
			podName = hostname
		}
		namespace := os.Getenv("POD_NAMESPACE")
		if namespace == "" {
			namespace = "default"
		}

		// 查询 Pod 信息获取节点名称
		pod, err := clientset.CoreV1().Pods(namespace).Get(context.Background(), podName, metav1.GetOptions{})
		if err != nil {
			return ""
		}
		nodeName = pod.Spec.NodeName
	}

	if nodeName == "" {
		return ""
	}

	// 查询节点信息获取节点 IP
	node, err := clientset.CoreV1().Nodes().Get(context.Background(), nodeName, metav1.GetOptions{})
	if err != nil {
		return ""
	}

	// 获取节点内部 IP
	for _, addr := range node.Status.Addresses {
		if addr.Type == "InternalIP" {
			return addr.Address
		}
	}

	// 如果没有 InternalIP，返回第一个地址
	if len(node.Status.Addresses) > 0 {
		return node.Status.Addresses[0].Address
	}

	return ""
}

// Close 关闭连接
func (c *Client) Close() error {
	close(c.done)
	c.connected = false
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}

// IsConnected 检查是否已连接
func (c *Client) IsConnected() bool {
	return c.connected
}
