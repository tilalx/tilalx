'use client'

import { useState } from 'react'
import createCache from '@emotion/cache'
import { useServerInsertedHTML } from 'next/navigation'
import { CacheProvider } from '@emotion/react'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'

const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'data-mui-color-scheme' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#6366f1' },
        background: { default: '#fafafa', paper: '#ffffff' },
        text: { primary: '#09090b', secondary: '#71717a' },
        divider: '#e4e4e7',
      },
    },
    dark: {
      palette: {
        primary: { main: '#6366f1' },
        background: { default: '#09090b', paper: '#18181b' },
        text: { primary: '#fafafa', secondary: '#a1a1aa' },
        divider: '#27272a',
      },
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-1.5px' },
    h2: { fontWeight: 700, letterSpacing: '-1px' },
    h3: { fontWeight: 700, letterSpacing: '-0.5px' },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontFamily: '"Inter", sans-serif' },
      },
    },
  },
})

export function Providers({ children }) {
  const [{ cache, flush }] = useState(() => {
    const cache = createCache({ key: 'css', prepend: true })
    cache.compat = true
    const prevInsert = cache.insert.bind(cache)
    let inserted = []
    cache.insert = (...args) => {
      const serialized = args[1]
      if (serialized && cache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name)
      }
      return prevInsert(...args)
    }
    const flush = () => {
      const prev = inserted
      inserted = []
      return prev
    }
    return { cache, flush }
  })

  useServerInsertedHTML(() => {
    const names = flush()
    if (!names.length) return null
    const styles = names.map((n) => cache.inserted[n]).join('')
    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    )
  })

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  )
}
