package main

import (
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/cloud-agent/cloud-agent/internal/agent"
	"github.com/google/uuid"
)

func main() {
	var (
		cloudURL  = flag.String("cloud", "http://localhost:8080", "Cloud 服务地址")
		agentID   = flag.String("id", "", "Agent ID（为空则自动生成）")
		agentName = flag.String("name", "", "Agent 名称（为空则使用主机名）")
	)
	flag.Parse()

	// 如果未设置 K8S_CLUSTER_NAME 环境变量，尝试从 CLUSTER_NAME 获取
	if os.Getenv("K8S_CLUSTER_NAME") == "" && os.Getenv("CLUSTER_NAME") != "" {
		os.Setenv("K8S_CLUSTER_NAME", os.Getenv("CLUSTER_NAME"))
	}

	// 生成 Agent ID
	if *agentID == "" {
		*agentID = uuid.New().String()
	}

	// 获取 Agent 名称
	if *agentName == "" {
		hostname, err := os.Hostname()
		if err != nil {
			*agentName = "agent-" + (*agentID)[:8]
		} else {
			*agentName = hostname
		}
	}

	log.Printf("Starting agent: %s (%s)", *agentName, *agentID)
	log.Printf("Connecting to cloud: %s", *cloudURL)

	// 创建并启动 Agent
	ag := agent.NewAgent(*cloudURL, *agentID, *agentName)
	if err := ag.Start(); err != nil {
		log.Fatalf("Failed to start agent: %v", err)
	}

	// 等待中断信号
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down agent...")
	if err := ag.Stop(); err != nil {
		log.Printf("Error stopping agent: %v", err)
	}
}
