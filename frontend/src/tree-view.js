// Tree View Rendering - Pure functions for JSON tree visualization

// Escape HTML special characters
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Get type for JSON value
export function getType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

// Format JSON value for display
export function formatValue(value) {
    if (value === null) return 'null';
    if (typeof value === 'string') return `"${escapeHtml(value)}"`;
    return String(value);
}

// Toggle tree node expansion
export function toggleNode(nodeId) {
    const toggle = document.getElementById(`toggle-${nodeId}`);
    const children = document.getElementById(`children-${nodeId}`);

    if (toggle && children) {
        toggle.classList.toggle('collapsed');
        children.classList.toggle('collapsed');
    }
}

// Render JSON as interactive tree view
export function renderTreeView(data, key, isRoot = false) {
    const type = getType(data);
    const hasChildren = type === 'object' || type === 'array';
    const nodeId = `node-${Math.random().toString(36).substr(2, 9)}`;

    let html = '';

    if (isRoot) {
        html += `<div class="tree-node tree-root">`;
    } else {
        html += `<div class="tree-node">`;
    }

    // Row with toggle, key, type
    html += `<div class="tree-row" onclick="toggleNode('${nodeId}')">`;

    if (hasChildren) {
        html += `<span class="tree-toggle" id="toggle-${nodeId}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        </span>`;
    } else {
        html += `<span class="tree-toggle invisible">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        </span>`;
    }

    if (!isRoot) {
        html += `<span class="tree-key">${escapeHtml(key)}:</span>`;
    }

    if (hasChildren) {
        const length = Object.keys(data).length;
        const size = type === 'array' ? `[${length}]` : `{${length}}`;
        html += `<span class="tree-type ${type}">${type.charAt(0).toUpperCase() + type.slice(1)}</span>`;
        html += `<span class="tree-type">${size}</span>`;
    } else {
        // Leaf node - show value
        html += `<span class="tree-type ${type}">${type.charAt(0).toUpperCase() + type.slice(1)}</span>`;
        html += `<span class="tree-value ${type}">${formatValue(data)}</span>`;
    }

    html += `</div>`; // End tree-row

    // Children
    if (hasChildren) {
        html += `<div class="tree-children" id="children-${nodeId}">`;
        for (const [k, v] of Object.entries(data)) {
            html += renderTreeView(v, k);
        }
        html += `</div>`; // End tree-children
    }

    html += `</div>`; // End tree-node

    return html;
}
