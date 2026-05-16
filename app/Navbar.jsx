'use client'

import { useState, useEffect } from 'react'
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  Typography,
  Container,
  useColorScheme,
} from '@mui/material'

const NAV = [
  { label: 'Home', hash: '#home' },
  { label: 'Memes', hash: '#memes' },
  { label: 'Quotes', hash: '#quotes' },
]

function useHash() {
  const [hash, setHash] = useState('#home')
  useEffect(() => {
    setHash(window.location.hash || '#home')
    const handler = () => setHash(window.location.hash || '#home')
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])
  return hash
}

export default function Navbar() {
  const hash = useHash()
  const { mode, systemMode } = useColorScheme()
  const isDark = mode === 'dark' || (mode === 'system' && systemMode === 'dark')

  const border = isDark ? '#27272a' : '#e4e4e7'
  const navbarBg = isDark ? 'rgba(9,9,11,0.88)' : 'rgba(250,250,250,0.88)'

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: navbarBg,
        backdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${border}`,
      }}
    >
      <Toolbar disableGutters sx={{ minHeight: '56px !important' }}>
        <Container
          maxWidth="lg"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 0,
          }}
        >
          <Typography
            component="a"
            href="#home"
            sx={{
              fontWeight: 800,
              fontSize: '1.05rem',
              letterSpacing: '-0.4px',
              cursor: 'pointer',
              color: 'text.primary',
              userSelect: 'none',
              textDecoration: 'none',
            }}
          >
            tilalx
          </Typography>

          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {NAV.map(({ label, hash: navHash }) => {
              const active = hash === navHash
              return (
                <Button
                  key={navHash}
                  component="a"
                  href={navHash}
                  disableRipple
                  sx={{
                    px: 2,
                    py: 0.75,
                    borderRadius: 2,
                    fontSize: '0.875rem',
                    fontWeight: active ? 600 : 400,
                    color: active ? 'text.primary' : 'text.secondary',
                    background: active
                      ? isDark
                        ? 'rgba(255,255,255,0.07)'
                        : 'rgba(0,0,0,0.06)'
                      : 'transparent',
                    '&:hover': {
                      background: isDark
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(0,0,0,0.04)',
                      color: 'text.primary',
                    },
                    transition: 'all 0.15s ease',
                    minWidth: 'auto',
                    textDecoration: 'none',
                  }}
                >
                  {label}
                </Button>
              )
            })}
          </Box>
        </Container>
      </Toolbar>
    </AppBar>
  )
}
