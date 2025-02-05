import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardActions, Typography, Button, Box } from '@mui/material';

const Quotes = () => {
  const [quote, setQuote] = useState({ content: 'loading...', author: '' });

  const fetchNewQuote = async () => {
    try {
      const response = await fetch('https://aelx.de/random?count=1');
      const data = await response.json();
      if (data && data.length > 0) {
        setQuote({ content: data[0].content, author: data[0].author });
      }
    } catch (error) {
      console.error('Error fetching quote:', error);
      setQuote({ content: 'Failed to load quote.', author: '' });
    }
  };

  useEffect(() => {
    document.title = "Quotes - PersonalPage";
    fetchNewQuote();
  }, []);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Card sx={{ minWidth: 275 }}>
        <CardContent>
          <Typography variant="h5" component="div">
            {quote.content}
          </Typography>
          <Typography sx={{ mb: 1.5 }} color="text.secondary">
            <cite title="Source Title">{quote.author}</cite>
          </Typography>
        </CardContent>
        <CardActions sx={{ justifyContent: 'center' }}>
          <Button size="small" onClick={fetchNewQuote} style={{ backgroundColor: '#1976d2', color: 'white' }}>New Quote</Button>
        </CardActions>
      </Card>
    </Box>
  );  
};

export default Quotes;
