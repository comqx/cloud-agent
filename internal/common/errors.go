package common

import "fmt"

// Error 自定义错误类型
type Error struct {
	Message string
}

func (e *Error) Error() string {
	return e.Message
}

// NewError 创建新错误
func NewError(message string) error {
	return &Error{Message: message}
}

// NewErrorf 创建格式化错误
func NewErrorf(format string, args ...interface{}) error {
	return &Error{Message: fmt.Sprintf(format, args...)}
}

