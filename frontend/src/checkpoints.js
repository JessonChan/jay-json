// Checkpoint System - undo/redo state management

import { editor, undoBtn, redoBtn, CHECKPOINT_LIMIT } from './constants.js';
import { applyHighlightingIfNeeded, updateStats, updateLineNumbers } from './editor-utils.js';
import { pressButton, showFeedback } from './feedback.js';

// Mutable state (object wrapper for reliable live binding across modules)
export const cpState = {
    checkpoints: [],
    currentCheckpointIndex: -1,
};

// Dependencies injected from main.js to avoid circular imports
let autoValidateFn = () => {};
let saveCurrentTabStateFn = () => {};

export function setCheckpointDeps({ autoValidate, saveCurrentTabState }) {
    autoValidateFn = autoValidate;
    saveCurrentTabStateFn = saveCurrentTabState;
}

// Restore checkpoint state when switching tabs
export function loadCheckpointState(checkpoints, index) {
    cpState.checkpoints = checkpoints || [];
    cpState.currentCheckpointIndex = index ?? -1;
    updateUndoRedoButtons();
}

// Save current content as a checkpoint
export function saveCheckpoint(content) {
    // Drop any redo history after current index
    cpState.checkpoints = cpState.checkpoints.slice(0, cpState.currentCheckpointIndex + 1);

    // Skip duplicate of latest checkpoint
    if (cpState.checkpoints.length > 0 && cpState.checkpoints[cpState.checkpoints.length - 1] === content) {
        return;
    }

    cpState.checkpoints.push(content);
    cpState.currentCheckpointIndex++;

    // Cap history length
    if (cpState.checkpoints.length > CHECKPOINT_LIMIT) {
        cpState.checkpoints.shift();
        cpState.currentCheckpointIndex--;
    }

    saveCurrentTabStateFn();
    updateUndoRedoButtons();
}

export function undoCheckpoint() {
    if (cpState.currentCheckpointIndex <= 0) return;

    pressButton('undoCheckpoint');

    cpState.currentCheckpointIndex--;
    const content = cpState.checkpoints[cpState.currentCheckpointIndex];
    editor.value = content;

    applyHighlightingIfNeeded(content);
    updateUndoRedoButtons();
    updateStats();
    updateLineNumbers();
    autoValidateFn();

    showFeedback('↩️ Undone');
}

export function redoCheckpoint() {
    if (cpState.currentCheckpointIndex >= cpState.checkpoints.length - 1) return;

    pressButton('redoCheckpoint');

    cpState.currentCheckpointIndex++;
    const content = cpState.checkpoints[cpState.currentCheckpointIndex];
    editor.value = content;

    applyHighlightingIfNeeded(content);
    updateUndoRedoButtons();
    updateStats();
    updateLineNumbers();
    autoValidateFn();

    showFeedback('↪️ Redone');
}

export function updateUndoRedoButtons() {
    undoBtn.disabled = cpState.currentCheckpointIndex < 0;
    redoBtn.disabled = cpState.currentCheckpointIndex >= cpState.checkpoints.length - 1;

    undoBtn.style.opacity = undoBtn.disabled ? '0.4' : '1';
    redoBtn.style.opacity = redoBtn.disabled ? '0.4' : '1';
}
