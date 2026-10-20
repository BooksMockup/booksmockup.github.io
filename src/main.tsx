import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

(window as unknown as Record<string, boolean>).__BOOKS_MOCKUP_MOUNTED__ = true;

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<App />);
}

