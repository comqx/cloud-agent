package plugins

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// ReadSQLFromFile 从文件读取 SQL 内容
// 支持普通 SQL 文件和 zip 压缩包
// 如果 fileID 为空，返回空字符串
// 如果 filePath 为空，尝试从多个可能的位置查找文件
func ReadSQLFromFile(fileID string, filePath string, fileName string, logCallback LogCallback, taskID string) (string, error) {
	if fileID == "" {
		return "", nil
	}

	// 如果没有提供 filePath，尝试从多个可能的位置查找文件
	if filePath == "" {
		// 尝试多个可能的路径
		possiblePaths := []string{
			fileID, // 直接使用 fileID 作为路径
		}
		
		// 尝试在 tmp 目录下查找
		if wd, err := os.Getwd(); err == nil {
			possiblePaths = append(possiblePaths, filepath.Join(wd, "tmp", fileID))
			possiblePaths = append(possiblePaths, filepath.Join(wd, "tmp", fileID+".zip"))
			possiblePaths = append(possiblePaths, filepath.Join(wd, "tmp", fileID+".sql"))
		}
		
		// 尝试在 /tmp 目录下查找
		possiblePaths = append(possiblePaths, filepath.Join("/tmp", fileID))
		possiblePaths = append(possiblePaths, filepath.Join("/tmp", fileID+".zip"))
		possiblePaths = append(possiblePaths, filepath.Join("/tmp", fileID+".sql"))
		
		// 查找第一个存在的文件
		for _, path := range possiblePaths {
			if _, err := os.Stat(path); err == nil {
				filePath = path
				break
			}
		}
		
		if filePath == "" {
			return "", fmt.Errorf("file not found for fileID: %s (searched in: %v)", fileID, possiblePaths)
		}
	}

	// 检查文件是否存在
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		return "", fmt.Errorf("file not found: %s: %w", filePath, err)
	}

	// 如果是目录，返回错误
	if fileInfo.IsDir() {
		return "", fmt.Errorf("path is a directory, not a file: %s", filePath)
	}

	// 检查文件扩展名
	ext := strings.ToLower(filepath.Ext(filePath))
	if ext == ".zip" {
		// 处理 zip 文件
		return readSQLFromZip(filePath, fileName, logCallback, taskID)
	}

	// 处理普通文件
	return readSQLFromPlainFile(filePath, logCallback, taskID)
}

// readSQLFromPlainFile 从普通文件读取 SQL
func readSQLFromPlainFile(filePath string, logCallback LogCallback, taskID string) (string, error) {
	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Reading SQL from file: %s", filePath))
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}

	sql := string(data)
	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Read %d bytes from file", len(sql)))
	}

	return sql, nil
}

// readSQLFromZip 从 zip 文件读取 SQL
// 如果 fileName 为空，尝试查找第一个 .sql 文件
// 如果 fileName 不为空，查找指定的文件
func readSQLFromZip(zipPath string, fileName string, logCallback LogCallback, taskID string) (string, error) {
	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Reading SQL from zip file: %s", zipPath))
	}

	// 打开 zip 文件
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return "", fmt.Errorf("failed to open zip file: %w", err)
	}
	defer r.Close()

	// 查找 SQL 文件
	var sqlFile *zip.File
	if fileName != "" {
		// 查找指定文件
		for _, f := range r.File {
			if f.Name == fileName || filepath.Base(f.Name) == fileName {
				sqlFile = f
				break
			}
		}
		if sqlFile == nil {
			return "", fmt.Errorf("file '%s' not found in zip", fileName)
		}
	} else {
		// 查找第一个 .sql 文件
		for _, f := range r.File {
			if strings.HasSuffix(strings.ToLower(f.Name), ".sql") {
				sqlFile = f
				break
			}
		}
		if sqlFile == nil {
			return "", fmt.Errorf("no .sql file found in zip")
		}
	}

	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Found SQL file in zip: %s", sqlFile.Name))
	}

	// 打开文件
	rc, err := sqlFile.Open()
	if err != nil {
		return "", fmt.Errorf("failed to open file in zip: %w", err)
	}
	defer rc.Close()

	// 读取文件内容
	data, err := io.ReadAll(rc)
	if err != nil {
		return "", fmt.Errorf("failed to read file from zip: %w", err)
	}

	sql := string(data)
	if logCallback != nil {
		logCallback(taskID, "info", fmt.Sprintf("Read %d bytes from zip file: %s", len(sql), sqlFile.Name))
	}

	return sql, nil
}

// ListFilesInZip 列出 zip 文件中的所有文件
func ListFilesInZip(zipPath string) ([]string, error) {
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open zip file: %w", err)
	}
	defer r.Close()

	var files []string
	for _, f := range r.File {
		files = append(files, f.Name)
	}

	return files, nil
}

