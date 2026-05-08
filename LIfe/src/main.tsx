import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { getRouter } from './router';
import './styles.css';
import { initTheme } from './lib/theme';
import { rescheduleFromStorage } from './lib/notifications';

// Initialize theme
initTheme();

// Re-schedule any persisted reminders on app startup
rescheduleFromStorage();

const router = getRouter();

const rootElement = document.getElementById('app')!;
if (!rootElement.innerHTML) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}
