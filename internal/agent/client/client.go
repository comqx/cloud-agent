package client

import (
	"fmt"
	"log"
	"net/url"
	"os"
	"time"

	"github.com/cloud-agent/cloud-agent/internal/common"
	"github.com/gorilla/websocket"
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
	if u.Scheme == "http" {
		u.Scheme = "ws"
	} else if u.Scheme == "https" {
		u.Scheme = "wss"
	}
	u.Path = "/ws"

	conn, _, err := websocket.DefaultDialer.Dial(u.String(), nil)
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

// getLocalIP 获取本地 IP（简化版）
func (c *Client) getLocalIP() string {
	// 简化实现，实际应该获取真实的本地 IP
	return "127.0.0.1"
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
