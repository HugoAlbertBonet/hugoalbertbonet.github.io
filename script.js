/* Hugo Albert Bonet — scroll-scrubbed hero + white-key matting + i18n
   Vanilla JS, no build step. GitHub Pages ready. */

(function () {
  "use strict";

  /* ============================== i18n ============================== */

  const I18N = {
    es: {
      heroTitle: "¡Hola, soy Hugo!",
      heroSub:
        "Ingeniero de Machine Learning y orador — construyo sistemas inteligentes y ayudo a que las ideas se escuchen.",
      mlLabel: "Ingeniero de Machine Learning",
      mlTitle: "Máquinas que aprenden",
      mlBody:
        "Construyo sistemas de machine learning para resolver problemas reales. Máster en IA en la University of Southern California (beca Fulbright) e investigador en el USC Learning and Interactive Robot Autonomy Lab (LiraLab). Mi trabajo abarca desde aprendizaje por refuerzo e imitación hasta visión por computador, con una demo aplicada a desastres naturales aceptada en AAAI26.",
      spLabel: "Orador",
      spTitle: "Ideas que se escuchan",
      spBody:
        "Me formé de forma autodidacta (con profesores como Vinh Giang o Paco Grau) en oratoria y en la neurociencia de la comunicación. En Hyperloop UPV negocié patrocinios con empresas como Red Bull y HP, hablé ante audiencias de hasta 500 personas en eventos internacionales, y dirigí un equipo de 50 personas. De peque también hice teatro :), y el año pasado retomé la improvisación en USC.",
      duality:
        "Creo que tanto lo técnico como lo humano son esenciales para generar un impacto real. Quiero guiar el desarrollo de la IA hacia el beneficio de las personas, y ayudar a las personas a que sus ideas vuelen más allá de sus propias mentes, que lleguen al mundo. Quiero que las máquinas piensen y actúen al servicio de las personas, y que las personas sean escuchadas de verdad, por otras personas y por la IA, ¡que se usa comunicando!",
      ctaMl: "Más sobre mi lado ingeniero →",
      ctaSp: "Más sobre mi lado orador →",
      comingSoon: "Próximamente ✦ esta página está en construcción.",
      toggle: "EN",
      docTitle: "Hugo Albert Bonet — Ingeniero de Machine Learning y orador",
    },
    en: {
      heroTitle: "Hi, I'm Hugo!",
      heroSub:
        "Machine Learning engineer and speaker — building intelligent systems and helping ideas get heard.",
      mlLabel: "Machine Learning Engineer",
      mlTitle: "Machines that learn",
      mlBody:
        "I build machine learning systems that solve real-world problems. Master's in AI from the University of Southern California (Fulbright Scholar), currently researching at USC Learning and Interactive Robot Autonomy Lab (LiraLab). My work spans reinforcement and imitation learning to computer vision, including a demo applied to natural disasters and accepted at AAAI26.",
      spLabel: "Speaker",
      spTitle: "Ideas that get heard",
      spBody:
        "I'm a self-taught speaker, trained in public speaking and the neuroscience of communication. At Hyperloop UPV I negotiated sponsorships with companies like Red Bull and HP, spoke in front of crowds of up to 500 people at international events, and led a 50-person team. I did theatre as a kid :), and picked improv back up last year at USC.",
      duality:
        "I believe that both the technical and human aspects are essential to make a real impact. I want to guide the development of AI toward benefiting people, and help people's ideas soar beyond their own minds and out into the world. I want machines to think and act in the service of people, and for people to truly be heard—both by others and by AI, which is operated through communication!",
      ctaMl: "More on my engineering side →",
      ctaSp: "More on my speaking side →",
      comingSoon: "Coming soon ✦ this page is under construction.",
      toggle: "ES",
      docTitle: "Hugo Albert Bonet — Machine Learning Engineer & Speaker",
    },
  };

  let lang = "es";
  try {
    const stored = localStorage.getItem("hugo-lang");
    if (stored === "es" || stored === "en") lang = stored;
    else if ((navigator.language || "").toLowerCase().indexOf("es") !== 0) lang = "en";
  } catch (e) { /* storage unavailable */ }

  function applyLang() {
    const t = I18N[lang];
    document.documentElement.lang = lang;
    document.title = t.docTitle;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (t[key]) el.textContent = t[key];
    });
    document.getElementById("langToggle").textContent = t.toggle;
    document.getElementById("langToggleFooter").textContent =
      lang === "es" ? "English" : "Español";
  }

  function toggleLang() {
    lang = lang === "es" ? "en" : "es";
    try { localStorage.setItem("hugo-lang", lang); } catch (e) {}
    applyLang();
  }

  document.getElementById("langToggle").addEventListener("click", toggleLang);
  document.getElementById("langToggleFooter").addEventListener("click", toggleLang);
  applyLang();

  /* ==================== background keying ====================== */
  /* Adaptive color key: the backdrop is near-flat but its tone varies
     (t1 is near-white, t2 is pinkish ~rgb(237,225,232), and it drifts
     between frames). Per frame we estimate the backdrop color from the
     image borders, then key on color distance with a feathered ramp. */

  const KEY_D_LO = 16;   // distance below -> fully transparent
  const KEY_D_HI = 52;   // distance above -> fully opaque
  const BG_FALLBACK = [240, 240, 240];

  function estimateBg(px, w, h) {
    /* median of plausible border pixels (top rows + side columns) */
    const rs = [], gs = [], bs = [];
    function take(i) {
      const r = px[i], g = px[i + 1], b = px[i + 2];
      const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
      if (mn > 165 && mx - mn < 55) { rs.push(r); gs.push(g); bs.push(b); }
    }
    const band = Math.max(2, Math.round(h * 0.02));
    for (let y = 0; y < band; y++)
      for (let x = 0; x < w; x += 7) take((y * w + x) * 4);
    const side = Math.max(2, Math.round(w * 0.015));
    for (let y = 0; y < h; y += 5) {
      for (let x = 0; x < side; x++) take((y * w + x) * 4);
      for (let x = w - side; x < w; x++) take((y * w + x) * 4);
    }
    if (rs.length < 40) return BG_FALLBACK;
    const med = (a) => { a.sort((m, n) => m - n); return a[a.length >> 1]; };
    return [med(rs), med(gs), med(bs)];
  }

  function keyImageData(data, w, h) {
    const px = data.data;
    const bg = estimateBg(px, w, h);
    const bR = bg[0], bG = bg[1], bB = bg[2];
    const span = KEY_D_HI - KEY_D_LO;
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i], g = px[i + 1], b = px[i + 2];
      const dr = r - bR, dg = g - bG, db = b - bB;
      const ar = dr < 0 ? -dr : dr, ag = dg < 0 ? -dg : dg, ab = db < 0 ? -db : db;
      const d = ar > ag ? (ar > ab ? ar : ab) : (ag > ab ? ag : ab);
      if (d >= KEY_D_HI) continue;                    // clearly Hugo
      if (d <= KEY_D_LO) { px[i + 3] = 0; continue; } // clearly backdrop
      let a = (d - KEY_D_LO) / span;
      a = a * a * (3 - 2 * a);                        // smoothstep feather
      // despill: un-mix the backdrop color from semi-transparent edges
      const inv = 1 - a;
      px[i]     = Math.max(0, Math.min(255, (r - bR * inv) / a));
      px[i + 1] = Math.max(0, Math.min(255, (g - bG * inv) / a));
      px[i + 2] = Math.max(0, Math.min(255, (b - bB * inv) / a));
      px[i + 3] = Math.round(px[i + 3] * a);
    }
    return data;
  }

  /* Offscreen processing canvas, reused */
  const proc = document.createElement("canvas");
  const pctx = proc.getContext("2d", { willReadFrequently: true });

  function keySourceToCanvas(source, sw, sh, targetCanvas, maxW) {
    const scale = Math.min(1, maxW / sw);
    const w = Math.max(2, Math.round(sw * scale));
    const h = Math.max(2, Math.round(sh * scale));
    if (proc.width !== w || proc.height !== h) { proc.width = w; proc.height = h; }
    pctx.drawImage(source, 0, 0, w, h);
    let data;
    try {
      data = pctx.getImageData(0, 0, w, h);
    } catch (e) {
      return false; // tainted canvas (shouldn't happen same-origin)
    }
    keyImageData(data, w, h);
    if (targetCanvas.width !== w || targetCanvas.height !== h) {
      targetCanvas.width = w;
      targetCanvas.height = h;
    }
    targetCanvas.getContext("2d").putImageData(data, 0, 0);
    return true;
  }

  function loadKeyedImage(src, targetCanvas, maxW) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ok = keySourceToCanvas(img, img.naturalWidth, img.naturalHeight, targetCanvas, maxW);
        resolve(ok);
      };
      img.onerror = () => resolve(false);
      img.src = src;
    });
  }

  /* =========================== elements ============================= */

  const scrolly = document.getElementById("scrolly");
  const stage = document.getElementById("stage");
  const bgHero = document.getElementById("bgHero");
  const bgMl = document.getElementById("bgMl");
  const bgSp = document.getElementById("bgSp");
  const heroText = document.getElementById("heroText");
  const heroSub = document.getElementById("heroSub");
  const mlText = document.getElementById("mlText");
  const spText = document.getElementById("spText");
  const scrollHint = document.getElementById("scrollHint");

  const figure = document.getElementById("figure");
  const cvPortrait = document.getElementById("cvPortrait");
  const cvVideo = document.getElementById("cvVideo");
  const cvSitting = document.getElementById("cvSitting");
  const cvStanding = document.getElementById("cvStanding");

  /* ====================== mode: video vs stills ====================== */

  const smallScreen = window.matchMedia("(max-width: 768px)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let stillsMode = smallScreen || reducedMotion;

  /* stills — always loaded (hero poster, mobile fallback, phase-2 fade) */
  const IMG_MAX = smallScreen ? 900 : 1400;
  loadKeyedImage("assets/portrait.png", cvPortrait, IMG_MAX).then((ok) => {
    if (ok) cvPortrait.style.opacity = "1";
  });
  const sittingReady = stillsMode
    ? loadKeyedImage("assets/sitting.png", cvSitting, IMG_MAX)
    : Promise.resolve(false);
  const standingReady = loadKeyedImage("assets/standing.jpg", cvStanding, IMG_MAX);

  /* videos — transition-2 is optional; auto-detected */
  const VIDEO_PROC_W = 960;
  let video1 = null, video2 = null;
  let video1Ready = false, video2Ready = false;
  let videoDrawnOnce = false;

  function makeScrubVideo(src, onReady, onFail) {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.preload = "auto";
    let failed = false;
    const fail = () => { if (!failed) { failed = true; onFail(); } };
    v.addEventListener("error", fail);
    v.addEventListener("loadeddata", () => {
      if (v.videoWidth > 0) onReady(v);
      else fail();
    });
    /* Load as a blob: the whole file is then in memory, so scroll-scrubbing
       seeks are instant (no network stutter). Falls back to streaming. */
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error("http " + r.status);
        return r.blob();
      })
      .then((b) => { v.src = URL.createObjectURL(b); v.load(); })
      .catch(() => {
        if (src.indexOf("transition-1") !== -1) { v.src = src; v.load(); }
        else fail();
      });
    return v;
  }

  if (!stillsMode) {
    video1 = makeScrubVideo(
      "assets/transition-1.mp4",
      (v) => { video1Ready = true; attachSeekRender(v); v.currentTime = 0.001; },
      () => {
        // video failed -> fall back to stills mode entirely
        stillsMode = true;
        loadKeyedImage("assets/sitting.png", cvSitting, IMG_MAX);
        update(true);
      }
    );
    video2 = makeScrubVideo(
      "assets/transition-2.mp4",
      (v) => { video2Ready = true; attachSeekRender(v); v.currentTime = 0.001; },
      () => { video2Ready = false; video2 = null; }
    );
  }

  let pendingSeek = -1;
  let activeVideo = null;
  function drawVideoFrame(v) {
    if (!v || v.readyState < 2) return;
    if (activeVideo && v !== activeVideo) return; // avoid cross-video overdraw
    const ok = keySourceToCanvas(v, v.videoWidth, v.videoHeight, cvVideo, VIDEO_PROC_W);
    if (ok) videoDrawnOnce = true;
  }

  function attachSeekRender(v) {
    if (!v || v.__seekWired) return;
    v.__seekWired = true;
    v.addEventListener("seeked", () => {
      drawVideoFrame(v);
      if (pendingSeek >= 0) {
        const t = pendingSeek;
        pendingSeek = -1;
        if (Math.abs(v.currentTime - t) > 0.02) v.currentTime = t;
      }
      applyFigureOpacity();
    });
  }

  /* ======================= scroll choreography ======================= */

  /* progress checkpoints (0..1 across the sticky scroller) */
  const P = {
    heroHold: 0.05,   // static frame 1
    v1End: 0.38,      // transition-1 fully played (Hugo on the left)
    x2Start: 0.50,    // start of programmer -> speaker transition
    x2End: 0.88,      // Hugo on the right
  };

  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const smooth = (a, b, x) => {
    const t = clamp01((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };

  let progress = 0;
  let lastScrubT1 = -1, lastScrubT2 = -1;

  function scrubVideo(v, t) {
    if (!v || !v.duration) return;
    const target = Math.max(0.001, Math.min(v.duration - 0.03, t * v.duration));
    if (v.seeking) { pendingSeek = target; return; }
    if (Math.abs(v.currentTime - target) > 0.02) v.currentTime = target;
    else if (!videoDrawnOnce) drawVideoFrame(v);
  }

  function applyFigureOpacity() {
    const p = progress;
    if (stillsMode) {
      cvVideo.style.opacity = "0";
      const aSit = smooth(0.14, 0.34, p) * (1 - smooth(P.x2Start, P.x2End, p));
      const aStand = smooth(P.x2Start, P.x2End, p);
      cvPortrait.style.opacity = String(1 - smooth(0.14, 0.34, p));
      cvSitting.style.opacity = String(aSit);
      cvStanding.style.opacity = String(aStand);
      return;
    }
    const videoActive = videoDrawnOnce && video1Ready;
    /* portrait poster until the video has painted its first frame */
    cvPortrait.style.opacity = videoActive ? "0" : "1";
    cvSitting.style.opacity = "0";
    if (video2Ready) {
      cvVideo.style.opacity = videoActive ? "1" : "0";
      cvStanding.style.opacity = "0";
    } else {
      /* no transition-2: crossfade keyed video frame -> keyed standing photo */
      const aStand = smooth(P.x2Start, P.x2End, p);
      cvVideo.style.opacity = String(videoActive ? 1 - aStand : 0);
      cvStanding.style.opacity = String(aStand);
    }
  }

  /* poll-based readiness: robust even if loadeddata is missed/throttled */
  function checkVideos() {
    if (video1 && !video1Ready && video1.readyState >= 2 && video1.videoWidth > 0) {
      video1Ready = true;
      attachSeekRender(video1);
      drawVideoFrame(video1);
      lastScrubT1 = -1;
    }
    if (video2 && !video2Ready && video2.readyState >= 2 && video2.videoWidth > 0) {
      video2Ready = true;
      attachSeekRender(video2);
      lastScrubT2 = -1;
    }
  }

  function update(force) {
    const rect = scrolly.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const p = total > 0 ? clamp01(-rect.top / total) : 0;
    if (!stillsMode) checkVideos();
    if (!force && Math.abs(p - progress) < 0.0004) return;
    progress = p;

    /* phase attr (drives mobile object-position) */
    stage.dataset.phase = p < 0.26 ? "hero" : p < P.x2Start ? "ml" : "sp";

    /* figure grows from 0.88 (hero) to full-bleed by a quarter of transition-1 */
    const figScale = 0.88 + 0.12 * smooth(P.heroHold, P.heroHold + (P.v1End - P.heroHold) / 4, p);
    figure.style.transform = "scale(" + figScale.toFixed(4) + ")";

    /* backgrounds */
    const inMl = smooth(0.08, 0.26, p);
    const inSp = smooth(0.52, 0.75, p);
    bgHero.style.opacity = String(1 - inMl);
    bgMl.style.opacity = String(inMl * (1 - inSp));
    bgSp.style.opacity = String(inSp);

    /* text */
    const heroOut = 1 - smooth(0.02, 0.13, p);
    heroText.style.opacity = String(heroOut);
    heroText.style.transform =
      "translateY(" + (-0.45 * window.innerHeight * (1 - heroOut)) + "px)";
    heroSub.style.opacity = String(heroOut);
    heroSub.style.transform =
      "translateY(" + (-0.2 * window.innerHeight * (1 - heroOut)) + "px)";
    scrollHint.style.opacity = String(1 - smooth(0.01, 0.05, p));

    const mlIn = smooth(0.26, 0.36, p) * (1 - smooth(0.46, 0.54, p));
    mlText.style.opacity = String(mlIn);
    mlText.style.transform =
      "translateY(calc(-50% + " + (24 * (1 - mlIn)) + "px))";

    const spIn = smooth(0.82, 0.92, p);
    spText.style.opacity = String(spIn);
    spText.style.transform =
      "translateY(calc(-50% + " + (24 * (1 - spIn)) + "px))";

    /* video scrubbing */
    if (!stillsMode) {
      activeVideo = (video2Ready && p >= P.x2Start) ? video2 : video1;
      if (video2Ready && video2) {
        const t1 = clamp01((p - P.heroHold) / (P.v1End - P.heroHold));
        const t2 = clamp01((p - P.x2Start) / (P.x2End - P.x2Start));
        if (p < P.x2Start) {
          if (t1 !== lastScrubT1) { lastScrubT1 = t1; scrubVideo(video1, t1); }
        } else if (t2 !== lastScrubT2) {
          lastScrubT2 = t2; scrubVideo(video2, t2);
        }
      } else {
        const t1 = clamp01((p - P.heroHold) / (P.v1End - P.heroHold));
        if (t1 !== lastScrubT1) { lastScrubT1 = t1; scrubVideo(video1, t1); }
      }
    }

    applyFigureOpacity();

    /* lightweight state introspection (debug) */
    window.__hugoState = {
      p: progress, stillsMode, video1Ready, video2Ready,
      videoDrawnOnce,
      v1: video1 && { rs: video1.readyState, err: video1.error && video1.error.code, src: (video1.currentSrc||'').slice(0,30) },
      v2: video2 && { rs: video2.readyState, err: video2.error && video2.error.code, src: (video2.currentSrc||'').slice(0,30) },
    };
  }

  /* rAF poll: cheap (early-outs on unchanged progress) and immune to
     environments where scroll events are throttled or swallowed */
  let lastTick = 0;
  function tick() {
    lastTick = performance.now();
    update(false);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  /* safety net: some embedded contexts suspend rAF; a timer still runs */
  setInterval(() => {
    if (performance.now() - lastTick > 250) update(false);
  }, 120);
  window.addEventListener("scroll", () => update(false), { passive: true });
  window.addEventListener("resize", () => update(true));

  /* first-frame paint is handled by checkVideos() inside the update loop */

  update(true);

  /* =================== subpage links (not built yet) ================== */

  const toast = document.getElementById("toast");
  let toastTimer = null;
  function showToast(msg) {
    toast.hidden = false;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  document.querySelectorAll("[data-check-page]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const href = a.getAttribute("href");
      fetch(href, { method: "HEAD" })
        .then((r) => {
          if (r.ok) window.location.href = href;
          else showToast(I18N[lang].comingSoon);
        })
        .catch(() => showToast(I18N[lang].comingSoon));
    });
  });
})();
