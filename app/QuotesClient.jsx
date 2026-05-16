'use client'

import { useState, useCallback } from 'react'
import {
  Box,
  Container,
  Typography,
  Button,
  Skeleton,
  Fade,
  Chip,
  Stack,
  Divider,
  useTheme,
  useColorScheme,
} from '@mui/material'

const parseTags = (raw) => {
  if (!raw) return []
  return raw
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

const stripQuotes = (text) =>
  text ? text.replace(/^["'"']+|["'"']+$/g, '').trim() : ''

async function fetchRandomQuote() {
  const res = await fetch('https://quotes.aelx.de/random?count=1', {
    cache: 'no-store',
  })
  const data = await res.json()
  if (data?.length > 0) {
    return {
      content: stripQuotes(data[0].content),
      author: data[0].author,
      tags: parseTags(data[0].tags),
    }
  }
  return null
}

export default function QuotesClient({ initialQuote }) {
  const [quote, setQuote] = useState(initialQuote)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(true)
  const theme = useTheme()
  const { mode, systemMode } = useColorScheme()
  const dark = mode === 'dark' || (mode === 'system' && systemMode === 'dark')

  const fetchNewQuote = useCallback(async () => {
    setVisible(false)
    await new Promise((r) => setTimeout(r, 220))
    setLoading(true)
    try {
      const next = await fetchRandomQuote()
      if (next) setQuote(next)
    } catch {
      setQuote({ content: 'Failed to load quote.', author: '', tags: [] })
    } finally {
      setLoading(false)
      setVisible(true)
    }
  }, [])

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        minHeight: 'calc(100vh - 56px)',
        py: { xs: 6, md: 10 },
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="overline"
            sx={{
              color: 'primary.main',
              fontWeight: 600,
              letterSpacing: '0.1em',
              fontSize: '0.75rem',
            }}
          >
            Inspiration
          </Typography>
          <Typography variant="h4" sx={{ mt: 0.5, color: 'text.primary' }}>
            Quote of the moment
          </Typography>
        </Box>

        <Fade in={visible} timeout={350}>
          <Box>
            <Typography
              aria-hidden
              sx={{
                fontSize: '6rem',
                lineHeight: 0.6,
                mb: 3,
                color: 'primary.main',
                fontFamily: 'Georgia, serif',
                opacity: 0.5,
                userSelect: 'none',
              }}
            >
              "
            </Typography>

            {loading ? (
              <Box sx={{ mb: 4 }}>
                <Skeleton
                  sx={{
                    bgcolor: dark
                      ? 'rgba(255,255,255,0.07)'
                      : 'rgba(0,0,0,0.07)',
                    mb: 1,
                    fontSize: '1.6rem',
                  }}
                />
                <Skeleton
                  sx={{
                    bgcolor: dark
                      ? 'rgba(255,255,255,0.07)'
                      : 'rgba(0,0,0,0.07)',
                    mb: 1,
                    fontSize: '1.6rem',
                  }}
                />
                <Skeleton
                  width="65%"
                  sx={{
                    bgcolor: dark
                      ? 'rgba(255,255,255,0.07)'
                      : 'rgba(0,0,0,0.07)',
                    fontSize: '1.6rem',
                  }}
                />
              </Box>
            ) : (
              <Typography
                variant="h5"
                component="blockquote"
                sx={{
                  m: 0,
                  mb: 4,
                  fontStyle: 'italic',
                  fontWeight: 400,
                  color: 'text.primary',
                  lineHeight: 1.75,
                  fontSize: { xs: '1.15rem', md: '1.4rem' },
                  letterSpacing: '-0.2px',
                }}
              >
                {quote?.content}
              </Typography>
            )}

            <Divider sx={{ borderColor: 'divider', mb: 3 }} />

            <Stack
              direction="row"
              sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}
            >
              <Box>
                {loading ? (
                  <Skeleton
                    width={150}
                    sx={{
                      bgcolor: dark
                        ? 'rgba(255,255,255,0.07)'
                        : 'rgba(0,0,0,0.07)',
                    }}
                  />
                ) : (
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                    }}
                  >
                    — {quote?.author || 'Unknown'}
                  </Typography>
                )}

                {!loading && quote?.tags?.length > 0 && (
                  <Stack
                    direction="row"
                    sx={{ gap: 0.75, flexWrap: 'wrap', mt: 1 }}
                  >
                    {quote.tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          bgcolor: dark
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(0,0,0,0.05)',
                          color: 'text.secondary',
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 1,
                        }}
                      />
                    ))}
                  </Stack>
                )}
              </Box>

              <Button
                variant="outlined"
                onClick={fetchNewQuote}
                disabled={loading}
                sx={{
                  fontWeight: 600,
                  borderColor: 'divider',
                  color: 'text.secondary',
                  borderRadius: 2,
                  px: 2.5,
                  '&:hover': {
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    bgcolor: 'transparent',
                  },
                  transition: 'all 0.15s ease',
                }}
              >
                Next quote
              </Button>
            </Stack>
          </Box>
        </Fade>
      </Container>
    </Box>
  )
}
