/**
 * Logs an error to the server-side logging endpoint
 * @param {Error|string} error - The error object or message
 * @param {Object} [info] - Additional context info
 */
export const logError = async (error, info = {}) => {
    // Always log to console locally
    console.error('Client Error:', error, info);

    try {
        const errorData = {
            message: error?.message || String(error),
            stack: error?.stack,
            type: info.type || 'client-error',
            info,
            url: window.location.href,
            userAgent: navigator.userAgent,
        };

        // Send to Vercel function
        // We use fetch with keepalive to ensure it sends even if page is unloading
        await fetch('/api/log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(errorData),
            keepalive: true,
        });
    } catch (loggingError) {
        // Fallback if logging fails - don't crash the app
        console.error('Failed to send log to server:', loggingError);
    }
};
