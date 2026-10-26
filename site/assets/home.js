// Radyssey home page: the draggable Graf toy.
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);

  // ---- Graf toy: a schematic hip. Drag the bony rim; alpha and the type follow. ----
  const svg = $('toy');
  if (svg) {
    const BY = 200, L = { x: 330, y: 340 };
    let target = 60, shown = 60, lastType = '';
    // each type wears an M3 container colour: green for mature, yellow for immature, red for critical, error for decentred
    const TYPES = [[60, 'Type I · mature', 'cart'], [50, 'Type II · immature, check age', 'rim'],
      [43, 'Type IIc/D · critical', 'base'], [0, 'Type III/IV · decentred', 'error']];
    const set = (id, a) => { const e = $(id); for (const k in a) e.setAttribute(k, a[k]); };
    function draw(a) {
      const r = a * Math.PI / 180, R = { x: L.x - (L.y - BY) / Math.tan(r), y: BY };
      // the head rests against the bony roof; as the roof flattens it rides out (up) and cranially (left)
      const P = { x: R.x + .45 * (L.x - R.x), y: BY + .45 * (L.y - BY) }, d = Math.max(0, 55 - a);
      const C = { x: P.x + Math.sin(r) * 78 - 1.2 * d, y: P.y - Math.cos(r) * 78 - 2.4 * d };
      // the iliac wing along the baseline, then the bony roof straight down the measured roof line (no bow, no kink)
      set('bone', { d: `M-10 ${BY} L${R.x} ${BY} L${L.x} ${L.y}` });
      set('roofL', { x1: R.x - (L.x - R.x) * .35, y1: BY - (L.y - BY) * .35, x2: L.x + (L.x - R.x) * .15, y2: L.y + (L.y - BY) * .15 });
      const lab = { x: C.x - 8, y: C.y - 80 };
      set('cartL', { x1: R.x, y1: BY, x2: lab.x + (lab.x - R.x) * .25, y2: lab.y + (lab.y - BY) * .25 });
      set('cartF', { d: `M${R.x} ${BY} L${lab.x} ${lab.y} Q${C.x - 50} ${C.y - 60} ${R.x + 14} ${BY + 6}Z` });
      set('head', { cx: C.x, cy: C.y }); set('headT', { x: C.x + 6, y: C.y + 5 });
      const ar = 48, e = { x: R.x + ar * Math.cos(r), y: BY + ar * Math.sin(r) };
      set('arc', { d: `M${R.x} ${BY} L${R.x + ar} ${BY} A${ar} ${ar} 0 0 1 ${e.x} ${e.y}Z` });
      set('arcT', { x: R.x + ar * 1.25 * Math.cos(r / 2) - 4, y: BY + ar * 1.25 * Math.sin(r / 2) + 8 });
      ['hRing', 'hDot', 'hHit'].forEach(id => set(id, { cx: R.x, cy: BY }));
      $('aVal').textContent = Math.round(a) + '°';
      const t = TYPES.find(t => Math.round(a) >= t[0]), b = $('badge');
      if (t[1] !== lastType) {
        b.textContent = t[1]; b.style.setProperty('--bg', `var(--md-${t[2]}-container)`); b.style.setProperty('--fg', `var(--md-on-${t[2]}-container)`); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
        if (t[0] === 60 && lastType) burst(b); lastType = t[1];
      }
    }
    // the lines follow the finger with a little lag, like a spring
    (function tick() { shown += (target - shown) * (reduce ? 1 : .18); draw(shown); requestAnimationFrame(tick); })();
    let drag = false;
    const toA = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse());
      return Math.max(30, Math.min(74, Math.atan2(L.y - BY, Math.max(1, L.x - q.x)) * 180 / Math.PI)); };
    $('handle').addEventListener('pointerdown', e => { drag = true; svg.setPointerCapture(e.pointerId); $('hRing').style.display = 'none'; });
    svg.addEventListener('pointermove', e => { if (drag) { target = toA(e); $('reset').classList.add('show'); } });
    svg.addEventListener('pointerup', () => drag = false);
    $('reset').onclick = () => { target = 60; $('reset').classList.remove('show'); };
    // a small wiggle on load so people see that it moves
    if (!reduce) setTimeout(() => { target = 48; setTimeout(() => target = 60, 900); }, 900);
    function burst(el) {
      if (reduce) return; const r = el.getBoundingClientRect();
      for (let i = 0; i < 10; i++) {
        const s = document.createElement('span'); s.className = 'rv-spark';
        s.style.cssText = 'position:absolute;width:7px;height:7px;border-radius:50%;pointer-events:none;z-index:50';
        s.style.background = ['var(--md-cart)', 'var(--md-rim)', 'var(--md-roof)'][i % 3];
        s.style.left = r.left + r.width / 2 + scrollX + 'px'; s.style.top = r.top + r.height / 2 + scrollY + 'px'; document.body.append(s);
        const ang = i / 10 * Math.PI * 2, dist = 40 + Math.random() * 30;
        s.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist}px) scale(.3)`, opacity: 0 }],
          { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => s.remove();
      }
    }
  }


  // ---- lesson cards: "Continue at step N" and the quiz score, from progress kept in this browser ----
  // (the whole card is already the link, so the chips are plain labels inside it)
  const LESSONS = { graf: { href: 'lessons/graf-hip-ultrasound/', steps: 12 } };
  for (const [id, L] of Object.entries(LESSONS)) {
    let p = {};
    try { p = JSON.parse(localStorage.getItem('radyssey:' + id)) || {}; } catch (e) { /* storage blocked: no chips */ }
    const link = document.querySelector(`#listing-lessons a[href*="${L.href}"]`), card = link && (link.querySelector('.quarto-grid-item') || link.closest('.quarto-grid-item'));
    if (!card || (!p.step && !p.answered)) continue;
    const row = document.createElement('div'); row.className = 'rv-progress';
    if (p.step > 0) { const a = document.createElement('span'); a.className = 'rv-chip on'; a.textContent = `Continue at step ${p.step + 1} of ${L.steps}`; row.append(a); }
    if (p.answered) { const q = document.createElement('span'); q.className = 'rv-chip'; q.textContent = p.answered === p.total ? `Quiz ${p.score} / ${p.total}` : `Quiz ${p.answered} of ${p.total} answered`; row.append(q); }
    (card.querySelector('.card-body') || card).append(row);
  }
})();
