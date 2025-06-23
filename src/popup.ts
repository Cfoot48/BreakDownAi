// Popup script for BreakDown AI Chrome Extension

document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
  const saveButton = document.getElementById('saveKey') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;

  // Load saved API key
  chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, (response) => {
    if (response && response.apiKey) {
      apiKeyInput.value = response.apiKey;
    }
  });

  // Save API key
  saveButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    chrome.runtime.sendMessage({ 
      type: 'SAVE_API_KEY', 
      apiKey: apiKey 
    }, (response) => {
      if (response && response.success) {
        showStatus('API key saved successfully!', 'success');
      } else {
        showStatus('Failed to save API key', 'error');
      }
    });
  });

  function showStatus(message: string, type: 'success' | 'error') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
}); 