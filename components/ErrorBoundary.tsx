"use client"

import { Component } from "react"

type ErrorBoundaryProps = { children: React.ReactNode }
type ErrorBoundaryState = { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
          <div className="rounded-2xl bg-white p-8 shadow-lg text-center max-w-sm space-y-4">
            <div className="text-5xl">😕</div>
            <p className="text-lg text-muted-foreground">
              Kuch gadbad ho gayi. Page refresh karo.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold text-base hover:bg-blue-700 transition min-h-[48px]"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
