import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { SvgSprite } from './components/common/SvgSprite';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SvgSprite />
    <App />
  </React.StrictMode>
);
