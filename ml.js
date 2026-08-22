/* ml.html — latent semantic map + scroll walkthrough.
   Vanilla, no build step. Reuses the i18n layer exposed by script.js
   (window.HugoLang: same dictionary, same "hugo-lang" localStorage key). */

(function () {
  "use strict";

  const L = window.HugoLang;
  const lang = () => (L ? L.get() : document.documentElement.lang || "es");
  const t = (k) => (L ? L.t(k) : "");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const wrap = document.getElementById("mapWrap");
  const canvas = document.getElementById("mapCanvas");
  const legendEl = document.getElementById("legend");
  const panel = document.getElementById("panel");
  const mini = document.getElementById("minimap");
  const miniCanvas = document.getElementById("miniCanvas");
  const miniLabel = document.getElementById("miniLabel");
  const projSeg = document.getElementById("projSeg");
  const viewSeg = document.getElementById("viewSeg");

  const NEUTRAL = "#8b959d";
  const DIM = 0.09;

  let TERMS = [], PROJECTS = [], PMAP = {};
  let projection = "semantic";
  let selected = null;     // project id — user selection in section 1
  let miniActive = null;   // project id — scroll-driven, minimap only
  let hovered = null;      // term object
  let dirty = true;

  /* tween: every point moves from .from to .to over one shared clock, with a
     small per-point delay so the cloud "settles" instead of snapping */
  let tp = 1, tpStart = 0, tpDur = 900;
  let zoom = { k: 1, cx: 0, cy: 0, f: 0, others: 1 }; // pre-navigation zoom

  /* ============================ data ============================ */

  Promise.all([
    fetch("data/terms.json").then((r) => r.json()),
    fetch("data/projects.json").then((r) => r.json()),
  ]).then(([terms, projects]) => {
    TERMS = terms;
    PROJECTS = projects.slice().sort((a, b) => b.order - a.order);
    PROJECTS.forEach((p) => (PMAP[p.id] = p));
    normalise();
    buildLegend();
    buildPanel(null);
    wireInteractions();
    startEntry();
    tryProjectImages();
    onLangChange();                 // the stored language may already be EN
    if (L) L.onChange(onLangChange);
  }).catch((err) => {
    /* No JSON (or opened over file://): the map is an enhancement, so drop it
       and leave the crawlable walkthrough as the page's content. */
    console.warn("ml.js: map data unavailable —", err);
    document.getElementById("mapSec").hidden = true;
    if (mini) mini.remove();
    wireProjectLinks();
  });

  /* Normalise both projections into [-1,1] with a UNIFORM scale, so relative
     distances between terms are preserved (a shared term really does sit
     between its projects). Coordinates are never nudged after this. */
  function normalise() {
    ["semantic", "umap"].forEach((pr) => {
      const xs = TERMS.map((tm) => tm.coords[pr][0]);
      const ys = TERMS.map((tm) => tm.coords[pr][1]);
      const x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
      const y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      const s = 1.92 / Math.max(x1 - x0, y1 - y0, 1e-6);
      TERMS.forEach((tm) => {
        const c = tm.coords[pr];
        tm.n = tm.n || {};
        tm.n[pr] = [(c[0] - mx) * s, (c[1] - my) * s];
      });
    });
  }

  function startEntry() {
    TERMS.forEach((tm, i) => {
      tm.delay = ((i * 37) % 100) / 100 * 0.28;   // deterministic stagger
      tm.to = tm.n.semantic;
      if (reduce) { tm.from = tm.to; tm.cur = tm.to.slice(); return; }
      /* slightly dispersed start: same direction as the final position,
         pushed outward + rotated a touch — reads as an embedding settling */
      const a = Math.atan2(tm.to[1], tm.to[0]) + 0.5;
      const r = Math.hypot(tm.to[0], tm.to[1]) * 1.5 + 0.35;
      tm.from = [Math.cos(a) * r, Math.sin(a) * r];
      tm.cur = tm.from.slice();
    });
    retween(reduce ? 0 : 1500);
    resize();
    requestAnimationFrame(loop);
  }

  function retween(dur) {
    tpDur = dur;
    tpStart = performance.now();
    tp = dur > 0 ? 0 : 1;
    dirty = true;
  }

  function setProjection(pr) {
    if (pr === projection) return;
    projection = pr;
    wrap.dataset.projection = pr;
    projSeg.querySelectorAll("button").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.projection === pr)));
    TERMS.forEach((tm) => { tm.from = tm.cur.slice(); tm.to = tm.n[pr]; });
    retween(reduce ? 0 : 1000);
  }

  /* ============================ geometry ============================ */

  const ease = (x) => 1 - Math.pow(1 - x, 3);

  function pointProgress(tm) {
    if (tp >= 1) return 1;
    return ease(Math.max(0, Math.min(1, (tp - tm.delay) / (1 - 0.28))));
  }

  function pos(tm) {
    const k = pointProgress(tm);
    tm.cur[0] = tm.from[0] + (tm.to[0] - tm.from[0]) * k;
    tm.cur[1] = tm.from[1] + (tm.to[1] - tm.from[1]) * k;
    return tm.cur;
  }

  /* Zoom maps the focus point (cx,cy) towards the canvas centre as f goes
     0 → 1, scaling everything by k around it. At k=1, f=0 it is the identity. */
  function makeProjector(w, h, padX, padY, z) {
    const iw = w - padX * 2, ih = h - padY * 2;
    const base = (n) => [padX + (n[0] + 1) / 2 * iw, padY + (1 - (n[1] + 1) / 2) * ih];
    if (!z || (z.k === 1 && !z.f)) return base;
    const c = base([z.cx, z.cy]);
    const tx = c[0] + (w / 2 - c[0]) * z.f;
    const ty = c[1] + (h / 2 - c[1]) * z.f;
    return (n) => {
      const p = base(n);
      return [tx + (p[0] - c[0]) * z.k, ty + (p[1] - c[1]) * z.k];
    };
  }

  function centroid(pid) {
    let x = 0, y = 0, n = 0;
    TERMS.forEach((tm) => {
      if (tm.projects.indexOf(pid) === -1) return;
      const p = tm.cur; x += p[0]; y += p[1]; n++;
    });
    return n ? [x / n, y / n] : [0, 0];
  }

  const shortName = (p) => {
    const s = (p.title[lang()] || "").split("—")[0].trim();
    return s.length > 30 ? s.slice(0, 29) + "…" : s;
  };

  /* ============================ drawing ============================ */

  function setupCanvas(cv) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = cv.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (cv.width !== w * dpr || cv.height !== h * dpr) {
      cv.width = w * dpr; cv.height = h * dpr;
    }
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }

  function pill(ctx, x, y, text, color, small) {
    ctx.font = (small ? "600 9.5px " : "600 11px ") + '"Inter", sans-serif';
    const padH = small ? 6 : 9, hgt = small ? 17 : 22;
    const tw = ctx.measureText(text).width;
    const rx = x - (tw + padH * 2) / 2, ry = y - hgt / 2, rw = tw + padH * 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(rx, ry, rw, hgt, hgt / 2);
    else ctx.rect(rx, ry, rw, hgt);
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = color;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, x, y + 0.5);
    return { x: rx, y: ry, w: rw, h: hgt };
  }

  /* Labels are placed or hidden; points never move to make room for text. */
  function placePill(ctx, x, y, text, color, placed, small) {
    let ty = y;
    for (let i = 0; i < placed.length; i++) {
      const r = placed[i];
      if (Math.abs(r.y + r.h / 2 - ty) < 22 && Math.abs(r.x + r.w / 2 - x) < r.w / 2 + 90) {
        ty += 26;
        i = -1;
      }
    }
    placed.push(pill(ctx, x, ty, text, color, small));
  }

  function render(cv, isMini) {
    const g = setupCanvas(cv);
    const ctx = g.ctx;
    const padX = isMini ? 12 : Math.min(120, g.w * 0.12);
    const padY = isMini ? 12 : Math.min(56, g.h * 0.09);
    const active = isMini ? miniActive : (selected || previewed);
    const P = makeProjector(g.w, g.h, padX, padY, isMini ? null : zoom);
    const rBase = isMini ? 1.9 : 3.5;

    /* --- rays (drawn under the points) --- */
    ctx.lineWidth = isMini ? 0.6 : 0.8;
    if (active) {
      const c = P(centroid(active));
      const col = PMAP[active].color;
      ctx.strokeStyle = hexA(col, isMini ? 0.4 : 0.32);
      TERMS.forEach((tm) => {
        if (tm.projects.indexOf(active) === -1) return;
        const p = P(pos(tm));
        ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
      });
    }
    if (!isMini && hovered && !selected) {
      /* the revealing moment: one point, one ray per project that contains it */
      const p = P(pos(hovered));
      hovered.projects.forEach((pid) => {
        const c = P(centroid(pid));
        ctx.strokeStyle = hexA(PMAP[pid].color, 0.5);
        ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
      });
    }

    /* --- points --- */
    TERMS.forEach((tm) => {
      const p = P(pos(tm));
      const inActive = active ? tm.projects.indexOf(active) !== -1 : false;
      const isHot = !isMini && hovered === tm;
      let color = NEUTRAL, alpha = active ? (inActive ? 1 : DIM) : 0.72;
      if (inActive) color = PMAP[active].color;
      if (isHot) { alpha = 1; color = tm.projects.length > 1 ? "#0d2b3e" : (inActive ? color : "#0d2b3e"); }
      if (!isMini) alpha *= zoom.others === 1 ? 1 : (inActive || !active ? 1 : zoom.others);
      let r = rBase + (inActive ? (isMini ? 0.5 : 1.1) : 0);
      if (isHot) r = rBase + 3.2;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      if (tm.projects.length > 1 && !isMini && alpha > 0.4) {
        /* shared terms wear a thin ring — one point, several memberships */
        ctx.globalAlpha = alpha * 0.8;
        ctx.lineWidth = 1;
        ctx.strokeStyle = color;
        ctx.beginPath(); ctx.arc(p[0], p[1], r + 2.6, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    });

    if (isMini) {
      ctx.globalAlpha = 1;
      if (active) {
        const c = P(centroid(active));
        ctx.beginPath(); ctx.arc(c[0], c[1], 2.6, 0, Math.PI * 2);
        ctx.fillStyle = PMAP[active].color; ctx.fill();
      }
      return;
    }

    /* --- labels --- */
    const placed = [];
    if (active) {
      const c = P(centroid(active));
      placePill(ctx, c[0], c[1], shortName(PMAP[active]), PMAP[active].color, placed, false);
    }
    if (hovered) {
      const p = P(pos(hovered));
      if (!selected) {
        hovered.projects.forEach((pid) => {
          const c = P(centroid(pid));
          placePill(ctx, c[0], c[1], shortName(PMAP[pid]), PMAP[pid].color, placed, true);
        });
      }
      const label = hovered.label[lang()] || hovered.label.es;
      ctx.font = '500 12.5px "Inter", sans-serif';
      ctx.textAlign = p[0] > g.w * 0.72 ? "right" : "left";
      ctx.textBaseline = "middle";
      const ox = ctx.textAlign === "right" ? -10 : 10;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = "rgba(255,254,252,0.95)";
      ctx.strokeText(label, p[0] + ox, p[1] - 12);
      ctx.fillStyle = "#0d2b3e";
      ctx.fillText(label, p[0] + ox, p[1] - 12);
    }
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  let lastFrame = 0;
  function frame(now) {
    lastFrame = performance.now();
    if (tp < 1) {
      tp = tpDur > 0 ? Math.min(1, (now - tpStart) / tpDur) : 1;
      dirty = true;
    }
    if (!dirty) return;
    dirty = false;
    render(canvas, false);
    if (mini && mini.classList.contains("show")) render(miniCanvas, true);
  }
  function loop(now) {
    frame(now);
    requestAnimationFrame(loop);
  }
  /* safety net: some embedded/background contexts suspend rAF entirely */
  setInterval(() => {
    if (performance.now() - lastFrame > 300) frame(performance.now());
  }, 200);

  function resize() { dirty = true; }
  window.addEventListener("resize", resize);

  /* ============================ legend ============================ */

  function buildLegend() {
    PROJECTS.forEach((p) => {
      const n = TERMS.filter((tm) => tm.projects.indexOf(p.id) !== -1).length;
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.project = p.id;
      b.setAttribute("aria-pressed", "false");
      b.style.color = p.color;
      b.innerHTML = '<span class="dot"></span><span class="nm"></span><span class="legend-count">' + n + "</span>";
      b.querySelector(".nm").textContent = shortName(p);
      b.setAttribute("aria-label", shortName(p) + " — " + n + " " + t("mlTermsCount"));
      b.addEventListener("click", () => select(selected === p.id ? null : p.id));
      b.addEventListener("mouseenter", () => { if (!selected) preview(p.id); });
      b.addEventListener("mouseleave", () => { if (!selected) preview(null); });
      legendEl.appendChild(b);
    });
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "clear-btn";
    clear.id = "clearSel";
    clear.hidden = true;
    clear.textContent = t("mlAllProjects");
    clear.addEventListener("click", () => select(null));
    legendEl.appendChild(clear);
  }

  let previewed = null;
  function preview(pid) {
    /* legend hover previews the cloud without opening the panel */
    previewed = pid;
    dirty = true;
  }

  function syncLegend() {
    legendEl.querySelectorAll("button[data-project]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.project === selected)));
    const c = document.getElementById("clearSel");
    if (c) c.hidden = !selected;
  }

  /* ============================ panel ============================ */

  function select(pid, opts) {
    selected = pid;
    previewed = null;
    syncLegend();
    buildPanel(pid);
    document.body.classList.toggle("panel-open", !!pid);
    panel.classList.toggle("open", !!pid);
    panel.setAttribute("aria-hidden", String(!pid));
    dirty = true;
    if (pid && !(opts && opts.noScroll) && window.innerWidth <= 860) {
      const r = wrap.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) {
        window.scrollTo({ top: window.scrollY + r.top - 80, behavior: reduce ? "auto" : "smooth" });
      }
    }
  }

  function buildPanel(pid) {
    panel.innerHTML = "";
    if (!pid) return;
    const p = PMAP[pid], lg = lang();
    const close = el("button", "panel-close");
    close.type = "button";
    close.innerHTML = "&times;";
    close.setAttribute("aria-label", t("mlPanelClose"));
    close.addEventListener("click", () => select(null));
    panel.appendChild(close);

    const yr = el("p", "panel-year", p.year);
    yr.style.color = p.color;
    panel.appendChild(yr);
    panel.appendChild(el("h2", "", p.title[lg]));
    panel.appendChild(el("p", "panel-role", p.role[lg]));
    panel.appendChild(el("p", "panel-summary", p.summary[lg]));

    const mw = el("div", "panel-metrics");
    p.metrics.forEach((m) => {
      const w = el("p", "metric");
      const b = el("b", "", m.value);
      b.style.color = p.color;
      w.appendChild(b);
      w.appendChild(el("span", "", m.label[lg]));
      mw.appendChild(w);
    });
    panel.appendChild(mw);

    panel.appendChild(el("p", "chips-title", t("mlPanelTerms")));
    const chips = el("div", "chips");
    TERMS.filter((tm) => tm.projects.indexOf(pid) !== -1).forEach((tm) => {
      const c = el("span", "chip", tm.label[lg]);
      c.dataset.term = tm.id;
      c.style.color = p.color;
      if (tm.projects.length > 1) {
        const s = el("span", "shared", "◇");
        s.title = tm.projects.map((id) => shortName(PMAP[id])).join(" · ");
        c.appendChild(s);
      }
      /* bidirectional link: chip hover lights its point on the map */
      c.addEventListener("mouseenter", () => { hovered = tm; dirty = true; });
      c.addEventListener("mouseleave", () => { hovered = null; dirty = true; });
      chips.appendChild(c);
    });
    panel.appendChild(chips);

    const cta = el("a", "panel-cta", t("mlPanelCta"));
    cta.href = p.href;
    cta.style.background = p.color;
    cta.dataset.projectLink = p.id;
    cta.innerHTML = '<span>' + t("mlPanelCta") + "</span>";
    panel.appendChild(cta);
    wireProjectLinks();
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* ============================ interactions ============================ */

  function hitTest(ev) {
    const r = canvas.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    const padX = Math.min(120, r.width * 0.12), padY = Math.min(56, r.height * 0.09);
    const P = makeProjector(r.width, r.height, padX, padY, zoom);
    let best = null, bd = 18 * 18;
    TERMS.forEach((tm) => {
      const p = P(tm.cur);
      const d = (p[0] - x) * (p[0] - x) + (p[1] - y) * (p[1] - y);
      if (d < bd) { bd = d; best = tm; }
    });
    return best;
  }

  function wireInteractions() {
    canvas.addEventListener("pointermove", (ev) => {
      const hit = hitTest(ev);
      if (hit !== hovered) {
        hovered = hit;
        canvas.style.cursor = hit ? "pointer" : "crosshair";
        syncChips();
        dirty = true;
      }
    });
    canvas.addEventListener("pointerleave", () => {
      if (hovered) { hovered = null; syncChips(); dirty = true; }
    });
    canvas.addEventListener("click", (ev) => {
      const hit = hitTest(ev);
      if (hit) select(hit.projects[0]);
    });

    /* keyboard: tab between PROJECTS, not between 65 points */
    canvas.addEventListener("keydown", (ev) => {
      const i = selected ? PROJECTS.findIndex((p) => p.id === selected) : -1;
      if (ev.key === "ArrowRight" || ev.key === "ArrowDown") {
        select(PROJECTS[(i + 1) % PROJECTS.length].id, { noScroll: true });
        ev.preventDefault();
      } else if (ev.key === "ArrowLeft" || ev.key === "ArrowUp") {
        select(PROJECTS[(i - 1 + PROJECTS.length) % PROJECTS.length].id, { noScroll: true });
        ev.preventDefault();
      } else if (ev.key === "Escape") { select(null); }
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && selected) select(null);
    });

    projSeg.addEventListener("click", (ev) => {
      const b = ev.target.closest("button[data-projection]");
      if (b) setProjection(b.dataset.projection);
    });
    viewSeg.addEventListener("click", (ev) => {
      const b = ev.target.closest("button[data-view]");
      if (!b) return;
      viewSeg.querySelectorAll("button").forEach((x) =>
        x.setAttribute("aria-pressed", String(x === b)));
      const target = b.dataset.view === "list"
        ? document.getElementById("journey")
        : document.getElementById("mapSec");
      window.scrollTo({ top: target.offsetTop - 60, behavior: reduce ? "auto" : "smooth" });
    });

    observeJourney();
    wireProjectLinks();
  }

  function syncChips() {
    panel.querySelectorAll(".chip").forEach((c) =>
      c.classList.toggle("hot", !!hovered && c.dataset.term === hovered.id));
  }

  /* ==================== scroll ↔ minimap synchronisation ==================== */

  function observeJourney() {
    const blocks = Array.prototype.slice.call(document.querySelectorAll(".proj"));
    const mapSec = document.getElementById("mapSec");

    /* One place decides both things: which project the minimap lights up
       (the most visible block) and whether the minimap is on screen at all
       (section 1 has left the viewport). IntersectionObserver drives it;
       a throttled scroll listener is the fallback for contexts where the
       observer is suspended (background/embedded frames). */
    function sync() {
      const vh = window.innerHeight;
      let best = null, ratio = 0;
      blocks.forEach((b) => {
        const r = b.getBoundingClientRect();
        const vis = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) / vh;
        if (vis > ratio) { ratio = vis; best = b; }
      });
      if (best && ratio > 0.25) {
        const pid = best.dataset.project;
        if (pid !== miniActive) {
          miniActive = pid;
          miniLabel.textContent = shortName(PMAP[pid]);
          miniLabel.style.color = hexA(PMAP[pid].color, 0.85);
          dirty = true;
        }
      }
      const mr = mapSec.getBoundingClientRect();
      const show = mr.bottom < vh * 0.35;
      if (show !== mini.classList.contains("show")) {
        mini.classList.toggle("show", show);
        dirty = true;
      }
      if (show) dirty = true;
    }

    const io = new IntersectionObserver(sync, { threshold: [0, 0.2, 0.4, 0.6, 0.8] });
    blocks.forEach((b) => io.observe(b));
    new IntersectionObserver(sync, { threshold: [0, 0.12, 0.5] }).observe(mapSec);

    let queued = false;
    window.addEventListener("scroll", () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; sync(); });
    }, { passive: true });
    setInterval(sync, 400);
    sync();
    window.__mlDebug = () => ({ miniActive, selected, projection, show: mini.classList.contains("show"), terms: TERMS.length });
  }

  /* project images: use the real jpg when it exists, keep the coloured
     placeholder when it doesn't (never a broken box) */
  function tryProjectImages() {
    PROJECTS.forEach((p) => {
      const holder = document.querySelector('[data-media="' + p.id + '"]');
      if (!holder) return;
      const img = new Image();
      img.onload = () => {
        const el2 = document.createElement("img");
        el2.src = p.image;
        el2.alt = p.title[lang()];
        holder.innerHTML = "";
        holder.appendChild(el2);
      };
      img.src = p.image;
    });
  }

  /* placeholder captions come from the vocabulary, so they translate too */
  function fillPlaceholders() {
    const lg = lang();
    PROJECTS.forEach((p) => {
      const holder = document.querySelector('[data-media="' + p.id + '"] .ph-terms');
      if (!holder) return;
      const names = TERMS.filter((tm) => tm.projects.indexOf(p.id) !== -1)
        .slice(0, 4).map((tm) => tm.label[lg]);
      holder.textContent = names.join(" · ");
    });
  }

  /* ==================== navigation to project subpages ==================== */

  function wireProjectLinks() {
    document.querySelectorAll("[data-project-link]").forEach((a) => {
      if (a.__wired) return;
      a.__wired = true;
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        const pid = a.dataset.projectLink;
        const href = a.getAttribute("href");
        zoomToProject(pid, () => {
          fetch(href, { method: "HEAD" })
            .then((r) => {
              if (!r.ok) throw new Error("missing");
              go(href);
            })
            .catch(() => {
              resetZoom();
              if (window.HugoToast) window.HugoToast(t("comingSoon"));
            });
        });
      });
    });
  }

  function go(href) {
    if (document.startViewTransition) {
      document.startViewTransition(() => { window.location.href = href; });
    } else {
      document.body.style.transition = "opacity .28s ease";
      document.body.style.opacity = "0";
      setTimeout(() => { window.location.href = href; }, 240);
    }
  }

  /* zoom the map onto the project's centroid and fade everything else out */
  function zoomToProject(pid, done) {
    if (reduce || !TERMS.length) { done(); return; }
    if (!selected) { selected = pid; syncLegend(); }
    const c = centroid(pid);
    const t0 = performance.now(), dur = 520;
    (function step(now) {
      const k = Math.min(1, (now - t0) / dur), e = ease(k);
      zoom = { k: 1 + 1.9 * e, cx: c[0], cy: c[1], f: e, others: 1 - e };
      dirty = true;
      if (k < 1) requestAnimationFrame(step);
      else done();
    })(performance.now());
  }

  function resetZoom() {
    const from = zoom.k, t0 = performance.now();
    (function step(now) {
      const k = Math.min(1, (now - t0) / 320), e = ease(k);
      zoom = { k: from + (1 - from) * e, cx: zoom.cx, cy: zoom.cy, f: 1 - e, others: e };
      dirty = true;
      if (k < 1) requestAnimationFrame(step);
      else zoom = { k: 1, cx: 0, cy: 0, f: 0, others: 1 };
    })(performance.now());
  }

  /* ============================ language ============================ */

  function onLangChange() {
    const lg = lang();
    document.querySelectorAll("[data-i18n-aria]").forEach((e) =>
      e.setAttribute("aria-label", t(e.dataset.i18nAria)));
    /* walkthrough copy lives in the static DOM (crawlable, Spanish default);
       the English variants come from projects.json */
    PROJECTS.forEach((p) => {
      set('[data-p="' + p.id + '"][data-field="title"]', p.title[lg]);
      set('[data-p="' + p.id + '"][data-field="role"]', p.role[lg]);
      set('[data-p="' + p.id + '"][data-field="detail"]', p.detail[lg]);
      const mw = document.querySelector('[data-p="' + p.id + '"][data-field="metrics"]');
      if (mw) {
        mw.querySelectorAll(".metric").forEach((m, i) => {
          if (!p.metrics[i]) return;
          m.querySelector("b").textContent = p.metrics[i].value;
          m.querySelector("span").textContent = p.metrics[i].label[lg];
        });
      }
    });
    legendEl.querySelectorAll("button[data-project]").forEach((b) => {
      const p = PMAP[b.dataset.project];
      b.querySelector(".nm").textContent = shortName(p);
    });
    const clear = document.getElementById("clearSel");
    if (clear) clear.textContent = t("mlAllProjects");
    if (miniActive) miniLabel.textContent = shortName(PMAP[miniActive]);
    fillPlaceholders();
    if (selected) buildPanel(selected);
    dirty = true;
  }

  function set(sel, text) {
    const e = document.querySelector(sel);
    if (e) e.textContent = text;
  }
})();
