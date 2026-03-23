import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import "../Home.scss";

const MarkdownPage = () => {
  const [markdown, setMarkdown] = useState('');

  useEffect(() => {
    document.title = "Home - PersonalPage";

    fetch("https://raw.githubusercontent.com/tilalx/tilalx/main/ReadMe.md")
      .then((response) => response.text())
      .then((text) => setMarkdown(text))
      .catch((error) => console.error("Error fetching Markdown content:", error));
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
