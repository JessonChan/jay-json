package main

import (
	"strings"
	"testing"
)

func TestJSONService_FormatJSON(t *testing.T) {
	svc := &JSONService{}

	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{
			name:  "simple object",
			input: `{"name":"John","age":30}`,
			want:  "{\n  \"age\": 30,\n  \"name\": \"John\"\n}",
		},
		{
			name:  "nested object",
			input: `{"user":{"name":"John","address":{"city":"NYC"}}}`,
			want:  "{\n  \"user\": {\n    \"address\": {\n      \"city\": \"NYC\"\n    },\n    \"name\": \"John\"\n  }\n}",
		},
		{
			name:  "array",
			input: `[1,2,3]`,
			want:  "[\n  1,\n  2,\n  3\n]",
		},
		{
			name:  "already formatted",
			input: "{\n  \"a\": 1\n}",
			want:  "{\n  \"a\": 1\n}",
		},
		{
			name:  "empty object",
			input: `{}`,
			want:  "{}",
		},
		{
			name:  "empty array",
			input: `[]`,
			want:  "[]",
		},
		{
			name:    "invalid json",
			input:   `{invalid}`,
			wantErr: true,
		},
		{
			name:    "empty string",
			input:   ``,
			wantErr: true,
		},
		{
			name:  "trailing content formats first value",
			input: `{}{}`,
			want:  "{}",
		},
		{
			name:  "large number preserved",
			input: `{"id":9007199254740993}`,
			want:  "{\n  \"id\": 9007199254740993\n}",
		},
		{
			name:  "unicode characters",
			input: `{"name":"张三","emoji":"🎉"}`,
			want:  "{\n  \"emoji\": \"🎉\",\n  \"name\": \"张三\"\n}",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := svc.FormatJSON(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("FormatJSON() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && got != tt.want {
				t.Errorf("FormatJSON() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestJSONService_MinifyJSON(t *testing.T) {
	svc := &JSONService{}

	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{
			name:  "simple object",
			input: `{ "name" : "John" , "age" : 30 }`,
			want:  `{"age":30,"name":"John"}`,
		},
		{
			name:  "formatted input",
			input: "{\n  \"a\": 1,\n  \"b\": 2\n}",
			want:  `{"a":1,"b":2}`,
		},
		{
			name:  "nested structure",
			input: "{\n  \"user\": {\n    \"name\": \"John\"\n  }\n}",
			want:  `{"user":{"name":"John"}}`,
		},
		{
			name:  "empty object",
			input: `{ }`,
			want:  `{}`,
		},
		{
			name:    "invalid json",
			input:   `{invalid}`,
			wantErr: true,
		},
		{
			name:  "large number preserved",
			input: `{ "id" : 9007199254740993 }`,
			want:  `{"id":9007199254740993}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := svc.MinifyJSON(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("MinifyJSON() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && got != tt.want {
				t.Errorf("MinifyJSON() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestJSONService_ValidateJSON(t *testing.T) {
	svc := &JSONService{}

	tests := []struct {
		name      string
		input     string
		wantValid bool
		wantMsg   string
	}{
		{
			name:      "valid object",
			input:     `{"name":"John"}`,
			wantValid: true,
			wantMsg:   "Valid JSON!",
		},
		{
			name:      "valid array",
			input:     `[1,2,3]`,
			wantValid: true,
			wantMsg:   "Valid JSON!",
		},
		{
			name:      "valid string",
			input:     `"hello"`,
			wantValid: true,
			wantMsg:   "Valid JSON!",
		},
		{
			name:      "valid number",
			input:     `42`,
			wantValid: true,
			wantMsg:   "Valid JSON!",
		},
		{
			name:      "valid with whitespace",
			input:     "  { \"a\" : 1 }  ",
			wantValid: true,
			wantMsg:   "Valid JSON!",
		},
		{
			name:      "invalid - syntax error",
			input:     `{invalid}`,
			wantValid: false,
			wantMsg:   "invalid character 'i' looking for beginning of object key string",
		},
		{
			name:      "invalid - trailing content",
			input:     `{}{}`,
			wantValid: false,
			wantMsg:   "invalid json: unexpected content after json value",
		},
		{
			name:      "invalid - empty",
			input:     ``,
			wantValid: false,
		},
		{
			name:      "invalid - unclosed brace",
			input:     `{"a":1`,
			wantValid: false,
		},
		{
			name:      "large number",
			input:     `{"id":9007199254740993}`,
			wantValid: true,
			wantMsg:   "Valid JSON!",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotValid, gotMsg, err := svc.ValidateJSON(tt.input)
			if err != nil {
				t.Errorf("ValidateJSON() error = %v", err)
				return
			}
			if gotValid != tt.wantValid {
				t.Errorf("ValidateJSON() valid = %v, want %v", gotValid, tt.wantValid)
			}
			if tt.wantMsg != "" && gotMsg != tt.wantMsg {
				t.Errorf("ValidateJSON() msg = %q, want %q", gotMsg, tt.wantMsg)
			}
			// For invalid cases without specific message, just check it's not empty
			if !tt.wantValid && tt.wantMsg == "" && gotMsg == "" {
				t.Error("ValidateJSON() msg should not be empty for invalid JSON")
			}
		})
	}
}

func TestJSONService_FormatJSON_PreservesLargeNumbers(t *testing.T) {
	svc := &JSONService{}

	// JavaScript Number.MAX_SAFE_INTEGER + 1
	input := `{"id":9007199254740993}`

	formatted, err := svc.FormatJSON(input)
	if err != nil {
		t.Fatalf("FormatJSON() error = %v", err)
	}

	if !strings.Contains(formatted, "9007199254740993") {
		t.Errorf("Large number not preserved: got %q", formatted)
	}

	// Verify round-trip through minify
	minified, err := svc.MinifyJSON(formatted)
	if err != nil {
		t.Fatalf("MinifyJSON() error = %v", err)
	}

	if minified != input {
		t.Errorf("Round-trip failed: got %q, want %q", minified, input)
	}
}
