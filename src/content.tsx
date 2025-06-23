import React, { useState } from 'react';
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

const AnalysisOverlay: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setShowModal(true);
    setIsAnalyzing(true);
    setResult(null);
    setError(null);
    const videoInfo = extractVideoInfo();
    // Get OpenAI API key from chrome.storage
    chrome.storage.sync.get(['openaiApiKey'], async (resultObj) => {
      const apiKey = resultObj.openaiApiKey;
      if (!apiKey) {
        setIsAnalyzing(false);
        setError('OpenAI API key not found. Please set it in the extension popup.');
        return;
      }
      try {
        // Compose the prompt
        const prompt = `You are an expert at summarizing YouTube videos. Given the following video information, provide a detailed breakdown with timestamps for important moments, key points, and a concise summary.\n\nTitle: ${videoInfo.title}\nDescription: ${videoInfo.description}\nChannel: ${videoInfo.channel}\nURL: ${videoInfo.url}\n\nFormat your response as a list with timestamps and explanations. If you do not know the timestamps, estimate them based on the description.`;
        // Call OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: 'You are a helpful assistant that summarizes YouTube videos with timestamps and key points.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 700,
            temperature: 0.6
          })
        });
        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }
        const data = await response.json();
        const aiText = data.choices?.[0]?.message?.content || 'No response from AI.';
        setIsAnalyzing(false);
        setResult(aiText);
      } catch (err: any) {
        setIsAnalyzing(false);
        setError('Failed to get analysis from OpenAI. ' + (err?.message || ''));
      }
    });
  };

  const handleClose = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowModal(false);
    setResult(null);
    setError(null);
  };

  // Helper to parse timestamps and highlight them as clickable
  const seekToTimestamp = (timestamp: string) => {
    const [min, sec] = timestamp.split(":").map(Number);
    const seconds = min * 60 + sec;
    // Try to use the YouTube player API if available
    const video = document.querySelector('video');
    if (video) {
      video.currentTime = seconds;
      video.play();
    } else {
      // Fallback: update the URL (not as smooth)
      const url = new URL(window.location.href);
      url.searchParams.set('t', `${seconds}s`);
      window.location.href = url.toString();
    }
  };

  const renderResult = (text: string) => {
    const lines = text.split('\n');
    return (
      <div>
        {lines.map((line, idx) => {
          // Match timestamps like 1:23 or 12:34
          const match = line.match(/(\d{1,2}:\d{2})/);
          if (match) {
            const [timestamp] = match;
            const parts = line.split(timestamp);
            return (
              <div key={idx} style={{ marginBottom: 8 }}>
                <span
                  style={{ color: '#667eea', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => seekToTimestamp(timestamp)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Jump to ${timestamp}`}
                >
                  {timestamp}
                </span>
                <span>{parts[1]}</span>
              </div>
            );
          }
          // Indent lines that are explanations
          if (/^\s+/.test(line)) {
            return <div key={idx} style={{ marginLeft: 24, color: '#444', fontSize: 14 }}>{line.trim()}</div>;
          }
          return <div key={idx}>{line}</div>;
        })}
      </div>
    );
  };

  return (
    <>
      <div id="breakdown-ai-wrapper">
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="breakdown-ai-btn"
          id="breakdown-ai-button"
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
      </div>
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 1000000,
            background: 'rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            pointerEvents: 'auto',
          }}
          onClick={handleClose}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 12,
              boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
              padding: 24,
              minWidth: 320,
              maxWidth: 400,
              color: '#222',
              fontFamily: 'Roboto, sans-serif',
              margin: '0 32px 90px 0',
              position: 'relative',
              pointerEvents: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#667eea' }}>AI Breakdown</h3>
              <button
                onClick={handleClose}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#667eea', zIndex: 2 }}
                aria-label="Close"
                tabIndex={0}
              >
                ×
              </button>
            </div>
            {isAnalyzing && <div className="breakdown-ai-loading">Analyzing video... <span className="breakdown-ai-spinner"></span></div>}
            {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}
            {result && <div className="breakdown-ai-results">{renderResult(result)}</div>}
          </div>
        </div>
      )}
    </>
  );
};

function injectFloatingOverlay() {
  let overlayHost = document.getElementById('breakdown-ai-floating-overlay') as HTMLElement | null;
  let reactRoot: ReactDOM.Root | null = null;

  if (overlayHost && overlayHost.shadowRoot) {
    const container = overlayHost.shadowRoot.getElementById('breakdown-ai-root');
    if (container && (container as any)._reactRootContainer) {
      (container as any)._reactRootContainer._internalRoot.current.child.stateNode.unmount && (container as any)._reactRootContainer._internalRoot.current.child.stateNode.unmount();
    }
    overlayHost.remove();
    overlayHost = null;
  }

  overlayHost = document.createElement('div');
  overlayHost.id = 'breakdown-ai-floating-overlay';
  document.body.appendChild(overlayHost);

  const shadow = overlayHost.attachShadow({ mode: 'open' });
  const container = document.createElement('div');
  container.id = 'breakdown-ai-root';
  shadow.appendChild(container);

  const style = document.createElement('style');
  style.textContent = `
    #breakdown-ai-root {
      position: fixed;
      bottom: 32px;
      right: 32px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      pointer-events: none;
    }
    .breakdown-ai-btn {
      pointer-events: auto;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      color: white !important;
      border: none !important;
      padding: 14px 28px !important;
      border-radius: 25px !important;
      cursor: pointer !important;
      font-weight: bold !important;
      margin: 0 !important;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2) !important;
      transition: all 0.3s ease !important;
      font-family: 'Roboto', sans-serif !important;
      font-size: 16px !important;
      opacity: 1 !important;
    }
    .breakdown-ai-btn:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 6px 20px rgba(0,0,0,0.3) !important;
      background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%) !important;
    }
    .breakdown-ai-btn:active {
      transform: translateY(0) !important;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2) !important;
    }
    .breakdown-ai-spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-right: 10px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  shadow.appendChild(style);

  reactRoot = ReactDOM.createRoot(container);
  reactRoot.render(<AnalysisOverlay />);
}

injectFloatingOverlay();

console.log('BreakDown AI React floating overlay loaded'); 