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
    var raw = node.textContent;
    if (/^\s/.test(raw)) el.insertBefore(document.createTextNode(' '), node);
    if (/\s$/.test(raw)) el.insertBefore(document.createTextNode(' '), node.nextSibling);
    el.replaceChild(wrap, node);

    var raf = 0;
    var hovering = false;

    function setChar(i, value, glyph) {
      var c = chars[i];
      if (c.textContent !== value) c.textContent = value;
      c.classList.toggle('is-glyph', glyph);
    }

    function run() {
      cancelAnimationFrame(raf);   // stop any run in progress

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

        if (t < 1) raf = requestAnimationFrame(frame);
        else {
          chars.forEach(function (s, i) {
            setChar(i, orig[i], false);
            s.style.width = '';
            s.classList.toggle('is-lit', hovering);
          });
          wrap.classList.remove('is-scrambling');
        }
      }
      raf = requestAnimationFrame(frame)
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

    // all other text links
    var LINKS = '.content a, #panel-wrapper a, footer a, #breadcrumb a';
    var SKIP = '.pf-btn, .pf-link, .img-link, .popup, .anchor';
    document.querySelectorAll(LINKS).forEach(function (a) {
      if (!a.matches(SKIP)) setup(a, a);
    });
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
  var SHIVER_MS = 900, BAND = 2, SAY_MS = 2700, HOLD = SAY_MS - SHIVER_MS;
  var LINES = ['I need shell texturing', 'Planning my revenge on Schrödinger', '"I hate mondays"', 'I hate water! Especially wet water!', '"Fear me, if you dare!"'];

  var BODY = [
    ' ／l、',
    '=({l}､ {r} ７',
    '  >  <⸜⸌   ',
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

    var sayTimer = 0;
    function say() {
      var next = 0;
      try { next = Number(sessionStorage.getItem('pf-cat-line')) || 0; } catch (e) {}
      bubble.textContent = LINES[next % LINES.length];
      try { sessionStorage.setItem('pf-cat-line', (next + 1) % LINES.length); } catch (e) {}

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


/* Arrow buttons and dots that cycle through a post's videos */
(function () {
  function init() {
    document.querySelectorAll('.pf-carousel').forEach(function (box) {
      var list = (box.dataset.videos || '').split('|').filter(Boolean);
      if (list.length < 2) return;
      var video = box.querySelector('video');
      var i = 0;

      var bar = document.createElement('div');
      bar.className = 'pf-dots';
      var dots = list.map(function (src, n) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'pf-dot';
        dot.setAttribute('aria-label', 'Video ' + (n + 1) + ' of ' + list.length);
        dot.addEventListener('click', function () { show(n); });
        bar.appendChild(dot);
        return dot;
      });
      box.appendChild(bar);

      function mark() {
        dots.forEach(function (dot, n) {
          dot.classList.toggle('is-on', n === i);
          dot.setAttribute('aria-current', n === i ? 'true' : 'false');
        });
      }

      function show(n) {
        n = (n + list.length) % list.length;
        if (n === i) return;
        i = n;
        video.removeAttribute('poster');
        video.muted = true;
        video.src = list[i];
        video.load();
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
        video.addEventListener('canplay', function onReady() {
          video.removeEventListener('canplay', onReady);
          if (video.paused) video.play().catch(function () {});
        });
        mark();
      }

      box.querySelector('.pf-prev').addEventListener('click', function () { show(i - 1); });
      box.querySelector('.pf-next').addEventListener('click', function () { show(i + 1); });
      mark();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();



/* Make muted looping videos start reliably */
(function () {
  function tryPlay(v) {
    v.muted = true;          // set the property, not just the attribute
    v.defaultMuted = true;
    v.playsInline = true;
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }

  function setup(v) {
    if (v.dataset.apReady) return;
    v.dataset.apReady = '1';

    var visible = true;

    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;

    // retry as data arrives
    ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough'].forEach(function (ev) {
      v.addEventListener(ev, function () {
        if (v.paused && visible) tryPlay(v);
      });
    });

    // play when on screen, pause when off screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) tryPlay(v); else v.pause();
      }, { threshold: 0.1 }).observe(v);
    } else {
      tryPlay(v);
    }

    tryPlay(v);
  }

  function init() {
    var vids = document.querySelectorAll('video[autoplay], .pf-carousel video, .pf-post-video');
    vids.forEach(setup);
  }

  // recover when the tab or page comes back (tab switch, back/forward cache)
  function resume() {
    document.querySelectorAll('video[data-ap-ready]').forEach(function (v) {
      if (v.paused) tryPlay(v);
    });
  }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) resume();
  });
  window.addEventListener('pageshow', resume);

  // last resort: first user interaction (e.g. Low Power Mode on iOS)
  ['pointerdown', 'touchstart', 'keydown', 'scroll'].forEach(function (ev) {
    window.addEventListener(ev, resume, { once: true, passive: true });
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.addEventListener('load', init); // catches anything injected late
})();




(function () {
  /* ---- settings (from your effect panel) ---- */
  var CFG = {
    posX: 0.493,        // Position X 49.3
    posY: 0.82,         // pivot the strip stretches from (measured from your reference)
    stretchY: 1.0,      // Stretch Y 100
    amount: 39,         // Amount
    flat: 0.247,        // half-width fraction around the centre that stays perfectly flat
    reach: 0.477,       // how far (fraction of width) the ease-in-out-cubic ramp runs past the flat zone
    dispersion: 100,    // Chrom. Dispersion
    sides: 2,           // Two (symmetric left/right)
    speed: 28,          // px/sec auto-drift (0 = static)
    gap: 104,           // px between the About Me button and the top of the strip
    footGap: 6,         // px between the bottom of the images and the footer
    band: [0.357, 0.879]  // top/bottom of the flat strip inside the canvas (0..1)
  };
  var TILE_W = 486, TILE_H = 320, GAP = 5;

  var root = document.querySelector('.pf-bend');
  if (!root) return;
  var canvas = root.querySelector('.pf-bend-canvas');
  var items = [].slice.call(root.querySelectorAll('.pf-bend-src li'));
  var gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true });
  if (!gl || !items.length) { root.style.display = 'none'; return; }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- shader ---- */
  var VS = 'attribute vec2 p;varying vec2 uv;void main(){uv=vec2(p.x*.5+.5,1.-(p.y*.5+.5));gl_Position=vec4(p,0.,1.);}';
  var FS = [
    'precision highp float;',
    'varying vec2 uv;',
    'uniform sampler2D tex;',
    'uniform vec2 res;',
    'uniform float scroll,stripW,k,disp,posX,pivot,y0,y1,flat_,reach;',
    'float ease(float t){return t<.5?4.*t*t*t:1.-pow(-2.*t+2.,3.)/2.;}',
    'vec4 samp(float ch){',
    '  float e=ease(clamp((abs(uv.x-posX)-flat_)/reach,0.,1.));',
    '  float kc=k*(1.+ch*disp*.06);',
    '  float sy=pivot+(uv.y-pivot)/(1.+kc*e);',
    '  float v=(sy-y0)/(y1-y0);',
    '  if(v<0.||v>1.) return vec4(0.);',
    '  float px=uv.x*res.x+ch*disp*e*res.x*.0035;',
    '  float u=fract((px+scroll)/stripW);',
    '  return texture2D(tex,vec2(u,v));',
    '}',
    'void main(){',
    '  vec4 r=samp(1.),g=samp(0.),b=samp(-1.);',
    '  gl_FragColor=vec4(r.r,g.g,b.b,max(r.a,max(g.a,b.a)));',
    '}'
  ].join('\n');

  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s;
  }
  var prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { root.style.display = 'none'; return; }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var U = {};
  ['tex','res','scroll','stripW','k','disp','posX','pivot','y0','y1','flat_','reach'].forEach(function (n) {
    U[n] = gl.getUniformLocation(prog, n);
  });

  /* ---- build the tile atlas ---- */
  var tiles = [];   // {img, href}
  var loaded = 0;
  items.forEach(function (li) {
    var img = new Image();
    img.onload = img.onerror = function () {
      if (img.naturalWidth) tiles.push({ img: img, href: li.dataset.href });
      if (++loaded === items.length) buildAtlas();
    };
    img.src = li.dataset.src;
  });

  var tileCount = 0, ready = false;
  function buildAtlas() {
    if (!tiles.length) { root.style.display = 'none'; return; }
    var list = tiles.slice();
    while (list.length < 4) list = list.concat(tiles);   // repeat if few posts
    list = list.slice(0, 8);
    tileCount = list.length;
    tiles = list;

    var c = document.createElement('canvas');
    c.width = TILE_W * tileCount; c.height = TILE_H;
    var x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
    list.forEach(function (t, i) {
      var iw = t.img.naturalWidth, ih = t.img.naturalHeight;
      var w = TILE_W - GAP * 2, h = TILE_H;
      var s = Math.max(w / iw, h / ih);
      var sw = w / s, sh_ = h / s;
      x.drawImage(t.img, (iw - sw) / 2, (ih - sh_) / 2, sw, sh_, i * TILE_W + GAP, 0, w, h);
    });

    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(U.tex, 0);
    ready = true;
    resize();
    root.classList.add('is-ready');
    start();
  }

  /* ---- sizing / render ---- */
  var W = 1, H = 1, dpr = 1, stripW = 1;
  var scroll = 0, vel = 0, dragging = false, lastX = 0, moved = 0, last = 0, raf = 0, visible = true;
  var K = 0.608 * (CFG.amount / 39) * CFG.stretchY;   // fitted so amount 39 matches the reference

  /* stretch the section to the full width of the page area (edge to edge, right of the sidebar) */
  function fit() {
    root.style.width = ''; root.style.marginLeft = '0px';
    var r = root.getBoundingClientRect();
    var sb = document.getElementById('sidebar');
    var sbR = 0;
    if (sb) { var b = sb.getBoundingClientRect(); if (b.right > 0 && b.width > 0) sbR = b.right; }
    var vw = document.documentElement.clientWidth;
    root.style.width = (vw - sbR) + 'px';
    root.style.marginLeft = (sbR - r.left) + 'px';

    /* the canvas has empty space above the band: pull it up so the gap under the button is just CFG.gap px */
    var h = canvas.getBoundingClientRect().height;
    root.style.marginTop = (CFG.gap - CFG.band[0] * h) + 'px';
    /* the canvas also has empty space below the band: trim it so the footer sits close */
    root.style.marginBottom = (CFG.footGap - (1 - 0.91) * h) + 'px';
  }

  function resize() {
    fit();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width * dpr));
    H = Math.max(1, Math.round(r.height * dpr));
    canvas.width = W; canvas.height = H;
    gl.viewport(0, 0, W, H);
    var bandH = (CFG.band[1] - CFG.band[0]) * H;
    stripW = bandH * (TILE_W / TILE_H) * tileCount;
    draw();
  }

  function draw() {
    if (!ready) return;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.res, W, H);
    gl.uniform1f(U.scroll, scroll * dpr);
    gl.uniform1f(U.stripW, stripW);
    gl.uniform1f(U.k, K);
    gl.uniform1f(U.disp, CFG.dispersion / 100);
    gl.uniform1f(U.posX, CFG.posX);
    gl.uniform1f(U.pivot, CFG.posY);
    gl.uniform1f(U.y0, CFG.band[0]);
    gl.uniform1f(U.y1, CFG.band[1]);
    gl.uniform1f(U.flat_, CFG.flat);
    gl.uniform1f(U.reach, CFG.reach);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function frame(t) {
    raf = 0;
    var dt = Math.min((t - last) / 1000, 0.05); last = t;
    if (!dragging) {
      scroll += (reduce ? 0 : CFG.speed) * dt + vel * dt;
      vel *= Math.pow(0.04, dt);           // inertia decay
      if (Math.abs(vel) < 1) vel = 0;
    }
    draw();
    if (visible && !reduce) raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  /* ---- interaction: drag to scrub, click a tile to open the post ---- */
  /* which tile (if any) is under the pointer? -1 when the pointer is on the empty area around the images */
  function hitTile(cx, cy) {
    if (!ready) return -1;
    var r = canvas.getBoundingClientRect();
    var ux = (cx - r.left) / r.width, uy = (cy - r.top) / r.height;
    var t = Math.min(Math.max((Math.abs(ux - CFG.posX) - CFG.flat) / CFG.reach, 0), 1);
    var e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    var sy = CFG.posY + (uy - CFG.posY) / (1 + K * e);
    var v = (sy - CFG.band[0]) / (CFG.band[1] - CFG.band[0]);
    if (v < 0 || v > 1) return -1;
    var u = (((ux * W + scroll * dpr) / stripW) % 1 + 1) % 1;
    return Math.min(tileCount - 1, Math.floor(u * tileCount));
  }

  /* only the images react: dragging starts on an image, and the empty area is ignored */
  canvas.addEventListener('pointerdown', function (e) {
    if (hitTile(e.clientX, e.clientY) < 0) return;
    dragging = true; moved = 0; lastX = e.clientX; vel = 0;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-drag');
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX; lastX = e.clientX;
    moved += Math.abs(dx);
    scroll -= dx;
    vel = -dx * 60;
    if (reduce) draw();
  });
  /* The canvas is taller than the images (empty space above/below), so on mouse devices it only
     catches the pointer while it is over an image; everywhere else clicks pass through to the page
     (About Me button, project links, footer). Touch screens keep it always on. */
  if (window.matchMedia('(hover: hover)').matches) {
    canvas.style.pointerEvents = 'none';
    document.addEventListener('pointermove', function (e) {
      if (dragging) return;
      var over = hitTile(e.clientX, e.clientY) >= 0;
      canvas.style.pointerEvents = over ? 'auto' : 'none';
      canvas.classList.toggle('is-over', over);
    });
  }
  function up(e) {
    if (!dragging) return;
    dragging = false; canvas.classList.remove('is-drag');
    if (moved < 5) {
      var i = hitTile(e.clientX, e.clientY);
      if (i >= 0 && tiles[i] && tiles[i].href) window.location.href = tiles[i].href;
    }
  }
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', function () { dragging = false; canvas.classList.remove('is-drag'); });

  /* ---- lifecycle ---- */
  window.addEventListener('resize', resize);
  fit();
  window.addEventListener('load', function () { if (ready) resize(); else fit(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      if (visible && ready) start();
    }).observe(root);
  }
})();