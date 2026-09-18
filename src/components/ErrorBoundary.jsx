// ErrorBoundary.jsx — the last line of defence.
//
// Every algorithm here is pure and tested, but a browser quirk or an input
// nobody anticipated can still throw during render. Without a boundary, React
// unmounts the whole tree and the user gets a blank white page — which, during
// a live demo or a viva, is the worst possible failure mode because there is
// nothing on screen to recover from or even to describe.
//
// This catches it, keeps the page, says what happened, and offers two ways
// back: reset the view, or clear the saved session in case stored state is the
// cause. React error boundaries must be class components; there is no hook
// equivalent, which is the only reason this file is not a function.

import { Component } from 'react';
import { clearState } from '../storage.js';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Kept for the browser console so a developer can see the component stack.
    // Not sent anywhere — this application has no backend and collects nothing.
    console.error('Normalization Lab — render error:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="app">
        <main className="panel" style={{ gridColumn: '1 / -1', maxWidth: 720, padding: '60px 22px' }}>
          <div className="card">
            <h2>Something went wrong while drawing this page</h2>
            <p className="sub">
              The computation itself is unaffected — this is a display fault. Your relation and
              dependencies are still saved in this browser.
            </p>

            <div className="msg error" style={{ marginTop: 4 }}>
              <b>{this.state.error?.name || 'Error'}</b>
              <div style={{ marginTop: 4, fontFamily: 'var(--mono)', fontSize: 12.5 }}>
                {String(this.state.error?.message || this.state.error)}
              </div>
            </div>

            <h3>What to try</h3>
            <div className="btn-row">
              <button className="btn" onClick={() => this.setState({ error: null })}>
                Try again
              </button>
              <button className="btn ghost" onClick={() => window.location.reload()}>
                Reload the page
              </button>
              <button
                className="btn ghost"
                onClick={() => { clearState(); window.location.reload(); }}
              >
                Clear saved session and reload
              </button>
            </div>

            <p className="muted" style={{ marginTop: 20 }}>
              If it recurs on the same relation, that relation is the reproduction case — note it
              down before clearing the session.
            </p>
          </div>
        </main>
      </div>
    );
  }
}
