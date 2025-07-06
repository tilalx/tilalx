// src/reportWebVitals.js
import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';  // :contentReference[oaicite:0]{index=0}

const reportWebVitals = (onPerfEntry) => {
  if (typeof onPerfEntry !== 'function') return;

  onCLS(onPerfEntry);
  onINP(onPerfEntry);
  onFCP(onPerfEntry);
  onLCP(onPerfEntry);
  onTTFB(onPerfEntry);
};

export default reportWebVitals;