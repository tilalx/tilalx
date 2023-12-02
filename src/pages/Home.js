import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import axios from "axios";
import { detectBot } from "../components/botdService";
import "../Home.scss";

const MarkdownPage = () => {
  const [markdown, setMarkdown] = useState('');

  useEffect(() => {
    document.title = "Home - PersonalPage";

    const fetchData = async () => {
      const botResult = await detectBot();
      
      if (botResult && (botResult.bot.automationTool || botResult.bot.browserSpoofing)) {
        console.log('Bot detected, content not loaded');
        return;
      }

      axios.get("https://raw.githubusercontent.com/tilalx/tilalx/main/ReadMe.md")
        .then((response) => setMarkdown(response.data))
        .catch((error) => console.error("Error fetching Markdown content:", error));
    };

    fetchData();
  }, []);

  return (
    <div className="markdown-info sub-container">
      <ReactMarkdown>{markdown}</ReactMarkdown>
      <div>
        <div className="stars"></div>
        <div className="stars2"></div>
        <div className="stars3"></div>
      </div>
    </div>
  );
};

export default MarkdownPage;
