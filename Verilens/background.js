// background.js

// ---------------------------------------------------------
// CONFIGURATION (Hardcoded for Hackathon Demo)
// ---------------------------------------------------------
//API KEYS Here

// ---------------------------------------------------------
// 1. CONTEXT MENU SETUP
// ---------------------------------------------------------
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "verilens-check",
    title: "Verify with VeriLens",
    contexts: ["image", "video"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "verilens-check") {
    
    // We explicitly target the exact frame the user clicked inside
    chrome.tabs.sendMessage(tab.id, {
      action: "processMedia",
      mediaType: info.mediaType,
      srcUrl: info.srcUrl
    }, { frameId: info.frameId }).catch(err => {
        // This catches that ugly red "Uncaught (in promise)" error so it doesn't break the script
        console.error("Message failed to send to content.js:", err);
    });
    
  }
});

// ---------------------------------------------------------
// 2. MAIN LOGIC LISTENER
// ---------------------------------------------------------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "performAnalysis") {
    // Pass the userClaim to the handler
    handleAnalysis(request.imageUrl, sender.tab.id, request.userClaim); 
  }
});
// Add userClaim as a parameter here
async function handleAnalysis(imageUrl, tabId, userClaim) { 
  try {
    console.log("Step 1: Searching Image Context via SerpApi...");
    const searchContext = await searchImageContext(imageUrl);

    console.log("Step 2: Asking Gemini to Fact-Check the claim...");
    // Pass userClaim into askGemini
    const factCheckResult = await askGemini(searchContext, userClaim); 

    console.log("Step 3: Analysis Complete:", factCheckResult);
    
    chrome.tabs.sendMessage(tabId, {
      action: "showResult",
      result: factCheckResult
    });

  } catch (error) {
    console.error("VeriLens Error:", error);
  }
}

// ---------------------------------------------------------
// 3. API FUNCTIONS
// ---------------------------------------------------------

// Step A: Reverse Image Search
async function searchImageContext(imageUrl) {
  // We use SerpApi's Google Lens engine
  const url = `https://serpapi.com/search.json?engine=google_lens&url=${encodeURIComponent(imageUrl)}&api_key=${SERPAPI_KEY}`;
  
  const response = await fetch(url);
  const data = await response.json();

  // We extract the "Visual Matches" or "Knowledge Graph" from the JSON
  // This usually contains titles and snippets from websites where the image appears
  if (!data.visual_matches) return "No visual matches found.";

  // Simplify the data for Gemini (to save tokens)
  const snippets = data.visual_matches.slice(0, 5).map(match => {
    return `- Found on: ${match.title} (${match.source})`;
  }).join("\n");

  return snippets;
}


// Step B: AI Synthesis
// Add userClaim to this function signature
async function askGemini(contextData, userClaim) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  // THE NEW, DYNAMIC PROMPT
  const prompt = `
    You are an expert fact-checking assistant. An internet user is looking at an image that has the following claim or caption attached to it:
    CLAIM: "${userClaim}"

    I have performed a reverse image search. Here is the raw data showing where this image actually appears on the internet:
    ${contextData}

    Based strictly on this reverse-search data:
    1. **True Context:** Identify the likely true original context of this image (event, date, location).
    2. **Claim Evaluation:** Is the user's CLAIM accurate, misleading, or completely false based on the true context? 
    3. **Verdict:** Provide a definitive, punchy 2-sentence verdict.
  `;

  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }]
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  
  if (data.error) throw new Error(`Gemini refused the request: ${data.error.message}`);
  if (!data.candidates || data.candidates.length === 0) throw new Error("Empty response from Gemini.");

  return data.candidates[0].content.parts[0].text;
}