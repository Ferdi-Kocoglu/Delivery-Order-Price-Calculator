import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: React.ReactNode;
  errorMessage?: string;
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h2>{this.props.errorMessage || 'Something went wrong.'}</h2>
          {process.env.NODE_ENV === 'development' && (
            <pre>{this.state.error?.message}</pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}