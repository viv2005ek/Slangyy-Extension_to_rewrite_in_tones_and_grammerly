/* --- Slangyy AI: Premium Content Script --- */

(function () {
  let floatingBtn = null;
  let slangyPanel = null;
  let selectedText = "";
  let selectionRect = null;
  let currentStyle = "professional";

  const STYLES = {
    professional: "✨ Professional",
    slangy: "🔥 Slangy / Gen-Z",
    human: "🧠 Human / Natural",
    grammar: "✍️ Perfect Grammar"
  };

  const SVGS = {
    SPARK: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"></path></svg>`,
    CHEVRON: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`
  };

  function checkContext() {
    if (!chrome.runtime?.id) {
      console.warn("Slangyy: Extension context inactivated. Please refresh the page.");
      return false;
    }
    return true;
  }

  document.addEventListener('mouseup', handleCapture);
  document.addEventListener('mousedown', (e) => {
    if (slangyPanel && !slangyPanel.contains(e.target) && floatingBtn && !floatingBtn.contains(e.target)) {
      hideAll();
    }
  });

  function handleCapture(e) {
    if (e && e.target && e.target.closest && (e.target.closest('.slangy-floating-btn') || e.target.closest('.slangy-panel'))) {
      return;
    }

    setTimeout(() => {
      const selection = window.getSelection();
      selectedText = selection.toString().trim();

      const activeEl = document.activeElement;
      if (!selectedText && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        const start = activeEl.selectionStart;
        const end = activeEl.selectionEnd;
        if (start !== end) {
          selectedText = activeEl.value.substring(start, end).trim();
          selectionRect = activeEl.getBoundingClientRect();
        }
      } else if (selectedText.length > 5 && selection.rangeCount > 0) {
        selectionRect = selection.getRangeAt(0).getBoundingClientRect();
      } else {
        hideBtn();
        return;
      }

      if (selectedText.length > 5) {
        showBtn();
      }
    }, 50);
  }

  function showBtn() {
    if (!floatingBtn) {
      floatingBtn = document.createElement('div');
      floatingBtn.className = 'slangy-floating-btn';
      floatingBtn.innerHTML = SVGS.SPARK;
      document.body.appendChild(floatingBtn);
      floatingBtn.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();
      };
      floatingBtn.onclick = (e) => {
        e.stopPropagation();
        showPanel();
        hideBtn();
      };
    }
    const sx = window.pageXOffset || document.documentElement.scrollLeft;
    const sy = window.pageYOffset || document.documentElement.scrollTop;

    floatingBtn.style.left = `${selectionRect.right + sx - 10}px`;
    floatingBtn.style.top = `${selectionRect.bottom + sy + 10}px`;
    floatingBtn.style.display = 'flex';
  }

  function hideBtn() {
    if (floatingBtn) floatingBtn.style.display = 'none';
  }

  function hideAll() {
    hideBtn();
    if (slangyPanel) slangyPanel.style.display = 'none';
  }

  function showPanel() {
    if (!slangyPanel) {
      slangyPanel = document.createElement('div');
      slangyPanel.className = 'slangy-panel';
      slangyPanel.innerHTML = `
        <div style="font-weight: 800; font-size: 20px; color: #6C5CE7; margin-bottom: 16px;">Slangyy AI</div>
        <div class="slangy-dropdown">
          <div class="slangy-dropdown-trigger" id="slangy-p-trigger">
            <span id="slangy-p-current-style">${STYLES.professional}</span>
            ${SVGS.CHEVRON}
          </div>
          <div class="slangy-dropdown-menu" id="slangy-p-menu">
            <div class="slangy-dropdown-item" data-val="professional">${STYLES.professional}</div>
            <div class="slangy-dropdown-item" data-val="slangy">${STYLES.slangy}</div>
            <div class="slangy-dropdown-item" data-val="human">${STYLES.human}</div>
            <div class="slangy-dropdown-item" data-val="grammar">${STYLES.grammar}</div>
          </div>
        </div>
        <button class="slangy-rewrite-btn" id="slangy-p-rewrite">Rewrite Selection</button>
        <div id="slangy-p-res-box" style="display:none">
          <div class="slangy-result-area" id="slangy-p-res-text"></div>
          <button class="slangy-copy-btn" id="slangy-p-copy">Copy Result</button>
        </div>
      `;
      document.body.appendChild(slangyPanel);

      const trigger = document.getElementById('slangy-p-trigger');
      const menu = document.getElementById('slangy-p-menu');
      trigger.onmousedown = (e) => e.preventDefault();
      trigger.onclick = () => menu.classList.toggle('active');

      menu.querySelectorAll('.slangy-dropdown-item').forEach(item => {
        item.onmousedown = (e) => e.preventDefault();
        item.onclick = (e) => {
          e.stopPropagation();
          currentStyle = item.getAttribute('data-val');
          document.getElementById('slangy-p-current-style').innerText = STYLES[currentStyle];
          menu.classList.remove('active');
        };
      });

      const rewriteBtn = document.getElementById('slangy-p-rewrite');
      rewriteBtn.onmousedown = (e) => e.preventDefault();
      rewriteBtn.onclick = runRewrite;
      document.getElementById('slangy-p-copy').onclick = (e) => {
        const text = document.getElementById('slangy-p-res-text').innerText;
        navigator.clipboard.writeText(text).then(() => {
          const btn = document.getElementById('slangy-p-copy');
          btn.innerText = "✨ Copied!";
          setTimeout(() => { btn.innerText = "Copy Result"; }, 2000);
        });
      };
    }

    const sx = window.pageXOffset || document.documentElement.scrollLeft;
    const sy = window.pageYOffset || document.documentElement.scrollTop;

    let left = selectionRect.left + sx;
    let top = selectionRect.bottom + sy + 15;

    if (left + 340 > window.innerWidth) left = window.innerWidth - 360;
    if (left < 10) left = 10;

    slangyPanel.style.left = `${left}px`;
    slangyPanel.style.top = `${top}px`;
    slangyPanel.style.display = 'block';

    document.getElementById('slangy-p-res-box').style.display = 'none';
    document.getElementById('slangy-p-rewrite').disabled = false;
    document.getElementById('slangy-p-rewrite').innerText = "Rewrite Selection";
  }

  function runRewrite() {
    if (!checkContext()) return;
    const btn = document.getElementById('slangy-p-rewrite');
    const resBox = document.getElementById('slangy-p-res-box');
    const resText = document.getElementById('slangy-p-res-text');

    btn.disabled = true;
    btn.innerText = "⚡ Thinking...";
    resText.innerText = "";

    // Manage user expectations for long (up to 2m) waits
    const timer1 = setTimeout(() => { if (btn.disabled) btn.innerText = "AI is processing (Hold on)..."; }, 15000);
    const timer2 = setTimeout(() => { if (btn.disabled) btn.innerText = "Generating (Wait ~1-2m)..."; }, 40000);

    chrome.runtime.sendMessage({
      action: 'rewriteText',
      text: selectedText,
      style: currentStyle
    }, r => {
      // Clear timers
      clearTimeout(timer1);
      clearTimeout(timer2);

      btn.disabled = false;
      btn.innerText = "Rewrite Selection";

      if (r && r.success) {
        resBox.style.display = 'block';
        resText.innerText = r.rewritten_text;
        slangyPanel.scrollTop = slangyPanel.scrollHeight;
      } else {
        alert("Rewrite Error: " + (r ? r.error : "API Timeout. Your AI seems to be taking more than 5 minutes or the extension context was lost."));
      }
    });
  }

})();
