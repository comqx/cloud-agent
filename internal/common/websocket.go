package common

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// 写超时时间
	writeWait = 10 * time.Second

	// 读超时时间
	pongWait = 60 * time.Second

	// ping 间隔（必须小于 pongWait）
	pingPeriod = (pongWait * 9) / 10

	// 最大消息大小
	maxMessageSize = 512 * 1024 // 512KB
)

// WSConnection WebSocket 连接封装
type WSConnection struct {
	conn     *websocket.Conn
	send     chan *Message
	recv     chan *Message
	done     chan struct{}
	mu       sync.Mutex
	closed   bool
	once     sync.Once
	protocol string // 连接协议: ws 或 wss
}

// NewWSConnection 创建新的 WebSocket 连接
func NewWSConnection(conn *websocket.Conn) *WSConnection {
	conn.SetReadDeadline(time.Now().Add(pongWait))
	conn.SetReadLimit(maxMessageSize)
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	ws := &WSConnection{
		conn:     conn,
		send:     make(chan *Message, 256),
		recv:     make(chan *Message, 256),
		done:     make(chan struct{}),
		protocol: "ws", // 默认协议
	}

	return ws
}

// SetProtocol 设置连接协议
func (ws *WSConnection) SetProtocol(protocol string) {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	ws.protocol = protocol
}

// GetProtocol 获取连接协议
func (ws *WSConnection) GetProtocol() string {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	return ws.protocol
}

// ReadMessage 读取消息（从 channel 读取，由 readPump 填充）
func (ws *WSConnection) ReadMessage() (*Message, error) {
	select {
	case msg := <-ws.recv:
		return msg, nil
	case <-ws.done:
		return nil, websocket.ErrCloseSent
	}
}

// WriteMessage 写入消息
func (ws *WSConnection) WriteMessage(msg *Message) error {
	ws.mu.Lock()
	closed := ws.closed
	ws.mu.Unlock()
	
	if closed {
		return websocket.ErrCloseSent
	}

	select {
	case ws.send <- msg:
		return nil
	case <-ws.done:
		return websocket.ErrCloseSent
	default:
		return websocket.ErrCloseSent
	}
}

// Start 启动读写协程
func (ws *WSConnection) Start() {
	go ws.writePump()
	go ws.readPump()
}

// Close 关闭连接（使用 sync.Once 确保只关闭一次）
func (ws *WSConnection) Close() error {
	var err error
	ws.once.Do(func() {
		ws.mu.Lock()
		defer ws.mu.Unlock()
		
	if ws.closed {
			return
	}
	ws.closed = true
		
	close(ws.done)
	close(ws.send)
		close(ws.recv)
		err = ws.conn.Close()
	})
	return err
}

// IsClosed 检查连接是否已关闭
func (ws *WSConnection) IsClosed() bool {
	ws.mu.Lock()
	defer ws.mu.Unlock()
	return ws.closed
}

// readPump 读取消息的协程
func (ws *WSConnection) readPump() {
	defer ws.Close()

	for {
		// 检查连接是否已关闭
		ws.mu.Lock()
		closed := ws.closed
		ws.mu.Unlock()
		if closed {
			return
		}

		_, data, err := ws.conn.ReadMessage()
		if err != nil {
			// 如果是正常关闭或异常关闭，不记录错误
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				// 可以在这里记录错误日志
			}
			break
		}

		var msg Message
		if err := json.Unmarshal(data, &msg); err != nil {
			continue
		}

		if msg.Timestamp == 0 {
			msg.Timestamp = time.Now().Unix()
		}

		select {
		case ws.recv <- &msg:
		case <-ws.done:
			return
		}
	}
}

// writePump 写入消息的协程
func (ws *WSConnection) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		ws.Close()
	}()

	for {
		select {
		case msg, ok := <-ws.send:
			ws.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				ws.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := ws.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}

			data, err := json.Marshal(msg)
			if err != nil {
				w.Close()
				return
			}

			if _, err := w.Write(data); err != nil {
				w.Close()
				return
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			ws.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := ws.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}

		case <-ws.done:
			return
		}
	}
}

// NewMessage 创建新消息
func NewMessage(msgType MessageType, data interface{}) *Message {
	return &Message{
		Type:      msgType,
		Data:      data,
		Timestamp: time.Now().Unix(),
	}
}

// NewErrorMessage 创建错误消息
func NewErrorMessage(err error, requestID string) *Message {
	msg := &Message{
		Type:      MessageTypeError,
		Error:     err.Error(),
		Timestamp: time.Now().Unix(),
	}
	if requestID != "" {
		msg.RequestID = requestID
	}
	return msg
}

