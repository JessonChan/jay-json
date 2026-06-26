package main

import (
	"encoding/json"
	"fmt"
	"strings"
)

type JSONService struct{}

// decodeJSON parses JSON input while preserving large numbers via UseNumber
func (j *JSONService) decodeJSON(input string) (interface{}, error) {
	var obj interface{}
	decoder := json.NewDecoder(strings.NewReader(input))
	decoder.UseNumber()
	if err := decoder.Decode(&obj); err != nil {
		return nil, fmt.Errorf("decode json: %w", err)
	}
	return obj, nil
}

// FormatJSON prettifies JSON with 2-space indentation while preserving large numbers
func (j *JSONService) FormatJSON(input string) (string, error) {
	obj, err := j.decodeJSON(input)
	if err != nil {
		return "", fmt.Errorf("format json: %w", err)
	}

	formatted, err := json.MarshalIndent(obj, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshal json: %w", err)
	}

	return string(formatted), nil
}

// MinifyJSON removes all whitespace from JSON while preserving large numbers
func (j *JSONService) MinifyJSON(input string) (string, error) {
	obj, err := j.decodeJSON(input)
	if err != nil {
		return "", fmt.Errorf("minify json: %w", err)
	}

	minified, err := json.Marshal(obj)
	if err != nil {
		return "", fmt.Errorf("marshal json: %w", err)
	}

	return string(minified), nil
}

// ValidateJSON checks if JSON is valid and returns error details
func (j *JSONService) ValidateJSON(input string) (bool, string, error) {
	decoder := json.NewDecoder(strings.NewReader(input))

	var obj interface{}
	err := decoder.Decode(&obj)
	if err != nil {
		errMsg := err.Error()
		return false, errMsg, nil
	}

	// Check for trailing content
	if decoder.More() {
		return false, "invalid json: unexpected content after json value", nil
	}

	return true, "Valid JSON!", nil
}
