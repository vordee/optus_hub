import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || "Falha inesperada na interface.",
    };
  }

  componentDidCatch(error: Error) {
    console.error("Optus Hub UI error:", error);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="screen-center">
        <section className="card crash-card">
          <div className="section-heading">
            <span className="eyebrow">Interface</span>
            <h2>Falha ao renderizar a tela</h2>
            <p className="section-copy">
              A aplicação interceptou um erro de interface e evitou a tela branca total.
            </p>
          </div>
          <div className="inline-error">{this.state.message}</div>
          <div className="form-actions">
            <button className="primary-button" onClick={this.handleReload} type="button">
              Recarregar
            </button>
          </div>
        </section>
      </div>
    );
  }
}
