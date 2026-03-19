import { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('CodexBar crashed:', error, info.componentStack);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-screen w-full bg-background p-6 text-center">
                    <div className="rounded-xl border border-border bg-card p-6 shadow-lg max-w-[340px] w-full">
                        <div className="text-2xl mb-3">⚠️</div>
                        <h2 className="text-sm font-bold text-card-foreground mb-2">
                            Something went wrong
                        </h2>
                        <p className="text-[11px] text-muted-foreground leading-relaxed mb-4">
                            CodexBar encountered an unexpected error. Your settings and data are safe.
                        </p>
                        {this.state.error && (
                            <div className="text-[10px] text-muted-foreground bg-secondary rounded-md p-2 mb-4 font-mono text-left overflow-auto max-h-[80px]">
                                {this.state.error.message}
                            </div>
                        )}
                        <button
                            onClick={this.handleReload}
                            className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                        >
                            <RefreshCw size={12} />
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
