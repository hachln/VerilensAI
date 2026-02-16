// Listen for the right-click action from background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "processMedia") {
    
    // Instead of window.prompt, we call our custom UI card
    showClaimPromptCard(request.srcUrl);
    
  } else if (request.action === "showResult") {
    displayFactCheckCard(request.result);
  }
});


/**
 * Displays an animated loading card while waiting for the AI APIs
 */
function showLoadingCard() {
  // Clear any existing VeriLens cards first
  const existingPrompt = document.getElementById('verilens-prompt-card');
  if (existingPrompt) existingPrompt.remove();
  const existingResult = document.getElementById('verilens-result-card');
  if (existingResult) existingResult.remove();
  const existingLoading = document.getElementById('verilens-loading-card');
  if (existingLoading) existingLoading.remove();

  const card = document.createElement('div');
  card.id = 'verilens-loading-card';
  
  // Injecting custom CSS for the spinning animation directly into the card
  card.innerHTML = `
    <style>
      @keyframes verilens-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
    <div style="
      position: fixed; bottom: 20px; right: 20px; width: 350px; 
      background-color: #ffffff; border: 1px solid #e0e0e0; 
      border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); 
      z-index: 2147483647; font-family: system-ui, -apple-system, sans-serif;
      padding: 20px; display: flex; align-items: center; gap: 15px; box-sizing: border-box;
    ">
      <div style="
        width: 24px; height: 24px; border: 3px solid #f3f3f3; 
        border-top: 3px solid #007bff; border-radius: 50%; 
        animation: verilens-spin 1s linear infinite;
      "></div>
      <div style="font-size: 15px; font-weight: bold; color: #2c3e50;">
        VeriLens is verifying...
      </div>
    </div>
  `;

  document.body.appendChild(card);
}

/**
 * Builds and injects a modern UI card asking the user for the claim
 */
function showClaimPromptCard(imageUrl) {
  // 1. Remove any existing VeriLens cards
  const existingCard = document.getElementById('verilens-prompt-card');
  if (existingCard) existingCard.remove();

  // 2. Create the main card container (matching your result card style)
  const card = document.createElement('div');
  card.id = 'verilens-prompt-card';
  Object.assign(card.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '350px',
      backgroundColor: '#ffffff',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      zIndex: '2147483647',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
  });

  // 3. Create the Header
  const header = document.createElement('div');
  Object.assign(header.style, {
      backgroundColor: '#2c3e50',
      color: '#ffffff',
      padding: '12px 16px',
      fontSize: '16px',
      fontWeight: 'bold',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
  });
  header.innerHTML = '<span>🔍 VeriLens: Add Context</span>';
  
  const closeBtn = document.createElement('span');
  closeBtn.innerHTML = '&times;';
  Object.assign(closeBtn.style, { cursor: 'pointer', fontSize: '22px', lineHeight: '1' });
  closeBtn.onclick = () => card.remove(); // Closes the card if user cancels
  header.appendChild(closeBtn);

  // 4. Create the Body with Input Field
  const body = document.createElement('div');
  Object.assign(body.style, { padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' });

  const label = document.createElement('label');
  label.innerText = "What is the caption or claim attached to this image?";
  label.style.fontSize = '14px';
  label.style.color = '#333';

  const input = document.createElement('textarea');
  input.placeholder = "e.g., 'Fire in Brazil just now'";
  Object.assign(input.style, {
      width: '100%',
      height: '60px',
      padding: '8px',
      border: '1px solid #ccc',
      borderRadius: '4px',
      fontSize: '14px',
      resize: 'none',
      boxSizing: 'border-box',
      fontFamily: 'inherit'
  });

  const btnWrapper = document.createElement('div');
  btnWrapper.style.display = 'flex';
  btnWrapper.style.justifyContent = 'flex-end';

  const submitBtn = document.createElement('button');
  submitBtn.innerText = "Analyze";
  Object.assign(submitBtn.style, {
      backgroundColor: '#007bff', // Action blue
      color: 'white',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '14px'
  });

  // 5. THE MAGIC: What happens when they click "Analyze"
  submitBtn.onclick = () => {
      const userClaim = input.value.trim() || "No specific claim provided. Just tell me what this image actually depicts.";
      
      // Close the prompt card
      card.remove(); 
      
      // Trigger the permanent loading spinner!
      showLoadingCard();

      // Send the data to the Brain (background.js)
      chrome.runtime.sendMessage({
          action: "performAnalysis",
          imageUrl: imageUrl,
          userClaim: userClaim
      });
  };

  // 6. Assemble everything
  btnWrapper.appendChild(submitBtn);
  body.appendChild(label);
  body.appendChild(input);
  body.appendChild(btnWrapper);
  
  card.appendChild(header);
  card.appendChild(body);
  document.body.appendChild(card);
  
  // Automatically focus the text box so the user can start typing immediately
  input.focus();
}


function displayFactCheckCard(resultText) {
  // 1. Remove any existing VeriLens cards so they don't stack up
  const existingCard = document.getElementById('verilens-result-card');
  if (existingCard) existingCard.remove();
  //Kill the loading spinner
  const loadingCard = document.getElementById('verilens-loading-card');
  if (loadingCard) loadingCard.remove();

  // 2. Create the main card container
  const card = document.createElement('div');
  card.id = 'verilens-result-card';
  
  // Use inline styling to guarantee it works on any website without CSS conflicts
  Object.assign(card.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '350px',
      backgroundColor: '#ffffff',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      zIndex: '2147483647', // Maximum possible z-index to stay on top
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
  });

  // 3. Create the Header
  const header = document.createElement('div');
  Object.assign(header.style, {
      backgroundColor: '#2c3e50', // Dark professional blue
      color: '#ffffff',
      padding: '12px 16px',
      fontSize: '16px',
      fontWeight: 'bold',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
  });
  header.innerHTML = '<span>🔍 VeriLens Analysis</span>';
  
  // 4. Create the Close Button
  const closeBtn = document.createElement('span');
  closeBtn.innerHTML = '&times;'; // The 'X' symbol
  Object.assign(closeBtn.style, {
      cursor: 'pointer',
      fontSize: '22px',
      lineHeight: '1'
  });
  closeBtn.onclick = () => card.remove();
  header.appendChild(closeBtn);

  // 5. Create the Body (where the AI text goes)
  const body = document.createElement('div');
  Object.assign(body.style, {
      padding: '16px',
      fontSize: '14px',
      color: '#333333',
      lineHeight: '1.5',
      maxHeight: '300px',
      overflowY: 'auto'
  });
  
  // Gemini often uses **text** for bolding and \n for newlines. 
  // This simple regex converts that to proper HTML <strong> and <br> tags.
  const formattedText = resultText
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  body.innerHTML = formattedText;

  // 6. Create the Footer
  const footer = document.createElement('div');
  Object.assign(footer.style, {
      backgroundColor: '#f8f9fa',
      padding: '8px 16px',
      fontSize: '11px',
      color: '#6c757d',
      textAlign: 'right',
      borderTop: '1px solid #eeeeee'
  });
  footer.innerText = 'Powered by Google Lens & Gemini AI';

  // 7. Assemble and inject into the page
  card.appendChild(header);
  card.appendChild(body);
  card.appendChild(footer);
  document.body.appendChild(card);
}
function showNotification(message) {
  // Simple visual feedback
  const div = document.createElement("div");
  div.style = "position:fixed; top:10px; right:10px; z-index:9999; background: #222; color: #fff; padding: 15px; border-radius: 5px; font-family: sans-serif;";
  div.innerText = message;
  document.body.appendChild(div);
  
  // Remove after 3 seconds
  setTimeout(() => div.remove(), 3000);
}