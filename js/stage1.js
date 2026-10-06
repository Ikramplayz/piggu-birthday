/* stage1.js - the Stage 1 test scene.
 *
 * Shows the three characters on a small playground so you can check:
 *   - the three characters look right and are easy to tell apart
 *   - walking, jumping and landing on platforms work
 *   - switching between the three characters works
 *
 * This is deliberately NOT a level. It is a test bench for the foundation.
 */

(function () {
  'use strict';

  var canvas = document.getElementById('game');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  var W = canvas.width;   /* 960 */
  var H = canvas.height;  /* 540 */

  /* ------------------------------------------------------------- tuning */
  var GRAVITY     = 0.85;
  var ACCEL       = 0.95;
  var MAX_SPEED   = 4.6;
  var FRICTION    = 0.78;
  var JUMP_SPEED  = -15.5;
  var MAX_FALL    = 24;
  var HALF_W      = 15;   /* half the collision width */
  var CHAR_H      = 68;   /* collision height */
  var SPRITE      = 3;    /* pixels per sprite grid cell */

  /* --------------------------------------------------------- the world */
  var platforms = [
    { x: 0,   y: 470, w: 960, h: 70 },
    { x: 110, y: 372, w: 170, h: 22 },
    { x: 395, y: 300, w: 185, h: 22 },
    { x: 700, y: 372, w: 175, h: 22 }
  ];

  var players = [
    { key: 'hero',   tag: 'P1', name: 'P1 You',         x: 180 },
    { key: 'friend', tag: 'P2', name: 'P2 Your friend', x: 480 },
    { key: 'gf',     tag: 'P3', name: 'P3 Girlfriend',  x: 780 }
  ];

  var active = 0;
  var spawnX = [180, 480, 780];

  for (var i = 0; i < players.length; i++) {
    players[i].y = 470;
    players[i].vx = 0;
    players[i].vy = 0;
    players[i].onGround = true;
    players[i].animT = 0;
    players[i].pose = 'idle';
    players[i].frame = 0;
    players[i].facing = 1;
  }

  /* Decorative floating balloons so the sky is not empty. */
  var balloons = [];
  var balloonColors = ['#ff8fb1', '#ffd166', '#8ad4ff', '#b6a4ff', '#8ef0c8'];
  for (var b = 0; b < 7; b++) {
    balloons.push({
      x: 70 + b * 132,
      y: 80 + ((b * 57) % 90),
      r: 15 + (b % 3) * 5,
      color: balloonColors[b % balloonColors.length]
    });
  }

  /* ------------------------------------------------------------- input */
  var keys = Object.create(null);

  function isLeft()  { return keys['ArrowLeft']  || keys['KeyA']; }
  function isRight() { return keys['ArrowRight'] || keys['KeyD']; }
  function isJump()  { return keys['Space'] || keys['ArrowUp'] || keys['KeyW']; }

  window.addEventListener('keydown', function (e) {
    keys[e.code] = true;

    if (e.code === 'Digit1' || e.code === 'Numpad1') setActive(0);
    else if (e.code === 'Digit2' || e.code === 'Numpad2') setActive(1);
    else if (e.code === 'Digit3' || e.code === 'Numpad3') setActive(2);
    else if (e.code === 'Tab') { setActive((active + 1) % players.length); e.preventDefault(); }

    if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
  });

  window.addEventListener('keyup', function (e) {
    keys[e.code] = false;
  });

  function setActive(index) {
    active = index;
    var el = document.getElementById('status');
    if (el) el.textContent = 'Now controlling: ' + players[index].name +
      '   (press 1, 2, 3 or Tab to switch)';
  }

  /* --------------------------------------------------------- collision */
  function overlaps(p, pl) {
    return (p.x - HALF_W) < (pl.x + pl.w) &&
           (p.x + HALF_W) > pl.x &&
           (p.y - CHAR_H) < (pl.y + pl.h) &&
           p.y > pl.y;
  }

  /* ------------------------------------------------------------ update */
  function update() {
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      var mine = (i === active);

      var left  = mine && isLeft();
      var right = mine && isRight();
      var jump  = mine && isJump();

      if (left)  { p.vx -= ACCEL; p.facing = -1; }
      if (right) { p.vx += ACCEL; p.facing = 1; }
      if (!left && !right) p.vx *= FRICTION;
      if (Math.abs(p.vx) < 0.05) p.vx = 0;
      if (p.vx > MAX_SPEED)  p.vx = MAX_SPEED;
      if (p.vx < -MAX_SPEED) p.vx = -MAX_SPEED;

      if (jump && p.onGround) {
        p.vy = JUMP_SPEED;
        p.onGround = false;
      }

      p.vy += GRAVITY;
      if (p.vy > MAX_FALL) p.vy = MAX_FALL;

      /* move down/up first, then sideways - simple and reliable */
      p.y += p.vy;
      p.onGround = false;
      for (var j = 0; j < platforms.length; j++) {
        var pl = platforms[j];
        if (!overlaps(p, pl)) continue;
        if (p.vy > 0) {
          p.y = pl.y;
          p.vy = 0;
          p.onGround = true;
        } else if (p.vy < 0) {
          p.y = pl.y + pl.h + CHAR_H;
          p.vy = 0;
        }
      }

      p.x += p.vx;
      for (var k = 0; k < platforms.length; k++) {
        var q = platforms[k];
        if (!overlaps(p, q)) continue;
        if (p.vx > 0) p.x = q.x - HALF_W;
        else if (p.vx < 0) p.x = q.x + q.w + HALF_W;
        p.vx = 0;
      }

      if (p.x < HALF_W) { p.x = HALF_W; p.vx = 0; }
      if (p.x > W - HALF_W) { p.x = W - HALF_W; p.vx = 0; }

      /* safety net: never lose a character off the bottom */
      if (p.y > H + 300) {
        p.x = spawnX[i];
        p.y = 470;
        p.vx = 0;
        p.vy = 0;
      }

      /* pick the animation */
      if (!p.onGround) {
        p.pose = 'jump';
        p.animT = 0;
      } else if (Math.abs(p.vx) > 0.4) {
        p.pose = 'walk';
        p.animT += Math.abs(p.vx) * 0.045;
      } else {
        p.pose = 'idle';
        p.animT += 0.022;
      }
      p.frame = Math.floor(p.animT);
    }
  }

  /* ------------------------------------------------------------ render */
  function render() {
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#7cc6f7');
    sky.addColorStop(0.55, '#c9e9ff');
    sky.addColorStop(1, '#ffe6cd');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    for (var b = 0; b < balloons.length; b++) {
      var bl = balloons[b];
      ctx.strokeStyle = 'rgba(40,60,80,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bl.x, bl.y + bl.r);
      ctx.lineTo(bl.x, bl.y + bl.r + 34);
      ctx.stroke();

      ctx.fillStyle = bl.color;
      ctx.beginPath();
      ctx.ellipse(bl.x, bl.y, bl.r * 0.85, bl.r, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.ellipse(bl.x - bl.r * 0.3, bl.y - bl.r * 0.35, bl.r * 0.22, bl.r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    for (var i = 0; i < platforms.length; i++) {
      var pl = platforms[i];
      ctx.fillStyle = '#4d8a52';
      ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
      ctx.fillStyle = '#6fbf73';
      ctx.fillRect(pl.x, pl.y, pl.w, 7);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(pl.x, pl.y + 7, pl.w, 3);
    }

    /* highlight ring under the character you are controlling */
    var who = players[active];
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(who.x, who.y - 3, 27, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    for (var k = 0; k < players.length; k++) {
      var p = players[k];
      window.drawCharacter(ctx, p.key, p.pose, p.frame, p.x, p.y, SPRITE, p.facing);

      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = (k === active) ? '#10202e' : 'rgba(16,32,46,0.5)';
      ctx.fillText(p.tag, p.x, p.y - 82);
    }

    ctx.textAlign = 'left';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillStyle = '#10202e';
    ctx.fillText('Controlling: ' + who.name, 18, 32);

    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(16,32,46,0.75)';
    ctx.fillText('Arrows / WASD to move   -   Space to jump   -   1 2 3 or Tab to switch', 18, 56);

    ctx.textAlign = 'right';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(16,32,46,0.6)';
    ctx.fillText('STAGE 1 - character test', W - 18, 32);
  }

  /* -------------------------------------------------------- main loop */
  var STEP = 1000 / 60;
  var last = 0;
  var acc = 0;

  function loop(now) {
    if (!last) last = now;
    var dt = now - last;
    last = now;
    if (dt > 250) dt = STEP;
    acc += dt;

    var guard = 0;
    while (acc >= STEP && guard < 5) {
      update();
      acc -= STEP;
      guard++;
    }
    if (guard >= 5) acc = 0;

    render();
    requestAnimationFrame(loop);
  }

  /* --------------------------------------------- sprite preview strip */
  function renderPreview() {
    var pv = document.getElementById('preview');
    if (!pv) return;
    var pc = pv.getContext('2d');
    pc.imageSmoothingEnabled = false;

    pc.fillStyle = '#121a24';
    pc.fillRect(0, 0, pv.width, pv.height);

    var order = window.CHARACTER_ORDER;
    var names = window.CHARACTER_NAMES;
    var columns = [
      ['idle', 0], ['idle', 1],
      ['walk', 0], ['walk', 1], ['walk', 2], ['walk', 3],
      ['jump', 0]
    ];
    var captions = ['idle', 'idle', 'walk', 'walk', 'walk', 'walk', 'jump'];

    for (var r = 0; r < order.length; r++) {
      var rowTop = 6 + r * 130;
      var key = order[r];

      pc.textAlign = 'left';
      pc.fillStyle = '#ffffff';
      pc.font = 'bold 16px system-ui, sans-serif';
      pc.fillText(names[key], 12, rowTop + 46);
      pc.fillStyle = '#9fb3c8';
      pc.font = '12px system-ui, sans-serif';
      pc.fillText('7 frames', 12, rowTop + 66);

      for (var c = 0; c < columns.length; c++) {
        var cx = 190 + c * 100;
        window.drawCharacter(pc, key, columns[c][0], columns[c][1], cx, rowTop + 96, 4, 1);

        pc.textAlign = 'center';
        pc.fillStyle = '#7f97b0';
        pc.font = '11px system-ui, sans-serif';
        pc.fillText(captions[c], cx, rowTop + 116);
      }
    }
  }

  /* ------------------------------------------------------------- boot */
  setActive(0);
  renderPreview();
  requestAnimationFrame(loop);
})();
