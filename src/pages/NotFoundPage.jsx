import React from 'react';
import { Typography, Button, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
    const navigate = useNavigate();

    const goHome = () => {
        navigate('/');
    };

    return (
        <Container component="main" maxWidth="xs" style={{ marginTop: '100px', textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>
                404 - Page Not Found
            </Typography>
            <Typography variant="body1" gutterBottom>
                Oops! The page you are looking for does not exist.
            </Typography>
            <Button variant="contained" color="primary" onClick={goHome}>
                Go to Home
            </Button>
        </Container>
    );
};

export default NotFoundPage;
