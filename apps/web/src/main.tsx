import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './theme.css';
import { initTheme } from './theme';
import { initI18n } from './i18n';

initTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// UI render bo'lgach global til almashtirishni ishga tushiramiz
setTimeout(() => initI18n(), 300);
