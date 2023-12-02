import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Meme from './pages/Meme'
import Quotes from './pages/Quotes';
import AirtableRedirect from './pages/redirect_airtable';
import NotFoundPage from './pages/NotFoundPage';
import Track from './components/Track'
import './index.css'
import './App.css';

function App() {
  return (
    <Router>
      <Track/>
      <Routes>
        <Route path="/" element={<Home />}/>
        <Route path="/meme" element={<Meme/>}/>
        <Route path="/quote" element={<Quotes/>}/>
        <Route path="/embed/*" element={<AirtableRedirect/>}/>
        <Route path="*" element={<NotFoundPage/>}/>
      </Routes>
    </Router>
  );
}

export default App;