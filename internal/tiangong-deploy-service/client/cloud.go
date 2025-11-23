package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type CloudClient struct {
	BaseURL    string
	HTTPClient *http.Client
}

func NewCloudClient(baseURL string) *CloudClient {
	return &CloudClient{
		BaseURL: baseURL,
		HTTPClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

type CreateTaskRequest struct {
	AgentID string                 `json:"agent_id"`
	Type    string                 `json:"type"`
	Command string                 `json:"command"`
	Params  map[string]interface{} `json:"params"`
	FileID  string                 `json:"file_id"`
}

type CreateTaskResponse struct {
	ID string `json:"id"`
}

func (c *CloudClient) CreateTask(req *CreateTaskRequest) (string, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return "", err
	}

	resp, err := c.HTTPClient.Post(fmt.Sprintf("%s/api/v1/tasks", c.BaseURL), "application/json", bytes.NewBuffer(body))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to create task, status: %d", resp.StatusCode)
	}

	var result CreateTaskResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	return result.ID, nil
}
