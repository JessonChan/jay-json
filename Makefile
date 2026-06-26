# Jay JSON Makefile
# A cross-platform JSON tools application built with Wails v3

# Variables
APP_NAME := JSON Tools
APP_EXECUTABLE := json_tools
BIN_DIR := bin
BUILD_DIR := build
FRONTEND_DIR := frontend
DIST_DIR := $(FRONTEND_DIR)/dist
VITE_PORT := 9245

# Platform detection
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
	PLATFORM := darwin
	APP_BUNDLE := $(BIN_DIR)/$(APP_EXECUTABLE).app
	INFO_PLIST := $(BUILD_DIR)/darwin/Info.plist
	ICONS := $(BUILD_DIR)/darwin/icons.icns
endif

# Colors for output
COLOR_RESET := \033[0m
COLOR_BOLD := \033[1m
COLOR_GREEN := \033[32m
COLOR_YELLOW := \033[33m
COLOR_BLUE := \033[34m

.PHONY: all
all: build

## help: Show this help message
.PHONY: help
help:
	@echo "$(COLOR_BOLD)Jay JSON - Available commands:$(COLOR_RESET)"
	@sed -n 's/^##//p' $(MAKEFILE_LIST) | column -t -s ':' | sed -e 's/^/ /'

## clean: Remove build artifacts and caches
.PHONY: clean
clean:
	@echo "$(COLOR_YELLOW)Cleaning build artifacts...$(COLOR_RESET)"
	rm -rf $(BIN_DIR)
	rm -rf $(DIST_DIR)
	rm -rf $(FRONTEND_DIR)/node_modules/.vite
	@echo "$(COLOR_GREEN)Clean complete.$(COLOR_RESET)"

## clean/all: Deep clean including node_modules and Go cache
.PHONY: clean/all
clean/all:
	@echo "$(COLOR_YELLOW)Deep cleaning...$(COLOR_RESET)"
	rm -rf $(BIN_DIR)
	rm -rf $(DIST_DIR)
	rm -rf $(FRONTEND_DIR)/node_modules
	go clean -cache -modcache -i -r
	@echo "$(COLOR_GREEN)Deep clean complete.$(COLOR_RESET)"

## deps: Install dependencies
.PHONY: deps
deps:
	@echo "$(COLOR_BLUE)Installing dependencies...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && bun install
	go mod download
	go mod tidy
	@echo "$(COLOR_GREEN)Dependencies installed.$(COLOR_RESET)"

## dev: Run in development mode with hot reload
.PHONY: dev
dev:
	@echo "$(COLOR_BLUE)Starting development server...$(COLOR_RESET)"
	wails3 dev -port $(VITE_PORT)

## build: Build production binary
.PHONY: build
build:
	@echo "$(COLOR_BLUE)Building production binary...$(COLOR_RESET)"
	@wails3 build
	@echo "$(COLOR_GREEN)Build complete: $(BIN_DIR)/$(APP_EXECUTABLE)$(COLOR_RESET)"

## build/frontend: Build frontend assets only
.PHONY: build/frontend
build/frontend:
	@echo "$(COLOR_BLUE)Building frontend assets...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && bun run build
	@echo "$(COLOR_GREEN)Frontend build complete.$(COLOR_RESET)"

## package: Package application as .app bundle (macOS only)
.PHONY: package
package: build
	@echo "$(COLOR_BLUE)Creating .app bundle...$(COLOR_RESET)"
	mkdir -p $(APP_BUNDLE)/Contents/MacOS
	mkdir -p $(APP_BUNDLE)/Contents/Resources
	cp $(BIN_DIR)/$(APP_EXECUTABLE) $(APP_BUNDLE)/Contents/MacOS/
	cp $(ICONS) $(APP_BUNDLE)/Contents/Resources/
	cp $(INFO_PLIST) $(APP_BUNDLE)/Contents/
	plutil -replace CFBundleExecutable -string "$(APP_EXECUTABLE)" $(APP_BUNDLE)/Contents/Info.plist
	codesign --force --deep --sign - $(APP_BUNDLE)
	@echo "$(COLOR_GREEN)Package complete: $(APP_BUNDLE)$(COLOR_RESET)"

## package/dmg: Create DMG installer (macOS only)
.PHONY: package/dmg
package/dmg: package
	@echo "$(COLOR_BLUE)Creating DMG installer...$(COLOR_RESET)"
	@if command -v hdiutil >/dev/null 2>&1; then \
		rm -f $(BIN_DIR)/$(APP_NAME).dmg; \
		hdiutil create -volname "$(APP_NAME)" -srcfolder $(APP_BUNDLE) -ov -format UDZO $(BIN_DIR)/$(APP_NAME).dmg; \
		echo "$(COLOR_GREEN)DMG created: $(BIN_DIR)/$(APP_NAME).dmg$(COLOR_RESET)"; \
	else \
		echo "$(COLOR_YELLOW)hdiutil not found. Skipping DMG creation.$(COLOR_RESET)"; \
	fi

## run: Build and run the application
.PHONY: run
run: package
	@echo "$(COLOR_BLUE)Launching $(APP_NAME)...$(COLOR_RESET)"
	open $(APP_BUNDLE)

## lint: Run linters
.PHONY: lint
lint:
	@echo "$(COLOR_BLUE)Running linters...$(COLOR_RESET)"
	@if command -v golangci-lint >/dev/null 2>&1; then \
		golangci-lint run ./...; \
	else \
		echo "$(COLOR_YELLOW)golangci-lint not installed. Run: brew install golangci-lint$(COLOR_RESET)"; \
	fi
	@if command -v eslint >/dev/null 2>&1; then \
		cd $(FRONTEND_DIR) && eslint .; \
	fi

## test: Run tests
.PHONY: test
test:
	@echo "$(COLOR_BLUE)Running tests...$(COLOR_RESET)"
	go test -v -race -coverprofile=coverage.out ./...
	@if [ -f coverage.out ]; then \
		go tool cover -html=coverage.out -o coverage.html; \
		echo "$(COLOR_GREEN)Coverage report: coverage.html$(COLOR_RESET)"; \
	fi

## fmt: Format code
.PHONY: fmt
fmt:
	@echo "$(COLOR_BLUE)Formatting code...$(COLOR_RESET)"
	go fmt ./...
	cd $(FRONTEND_DIR) && bun run format 2>/dev/null || true
	@echo "$(COLOR_GREEN)Code formatted.$(COLOR_RESET)"

## check: Run all checks (lint + test)
.PHONY: check
check: lint test

## release: Build release artifacts
.PHONY: release
release: clean build package
	@echo "$(COLOR_GREEN)Release ready!$(COLOR_RESET)"
	@echo "Binary: $(BIN_DIR)/$(APP_EXECUTABLE)"
	@echo "App Bundle: $(APP_BUNDLE)"
	@ls -lh $(BIN_DIR)/$(APP_EXECUTABLE) $(APP_BUNDLE)/Contents/MacOS/$(APP_EXECUTABLE) 2>/dev/null || true

## install: Copy .app to /Applications
.PHONY: install
install: package
	@echo "$(COLOR_BLUE)Installing to /Applications...$(COLOR_RESET)"
	cp -R $(APP_BUNDLE) /Applications/
	@echo "$(COLOR_GREEN)Installed to /Applications/$(APP_NAME).app$(COLOR_RESET)"

## uninstall: Remove .app from /Applications
.PHONY: uninstall
uninstall:
	@echo "$(COLOR_YELLOW)Uninstalling from /Applications...$(COLOR_RESET)"
	rm -rf /Applications/$(APP_NAME).app
	@echo "$(COLOR_GREEN)Uninstalled.$(COLOR_RESET)"

## version: Print version information
.PHONY: version
version:
	@echo "$(COLOR_BOLD)Jay JSON$(COLOR_RESET)"
	@echo "Go version: $$(go version)"
	@echo "Wails version: $$(wails3 version 2>/dev/null || echo 'not found')"
	@echo "Node version: $$(node --version 2>/dev/null || echo 'not found')"
	@echo "Bun version: $$(bun --version 2>/dev/null || echo 'not found')"

# Default target
.DEFAULT_GOAL := help
