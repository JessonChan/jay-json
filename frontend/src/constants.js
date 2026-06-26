// Constants and DOM Elements

export const EMPTY_PLACEHOLDER = '<div class="preview-placeholder">Interactive tree view will appear here...</div>';
export const INVALID_JSON_PLACEHOLDER = '<div class="preview-placeholder" style="color: var(--accent-error);">Invalid JSON - Please check your syntax</div>';
export const CHECKPOINT_LIMIT = 50;
export const DEBOUNCE_DELAY = 400;

// DOM Elements
export const editor = document.getElementById('json-editor');
export const editorHighlighted = document.getElementById('json-editor-highlighted');
export const editorLineNumbers = document.getElementById('editor-line-numbers');
export const outputDisplay = document.getElementById('output-display');
export const validationStatus = document.getElementById('validation-status');
export const charCount = document.getElementById('char-count');
export const statusItem = document.querySelector('.status-item:first-child');
export const undoBtn = document.getElementById('undo-btn');
export const redoBtn = document.getElementById('redo-btn');
export const tabsContainer = document.getElementById('tabs-container');
