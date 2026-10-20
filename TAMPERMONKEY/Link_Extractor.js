// ==UserScript==
// @name         Link Extractor
// @author       Timothé Maammar
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Menu to list, filter and copy all links of the current page at once
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  if (window.top !== window.self) return;

  const host = document.createElement('div');
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .panel {
        position: fixed; top: 20px; right: 20px; width: 440px; max-width: calc(100vw - 40px);
        background: #1e1e1e; color: #eee; border: 1px solid #444; border-radius: 10px;
        box-shadow: 0 4px 16px rgba(0,0,0,.5); z-index: 2147483647;
        font: 13px system-ui, sans-serif; padding: 12px; display: none;
      }
      .panel.open { display: block; }
      .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-weight: bold; }
      .close { cursor: pointer; padding: 0 6px; font-size: 16px; }
      .row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
      input[type=text] {
        flex: 1; min-width: 120px; background: #2c2c2c; color: #eee;
        border: 1px solid #555; border-radius: 6px; padding: 5px 8px;
      }
      label { display: flex; align-items: center; gap: 4px; cursor: pointer; }
      textarea {
        width: 100%; height: 260px; box-sizing: border-box; resize: vertical;
        background: #111; color: #9fd; border: 1px solid #444; border-radius: 6px;
        padding: 6px; font: 12px monospace; white-space: pre; overflow: auto;
      }
      button {
        background: #dc143c; color: #fff; border: 0; border-radius: 6px;
        padding: 6px 12px; cursor: pointer; font-weight: bold;
      }
      button:hover { filter: brightness(1.15); }
      .count { opacity: .7; }
    </style>
    <div class="panel">
      <div class="head"><span>Links <span class="count"></span></span><span class="close">&times;</span></div>
      <div class="row">
        <input type="text" placeholder="Filter (text in URL or link text)">
        <label><input type="checkbox" class="dedupe" checked> Unique</label>
        <label><input type="checkbox" class="ext"> External only</label>
      </div>
      <textarea readonly></textarea>
      <div class="row" style="margin:8px 0 0">
        <button class="copy">Copy all</button>
        <span class="msg"></span>
      </div>
    </div>
  `;

  const $ = (s) => shadow.querySelector(s);
  const panel = $('.panel');
  const filterInput = $('input[type=text]');
  const dedupe = $('.dedupe');
  const extOnly = $('.ext');
  const area = $('textarea');
  const count = $('.count');
  const msg = $('.msg');

  function isVisible(el) {
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function collect() {
    const needle = filterInput.value.trim().toLowerCase();
    let links = [];
    for (const a of document.querySelectorAll('a[href]')) {
      const href = a.href;
      if (!/^https?:/i.test(href)) continue;
      if (!isVisible(a)) continue;
      if (extOnly.checked && a.hostname === location.hostname) continue;
      if (needle && !href.toLowerCase().includes(needle) && !a.textContent.toLowerCase().includes(needle)) continue;
      links.push(href);
    }
    if (dedupe.checked) links = [...new Set(links)];
    return links;
  }

  function refresh() {
    const links = collect();
    area.value = links.join('\n');
    count.textContent = `(${links.length})`;
  }

  function toggle() {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) refresh();
  }

  filterInput.addEventListener('input', refresh);
  dedupe.addEventListener('change', refresh);
  extOnly.addEventListener('change', refresh);
  $('.close').addEventListener('click', () => panel.classList.remove('open'));
  $('.copy').addEventListener('click', () => {
    GM_setClipboard(area.value, 'text');
    msg.textContent = 'Copied!';
    setTimeout(() => (msg.textContent = ''), 1500);
  });

  GM_registerMenuCommand('Extract links from this page', toggle);
})();
