import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import './theme.css';
import { initTheme } from './theme';
import { initI18n } from './i18n';
import { initNative } from './native';

initTheme();
initNative(); // mobil ilovada status bar/splash/orqaga tugmasi

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// UI render bo'lgach global til almashtirishni ishga tushiramiz
setTimeout(() => initI18n(), 300);
