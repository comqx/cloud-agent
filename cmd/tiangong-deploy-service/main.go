package main

import (
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/tiangong-deploy/tiangong-deploy/internal/tiangong-deploy-service/server"
)

func main() {
	var (
		addr = flag.String("addr", ":8081", "Service address")
		dsn  = flag.String("dsn", "./data/cloud.db", "Database DSN (SQLite path)")
	)
	flag.Parse()

	// Initialize Server
	srv, err := server.NewServer(*dsn)
	if err != nil {
		log.Fatalf("Failed to initialize server: %v", err)
	}

	// Start Server
	go func() {
		if err := srv.Run(*addr); err != nil {
			log.Fatalf("Server error: %v", err)
		}
	}()

	log.Printf("Tiangong Deploy Service started on %s", *addr)

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
}
