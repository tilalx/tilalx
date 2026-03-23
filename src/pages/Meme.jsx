import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Button,
  Input,
  createTheme,
  ThemeProvider,
  useMediaQuery,
} from "@mui/material";
import { styled } from "@mui/material/styles";

const MemeContainer = styled("div")(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  alignItems: "center",
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  height: "100vh",
  boxSizing: "border-box",
}));

const MemeImageContainer = styled("div")({
  border: "1px solid #ddd",
  borderRadius: 4,
  padding: 10,
  width: "80%",
  maxHeight: "60vh",
  overflow: "hidden",
  display: "flex",
  justifyContent: "center",
});

const MemeImage = styled("img")({
  maxWidth: "100%",
  maxHeight: "100%",
  display: "block",
  objectFit: "contain",
});

const ButtonsContainer = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
  marginBottom: 20,
});

const IntervalForm = styled("form")({
  display: "flex",
  alignItems: "center",
  gap: 10,
});

const MemePage = () => {
  const [memeUrl, setMemeUrl] = useState("");
  const [intervalSeconds, setIntervalSeconds] = useState(10);
  const intervalRef = useRef(null);

  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const theme = useMemo(
    () =>
      createTheme({
        palette: { mode: prefersDarkMode ? "dark" : "light" },
      }),
    [prefersDarkMode]
  );

  const loadMeme = useCallback(async () => {
    try {
      const res = await fetch("https://meme-api.aelx.de/gimme");
      const data = await res.json();
      setMemeUrl(data.url);
    } catch {
      setMemeUrl("images/error.jpg");
    }
  }, []);

  const startAutoLoad = useCallback(
    (secs) => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      loadMeme();
      intervalRef.current = setInterval(loadMeme, secs * 1000);
    },
    [loadMeme]
  );

  const stopAutoLoad = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handleIntervalFormSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const secs = Math.max(1, Number(intervalSeconds) || 1);
      startAutoLoad(secs);
    },
    [intervalSeconds, startAutoLoad]
  );

  useEffect(() => {
    document.title = "Meme - PersonalPage";
    loadMeme();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loadMeme]);

  return (
    <ThemeProvider theme={theme}>
      <MemeContainer>
        <MemeImageContainer>
          <MemeImage
            src={memeUrl}
            alt="Random Meme"
            onError={() => setMemeUrl("images/error.jpg")}
          />
        </MemeImageContainer>

        <ButtonsContainer>
          <Button variant="contained" color="primary" onClick={loadMeme}>
            Load New Meme
          </Button>

          <IntervalForm onSubmit={handleIntervalFormSubmit}>
            <label htmlFor="interval-input">Auto Load Every:</label>
            <Input
              type="number"
              id="interval-input"
              min="1"
              value={intervalSeconds}
              onChange={(e) => setIntervalSeconds(e.target.value)}
            />
            <span>seconds</span>
            <Button type="submit" variant="contained" color="primary">
              Start Auto Load
            </Button>
            <Button
              type="button"
              variant="contained"
              color="secondary"
              onClick={stopAutoLoad}
            >
              Stop Auto Load
            </Button>
          </IntervalForm>
        </ButtonsContainer>
      </MemeContainer>
    </ThemeProvider>
  );
};

export default MemePage;
