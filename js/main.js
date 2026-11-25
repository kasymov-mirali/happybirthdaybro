(() => {
  "use strict";

  /* =================================================================
     НАСТРОЙКИ
     ================================================================= */
  const KEY = "mili-family-v1";          // отметка «вход выполнен» (до закрытия вкладки)
  const SECRET = "семья";                // секретное слово: мы друг другу семья
  const MUSIC_KEY = "mili-music";        // включена ли музыка
  const ORDER = ["index.html", "valorant.html", "memes.html", "characters.html", "bro.html", "final.html"];
  // Переход на каждую страницу: свой эффект (k), цвет (c) и надпись (t)
  //   glitch — помехи как в игре, bam — комикс-взрыв, sakura — вихрь лепестков,
  //   heart — сердце-портал, warp — прыжок в гиперпространство, iris — круг
  const PAGE_META = {
    "index.html": { k: "iris", c: "#3a1670", t: "🎂" },
    "valorant.html": { k: "glitch", c: "#0d3a2d", t: "ХАЙЛАЙТЫ" },
    "memes.html": { k: "bam", c: "#ff2f78", t: "БАМ!" },
    "characters.html": { k: "sakura", c: "#ff7cbf", t: "ЭТО ВСЁ ТЫ" },
    "bro.html": { k: "heart", c: "#f06a48", t: "БРО" },
    "final.html": { k: "warp", c: "#08041a", t: "ФИНАЛ ✦" },
  };

  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const ss = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* приватный режим — не страшно */ } },
  };
  const loggedIn = () => ss.get(KEY) === "1";
  try { localStorage.removeItem("mili-bro-v1"); } catch (e) { /* старый вход по «бро» больше не нужен */ }

  /* =================================================================
     ОБЩИЕ ЭЛЕМЕНТЫ (создаются один раз и живут при переходах)
     ================================================================= */
  // Переливающееся «северное сияние» на фоне
  const aurora = document.createElement("div");
  aurora.className = "aurora";
  aurora.setAttribute("aria-hidden", "true");
  aurora.innerHTML = "<i></i><i></i><i></i>";
  body.prepend(aurora);

  // Подсветка за курсором (только на компьютере)
  if (finePointer && !reduceMotion) {
    const glow = document.createElement("div");
    glow.className = "cursor-glow";
    glow.setAttribute("aria-hidden", "true");
    body.append(glow);
    addEventListener("mousemove", (e) => { glow.style.translate = `${e.clientX}px ${e.clientY}px`; }, { passive: true });
  }

  // Тост
  let toastEl, toastTimer;
  function toast(text, ms = 2000) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      body.append(toastEl);
    }
    toastEl.textContent = text;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), ms);
  }

  // Картинка на весь экран
  const lb = document.createElement("div");
  lb.className = "lightbox";
  lb.innerHTML = '<button class="close" aria-label="Закрыть">✕</button><img alt="">';
  body.append(lb);
  const lbImg = lb.querySelector("img");
  const closeLb = () => { lb.classList.remove("open"); lbImg.removeAttribute("src"); };
  lb.addEventListener("click", closeLb);
  document.addEventListener("keydown", (e) => e.key === "Escape" && closeLb());

  /* ---------- Конфетти ---------- */
  function confetti(colors, amount = 140) {
    if (reduceMotion) amount = 30;
    const cvs = document.createElement("canvas");
    cvs.className = "confetti";
    body.append(cvs);
    const ctx = cvs.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = (cvs.width = innerWidth * dpr);
    const H = (cvs.height = innerHeight * dpr);
    const pal = colors || ["#b88cff", "#3dff9c", "#ff7ab6", "#ffd27a", "#ffffff"];
    const parts = Array.from({ length: amount }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.3,
      y: H * 0.55,
      vx: (Math.random() - 0.5) * 16 * dpr,
      vy: (-Math.random() * 18 - 8) * dpr,
      w: (6 + Math.random() * 6) * dpr,
      h: (8 + Math.random() * 8) * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      c: pal[(Math.random() * pal.length) | 0],
    }));
    const start = performance.now();
    (function frame(t) {
      const age = t - start;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, age - 2600) / 900);
      for (const p of parts) {
        p.vy += 0.45 * dpr;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (age < 3500) requestAnimationFrame(frame);
      else cvs.remove();
    })(start);
  }

  /* =================================================================
     МУЗЫКА — песня «Бро» (media/bro.mp3) + 8-битный «С днём рождения»
     при открытии подарка
     ================================================================= */
  const Music = (() => {
    const SONG_VOL = 0.8;     // обычная громкость песни
    const DUCK_VOL = 0.15;    // когда играет видео или 8-бит
    const POS_KEY = "mili-music-pos";
    const audio = new Audio("media/bro.mp3");
    audio.loop = true;
    audio.preload = "none";
    // Продолжить песню с того же места после перезагрузки страницы
    const savedPos = Number(ss.get(POS_KEY)) || 0;
    if (savedPos) audio.addEventListener("loadedmetadata", () => { try { audio.currentTime = savedPos % (audio.duration || 1e9); } catch (e) {} }, { once: true });
    addEventListener("pagehide", () => ss.set(POS_KEY, String(audio.currentTime || 0)));

    let ctx = null, fx = null, songGain = null;
    let playing = false, videoDuck = false, hbDuck = false, hbTimer = 0;
    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const R = null;

    // Web Audio: 8-бит + управление громкостью песни (на iPhone audio.volume не работает)
    function ensure() {
      if (ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      fx = ctx.createGain();
      fx.gain.value = 0.7;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 3400;
      fx.connect(lp);
      lp.connect(ctx.destination);
      // С диска (file://) браузер «глушит» песню через Web Audio — там управляем громкостью напрямую
      if (location.protocol !== "file:") {
        try {
          const src = ctx.createMediaElementSource(audio);
          songGain = ctx.createGain();
          songGain.gain.value = 0;
          src.connect(songGain);
          songGain.connect(ctx.destination);
        } catch (e) { songGain = null; }
      }
    }
    function setVol(v, smooth = 0.3) {
      if (songGain) {
        songGain.gain.cancelScheduledValues(ctx.currentTime);
        songGain.gain.setTargetAtTime(v, ctx.currentTime, smooth);
      } else {
        audio.volume = Math.min(1, Math.max(0, v));
      }
    }
    // Громкость, которую выбрала она сама ползунком (0…1), запоминаем на время сессии
    const VOL_KEY = "mili-music-vol";
    let userVol = Number(ss.get(VOL_KEY));
    if (!(userVol >= 0 && userVol <= 1) || ss.get(VOL_KEY) === null) userVol = 1;
    const targetVol = () => (videoDuck || hbDuck ? DUCK_VOL : SONG_VOL) * userVol;

    // --- 8-битные звуки ---
    function tone(type, m, t, dur, vol) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(mtof(m), t);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.setValueAtTime(vol, t + Math.max(0.01, dur * 0.6));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(fx);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
    function kick(t) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(160, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g);
      g.connect(fx);
      o.start(t);
      o.stop(t + 0.2);
    }
    // «С днём рождения тебя» (народная мелодия, свободная): [нота, доли]
    const HB = [
      [67, 0.75], [67, 0.25], [69, 1], [67, 1], [72, 1], [71, 2],
      [67, 0.75], [67, 0.25], [69, 1], [67, 1], [74, 1], [72, 2],
      [67, 0.75], [67, 0.25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2],
      [77, 0.75], [77, 0.25], [76, 1], [72, 1], [74, 1], [72, 3],
    ];
    const HB_BASS = [[R, 1], [48, 3], [43, 3], [43, 3], [48, 3], [48, 3], [41, 3], [48, 2], [43, 1], [48, 4]];

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "music-btn";
    btn.setAttribute("aria-label", "Включить или выключить музыку");
    btn.innerHTML = '<span class="note">♪</span><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
    body.append(btn);

    // Ползунок громкости рядом с кнопкой
    const volBox = document.createElement("label");
    volBox.className = "vol-box";
    volBox.innerHTML = '<span class="vol-ico" aria-hidden="true">🔊</span>' +
      '<input type="range" min="0" max="100" step="1" aria-label="Громкость музыки">';
    const volInput = volBox.querySelector("input");
    const volIco = volBox.querySelector(".vol-ico");
    volInput.value = Math.round(userVol * 100);
    const volIcon = () => { volIco.textContent = userVol === 0 ? "🔇" : userVol < 0.5 ? "🔉" : "🔊"; };
    volIcon();
    volInput.addEventListener("input", () => {
      userVol = volInput.value / 100;
      ss.set(VOL_KEY, String(userVol));
      volIcon();
      if (playing) setVol(targetVol(), 0.05);
    });
    body.append(volBox);

    const sync = () => btn.classList.toggle("on", playing);

    function start() {
      ensure();
      if (ctx) ctx.resume();
      ss.set(MUSIC_KEY, "on");
      if (playing) return;
      playing = true;
      if (!songGain) audio.volume = 0;
      const p = audio.play();
      if (p && p.catch) p.catch(() => { playing = false; sync(); });
      setVol(targetVol(), 0.6); // плавное нарастание
      sync();
    }
    function stop() {
      ss.set(MUSIC_KEY, "off");
      if (!playing) return;
      playing = false;
      setVol(0, 0.1);
      setTimeout(() => { if (!playing) audio.pause(); }, 400);
      sync();
    }
    // Тише, пока играет видео
    function duck(on) {
      videoDuck = on;
      if (playing) setVol(targetVol(), 0.25);
    }
    // Песня притихает, звучат фанфары и 8-битный «С днём рождения»
    function birthday() {
      if (!playing || !ctx) return;
      hbDuck = true;
      setVol(targetVol(), 0.2);
      const B = 60 / 112;
      let t = ctx.currentTime + 0.25;
      [60, 64, 67, 72, 76, 79, 84].forEach((m, k) => tone("square", m, t + k * 0.07, 0.12, 0.06));
      t += 0.7;
      let tm = t;
      for (const [m, d] of HB) { tone("square", m, tm, d * B * 0.9, 0.08); tone("square", m - 12, tm, d * B * 0.5, 0.025); tm += d * B; }
      let tb = t;
      for (const [m, d] of HB_BASS) {
        if (m !== R) { tone("triangle", m, tb, d * B * 0.95, 0.2); for (let k = 0; k < d; k++) kick(tb + k * B); }
        tb += d * B;
      }
      clearTimeout(hbTimer);
      hbTimer = setTimeout(() => { hbDuck = false; if (playing) setVol(targetVol(), 0.8); }, (tm - ctx.currentTime + 0.4) * 1000);
    }
    // Маленький «пуф» — лопнувший шарик
    function pop() {
      if (!playing || !ctx) return;
      const t = ctx.currentTime + 0.01;
      tone("square", 84 + Math.round(Math.random() * 7), t, 0.06, 0.05);
      tone("square", 96, t + 0.04, 0.05, 0.03);
    }

    // Свернула браузер — пауза, вернулась — играем дальше
    document.addEventListener("visibilitychange", () => {
      if (!playing) return;
      if (document.hidden) audio.pause();
      else { if (ctx) ctx.resume(); audio.play().catch(() => {}); }
    });

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (playing) stop(); else start();
    });

    // После перезагрузки браузер не даёт включить звук сам — ждём первого касания
    if (loggedIn() && ss.get(MUSIC_KEY) !== "off") {
      const resume = (e) => {
        if (e.target && e.target.closest && e.target.closest(".music-btn")) return; // кнопка сама разберётся
        removeEventListener("pointerdown", resume, true);
        removeEventListener("keydown", resume, true);
        if (ss.get(MUSIC_KEY) !== "off") start();
      };
      addEventListener("pointerdown", resume, true);
      addEventListener("keydown", resume, true);
    }

    return { start, stop, duck, birthday, pop, get playing() { return playing; } };
  })();

  /* =================================================================
     СОСТОЯНИЕ ТЕКУЩЕЙ СТРАНИЦЫ
     ================================================================= */
  let P = null;

  function teardown() {
    if (!P) return;
    if (P.ro) P.ro.disconnect();
    P.extra.forEach((el) => el.remove());
    const bar = document.querySelector(".topbar");
    if (bar) bar.remove();
  }

  /* ---------- Счётчики, которые «накручиваются» ---------- */
  function countUp(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = "1";
    const target = Number(el.dataset.count);
    const pre = el.dataset.prefix || "";
    const suf = el.dataset.suffix || "";
    if (reduceMotion) { el.textContent = pre + target + suf; return; }
    const t0 = performance.now();
    (function tick(t) {
      const k = clamp((t - t0) / 1500, 0, 1); // время кадра бывает чуть раньше старта
      el.textContent = pre + Math.round(target * (1 - Math.pow(1 - k, 3))) + suf;
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }

  // Разбить текст элемента на слова-спаны (теги внутри сохраняются)
  function splitWords(el, cls) {
    const words = [];
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const w = document.createElement("span");
            w.className = cls;
            w.style.setProperty("--i", words.length);
            w.textContent = part;
            words.push(w);
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== "BR") {
          walk(n);
        }
      });
    };
    walk(el);
    return words;
  }

  // Разбить заголовок на буквы; у каждой буквы своя случайная точка, откуда она прилетит.
  // Слова не разрываются при переносе строки.
  function splitChars(el) {
    const narrow = innerWidth < 600;
    const spread = narrow ? 0.55 : 1;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const w = document.createElement("span");
            w.className = "fw";
            Array.from(part).forEach((ch) => {
              const c = document.createElement("span");
              c.className = "ch";
              c.textContent = ch;
              const ang = Math.random() * Math.PI * 2;
              const dist = rnd(90, 260) * spread;
              c.style.cssText =
                `--tx:${(Math.cos(ang) * dist).toFixed(0)}px;--ty:${(Math.sin(ang) * dist * 0.8).toFixed(0)}px;` +
                `--rz:${rnd(-200, 200).toFixed(0)}deg;--sc:${rnd(-0.6, 1.4).toFixed(2)};--o:${rnd(0, 0.35).toFixed(2)}`;
              w.append(c);
            });
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== "BR") {
          walk(n);
        }
      });
    };
    walk(el);
  }

  // Показать блок (и запустить счётчики внутри)
  function showEl(el) {
    el.classList.add("in");
    if (el.dataset.count) countUp(el);
    el.querySelectorAll("[data-count]").forEach(countUp);
  }

  function init() {
    teardown();
    const pageNum = Number(body.dataset.page) || 0;
    P = { pending: [], ro: null, extra: [], fill: null, decor: null, tilts: [], zooms: [], scrubs: [], hs: [], para: [], flys: [] };
    const main = document.querySelector("main");

    /* ---------- Верхняя панель с прогрессом ---------- */
    if (pageNum > 0) {
      const bar = document.createElement("header");
      bar.className = "topbar";
      const dots = [1, 2, 3, 4, 5]
        .map((i) => `<li class="${i < pageNum ? "done" : i === pageNum ? "now" : ""}"></li>`)
        .join("");
      bar.innerHTML =
        `<a class="back" href="${ORDER[pageNum - 1]}" aria-label="Назад">←</a>` +
        `<ol class="dots" aria-label="Страница ${pageNum} из 5">${dots}</ol>` +
        `<span class="count">${pageNum}/5</span>` +
        `<div class="progress" aria-hidden="true"><i></i></div>`;
      body.prepend(bar);
      P.fill = bar.querySelector(".progress i");
    }

    /* ---------- Плавающие украшения (символы из data-decor) ---------- */
    if (body.dataset.decor) {
      const items = body.dataset.decor.split(",");
      const layer = document.createElement("div");
      layer.className = "decor";
      layer.setAttribute("aria-hidden", "true");
      const count = innerWidth > 900 ? 40 : 24;
      for (let i = 0; i < count; i++) {
        const s = document.createElement("span");
        s.textContent = items[i % items.length];
        s.style.left = (Math.random() * 96).toFixed(1) + "%";
        s.style.top = (Math.random() * 97).toFixed(1) + "%";
        s.style.fontSize = (12 + Math.random() * 24).toFixed(0) + "px";
        s.style.animationDuration = (4 + Math.random() * 8).toFixed(1) + "s";
        s.style.animationDelay = (-Math.random() * 8).toFixed(1) + "s";
        s.style.setProperty("--o", (0.25 + Math.random() * 0.45).toFixed(2));
        layer.append(s);
      }
      aurora.after(layer);
      P.decor = layer;
      P.extra.push(layer);
    }

    /* ---------- Праздничная гирлянда-флажки со своей надписью на каждой странице ---------- */
    if (body.dataset.banner) {
      const chars = Array.from(body.dataset.banner);
      const n = chars.length;
      const g = document.createElement("div");
      g.className = "bunting";
      g.setAttribute("role", "img");
      g.setAttribute("aria-label", body.dataset.banner);
      // Верёвочка провисает дугой — флажки висят по этой дуге
      g.innerHTML = '<svg class="rope" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true"><path d="M0 2 Q50 26 100 2"/></svg>';
      chars.forEach((ch, i) => {
        if (ch === " ") return; // пробел — просто промежуток
        const x = (i + 0.5) / n;                    // 0..1 по ширине
        const sag = 4 * x * (1 - x);                // 0..1 — насколько провисает
        const f = document.createElement("span");
        f.className = "flag";
        f.textContent = ch;
        f.style.left = (x * 100).toFixed(2) + "%";
        f.style.setProperty("--y", (sag * 22).toFixed(1) + "px");
        f.style.setProperty("--rot", ((x - 0.5) * -16).toFixed(1) + "deg");
        f.style.setProperty("--c", `var(--f${i % 4})`);
        f.style.setProperty("--i", i);
        g.append(f);
      });
      main.prepend(g);
    }

    /* ---------- Падающие звёзды на финале ---------- */
    if (body.classList.contains("theme-final")) {
      ["s1", "s2", "s3"].forEach((c) => {
        const s = document.createElement("i");
        s.className = "shooting " + c;
        s.setAttribute("aria-hidden", "true");
        body.append(s);
        P.extra.push(s);
      });
    }

    /* ---------- Бегущие строки ---------- */
    main.querySelectorAll(".ticker[data-text]").forEach((t) => {
      const track = document.createElement("div");
      track.className = "ticker-track";
      const chunk = (t.dataset.text + " ").repeat(4);
      for (let i = 0; i < 2; i++) {
        const sp = document.createElement("span");
        sp.textContent = chunk;
        track.append(sp);
      }
      t.setAttribute("aria-hidden", "true");
      t.append(track);
    });

    /* ---------- Заголовки из разлетевшихся букв и текст, который «загорается» ---------- */
    P.flys = [...main.querySelectorAll(".split")].map((el) => {
      splitChars(el);
      el.classList.add("fly");
      const k = reduceMotion ? 1 : 0;
      el.style.setProperty("--k", k);
      return { el, k };
    });
    main.querySelectorAll(".scrub").forEach((el) => P.scrubs.push({ el, words: splitWords(el, "sw"), n: -1 }));

    /* ---------- Разные способы появления ---------- */
    // Фото и видео — как полароид: переворачиваются в 3D и «проявляются»
    main.querySelectorAll(".grid2 > .clip.reveal").forEach((el, i) => el.classList.add("fx-polaroid", i % 2 ? "from-right" : "from-left"));
    main.querySelectorAll(".sticker.reveal, .memory.reveal, .pair.reveal").forEach((el) => el.classList.add("fx-polaroid"));
    main.querySelectorAll(".ava.reveal").forEach((el) => el.classList.add("fx-pop", "fx-develop"));

    /* ---------- Что двигается при прокрутке ---------- */
    P.tilts = [...main.querySelectorAll(".clip .frame, .memory > img, .memory > video, .grid2 > .sticker > img")];
    P.zooms = [...main.querySelectorAll(".zoom-in")];
    P.para = [...main.querySelectorAll("[data-speed]")].map((el) => ({ el, speed: Number(el.dataset.speed), base: 0 }));
    P.hs = [...main.querySelectorAll(".hscroll")].map((sec) => ({ sec, track: sec.querySelector(".hs-track"), dist: 0 }));

    /* ---------- Появление блоков, когда до них докрутили ---------- */
    // Проверяются в update() при каждой прокрутке; показанные убираются из списка
    P.pending = [...main.querySelectorAll(".reveal, .split, [data-count]")];
    if (reduceMotion) { P.pending.forEach(showEl); P.pending = []; }

    /* ---------- Обложка: вход по секретному слову ---------- */
    const gate = main.querySelector("#gate");
    if (gate) {
      const input = gate.querySelector("input");
      const err = gate.querySelector(".err");
      const misses = ["не-а 🙃", "холодно… 🥶", "ну подумай, кто мы друг другу? 🤨", "подсказка: пять букв, начинается на «с» 👀"];
      let tries = 0;
      if (loggedIn()) body.classList.add("unlocked");
      gate.addEventListener("submit", (e) => {
        e.preventDefault();
        const word = input.value.trim().toLowerCase().replace(/ё/g, "е").replace(/[!.?\s]+$/g, "");
        if (word === SECRET) {
          ss.set(KEY, "1");
          input.blur();
          body.classList.add("unlocked");
          confetti();
          Music.start(); // нажатие кнопки — браузер разрешает включить звук
        } else {
          err.textContent = misses[Math.min(tries, misses.length - 1)];
          tries++;
          gate.classList.remove("shake");
          void gate.offsetWidth;
          gate.classList.add("shake");
          input.select();
        }
      });
    }

    measure();
    if ("ResizeObserver" in window) {
      let rt;
      P.ro = new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(measure, 120); });
      P.ro.observe(main);
    }
  }

  /* =================================================================
     АНИМАЦИИ НА ПРОКРУТКЕ
     ================================================================= */
  function measure() {
    if (!P) return;
    // Горизонтальная лента: высота секции = экран + длина прокрутки вбок
    for (const h of P.hs) {
      h.track.style.translate = "0 0";
      const dist = Math.max(0, h.track.scrollWidth - innerWidth);
      h.dist = dist;
      h.sec.style.height = dist > 0 ? innerHeight + dist + "px" : "";
      h.sec.classList.toggle("static", dist === 0);
    }
    // Параллакс: запоминаем исходное положение без сдвига
    for (const p of P.para) {
      p.el.style.translate = "0 0";
      const r = p.el.getBoundingClientRect();
      p.base = r.top + scrollY + r.height / 2;
    }
    update();
  }

  let ticking = false;
  function requestUpdate() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  function update() {
    ticking = false;
    if (!P) return;
    const vh = innerHeight;
    const y = scrollY;
    const max = document.documentElement.scrollHeight - vh;
    const frac = max > 0 ? clamp(y / max, 0, 1) : 0;

    if (P.fill) P.fill.style.transform = `scaleX(${frac})`;

    // Появление блоков, до которых докрутили
    if (P.pending.length) {
      P.pending = P.pending.filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.9 && r.bottom > 0 && r.left < innerWidth && r.right > 0 && (r.width || r.height)) { showEl(el); return false; }
        return true;
      });
    }
    if (reduceMotion) {
      // Без движения: только прогресс и полностью видимый текст
      P.scrubs.forEach((s) => s.words.forEach((w) => w.classList.add("lit")));
      for (const h of P.hs) h.track.style.translate = `${-clamp(-h.sec.getBoundingClientRect().top / (h.dist || 1), 0, 1) * h.dist}px 0`;
      return;
    }

    // Буквы заголовков слетаются на место, пока заголовок поднимается по экрану.
    // Только вперёд: собранный заголовок обратно не разлетается.
    const atBottom = y >= max - 4;
    for (const f of P.flys) {
      if (f.k >= 1) continue;
      const r = f.el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      if (r.bottom < 0) { f.k = 1; f.el.style.setProperty("--k", 1); continue; } // проскочили — просто собрать
      const p = clamp((vh * 0.98 - r.top) / (vh * 0.42), 0, 1);
      let e = atBottom && r.top < vh ? 1 : 1 - Math.pow(1 - p, 3);
      if (e > 0.985) e = 1;
      if (e > f.k) { f.k = e; f.el.style.setProperty("--k", e.toFixed(3)); }
    }

    // Глубина: фон и украшения едут медленнее контента
    aurora.style.translate = `0 ${(-frac * 12).toFixed(2)}vh`;
    if (P.decor) P.decor.style.translate = `0 ${(-frac * 70).toFixed(2)}vh`;

    for (const p of P.para) {
      const d = p.base - y - vh / 2;
      p.el.style.translate = `0 ${(-d * p.speed).toFixed(1)}px`;
    }

    // Наклон карточек в 3D в зависимости от положения на экране
    for (const el of P.tilts) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) continue;
      const p = clamp((r.top + r.height / 2 - vh / 2) / vh, -1, 1);
      el.style.transform = `perspective(1100px) rotateX(${(p * 16).toFixed(2)}deg) scale(${(1 - Math.abs(p) * 0.08).toFixed(3)})`;
    }

    // Сцены, которые вырастают из центра
    for (const el of P.zooms) {
      const r = el.getBoundingClientRect();
      const c = r.top + r.height / 2;
      const p = clamp((vh * 1.05 - c) / (vh * 0.55), 0, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.style.scale = (0.55 + 0.45 * e).toFixed(3);
      el.style.opacity = (0.1 + 0.9 * e).toFixed(3);
    }

    // Слова загораются по мере чтения
    for (const s of P.scrubs) {
      const r = s.el.getBoundingClientRect();
      const p = clamp((vh * 0.9 - r.top) / (r.height + vh * 0.3), 0, 1);
      const n = Math.round(p * s.words.length);
      if (n !== s.n) {
        s.words.forEach((w, i) => w.classList.toggle("lit", i < n));
        s.n = n;
      }
    }

    // Горизонтальная лента: листаешь вниз — едет вбок
    for (const h of P.hs) {
      if (!h.dist) continue;
      const r = h.sec.getBoundingClientRect();
      const p = clamp(-r.top / h.dist, 0, 1);
      h.track.style.translate = `${(-p * h.dist).toFixed(1)}px 0`;
      h.sec.style.setProperty("--hp", p.toFixed(3));
    }
  }

  addEventListener("scroll", requestUpdate, { passive: true });
  addEventListener("resize", () => { measure(); });
  addEventListener("load", () => { measure(); });

  /* =================================================================
     ПЕРЕХОДЫ МЕЖДУ СТРАНИЦАМИ БЕЗ ПЕРЕЗАГРУЗКИ
     (чтобы музыка не прерывалась; если не получилось — обычный переход)
     ================================================================= */
  let navigating = false;

  const esc = (s) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const rnd = (a, b) => a + Math.random() * (b - a);

  // 12-лучевая звезда для комикс-взрыва
  const STAR = Array.from({ length: 24 }, (_, k) => {
    const a = (k / 24) * Math.PI * 2, r = k % 2 ? 36 : 50;
    return `${(50 + Math.cos(a) * r).toFixed(1)}% ${(50 + Math.sin(a) * r).toFixed(1)}%`;
  }).join(",");

  // Собрать слой перехода для нужной страницы
  function buildTx(meta, x, y) {
    const el = document.createElement("div");
    const kind = reduceMotion ? "fade" : meta.k;
    el.className = "tx tx-" + kind;
    el.setAttribute("aria-hidden", "true");
    el.style.setProperty("--c", meta.c);
    el.style.setProperty("--x", x + "px");
    el.style.setProperty("--y", y + "px");
    const label = `<b class="tx-label" data-text="${esc(meta.t)}">${esc(meta.t)}</b>`;
    let html = "";
    if (kind === "glitch") {
      for (let i = 0; i < 8; i++) html += `<i style="--i:${i};--s:${i % 2 ? 1 : -1}"></i>`;
    } else if (kind === "bam") {
      html = `<div class="burst b1" style="clip-path:polygon(${STAR})"></div><div class="burst b2" style="clip-path:polygon(${STAR})"></div>`;
    } else if (kind === "sakura") {
      html = '<div class="bg"></div>';
      const n = innerWidth > 900 ? 34 : 22;
      for (let i = 0; i < n; i++) {
        html += `<i style="top:${rnd(-10, 100).toFixed(1)}%;font-size:${rnd(16, 38).toFixed(0)}px;` +
          `--dl:${rnd(0, 0.6).toFixed(2)}s;--dur:${rnd(1.1, 1.7).toFixed(2)}s;--dy:${rnd(-30, 30).toFixed(0)}vh;--r:${rnd(240, 720).toFixed(0)}deg">${i % 3 ? "🌸" : "✿"}</i>`;
      }
    } else if (kind === "heart") {
      html = '<svg class="heart" viewBox="0 0 100 92"><defs><linearGradient id="txh" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#ff9a76"/><stop offset="1" stop-color="#f0486a"/></linearGradient></defs>' +
        '<path fill="url(#txh)" d="M50 90 C 20 68 0 50 0 27 C 0 11 12 0 27 0 C 37 0 45 6 50 14 C 55 6 63 0 73 0 C 88 0 100 11 100 27 C 100 50 80 68 50 90 Z"/></svg>';
    } else if (kind === "warp") {
      html = "<canvas></canvas>";
    } else {
      html = '<div class="bg"></div>';
    }
    el.innerHTML = html + label;
    body.append(el);
    if (kind === "warp") warp(el);
    return el;
  }

  // Звёзды, летящие из центра (прыжок в гиперпространство)
  function warp(el) {
    const cvs = el.querySelector("canvas");
    const c2 = cvs.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = (cvs.width = innerWidth * dpr), H = (cvs.height = innerHeight * dpr);
    const cx = W / 2, cy = H / 2, maxD = Math.hypot(cx, cy);
    const cols = ["#ffffff", "#ffd27a", "#c79bff", "#8fd8ff"];
    const stars = Array.from({ length: 260 }, () => ({ a: Math.random() * Math.PI * 2, d: Math.random() * maxD * 0.6, v: rnd(2, 6), c: cols[(Math.random() * 4) | 0] }));
    const t0 = performance.now();
    c2.fillStyle = "#08041a";
    c2.fillRect(0, 0, W, H);
    (function frame(t) {
      if (!el.isConnected) return;
      const acc = 1 + Math.min(1, (t - t0) / 700) * 12; // разгон
      c2.fillStyle = "rgba(8,4,26,.32)";
      c2.fillRect(0, 0, W, H);
      c2.lineCap = "round";
      for (const s of stars) {
        const d0 = s.d;
        s.d += s.v * acc * dpr * (0.3 + s.d / maxD);
        if (s.d > maxD) { s.d = rnd(0, 40) * dpr; continue; }
        const ca = Math.cos(s.a), sa = Math.sin(s.a);
        c2.strokeStyle = s.c;
        c2.globalAlpha = Math.min(1, s.d / (maxD * 0.25));
        c2.lineWidth = (0.6 + (s.d / maxD) * 2.4) * dpr;
        c2.beginPath();
        c2.moveTo(cx + ca * d0, cy + sa * d0);
        c2.lineTo(cx + ca * s.d, cy + sa * s.d);
        c2.stroke();
      }
      c2.globalAlpha = 1;
      requestAnimationFrame(frame);
    })(t0);
  }

  const TX_IN = 760, TX_HOLD = 180, TX_OUT = 720; // длительности фаз, мс

  async function go(href, opts = {}) {
    if (navigating) return;
    const name = href.split(/[?#]/)[0] || "index.html";
    if (name !== "index.html" && !loggedIn()) { location.href = "index.html"; return; }
    navigating = true;
    const meta = PAGE_META[name] || { k: "iris", c: "#3a1670", t: "✨" };
    const x = opts.x != null ? opts.x : innerWidth / 2;
    const y = opts.y != null ? opts.y : innerHeight / 2;
    closeLb();
    document.querySelectorAll(".tx").forEach((o) => o.remove()); // остатки прошлого перехода
    const fetching = fetch(name, { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); });
    fetching.catch(() => {}); // ошибку разберём ниже
    const tx = buildTx(meta, x, y);
    void tx.offsetWidth; // чтобы анимация точно стартовала с начала
    tx.classList.add("in");
    body.classList.add("leaving");
    await wait(reduceMotion ? 200 : TX_IN);

    let doc;
    try {
      doc = new DOMParser().parseFromString(await fetching, "text/html");
      if (!doc.querySelector("main")) throw new Error("нет main");
    } catch (e) {
      location.href = name; // например, при открытии с диска — просто обычный переход
      return;
    }
    await wait(reduceMotion ? 0 : TX_HOLD);

    document.querySelectorAll("video").forEach((v) => v.pause());
    Music.duck(false);
    document.title = doc.title;
    // Сначала сбрасываем классы и даём браузеру пересчитать стили — иначе Chrome
    // иногда оставляет цвета текста от прошлой страницы
    body.className = doc.body.className;
    ["page", "decor", "banner"].forEach((k) => {
      const v = doc.body.dataset[k];
      if (v == null) delete body.dataset[k]; else body.dataset[k] = v;
    });
    const tcNew = doc.querySelector('meta[name="theme-color"]');
    const tcOld = document.querySelector('meta[name="theme-color"]');
    if (tcNew && tcOld) tcOld.content = tcNew.content;
    const newMain = document.importNode(doc.querySelector("main"), true);
    document.querySelector("main").replaceWith(newMain);
    if (opts.push !== false) history.pushState({ p: name }, "", name);
    scrollTo(0, 0);
    try { init(); } catch (e) { console.error(e); }
    tx.classList.add("out");
    await wait(reduceMotion ? 200 : TX_OUT);
    tx.remove();
    party(); // хлопушка на новой странице
    navigating = false;
  }

  history.replaceState({ p: location.pathname.split("/").pop() || "index.html" }, "", location.href);
  addEventListener("popstate", () => go(location.pathname.split("/").pop() || "index.html", { push: false }));
  addEventListener("pageshow", (e) => {
    if (e.persisted) { body.classList.remove("leaving"); document.querySelectorAll(".tx").forEach((o) => o.remove()); navigating = false; }
  });

  /* =================================================================
     НАЖАТИЯ
     ================================================================= */
  document.addEventListener("click", (e) => {
    // Переходы по страницам сайта
    const a = e.target.closest("a[href]");
    if (a && !a.target) {
      const href = a.getAttribute("href");
      if (/^[\w-]+\.html$/.test(href)) {
        e.preventDefault();
        if (a.hasAttribute("data-ds")) {
          toast(a.dataset.ds, 1400);
          setTimeout(() => go(href, { x: e.clientX, y: e.clientY }), 900);
        } else {
          go(href, { x: e.clientX, y: e.clientY });
        }
        return;
      }
    }

    // Картинка на весь экран
    const z = e.target.closest("img.zoomable");
    if (z) {
      lbImg.src = z.currentSrc || z.src;
      lbImg.alt = z.alt;
      lb.classList.add("open");
      return;
    }

    // Котик
    const peek = e.target.closest(".peek");
    if (peek) {
      peek.closest(".cat-card").classList.add("open");
      confetti(["#ff6fae", "#ffffff", "#bfa8ff", "#ffd1e6"], 70);
      return;
    }

    // Подарок
    const gift = e.target.closest("#gift");
    if (gift && !gift.classList.contains("open")) {
      const prize = document.getElementById("prize");
      const qr = document.getElementById("qr");
      // QR каждый день новый — грузим с меткой времени, чтобы телефон не взял старый из кэша
      qr.src = "qr.png?v=" + Date.now();
      gift.classList.add("open");
      gift.setAttribute("aria-expanded", "true");
      confetti(["#c79bff", "#3dff9c", "#ffd27a", "#ff8fc7", "#ffffff"], 180);
      Music.birthday();
      setTimeout(() => {
        prize.classList.add("shown");
        prize.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
        measure();
      }, 650);
      return;
    }

    // Последняя кнопка
    if (e.target.closest("#ds-final")) {
      confetti(["#c79bff", "#3dff9c", "#ffd27a", "#ffffff"], 120);
      toast("жду тебя в войсе 🎧💜", 2600);
    }
  });

  // Только одно видео играет одновременно, музыка на это время тише
  document.addEventListener("play", (e) => {
    if (e.target.tagName !== "VIDEO") return;
    document.querySelectorAll("video").forEach((o) => o !== e.target && o.pause());
    Music.duck(true);
  }, true);
  const unduck = (e) => {
    if (e.target.tagName !== "VIDEO") return;
    if (![...document.querySelectorAll("video")].some((v) => !v.paused)) Music.duck(false);
  };
  document.addEventListener("pause", unduck, true);
  document.addEventListener("ended", unduck, true);

  /* =================================================================
     ПРАЗДНИК: хлопушки и воздушные шарики
     ================================================================= */
  // Хлопушка: конфетти вылетает из двух нижних углов
  function party() {
    if (reduceMotion) return;
    const cs = getComputedStyle(body);
    const pal = ["--a1", "--a2", "--a3", "--accent"].map((v) => cs.getPropertyValue(v).trim()).filter(Boolean).concat("#ffffff", "#ffd27a");
    const cvs = document.createElement("canvas");
    cvs.className = "confetti";
    body.append(cvs);
    const ctx2 = cvs.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = (cvs.width = innerWidth * dpr), H = (cvs.height = innerHeight * dpr);
    const parts = [];
    [0, 1].forEach((side) => {
      for (let i = 0; i < 45; i++) {
        const ang = (side ? -1 : 1) * (0.35 + Math.random() * 0.5); // летит вверх и к центру
        const sp = (14 + Math.random() * 12) * dpr;
        parts.push({
          x: side ? W : 0, y: H,
          vx: Math.sin(ang) * sp, vy: -Math.cos(ang) * sp,
          w: (5 + Math.random() * 6) * dpr, h: (7 + Math.random() * 8) * dpr,
          rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
          c: pal[(Math.random() * pal.length) | 0],
        });
      }
    });
    const t0 = performance.now();
    (function frame(t) {
      const age = t - t0;
      ctx2.clearRect(0, 0, W, H);
      ctx2.globalAlpha = Math.max(0, 1 - Math.max(0, age - 1800) / 700);
      for (const p of parts) {
        p.vy += 0.5 * dpr; p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx2.save(); ctx2.translate(p.x, p.y); ctx2.rotate(p.rot);
        ctx2.fillStyle = p.c; ctx2.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx2.restore();
      }
      if (age < 2600) requestAnimationFrame(frame); else cvs.remove();
    })(t0);
  }

  // Воздушные шарики: время от времени всплывают снизу, лопаются по тапу
  if (!reduceMotion) {
    const layer = document.createElement("div");
    layer.className = "balloons";
    layer.setAttribute("aria-hidden", "true");
    body.append(layer);
    const spawn = () => {
      if (!document.hidden && (body.classList.contains("unlocked") || Number(body.dataset.page) > 0)) {
        if (layer.children.length < 3) {
          const b = document.createElement("span");
          b.className = "balloon";
          b.style.left = (6 + Math.random() * 80).toFixed(1) + "%";
          b.style.setProperty("--c", `var(--a${1 + ((Math.random() * 3) | 0)}, #ff7ab6)`);
          b.style.setProperty("--s", (0.75 + Math.random() * 0.5).toFixed(2));
          b.style.setProperty("--dur", (11 + Math.random() * 6).toFixed(1) + "s");
          b.style.setProperty("--sway", (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 20) + "px");
          b.addEventListener("animationend", () => b.remove());
          layer.append(b);
        }
      }
      setTimeout(spawn, 4500 + Math.random() * 4500);
    };
    setTimeout(spawn, 2500);
    // Лопнуть шарик
    layer.addEventListener("pointerdown", (e) => {
      const b = e.target.closest(".balloon");
      if (!b || b.classList.contains("popped")) return;
      e.stopPropagation();
      const r = b.getBoundingClientRect();
      b.classList.add("popped");
      Music.pop();
      // Брызги конфетти из шарика
      for (let k = 0; k < 14; k++) {
        const s = document.createElement("i");
        s.className = "spark-p";
        const ang = (k / 14) * Math.PI * 2;
        const dist = 30 + Math.random() * 40;
        s.style.left = r.left + r.width / 2 + "px";
        s.style.top = r.top + r.height * 0.4 + "px";
        s.style.setProperty("--x", (Math.cos(ang) * dist).toFixed(1) + "px");
        s.style.setProperty("--y", (Math.sin(ang) * dist).toFixed(1) + "px");
        body.append(s);
        setTimeout(() => s.remove(), 700);
      }
      setTimeout(() => b.remove(), 260);
    });
  }

  // Искры при касании экрана
  if (!reduceMotion) {
    document.addEventListener("pointerdown", (e) => {
      if (e.target.closest("video, input")) return;
      for (let k = 0; k < 9; k++) {
        const s = document.createElement("i");
        s.className = "spark-p";
        const ang = (k / 9) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 26 + Math.random() * 26;
        s.style.left = e.clientX + "px";
        s.style.top = e.clientY + "px";
        s.style.setProperty("--x", (Math.cos(ang) * dist).toFixed(1) + "px");
        s.style.setProperty("--y", (Math.sin(ang) * dist).toFixed(1) + "px");
        body.append(s);
        setTimeout(() => s.remove(), 700);
      }
    }, { passive: true });
  }

  init();
  if (Number(body.dataset.page) > 0) setTimeout(party, 700); // хлопушка и при обычной загрузке
})();
