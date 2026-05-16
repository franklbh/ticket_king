import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './components/ToastProvider.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const appFontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

const theme = createTheme({
  typography: {
    fontFamily: appFontFamily,
    button: {
      fontFamily: appFontFamily,
      textTransform: 'none',
      letterSpacing: 0,
    },
    allVariants: {
      letterSpacing: 0,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontWeight: 700,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          fontFamily: appFontFamily,
          textTransform: 'none',
          letterSpacing: 0,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontFamily: appFontFamily,
        },
      },
    },
  },
})

createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider theme={theme}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </QueryClientProvider>,
)
