// content.js — injected into every page at document_idle
// Listens for messages from popup.js or background.js
// and returns the visible text content of the current page.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    try {
      const text = document.body?.innerText || "";
      sendResponse({ success: true, content: text });
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
  }

  // Return true to indicate async response (required for Chrome MV3)
  return true;
});
