import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { ThemedMantineProvider } from './components/ThemedMantineProvider';
import '@mantine/core/styles.css';

import { client } from './lib/apollo';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { ThemedToaster } from './components/ThemedToaster';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <BrowserRouter>
        <ThemeProvider>
          <ThemedMantineProvider>
            <AuthProvider>
              <App />
              <ThemedToaster />
            </AuthProvider>
          </ThemedMantineProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ApolloProvider>
  </React.StrictMode>,
);
