import React, { useState, useEffect, useCallback } from "react";
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
  width: "80%", // Set a maximum width
  maxHeight: "60vh", // Set a maximum height
  overflow: "hidden", // Hide overflow
  display: "flex",
  justifyContent: "center",
});

const MemeImage = styled("img")({
  maxWidth: "100%",
  maxHeight: "100%",
  display: "block",
  objectFit: "contain", // Ensure the image is scaled correctly
});

const ButtonsContainer = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
  marginBottom: 20, // Add some space at the bottom
});

const IntervalForm = styled("form")({
  display: "flex",
  alignItems: "center",
  gap: 10,
});

const MemePage = () => {
  const [memeUrl, setMemeUrl] = useState("");
  const [intervalId, setIntervalId] = useState(null);
  const [intervalSeconds, setIntervalSeconds] = useState(10);

  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? "dark" : "light",
        },
      }),
    [prefersDarkMode]
  );

  const loadMeme = useCallback(async () => {
    try {
      const res = await fetch("https://meme-api.aelx.de/gimme");
      const data = await res.json();
      setMemeUrl(data.url);
    } catch (error) {
      console.error(error);
      replaceWithPlaceholder();
    }
  }, []);

  const startAutoLoad = useCallback(
    (seconds) => {
      loadMeme();
      const id = setInterval(loadMeme, seconds * 1000);
      setIntervalId(id);
    },
    [loadMeme]
  );

  const stopAutoLoad = useCallback(() => {
    clearInterval(intervalId);
  }, [intervalId]);

  const handleIntervalFormSubmit = useCallback(
    (e) => {
      e.preventDefault();
      startAutoLoad(intervalSeconds);
    },
    [startAutoLoad, intervalSeconds]
  );

  const replaceWithPlaceholder = () => {
    setMemeUrl("images/error.jpg");
  };

  useEffect(() => {
    document.title = "Meme - PersonalPage";
    loadMeme()
  }, [loadMeme]);

  return (
    <ThemeProvider theme={theme}>
      <MemeContainer>
        <MemeImageContainer>
          <MemeImage
            id="meme"
            src={memeUrl}
            alt="Loading..."
            onError={replaceWithPlaceholder}
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
              id="stop-btn"
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
