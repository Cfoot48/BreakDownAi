import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import './content.css';

interface VideoInfo {
  title: string | null;
  description: string | null;
  channel: string | null;
  url: string;
  duration: string | null;
}

interface AnalysisButtonProps {
  onAnalyze: (videoInfo: VideoInfo) => void;
}

const AnalysisOverlay: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Chat state
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [userInput, setUserInput] = useState('');
  // Draggable modal state
  const [modalPos, setModalPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  // Add modal size state
  const [modalSize, setModalSize] = useState<{ width: number; height: number }>({ width: 400, height: 350 });
  const resizing = useRef(false);
  const resizeStart = useRef<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 400, height: 350 });

  const extractVideoInfo = (): VideoInfo => {
    const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent?.trim() || null;
    const videoDescription = document.querySelector('#description-inline-expander')?.textContent?.trim() || null;
    const channelName = document.querySelector('#channel-name a')?.textContent?.trim() || null;
    // Extract video duration from the <video> element
    const videoElem = document.querySelector('video');
    let duration: string | null = null;
    if (videoElem && !isNaN(videoElem.duration)) {
      const totalSeconds = Math.floor(videoElem.duration);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      duration =
        hours > 0
          ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
          : `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return {
      title: videoTitle,
      description: videoDescription,
      channel: channelName,
      url: window.location.href,
      duration,
    };
  };

  const handleAnalyze = async () => {
    setShowModal(true);
    setIsAnalyzing(true);
    setResult(null);
    setError(null);
    setChatHistory([]);
    setUserInput('');
    const videoInfo = extractVideoInfo();
    chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, async (response) => {
      const apiKey = response?.apiKey;
      if (!apiKey) {
        setIsAnalyzing(false);
        setError('OpenAI API key not found. Please set it in the extension popup.');
        return;
      }
      try {
        const prompt = `You are an expert at summarizing YouTube videos. Given the following video information, provide a comprehensive breakdown covering the ENTIRE video duration with estimated timestamps for important moments, key points, and a detailed summary.\n\nIMPORTANT: Provide timestamps and explanations for the FULL video duration, not just the beginning. Since you don't have access to the actual video content, estimate timestamps based on the description and typical video structure.\n\nTitle: ${videoInfo.title}\nDescription: ${videoInfo.description}\nChannel: ${videoInfo.channel}\nURL: ${videoInfo.url}\nDuration: ${videoInfo.duration || 'Unknown'}\n\nFormat your response as a detailed list with estimated timestamps and explanations covering the entire video. Include:\n- Introduction and setup (0:00 - ~2:00)\n- Main content sections with timestamps\n- Key points and highlights throughout\n- Conclusion and takeaways\n\nMake sure to cover the complete video duration, not just the first portion.`;
        const messages = [
          { role: 'system', content: 'You are a helpful assistant that provides comprehensive YouTube video summaries with estimated timestamps covering the ENTIRE video duration, not just the beginning portions.' },
          { role: 'user', content: prompt }
        ];
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'BreakDown AI Extension'
          },
          body: JSON.stringify({
            model: 'openai/gpt-3.5-turbo',
            messages,
            max_tokens: 2048,
            temperature: 0.6
          })
        });
        if (!response.ok) {
          throw new Error(`OpenRouter API error: ${response.status}`);
        }
        const data = await response.json();
        const aiText = data.choices?.[0]?.message?.content || 'No response from AI.';
        setIsAnalyzing(false);
        setResult(aiText);
        setChatHistory([
          { role: 'assistant', content: aiText }
        ]);
      } catch (err: any) {
        setIsAnalyzing(false);
        setError('Failed to get analysis from OpenAI. ' + (err?.message || ''));
      }
    });
  };

  // Handle user follow-up question
  const handleSendFollowup = async () => {
    if (!userInput.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    const videoInfo = extractVideoInfo();
    const newHistory = [
      // Always start with the system and original prompt
      { role: 'system', content: 'You are a helpful assistant that provides comprehensive YouTube video summaries with estimated timestamps covering the ENTIRE video duration, not just the beginning portions.' },
      { role: 'user', content: `You are an expert at summarizing YouTube videos. Given the following video information, provide a comprehensive breakdown covering the ENTIRE video duration with estimated timestamps for important moments, key points, and a detailed summary.\n\nIMPORTANT: Provide timestamps and explanations for the FULL video duration, not just the beginning. Since you don't have access to the actual video content, estimate timestamps based on the description and typical video structure.\n\nTitle: ${videoInfo.title}\nDescription: ${videoInfo.description}\nChannel: ${videoInfo.channel}\nURL: ${videoInfo.url}\nDuration: ${videoInfo.duration || 'Unknown'}\n\nFormat your response as a detailed list with estimated timestamps and explanations covering the entire video. Include:\n- Introduction and setup (0:00 - ~2:00)\n- Main content sections with timestamps\n- Key points and highlights throughout\n- Conclusion and takeaways\n\nMake sure to cover the complete video duration, not just the first portion.` },
      // Add all previous user/assistant messages
      ...chatHistory,
      { role: 'user', content: userInput }
    ];
    setChatHistory([...chatHistory, { role: 'user', content: userInput }]);
    setUserInput('');
    chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, async (response) => {
      const apiKey = response?.apiKey;
      if (!apiKey) {
        setIsAnalyzing(false);
        setError('OpenAI API key not found. Please set it in the extension popup.');
        return;
      }
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'BreakDown AI Extension'
          },
          body: JSON.stringify({
            model: 'openai/gpt-3.5-turbo',
            messages: newHistory,
            max_tokens: 1024,
            temperature: 0.6
          })
        });
        if (!response.ok) {
          throw new Error(`OpenRouter API error: ${response.status}`);
        }
        const data = await response.json();
        const aiText = data.choices?.[0]?.message?.content || 'No response from AI.';
        setIsAnalyzing(false);
        setChatHistory([...chatHistory, { role: 'user', content: userInput }, { role: 'assistant', content: aiText }]);
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
    // Support H:MM:SS and MM:SS
    const parts = timestamp.split(":").map(Number);
    let seconds = 0;
    if (parts.length === 3) {
      // H:MM:SS
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      // MM:SS
      seconds = parts[0] * 60 + parts[1];
    }
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
          // Match timestamps like H:MM:SS or MM:SS
          const match = line.match(/(\d{1,2}:\d{2}:\d{2}|\d{1,2}:\d{2})/);
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

  // Replace result rendering with chat rendering
  const renderChat = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {chatHistory.map((msg, idx) => (
        <div key={idx} style={{
          alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
          background: msg.role === 'user' ? '#f0f4ff' : '#f8f8fa',
          color: '#222',
          borderRadius: 10,
          padding: '10px 14px',
          maxWidth: '90%',
          fontSize: 15.5,
          boxShadow: msg.role === 'user' ? '0 2px 8px rgba(102,126,234,0.08)' : '0 2px 8px rgba(118,75,162,0.06)',
          marginLeft: msg.role === 'user' ? 40 : 0,
          marginRight: msg.role === 'user' ? 0 : 40,
          whiteSpace: 'pre-line',
        }}>
          {msg.role === 'assistant' ? renderResult(msg.content) : msg.content}
        </div>
      ))}
    </div>
  );

  // Drag handlers
  const onHeaderMouseDown = (e: React.MouseEvent) => {
    if (modalRef.current) {
      setDragging(true);
      const rect = modalRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };
  React.useEffect(() => {
    if (!dragging) return;
    const onMouseMove = (e: MouseEvent) => {
      // Clamp to viewport
      const width = modalRef.current?.offsetWidth || 400;
      const height = modalRef.current?.offsetHeight || 300;
      const x = Math.max(0, Math.min(window.innerWidth - width, e.clientX - dragOffset.current.x));
      const y = Math.max(0, Math.min(window.innerHeight - height, e.clientY - dragOffset.current.y));
      setModalPos({ x, y });
    };
    const onMouseUp = () => setDragging(false);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging]);

  // Resize handlers
  const onResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    resizing.current = true;
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: modalSize.width,
      height: modalSize.height,
    };
    document.body.style.userSelect = 'none';

    // Attach listeners directly here
    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - resizeStart.current.x;
      const dy = moveEvent.clientY - resizeStart.current.y;
      setModalSize({
        width: Math.max(320, resizeStart.current.width + dx),
        height: Math.max(180, resizeStart.current.height + dy),
      });
    };
    const onMouseUp = () => {
      resizing.current = false;
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <>
      {/* Floating Analyze Button */}
      <div id="breakdown-ai-wrapper" style={{
        position: 'fixed',
        bottom: 32,
        right: 32,
        zIndex: 999999,
        pointerEvents: 'auto',
      }}>
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
      {/* Draggable Modal */}
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
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
          }}
        >
          <div
            ref={modalRef}
            style={{
              background: 'white',
              borderRadius: 16,
              boxShadow: '0 8px 32px rgba(102,126,234,0.13), 0 2px 8px rgba(118,75,162,0.08)',
              padding: 0,
              minWidth: 320,
              maxWidth: 600,
              width: modalSize.width,
              minHeight: 180,
              maxHeight: '80vh',
              height: modalSize.height,
              color: '#222',
              fontFamily: 'Inter, Roboto, sans-serif',
              margin: 0,
              position: 'absolute',
              left: modalPos ? modalPos.x : `calc(50vw - ${modalSize.width / 2}px)`,
              top: modalPos ? modalPos.y : `calc(50vh - ${modalSize.height / 2}px)`,
              pointerEvents: 'auto',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              transition: dragging ? 'none' : 'box-shadow 0.2s',
              cursor: dragging ? 'grabbing' : 'default',
              resize: 'none',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: '16px 24px 10px 24px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              cursor: 'grab',
              userSelect: 'none',
            }}
            onMouseDown={onHeaderMouseDown}
            >
              <span style={{ fontFamily: 'inherit', fontSize: 19, color: 'white', fontWeight: 600, letterSpacing: 0.5 }}>AI Breakdown</span>
              <button
                onClick={handleClose}
                style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#fff', position: 'relative', zIndex: 2, lineHeight: 1 }}
                aria-label="Close"
                tabIndex={0}
              >
                ×
              </button>
            </div>
            <div style={{
              padding: '10px 24px 18px 24px',
              background: 'white',
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              lineHeight: 1.7,
              fontSize: 15.5,
              margin: 0,
              flex: 1,
              overflowY: 'auto',
              maxHeight: modalSize.height - 56,
              display: 'flex',
              flexDirection: 'column',
            }}>
              <small style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 8 }}>Timestamps are estimates based on video description</small>
              {isAnalyzing && <div className="breakdown-ai-loading">Analyzing video... <span className="breakdown-ai-spinner"></span></div>}
              {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}
              {renderChat()}
              {/* Chat input */}
              <form
                onSubmit={e => { e.preventDefault(); handleSendFollowup(); }}
                style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}
              >
                <input
                  type="text"
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  placeholder="Ask for clarity or details..."
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1.5px solid #d1d5db',
                    fontSize: 15.5,
                    outline: 'none',
                  }}
                  disabled={isAnalyzing}
                  onKeyDown={e => {
                    // Prevent YouTube shortcuts when typing in the input
                    e.stopPropagation();
                    // Do NOT call preventDefault, so keys are typed into the input
                  }}
                  onKeyUp={e => {
                    // Prevent YouTube from seeing the keyup, but allow typing
                    e.stopPropagation();
                  }}
                />
                <button
                  type="submit"
                  disabled={isAnalyzing || !userInput.trim()}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 18px',
                    fontWeight: 'bold',
                    fontSize: 15.5,
                    cursor: isAnalyzing || !userInput.trim() ? 'not-allowed' : 'pointer',
                    opacity: isAnalyzing || !userInput.trim() ? 0.6 : 1,
                  }}
                >
                  Send
                </button>
              </form>
            </div>
            {/* Resize handle */}
            <div
              style={{
                position: 'absolute',
                right: 0,
                bottom: 0,
                width: 24,
                height: 24,
                cursor: 'nwse-resize',
                zIndex: 10,
                userSelect: 'none',
                background: 'transparent',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'flex-end',
              }}
              onMouseDown={onResizeMouseDown}
            >
              <svg width="18" height="18" viewBox="0 0 18 18"><polyline points="4,18 18,4" stroke="#aaa" strokeWidth="2" fill="none"/></svg>
            </div>
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