// Background service worker for BreakDown AI Chrome Extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('BreakDown AI Extension installed');
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((
  request: any, 
  sender: chrome.runtime.MessageSender, 
  sendResponse: (response?: any) => void
) => {
  if (request.type === 'ANALYZE_VIDEO') {
    // Handle video analysis request
    console.log('Video analysis requested:', request.data);
    sendResponse({ success: true });
  }
  
  if (request.type === 'GET_API_KEY') {
    // Get stored API key
    chrome.storage.sync.get(['openaiApiKey'], (result: { openaiApiKey?: string }) => {
      sendResponse({ apiKey: result.openaiApiKey });
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.type === 'SAVE_API_KEY') {
    // Save API key
    chrome.storage.sync.set({ openaiApiKey: request.apiKey }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
}); 