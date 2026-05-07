import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import ReactGA from "react-ga4";

const root = createRoot(document.getElementById("root"));
ReactGA.initialize("G-WWE5E8N7QH");
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

const SendAnalytics = () => {
  ReactGA.send({
    hitType: "pageview",
    page: window.location.pathname,
  });
};

reportWebVitals(SendAnalytics);
