import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ApolloProvider } from '@apollo/client'
import { ThemeProvider } from 'styled-components'
import { Toaster } from 'react-hot-toast'

import { client } from './lib/apollo'
import { lightTheme } from '@thclone/ui'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <BrowserRouter>
        <ThemeProvider theme={lightTheme}>
          <AuthProvider>
            <App />
            <Toaster position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ApolloProvider>
  </React.StrictMode>,
)