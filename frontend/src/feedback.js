// UI feedback utilities - status bar messages, button press animation, validation badges

import { statusItem, validationStatus } from './constants.js';

// Show a transient message in the status bar
export function showFeedback(message) {
    const originalText = statusItem.textContent;
    statusItem.textContent = message;
    statusItem.classList.add('highlight');

    setTimeout(() => {
        statusItem.textContent = originalText;
        statusItem.classList.remove('highlight');
    }, 2000);
}

// Animate a button by matching its onclick attribute
export function pressButton(onclickAttr) {
    const btn = document.querySelector(`button[onclick="${onclickAttr}()"]`);
    if (btn) {
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => btn.style.transform = '', 150);
    }
}

// Update the validation badge: null=neutral, true=valid, false=invalid
export function setValidationStatus(isValid) {
    if (isValid === null) {
        validationStatus.textContent = '';
        validationStatus.className = 'status-badge';
    } else if (isValid) {
        validationStatus.textContent = 'Valid';
        validationStatus.className = 'status-badge valid';
    } else {
        validationStatus.textContent = 'Invalid';
        validationStatus.className = 'status-badge invalid';
    }
}
