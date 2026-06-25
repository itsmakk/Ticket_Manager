/* dark-mode.js - Toggles .dark-mode class on <html>
 * CSS variables in style.css handle all color changes.
 */
(function(){
  var KEY = 'theme';
  var CLS = 'dark-mode';

  function preferred() {
    var stored = localStorage.getItem(KEY);
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function set(t) {
    document.documentElement.classList.toggle(CLS, t === 'dark');
    localStorage.setItem(KEY, t);
    var btn = document.getElementById('dm-toggle-btn');
    if (btn) btn.innerHTML = t === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19';
  }

  function injectButton() {
    var nav = document.querySelector('.nav');
    var sidebar = document.querySelector('.admin-sidebar');
    var container = nav || sidebar;

    if (!container) return;
    if (document.getElementById('dm-toggle-btn')) return;

    var btn = document.createElement('button');
    btn.id = 'dm-toggle-btn';
    if (sidebar) btn.className = 'dm-admin';
    btn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:1.15rem;line-height:1;padding:0.4rem 0.5rem;border-radius:6px;transition:all 0.2s;color:var(--header-text);display:inline-flex;align-items:center;gap:6px;';
    if (sidebar) {
      btn.style.cssText = 'background:none;border:none;cursor:pointer;width:100%;padding:0.6rem 0.75rem;font-size:0.9rem;border-radius:6px;color:var(--sidebar-text);display:inline-flex;align-items:center;gap:6px;';
    }
    btn.onmouseenter = function() { this.style.background = 'rgba(128,128,128,0.15)'; };
    btn.onmouseleave = function() { this.style.background = 'none'; };
    btn.onclick = function() {
      var isDark = document.documentElement.classList.contains(CLS);
      set(isDark ? 'light' : 'dark');
    };

    if (nav) {
      container.appendChild(btn);
    } else if (sidebar) {
      var hr = document.createElement('hr');
      hr.style.cssText = 'border:none;border-top:1px solid rgba(255,255,255,0.1);margin:0.75rem 0;';
      var wrapper = document.createElement('div');
      wrapper.appendChild(hr);
      wrapper.appendChild(btn);
      container.appendChild(wrapper);
    }

    set(preferred());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    injectButton();
  }
})();
