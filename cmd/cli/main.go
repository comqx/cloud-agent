package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/cloud-agent/internal/common"
)

var (
	cloudURL = flag.String("cloud", "http://localhost:8080", "Cloud 服务地址")
)

func main() {
	flag.Parse()

	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	command := os.Args[1]
	os.Args = os.Args[1:]

	switch command {
	case "run":
		handleRun()
	case "list":
		handleList()
	case "logs":
		handleLogs()
	case "upload":
		handleUpload()
	default:
		fmt.Printf("Unknown command: %s\n", command)
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("Usage: cloudctl <command> [options]")
	fmt.Println()
	fmt.Println("Commands:")
	fmt.Println("  run      Execute a task")
	fmt.Println("  list     List tasks or agents")
	fmt.Println("  logs     View task logs")
	fmt.Println("  upload   Upload a file")
	fmt.Println()
	fmt.Println("Global options:")
	fmt.Println("  -cloud string   Cloud service URL (default: http://localhost:8080)")
	fmt.Println()
	fmt.Println("Examples:")
	fmt.Println("  cloudctl run sql --file demo.sql --agent <agent-id>")
	fmt.Println("  cloudctl list tasks")
	fmt.Println("  cloudctl logs <task-id>")
	fmt.Println("  cloudctl upload file.zip")
}

func handleRun() {
	var (
		taskType = flag.String("type", "shell", "Task type (shell, mysql, postgres, redis, mongo, elasticsearch, clickhouse, doris, k8s, api, file)")
		command  = flag.String("command", "", "Command to execute")
		file     = flag.String("file", "", "File to use")
		agentID  = flag.String("agent", "", "Agent ID")
		params   = flag.String("params", "{}", "JSON parameters")
	)
	flag.Parse()

	if *agentID == "" {
		log.Fatal("agent is required")
	}

	var commandStr string
	if *file != "" {
		// 读取文件内容
		data, err := os.ReadFile(*file)
		if err != nil {
			log.Fatalf("Failed to read file: %v", err)
		}
		commandStr = string(data)
	} else if *command != "" {
		commandStr = *command
	} else {
		log.Fatal("command or file is required")
	}

	var paramsMap map[string]interface{}
	if err := json.Unmarshal([]byte(*params), &paramsMap); err != nil {
		log.Fatalf("Invalid params JSON: %v", err)
	}

	// 创建任务
	reqData := map[string]interface{}{
		"agent_id": *agentID,
		"type":     *taskType,
		"command":  commandStr,
		"params":   paramsMap,
	}

	resp, err := postJSON(*cloudURL+"/api/v1/tasks", reqData)
	if err != nil {
		log.Fatalf("Failed to create task: %v", err)
	}

	var task common.Task
	if err := json.Unmarshal(resp, &task); err != nil {
		log.Fatalf("Failed to parse response: %v", err)
	}

	fmt.Printf("Task created: %s\n", task.ID)
	fmt.Printf("Status: %s\n", task.Status)

	// 等待任务完成
	if task.Status == common.TaskStatusRunning || task.Status == common.TaskStatusPending {
		fmt.Println("Waiting for task to complete...")
		for {
			time.Sleep(2 * time.Second)
			task, err := getTask(task.ID)
			if err != nil {
				log.Fatalf("Failed to get task: %v", err)
			}

			if task.Status != common.TaskStatusPending && task.Status != common.TaskStatusRunning {
				fmt.Printf("\nTask completed with status: %s\n", task.Status)
				if task.Result != "" {
					fmt.Printf("Result:\n%s\n", task.Result)
				}
				if task.Error != "" {
					fmt.Printf("Error:\n%s\n", task.Error)
					os.Exit(1)
				}
				break
			}
		}
	}
}

func handleList() {
	var (
		resource = flag.String("resource", "tasks", "Resource to list (tasks, agents)")
		agentID  = flag.String("agent", "", "Filter by agent ID")
		limit    = flag.Int("limit", 50, "Limit")
	)
	flag.Parse()

	url := *cloudURL + "/api/v1/" + *resource
	if *agentID != "" && *resource == "tasks" {
		url += "?agent_id=" + *agentID
	}
	url += fmt.Sprintf("&limit=%d", *limit)

	resp, err := http.Get(url)
	if err != nil {
		log.Fatalf("Failed to list %s: %v", *resource, err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Failed to read response: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		log.Fatalf("Request failed: %s", string(body))
	}

	fmt.Println(string(body))
}

func handleLogs() {
	var (
		taskID = flag.String("task", "", "Task ID")
		limit  = flag.Int("limit", 1000, "Limit")
	)
	flag.Parse()

	if *taskID == "" {
		log.Fatal("task is required")
	}

	url := fmt.Sprintf("%s/api/v1/tasks/%s/logs?limit=%d", *cloudURL, *taskID, *limit)
	resp, err := http.Get(url)
	if err != nil {
		log.Fatalf("Failed to get logs: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Failed to read response: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		log.Fatalf("Request failed: %s", string(body))
	}

	var logs []common.Log
	if err := json.Unmarshal(body, &logs); err != nil {
		log.Fatalf("Failed to parse logs: %v", err)
	}

	for _, log := range logs {
		fmt.Printf("[%s] [%s] %s\n",
			time.Unix(log.Timestamp.Unix(), 0).Format("2006-01-02 15:04:05"),
			strings.ToUpper(log.Level),
			log.Message,
		)
	}
}

func handleUpload() {
	var filePath = flag.String("file", "", "File to upload")
	flag.Parse()

	if *filePath == "" {
		log.Fatal("file is required")
	}

	file, err := os.Open(*filePath)
	if err != nil {
		log.Fatalf("Failed to open file: %v", err)
	}
	defer file.Close()

	// 创建 multipart form
	var b strings.Builder
	b.WriteString("------WebKitFormBoundary7MA4YWxkTrZu0gW\r\n")
	b.WriteString(fmt.Sprintf("Content-Disposition: form-data; name=\"file\"; filename=\"%s\"\r\n", file.Name()))
	b.WriteString("Content-Type: application/octet-stream\r\n\r\n")

	body := strings.NewReader(b.String())
	bodyReader := io.MultiReader(body, file, strings.NewReader("\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n"))

	req, err := http.NewRequest("POST", *cloudURL+"/api/v1/files", bodyReader)
	if err != nil {
		log.Fatalf("Failed to create request: %v", err)
	}

	req.Header.Set("Content-Type", "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Fatalf("Failed to upload file: %v", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Failed to read response: %v", err)
	}

	if resp.StatusCode != http.StatusCreated {
		log.Fatalf("Upload failed: %s", string(bodyBytes))
	}

	var fileInfo common.File
	if err := json.Unmarshal(bodyBytes, &fileInfo); err != nil {
		log.Fatalf("Failed to parse response: %v", err)
	}

	fmt.Printf("File uploaded: %s\n", fileInfo.ID)
	fmt.Printf("Name: %s\n", fileInfo.Name)
	fmt.Printf("Size: %d bytes\n", fileInfo.Size)
}

func postJSON(url string, data interface{}) ([]byte, error) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	resp, err := http.Post(url, "application/json", strings.NewReader(string(jsonData)))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	return io.ReadAll(resp.Body)
}

func getTask(taskID string) (*common.Task, error) {
	url := fmt.Sprintf("%s/api/v1/tasks/%s", *cloudURL, taskID)
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var task common.Task
	if err := json.Unmarshal(body, &task); err != nil {
		return nil, err
	}

	return &task, nil
}
