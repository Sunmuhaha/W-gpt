/* =====================================================================
   Floating Music Player (red glassmorphism) — ใช้ร่วมกับหน้าแชท Botpress
   - เป็นสคริปต์อิสระ (IIFE) ไม่ชนกับตัวแปรเดิมของหน้าแชท ($, store, chat, input ฯลฯ)
   - สร้าง HTML + CSS เองทั้งหมด ไม่ต้องแก้ HTML เดิม
   วิธีใช้: วางไฟล์นี้ + ไฟล์เพลง/รูปปก ไว้โฟลเดอร์เดียวกับหน้าแชท
            แล้วเพิ่มบรรทัดนี้ก่อน </body> :  <script src="music-player.js"></script>
   (หรือจะคัดลอกโค้ดนี้ไปต่อท้ายสคริปต์เดิมก็ได้)
   ===================================================================== */
(function () {
  'use strict';
  if (window.__mpLoaded) return;
  window.__mpLoaded = true;

  /* ---------- ตั้งค่ารายการเพลง (ชื่อไฟล์อยู่โฟลเดอร์เดียวกับหน้าแชท) ---------- */
  const PLAYLIST = [
    { file: 'song1.mp3', title: 'ชื่อเพลง 1', artist: 'ศิลปิน 1', cover: 'cover1.jpg' }
  ];
  const DEFAULT_VOLUME = 0.8;
  const DEFAULT_TOP = 76;      // ระยะจากขอบบนตอนเปิดครั้งแรก (px) กันไปทับช่องพิมพ์ด้านล่าง
  const DEFAULT_RIGHT = 14;    // ระยะจากขอบขวาตอนเปิดครั้งแรก (px)
  const STORE_KEY = 'mp_state';

  /* ---------- CSS (ทุกกฎขึ้นต้นด้วย #mpPlayer เพื่อไม่ชนกับสไตล์เดิม) ---------- */
  const CSS = `
  #mpPlayer{position:fixed;left:0;top:0;z-index:80;color:#fff;font-family:inherit;line-height:1.35;
    user-select:none;-webkit-user-select:none;touch-action:none;cursor:grab;
    background:linear-gradient(135deg,rgba(255,70,95,.30),rgba(120,0,25,.40));
    -webkit-backdrop-filter:blur(22px) saturate(170%);backdrop-filter:blur(22px) saturate(170%);
    border:1px solid rgba(255,255,255,.28);border-radius:22px;
    box-shadow:0 14px 40px rgba(110,0,20,.5),inset 0 1px 0 rgba(255,255,255,.4);
    transition:box-shadow .2s}
  #mpPlayer *{box-sizing:border-box;margin:0}
  #mpPlayer.mp-dragging{cursor:grabbing;box-shadow:0 22px 55px rgba(110,0,20,.65),inset 0 1px 0 rgba(255,255,255,.45)}
  #mpPlayer.mp-collapsed{width:250px}
  #mpPlayer.mp-expanded{width:290px}
  #mpPlayer.mp-collapsed .mp-full{display:none}
  #mpPlayer.mp-expanded .mp-mini{display:none}

  #mpPlayer .mp-btn{border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.14);color:#fff;
    cursor:pointer;display:grid;place-items:center;border-radius:50%;padding:0;flex-shrink:0;
    font-family:inherit;transition:transform .15s,background .15s}
  #mpPlayer .mp-btn:hover{background:rgba(255,255,255,.28)}
  #mpPlayer .mp-btn:active{transform:scale(.92)}
  #mpPlayer .mp-btn svg{width:55%;height:55%;fill:currentColor;display:block}
  #mpPlayer .mp-play .mp-ic-pause,#mpPlayer.mp-playing .mp-play .mp-ic-play{display:none}
  #mpPlayer.mp-playing .mp-play .mp-ic-pause{display:block}

  #mpPlayer .mp-cover{position:relative;overflow:hidden;flex-shrink:0;display:grid;place-items:center;
    background:linear-gradient(135deg,#ff4d6a,#8c0a22);border:1px solid rgba(255,255,255,.3)}
  #mpPlayer .mp-cover svg{width:45%;height:45%;fill:rgba(255,255,255,.7)}
  #mpPlayer .mp-cover img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none;
    max-width:none;border-radius:0;margin:0}

  #mpPlayer .mp-mini{display:flex;align-items:center;gap:10px;padding:10px 12px;animation:mpFade .25s}
  #mpPlayer .mp-mini .mp-cover{width:48px;height:48px;border-radius:50%;
    animation:mpSpin 8s linear infinite;animation-play-state:paused}
  #mpPlayer.mp-playing .mp-mini .mp-cover{animation-play-state:running}
  #mpPlayer .mp-mini .mp-info{flex:1;min-width:0}
  #mpPlayer .mp-mini .mp-btn{width:34px;height:34px}
  #mpPlayer .mp-title{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #mpPlayer .mp-artist{font-size:12px;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #mpPlayer .mp-mini .mp-title{font-size:14px}

  #mpPlayer .mp-full{padding:12px 16px 18px;animation:mpFade .25s}
  #mpPlayer .mp-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
  #mpPlayer .mp-grip{letter-spacing:2px;opacity:.6;font-size:13px}
  #mpPlayer .mp-top .mp-btn{width:30px;height:30px}
  #mpPlayer .mp-full .mp-cover{width:100%;aspect-ratio:1/1;border-radius:18px;margin-bottom:14px;
    box-shadow:0 10px 26px rgba(90,0,15,.45)}
  #mpPlayer .mp-full .mp-title{font-size:18px;text-align:center}
  #mpPlayer .mp-full .mp-artist{font-size:13px;text-align:center;margin-bottom:12px}

  #mpPlayer .mp-seekrow{display:flex;align-items:center;gap:8px;font-size:11px;opacity:.9}
  #mpPlayer .mp-seekrow span{width:34px;text-align:center;font-variant-numeric:tabular-nums}
  #mpPlayer input[type=range]{-webkit-appearance:none;appearance:none;flex:1;min-width:0;height:5px;padding:0;
    border:0;border-radius:5px;outline:none;cursor:pointer;
    background:linear-gradient(to right,#fff var(--v,0%),rgba(255,255,255,.25) var(--v,0%))}
  #mpPlayer input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;
    border-radius:50%;background:#fff;box-shadow:0 0 8px rgba(255,60,90,.9)}
  #mpPlayer input[type=range]::-moz-range-thumb{width:13px;height:13px;border:none;border-radius:50%;background:#fff}

  #mpPlayer .mp-controls{display:flex;justify-content:center;align-items:center;gap:18px;margin:14px 0 12px}
  #mpPlayer .mp-controls .mp-btn{width:42px;height:42px}
  #mpPlayer .mp-controls .mp-play{width:56px;height:56px;
    background:linear-gradient(135deg,rgba(255,255,255,.45),rgba(255,255,255,.15));
    box-shadow:0 6px 18px rgba(255,40,70,.5)}
  #mpPlayer .mp-volrow{display:flex;align-items:center;gap:8px;opacity:.85}
  #mpPlayer .mp-volrow svg{width:16px;height:16px;fill:#fff;flex-shrink:0}

  /* โหมดประหยัดเครื่องของหน้าแชท (body.f1..f5) */
  body.f2 #mpPlayer{-webkit-backdrop-filter:none;backdrop-filter:none;background:rgba(110,10,28,.88);box-shadow:none}
  body.f4 #mpPlayer,body.f4 #mpPlayer *{animation:none!important;transition:none!important}

  @keyframes mpSpin{to{transform:rotate(360deg)}}
  @keyframes mpFade{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:none}}`;

  const NOTE = '<svg viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>';
  const PLAYPAUSE =
    '<svg class="mp-ic-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>' +
    '<svg class="mp-ic-pause" viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';

  const HTML = `
  <div class="mp-mini">
    <div class="mp-cover">${NOTE}<img alt=""></div>
    <div class="mp-info"><div class="mp-title">-</div><div class="mp-artist">-</div></div>
    <button type="button" class="mp-btn mp-play" aria-label="เล่น/หยุด">${PLAYPAUSE}</button>
    <button type="button" class="mp-btn mp-toggle" aria-label="ขยาย"><svg viewBox="0 0 24 24"><path d="M7 14l5-5 5 5z"/></svg></button>
  </div>
  <div class="mp-full">
    <div class="mp-top">
      <span class="mp-grip">⋮⋮ กำลังเล่น</span>
      <button type="button" class="mp-btn mp-toggle" aria-label="ย่อ"><svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg></button>
    </div>
    <div class="mp-cover">${NOTE}<img alt=""></div>
    <div class="mp-title">-</div>
    <div class="mp-artist">-</div>
    <div class="mp-seekrow">
      <span class="mp-cur">0:00</span>
      <input type="range" class="mp-seek" min="0" max="100" step="0.1" value="0" aria-label="ตำแหน่งเพลง">
      <span class="mp-dur">0:00</span>
    </div>
    <div class="mp-controls">
      <button type="button" class="mp-btn mp-prev" aria-label="ก่อนหน้า"><svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg></button>
      <button type="button" class="mp-btn mp-play" aria-label="เล่น/หยุด">${PLAYPAUSE}</button>
      <button type="button" class="mp-btn mp-next" aria-label="ถัดไป"><svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6zm10-12v12h2V6z"/></svg></button>
    </div>
    <div class="mp-volrow">
      <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z"/></svg>
      <input type="range" class="mp-vol" min="0" max="1" step="0.01" value="0.8" aria-label="ระดับเสียง">
    </div>
  </div>`;

  function boot() {
    if (!PLAYLIST.length || document.getElementById('mpPlayer')) return;

    const style = document.createElement('style');
    style.id = 'mpStyle';
    style.textContent = CSS;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = 'mpPlayer';
    root.className = 'mp-collapsed';
    root.innerHTML = HTML;
    document.body.appendChild(root);

    const q = s => root.querySelector(s);
    const qa = s => Array.from(root.querySelectorAll(s));
    const seek = q('.mp-seek'), vol = q('.mp-vol');

    /* ---------- เก็บ/อ่านสถานะ ---------- */
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) {}
    const save = () => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify({
          x: want.x, y: want.y, expanded: root.classList.contains('mp-expanded'), vol: audio.volume
        }));
      } catch (e) {}
    };

    /* ---------- เสียง ---------- */
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = saved && isFinite(saved.vol) ? Math.min(1, Math.max(0, saved.vol)) : DEFAULT_VOLUME;
    audio.loop = PLAYLIST.length === 1;       // เพลงเดียวก็วนซ้ำ
    let idx = 0;

    const fmt = s => isFinite(s) ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '0:00';
    const fill = el => el.style.setProperty('--v', ((el.value - el.min) / (el.max - el.min) * 100) + '%');

    function load(i) {
      idx = (i + PLAYLIST.length) % PLAYLIST.length;
      const t = PLAYLIST[idx];
      audio.src = encodeURI(t.file);
      qa('.mp-title').forEach(e => e.textContent = t.title || '-');
      qa('.mp-artist').forEach(e => e.textContent = t.artist || '-');
      qa('.mp-cover img').forEach(img => {
        img.style.display = 'none';
        if (t.cover) {
          img.onload = () => { img.style.display = 'block'; };
          img.onerror = () => { img.style.display = 'none'; };
          img.src = encodeURI(t.cover);
        } else img.removeAttribute('src');
      });
      seek.value = 0; fill(seek);
      q('.mp-cur').textContent = '0:00'; q('.mp-dur').textContent = '0:00';
      if ('mediaSession' in navigator && window.MediaMetadata) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: t.title || '', artist: t.artist || '',
          artwork: t.cover ? [{ src: t.cover }] : []
        });
      }
    }
    const play = () => { audio.play().catch(() => {}); };
    const toggle = () => { audio.paused ? play() : audio.pause(); };
    const next = auto => { const was = auto || !audio.paused; load(idx + 1); if (was) play(); };
    const prev = () => { const was = !audio.paused; load(idx - 1); if (was) play(); };

    audio.addEventListener('play', () => root.classList.add('mp-playing'));
    audio.addEventListener('pause', () => root.classList.remove('mp-playing'));
    audio.addEventListener('ended', () => next(true));                  // เล่นวนไปเรื่อยๆ
    audio.addEventListener('error', () => { if (PLAYLIST.length > 1) setTimeout(() => next(true), 800); });
    audio.addEventListener('loadedmetadata', () => { q('.mp-dur').textContent = fmt(audio.duration); });
    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      seek.value = audio.currentTime / audio.duration * 100; fill(seek);
      q('.mp-cur').textContent = fmt(audio.currentTime);
    });

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', play);
        navigator.mediaSession.setActionHandler('pause', () => audio.pause());
        navigator.mediaSession.setActionHandler('previoustrack', prev);
        navigator.mediaSession.setActionHandler('nexttrack', () => next());
      } catch (e) {}
    }

    qa('.mp-play').forEach(b => b.addEventListener('click', toggle));
    q('.mp-prev').addEventListener('click', prev);
    q('.mp-next').addEventListener('click', () => next());
    seek.addEventListener('input', () => {
      if (audio.duration) audio.currentTime = seek.value / 100 * audio.duration;
      fill(seek);
    });
    vol.value = audio.volume; fill(vol);
    vol.addEventListener('input', () => { audio.volume = vol.value; fill(vol); });
    vol.addEventListener('change', save);

    /* ---------- ตำแหน่ง / ลาก / ย่อ-ขยาย ---------- */
    const M = 6;                                   // ระยะห่างจากขอบจอ
    const want = { x: 0, y: 0 };                   // ตำแหน่งที่ผู้ใช้ต้องการ (กันหลุดตอนคีย์บอร์ดมือถือเด้ง)
    function apply() {
      const w = root.offsetWidth, h = root.offsetHeight;
      const x = Math.min(Math.max(M, want.x), Math.max(M, innerWidth - w - M));
      const y = Math.min(Math.max(M, want.y), Math.max(M, innerHeight - h - M));
      root.style.left = x + 'px';
      root.style.top = y + 'px';
    }

    let drag = null;
    root.addEventListener('pointerdown', e => {
      if (e.target.closest('button,input')) return;
      const r = root.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      try { root.setPointerCapture(e.pointerId); } catch (err) {}
      root.classList.add('mp-dragging');
    });
    root.addEventListener('pointermove', e => {
      if (!drag) return;
      want.x = e.clientX - drag.dx; want.y = e.clientY - drag.dy;
      apply();
      const r = root.getBoundingClientRect();     // เก็บค่าที่ถูกจำกัดในจอแล้ว
      want.x = r.left; want.y = r.top;
    });
    const endDrag = () => {
      if (!drag) return;
      drag = null; root.classList.remove('mp-dragging'); save();
    };
    root.addEventListener('pointerup', endDrag);
    root.addEventListener('pointercancel', endDrag);

    function setExpanded(on) {
      const r = root.getBoundingClientRect();
      root.classList.toggle('mp-expanded', on);
      root.classList.toggle('mp-collapsed', !on);
      const n = root.getBoundingClientRect();
      // ยึดขอบที่อยู่ใกล้ขอบจอมากกว่าไว้ ไม่ให้เด้งหลุดจอ
      want.x = (r.left + r.width / 2 > innerWidth / 2) ? r.right - n.width : r.left;
      want.y = (r.top + r.height / 2 > innerHeight / 2) ? r.bottom - n.height : r.top;
      apply(); save();
    }
    const isOpen = () => root.classList.contains('mp-expanded');
    qa('.mp-toggle').forEach(b => b.addEventListener('click', () => setExpanded(!isOpen())));
    root.addEventListener('dblclick', e => {
      if (!e.target.closest('button,input')) setExpanded(!isOpen());
    });
    addEventListener('resize', apply);

    /* ---------- เริ่มต้น ---------- */
    if (saved && saved.expanded) { root.classList.add('mp-expanded'); root.classList.remove('mp-collapsed'); }
    if (saved && isFinite(saved.x) && isFinite(saved.y)) { want.x = saved.x; want.y = saved.y; }
    else { want.x = innerWidth - root.offsetWidth - DEFAULT_RIGHT; want.y = DEFAULT_TOP; }
    apply();
    load(0);

    // ให้สั่งจากสคริปต์อื่นได้ เช่น MusicPlayer.pause()
    window.MusicPlayer = { play, pause: () => audio.pause(), toggle, next: () => next(), prev, audio };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
