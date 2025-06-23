import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './popup.css';

interface PopupProps {}

const Popup: React.FC<PopupProps> = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Load saved API key on component mount
    chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, (response) => {
      if (response && response.apiKey) {
        setApiKey(response.apiKey);
      }
    });
  }, []);

  const handleSaveApiKey = async () => {
    const trimmedKey = apiKey.trim();
    
    if (!trimmedKey) {
      setStatus({ message: 'Please enter an API key', type: 'error' });
      return;
    }

    setIsLoading(true);
    
    chrome.runtime.sendMessage({ 
      type: 'SAVE_API_KEY', 
      apiKey: trimmedKey 
    }, (response) => {
      setIsLoading(false);
      if (response && response.success) {
        setStatus({ message: 'API key saved successfully!', type: 'success' });
      } else {
        setStatus({ message: 'Failed to save API key', type: 'error' });
      }
    });
  };

  const clearStatus = () => {
    setTimeout(() => {
      setStatus(null);
    }, 3000);
  };

  useEffect(() => {
    if (status) {
      clearStatus();
    }
  }, [status]);

  return (
    <div className="popup-container">
      <div className="header">
        <h1>🔍 BreakDown AI</h1>
        <p>AI-powered YouTube content analysis</p>
      </div>
      
      <div className="form-group">
        <label htmlFor="apiKey">OpenAI API Key:</label>
        <input
          type="password"
          id="apiKey"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your OpenAI API key"
          className="api-key-input"
        />
      </div>
      
      <button 
        onClick={handleSaveApiKey}
        disabled={isLoading}
        className="save-button"
      >
        {isLoading ? 'Saving...' : 'Save API Key'}
      </button>
      
      {status && (
        <div className={`status ${status.type}`}>
          {status.message}
        </div>
      )}
    </div>
  );
};

// Render the React app
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<Popup />); 