import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ApolloProvider } from '@apollo/client'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'

import { client } from './lib/apollo'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { ThemedToaster } from './components/ThemedToaster'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <BrowserRouter>
        <MantineProvider>
          <ThemeProvider>
            <AuthProvider>
              <App />
              <ThemedToaster />
            </AuthProvider>
          </ThemeProvider>
        </MantineProvider>
      </BrowserRouter>
    </ApolloProvider>
  </React.StrictMode>,
)