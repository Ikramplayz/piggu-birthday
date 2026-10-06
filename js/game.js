/* game.js
   ---------------------------------------------------------------
   The platformer engine. Three levels live in js/levels.js.
   All the sound lives in js/audio.js.

   YOU PLAY AS PIGGU. The three characters and their roles are:

     Piggu  - the piglet, the birthday friend, THE PLAYER
     Pinku  - the girl in the pink dress, FINAL BOSS 1
     Paddy  - the boy in the striped shirt, FINAL BOSS 2

   Design rules this file sticks to, on purpose:

   * Small on screen. The screen is 480 x 270 world pixels mapped onto
     the canvas, so the character is a good size on a phone instead of
     a dot in a huge zoomed out view.
   * No vertical scrolling. Every level is exactly one screen tall, so
     the camera only ever moves left and right and can never show empty
     space above or below the level.
   * Fixed physics step. Movement always advances in 1/120 second
     slices, so a slow phone and a fast one behave the same and the
     player can never skip through a platform.
   * Sound never blocks the game. Every audio call is guarded, and a
     missing file simply means silence, never a broken game.

   Controls:
     left / right ... A, D, arrow keys, or the on screen buttons
     jump .......... Space, W, Up, or the on screen button
     pause ......... Escape or P
     restart ....... R
   --------------------------------------------------------------- */

(function () {
  'use strict';

  var C = window.BirthdayCharacters;
  var A = window.BirthdayArt;
  var LEVELS = window.BirthdayLevels;
  var AUD = window.BirthdayAudio;

  /* --------------------------------------------------------- constants */

  var SCREEN_W = A.SCREEN_W;        /* 480 */
  var SCREEN_H = A.SCREEN_H;        /* 270 */

  var STEP = 1 / 120;               /* fixed physics slice */
  var MAX_STEPS = 6;                /* never simulate more than this per frame */

  var GRAVITY = 1350;
  var MAX_FALL = 420;
  var RUN_SPEED = 170;
  var ACCEL = 1500;
  var AIR_ACCEL = 1050;
  var FRICTION = 1700;
  var JUMP_SPEED = 395;             /* about 64px high and 86px long */

  var PLAYER_W = 16;
  var PLAYER_H = 22;
  var PLAYER_CELL = 32;             /* how tall the sprite is drawn */

  var EDGE_EPS = 2;                 /* corner forgiveness, see solveY */
  var COYOTE = 0.10;                /* jump grace after leaving a ledge */
  var BUFFER = 0.12;                /* jump pressed just before landing */
  var INVULN = 1.1;
  var FALL_LIMIT = 320;             /* below this you fell in a gap */

  var GROUND_Y = 210;

  /* ------------------------------------------------------------- setup */

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');

  var el = {
    status: document.getElementById('gameStatus'),
    title: document.getElementById('titleOverlay'),
    win: document.getElementById('winOverlay'),
    winTitle: document.getElementById('winTitle'),
    winText: document.getElementById('winText'),
    winBtn: document.getElementById('winBtn'),
    pauseBadge: document.getElementById('pauseBadge'),
    startBtn: document.getElementById('startBtn'),
    restartBtn: document.getElementById('restartBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    touch: document.getElementById('touchpad'),
    btnLeft: document.getElementById('btnLeft'),
    btnRight: document.getElementById('btnRight'),
    btnJump: document.getElementById('btnJump'),

    /* the "fight begins" message */
    assault: document.getElementById('assaultOverlay'),

    /* audio */
    audioBtn: document.getElementById('audioBtn'),
    audioOverlay: document.getElementById('audioOverlay'),
    audioClose: document.getElementById('audioClose'),
    volMusic: document.getElementById('volMusic'),
    volSfx: document.getElementById('volSfx'),
    volVoice: document.getElementById('volVoice'),
    muteAll: document.getElementById('muteAll'),
    muteMusic: document.getElementById('muteMusic'),
    muteSfx: document.getElementById('muteSfx'),
    muteVoice: document.getElementById('muteVoice')
  };

  /* ------------------------------------------------------- sharp canvas

     The game world is always 480 x 270 units, and all the level data,
     physics and camera work in those units. The canvas BITMAP behind it
     is made bigger - as big as the screen really needs - and everything
     is drawn through one scale transform.

     That is what makes the characters and the HUD text crisp on a phone
     instead of stretched and blurry: a 480 x 270 bitmap blown up to fill
     a modern screen simply does not have enough dots to look good. */

  var BASE_W = SCREEN_W;
  var BASE_H = SCREEN_H;
  var RENDER_SCALE = 2;

  function syncCanvasSize() {
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var shownWidth = rect.width > 0 ? rect.width : BASE_W;

    var wanted = (shownWidth * dpr) / BASE_W;
    var scale = Math.max(1, Math.min(4, wanted));

    var newW = Math.round(BASE_W * scale);
    var newH = Math.round(BASE_H * scale);
    if (canvas.width === newW && canvas.height === newH) { return; }

    canvas.width = newW;
    canvas.height = newH;
    RENDER_SCALE = canvas.width / BASE_W;

    /* The sprite sheets are large, smooth artwork that gets shrunk down
       to a small character on screen. Smoothing makes that shrink clean,
       which is what stops the characters looking jagged and fuzzy. */
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }

  syncCanvasSize();
  window.addEventListener('resize', syncCanvasSize);
  window.addEventListener('orientationchange', syncCanvasSize);
  window.addEventListener('load', syncCanvasSize);

  /* If anything at all goes wrong, say so on the page. A blank screen
     with no message is the worst thing to debug, so every error gets
     written into the little status line under the buttons. */
  window.onerror = function (message, source, line) {
    var node = document.getElementById('gameStatus');
    if (node) {
      node.textContent = 'PROBLEM on line ' + line + ': ' + message;
      node.style.color = '#ff9d9d';
    }
    return false;
  };

  /* ------------------------------------------------------------- state */

  var state = 'title';              /* title | play | pause | ending */
  var levelIndex = 0;
  var level = LEVELS[0];
  var solids = [];
  var decor = [];
  var signs = [];
  var items = [];
  var enemies = [];
  var bosses = [];
  var shots = [];
  var finish = null;

  var collected = 0;
  var totalItems = 0;
  var camX = 0;
  var time = 0;
  var acc = 0;
  var last = 0;
  var winTimer = 0;
  var statusTick = 0;

  /* w and h are the collision box. They MUST be set here: the camera,
     the physics solver and every hit test read them, and reading an
     undefined one turns the whole game into NaN. */
  var player = { x: 0, y: 0, w: PLAYER_W, h: PLAYER_H, vx: 0, vy: 0,
                 onGround: false, coyote: 0, buffer: 0,
                 invuln: 0, facing: 1, anim: 'idle', animTime: 0, frame: 0 };

  var input = { left: false, right: false, jump: false, jumpEdge: false };

  /* --------------------------------------------------------- Pinku's voice

     Her real recordings play at these four moments. There is deliberately
     NO on-screen subtitle: the voice speaks for itself, so the text can
     never disagree with what she actually says.

     Each name below is a file in assets/audio/voices/pinku/. A clip that
     is not there yet is simply silent, and the game carries on. */

  var PINKU_LINES = {
    arrive: 'pinku_dialogue_01',   /* she flies in to help Paddy */
    taunt:  'pinku_dialogue_02',   /* the first time you hit a boss */
    beaten: 'pinku_dialogue_03',   /* the moment Pinku is beaten */
    ending: 'pinku_dialogue_04'    /* the birthday ending */
  };

  function pinkuSays(which) {
    var clip = PINKU_LINES[which];
    if (!clip || !AUD) { return; }
    AUD.say(clip);
  }

  /* Pinku is knocked down while one of her recordings is playing, and
     she gets up the moment it finishes. This only ARMS the hold; the
     release happens in updateBosses, and the hold has a hard cap so a
     clip that is missing, muted, or cut short can never leave her
     lying on the floor forever. */
  var VOICE_HOLD_MAX = 10;

  function holdDownPinku(b) {
    if (AUD && AUD.voicePlaying()) {
      b.voiceLock = true;
      b.voiceHold = VOICE_HOLD_MAX;
    }
  }

  /* Every sound goes through here, so there is exactly one place that
     talks to the audio system and one place to guard it. */
  function playSfx(name) {
    if (AUD) { AUD.sfx(name); }
  }

  /* --------------------------------------------------------- checkpoints

     Passing a signpost remembers that spot. Falling into a gap after
     that puts you back at the sign instead of all the way at the
     start, so a small mistake never costs the whole level. */

  var checkpointX = 0;
  var checkpointY = 0;
  var tauntDone = false;

  /* ------------------------------------------------------- boss entrance

     Level 3 does not start with both bosses standing there. The arena
     opens empty: Paddy walks in first, then Pinku flies in to save him,
     and only after that do the health bars appear and the shots start.

     introT counts up from 0, and nothing can hurt the player until it
     passes INTRO_FIGHT. Paddy's walk-in runs from 0.35s to 2.45s and
     Pinku's dive from 2.1s to 4.5s, so INTRO_FIGHT must sit after both
     of them or the fight would start while she is still in the air.
     Those two timings live in levels.js as entry.delay / entry.dur. */
  var introT = -1;
  var INTRO_FIGHT = 4.8;

  /* How long the "fight begins" banner stays on screen (seconds). */
  var assaultT = 0;

  /* Counts up once both bosses are down, so the celebration waits for
     Pinku to finish her last line and actually stand up first. */
  var victoryWait = 0;

  function showAssault(on) {
    if (el.assault) { el.assault.classList.toggle('hidden', !on); }
  }

  /* ------------------------------------------------------------ helpers */

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  /* --------------------------------------------------------- level load */

  function loadLevel(i) {
    levelIndex = i;
    level = LEVELS[i];

    solids = level.solids || [];
    decor = level.decor || [];
    signs = level.signs || [];
    finish = level.finish || null;

    items = [];
    var iList = level.items || [];
    for (var k = 0; k < iList.length; k++) {
      items.push({ x: iList[k].x, y: iList[k].y, kind: iList[k].kind, taken: false });
    }

    enemies = [];
    var eList = level.enemies || [];
    for (var e = 0; e < eList.length; e++) {
      var en = eList[e];
      enemies.push({
        kind: en.kind, x: en.x, y: en.y,
        w: en.w || 16, h: en.h || 16,
        min: en.min, max: en.max,
        speed: en.speed || 32, dir: en.dir || 1
      });
    }

    bosses = [];
    var bList = level.bosses || [];
    for (var b = 0; b < bList.length; b++) {
      var bo = bList[b];
      bosses.push({
        key: bo.key, name: bo.name,
        x: bo.x, y: bo.y, w: bo.w, h: bo.h,
        hp: bo.hp, maxHp: bo.hp,
        speed: bo.speed, shot: bo.shot,
        atkEvery: bo.atkEvery, atkT: bo.atkEvery * 0.7,
        cell: bo.cell || 46, barColor: bo.barColor,
        stun: 0, defeat: false, facing: -1, frame: 0, animTime: 0,

        /* Entrance and fight state. homeX/homeY is where the boss ends
           up standing; introAt is how many seconds into the level their
           walk-in begins, so the level file decides who arrives first. */
        homeX: bo.x, homeY: bo.y,
        entry: bo.entry || null,
        introAt: (bo.entry && bo.entry.delay) || 0,
        spawnX: bo.x, spawnY: bo.y,
        ready: false, hurtFlash: 0, animName: 'idle',

        /* While Pinku's voice is playing she stays knocked down, and
           she gets back up the moment the clip finishes. */
        voiceLock: false, voiceHold: 0
      });
    }

    resetIntro();

    shots = [];
    collected = 0;
    totalItems = items.length;
    winTimer = 0;
    acc = 0;

    /* decorative objects start out "not yet triggered" */
    for (var d = 0; d < decor.length; d++) { decor[d].near = false; }

    checkpointX = level.spawn.x;
    checkpointY = level.spawn.y;
    tauntDone = false;

    resetPlayer();
    snapCamera();
  }

  function resetPlayer() {
    player.x = level.spawn.x;
    player.y = level.spawn.y - PLAYER_H;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.coyote = 0;
    player.buffer = 0;
    player.invuln = 0;
    player.facing = 1;
    player.anim = 'idle';
    player.animTime = 0;
    player.frame = 0;
  }

  function camLimit() {
    return Math.max(0, level.width - SCREEN_W);
  }

  function cameraTarget() {
    return clamp(player.x + player.w / 2 - SCREEN_W / 2, 0, camLimit());
  }

  function snapCamera() { camX = cameraTarget(); }

  /* ------------------------------------------------------ physics solve */

  /* Horizontal. Only ever pushes out sideways, and ignores the top and
     bottom couple of pixels so standing on a ledge is never mistaken for
     running into its side. */
  function solveX(p) {
    p.x += p.vx * STEP;
    for (var i = 0; i < solids.length; i++) {
      var s = solids[i];
      if (!overlap(p, s)) { continue; }
      var top = p.y + EDGE_EPS;
      var bottom = p.y + p.h - EDGE_EPS;
      if (bottom <= s.y || top >= s.y + s.h) { continue; }

      if (p.vx > 0) { p.x = s.x - p.w; }
      else if (p.vx < 0) { p.x = s.x + s.w; }
      else { continue; }
      p.vx = 0;
    }
  }

  /* Vertical. This is the ONLY place that decides whether the player is
     standing on something. Pressing jump never sets it. */
  function solveY(p) {
    p.y += p.vy * STEP;
    p.onGround = false;

    for (var i = 0; i < solids.length; i++) {
      var s = solids[i];
      if (!overlap(p, s)) { continue; }
      var left = p.x + EDGE_EPS;
      var right = p.x + p.w - EDGE_EPS;
      if (right <= s.x || left >= s.x + s.w) { continue; }

      if (p.vy > 0) {
        p.y = s.y - p.h;
        p.vy = 0;
        p.onGround = true;
      } else if (p.vy < 0) {
        p.y = s.y + s.h;
        p.vy = 0;
      }
    }
  }

  function physicsStep() {
    var p = player;

    var dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    var a = p.onGround ? ACCEL : AIR_ACCEL;

    if (dir !== 0) {
      p.facing = dir;
      p.vx += dir * a * STEP;
      if (p.vx > RUN_SPEED) { p.vx = RUN_SPEED; }
      if (p.vx < -RUN_SPEED) { p.vx = -RUN_SPEED; }
    } else {
      var drop = FRICTION * STEP;
      if (p.vx > drop) { p.vx -= drop; }
      else if (p.vx < -drop) { p.vx += drop; }
      else { p.vx = 0; }
    }

    p.vy += GRAVITY * STEP;
    if (p.vy > MAX_FALL) { p.vy = MAX_FALL; }

    /* Remember what was true before the solver runs, so a real landing
       can be told apart from simply standing still. */
    var wasAirborne = !p.onGround;
    var wasFalling = p.vy > 0;

    solveX(p);
    solveY(p);

    if (wasAirborne && wasFalling && p.onGround) { playSfx('land'); }

    if (p.onGround) { p.coyote = COYOTE; }
    else if (p.coyote > 0) { p.coyote -= STEP; }

    if (p.buffer > 0) { p.buffer -= STEP; }

    /* A jump needs a real key press, so holding jump can never repeat.
       The press is remembered for a moment so pressing it just before
       landing is not wasted. */
    if (p.buffer > 0 && p.coyote > 0) {
      p.vy = -JUMP_SPEED;
      p.onGround = false;
      p.buffer = 0;
      p.coyote = 0;                 /* can never fire twice from one press */
      playSfx('jump');
    }

    if (p.invuln > 0) { p.invuln -= STEP; }
  }

  /* -------------------------------------------------------- game events */

  function hurtPlayer(fromX) {
    var p = player;
    if (p.invuln > 0) { return; }
    p.invuln = INVULN;
    playSfx('hurt');
    var away = (p.x + p.w / 2 < fromX) ? -1 : 1;
    p.vx = away * 150;
    p.vy = -170;
    p.onGround = false;
    p.coyote = 0;
    p.buffer = 0;
  }

  /* Back to the last signpost passed, not the start of the level. */
  function fellInGap() {
    var p = player;
    p.x = checkpointX;
    p.y = checkpointY - PLAYER_H;
    p.vx = 0;
    p.vy = 0;
    p.invuln = 0.6;
    p.coyote = 0;
    p.buffer = 0;
    snapCamera();
  }

  /* -------------------------------------------------------------- update */

  function updateEnemies(dt) {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      e.x += e.dir * e.speed * dt;
      if (e.x <= e.min) { e.x = e.min; e.dir = 1; }
      if (e.x >= e.max) { e.x = e.max; e.dir = -1; }
      if (overlap(player, e)) { hurtPlayer(e.x + e.w / 2); }
    }
  }

  /* Puts every boss back to "not arrived yet" and clears the entrance. */
  function resetIntro() {
    for (var i = 0; i < bosses.length; i++) {
      var b = bosses[i];
      var e = b.entry;

      /* Put each boss where their entrance starts, so neither is already
         standing in the arena waiting for their cue. */
      b.spawnX = e ? e.fromX : b.homeX;
      b.spawnY = e ? e.fromY : b.homeY;
      b.x = b.spawnX;
      b.y = b.spawnY;

      b.ready = false;
      b.hp = b.maxHp;
      b.defeat = false;
      b.stun = 0;
      b.hurtFlash = 0;
      b.frame = 0;
      b.animTime = 0;
      b.animName = 'idle';
      b.voiceLock = false;
      b.voiceHold = 0;
    }
    introT = bosses.length > 0 ? 0 : -1;
    assaultT = 0;
    victoryWait = 0;
    showAssault(false);
  }

  /* The little story before the fight: Paddy walks in on his own, then
     Pinku flies in over the top to save him. Neither can be hurt and
     neither shoots until introT passes INTRO_FIGHT.

     Bubble sort by the moment each boss should arrive, so the order of
     the two entries in levels.js is the only thing that decides who
     comes first. */
  function updateIntro(dt) {
    if (introT < 0) { return; }

    var prev = introT;
    introT += dt;

    var order = bosses.slice();
    order.sort(function (a, b) { return (a.introAt || 0) - (b.introAt || 0); });

    /* Announce each arrival at the moment its walk-in begins, and play
       Pinku's recording on her own cue, so her voice lands with her
       entrance instead of firing early. */
    for (var q = 0; q < order.length; q++) {
      var who = order[q];
      var cue = who.introAt || 0;
      if (prev < cue && introT >= cue) {
        playSfx('bossAppear');
        if (who.entry && who.entry.voice) { pinkuSays(who.entry.voice); }
      }
    }

    /* The fight begins: health bars appear, shots start flying, and the
       banner tells the player what to actually do. */
    if (prev < INTRO_FIGHT && introT >= INTRO_FIGHT) {
      for (var i = 0; i < bosses.length; i++) {
        bosses[i].ready = true;
        bosses[i].atkT = bosses[i].atkEvery * 0.55;
        bosses[i].facing = (player.x + player.w / 2) <
          (bosses[i].x + bosses[i].w / 2) ? -1 : 1;
      }
      showAssault(true);
      assaultT = 2.2;
    }

    if (assaultT > 0) {
      assaultT -= dt;
      if (assaultT <= 0) { assaultT = 0; showAssault(false); }
    }

    /* Once the fight is live the entrance driver stops touching the
       bosses completely, so their own movement is never overwritten. */
    if (introT >= INTRO_FIGHT) { return; }

    /* Walk each boss gently along its own entrance path. y is driven as
       well as x, so Pinku can drop in from above the screen. Everything
       is eased, so they settle into place instead of snapping there. */
    for (var k = 0; k < bosses.length; k++) {
      var b = bosses[k];
      var at = b.introAt || 0;
      var e2 = b.entry;

      if (introT < at) { continue; }

      var dur = e2 ? (e2.dur || 1.5) : 0.8;
      var t = (introT - at) / dur;
      if (t > 1) { t = 1; }
      var ease = 1 - (1 - t) * (1 - t);

      if (e2) {
        b.x = e2.fromX + (b.homeX - e2.fromX) * ease;
        b.y = e2.fromY + (b.homeY - e2.fromY) * ease;
      }

      b.animTime += dt;
      b.frame = Math.floor(b.animTime * 6);
      b.animName = (e2 && e2.anim) ? e2.anim : 'walk';

      /* Walking in from the right means facing left, and the other way
         round for anyone arriving from the left. */
      if (e2 && e2.anim === 'walk') {
        b.facing = (b.homeX < e2.fromX) ? -1 : 1;
      }
    }
  }

  function updateBosses(dt) {
    for (var i = 0; i < bosses.length; i++) {
      var b = bosses[i];
      b.animTime += dt;
      b.frame = Math.floor(b.animTime * 5);

      if (b.hurtFlash > 0) { b.hurtFlash -= dt; }

      /* Nothing happens until the entrance is over. */
      if (introT >= 0 && introT < INTRO_FIGHT) { continue; }

      /* Talking keeps her on the floor, but never forever: the hold is
         released the instant her recording finishes, or when the cap
         runs out if the clip is missing or muted. While she is down she
         cannot move, cannot shoot, and cannot be hit again. */
      if (b.voiceLock) {
        b.voiceHold -= dt;
        if (!(AUD && AUD.voicePlaying()) || b.voiceHold <= 0) {
          b.voiceLock = false;
          b.voiceHold = 0;
        } else {
          b.animName = 'hurt';
          b.stun = 0;
          b.atkT = b.atkEvery;
          b.y = (b.baseY === undefined) ? b.y : b.baseY;
          continue;
        }
      }

      if (b.defeat) {
        /* Knocked out. She stays down while she talks, then gets back
           up and cheers. */
        if (b.animName !== 'victory') {
          b.animName = 'victory';
          b.frame = 0;
          b.animTime = 0;
          b.y = (b.baseY === undefined) ? b.y : b.baseY;
        }
        continue;
      }

      if (b.stun > 0) {
        b.stun -= dt;
        b.animName = 'hurt';
        continue;
      }

      b.animName = 'idle';

      var pcx = player.x + player.w / 2;
      var bcx = b.x + b.w / 2;
      var dir = pcx < bcx ? -1 : 1;
      b.facing = dir;

      /* Each boss holds a distance it likes instead of crowding the
         player, which gives the fight a bit of rhythm. */
      var gap = pcx - bcx;
      var want = (b.key === 'pinku') ? 52 : 36;

      if (Math.abs(bcx - pcx) > want) {
        b.x = clamp(b.x + dir * b.speed * dt, 6, level.width - b.w - 6);
      }

      /* A little bob so they are never perfectly still. */
      if (!b.baseY) { b.baseY = b.y; }
      b.y = b.baseY + Math.sin(b.animTime * 2.4 + i) * 1.5;

      b.atkT -= dt;
      if (b.atkT <= 0) {
        b.atkT = b.atkEvery;
        fireShot(b, dir);
      }

      /* Landing on a boss's head bounces Piggu off and dents them, so
         the fight is about hopping on their heads rather than running
         into them. */
      if (overlap(player, b)) {
        var feet = player.y + player.h;
        var falling = player.vy > 0;
        var landedOnTop = feet < b.y + b.h * 0.6;

        if (falling && landedOnTop) {
          b.hp -= 1;
          b.stun = 1.25;
          b.hurtFlash = 0.3;
          b.animName = 'hurt';

          /* Bounce straight back up, so a good hit feels springy. */
          player.vy = -300;
          player.onGround = false;
          player.coyote = 0;
          player.buffer = 0;
          playSfx('bossHit');

          if (!tauntDone) {
            tauntDone = true;
            pinkuSays('taunt');
            holdDownPinku(b);
          }

          if (b.hp <= 0) {
            b.hp = 0;
            b.defeat = true;
            playSfx('bossDefeat');
            if (b.key === 'pinku') {
              pinkuSays('beaten');
              holdDownPinku(b);
            }
          }
        } else if (player.invuln <= 0) {
          hurtPlayer(b.x + b.w / 2);
        }
      }
    }

    if (bosses.length > 0 && winTimer === 0) {
      var allDone = true;
      for (var w = 0; w < bosses.length; w++) {
        if (!bosses[w].defeat) { allDone = false; break; }
      }
      /* Both are down. The celebration waits for the last voice line to
         finish and for whoever was knocked over to stand up, with a
         hard cap so a missing clip can never stall the ending. */
      if (allDone) {
        victoryWait += dt;

        var talking = AUD && AUD.voicePlaying();
        var stillDown = false;
        for (var d = 0; d < bosses.length; d++) {
          if (bosses[d].voiceLock) { stillDown = true; }
        }

        if (victoryWait >= 0.8 && !talking && !stillDown) { winTimer = 1.0; }
        else if (victoryWait >= 14) { winTimer = 1.0; }
      }
    }
  }

  /* Each boss has its own attack sound, so you can hear who is about to
     throw something without looking. */
  function fireShot(b, dir) {
    if (b.shot === 'heart') {
      playSfx('bossAttackPinku');
      shots.push({ kind: 'heart', x: b.x + b.w / 2 - 6, y: b.y + 8, w: 12, h: 12,
                   vx: dir * 58, vy: -120, gravity: 235 });
    } else {
      playSfx('bossAttackPaddy');
      shots.push({ kind: 'confetti', x: b.x + b.w / 2 - 5, y: b.y + 6, w: 10, h: 10,
                   vx: dir * 100, vy: 0, gravity: 0 });
    }
  }

  function updateShots(dt) {
    for (var i = shots.length - 1; i >= 0; i--) {
      var s = shots[i];
      s.vy += (s.gravity || 0) * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      if (s.x < -40 || s.x > level.width + 40 || s.y > FALL_LIMIT) {
        shots.splice(i, 1);
        continue;
      }
      if (overlap(player, s)) {
        hurtPlayer(s.x + s.w / 2);
        shots.splice(i, 1);
      }
    }
  }

  function updateItems() {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.taken) { continue; }
      if (overlap(player, { x: it.x - 9, y: it.y - 9, w: 18, h: 18 })) {
        it.taken = true;
        collected += 1;

        /* a present and a star get their own sound, everything else
           gets the everyday collect ping */
        if (it.kind === 'present') { playSfx('present'); }
        else if (it.kind === 'star') { playSfx('star'); }
        else { playSfx('collect'); }
      }
    }
  }

  /* Passing a signpost banks a new checkpoint. */
  function updateCheckpoints() {
    for (var s = 0; s < signs.length; s++) {
      var sg = signs[s];
      if (sg.x <= checkpointX) { continue; }
      if (player.x + player.w / 2 < sg.x) { continue; }
      if (!player.onGround) { continue; }

      checkpointX = sg.x;
      checkpointY = level.spawn.y;
      playSfx('checkpoint');
    }
  }

  /* Balloons squeak and cakes twinkle when Piggu comes close. Both are
     decoration only: neither has collision, so neither can block him.
     Each one fires once per approach instead of every frame. */
  function updateDecorSounds() {
    for (var i = 0; i < decor.length; i++) {
      var d = decor[i];
      if (d.kind !== 'balloon' && d.kind !== 'cake') { continue; }

      var dx = (player.x + player.w / 2) - d.x;
      var dy = (player.y + player.h) - (d.y - 12);
      var reach = (d.kind === 'cake') ? 70 : 46;
      var close = (dx * dx + dy * dy) < (reach * reach);

      if (close && !d.near) {
        d.near = true;
        playSfx(d.kind === 'cake' ? 'cake' : 'balloon');
      } else if (!close && d.near) {
        d.near = false;
      }
    }
  }

  function updatePlayerAnim(dt) {
    var p = player;
    var name;
    if (p.invuln > INVULN - 0.3) {
      name = 'hurt';
    } else if (!p.onGround) {
      name = p.vy < -10 ? 'jump' : 'fall';
    } else if (Math.abs(p.vx) > 22) {
      name = 'walk';
    } else {
      name = 'idle';
    }

    if (name !== p.anim) { p.anim = name; p.animTime = 0; }
    else { p.animTime += dt; }

    var anim = C.ANIMATIONS[p.anim];
    var raw = Math.floor(p.animTime * anim.fps);
    p.frame = anim.loop ? (raw % anim.count) : Math.min(raw, anim.count - 1);
  }

  function updateCamera(dt) {
    var target = cameraTarget();
    var k = 1 - Math.pow(0.0012, dt);
    camX += (target - camX) * k;
    camX = clamp(camX, 0, camLimit());
  }

  function update(dt) {
    if (state !== 'play') { return; }

    time += dt;

    /* Fixed slices: the same physics no matter what the frame rate is. */
    acc += dt;
    var steps = 0;
    while (acc >= STEP && steps < MAX_STEPS) {
      physicsStep();
      acc -= STEP;
      steps += 1;
    }
    if (acc > STEP) { acc = 0; }

    updateItems();
    updateEnemies(dt);
    updateIntro(dt);
    updateBosses(dt);
    updateShots(dt);
    updateCheckpoints();
    updateDecorSounds();
    updatePlayerAnim(dt);
    updateCamera(dt);

    if (player.y > FALL_LIMIT) { fellInGap(); }

    /* Reached the finish flag. */
    if (finish && winTimer === 0) {
      var goal = { x: finish.x - 16, y: finish.y, w: 32, h: finish.h };
      if (overlap(player, goal)) {
        winTimer = 0.7;
        playSfx('bell');
      }
    }

    if (winTimer > 0) {
      winTimer -= dt;
      if (winTimer <= 0) { winTimer = 0; showWin(); }
    }
  }

  /* -------------------------------------------------------------- render */

  function drawPlayer() {
    var p = player;
    if (p.invuln > 0 && Math.floor(time * 22) % 2 === 0) { return; }
    C.drawCharacterFrame(ctx, C.PLAYER_KEY, p.anim, p.frame,
                         p.x + p.w / 2, p.y + p.h, PLAYER_CELL, p.facing < 0);
  }

  function drawOneBoss(b) {
    A.drawBoss(ctx, b, function (c, key, anim, frame, cx, feetY, cell, flip) {
      C.drawCharacterFrame(c, key, anim, frame, cx, feetY, cell, flip);
    });
  }

  function render() {
    var pal = level.pal;

    /* Everything below is written in 480 x 270 world units. This one line
       maps those units onto the sharper bitmap that syncCanvasSize()
       chose, so the same drawing code comes out crisp on any screen.
       Without it the world would be drawn tiny in one corner. */
    ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);

    A.drawSky(ctx, pal);
    A.drawClouds(ctx, pal, camX, time);
    A.drawHills(ctx, pal, camX, GROUND_Y);
    A.drawMotes(ctx, pal, camX, time);
    A.drawBunting(ctx, pal, camX, time);

    ctx.save();
    ctx.translate(-Math.round(camX), 0);

    A.drawSolids(ctx, solids, pal);
    A.drawDecor(ctx, decor, pal, time);

    for (var s = 0; s < signs.length; s++) { A.drawSign(ctx, signs[s], pal); }
    if (finish) { A.drawFinish(ctx, finish, time); }

    A.drawItems(ctx, items, time);
    A.drawEnemies(ctx, enemies, time);

    for (var b = 0; b < bosses.length; b++) { drawOneBoss(bosses[b]); }

    A.drawShots(ctx, shots, time);
    drawPlayer();

    ctx.restore();

    A.drawHud(ctx, {
      levelName: level.name,
      collected: collected,
      total: totalItems,
      time: time
    });
  }

  /* --------------------------------------------------------------- loop */

  function frame(now) {
    var dt = (now - last) / 1000;
    last = now;
    if (!isFinite(dt) || dt < 0) { dt = 0; }
    if (dt > 0.1) { dt = 0.1; }

    update(dt);
    render();
    updateStatus(dt);

    requestAnimationFrame(frame);
  }

  function updateStatus(dt) {
    if (!el.status) { return; }
    statusTick += dt;
    if (statusTick < 0.5) { return; }
    statusTick = 0;

    var missing = [];
    var keys = C.CHARACTER_ORDER;
    for (var i = 0; i < keys.length; i++) {
      if (C.sheetFailed(keys[i])) { missing.push(C.CHARACTERS[keys[i]].name); }
    }

    var text = 'Running. Level "' + level.name + '".';
    if (missing.length) {
      text += ' Character picture missing for: ' + missing.join(', ') + '.';
    } else {
      text += ' All three character pictures loaded.';
    }
    el.status.textContent = text;
  }

  /* ------------------------------------------------------------ screens */

  function showScreen(which) {
    if (el.title) { el.title.classList.toggle('hidden', which !== 'title'); }
    if (el.win) { el.win.classList.toggle('hidden', which !== 'ending'); }
    if (el.pauseBadge) { el.pauseBadge.classList.toggle('hidden', which !== 'pause'); }
    if (el.touch) { el.touch.classList.toggle('hidden', which !== 'play'); }
  }

  function startLevel(i) {
    loadLevel(i);
    state = 'play';
    showScreen('play');
    if (el.pauseBtn) { el.pauseBtn.textContent = 'Pause'; }

    /* Level 1 and 2 get the gentle birthday theme, level 3 gets the
       boss track. Asking for a track that is already playing does
       nothing, so restarting a level never doubles the music up. */
    if (AUD) {
      AUD.unlock();
      AUD.duckMusic(false);
      AUD.playMusic((level.bosses && level.bosses.length) ? 'boss' : 'birthday');
    }

    /* Level 3's entrance is timed by resetIntro / updateIntro. Nothing is
       scheduled here on purpose: an extra timer would fire Pinku's line a
       second early and play it twice. */
  }

  function showWin() {
    state = 'ending';
    showScreen('ending');

    var isFinal = levelIndex >= LEVELS.length - 1;

    if (isFinal) {
      playSfx('celebration');
      if (AUD) { AUD.playMusic('ending'); }
      setTimeout(function () { pinkuSays('ending'); }, 1700);
    } else {
      playSfx('victory');
      if (AUD) { AUD.duckMusic(true); }
    }

    if (levelIndex < LEVELS.length - 1) {
      if (el.winTitle) { el.winTitle.textContent = 'LEVEL CLEAR!'; }
      if (el.winText) {
        el.winText.textContent = 'Nice one! ' + collected + ' of ' + totalItems +
          ' treats collected. ' + (LEVELS[levelIndex + 1].name) + ' is next.';
      }
      if (el.winBtn) { el.winBtn.textContent = 'Next level'; }
    } else {
      if (el.winTitle) { el.winTitle.textContent = 'HAPPY BIRTHDAY, PIGGU!'; }
      if (el.winText) {
        el.winText.textContent = 'You beat Pinku AND Paddy, and ate ' + collected +
          ' of ' + totalItems + ' treats along the way. Best birthday ever. ' +
          'Pinku says she let you win. Paddy says he slipped. Nobody believes either of them.';
      }
      if (el.winBtn) { el.winBtn.textContent = 'Play again' };
    }
  }

  function continueAfterWin() {
    if (levelIndex < LEVELS.length - 1) {
      startLevel(levelIndex + 1);
    } else {
      startLevel(0);
    }
  }

  function restartLevel() {
    startLevel(levelIndex);
  }

  function togglePause() {
    /* If the audio panel is open, Escape or P closes that first instead
       of leaving the panel stranded over a running game. */
    if (el.audioOverlay && !el.audioOverlay.classList.contains('hidden')) {
      closeAudio();
      return;
    }

    if (state === 'play') {
      state = 'pause';
      showScreen('pause');
      if (el.pauseBtn) { el.pauseBtn.textContent = 'Resume'; }
      playSfx('pause');
      if (AUD) { AUD.pauseMusic(); }
    } else if (state === 'pause') {
      state = 'play';
      showScreen('play');
      if (el.pauseBtn) { el.pauseBtn.textContent = 'Pause'; }
      playSfx('pause');
      if (AUD) { AUD.resumeMusic(); }
    }
  }

  /* -------------------------------------------------------------- input */

  var KEY_LEFT = { ArrowLeft: 1, KeyA: 1 };
  var KEY_RIGHT = { ArrowRight: 1, KeyD: 1 };
  var KEY_JUMP = { Space: 1, ArrowUp: 1, KeyW: 1 };

  window.addEventListener('keydown', function (e) {
    if (KEY_LEFT[e.code]) { input.left = true; e.preventDefault(); }
    if (KEY_RIGHT[e.code]) { input.right = true; e.preventDefault(); }
    if (KEY_JUMP[e.code]) {
      if (!input.jump) { player.buffer = BUFFER; }
      input.jump = true;
      e.preventDefault();
    }
    if (e.code === 'Escape' || e.code === 'KeyP') { togglePause(); e.preventDefault(); }
    if (e.code === 'KeyR') { restartLevel(); e.preventDefault(); }
    if (e.code === 'Enter') {
      if (state === 'title') { startLevel(0); }
      else if (state === 'ending') { continueAfterWin(); }
    }
  });

  window.addEventListener('keyup', function (e) {
    if (KEY_LEFT[e.code]) { input.left = false; }
    if (KEY_RIGHT[e.code]) { input.right = false; }
    if (KEY_JUMP[e.code]) { input.jump = false; }
  });

  /* Losing focus must never leave a button stuck down - that is the
     classic "my character will not stop running" bug. */
  window.addEventListener('blur', function () {
    input.left = false;
    input.right = false;
    input.jump = false;
    setHeld('left', false); setHeld('right', false); setHeld('jump', false);
  });

  function setHeld(which, on) {
    var id = which === 'left' ? 'btnLeft' : (which === 'right' ? 'btnRight' : 'btnJump');
    var node = document.getElementById(id);
    if (node) { node.classList.toggle('held', on); }
  }

  /* Hold-to-act touch button. Works with a finger or a mouse. */
  function bindHold(node, onDown, onUp) {
    if (!node) { return; }

    function down(e) {
      e.preventDefault();
      node.classList.add('held');
      onDown();
    }
    function up(e) {
      if (e) { e.preventDefault(); }
      node.classList.remove('held');
      onUp();
    }

    node.addEventListener('touchstart', down, { passive: false });
    node.addEventListener('touchend', up, { passive: false });
    node.addEventListener('touchcancel', up, { passive: false });
    node.addEventListener('mousedown', down);
    node.addEventListener('mouseup', up);
    node.addEventListener('mouseleave', up);
  }

  bindHold(el.btnLeft, function () { input.left = true; }, function () { input.left = false; });
  bindHold(el.btnRight, function () { input.right = true; }, function () { input.right = false; });
  bindHold(el.btnJump,
    function () { player.buffer = BUFFER; input.jump = true; },
    function () { input.jump = false; }
  );

  /* Tapping the play area jumps too, which is what everyone expects on a
     phone. The touch buttons handle their own taps separately. */
  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    if (state === 'play') { player.buffer = BUFFER; }
  }, { passive: false });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  /* No page scrolling or pinch zooming while playing. */
  document.addEventListener('touchmove', function (e) {
    if (e.target === canvas || (el.touch && el.touch.contains(e.target))) {
      e.preventDefault();
    }
  }, { passive: false });

  /* ----------------------------------------------------------- audio ui

     Three sliders and four mutes, each affecting only its own part, so
     the music can sit quietly under Pinku's voice. Opening this panel
     stops the game but lets the music keep playing, which is the only
     way to hear what you are changing. */

  var mutedUI = { all: false, music: false, sfx: false, voice: false };
  var audioWasState = null;

  function sliderValue(node, fallback) {
    if (!node) { return fallback; }
    var v = Number(node.value);
    return isFinite(v) ? v / 100 : fallback;
  }

  function syncAudioUi() {
    if (!AUD) { return; }

    if (el.volMusic) { el.volMusic.value = Math.round(AUD.getVolume('music') * 100); }
    if (el.volSfx) { el.volSfx.value = Math.round(AUD.getVolume('sfx') * 100); }
    if (el.volVoice) { el.volVoice.value = Math.round(AUD.getVolume('voice') * 100); }

    if (el.muteAll) { el.muteAll.textContent = mutedUI.all ? 'Unmute all' : 'Mute all'; }
    if (el.muteMusic) { el.muteMusic.textContent = mutedUI.music ? 'Music on' : 'Music off'; }
    if (el.muteSfx) { el.muteSfx.textContent = mutedUI.sfx ? 'Sounds on' : 'Sounds off'; }
    if (el.muteVoice) { el.muteVoice.textContent = mutedUI.voice ? 'Voice on' : 'Voice off'; }

    if (el.muteAll) { el.muteAll.classList.toggle('off', mutedUI.all); }
    if (el.muteMusic) { el.muteMusic.classList.toggle('off', mutedUI.music); }
    if (el.muteSfx) { el.muteSfx.classList.toggle('off', mutedUI.sfx); }
    if (el.muteVoice) { el.muteVoice.classList.toggle('off', mutedUI.voice); }
  }

  function applyAudioSettings() {
    if (!AUD) { return; }
    AUD.setVolume('music', mutedUI.music ? 0 : sliderValue(el.volMusic, 0.6));
    AUD.setVolume('sfx', mutedUI.sfx ? 0 : sliderValue(el.volSfx, 0.85));
    AUD.setVolume('voice', mutedUI.voice ? 0 : sliderValue(el.volVoice, 1));
    AUD.setMuted(mutedUI.all);
    syncAudioUi();
  }

  function openAudio() {
    audioWasState = state;
    if (state === 'play') { state = 'pause'; }   /* stop play, keep the music */
    if (el.audioOverlay) { el.audioOverlay.classList.remove('hidden'); }
    syncAudioUi();
  }

  function closeAudio() {
    if (el.audioOverlay) { el.audioOverlay.classList.add('hidden'); }
    if (audioWasState === 'play' && state === 'pause') {
      state = 'play';
      showScreen('play');
    }
    audioWasState = null;
  }

  if (el.volMusic) {
    el.volMusic.addEventListener('input', function () { mutedUI.music = false; applyAudioSettings(); });
  }
  if (el.volSfx) {
    el.volSfx.addEventListener('input', function () { mutedUI.sfx = false; applyAudioSettings(); });
  }
  if (el.volVoice) {
    el.volVoice.addEventListener('input', function () { mutedUI.voice = false; applyAudioSettings(); });
  }

  if (el.muteAll) {
    el.muteAll.addEventListener('click', function () { mutedUI.all = !mutedUI.all; applyAudioSettings(); });
  }
  if (el.muteMusic) {
    el.muteMusic.addEventListener('click', function () { mutedUI.music = !mutedUI.music; applyAudioSettings(); });
  }
  if (el.muteSfx) {
    el.muteSfx.addEventListener('click', function () { mutedUI.sfx = !mutedUI.sfx; applyAudioSettings(); });
  }
  if (el.muteVoice) {
    el.muteVoice.addEventListener('click', function () { mutedUI.voice = !mutedUI.voice; applyAudioSettings(); });
  }
  if (el.audioBtn) {
    el.audioBtn.addEventListener('click', function () { unlockAudio(); playSfx('click'); openAudio(); });
  }
  if (el.audioClose) {
    el.audioClose.addEventListener('click', function () { playSfx('click'); closeAudio(); });
  }

  /* ------------------------------------------------------- main buttons */

  function unlockAudio() {
    if (AUD) { AUD.unlock(); }
  }

  /* Any first tap anywhere unlocks sound, because phones block audio
     until the player has actually touched the page. */
  function firstTouch() {
    unlockAudio();
    document.removeEventListener('pointerdown', firstTouch);
    document.removeEventListener('touchstart', firstTouch);
  }
  document.addEventListener('pointerdown', firstTouch);
  document.addEventListener('touchstart', firstTouch);

  if (el.startBtn) {
    el.startBtn.addEventListener('click', function () {
      unlockAudio();
      playSfx('click');
      startLevel(0);
    });
  }
  if (el.winBtn) {
    el.winBtn.addEventListener('click', function () { playSfx('click'); continueAfterWin(); });
  }
  if (el.restartBtn) {
    el.restartBtn.addEventListener('click', function () { playSfx('click'); restartLevel(); });
  }
  if (el.pauseBtn) {
    el.pauseBtn.addEventListener('click', function () { togglePause(); });
  }

  /* ----------------------------------------------------------- go live */

  if (AUD) {
    AUD.setVolume('music', 0.6);
    AUD.setVolume('sfx', 0.85);
    AUD.setVolume('voice', 1);
  }
  syncAudioUi();

  loadLevel(0);
  state = 'title';
  showScreen('title');

  last = performance.now();
  requestAnimationFrame(frame);

})();
