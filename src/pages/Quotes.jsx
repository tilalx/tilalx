import { useState, useEffect, useCallback } from "react";
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
} from "@mui/material";

const parseTags = (raw) => {
  if (!raw) return [];
  return raw.replace(/^\[|\]$/g, "").split(",").map((t) => t.trim()).filter(Boolean);
};

const stripQuotes = (text) =>
  text ? text.replace(/^["'"']+|["'"']+$/g, "").trim() : "";

const Quotes = () => {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(true);
  const theme = useTheme();
  const dark = theme.palette.mode === "dark";

  const fetchNewQuote = useCallback(async () => {
    setVisible(false);
    await new Promise((r) => setTimeout(r, 220));
    setLoading(true);
    try {
      const response = await fetch("https://quotes.aelx.de/random?count=1");
      const data = await response.json();
      if (data && data.length > 0) {
        setQuote({
          content: stripQuotes(data[0].content),
          author: data[0].author,
          tags: parseTags(data[0].tags),
        });
      }
    } catch {
      setQuote({ content: "Failed to load quote.", author: "", tags: [] });
    } finally {
      setLoading(false);
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    fetchNewQuote();
  }, []);

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "calc(100vh - 56px)", py: { xs: 6, md: 10 } }}>
      <Container maxWidth="sm">

        {/* Header */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 600, letterSpacing: "0.1em", fontSize: "0.75rem" }}>
            Inspiration
          </Typography>
          <Typography variant="h4" sx={{ mt: 0.5, color: "text.primary" }}>
            Quote of the moment
          </Typography>
        </Box>

        {/* Quote block */}
        <Fade in={visible} timeout={350}>
          <Box>
            {/* Large decorative quotemark */}
            <Typography
              aria-hidden
              sx={{
                fontSize: "6rem",
                lineHeight: 0.6,
                mb: 3,
                color: "primary.main",
                fontFamily: "Georgia, serif",
                opacity: 0.5,
                userSelect: "none",
              }}
            >
              "
            </Typography>

            {loading ? (
              <Box sx={{ mb: 4 }}>
                <Skeleton sx={{ bgcolor: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", mb: 1, fontSize: "1.6rem" }} />
                <Skeleton sx={{ bgcolor: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", mb: 1, fontSize: "1.6rem" }} />
                <Skeleton width="65%" sx={{ bgcolor: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", fontSize: "1.6rem" }} />
              </Box>
            ) : (
              <Typography
                variant="h5"
                component="blockquote"
                sx={{
                  m: 0,
                  mb: 4,
                  fontStyle: "italic",
                  fontWeight: 400,
                  color: "text.primary",
                  lineHeight: 1.75,
                  fontSize: { xs: "1.15rem", md: "1.4rem" },
                  letterSpacing: "-0.2px",
                }}
              >
                {quote?.content}
              </Typography>
            )}

            <Divider sx={{ borderColor: "divider", mb: 3 }} />

            {/* Author & tags */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
              <Box>
                {loading ? (
                  <Skeleton width={150} sx={{ bgcolor: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }} />
                ) : (
                  <Typography variant="subtitle2" sx={{ color: "text.secondary", fontWeight: 600, letterSpacing: "0.02em" }}>
                    — {quote?.author || "Unknown"}
                  </Typography>
                )}

                {!loading && quote?.tags?.length > 0 && (
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                    {quote.tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: "0.7rem",
                          fontWeight: 500,
                          bgcolor: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                          color: "text.secondary",
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
                  borderColor: "divider",
                  color: "text.secondary",
                  borderRadius: 2,
                  px: 2.5,
                  "&:hover": { borderColor: "primary.main", color: "primary.main", bgcolor: "transparent" },
                  transition: "all 0.15s ease",
                }}
              >
                Next quote
              </Button>
            </Stack>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
};

export default Quotes;
