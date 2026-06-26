# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Jay JSON is a cross-platform desktop JSON tools application built with [Wails v3](https://v3.wails.io/). It combines a Go backend with vanilla JavaScript frontend to provide JSON formatting, validation, minification, and tree view visualization.

**Tech Stack:**
- Backend: Go 1.25 with Wails v3
- Frontend: Vanilla JavaScript (ES Modules), Vite for building
- Icons: Heroicons
- Fonts: Inter (UI), IBM Plex Mono (code/editor)

## Development Commands

### Initial Setup
```bash
# Install frontend dependencies
cd frontend && npm install
```

### Development
```bash
# Run in development mode (hot reload enabled)
wails3 dev
# or via Makefile
make dev

# Frontend only (for CSS/JS development)
cd frontend && npm run dev
```

### Building
```bash
# Production build (creates executables in build/)
wails3 build
# or
make build

# Frontend build only
cd frontend && npm run build          # Production
cd frontend && npm run build:dev      # Development (no minify)
```

### Frontend Build Artifacts
- Frontend builds output to `frontend/dist/`
- Go embeds `frontend/dist/` via `//go:embed all:frontend/dist`

## Architecture

### Backend (Go)

**Entry Point:** `main.go`
- Initializes Wails app with services and assets
- Configures macOS-specific options (glass backdrop, hidden title bar)
- Sets up multi-window support via `WindowManager`

**JSON Service:** `jsonservice.go`
- `FormatJSON(input, _ bool)` - Format with 2-space indentation
- `MinifyJSON(input)` - Remove whitespace
- `ValidateJSON(input)` - Returns (isValid, message, error)
- Uses `json.UseNumber()` to preserve large number precision

**Window Management:** `windowmanager.go`
- Multi-window support with state tracking
- `OpenNewWindow()` - Creates new windows
- `ToggleAlwaysOnTop()` - Pin window to top
- Cross-window data passing via localStorage

### Frontend (JavaScript)

**Main File:** `frontend/src/main.js`

The frontend is organized into these major sections:

1. **Tab System** - Multi-tab state management with localStorage persistence
   - Each tab stores: content, checkpoints, modification status, panel collapse state
   - Tabs persist across sessions via `localStorage`

2. **Checkpoint System** - Undo/redo with 50 checkpoint limit
   - Saves state before format operations
   - Per-tab checkpoint history

3. **Panel Management** - Collapsible editor/preview panels
   - Prevents both panels from being collapsed simultaneously
   - State stored per-tab

4. **Tree View** - Interactive JSON visualization
   - `renderTreeView(data, key, isRoot)` - Renders recursive structure
   - Type badges (String, Number, Boolean, Null, Object, Array)
   - Collapsible nodes

5. **Auto-Validation** - 400ms debounced validation
   - Real-time JSON syntax checking
   - Auto-formats on valid input

### Wails Bindings

Go services are bound to frontend via `application.NewService()`. Bindings are auto-generated in `frontend/bindings/changeme/` by Vite plugin. Import structure:

```javascript
import { JSONService } from "../bindings/changeme";
import { WindowManager } from "../bindings/changeme";
```

## Key Patterns

### Adding a New Go Service method
1. Add method to struct in Go (e.g., `jsonservice.go`)
2. Method must be exported (capitalized) and on a registered Service
3. Rebuild bindings: `wails3 dev` or `cd frontend && npm run dev`
4. Call from frontend: `await JSONService.YourMethod()`

### Frontend Module Structure
- Single `main.js` entry point with clear section separators
- All functions attached to `window` for HTML onclick handlers
- State in module-level variables (checkpoints, tabs, activeTabId)

### localStorage Keys
- `jsonToolsTabs` - Tab persistence (tabs array + activeTabId)
- `pendingTabData` - Cross-window tab data transfer

### Keyboard Shortcuts (Handled in main.js)
- `Cmd/Ctrl+Enter` - Format JSON
- `Cmd/Ctrl+T` - New tab
- `Cmd/Ctrl+W` - Close tab
- `Cmd/Ctrl+Z` / `Cmd/Ctrl+Shift+Z` - Undo/Redo
- `Cmd/Ctrl+Shift+K` - Clear editor
- `Cmd/Ctrl+1-9` - Switch to tab by number
- `Cmd/Ctrl+Tab` - Next tab
- `Cmd/Ctrl+Shift+[` - Collapse/expand editor panel
- `Cmd/Ctrl+Shift+]` - Collapse/expand preview panel
- `Cmd/Ctrl+Shift+O` - Open tab in new window

## macOS Development Notes

- Application continues running after last window closes (`ApplicationShouldTerminateAfterLastWindowClosed: false`)
- Uses macOS Liquid Glass backdrop effect
- Title bar is hidden (`MacTitleBarHidden`)
- Window background color: `rgb(27, 38, 54)` (dark blue)

## File Locations

| Purpose | Location |
|---------|----------|
| Go services | `*.go` files in root |
| Frontend JS | `frontend/src/main.js` |
| Frontend CSS | `frontend/public/style.css` |
| HTML entry | `frontend/index.html` |
| Generated bindings | `frontend/bindings/changeme/` |
| Build output | `build/{darwin,linux,windows,android}/` |
