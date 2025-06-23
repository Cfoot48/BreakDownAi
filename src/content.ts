// Content script for YouTube pages

console.log('BreakDown AI content script loaded');

// Function to extract video information from YouTube page
function extractVideoInfo() {
  const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent?.trim();
  const videoDescription = document.querySelector('#description-inline-expander')?.textContent?.trim();
  const channelName = document.querySelector('#channel-name a')?.textContent?.trim();
  
  return {
    title: videoTitle,
    description: videoDescription,
    channel: channelName,
    url: window.location.href
  };
}

// Function to add analysis button to YouTube page
function addAnalysisButton() {
  // Check if button already exists
  if (document.getElementById('breakdown-ai-button')) {
    return;
  }
  
  const button = document.createElement('button');
  button.id = 'breakdown-ai-button';
  button.textContent = '🔍 Analyze with AI';
  button.className = 'breakdown-ai-btn';
  button.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 25px;
    cursor: pointer;
    font-weight: bold;
    margin: 10px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    transition: all 0.3s ease;
  `;
  
  button.addEventListener('click', async () => {
    const videoInfo = extractVideoInfo();
    console.log('Video info extracted:', videoInfo);
    
    // Send message to background script
    chrome.runtime.sendMessage({
      type: 'ANALYZE_VIDEO',
      data: videoInfo
    });
  });
  
  // Add button to YouTube page
  const targetContainer = document.querySelector('#primary-inner');
  if (targetContainer) {
    targetContainer.appendChild(button);
  }
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addAnalysisButton);
} else {
  addAnalysisButton();
}

// Watch for navigation changes (YouTube is a SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(addAnalysisButton, 1000); // Wait for page to load
  }
}).observe(document, { subtree: true, childList: true }); 