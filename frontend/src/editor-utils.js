// Editor utility functions - syntax highlighting, line numbers, scroll sync

import { editor, editorHighlighted, editorLineNumbers, charCount } from './constants.js';

// Apply syntax highlighting colors to JSON string
export function syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return json.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
            let cls = 'number';
            if (/^"/.test(match)) {
                cls = /:$/.test(match) ? 'key' : 'string';
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null/.test(match)) {
                cls = 'null';
            }
            return `<span class="${cls}">${match}</span>`;
        }
    );
}

// Update the line numbers gutter to match editor content
export function updateLineNumbers() {
    const lines = editor.value.split('\n').length;
    let lineNumbersHtml = '';
    for (let i = 1; i <= lines; i++) {
        lineNumbersHtml += `<div>${i}</div>`;
    }
    editorLineNumbers.innerHTML = lineNumbersHtml;
}

// Update character count and line numbers
export function updateStats() {
    charCount.textContent = `${editor.value.length} chars`;
    updateLineNumbers();
}

// Sync scroll position between editor, highlight overlay, and line numbers
export function syncScroll() {
    editorLineNumbers.scrollTop = editor.scrollTop;
    editorHighlighted.scrollTop = editor.scrollTop;
    editorHighlighted.scrollLeft = editor.scrollLeft;
}

// Re-render the syntax highlight overlay
export function updateEditorHighlighting() {
    const content = editor.value;
    const highlighted = syntaxHighlight(content);
    const endsWithNewline = content.endsWith('\n');
    const displayContent = endsWithNewline ? highlighted + '\n' : highlighted;
    editorHighlighted.innerHTML = displayContent + '<br>';
}

// Check if editor content is empty
export function isEmptyInput() {
    return !editor.value.trim();
}

// Check if content appears to be already formatted (multi-line indented)
export function isFormattedContent(content) {
    return content.includes('\n  ') || content.includes('\n    ');
}

// Apply highlighting only when content is formatted; clear overlay for single-line input
export function applyHighlightingIfNeeded(content) {
    if (isFormattedContent(content)) {
        editor.classList.add('highlighted');
        updateEditorHighlighting();
    } else {
        editor.classList.remove('highlighted');
        editorHighlighted.innerHTML = '';
    }
}
