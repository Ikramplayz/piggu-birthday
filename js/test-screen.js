/* test-screen.js
   ---------------------------------------------------------------
   The Stage 2 test screen.

     1. "The cast"      - the three characters side by side, idle looping
     2. "Live control test" - one character you can actually move around,
                              with idle / walk / jump / fall switching by
                              itself, plus H (hurt) and V (victory)
     3. "All animations" - every animation for every character, looping

   Keyboard:  Arrows or A/D to move, Space/W/Up to jump,
              H for hurt, V for victory, 1/2/3 to switch character.
   --------------------------------------------------------------- */

(function () {
  'use strict';

  var C = window.BirthdayCharacters;
  if (!C) return;

  /* ------------------------------------------------------------ the cast */

  var loopJobs = [];

  function addLoopJob(canvas, key, animName, cellPx, feetPad, offset, flip) {
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    loopJobs.push({
      canvas: canvas,
      ctx: ctx,
      key: key,
      anim: animName,
      cellPx: cellPx,
      feetPad: feetPad,
      offset: offset || 0,
      flip: !!flip
    });
  }

  var castCanvases = {};

  function buildCast() {
    var host = document.getElementById('cast');
    if (!host) return;
    host.innerHTML = '';

    C.CHARACTER_ORDER.forEach(function (key) {
      var c = C.CHARACTERS[key];

      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'card';
      card.setAttribute('data-key', key);

      var cv = document.createElement('canvas');
      cv.width = 180;
      cv.height = 180;
      cv.className = 'sprite';

      var name = document.createElement('span');
      name.className = 'card-name';
      name.textContent = c.name;

      var role = document.createElement('span');
      role.className = 'card-role';
      role.textContent = c.role;

      card.appendChild(cv);
      card.appendChild(name);
      card.appendChild(role);
      card.addEventListener('click', function () { selectCharacter(key); });
      host.appendChild(card);

      castCanvases[key] = cv;
      addLoopJob(cv, key, 'idle', 168, 6, Math.random() * 2, false);
    });
  }

  /* ------------------------------------------------------------- gallery */

  function buildGallery() {
    var host = document.getElementById('gallery');
    if (!host) return;
    host.innerHTML = '';

    C.CHARACTER_ORDER.forEach(function (key, rowIndex) {
      var c = C.CHARACTERS[key];

      var row = document.createElement('div');
      row.className = 'gallery-row';

      var label = document.createElement('div');
      label.className = 'gallery-row-label';
      label.textContent = c.name;
      label.style.color = c.accent;
      row.appendChild(label);

      var cells = document.createElement('div');
      cells.className = 'gallery-cells';

      C.ANIMATION_ORDER.forEach(function (animKey, i) {
        var anim = C.ANIMATIONS[animKey];

        var cell = document.createElement('div');
        cell.className = 'gallery-cell';

        var cv = document.createElement('canvas');
        cv.width = 96;
        cv.height = 96;
        cv.className = 'sprite';

        var cap = document.createElement('span');
        cap.className = 'gallery-cap';
        cap.textContent = anim.label;

        cell.appendChild(cv);
        cell.appendChild(cap);
        cells.appendChild(cell);

        addLoopJob(cv, key, animKey, 88, 4, i * 0.37 + rowIndex * 0.21, false);
      });

      row.appendChild(cells);
      host.appendChild(row);
    });
  }

  /* --------------------------------------------------------------- stage */

  var GROUND_Y = 300;
  var STAGE_H = 360;
  var MOVE_SPEED = 220;
  var GRAVITY = 1900;
  var JUMP_VELOCITY = -720;
  var HALF_W = 26;

  var stage = {
    canvas: null,
    ctx: null,
    key: 'piggu',
    x: 200,
    feetY: GROUND_Y,
    vx: 0,
    vy: 0,
    onGround: true,
    facing: 1,
    anim: 'idle',
    animTime: 0,
    forcedAnim: null,
    forcedTimer: 0,
    skyGradient: null
  };

  var keys = {};
  var jumpLatch = false;

  function isDown() {
    return keys['ArrowLeft'] || keys['KeyA'] || keys['ArrowRight'] || keys['KeyD'];
  }

  function selectCharacter(key) {
    if (!C.CHARACTERS[key]) return;
    stage.key = key;
    stage.anim = 'idle';
    stage.animTime = 0;
    stage.forcedAnim = null;
    stage.forcedTimer = 0;

    var cards = document.querySelectorAll('#cast .card');
    for (var i = 0; i < cards.length; i++) {
      var el = cards[i];
      if (el.getAttribute('data-key') === key) el.classList.add('selected');
      else el.classList.remove('selected');
    }
  }

  function cycleCharacter(step) {
    var i = C.CHARACTER_ORDER.indexOf(stage.key) + step;
    i = ((i % C.CHARACTER_ORDER.length) + C.CHARACTER_ORDER.length) % C.CHARACTER_ORDER.length;
    selectCharacter(C.CHARACTER_ORDER[i]);
  }

  function forceAnimation(name, seconds) {
    stage.forcedAnim = name;
    stage.forcedTimer = seconds;
    stage.animTime = 0;
  }

  function updateStage(dt) {
    if (stage.forcedTimer > 0) {
      stage.forcedTimer -= dt;
      if (stage.forcedTimer <= 0) {
        stage.forcedAnim = null;
        stage.animTime = 0;
      }
    }

    var dir = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) dir -= 1;
    if (keys['ArrowRight'] || keys['KeyD']) dir += 1;

    if (stage.forcedAnim) {
      stage.vx = 0;
    } else if (dir !== 0) {
      stage.vx = dir * MOVE_SPEED;
      stage.facing = dir;
    } else {
      stage.vx = 0;
    }

    stage.vy += GRAVITY * dt;
    if (stage.vy > 1600) stage.vy = 1600;

    var previousFeet = stage.feetY;
    stage.x += stage.vx * dt;
    stage.feetY += stage.vy * dt;

    if (stage.x < HALF_W + 6) stage.x = HALF_W + 6;
    if (stage.x > stage.canvas.width - HALF_W - 6) stage.x = stage.canvas.width - HALF_W - 6;

    stage.onGround = false;

    /* the little crate in the middle of the test area */
    var crateTop = 214;
    var crateLeft = 246;
    var crateRight = 356;
    var overCrate = stage.x > crateLeft - HALF_W * 0.4 && stage.x < crateRight + HALF_W * 0.4;

    if (stage.vy >= 0 && overCrate && previousFeet <= crateTop && stage.feetY >= crateTop) {
      stage.feetY = crateTop;
      stage.vy = 0;
      stage.onGround = true;
    } else if (stage.feetY >= GROUND_Y) {
      stage.feetY = GROUND_Y;
      stage.vy = 0;
      stage.onGround = true;
    }

    /* pick the animation for this frame */
    if (stage.forcedAnim) {
      stage.anim = stage.forcedAnim;
      stage.animTime += dt;
    } else if (!stage.onGround) {
      stage.anim = stage.vy < 0 ? 'jump' : 'fall';
      stage.animTime += dt;
    } else if (Math.abs(stage.vx) > 1) {
      stage.anim = 'walk';
      stage.animTime += dt * (Math.abs(stage.vx) / MOVE_SPEED);
    } else {
      stage.anim = 'idle';
      stage.animTime += dt;
    }
  }

  function currentStageFrame() {
    var anim = C.ANIMATIONS[stage.anim] || C.ANIMATIONS.idle;
    var f = Math.floor(stage.animTime * anim.fps);
    if (!isFinite(f) || f < 0) f = 0;
    if (anim.loop) f = f % anim.count;
    if (f > anim.count - 1) f = anim.count - 1;
    return f;
  }

  function drawStage() {
    var ctx = stage.ctx;
    var w = stage.canvas.width;
    var h = stage.canvas.height;

    if (!stage.skyGradient) {
      stage.skyGradient = ctx.createLinearGradient(0, 0, 0, h);
      stage.skyGradient.addColorStop(0, '#8ed0ff');
      stage.skyGradient.addColorStop(1, '#dcf3ff');
    }
    ctx.fillStyle = stage.skyGradient;
    ctx.fillRect(0, 0, w, h);

    /* clouds */
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(70, 70, 22, 0, Math.PI * 2);
    ctx.arc(96, 62, 28, 0, Math.PI * 2);
    ctx.arc(126, 72, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(300, 120, 16, 0, Math.PI * 2);
    ctx.arc(320, 114, 21, 0, Math.PI * 2);
    ctx.arc(342, 122, 15, 0, Math.PI * 2);
    ctx.fill();

    /* ground */
    ctx.fillStyle = '#4a9a48';
    ctx.fillRect(0, GROUND_Y, w, h - GROUND_Y);
    ctx.fillStyle = '#67c45e';
    ctx.fillRect(0, GROUND_Y, w, 10);

    /* crate / platform */
    ctx.fillStyle = '#b8763c';
    ctx.fillRect(246, 214, 110, 26);
    ctx.fillStyle = '#d18f4d';
    ctx.fillRect(246, 214, 110, 6);

    /* the character */
    C.drawCharacterFrame(
      ctx,
      stage.key,
      stage.anim,
      currentStageFrame(),
      stage.x,
      stage.feetY,
      132,
      stage.facing < 0
    );

    /* caption */
    var c = C.CHARACTERS[stage.key];
    ctx.fillStyle = 'rgba(12, 20, 30, 0.72)';
    ctx.fillRect(8, h - 34, 190, 26);
    ctx.fillStyle = c.accent;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(c.name + ' - ' + stage.anim, 16, h - 16);
  }

  /* ------------------------------------------------------------ the loop */

  function drawLoopJob(job, seconds) {
    var anim = C.ANIMATIONS[job.anim] || C.ANIMATIONS.idle;
    var f = Math.floor(seconds * anim.fps + job.offset);
    if (!isFinite(f) || f < 0) f = 0;
    if (anim.loop) f = f % anim.count;
    if (f > anim.count - 1) f = anim.count - 1;

    var ctx = job.ctx;
    ctx.clearRect(0, 0, job.canvas.width, job.canvas.height);
    C.drawCharacterFrame(
      ctx,
      job.key,
      job.anim,
      f,
      job.canvas.width / 2,
      job.canvas.height - job.feetPad,
      job.cellPx,
      job.flip
    );
  }

  var stateLine = null;
  var lastTime = 0;
  var elapsed = 0;

  function tick(now) {
    if (!lastTime) lastTime = now;
    var dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;
    elapsed += dt;

    updateStage(dt);
    drawStage();

    for (var i = 0; i < loopJobs.length; i++) {
      drawLoopJob(loopJobs[i], elapsed);
    }

    if (stateLine) {
      stateLine.textContent = 'Controlling: ' + C.CHARACTERS[stage.key].name +
        '   |   State: ' + stage.anim +
        '   |   Frame: ' + (currentStageFrame() + 1) + '/' + C.ANIMATIONS[stage.anim].count;
    }

    requestAnimationFrame(tick);
  }

  /* --------------------------------------------------------------- input */

  function bindKeys() {
    window.addEventListener('keydown', function (e) {
      keys[e.code] = true;

      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' ||
          e.code === 'ArrowUp' || e.code === 'ArrowDown' ||
          e.code === 'Space' || e.code === 'Tab') {
        e.preventDefault();
      }

      if (e.code === 'Digit1') selectCharacter('piggu');
      if (e.code === 'Digit2') selectCharacter('paddy');
      if (e.code === 'Digit3') selectCharacter('pinku');
      if (e.code === 'Tab') cycleCharacter(e.shiftKey ? -1 : 1);

      if (e.code === 'KeyH') forceAnimation('hurt', 0.7);
      if (e.code === 'KeyV') forceAnimation('victory', 1.8);

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (!jumpLatch && stage.onGround && !stage.forcedAnim) {
          stage.vy = JUMP_VELOCITY;
          stage.onGround = false;
        }
        jumpLatch = true;
      }
    });

    window.addEventListener('keyup', function (e) {
      keys[e.code] = false;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        jumpLatch = false;
      }
    });

    window.addEventListener('blur', function () {
      keys = {};
      jumpLatch = false;
    });
  }

  /* ---------------------------------------------------------------- boot */

  function boot() {
    stage.canvas = document.getElementById('stage');
    if (!stage.canvas) return;
    stage.ctx = stage.canvas.getContext('2d');
    stage.ctx.imageSmoothingEnabled = false;
    stage.feetY = GROUND_Y;

    stateLine = document.getElementById('stateLine');

    buildCast();
    buildGallery();
    selectCharacter('piggu');
    bindKeys();

    requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
