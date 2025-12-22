import React from 'react';
import { logError } from '../utils/logger';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidMount() {
        window.addEventListener('error', this.handleGlobalError);
        window.addEventListener('unhandledrejection', this.handlePromiseRejection);
    }

    componentWillUnmount() {
        window.removeEventListener('error', this.handleGlobalError);
        window.removeEventListener('unhandledrejection', this.handlePromiseRejection);
    }

    handleGlobalError = (event) => {
        // Prevent default browser error handling if desired, but usually we just want to show UI
        // event.preventDefault(); 
        const error = event.error || new Error(event.message || 'Unknown Error');
        this.setState({ hasError: true, error });
    }

    handlePromiseRejection = (event) => {
        this.setState({ hasError: true, error: event.reason });
    }

    componentDidCatch(error, errorInfo) {
        // Log the error to our serverless function
        logError(error, { ...errorInfo, type: 'boundary-error' });
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-red-900/50 rounded-lg p-8 max-w-md w-full shadow-2xl">
                        <h2 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h2>
                        <p className="text-slate-300 mb-6">
                            For best results, open Memo inside the Phantom browser.
                        </p>
                        <div className="bg-slate-950 p-4 rounded border border-slate-800 mb-6 overflow-auto max-h-48">
                            <code className="text-xs text-red-400 font-mono">
                                {this.state.error && this.state.error.toString()}
                            </code>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors"
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
