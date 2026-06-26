// JSON Operations - format, minify, validate, copy, and display logic

import { JSONService } from "../bindings/github.com/JessonChan/jay-json";
import { editor, editorHighlighted, outputDisplay, EMPTY_PLACEHOLDER, INVALID_JSON_PLACEHOLDER, DEBOUNCE_DELAY } from './constants.js';
import { applyHighlightingIfNeeded, isEmptyInput, updateLineNumbers, updateStats } from './editor-utils.js';
import { pressButton, showFeedback, setValidationStatus } from './feedback.js';
import { escapeHtml, renderTreeView } from './tree-view.js';
import { saveCheckpoint, loadCheckpointState } from './checkpoints.js';

// Dependencies injected from main.js to avoid circular imports
let getActiveTabFn = () => null;
let saveCurrentTabStateFn = () => {};

export function setJsonOpsDeps({ getActiveTab, saveCurrentTabState }) {
    getActiveTabFn = getActiveTab;
    saveCurrentTabStateFn = saveCurrentTabState;
}

// Debounce state for auto-validation
let validateTimeout = null;
let validateRequestId = 0;

// Process JSON input: format and minify, caching results in the current tab
export async function processJSON(input) {
    const [formatted, minified] = await Promise.all([
        JSONService.FormatJSON(input),
        JSONService.MinifyJSON(input)
    ]);

    const tab = getActiveTabFn();
    if (tab) {
        tab.lastFormatted = formatted;
        tab.lastMinified = minified;
    }

    return { formatted, minified };
}

// Auto-validate and format on input with debouncing
export function autoValidate() {
    clearTimeout(validateTimeout);

    const input = editor.value.trim();
    if (!input) {
        setValidationStatus(null);
        outputDisplay.innerHTML = EMPTY_PLACEHOLDER;
        return;
    }

    validateTimeout = setTimeout(async () => {
        const requestId = ++validateRequestId;
        try {
            const [isValid] = await JSONService.ValidateJSON(input);
            // Discard stale response if a newer request was made
            if (requestId !== validateRequestId) return;
            setValidationStatus(isValid);

            if (isValid) {
                const { formatted } = await processJSON(input);
                if (requestId !== validateRequestId) return;
                showOutput(formatted);
            }
        } catch (e) {
            if (requestId !== validateRequestId) return;
            console.error('Auto-validation failed:', e);
            setValidationStatus(false);
            outputDisplay.innerHTML = INVALID_JSON_PLACEHOLDER;
        }
    }, DEBOUNCE_DELAY);
}

// Render output with fade animation
export function showOutput(content) {
    outputDisplay.style.opacity = '0';
    outputDisplay.style.transform = 'translateY(4px)';

    setTimeout(() => {
        try {
            const parsed = JSON.parse(content);
            outputDisplay.innerHTML = renderTreeView(parsed, 'root');
        } catch (e) {
            outputDisplay.innerHTML = `<div class="preview-placeholder" style="color: var(--accent-error);">Invalid JSON: ${escapeHtml(e.message)}</div>`;
        }

        outputDisplay.style.transition = 'all 0.3s ease';
        outputDisplay.style.opacity = '1';
        outputDisplay.style.transform = 'translateY(0)';
    }, 150);
}

export function showError(message) {
    outputDisplay.innerHTML = `<div class="preview-placeholder" style="color: var(--accent-error);">${escapeHtml(message)}</div>`;
}

export async function formatJSON() {
    if (isEmptyInput()) {
        outputDisplay.innerHTML = '<div class="preview-placeholder">Please enter JSON to format</div>';
        return;
    }

    pressButton('formatJSON');

    try {
        const input = editor.value.trim();
        const { formatted } = await processJSON(input);

        // Save checkpoint before formatting
        saveCheckpoint(editor.value);

        // Format in-place in editor
        editor.value = formatted;

        // Save to tab state
        saveCurrentTabStateFn();

        // Apply highlighting and update UI
        applyHighlightingIfNeeded(formatted);
        updateLineNumbers();
        showOutput(formatted);

        showFeedback('✓ Formatted!');
    } catch (err) {
        showError(`Error: ${err.message}`);
        setValidationStatus(false);
    }
}

export async function minifyJSON() {
    if (isEmptyInput()) {
        outputDisplay.innerHTML = '<div class="preview-placeholder">Please enter JSON to minify</div>';
        return;
    }

    pressButton('minifyJSON');

    try {
        const { minified } = await processJSON(editor.value.trim());
        showOutput(minified);
    } catch (err) {
        showError(`Error: ${err.message}`);
    }
}

export async function copyToClipboard(content, successMsg) {
    try {
        await navigator.clipboard.writeText(content);
        showFeedback(successMsg);
    } catch (e) {
        console.error('Failed to copy to clipboard:', e);
        showFeedback('Failed to copy');
    }
}

// Generic copy function that handles both formatted and minified JSON
export async function copyCachedOrProcess(cachedValue, processKey, successMsg) {
    if (cachedValue) {
        await copyToClipboard(cachedValue, successMsg);
        return;
    }

    if (isEmptyInput()) {
        showFeedback('No JSON to copy');
        return;
    }

    try {
        const { [processKey]: result } = await processJSON(editor.value.trim());
        await copyToClipboard(result, successMsg);
    } catch (e) {
        console.error('Copy operation failed:', e);
        showFeedback('Invalid JSON');
    }
}

export async function copyAsFormatted() {
    const tab = getActiveTabFn();
    const cachedValue = tab ? tab.lastFormatted : '';
    await copyCachedOrProcess(cachedValue, 'formatted', 'Copied formatted JSON!');
}

export async function copyAsMinified() {
    const tab = getActiveTabFn();
    const cachedValue = tab ? tab.lastMinified : '';
    await copyCachedOrProcess(cachedValue, 'minified', 'Copied minified JSON!');
}

export async function copyOutput() {
    // Check if there's actual content (not just placeholder)
    if (outputDisplay.querySelector('.preview-placeholder')) {
        showFeedback('No output to copy');
        return;
    }

    const content = outputDisplay.textContent;
    if (!content) {
        showFeedback('No output to copy');
        return;
    }

    await copyToClipboard(content, 'Copied to clipboard!');
}

export function clearEditor() {
    pressButton('clearEditor');

    editor.style.opacity = '0';
    outputDisplay.style.opacity = '0';

    setTimeout(() => {
        // Clear editor state
        editor.value = '';
        editor.classList.remove('highlighted');
        editorHighlighted.innerHTML = '';

        // Clear cached values in current tab
        const tab = getActiveTabFn();
        if (tab) {
            tab.lastFormatted = '';
            tab.lastMinified = '';
        }

        // Reset output display
        outputDisplay.innerHTML = EMPTY_PLACEHOLDER;

        // Reset validation
        setValidationStatus(null);
        updateStats();

        // Clear checkpoints
        loadCheckpointState([], -1);

        // Update tab state
        saveCurrentTabStateFn();

        // Fade in
        editor.style.transition = 'opacity 0.2s ease';
        outputDisplay.style.transition = 'opacity 0.2s ease';
        editor.style.opacity = '1';
        outputDisplay.style.opacity = '1';
    }, 200);
}
