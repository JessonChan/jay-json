import { WindowManager } from "../bindings/github.com/JessonChan/jay-json";
import { escapeHtml, renderTreeView, toggleNode } from "./tree-view.js";
import { EMPTY_PLACEHOLDER, editor, editorHighlighted, outputDisplay, tabsContainer } from "./constants.js";
import { updateLineNumbers, updateStats, syncScroll, applyHighlightingIfNeeded } from "./editor-utils.js";
import { showFeedback } from "./feedback.js";
import { cpState, loadCheckpointState, undoCheckpoint, redoCheckpoint, updateUndoRedoButtons, setCheckpointDeps } from "./checkpoints.js";
import { autoValidate, formatJSON, minifyJSON, copyAsFormatted, copyAsMinified, copyOutput, clearEditor, setJsonOpsDeps } from "./json-ops.js";

// Re-export to window for HTML onclick handlers
window.escapeHtml = escapeHtml;
window.renderTreeView = renderTreeView;
window.toggleNode = toggleNode;

// =============================================================================
// Tab State
// =============================================================================

let tabs = [];
let activeTabId = null;

// =============================================================================
// Panel Management
// =============================================================================

function togglePanel(panelType) {
    const panel = document.getElementById(`${panelType}-panel`);
    if (!panel) return;

    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) return;

    const otherPanelType = panelType === 'editor' ? 'preview' : 'editor';
    const isCurrentlyCollapsed = tab.collapsedPanels[panelType];
    const isOtherCollapsed = tab.collapsedPanels[otherPanelType];

    // If trying to collapse this panel and the other is already collapsed,
    // expand the other panel first
    if (!isCurrentlyCollapsed && isOtherCollapsed) {
        const otherPanel = document.getElementById(`${otherPanelType}-panel`);
        if (otherPanel) {
            tab.collapsedPanels[otherPanelType] = false;
            otherPanel.classList.remove('collapsed');

            // Update other panel's collapse button
            const otherCollapseBtn = otherPanel.querySelector('.collapse-btn');
            if (otherCollapseBtn) {
                otherCollapseBtn.setAttribute('aria-expanded', 'true');
            }
        }
    }

    tab.collapsedPanels[panelType] = !tab.collapsedPanels[panelType];

    if (tab.collapsedPanels[panelType]) {
        panel.classList.add('collapsed');
    } else {
        panel.classList.remove('collapsed');
    }

    // Update collapse button aria-expanded attribute
    const collapseBtn = panel.querySelector('.collapse-btn');
    if (collapseBtn) {
        collapseBtn.setAttribute('aria-expanded', !tab.collapsedPanels[panelType]);
    }

    // Save to storage
    saveTabsToStorage();
}

// =============================================================================
// Tab Management
// =============================================================================

function generateTabId() {
    return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createTab(filename = 'Untitled', content = '') {
    const tab = {
        id: generateTabId(),
        filename: filename,
        content: content,
        checkpoints: [],
        checkpointIndex: -1,
        isModified: false,
        lastFormatted: '',
        lastMinified: '',
        collapsedPanels: {
            editor: false,
            preview: false
        }
    };
    return tab;
}

function newTab() {
    const tab = createTab('Untitled', '');
    tabs.push(tab);
    setActiveTab(tab.id);
    renderTabs();
    editor.focus();
}

function closeTab(tabId) {
    const index = tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    tabs.splice(index, 1);

    // If closing active tab, switch to another
    if (tabId === activeTabId) {
        if (tabs.length > 0) {
            // Switch to the tab to the right, or the last tab
            const newIndex = Math.min(index, tabs.length - 1);
            setActiveTab(tabs[newIndex].id);
        } else {
            // No tabs left, create a new one
            newTab();
        }
    }

    renderTabs();
}

function loadTabIntoEditor(tab) {
    editor.value = tab.content;
    loadCheckpointState(tab.checkpoints, tab.checkpointIndex);

    applyHighlightingIfNeeded(tab.content);
    updateLineNumbers();
    updateStats();
    updateUndoRedoButtons();

    // Restore panel collapse state for this tab
    restorePanelState(tab);

    if (tab.content.trim()) {
        try {
            const parsed = JSON.parse(tab.content);
            outputDisplay.innerHTML = renderTreeView(parsed, 'root');
        } catch (e) {
            console.error('Failed to parse JSON for tree view:', e);
            outputDisplay.innerHTML = EMPTY_PLACEHOLDER;
        }
    } else {
        outputDisplay.innerHTML = EMPTY_PLACEHOLDER;
    }
}

function setActiveTab(tabId) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    saveCurrentTabState();
    activeTabId = tabId;
    loadTabIntoEditor(tab);
    renderTabs();
}

function saveCurrentTabState() {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) return;

    tab.content = editor.value;
    tab.checkpoints = cpState.checkpoints;
    tab.checkpointIndex = cpState.currentCheckpointIndex;
}

function updateTabModified(isModified) {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) return;

    tab.isModified = isModified;
    renderTabs();
}

function renderTabs() {
    tabsContainer.innerHTML = '';

    tabs.forEach((tab, index) => {
        const tabEl = document.createElement('div');
        tabEl.className = `tab ${tab.id === activeTabId ? 'active' : ''} ${tab.isModified ? 'modified' : ''}`;
        tabEl.onclick = () => setActiveTab(tab.id);
        tabEl.setAttribute('role', 'tab');
        tabEl.setAttribute('aria-selected', tab.id === activeTabId);
        tabEl.setAttribute('aria-label', `${tab.filename}${tab.isModified ? ' (modified)' : ''}`);
        tabEl.setAttribute('tabindex', '0');
        tabEl.dataset.tabId = tab.id;

        tabEl.innerHTML = `
            <span class="tab-name">${escapeHtml(tab.filename)}</span>
            <button class="tab-close" onclick="event.stopPropagation(); closeTab('${tab.id}')" aria-label="Close ${tab.filename}" tabindex="0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        `;

        tabsContainer.appendChild(tabEl);
    });

    // Save to localStorage whenever tabs change
    saveTabsToStorage();
}

// =============================================================================
// Tab Persistence
// =============================================================================

const STORAGE_KEY = 'jsonToolsTabs';

function saveTabsToStorage() {
    try {
        const tabsData = {
            tabs: tabs.map(tab => ({
                id: tab.id,
                filename: tab.filename,
                content: tab.content,
                checkpoints: tab.checkpoints,
                checkpointIndex: tab.checkpointIndex,
                isModified: tab.isModified,
                collapsedPanels: tab.collapsedPanels
            })),
            activeTabId: activeTabId
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tabsData));
    } catch (e) {
        console.error('Failed to save tabs to storage:', e);
    }
}

function restorePanelState(tab) {
    if (!tab || !tab.collapsedPanels) return;

    const editorPanel = document.getElementById('editor-panel');
    const previewPanel = document.getElementById('preview-panel');

    if (tab.collapsedPanels.editor && editorPanel) {
        editorPanel.classList.add('collapsed');
    } else if (editorPanel) {
        editorPanel.classList.remove('collapsed');
    }

    if (tab.collapsedPanels.preview && previewPanel) {
        previewPanel.classList.add('collapsed');
    } else if (previewPanel) {
        previewPanel.classList.remove('collapsed');
    }
}

function loadTabsFromStorage() {
    try {
        const tabsDataStr = localStorage.getItem(STORAGE_KEY);
        if (!tabsDataStr) return false;

        const tabsData = JSON.parse(tabsDataStr);
        if (!tabsData.tabs || !Array.isArray(tabsData.tabs) || tabsData.tabs.length === 0) {
            return false;
        }

        // Restore tabs with their collapsedPanels state
        tabs = tabsData.tabs.map(tabData => ({
            ...tabData,
            lastFormatted: '',
            lastMinified: '',
            collapsedPanels: tabData.collapsedPanels || {
                editor: false,
                preview: false
            }
        }));

        // Set and verify active tab
        activeTabId = tabsData.activeTabId || tabs[0].id;
        if (!tabs.find(t => t.id === activeTabId)) {
            activeTabId = tabs[0].id;
        }

        // Load the active tab content
        const tab = tabs.find(t => t.id === activeTabId);
        if (tab) {
            loadTabIntoEditor(tab);
        }

        renderTabs();
        return true;
    } catch (e) {
        console.error('Failed to load tabs from storage:', e);
        return false;
    }
}

// Open current tab in a new window
async function openInWindow() {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) return;

    // Save current state first
    saveCurrentTabState();

    // Store tab data with unique key to avoid race conditions
    const transferId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const pendingData = {
        id: transferId,
        filename: tab.filename,
        content: tab.content,
        checkpoints: tab.checkpoints,
        checkpointIndex: tab.checkpointIndex
    };
    localStorage.setItem(`pendingTabData:${transferId}`, JSON.stringify(pendingData));

    // Open new window
    try {
        await WindowManager.OpenNewWindow();
        showFeedback('✓ Opened in new window');
    } catch (e) {
        console.error('Failed to open window:', e);
        showFeedback('✗ Failed to open window');
    }

    // Clean up after a delay in case new window didn't consume it
    setTimeout(() => {
        localStorage.removeItem(`pendingTabData:${transferId}`);
    }, 5000);
}

// Check if this window was opened with pending tab data
function loadPendingTabData() {
    // Find the oldest pending tab data entry
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('pendingTabData:')) continue;

        try {
            const pendingData = JSON.parse(localStorage.getItem(key));
            const tab = createTab(pendingData.filename, pendingData.content);
            tab.checkpoints = pendingData.checkpoints || [];
            tab.checkpointIndex = pendingData.checkpointIndex || -1;

            tabs = [tab];
            activeTabId = tab.id;

            loadTabIntoEditor(tab);
            renderTabs();
            localStorage.removeItem(key);

            return true;
        } catch (e) {
            console.error('Failed to load pending tab data:', e);
            localStorage.removeItem(key);
            continue;
        }
    }
    return false;
}

// =============================================================================
// Event Listeners
// =============================================================================

editor.addEventListener('input', () => {
    // Disable highlighting when user edits
    if (editor.classList.contains('highlighted')) {
        editor.classList.remove('highlighted');
        editorHighlighted.innerHTML = '';
    }

    // Mark current tab as modified
    updateTabModified(true);

    updateStats();
    autoValidate();
});

document.addEventListener('keydown', (e) => {
    const cmdOrCtrl = e.metaKey || e.ctrlKey;

    if (!cmdOrCtrl) return;

    switch (e.key) {
        case 'Enter':
            e.preventDefault();
            formatJSON();
            break;
        case 't':
        case 'T':
            e.preventDefault();
            newTab();
            break;
        case 'w':
        case 'W':
            e.preventDefault();
            if (activeTabId) {
                closeTab(activeTabId);
            }
            break;
        case 'z':
        case 'Z':
            e.preventDefault();
            if (e.shiftKey) {
                redoCheckpoint();
            } else {
                undoCheckpoint();
            }
            break;
        case 'y':
        case 'Y':
            e.preventDefault();
            redoCheckpoint();
            break;
        case 'm':
        case 'M':
            if (e.shiftKey) {
                e.preventDefault();
                minifyJSON();
            }
            break;
        case 'c':
        case 'C':
            // Only intercept if in editor with no text selection
            if (document.activeElement === editor && editor.selectionStart === editor.selectionEnd) {
                e.preventDefault();
                copyOutput();
            }
            break;
        case 'k':
        case 'K':
            if (e.shiftKey) {
                e.preventDefault();
                clearEditor();
            }
            break;
        case 'Tab':
            e.preventDefault();
            switchToNextTab();
            break;
        case 'o':
        case 'O':
            if (e.shiftKey) {
                e.preventDefault();
                openInWindow();
            }
            break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
            // Switch to tab by number (1-based)
            const tabIndex = parseInt(e.key) - 1;
            if (tabIndex >= 0 && tabIndex < tabs.length) {
                e.preventDefault();
                setActiveTab(tabs[tabIndex].id);
            }
            break;
        case '[':
            if (e.shiftKey) {
                e.preventDefault();
                togglePanel('editor'); // Collapse/expand editor
            }
            break;
        case ']':
            if (e.shiftKey) {
                e.preventDefault();
                togglePanel('preview'); // Collapse/expand tree view
            }
            break;
    }
});

function getActiveTabIndex() {
    return tabs.findIndex(t => t.id === activeTabId);
}

function switchToNextTab() {
    if (tabs.length <= 1) return;
    const currentIndex = getActiveTabIndex();
    if (currentIndex >= 0) {
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTab(tabs[nextIndex].id);
    }
}

function switchToPreviousTab() {
    if (tabs.length <= 1) return;
    const currentIndex = getActiveTabIndex();
    const targetIndex = currentIndex <= 0 ? tabs.length - 1 : currentIndex - 1;
    setActiveTab(tabs[targetIndex].id);
}

// Handle arrow key navigation for tabs
document.addEventListener('keydown', (e) => {
    // Only handle arrow keys when not in editor
    if (document.activeElement === editor) return;

    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        switchToPreviousTab();
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        switchToNextTab();
    }
});

// =============================================================================
// Public API (Window Functions)
// =============================================================================

window.formatJSON = formatJSON;
window.minifyJSON = minifyJSON;
window.copyAsFormatted = copyAsFormatted;
window.copyAsMinified = copyAsMinified;
window.copyOutput = copyOutput;
window.clearEditor = clearEditor;
window.undoCheckpoint = undoCheckpoint;
window.redoCheckpoint = redoCheckpoint;
window.newTab = newTab;
window.closeTab = closeTab;
window.setActiveTab = setActiveTab;
window.openInWindow = openInWindow;
window.togglePanel = togglePanel;

// =============================================================================
// Window Management
// =============================================================================

window.openNewWindow = async () => {
    try {
        await WindowManager.OpenNewWindow();
        showFeedback('✓ New window opened');
    } catch (e) {
        console.error('Failed to open new window:', e);
        showFeedback('✗ Failed to open window');
    }
};

window.toggleAlwaysOnTop = async () => {
    try {
        const isPinned = await WindowManager.ToggleAlwaysOnTop();
        const pinBtn = document.getElementById('pin-btn');

        if (isPinned) {
            pinBtn.classList.add('active');
            showFeedback('📌 Window pinned');
        } else {
            pinBtn.classList.remove('active');
            showFeedback('📌 Window unpinned');
        }
    } catch (e) {
        console.error('Failed to toggle pin:', e);
        showFeedback('✗ Failed to toggle pin');
    }
};

// =============================================================================
// Initialization
// =============================================================================

// Inject dependencies into checkpoint module (avoids circular import)
setCheckpointDeps({ autoValidate, saveCurrentTabState });

// Inject dependencies into json-ops module (avoids circular import)
setJsonOpsDeps({
    getActiveTab: () => tabs.find(t => t.id === activeTabId),
    saveCurrentTabState,
});

// Priority order for loading tabs:
// 1. Pending data from "Open in Window" feature
// 2. Saved tabs from localStorage (previous session)
// 3. Default new tab

const hasPendingData = loadPendingTabData();

if (!hasPendingData) {
    const hasSavedTabs = loadTabsFromStorage();

    // If no saved tabs, create a default tab
    if (!hasSavedTabs) {
        const defaultTab = createTab('Untitled', '');
        tabs.push(defaultTab);
        activeTabId = defaultTab.id;
        renderTabs();
    }
}

updateStats();
updateLineNumbers();
editor.style.transition = 'opacity 0.2s ease';

// Ensure scrolling syncs properly
editor.addEventListener('scroll', syncScroll, { passive: true });
