import React, { useState, useEffect } from 'react';

const AirtableForm = () => {
  const [src, setSrc] = useState('https://airtable.com');

  useEffect(() => {
    const getNextWednesday = () => {
      const today = new Date();
      const nextWednesday = new Date();
      nextWednesday.setDate(today.getDate() + ((3 - today.getDay() + 7) % 7 || 7));
      return nextWednesday.toISOString().split('T')[0];
    };

    const parseUrlForm = () => {
        const pathArray = window.location.pathname.split('/');
        
        // extract 'firstId' and 'secondId' from the path like '/emb/firstId/secondId'
        const firstId = pathArray[2];
        const secondId = pathArray[3];
        return { firstId, secondId };
      };

      const parseUrlParams = () => {
        const queryParams = new URLSearchParams(window.location.search);
        let paramsString = "";
  
        for (const [key, value] of queryParams.entries()) {
          paramsString += `&${key}=${encodeURIComponent(value)}`;
        }
  
        return paramsString;
      };
  
      const { firstId, secondId } = parseUrlForm();
      const prefillDate = getNextWednesday();
      const queryParamsString = parseUrlParams();

  
      const formUrl = `https://airtable.com/embed/${firstId}/${secondId}?prefill_Datum=${prefillDate}${queryParamsString}&backgroundColor=pink`;
  
      setSrc(formUrl);
    }, []);

  // Inline styles to make the iframe take the full page
  const fullPageStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: '100%',
    height: '100%',
    border: 'none',
    background: 'transparent',
  };

  // Apply a style reset to the body and html tags to ensure the iframe can be full page
  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.height = '100%';
    document.documentElement.style.height = '100%';

    // Cleanup the styles when the component unmounts
    return () => {
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.height = '';
      document.documentElement.style.height = '';
    };
  }, []);

  return (
    <iframe
      id="Airtable"
      title='Airtable'
      className="airtable-embed airtable-dynamic-height"
      src={src}
      onmousewheel=""
      style={fullPageStyle}>
    </iframe>
  );
};

export default AirtableForm;
