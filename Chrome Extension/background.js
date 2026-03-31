/* --- Slangyy AI: Background Service Worker (Modern Gradio Handshake) --- */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'rewriteText') {
    const { text, style } = request;
    
    // The base URL for the named /rewrite endpoint
    const BASE_CALL_URL = 'https://viv2005ek-text-rewriter-api-slangy.hf.space/gradio_api/call/rewrite';

    (async () => {
      try {
        console.log("Slangyy: Step 1 - Fetching Event ID...");
        
        // 1. Initial POST to get the Event ID
        const postResponse = await fetch(BASE_CALL_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: [text, style] })
        });

        if (!postResponse.ok) {
          const errText = await postResponse.text();
          throw new Error(`Init Failed (${postResponse.status}): ${errText.substring(0, 50)}`);
        }

        const { event_id } = await postResponse.json();
        console.log("Slangyy: Step 2 - Event ID received:", event_id);

        // 2. GET request to the stream endpoint
        const streamResponse = await fetch(`${BASE_CALL_URL}/${event_id}`);
        if (!streamResponse.ok) throw new Error("Stream connection failed.");

        const reader = streamResponse.body.getReader();
        const decoder = new TextDecoder();
        let resultFound = false;

        // Process the stream chunks
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                // Gradio sends data as an array in a data: string
                const data = JSON.parse(line.substring(6));
                if (Array.isArray(data) && data.length > 0) {
                  const rewriteContent = data[0];
                  // If we got actual text and not just 'null' or empty
                  if (rewriteContent && typeof rewriteContent === 'string') {
                    sendResponse({ success: true, rewritten_text: rewriteContent });
                    resultFound = true;
                    break;
                  }
                }
              } catch (e) {
                // Might be a 'heartbeat' or partial data, ignore and continue
              }
            }
          }
          if (resultFound) break;
        }

        if (!resultFound) {
          throw new Error("Stream closed without returning a result. The Space might be busy.");
        }

      } catch (error) {
        console.error('Slangyy Error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // Keep the message channel open
  }
});
