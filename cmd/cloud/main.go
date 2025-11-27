package main

import (
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/tiangong-deploy/tiangong-deploy/internal/cloud/server"
	"github.com/tiangong-deploy/tiangong-deploy/internal/cloud/storage"
)

func main() {
	var (
		addr        = flag.String("addr", ":8080", "服务器地址")
		dbPath      = flag.String("db", "./data/cloud.db", "数据库路径")
		fileStorage = flag.String("storage", "./data/files", "文件存储路径")
		certFile    = flag.String("cert", "", "TLS 证书文件路径（启用 HTTPS/WSS）")
		keyFile     = flag.String("key", "", "TLS 私钥文件路径（启用 HTTPS/WSS）")
	)
	flag.Parse()

	// 确保数据目录存在
	if err := os.MkdirAll(*fileStorage, 0755); err != nil {
		log.Fatalf("Failed to create storage directory: %v", err)
	}
	if err := os.MkdirAll("./data", 0755); err != nil {
		log.Fatalf("Failed to create data directory: %v", err)
	}

	// 初始化数据库
	db, err := storage.NewDatabase(*dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// 创建服务器
	srv := server.NewServer(db, *fileStorage)

	// 启动服务器
	go func() {
		var err error
		if *certFile != "" && *keyFile != "" {
			err = srv.RunTLS(*addr, *certFile, *keyFile)
			log.Printf("Cloud server started with TLS on %s", *addr)
		} else {
			err = srv.Run(*addr)
			log.Printf("Cloud server started on %s", *addr)
		}
		if err != nil {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// 等待中断信号
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
}
