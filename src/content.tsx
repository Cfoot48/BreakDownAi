import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './content.css';

interface VideoInfo {
  title: string | null;
  description: string | null;
  channel: string | null;
  url: string;
}

interface AnalysisButtonProps {
  onAnalyze: (videoInfo: VideoInfo) => void;
}

const AnalysisButton: React.FC<AnalysisButtonProps> = ({ onAnalyze }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const extractVideoInfo = (): VideoInfo => {
    const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent?.trim() || null;
    const videoDescription = document.querySelector('#description-inline-expander')?.textContent?.trim() || null;
    const channelName = document.querySelector('#channel-name a')?.textContent?.trim() || null;
    
    return {
      title: videoTitle,
      description: videoDescription,
      channel: channelName,
      url: window.location.href
    };
  };

  const handleAnalyze = async () => {
    const videoInfo = extractVideoInfo();
    console.log('Video info extracted:', videoInfo);
    
    setIsAnalyzing(true);
    
    // Send message to background script
    chrome.runtime.sendMessage({
      type: 'ANALYZE_VIDEO',
      data: videoInfo
    }, (response) => {
      setIsAnalyzing(false);
      if (response && response.success) {
        console.log('Analysis request sent successfully');
      } else {
        console.error('Failed to send analysis request');
      }
    });
  };

  return (
    <button 
      onClick={handleAnalyze}
      disabled={isAnalyzing}
      className="breakdown-ai-btn"
    >
      {isAnalyzing ? (
        <>
          <span className="breakdown-ai-spinner"></span>
          Analyzing...
        </>
      ) : (
        '🔍 Analyze with AI'
      )}
    </button>
  );
};

// Function to inject the React component into YouTube page
function injectAnalysisButton() {
  // Check if button already exists
  if (document.getElementById('breakdown-ai-root')) {
    return;
  }
  
  // Create container for React component
  const container = document.createElement('div');
  container.id = 'breakdown-ai-root';
  container.style.cssText = `
    position: relative;
    z-index: 1000;
  `;
  
  // Add container to YouTube page
  const targetContainer = document.querySelector('#primary-inner');
  if (targetContainer) {
    targetContainer.appendChild(container);
    
    // Render React component
    const root = ReactDOM.createRoot(container);
    root.render(<AnalysisButton onAnalyze={() => {}} />);
  }
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectAnalysisButton);
} else {
  injectAnalysisButton();
}

// Watch for navigation changes (YouTube is a SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(injectAnalysisButton, 1000); // Wait for page to load
  }
}).observe(document, { subtree: true, childList: true });

console.log('BreakDown AI React content script loaded'); 