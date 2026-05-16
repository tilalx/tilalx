'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Skeleton,
  Divider,
  useTheme,
  useColorScheme,
} from '@mui/material'

const preloadImage = (url) =>
  new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => resolve(url)
    img.onerror = () => resolve(null)
    img.src = url
  })

export default function MemeClient({ initialUrl }) {
  const [memeUrl, setMemeUrl] = useState(initialUrl || '')
  const [initialLoad, setInitialLoad] = useState(!initialUrl)
  const [intervalSeconds, setIntervalSeconds] = useState(10)
  const [autoRunning, setAutoRunning] = useState(false)
  const intervalRef = useRef(null)
  const fetchAndSwapRef = useRef(null)
  const theme = useTheme()
  const { mode, systemMode } = useColorScheme()
  const dark = mode === 'dark' || (mode === 'system' && systemMode === 'dark')

  const fetchAndSwap = useCallback(async (silent = false) => {
    if (!silent) setInitialLoad(true)
    try {
      const res = await fetch('https://meme-api.aelx.de/gimme')
      const data = await res.json()
      const readyUrl = await preloadImage(data.url)
      setMemeUrl(readyUrl || '')
    } catch {
      setMemeUrl('')
    } finally {
      if (!silent) setInitialLoad(false)
    }
  }, [])

  fetchAndSwapRef.current = fetchAndSwap

  const restartInterval = useCallback(
    (secs) => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(
        () => fetchAndSwapRef.current(true),
        Math.max(1, secs) * 1000
      )
    },
    []
  )

  const startAutoLoad = useCallback(() => {
    fetchAndSwap(memeUrl !== '')
    restartInterval(intervalSeconds)
    setAutoRunning(true)
  }, [fetchAndSwap, restartInterval, intervalSeconds, memeUrl])

  const stopAutoLoad = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setAutoRunning(false)
  }, [])

  useEffect(() => {
    if (autoRunning) restartInterval(intervalSeconds)
  }, [intervalSeconds, autoRunning, restartInterval])

  useEffect(() => {
    if (!initialUrl) fetchAndSwap(false)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchAndSwap, initialUrl])

  const stepBtn = {
    minWidth: 32,
    width: 32,
    height: 32,
    p: 0,
    fontWeight: 700,
    fontSize: '1rem',
    lineHeight: 1,
    border: `1px solid ${theme.palette.divider}`,
    color: 'text.secondary',
    '&:hover': {
      color: 'text.primary',
      borderColor: 'text.secondary',
      bgcolor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    },
  }

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        minHeight: 'calc(100vh - 56px)',
        py: { xs: 3, md: 5 },
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="overline"
            sx={{
              color: 'primary.main',
              fontWeight: 600,
              letterSpacing: '0.1em',
              fontSize: '0.75rem',
            }}
          >
            Random
          </Typography>
          <Typography variant="h4" sx={{ mt: 0.5, color: 'text.primary' }}>
            Meme of the moment
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 3,
            overflow: 'hidden',
            bgcolor: 'background.paper',
          }}
        >
          <Box
            sx={{
              height: 'calc(100vh - 280px)',
              minHeight: 240,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: dark ? '#0a0a0a' : '#f4f4f5',
            }}
          >
            {initialLoad ? (
              <Skeleton
                variant="rectangular"
                sx={{
                  width: '100%',
                  height: '100%',
                  bgcolor: dark
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(0,0,0,0.06)',
                }}
              />
            ) : (
              <Box
                component="img"
                src={memeUrl}
                alt="Random meme"
                onError={() => setMemeUrl('')}
                sx={{
                  display: 'block',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  transition: 'opacity 0.18s ease',
                }}
              />
            )}
          </Box>

          <Divider sx={{ borderColor: 'divider' }} />

          <Box
            sx={{
              px: 3,
              py: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button
                variant={autoRunning ? 'contained' : 'outlined'}
                color={autoRunning ? 'error' : 'inherit'}
                disableElevation
                onClick={autoRunning ? stopAutoLoad : startAutoLoad}
                sx={{
                  minWidth: 40,
                  width: 40,
                  height: 36,
                  p: 0,
                  fontSize: '1rem',
                  lineHeight: 1,
                  border: autoRunning
                    ? undefined
                    : `1px solid ${theme.palette.divider}`,
                  color: autoRunning ? undefined : 'text.secondary',
                  '&:hover': autoRunning
                    ? {}
                    : { borderColor: 'text.secondary', color: 'text.primary' },
                }}
              >
                {autoRunning ? '■' : '▶'}
              </Button>

              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                every
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Button
                  disableElevation
                  onClick={() =>
                    setIntervalSeconds((s) => Math.max(1, s - 1))
                  }
                  sx={stepBtn}
                >
                  ▼
                </Button>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    minWidth: 36,
                    textAlign: 'center',
                    color: 'text.primary',
                    fontVariantNumeric: 'tabular-nums',
                    userSelect: 'none',
                  }}
                >
                  {intervalSeconds}s
                </Typography>
                <Button
                  disableElevation
                  onClick={() => setIntervalSeconds((s) => s + 1)}
                  sx={stepBtn}
                >
                  ▲
                </Button>
              </Box>

              {autoRunning && (
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    bgcolor: '#22c55e',
                    boxShadow: '0 0 0 3px rgba(34,197,94,0.2)',
                    animation: 'livePulse 1.8s ease-in-out infinite',
                    '@keyframes livePulse': {
                      '0%,100%': {
                        boxShadow: '0 0 0 3px rgba(34,197,94,0.2)',
                      },
                      '50%': { boxShadow: '0 0 0 6px rgba(34,197,94,0.05)' },
                    },
                  }}
                />
              )}
            </Box>

            <Button
              variant="contained"
              disableElevation
              onClick={() => fetchAndSwap(false)}
              disabled={initialLoad}
              sx={{
                fontWeight: 600,
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: '#4f46e5' },
                px: 3,
              }}
            >
              Next meme →
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}
