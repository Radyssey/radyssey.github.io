/* Radyssey lesson kit: the parts every interactive lesson shares. A lesson page loads this before its own script and
   uses window.RVKit. The lesson keeps its own drawing code; the kit handles saved progress, the self-test, label
   placement on the image, the step progress bar and chips, the M3 ripple and the app bar.
   Progress is kept only in this browser (localStorage), never sent anywhere. */
(function () {
  "use strict";
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- progress in this browser: { step, quiz: [answer index or null] } per lesson ---- */
  function key(id) { return "radyssey:" + id; }
  function load(id) { try { return JSON.parse(localStorage.getItem(key(id))) || {}; } catch (e) { return {}; } }
  function save(id, patch) {
    var cur = load(id);
    for (var k in patch) cur[k] = patch[k];
    try { localStorage.setItem(key(id), JSON.stringify(cur)); } catch (e) { /* private mode: progress just isn't kept */ }
    return cur;
  }

  /* ---- M3 snackbar ---- */
  function snackbar(text, action, onAction) {
    var old = document.querySelector(".rv-snack"); if (old) old.remove();
    var s = document.createElement("div"); s.className = "rv-snack"; s.setAttribute("role", "status");
    s.innerHTML = "<span></span>"; s.firstChild.textContent = text;
    if (action) { var b = document.createElement("button"); b.textContent = action; b.onclick = function () { s.remove(); onAction(); }; s.appendChild(b); }
    document.body.appendChild(s);
    requestAnimationFrame(function () { s.classList.add("on"); });
    setTimeout(function () { s.classList.remove("on"); setTimeout(function () { s.remove(); }, 300); }, 6000);
  }

  /* ---- self-test: one answer per question, a running score, try again, and a results card ---- */
  function quiz(box, Q, id) {
    var answers = (load(id).quiz || []).slice(0, Q.length);
    while (answers.length < Q.length) answers.push(null);
    var head = document.createElement("div"); head.className = "rv-score"; box.appendChild(head);
    var cards = Q.map(function (q, qi) {
      var d = document.createElement("div"); d.className = "q card";
      var t = document.createElement("b"); t.textContent = (qi + 1) + ". " + q[0]; d.appendChild(t);
      var o = document.createElement("div"); o.className = "opts"; d.appendChild(o);
      var f = document.createElement("p"); f.className = "fb"; f.setAttribute("aria-live", "polite"); d.appendChild(f);
      var again = document.createElement("button"); again.className = "again"; again.textContent = "Try again";
      again.onclick = function () { answers[qi] = null; persist(); paint(qi); o.querySelector("button").focus(); };
      d.appendChild(again);
      q[1].forEach(function (x, i) {
        var b = document.createElement("button"); b.textContent = x;
        b.onclick = function () { if (answers[qi] !== null) return; answers[qi] = i; persist(); paint(qi); };
        o.appendChild(b);
      });
      box.appendChild(d);
      return { d: d, o: o, f: f, again: again };
    });
    var res = document.createElement("div"); res.className = "rv-result"; box.appendChild(res);
    function persist() {
      save(id, { quiz: answers, score: answers.filter(function (a, i) { return a === Q[i][2]; }).length,
                 answered: answers.filter(function (a) { return a !== null; }).length, total: Q.length });
      score();
    }
    function paint(qi) {
      var c = cards[qi], a = answers[qi], right = Q[qi][2];
      c.o.querySelectorAll("button").forEach(function (b, i) {
        b.disabled = a !== null;
        b.classList.toggle("right", a !== null && i === right);
        b.classList.toggle("wrong", a !== null && i === a && a !== right);
      });
      c.d.classList.toggle("done", a !== null);
      c.f.innerHTML = a === null ? "" : (a === right ? "<span class='ok'>✓ Correct.</span> " : "<span class='bad'>✗ Not quite.</span> ") + Q[qi][3];
      c.again.hidden = a === null || a === right;
    }
    function score() {
      var done = answers.filter(function (a) { return a !== null; }).length,
          ok = answers.filter(function (a, i) { return a === Q[i][2]; }).length;
      head.innerHTML = "<span>Score <b>" + ok + "</b> / " + Q.length + "</span><span>" + done + " of " + Q.length + " answered</span><i style='--p:" + (done / Q.length * 100) + "%'></i>";
      if (done === Q.length) {
        var msg = ok === Q.length ? "All correct. You can read a Graf image." : ok >= Q.length * .75 ? "Nearly there: revisit the questions marked wrong." : "Worth another pass through the steps, then try again.";
        res.innerHTML = "<p class='big'>" + ok + " of " + Q.length + " correct</p><p>" + msg + "</p>";
        var r = document.createElement("button"); r.className = "retake"; r.textContent = "Retake the quiz";
        r.onclick = function () { answers = answers.map(function () { return null; }); persist(); Q.forEach(function (_, i) { paint(i); }); box.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); };
        res.appendChild(r); res.hidden = false;
      } else { res.hidden = true; res.innerHTML = ""; }
    }
    Q.forEach(function (_, i) { paint(i); }); score();
    return { score: function () { return answers.filter(function (a, i) { return a === Q[i][2]; }).length; } };
  }

  /* ---- labels on the image: nudge a new label until it no longer overlaps one already placed ---- */
  var placed = [];
  function resetLabels() { placed = []; }
  function fit(g, svg) {
    var b = g.getBBox(), dy = 0, step = b.height + 4, tries = [0, 1, -1, 2, -2, 3, -3];
    for (var t = 0; t < tries.length; t++) {
      dy = tries[t] * step;
      var r = { x: b.x, y: b.y + dy, w: b.width, h: b.height };
      if (!placed.some(function (p) { return r.x < p.x + p.w && p.x < r.x + r.w && r.y < p.y + p.h && p.y < r.y + r.h; })) break;
    }
    if (dy) g.setAttribute("transform", "translate(0 " + dy + ")");
    placed.push({ x: b.x, y: b.y + dy, w: b.width, h: b.height });
  }

  /* ---- page chrome: step progress bar, chip states, ripple, app bar tint ---- */
  function chrome() {
    var steps = document.getElementById("steps"), prog = document.getElementById("prog"), lbl = document.getElementById("stepnum");
    if (steps && prog) {
      var sync = function () {
        var b = steps.querySelectorAll("button"), k = 0;
        b.forEach(function (x, j) { if (x.classList.contains("on")) k = j; });
        prog.style.width = ((k + 1) / b.length * 100) + "%"; lbl.textContent = "Step " + (k + 1) + " of " + b.length;
        var on = b[k]; if (on && steps.scrollWidth > steps.clientWidth) steps.scrollTo({ left: on.offsetLeft - steps.clientWidth / 2 + on.offsetWidth / 2, behavior: reduce ? "auto" : "smooth" });
      };
      new MutationObserver(sync).observe(steps, { subtree: true, attributes: true, attributeFilter: ["class"] }); sync();
    }
    document.querySelectorAll(".tools button[aria-pressed]").forEach(function (b) {
      if (b.id === "side") return; // the lesson sets this one itself
      b.addEventListener("click", function () { b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true"); });
    });
    document.addEventListener("pointerdown", function (e) {
      if (reduce) return; var el = e.target.closest("button,.iconbtn"); if (!el) return;
      var r = el.getBoundingClientRect(), d = Math.hypot(r.width, r.height) * 2, s = document.createElement("span"); s.className = "ripple";
      s.style.cssText = "width:" + d + "px;height:" + d + "px;left:" + (e.clientX - r.left - d / 2) + "px;top:" + (e.clientY - r.top - d / 2) + "px";
      el.appendChild(s); s.addEventListener("animationend", function () { s.remove(); });
    });
    addEventListener("scroll", function () { document.body.classList.toggle("scrolled", scrollY > 4); }, { passive: true });
  }

  window.RVKit = { load: load, save: save, snackbar: snackbar, quiz: quiz, resetLabels: resetLabels, fit: fit, chrome: chrome };
})();
