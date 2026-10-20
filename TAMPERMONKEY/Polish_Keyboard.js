// ==UserScript==
// @name         Polish Characters Keyboard
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Toggleable floating panel of Polish diacritic characters (ą ć ę ł ń ó ś ź ż) that inserts into whatever field is currently focused
// @author       Timothé Maammar
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const CHARS = ['ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż'];

  function insertChar(ch) {
    const el = document.activeElement;
    if (!el) return;

    const tag = el.tagName;
    const isTextInput =
      tag === 'TEXTAREA' ||
      (tag === 'INPUT' && /^(text|search|url|tel|password|email|number)$/i.test(el.type || 'text'));

    if (isTextInput) {
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const val = el.value;
      el.value = val.slice(0, start) + ch + val.slice(end);
      const newPos = start + ch.length;
      el.selectionStart = el.selectionEnd = newPos;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (el.isContentEditable) {
      document.execCommand('insertText', false, ch);
    }
  }

  // Host element + shadow DOM so the panel's styles never collide with the page's CSS
  const host = document.createElement('div');
  host.id = 'pl-kbd-host';
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    .toggle {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #dc143c;
      color: #fff;
      font: bold 13px system-ui, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      z-index: 2147483647;
      user-select: none;
    }
    .toggle:hover { filter: brightness(1.1); }
    .panel {
      position: fixed;
      bottom: 72px;
      right: 20px;
      background: #1e1e1e;
      border: 1px solid #444;
      border-radius: 10px;
      padding: 10px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.45);
      z-index: 2147483647;
      display: none;
      font: 13px system-ui, sans-serif;
    }
    .panel.open { display: block; }
    .row {
      display: flex;
      gap: 6px;
      margin-bottom: 6px;
    }
    .row:last-child { margin-bottom: 0; }
    .key {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: 1px solid #555;
      background: #2c2c2c;
      color: #f0f0f0;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .key:hover { background: #3a3a3a; border-color: #dc143c; }
    .key:active { background: #dc143c; }
  `;
  shadow.appendChild(style);

  const toggle = document.createElement('div');
  toggle.className = 'toggle';
  toggle.textContent = 'PL';
  toggle.title = 'Toggle Polish characters keyboard';
  shadow.appendChild(toggle);

  const panel = document.createElement('div');
  panel.className = 'panel';
  shadow.appendChild(panel);

  function buildRow(chars) {
    const row = document.createElement('div');
    row.className = 'row';
    chars.forEach((ch) => {
      const btn = document.createElement('div');
      btn.className = 'key';
      btn.textContent = ch;
      // mousedown + preventDefault keeps focus (and cursor position) on the originally focused field instead of shifting it to this button
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        insertChar(ch);
      });
      row.appendChild(btn);
    });
    return row;
  }

  panel.appendChild(buildRow(CHARS));
  panel.appendChild(buildRow(CHARS.map((c) => c.toUpperCase())));

  toggle.addEventListener('click', () => {
    panel.classList.toggle('open');
  });
})();
