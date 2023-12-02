import { useEffect, useCallback } from "react";

const Track = () => {
  const makeAsyncRequest = useCallback(async () => {
    try {
      const response = await fetch("https://n8n.aelx.de/webhook/ip", {
      });
      const data = await response.json();
      sessionStorage.setItem("track", JSON.stringify(data));
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    makeAsyncRequest();
  }, [makeAsyncRequest]);
};

export default Track;