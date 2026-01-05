
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global error handler to help debug deployment issues on GitHub Pages
window.onerror = function(msg, url, lineNo, columnNo, error) {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 40px; font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <h1 style="color: #e11d48; font-size: 24px; margin-bottom: 16px;">Initialization Error</h1>
        <p style="color: #475569; margin-bottom: 24px;">The application failed to start. This usually happens on GitHub Pages if the browser cannot process <code>.tsx</code> files directly or if an environment variable is missing.</p>
        <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 13px; overflow-x: auto; border: 1px solid #e2e8f0;">
          <strong>Error:</strong> ${msg}<br/>
          <strong>File:</strong> ${url}<br/>
          <strong>Line:</strong> ${lineNo}
        </div>
        <p style="margin-top: 24px; font-size: 14px; color: #64748b;">
          <em>Note: GitHub Pages requires a <strong>Build Step</strong> (like running <code>npm run build</code>) to convert TypeScript (.tsx) into JavaScript (.js) before it will work.</em>
        </p>
      </div>
    `;
  }
  return false;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
