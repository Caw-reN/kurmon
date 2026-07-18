import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { StrictMode } from 'react';
import App from './App.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error('EB Caught:', error, errorInfo); }
  render() {
    if (this.state.hasError) return <div style={{background:'red',color:'white',padding:'20px'}}><h1 id='error-title'>Error!</h1><pre>{this.state.error && this.state.error.stack}</pre></div>;
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </StrictMode>,
);
