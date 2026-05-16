'use client'

import ReactMarkdown from 'react-markdown'
import {
  Box,
  Container,
  Typography,
  Skeleton,
  Divider,
  useTheme,
  useColorScheme,
} from '@mui/material'

export default function HomeContent({ markdown }) {
  const theme = useTheme()
  const { mode, systemMode } = useColorScheme()
  const dark = mode === 'dark' || (mode === 'system' && systemMode === 'dark')

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        minHeight: 'calc(100vh - 56px)',
        py: { xs: 6, md: 10 },
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ mb: { xs: 6, md: 10 } }}>
          <Typography
            variant="overline"
            sx={{
              color: 'primary.main',
              fontWeight: 600,
              letterSpacing: '0.1em',
              fontSize: '0.75rem',
            }}
          >
            Personal Page
          </Typography>
          <Typography
            variant="h2"
            sx={{
              mt: 1,
              mb: 2,
              fontSize: { xs: '2rem', md: '3rem' },
              color: 'text.primary',
              lineHeight: 1.15,
            }}
          >
            tilalx
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: 'text.secondary', maxWidth: 520, lineHeight: 1.7 }}
          >
            Developer · Open source enthusiast · Building things on the internet.
          </Typography>
        </Box>

        <Divider sx={{ mb: { xs: 6, md: 8 }, borderColor: 'divider' }} />

        {!markdown ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Skeleton
              variant="rectangular"
              height={320}
              sx={{
                borderRadius: 2,
                bgcolor: dark
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(0,0,0,0.06)',
              }}
            />
          </Box>
        ) : (
          <Box
            sx={{
              color: 'text.primary',
              '& img': {
                maxWidth: '100%',
                height: 'auto',
                display: 'block',
                borderRadius: 2,
                mx: 'auto',
              },
              '& h1,& h2,& h3,& h4': {
                color: 'text.primary',
                mt: 4,
                mb: 1.5,
              },
              '& h1': {
                fontSize: '1.75rem',
                borderBottom: `1px solid ${theme.palette.divider}`,
                pb: 1,
              },
              '& h2': {
                fontSize: '1.35rem',
                borderBottom: `1px solid ${theme.palette.divider}`,
                pb: 1,
              },
              '& p': { color: 'text.secondary', lineHeight: 1.8, mb: 2 },
              '& a': {
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              },
              '& code': {
                fontFamily: 'monospace',
                fontSize: '0.875em',
                background: dark
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(0,0,0,0.06)',
                borderRadius: 1,
                px: 0.75,
                py: 0.25,
              },
              '& pre': {
                background: dark ? '#18181b' : '#f4f4f5',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                p: 3,
                overflowX: 'auto',
                '& code': { background: 'none', p: 0 },
              },
              '& ul, & ol': {
                color: 'text.secondary',
                lineHeight: 1.8,
                pl: 3,
              },
              '& li': { mb: 0.5 },
              '& blockquote': {
                borderLeft: `3px solid ${theme.palette.primary.main}`,
                ml: 0,
                pl: 3,
                color: 'text.secondary',
                fontStyle: 'italic',
              },
              '& table': { width: '100%', borderCollapse: 'collapse', mb: 2 },
              '& th, & td': {
                border: `1px solid ${theme.palette.divider}`,
                p: 1.5,
                textAlign: 'left',
                color: 'text.secondary',
              },
              '& th': {
                background: dark
                  ? 'rgba(255,255,255,0.04)'
                  : 'rgba(0,0,0,0.03)',
                color: 'text.primary',
                fontWeight: 600,
              },
            }}
          >
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </Box>
        )}

        <Divider
          sx={{ mt: { xs: 8, md: 12 }, mb: 4, borderColor: 'divider' }}
        />
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            display: 'block',
            textAlign: 'center',
            pb: 4,
          }}
        >
          © {new Date().getFullYear()} tilalx
        </Typography>
      </Container>
    </Box>
  )
}
