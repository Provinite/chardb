import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ApolloProvider } from '@apollo/client'
import { Toaster, toast } from 'react-hot-toast'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'

import { client } from './lib/apollo'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
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
              <Toaster 
                position="top-center"
                gutter={8}
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '12px 16px 12px 12px',
                    fontSize: '14px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    position: 'relative',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#4aed88',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 5000,
                    iconTheme: {
                      primary: '#ff6b6b',
                      secondary: '#fff',
                    },
                  },
                }}
                children={(t) => (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      gap: '8px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      {t.icon && <span style={{ marginRight: '8px' }}>{t.icon}</span>}
                      {typeof t.message === 'function' ? t.message(t) : t.message}
                    </div>
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '18px',
                        lineHeight: '1',
                        padding: '4px',
                        borderRadius: '4px',
                        opacity: 0.7,
                        transition: 'opacity 0.2s',
                      }}
                      onMouseEnter={(e) => (e.target as HTMLButtonElement).style.opacity = '1'}
                      onMouseLeave={(e) => (e.target as HTMLButtonElement).style.opacity = '0.7'}
                    >
                      ×
                    </button>
                  </div>
                )}
              />
            </AuthProvider>
          </ThemeProvider>
        </MantineProvider>
      </BrowserRouter>
    </ApolloProvider>
  </React.StrictMode>,
)