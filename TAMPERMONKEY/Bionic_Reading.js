// ==UserScript==
// @name         Bionic Reading Toggle
// @namespace    perso.bionic-reading
// @version      0.1.0
// @description  Bolds the beginning of each word to help you read faster. Toggle with Alt+B.
// @author       Timothé Maammar
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // Fraction of each word to bold (0.4 = 40% of the letters from the start)
  const RATIO = 0.45;

  // Tags whose text we never touch
  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT',
    'OPTION', 'IFRAME', 'CODE', 'PRE', 'svg', 'TITLE'
  ]);

  let processed = false;
  let active = false;
  let observer = null;

  GM_addStyle(`
    .bionic-bold {
      font-weight: inherit;
    }
    body.bionic-active .bionic-bold {
      font-weight: 700;
    }
  `);

  function shouldSkip(node) {
    let el = node.parentElement;
    if (!el) return true;
    if (el.closest('[contenteditable="true"]')) return true;
    while (el) {
      if (SKIP_TAGS.has(el.tagName)) return true;
      if (el.classList && el.classList.contains('bionic-bold')) return true;
      el = el.parentElement;
    }
    return false;
  }

  function processTextNode(node) {
    const text = node.nodeValue;
    if (!text || !text.trim()) return;
    if (shouldSkip(node)) return;

    const regex = /[\p{L}’'\-]+/gu;
    let lastIndex = 0;
    let match;
    let didWork = false;
    const frag = document.createDocumentFragment();

    while ((match = regex.exec(text)) !== null) {
      didWork = true;
      if (match.index > lastIndex) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      const word = match[0];
      const boldLen = Math.max(1, Math.ceil(word.length * RATIO));
      const b = document.createElement('b');
      b.className = 'bionic-bold';
      b.textContent = word.slice(0, boldLen);
      frag.appendChild(b);
      if (boldLen < word.length) {
        frag.appendChild(document.createTextNode(word.slice(boldLen)));
      }
      lastIndex = regex.lastIndex;
    }

    if (!didWork) return;
    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    node.parentNode.replaceChild(frag, node);
  }

  function walkAndProcess(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(processTextNode);
  }

  function processPage() {
    walkAndProcess(document.body);
    processed = true;

    // Handles content added dynamically (lazy load, infinite scroll...)
    observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((added) => {
          if (added.nodeType === Node.ELEMENT_NODE) {
            walkAndProcess(added);
          } else if (added.nodeType === Node.TEXT_NODE) {
            processTextNode(added);
          }
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function toggle() {
    if (!processed) processPage();
    active = !active;
    document.body.classList.toggle('bionic-active', active);
  }

  window.addEventListener('keydown', (e) => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'b') {
      toggle();
    }
  });

  GM_registerMenuCommand('Toggle Bionic Reading (Alt+B)', toggle);
})();
