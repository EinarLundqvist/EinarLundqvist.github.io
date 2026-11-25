/* Cursor-following tooltip for .has-tip items (ported from the original portfolio). */
(function () {
  function init() {
    var items = document.querySelectorAll(".has-tip");
    if (!items.length) return;

    var tip = document.createElement("div");
    tip.className = "pf-tip";
    tip.setAttribute("role", "tooltip");
    document.body.appendChild(tip);

    function place(x, y) {
      var gap = 14, w = tip.offsetWidth, h = tip.offsetHeight;
      var left = x + gap, top = y + gap;
      if (left + w > innerWidth - 8) left = x - w - gap; // flip near the right edge
      if (top + h > innerHeight - 8) top = y - h - gap;  // flip near the bottom edge
      tip.style.transform = "translate(" + left + "px," + top + "px)";
    }
    function show(el, x, y) {
      if (el.dataset.color) tip.style.setProperty("--tip-ring", el.dataset.color);
      else tip.style.removeProperty("--tip-ring");
      tip.textContent = el.dataset.tip;
      place(x, y);
      tip.classList.add("is-on");
    }
    function hide() { tip.classList.remove("is-on"); }

    items.forEach(function (el) {
      el.addEventListener("pointerenter", function (e) {
        if (e.pointerType === "mouse") show(el, e.clientX, e.clientY);
      });
      el.addEventListener("pointermove", function (e) {
        if (e.pointerType === "mouse") place(e.clientX, e.clientY);
      });
      el.addEventListener("pointerleave", hide);
      el.addEventListener("focus", function () {
        var r = el.getBoundingClientRect();
        show(el, r.right, r.top);
      });
      el.addEventListener("blur", hide);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

/* Left-to-right ascii decipher on .pf-btn and project titles */
(function () {
  var GLYPHS = '.:-=+*#%@01/\\|<>'.split('');
  var DURATION = 700, BAND = 3, TRAIL = 4, TICK = 55;

  function setup(el, trigger) {
    var node = Array.prototype.find.call(el.childNodes, function (n) {
      return n.nodeType === 3 && n.textContent.trim();
    });
    if (!node) return;

    var text = node.textContent.trim();
    var wrap = document.createElement('span');
    wrap.className = 'pf-scramble';
    var sr = document.createElement('span');
    sr.className = 'pf-sr';
    sr.textContent = text;
    var vis = document.createElement('span');
    vis.setAttribute('aria-hidden', 'true');

    var chars = [], orig = [];
    text.split(/(\s+)/).forEach(function (part) {
      if (!part) return;
      if (/^\s+$/.test(part)) { vis.appendChild(document.createTextNode(' ')); return; }
      var word = document.createElement('span');
      word.className = 'pf-word';
      part.split('').forEach(function (c) {
        var s = document.createElement('span');
        s.className = 'pf-sc';
        s.textContent = c;
        word.appendChild(s);
        chars.push(s);
        orig.push(c);
      });
      vis.appendChild(word);
    });
    wrap.appendChild(sr);
    wrap.appendChild(vis);
    el.replaceChild(wrap, node);

    var running = false;
    var hovering = false;

    function setChar(i, value, glyph) {
      var c = chars[i];
      if (c.textContent !== value) c.textContent = value;
      c.classList.toggle('is-glyph', glyph);
    }

    function run() {
      if (running) return;
      running = true;

      var widths = chars.map(function (s) { return s.getBoundingClientRect().width; });
      wrap.classList.add('is-scrambling');
      chars.forEach(function (s, i) { s.style.width = widths[i] + 'px'; });

      var n = chars.length;
      var travel = n + BAND + TRAIL + 1;
      var seed = orig.map(function () { return Math.random(); });
      var jitter = orig.map(function () { return (Math.random() - 0.5) * 1.5; });
      var start = performance.now(), last = 0;

      function pick() { return GLYPHS[(Math.random() * GLYPHS.length) | 0]; }

      function frame(now) {
        var t = Math.min((now - start) / DURATION, 1);
        var head = (t * (2 - t)) * travel;
        var tick = now - last > TICK;
        if (tick) last = now;

        for (var i = 0; i < n; i++) {
          var d = head - i - jitter[i];
          if (d < 0) setChar(i, orig[i], false);
          else if (d < BAND) {
            if (tick || !chars[i].classList.contains('is-glyph')) setChar(i, pick(), true);
          } else if (d < BAND + TRAIL) {
            var p = (d - BAND) / TRAIL;
            if (seed[i] < p) setChar(i, orig[i], false);
            else if (tick) setChar(i, pick(), true);
          } else setChar(i, orig[i], false);
          chars[i].classList.toggle('is-lit', hovering && d >= 0);
        }

        if (t < 1) requestAnimationFrame(frame);
        else {
          chars.forEach(function (s, i) {
            setChar(i, orig[i], false);
            s.style.width = '';
            s.classList.toggle('is-lit', hovering);
          });
          wrap.classList.remove('is-scrambling');
          running = false;
        }
      }
      requestAnimationFrame(frame);
    }

    function on() { hovering = true; run(); }
    function off() {
      hovering = false;
      chars.forEach(function (s) { s.classList.remove('is-lit'); });
    }

    trigger.addEventListener('mouseenter', on);
    trigger.addEventListener('mouseleave', off);
    trigger.addEventListener('focus', function () {
      if (trigger.matches(':focus-visible')) on();
    });
    trigger.addEventListener('blur', off);
  }

  function init() {
    document.querySelectorAll('.pf-btn').forEach(function (b) { setup(b, b); });
    document.querySelectorAll('.pf-title').forEach(function (t) {
      setup(t, t.closest('.pf-link') || t);
    });
    // sidebar: main nav buttons + project sub-links
    document.querySelectorAll('#sidebar .nav-link > span, #sidebar .nav-sub-link > span').forEach(function (s) {
      setup(s, s.closest('a'));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* Typewriter that cycles phrases, with occasional typos it corrects */
(function () {
  var NEIGHBORS = {
    q:'wa', w:'qes', e:'wrd', r:'etf', t:'ryg', y:'tuh', u:'yij', i:'uok', o:'ipl', p:'ol',
    a:'qsz', s:'awdx', d:'sefc', f:'drgv', g:'fthb', h:'gyjn', j:'hukm', k:'jilm', l:'kop',
    z:'asx', x:'zsdc', c:'xdfv', v:'cfgb', b:'vghn', n:'bhjm', m:'njk'
  };
  var TYPE_MIN = 55, TYPE_MAX = 130; // ms per keystroke
  var ERASE = 35;                    // ms per backspace
  var HOLD = 1800;                   // ms a finished phrase stays on screen
  var GAP = 400;                     // ms pause before typing the next one
  var TYPO = 0.07;                   // chance of a typo per letter

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function rand(a, b) { return a + Math.random() * (b - a); }

  function setup(el) {
    var phrases = (el.dataset.phrases || '').split('|')
      .map(function (p) { return p.trim(); }).filter(Boolean);
    if (!phrases.length) return;

    var sr = document.createElement('span');
    sr.className = 'pf-sr';
    sr.textContent = phrases.join(', ');
    var text = document.createElement('span');
    text.setAttribute('aria-hidden', 'true');
    var cursor = document.createElement('span');
    cursor.className = 'pf-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    el.textContent = '';
    el.appendChild(sr);
    el.appendChild(text);
    el.appendChild(cursor);

    // remove this if you want the animation even with "reduce motion" on
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      text.textContent = phrases[0];
      return;
    }

    function render(s) { text.textContent = s; }

    async function typeOut(phrase) {
      el.classList.add('is-typing');
      var out = '';
      for (var i = 0; i < phrase.length; i++) {
        var ch = phrase[i];
        var near = NEIGHBORS[ch.toLowerCase()];
        if (near && Math.random() < TYPO) {
          var wrong = near[(Math.random() * near.length) | 0];
          if (ch !== ch.toLowerCase()) wrong = wrong.toUpperCase();
          out += wrong; render(out);
          // sometimes keep typing a letter before noticing the mistake
          var extra = (i + 1 < phrase.length && Math.random() < 0.4) ? 1 : 0;
          if (extra) { await sleep(rand(TYPE_MIN, TYPE_MAX)); out += phrase[i + 1]; render(out); }
          await sleep(rand(250, 450)); // "oh no"
          for (var b = 0; b < 1 + extra; b++) {
            out = out.slice(0, -1); render(out);
            await sleep(ERASE * 2);
          }
          await sleep(120);
        }
        out += ch; render(out);
        await sleep(rand(TYPE_MIN, TYPE_MAX));
      }
      el.classList.remove('is-typing');
    }

    async function eraseAll() {
      el.classList.add('is-typing');
      var s = text.textContent;
      while (s.length) {
        s = s.slice(0, -1); render(s);
        await sleep(ERASE);
      }
      el.classList.remove('is-typing');
    }

    (async function loop() {
      var i = 0;
      while (true) {
        await typeOut(phrases[i]);
        await sleep(HOLD);
        await eraseAll();
        await sleep(GAP);
        i = (i + 1) % phrases.length;
      }
    })();
  }

  function init() { document.querySelectorAll('.pf-typer').forEach(setup); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();




/* Little animated ASCII cat: blinks, swishes its tail, talks and shivers on click */
(function () {
  var TICK = 100;                       // ms per animation step
  var GLYPHS = '.:-=+*#%@01/\\|<>'.split('');
  var SHIVER_MS = 900, BAND = 2, HOLD = SAY_MS-SHIVER_MS, SAY_MS = 2700;
  var LINES = [
    'you found me', 'I need shell texturing', 'I hate water! Especially wet water!', '"Fear me, if you dare!"', 'planning my revenge on Schrödinger', '"I hate mondays"', 
  ];

  var BODY = [
    ' ／l、',
    '=({l}､ {r} ７',
    '  >   <⸜⸌   ',
    '  | ､  ヽ､',
    '  ししf_¨)'
  ];
  var EYES_OPEN = ['ﾟ', '｡'];
  var EYES_SHUT = ['¯', '_'];

  var TAIL = [
    ['  ', '\uE000⟆ ', '丿 '],
    ['  ', '\uE000ʃ ', '丿 '],
    ['  ', '\uE000| ', '丿 '],
    ['  ', '\uE000ʅ ', '丿 '],
    ['  ', '\uE000⟅ ', '丿 ']
  ];
  var TAIL_ORDER = [0, 0, 1, 1, 2, 3, 3, 4, 4, 3, 3, 2, 1, 1, 0, 0];

  function isWide(ch) {
    var n = ch.codePointAt(0);
    return (n >= 0x1100 && n <= 0x115f) || (n >= 0x2e80 && n <= 0xa4cf) ||
           (n >= 0xac00 && n <= 0xd7a3) || (n >= 0xf900 && n <= 0xfaff) ||
           (n >= 0xfe30 && n <= 0xfe6f) || (n >= 0xff00 && n <= 0xff60) ||
           (n >= 0xffe0 && n <= 0xffe6);
  }
  function esc(ch) {
    return ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch;
  }
  function toHtml(text) {
    return Array.from(text).map(function (ch) {
      if (ch === '\uE000') return '<span class="nudge"></span>';
      if (ch.charCodeAt(0) < 128) return esc(ch);
      return '<span class="w' + (isWide(ch) ? 2 : 1) + '">' + ch + '</span>';
    }).join('');
  }
  // same widths as the real characters, so the cat doesn't wobble sideways
  function scrambleRow(line) {
    return Array.from(line).map(function (ch) {
      if (ch === ' ' || ch === '\uE000') return toHtml(ch);
      var g = GLYPHS[(Math.random() * GLYPHS.length) | 0];
      return '<span class="w' + (isWide(ch) ? 2 : 1) + '">' + esc(g) + '</span>';
    }).join('');
  }

  function draw(eyes, tailIdx) {
    var tail = TAIL[tailIdx];
    return BODY.map(function (row, i) {
      row = row.replace('{l}', eyes[0]).replace('{r}', eyes[1]);
      return i >= 2 ? row + tail[i - 2] : row;
    }).join('\n');
  }

  function init() {
    var pre = document.createElement('pre');
    pre.className = 'pf-cat';
    pre.setAttribute('aria-hidden', 'true');
    document.body.appendChild(pre);

    var bubble = document.createElement('div');
    bubble.className = 'pf-cat-say';
    bubble.setAttribute('role', 'status');
    document.body.appendChild(bubble);

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var step = 0, blink = 0, nextBlink = 12, hover = false;
    var eyes = EYES_OPEN, tailIdx = 0;
    var fx = null, fxTimer = 0, fxId = 0;   // fx.head = row the shiver has reached

    function paint() {
      var head = fx ? fx.head : -1;
      var html = draw(eyes, tailIdx).split('\n').map(function (line, i) {
        if (!fx || i >= head) return toHtml(line);
        var inner = i >= head - BAND ? scrambleRow(line) : toHtml(line);
        return '<em class="lit">' + inner + '</em>';
      }).join('\n');
      pre.innerHTML = html;
      pre.classList.toggle('is-fx', !!fx);
    }

    function shiver() {
      clearInterval(fxTimer);
      var id = ++fxId, t0 = performance.now();
      fx = { head: 0 };
      fxTimer = setInterval(function () {
        var t = Math.min((performance.now() - t0) / SHIVER_MS, 1);
        fx.head = t * (BODY.length + BAND);
        if (t >= 1) {
          clearInterval(fxTimer);
          fx.head = Infinity;                       // everything lit, nothing scrambled
          setTimeout(function () { if (id === fxId) { fx = null; paint(); } }, HOLD);
        }
        paint();
      }, 50);
    }

    var bag = [], sayTimer = 0;
    function say() {
      if (!bag.length) bag = LINES.slice().sort(function () { return Math.random() - .5; });
      bubble.textContent = bag.pop();
      var r = pre.getBoundingClientRect();
      bubble.style.right = Math.max(8, innerWidth - r.right) + 'px';
      bubble.style.bottom = (innerHeight - r.top + 10) + 'px';
      bubble.classList.add('is-on');
      clearTimeout(sayTimer);
      sayTimer = setTimeout(function () { bubble.classList.remove('is-on'); }, SAY_MS);
    }

    function hasSelection() {
      var s = window.getSelection();
      return s && !s.isCollapsed && pre.contains(s.anchorNode);
    }

    pre.addEventListener('mouseenter', function () { hover = true; });
    pre.addEventListener('mouseleave', function () { hover = false; });
    pre.addEventListener('click', function () {
      if (hasSelection()) return;               // dragging to copy shouldn't trigger it
      say();
      if (!reduced) shiver();
    });

    paint();
    if (reduced) return;

    setInterval(function () {
      if ((hover && !fx) || hasSelection()) return;  // freeze so selecting/copying works
      step++;
      eyes = EYES_OPEN;
      if (blink > 0) { eyes = EYES_SHUT; blink--; }
      else if (--nextBlink <= 0) { blink = 1; nextBlink = 10 + Math.floor(Math.random() * 15); }
      tailIdx = TAIL_ORDER[Math.floor(step / 2) % TAIL_ORDER.length];
      paint();
    }, TICK);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  if (typeof module !== 'undefined') module.exports = { draw: draw, toHtml: toHtml, isWide: isWide };
})();