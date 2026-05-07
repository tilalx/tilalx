import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Box,
  Button,
  Typography,
  useMediaQuery,
  Container,
} from '@mui/material';
import Home from './pages/Home';
import Meme from './pages/Meme';
import Quotes from './pages/Quotes';
import Track from './components/Track';

const NAV = ['Home', 'Memes', 'Quotes'];
const HASHES = ['#home', '#memes', '#quotes'];

const hashToTab = (hash) => {
  const idx = HASHES.indexOf(hash.toLowerCase());
  return idx >= 0 ? idx : 0;
};

function App() {
  const [tab, setTab] = useState(() => hashToTab(window.location.hash));

  // Keep hash in sync when tab changes
  const navigateTo = useCallback((i) => {
    window.location.hash = HASHES[i];
    setTab(i);
  }, []);

  // React to browser back/forward and direct hash links
  useEffect(() => {
    const onHashChange = () => setTab(hashToTab(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDark ? 'dark' : 'light',
          primary: { main: '#6366f1' },
          background: {
            default: prefersDark ? '#09090b' : '#fafafa',
            paper: prefersDark ? '#18181b' : '#ffffff',
          },
          text: {
            primary: prefersDark ? '#fafafa' : '#09090b',
            secondary: prefersDark ? '#a1a1aa' : '#71717a',
          },
          divider: prefersDark ? '#27272a' : '#e4e4e7',
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
      }),
    [prefersDark]
  );

  const border = prefersDark ? '#27272a' : '#e4e4e7';
  const navbarBg = prefersDark ? 'rgba(9,9,11,0.88)' : 'rgba(250,250,250,0.88)';

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Track />

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
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0 }}
          >
            <Typography
              onClick={() => navigateTo(0)}
              sx={{
                fontWeight: 800,
                fontSize: '1.05rem',
                letterSpacing: '-0.4px',
                cursor: 'pointer',
                color: 'text.primary',
                userSelect: 'none',
              }}
            >
              tilalx
            </Typography>

            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {NAV.map((label, i) => (
                <Button
                  key={label}
                  onClick={() => navigateTo(i)}
                  disableRipple
                  sx={{
                    px: 2,
                    py: 0.75,
                    borderRadius: 2,
                    fontSize: '0.875rem',
                    fontWeight: tab === i ? 600 : 400,
                    color: tab === i ? 'text.primary' : 'text.secondary',
                    background: tab === i
                      ? (prefersDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)')
                      : 'transparent',
                    '&:hover': {
                      background: prefersDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      color: 'text.primary',
                    },
                    transition: 'all 0.15s ease',
                    minWidth: 'auto',
                  }}
                >
                  {label}
                </Button>
              ))}
            </Box>
          </Container>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ bgcolor: 'background.default', minHeight: 'calc(100vh - 56px)' }}>
        <div hidden={tab !== 0}><Home /></div>
        <div hidden={tab !== 1}><Meme /></div>
        <div hidden={tab !== 2}><Quotes /></div>
      </Box>
    </ThemeProvider>
  );
}

export default App;
