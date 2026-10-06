/* audio.js
   ---------------------------------------------------------------
   All sound for Piggu's Birthday Adventure.

   Three separate things live here:

     MUSIC  - background tracks, one per mood, faded in and out
     SFX    - short sound effects for actions
     VOICE  - Pinku's real voice clips

   Each has its own volume, so the music can sit quietly under
   Pinku's voice instead of fighting it.

   Two hard rules this file follows, because phones enforce them:

   1. NOTHING plays before the player taps the screen. Mobile
      browsers block sound until a real tap happens, so every sound
      waits behind unlock(), which the START GAME button calls.

   2. A MISSING FILE IS NOT AN ERROR. The game ships before the
      audio is recorded, so a missing mp3 marks itself as missing
      once and is never asked for again. The game plays on in
      silence rather than breaking.

   Public API:  window.BirthdayAudio.<function>
   --------------------------------------------------------------- */

(function (global) {
  'use strict';

  var BASE = 'assets/audio/';

  /* ------------------------------------------------------- the file list

     These are the exact files the game looks for. Drop them in at
     these paths and they are picked up automatically. Anything
     missing is simply skipped. */

  var MUSIC = {
    birthday: BASE + 'music/birthday_theme.mp3',
    boss:     BASE + 'music/boss_theme.mp3',
    ending:   BASE + 'music/birthday_ending.mp3'
  };

  var SFX = {
    jump:        BASE + 'sfx/jump.mp3',
    land:        BASE + 'sfx/land.mp3',
    collect:     BASE + 'sfx/collect_item.mp3',
    present:     BASE + 'sfx/collect_present.mp3',
    star:        BASE + 'sfx/star_chime.mp3',
    checkpoint:  BASE + 'sfx/checkpoint.mp3',
    hurt:        BASE + 'sfx/hurt.mp3',
    victory:     BASE + 'sfx/victory.mp3',
    bossAppear:  BASE + 'sfx/boss_appear.mp3',
    bossAttack:  BASE + 'sfx/boss_attack.mp3',
    bossDefeat:  BASE + 'sfx/boss_defeat.mp3',
    celebration: BASE + 'sfx/celebration.mp3',
    click:       BASE + 'sfx/ui_click.mp3',
    pause:       BASE + 'sfx/ui_pause.mp3',
    bell:        BASE + 'sfx/finish_bell.mp3',
    balloon:     BASE + 'sfx/balloon.mp3',
    cake:        BASE + 'sfx/cake_sparkle.mp3',

    /* the boss fight: one soft thud for a hit landed, and a different
       sound for each boss's own attack */
    bossHit:         BASE + 'sfx/boss_hit.mp3',
    bossAttackPinku: BASE + 'sfx/boss_attack_pinku.mp3',
    bossAttackPaddy: BASE + 'sfx/boss_attack_paddy.mp3'
  };

  var VOICE_DIR = BASE + 'voices/pinku/';

  /* Some sounds are fires-in-a-row (landing, collecting) so they get a
     short cooldown. That is what stops a machine-gun of identical pings
     when the player runs along a row of treats. */
  var COOLDOWN = {
    jump: 90, land: 110, collect: 70, present: 200, star: 70,
    hurt: 400, checkpoint: 500, balloon: 500, cake: 900, click: 60
  };
  var DEFAULT_COOLDOWN = 120;

  var MUSIC_LEVEL = 0.5;            /* music sits under everything else */
  var FADE_MS = 700;

  /* ------------------------------------------------------------- state */

  var st = {
    unlocked: false,
    muted: false,
    vol: { master: 0.85, music: 0.6, sfx: 0.85, voice: 1.0 },
    captionFn: null
  };

  var missing = {};                 /* src -> true, asked once, never again */
  var cache = {};                   /* src -> Audio */
  var sfxPool = {};                 /* src -> {list, i} */
  var lastPlay = {};                /* name -> ms */
  var warned = false;

  var musicEl = null;
  var musicKey = null;
  var musicFade = null;             /* {from, to, t0, ms, el, stopAfter} */
  var musicDucked = false;

  var voiceEl = null;
  var voiceBusy = false;
  var voiceQueue = [];
  var VOICE_GAP_MS = 450;           /* breathing room between Pinku's lines */

  /* ------------------------------------------------------------ helpers */

  function effective(kind) {
    if (st.muted) { return 0; }
    return st.vol[kind] * st.vol.master;
  }

  function label(src) {
    var parts = src.split('/');
    return parts[parts.length - 1];
  }

  /* Which sound file formats to accept, in the order we try them.
     mp3 is listed first because it works everywhere and is what the
     game asks for by name, but ogg and wav are tried automatically if
     the mp3 is not there. That means you can drop in a free sound you
     downloaded as .ogg or .wav without converting it first.

     Nothing is downloaded until a file is actually needed, and format
     after format is only tried when the one before it fails, so this
     costs nothing when your files are already mp3. */
  var EXTS = ['.mp3', '.ogg', '.wav', '.m4a'];

  /* The file as asked for, minus its extension, so we can swap endings. */
  function baseOf(src) {
    return src.replace(/\.(mp3|ogg|wav|m4a)$/i, '');
  }

  /* One Audio object per file, created on first use. If the requested
     format is missing we quietly try the next one, and only after every
     format has failed is the file remembered as missing so we never
     retry it every frame. A missing file is silent, never fatal. */
  function makeAudio(src) {
    var a = new Audio();
    a.preload = 'auto';

    var base = baseOf(src);
    var next = 1;                     /* 0 is the format we just tried */
    var settled = false;

    a.addEventListener('error', function () {
      if (settled) { return; }
      if (next < EXTS.length) {
        a.src = base + EXTS[next];
        next += 1;
        return;
      }
      settled = true;
      if (!missing[src]) {
        missing[src] = true;
        reportMissing();
      }
    });

    /* Any real progress means one of the formats worked. */
    a.addEventListener('loadeddata', function () { settled = true; });
    a.addEventListener('canplaythrough', function () { settled = true; });

    try { a.src = src; } catch (e) { missing[src] = true; }
    return a;
  }

  function getAudio(src) {
    if (!cache[src]) { cache[src] = makeAudio(src); }
    return cache[src];
  }

  function reportMissing() {
    if (warned) { return; }
    warned = true;
    if (global.console && console.log) {
      var list = [];
      for (var k in missing) { list.push(label(k)); }
      console.log('[audio] not found yet (game still playable): ' + list.join(', '));
    }
  }

  function safePlay(el) {
    try {
      var p = el.play();
      if (p && p.catch) { p.catch(function () { /* blocked or missing */ }); }
    } catch (e) { /* never let audio break the game */ }
  }

  /* --------------------------------------------------------------- music */

  function tickFade() {
    if (!musicFade) { return; }
    var f = musicFade;
    var now = Date.now();
    var t = (now - f.t0) / f.ms;
    if (t >= 1) { t = 1; }

    var v = f.from + (f.to - f.from) * t;
    if (f.el) { f.el.volume = Math.max(0, Math.min(1, v)); }

    if (t >= 1) {
      if (f.stopAfter && f.el) { try { f.el.pause(); } catch (e) {} }
      if (f.onDone) { f.onDone(); }
      musicFade = null;
    }
  }
  setInterval(tickFade, 50);

  function musicVolume() {
    if (musicDucked) { return effective('music') * 0.35; }
    return effective('music');
  }

  /* Starts a track. Asking for the track that is already playing does
     nothing at all - that is what stops the music restarting every
     time a level reloads. */
  function playMusic(key) {
    if (!st.unlocked || !MUSIC[key]) { return; }

    if (musicKey === key && musicEl && !musicEl.paused) {
      musicEl.volume = musicVolume();
      return;
    }

    var next = getAudio(MUSIC[key]);
    if (missing[MUSIC[key]]) { return; }

    var old = musicEl;

    /* fade the outgoing track out, then stop it */
    if (old && !old.paused) {
      musicFade = {
        el: old, from: old.volume, to: 0, t0: Date.now(), ms: FADE_MS,
        stopAfter: true
      };
    } else {
      musicFade = null;
    }

    musicEl = next;
    musicKey = key;
    next.loop = true;
    next.volume = 0;

    safePlay(next);

    /* fade the new one in a moment after the old one starts leaving */
    setTimeout(function () {
      if (musicEl !== next) { return; }
      musicFade = {
        el: next, from: 0, to: musicVolume(), t0: Date.now(), ms: FADE_MS
      };
    }, old && !old.paused ? FADE_MS * 0.6 : 0);
  }

  function stopMusic() {
    if (musicEl) {
      musicFade = {
        el: musicEl, from: musicEl.volume, to: 0, t0: Date.now(), ms: FADE_MS,
        stopAfter: true
      };
    }
    musicKey = null;
    musicEl = null;
  }

  function duckMusic(on) {
    musicDucked = !!on;
    if (musicEl && !musicFade) { musicEl.volume = musicVolume(); }
    if (!musicDucked && musicEl && !musicFade) { musicEl.volume = musicVolume(); }
  }

  function pauseMusic() {
    if (musicEl) { try { musicEl.pause(); } catch (e) {} }
  }

  function resumeMusic() {
    if (musicEl && st.unlocked && !missing[musicEl.src]) {
      musicEl.volume = musicVolume();
      safePlay(musicEl);
    }
  }

  /* ----------------------------------------------------------------- sfx */

  function sfx(name) {
    if (!st.unlocked || st.muted) { return; }
    if (effective('sfx') <= 0) { return; }

    var src = SFX[name];
    if (!src || missing[src]) { return; }

    var now = Date.now();
    var gap = COOLDOWN[name] || DEFAULT_COOLDOWN;
    if (lastPlay[name] && now - lastPlay[name] < gap) { return; }
    lastPlay[name] = now;

    var pool = sfxPool[src];
    if (!pool) {
      /* three copies so a sound can overlap itself a little without
         piling up into a wall of noise */
      pool = sfxPool[src] = { list: [getAudio(src), makeAudio(src), makeAudio(src)], i: 0 };
    }

    var a = pool.list[pool.i];
    pool.i = (pool.i + 1) % pool.list.length;

    try { a.currentTime = 0; } catch (e) {}
    a.volume = Math.max(0, Math.min(1, effective('sfx')));
    a.loop = false;
    safePlay(a);
  }

  /* --------------------------------------------------------------- voice */

  /* Shows the line as text right away, and plays the recording if it is
     there. One line at a time: if Pinku is already talking, the next
     line waits its turn instead of talking over her. */
  function say(clipId, text) {
    if (text) { caption(text, 3.2); }

    var src = VOICE_DIR + clipId + '.mp3';
    if (missing[src] || st.muted || effective('voice') <= 0) { return; }

    if (voiceBusy) {
      /* keep the queue short - we only ever want the newest line */
      if (voiceQueue.length > 1) { voiceQueue.shift(); }
      voiceQueue.push(src);
      return;
    }
    startVoice(src);
  }

  function startVoice(src) {
    if (!voiceEl) { voiceEl = makeAudio(src); }
    if (voiceEl.src.indexOf(src) === -1) { voiceEl = makeAudio(src); }
    if (missing[src]) { voiceBusy = false; nextVoice(); return; }

    voiceBusy = true;
    voiceEl.volume = Math.max(0, Math.min(1, effective('voice')));

    voiceEl.onended = function () {
      voiceBusy = false;
      setTimeout(nextVoice, VOICE_GAP_MS);
    };
    voiceEl.onerror = function () {
      missing[src] = true;
      voiceBusy = false;
      reportMissing();
      nextVoice();
    };

    try { voiceEl.currentTime = 0; } catch (e) {}
    safePlay(voiceEl);
  }

  function nextVoice() {
    if (voiceBusy || voiceQueue.length === 0) { return; }
    var src = voiceQueue.shift();
    startVoice(src);
  }

  /* True while one of Pinku's recordings is actually still playing. The
     game asks this so she can stay knocked down for the whole line and
     then get back up the moment it ends. A clip that is missing, muted,
     or switched off reports false, so she can never get stuck waiting
     for a voice that is not coming. */
  function voicePlaying() { return voiceBusy; }

  function caption(text, secs) {
    if (st.captionFn) { st.captionFn(text, secs || 3); }
  }

  /* ---------------------------------------------------------- the unlock

     Called from the first real tap. Only here does any sound start. */
  function unlock() {
    if (st.unlocked) { return; }
    st.unlocked = true;

    /* Warm the files up now so the first sound is not late. */
    for (var k in MUSIC) { getAudio(MUSIC[k]); }
    for (var s in SFX) { getAudio(SFX[s]); }
  }

  /* --------------------------------------------------------------- setup */

  function setVolume(kind, v) {
    if (!st.vol.hasOwnProperty(kind)) { return; }
    st.vol[kind] = Math.max(0, Math.min(1, v));

    if (musicEl && !musicFade) { musicEl.volume = musicVolume(); }
    if (voiceEl) { voiceEl.volume = Math.max(0, Math.min(1, effective('voice'))); }
  }

  function getVolume(kind) {
    return st.vol.hasOwnProperty(kind) ? st.vol[kind] : 0;
  }

  function setMuted(on) {
    st.muted = !!on;
    if (st.muted) {
      if (musicEl) { musicEl.pause(); }
      if (voiceEl) { try { voiceEl.pause(); } catch (e) {} }
      voiceQueue.length = 0;
      voiceBusy = false;
    } else {
      resumeMusic();
    }
  }

  function isMuted() { return st.muted; }

  function isUnlocked() { return st.unlocked; }

  function setCaptionHandler(fn) { st.captionFn = fn; }

  function missingList() {
    var out = [];
    for (var k in missing) { out.push(label(k)); }
    return out;
  }

  global.BirthdayAudio = {
    unlock: unlock,
    isUnlocked: isUnlocked,

    playMusic: playMusic,
    stopMusic: stopMusic,
    pauseMusic: pauseMusic,
    resumeMusic: resumeMusic,
    duckMusic: duckMusic,

    sfx: sfx,
    say: say,
    voicePlaying: voicePlaying,

    setVolume: setVolume,
    getVolume: getVolume,
    setMuted: setMuted,
    isMuted: isMuted,

    setCaptionHandler: setCaptionHandler,
    missingList: missingList,

    FILES: { MUSIC: MUSIC, SFX: SFX, VOICE_DIR: VOICE_DIR }
  };

})(window);
