// Radyssey home page: the draggable Graf toy and the lesson route that draws itself.
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) document.documentElement.classList.add('rv-motion');
  const $ = id => document.getElementById(id);

  // ---- Graf toy: a schematic hip. Drag the bony rim; alpha and the type follow. ----
  const svg = $('toy');
  if (svg) {
    const BY = 200, L = { x: 330, y: 340 };
    let target = 60, shown = 60, lastType = '';
    const TYPES = [[60, 'Type I · mature', 'var(--rv-cart)'], [50, 'Type II · immature, check age', 'var(--rv-rim)'],
      [43, 'Type IIc/D · critical', 'var(--rv-base)'], [0, 'Type III/IV · decentred', 'var(--rv-brand)']];
    const set = (id, a) => { const e = $(id); for (const k in a) e.setAttribute(k, a[k]); };
    function draw(a) {
      const r = a * Math.PI / 180, R = { x: L.x - (L.y - BY) / Math.tan(r), y: BY };
      // the head rests against the bony roof; as the roof flattens it rides out (up) and cranially (left)
      const P = { x: R.x + .45 * (L.x - R.x), y: BY + .45 * (L.y - BY) }, d = Math.max(0, 55 - a);
      const C = { x: P.x + Math.sin(r) * 78 - 1.2 * d, y: P.y - Math.cos(r) * 78 - 2.4 * d };
      set('bone', { d: `M-10 ${BY} L${R.x} ${BY} Q${(R.x + L.x) / 2 - 10} ${(BY + L.y) / 2 + 8} ${L.x} ${L.y} l20 40` });
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
        b.textContent = t[1]; b.style.setProperty('--t', t[2]); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
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
        s.style.background = ['var(--rv-cart)', 'var(--rv-rim)', 'var(--rv-roof)'][i % 3];
        s.style.left = r.left + r.width / 2 + scrollX + 'px'; s.style.top = r.top + r.height / 2 + scrollY + 'px'; document.body.append(s);
        const ang = i / 10 * Math.PI * 2, dist = 40 + Math.random() * 30;
        s.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist}px) scale(.3)`, opacity: 0 }],
          { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => s.remove();
      }
    }
  }

  // ---- Route: a wavy line that draws itself as you scroll ----
  const route = $('route');
  if (route) {
    const pl = $('pline'), pp = $('pp'), pbg = $('pbg');
    function layout() {
      const h = route.offsetHeight, mob = innerWidth <= 860;
      pl.setAttribute('viewBox', `0 0 ${mob ? 2 : 240} ${h}`);
      let d = mob ? `M1 0 L1 ${h}` : 'M120 0';
      if (!mob) for (let y = 0; y < h; y += 170) d += ` C${y / 170 % 2 ? 20 : 220} ${y + 60} ${y / 170 % 2 ? 20 : 220} ${y + 110} 120 ${y + 170}`;
      pp.setAttribute('d', d); pbg.setAttribute('d', d);
      const len = pp.getTotalLength(); pp.style.strokeDasharray = len; pp.dataset.len = len; prog();
    }
    function prog() { const r = route.getBoundingClientRect(), p = Math.max(0, Math.min(1, (innerHeight * .7 - r.top) / r.height));
      pp.style.strokeDashoffset = pp.dataset.len * (1 - (reduce ? 1 : p)); }
    addEventListener('resize', layout); addEventListener('scroll', prog, { passive: true }); layout();
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }), { threshold: .3 });
    route.querySelectorAll('.stop').forEach(s => io.observe(s));
  }
})();
