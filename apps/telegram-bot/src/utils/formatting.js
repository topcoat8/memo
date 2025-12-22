/**
 * Escapes special characters for Telegram Legacy Markdown.
 * Characters escaped: '_', '*', '[', '`'
 * @param {string} text - The text to escape
 * @returns {string} - Escaped text
 */
export function escapeMarkdown(text) {
    if (!text) return '';
    return text.replace(/([_*\[`])/g, '\\$1');
}
