import { Component, type ComponentType, type GetDerivedStateFromError, type PropsWithChildren, type ReactNode } from 'react';

export interface ErrorBoundaryProps extends PropsWithChildren {
    fallback?: ReactNode | ComponentType<{ error: unknown }>;
}

interface ErrorBoundaryState {
    error?: unknown;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = {};

    // eslint-disable-next-line max-len
    static getDerivedStateFromError: GetDerivedStateFromError<ErrorBoundaryProps, ErrorBoundaryState> = (error) => ({ error });

    componentDidCatch(error: Error) {
        this.setState({ error });
    }

    render() {
        const {
            state: { error },
            props: { fallback: Fallback, children },
        } = this;

        return 'error' in this.state ? typeof Fallback === 'function' ? <Fallback error={error} /> : Fallback : children;
    }
}

function ErrorBoundaryError({ error }: { error: unknown }) {
    return (
        <div>
            <p>An unhandled error occurred:</p>
            <blockquote>
                <code>{error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error)}</code>
            </blockquote>
        </div>
    );
}

export { ErrorBoundary, ErrorBoundaryError };
