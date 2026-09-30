/* Schematic Manhattan plot for the home page hero. */
(function () {
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/* ── Schematic Manhattan plot (hero) ─────────────────────────────
   Chromosome lengths are GRCh38 (Mb). Background points are drawn from
   a null distribution with a fixed seed; peaks sit at known Parkinson's
   disease risk loci. Heights are illustrative, not study results. */
(function () {
  const canvas = document.getElementById('manhattan');
  const box = document.getElementById('trackPlot');
  const cursor = document.getElementById('trackCursor');
  if (!canvas || !canvas.getContext) return;

  const CHR = [248.96,242.19,198.30,190.21,181.54,170.81,159.35,145.14,138.39,133.80,135.09,133.28,114.36,107.04,101.99,90.34,83.26,80.37,58.62,64.44,46.71,50.82];
  const OFF = []; let TOTAL = 0;
  CHR.forEach(l => { OFF.push(TOTAL); TOTAL += l; });

  const PEAKS = [
    { c: 1,  pos: 155.2, h: 21, label: 'GBA1' },
    { c: 2,  pos: 134.8, h: 10 },
    { c: 4,  pos: 0.95,  h: 14 },
    { c: 4,  pos: 15.7,  h: 9 },
    { c: 4,  pos: 89.7,  h: 30, label: 'SNCA' },
    { c: 6,  pos: 32.6,  h: 11 },
    { c: 7,  pos: 23.3,  h: 17, label: 'GPNMB', hl: true },
    { c: 12, pos: 40.3,  h: 13, label: 'LRRK2' },
    { c: 17, pos: 45.9,  h: 24, label: 'MAPT' },
    { c: 18, pos: 42.3,  h: 9 }
  ];
  const YMAX = 33, SIG = -Math.log10(5e-8);

  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const rnd = mulberry32(7233);
  const gauss = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };

  const pts = [];
  CHR.forEach((len, i) => {
    const n = Math.round(len * 1.25);
    for (let k = 0; k < n; k++) pts.push({ g: OFF[i] + rnd() * len, y: -Math.log10(Math.max(rnd(), 1e-5)), c: i, hl: false });
  });
  PEAKS.forEach(p => {
    const i = p.c - 1, n = 36 + p.h * 4;
    for (let k = 0; k < n; k++) {
      const d = gauss() * 2.2;
      const env = Math.exp(-0.5 * Math.pow(d / 1.6, 2));
      const y = Math.max(0.3, p.h * env * (0.35 + 0.65 * Math.pow(rnd(), 0.5)));
      pts.push({ g: OFF[i] + Math.min(Math.max(p.pos + d, 0), CHR[i]), y, c: i, hl: !!p.hl });
    }
    pts.push({ g: OFF[i] + p.pos, y: p.h, c: i, hl: !!p.hl });
  });

  const M = { l: 30, r: 6, t: 22, b: 22 };
  let W = 0, H = 0, dpr = 1, progress = reduceMotion ? 1 : 0;

  const token = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  function resize() {
    const r = box.getBoundingClientRect();
    W = Math.max(Math.round(r.width), 1); H = Math.max(Math.round(r.height), 1);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
  }

  function draw() {
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const col = { a: token('--plot-a'), b: token('--plot-b'), sig: token('--accent'), hl: token('--hl'), line: token('--line'), text: token('--ink-3'), ink: token('--ink') };
    const pw = W - M.l - M.r, ph = H - M.t - M.b;
    const X = g => M.l + g / TOTAL * pw;
    const Y = y => M.t + ph - Math.min(y, YMAX) / YMAX * ph;
    const mono = '"IBM Plex Mono", ui-monospace, Menlo, monospace';

    // Axis + gridlines
    ctx.font = '10px ' + mono; ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
    ctx.lineWidth = 1;
    [0, 10, 20, 30].forEach(t => {
      const y = Math.round(Y(t)) + .5;
      ctx.strokeStyle = col.line; ctx.globalAlpha = t === 0 ? 1 : .6;
      ctx.beginPath(); ctx.moveTo(M.l, y); ctx.lineTo(W - M.r, y); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = col.text; ctx.fillText(String(t), M.l - 8, y);
    });

    // Chromosome labels
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const step = pw < 560 ? 2 : 1;
    CHR.forEach((len, i) => { if (i % step === 0) ctx.fillText(String(i + 1), X(OFF[i] + len / 2), H - 6); });

    // Points, batched by colour
    const cut = M.l + progress * pw;
    const r = W < 600 ? 1.2 : 1.55;
    const paths = { a: new Path2D(), b: new Path2D(), sig: new Path2D(), hl: new Path2D() };
    for (const p of pts) {
      const x = X(p.g); if (x > cut) continue;
      const y = Y(p.y);
      const key = p.hl && p.y > 2 ? 'hl' : p.y >= SIG ? 'sig' : (p.c % 2 ? 'b' : 'a');
      paths[key].moveTo(x + r, y); paths[key].arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fillStyle = col.a; ctx.fill(paths.a);
    ctx.fillStyle = col.b; ctx.fill(paths.b);
    ctx.fillStyle = col.sig; ctx.fill(paths.sig);
    ctx.fillStyle = col.hl; ctx.fill(paths.hl);

    // Genome-wide significance threshold
    const sy = Math.round(Y(SIG)) + .5;
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = col.sig; ctx.globalAlpha = .75;
    ctx.beginPath(); ctx.moveTo(M.l, sy); ctx.lineTo(W - M.r, sy); ctx.stroke(); ctx.restore();
    ctx.font = '10px ' + mono; ctx.fillStyle = col.sig; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('p = 5×10⁻⁸', W - M.r, sy - 4);

    // Locus labels
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    PEAKS.forEach(p => {
      if (!p.label) return;
      const x = X(OFF[p.c - 1] + p.pos); if (x > cut) return;
      const y = Y(p.h);
      if (p.hl) {
        ctx.strokeStyle = col.hl; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.stroke();
        ctx.font = '600 11px ' + mono; ctx.fillStyle = col.hl;
        ctx.fillText(W < 600 ? p.label : p.label + ' · 7p15.3', x, y - 9);
      } else {
        ctx.font = '10px ' + mono; ctx.fillStyle = col.text;
        ctx.fillText(p.label, x, y - 5);
      }
    });
  }

  function sweep() {
    const start = performance.now(), dur = 1400;
    (function frame(now) {
      const t = Math.min((now - start) / dur, 1);
      progress = 1 - Math.pow(1 - t, 3);
      draw();
      if (t < 1) requestAnimationFrame(frame);
    })(start);
  }

  resize(); draw();
  if (!reduceMotion) sweep();

  if ('ResizeObserver' in window) new ResizeObserver(() => { resize(); draw(); }).observe(box);
  else window.addEventListener('resize', () => { resize(); draw(); });
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);

  // Genome-browser style position readout on hover
  if (window.matchMedia('(hover: hover)').matches) {
    const label = cursor.querySelector('span');
    box.addEventListener('pointermove', e => {
      const r = box.getBoundingClientRect(), x = e.clientX - r.left, pw = W - M.l - M.r;
      if (x < M.l || x > W - M.r) { cursor.hidden = true; return; }
      const g = (x - M.l) / pw * TOTAL;
      let i = 0; while (i < CHR.length - 1 && g >= OFF[i + 1]) i++;
      label.textContent = 'chr' + (i + 1) + ':' + (g - OFF[i]).toFixed(1) + ' Mb';
      cursor.style.left = x + 'px';
      cursor.classList.toggle('flip', x > W - 130);
      cursor.hidden = false;
    });
    box.addEventListener('pointerleave', () => { cursor.hidden = true; });
  }
})();
})();
