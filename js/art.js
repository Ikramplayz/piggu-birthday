/* art.js
   ---------------------------------------------------------------
   All the drawing for the birthday game: sky, background, platforms,
   decorations, collectibles, enemies, the finish flag and the HUD.

   Everything here is drawn in code - there are no level image files.
   Nothing is copied from another game.

   Screen is 480 x 270. World pixels match screen pixels 1 to 1.
   In every level the ground surface sits at y = 210.

   Colours come from a palette object passed in by the level, so the
   same shapes can look like a morning party, a sunset park or an
   evening boss arena just by changing the palette.

   Public API:  window.BirthdayArt.<function>
   --------------------------------------------------------------- */

(function (global) {
  'use strict';

  var SCREEN_W = 480;
  var SCREEN_H = 270;

  var TAU = Math.PI * 2;

  /* ------------------------------------------------------- tiny helpers */

  function rr(ctx, x, y, w, h, r) {
    if (r > w / 2) { r = w / 2; }
    if (r > h / 2) { r = h / 2; }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function fillRR(ctx, x, y, w, h, r, color) {
    rr(ctx, x, y, w, h, r);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  /* A stable pseudo random number from a coordinate, so scenery does not
     jiggle around between frames. */
  function hash(n) {
    var x = Math.sin(n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  function heart(ctx, cx, cy, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.30);
    ctx.bezierCurveTo(cx, cy - s * 0.14, cx - s * 0.56, cy - s * 0.14, cx - s * 0.56, cy + s * 0.22);
    ctx.bezierCurveTo(cx - s * 0.56, cy + s * 0.60, cx, cy + s * 0.84, cx, cy + s);
    ctx.bezierCurveTo(cx, cy + s * 0.84, cx + s * 0.56, cy + s * 0.60, cx + s * 0.56, cy + s * 0.22);
    ctx.bezierCurveTo(cx + s * 0.56, cy - s * 0.14, cx, cy - s * 0.14, cx, cy + s * 0.30);
    ctx.closePath();
    ctx.fill();
  }

  /* Faces on the enemies and the bosses, so they read as friendly-cute
     rather than as blank shapes. */
  function cuteEyes(ctx, cx, y, gap, r, color) {
    circle(ctx, cx - gap, y, r);
    circle(ctx, cx + gap, y, r);
    ctx.fillStyle = color || '#3a2b33';
    ctx.beginPath();
    ctx.arc(cx - gap, y - r * 0.35, r * 0.45, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + gap, y - r * 0.35, r * 0.45, 0, TAU);
    ctx.fill();
  }

  /* --------------------------------------------------------- background */

  function drawSky(ctx, pal) {
    var g = ctx.createLinearGradient(0, 0, 0, SCREEN_H);
    g.addColorStop(0, pal.skyTop);
    g.addColorStop(0.55, pal.skyMid);
    g.addColorStop(1, pal.skyLow);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }

  function drawClouds(ctx, pal, camX, time) {
    var par = 0.22;
    var shift = (camX * par) % 260;
    ctx.fillStyle = pal.cloud || 'rgba(255,255,255,0.75)';
    for (var i = -1; i < 3; i++) {
      var bx = i * 260 - shift + 40;
      var by = 34 + (i % 2) * 26;
      circle(ctx, bx, by, 17);
      circle(ctx, bx + 22, by + 5, 13);
      circle(ctx, bx - 20, by + 6, 12);
      circle(ctx, bx + 6, by - 9, 12);
    }
  }

  function drawHills(ctx, pal, camX, groundY) {
    var layers = [
      { par: 0.40, color: pal.hillBack, amp: 26, base: groundY - 66, step: 128 },
      { par: 0.64, color: pal.hillFront, amp: 20, base: groundY - 34, step: 96 }
    ];

    for (var l = 0; l < layers.length; l++) {
      var L = layers[l];
      ctx.fillStyle = L.color;
      ctx.beginPath();
      ctx.moveTo(-10, groundY);
      for (var x = -10; x <= SCREEN_W + 10; x += 8) {
        var wx = x + camX * L.par;
        var y = L.base + Math.sin(wx / L.step) * L.amp + Math.sin(wx / (L.step * 0.41)) * L.amp * 0.35;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(SCREEN_W + 10, groundY);
      ctx.closePath();
      ctx.fill();
    }
  }

  /* Soft confetti drifting in the sky. Pure decoration, drawn behind
     everything and never part of collision. */
  function drawMotes(ctx, pal, camX, time) {
    var par = 0.30;
    var padX = camX * par;
    ctx.globalAlpha = 0.75;
    for (var i = 0; i < 26; i++) {
      var baseX = hash(i * 3.3) * 1400;
      var baseY = hash(i * 7.7) * 200;
      var x = ((baseX - padX) % 700 + 700) % 700 - 110;
      if (x < -20 || x > SCREEN_W + 20) { continue; }
      var y = baseY + Math.sin(time * 0.7 + i) * 7;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(time * 0.9 + i);
      ctx.fillStyle = [pal.mote, pal.mote2 || pal.mote, pal.mote3 || pal.mote][i % 3];
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /* A string of little triangle flags strung across the top of the sky,
     the one decoration that instantly reads as "party". */
  function drawBunting(ctx, pal, camX, time) {
    var par = 0.85;
    var shift = (camX * par) % 48;
    var colors = pal.bunting || ['#ff8fb1', '#ffd166', '#8ed4ff', '#b8f2c9'];

    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var x = -60; x <= SCREEN_W + 60; x += 10) {
      var wx = x + camX * par;
      var y = 16 + Math.sin((x + shift) / 90) * 7;
      if (x === -60) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
    }
    ctx.stroke();

    var idx = 0;
    for (var fx = -48; fx <= SCREEN_W + 48; fx += 48) {
      var fy = 16 + Math.sin((fx + shift) / 90) * 7;
      ctx.fillStyle = colors[idx % colors.length];
      ctx.beginPath();
      ctx.moveTo(fx - 7, fy);
      ctx.lineTo(fx + 7, fy);
      ctx.lineTo(fx, fy + 15);
      ctx.closePath();
      ctx.fill();
      idx++;
    }
  }

  /* ---------------------------------------------------------- platforms */

  /* Platforms are fat pink party slabs with a lighter icing top. The
     drawn slab is exactly the collision rectangle, so what you see is
     what you land on. */
  function drawSolids(ctx, solids, pal) {
    for (var i = 0; i < solids.length; i++) {
      var s = solids[i];
      var r = Math.min(9, s.h / 2);

      fillRR(ctx, s.x, s.y, s.w, s.h, r, pal.edge);
      fillRR(ctx, s.x, s.y, s.w, Math.max(4, s.h - 5), r, pal.body);

      var capH = Math.min(6, s.h * 0.34);
      fillRR(ctx, s.x + 1, s.y + 1, s.w - 2, capH, capH / 2, pal.top);

      ctx.globalAlpha = 0.5;
      ctx.fillStyle = pal.speck || '#ffffff';
      for (var d = 0; d < Math.floor(s.w / 26); d++) {
        circle(ctx, s.x + 12 + d * 26, s.y + 2 + capH + 5, 1.4);
      }
      ctx.globalAlpha = 1;
    }
  }

  /* -------------------------------------------------------- decorations */

  function drawBalloon(ctx, x, groundY, bob, pal, color, t) {
    var y = groundY - 54 - bob;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 13);
    ctx.quadraticCurveTo(x + Math.sin(t * 1.4 + bob) * 5, y + 34, x, groundY);
    ctx.stroke();

    ctx.globalAlpha = 0.28;
    circle(ctx, x, y, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = color;
    rr(ctx, x - 9, y - 11, 18, 21, 9);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 2.5, y + 9);
    ctx.lineTo(x + 2.5, y + 9);
    ctx.lineTo(x, y + 13);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.65;
    ctx.fillStyle = '#ffffff';
    circle(ctx, x - 3.4, y - 4.4, 2.4);
    ctx.globalAlpha = 1;
  }

  function drawBush(ctx, x, groundY, pal) {
    ctx.fillStyle = pal.bush || '#8ed9a0';
    circle(ctx, x, groundY - 7, 10);
    circle(ctx, x - 10, groundY - 3, 7);
    circle(ctx, x + 10, groundY - 3, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    circle(ctx, x - 3, groundY - 11, 3.6);
  }

  function drawCakeDecor(ctx, x, groundY) {
    ctx.fillStyle = '#ffd9e6';
    rr(ctx, x - 12, groundY - 12, 24, 12, 3);
    ctx.fill();
    ctx.fillStyle = '#fff4f8';
    rr(ctx, x - 12, groundY - 13, 24, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = '#ff8fb1';
    ctx.fillRect(x - 12, groundY - 6, 24, 2);
    ctx.fillStyle = '#8ed4ff';
    ctx.fillRect(x - 9, groundY - 6, 3, 2);
    ctx.fillRect(x + 2, groundY - 6, 3, 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, groundY - 13);
    ctx.lineTo(x, groundY - 19);
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(x - 1.6, groundY - 22);
    ctx.lineTo(x + 1.6, groundY - 21);
    ctx.lineTo(x, groundY - 17.5);
    ctx.closePath();
    ctx.fill();
  }

  /* A small twinkle that appears around a cake once Piggu walks up to
     it. Decoration only - it has no collision and cannot block him. */
  function drawCakeSparkle(ctx, x, groundY, t) {
    var base = groundY - 17;
    for (var i = 0; i < 4; i++) {
      var a = t * 2.4 + i * 1.57;
      var sx = x + Math.cos(a) * 15;
      var sy = base + Math.sin(a * 1.3) * 8;
      var s = 1.5 + Math.sin(t * 6 + i) * 0.9;

      ctx.globalAlpha = 0.5 + Math.sin(t * 6 + i) * 0.35;
      ctx.fillStyle = (i % 2) ? '#ffd166' : '#ffffff';
      ctx.fillRect(sx - s, sy - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1;
  }

  function drawDecor(ctx, decor, pal, time) {
    for (var i = 0; i < decor.length; i++) {
      var d = decor[i];
      var bob = Math.sin(time * 1.1 + i * 1.7) * 3;

      if (d.kind === 'balloon') {
        drawBalloon(ctx, d.x, d.y, 14 + bob, pal, pal.balloons ? pal.balloons[i % pal.balloons.length] : '#ff8fb1', time);
      } else if (d.kind === 'bush') {
        drawBush(ctx, d.x, d.y, pal);
      } else if (d.kind === 'cake') {
        drawCakeDecor(ctx, d.x, d.y);
        if (d.near) { drawCakeSparkle(ctx, d.x, d.y, time); }
      }
    }
  }

  /* ------------------------------------------------------- collectibles */

  function drawItemIcon(ctx, kind, t) {
    if (kind === 'present') {
      fillRR(ctx, -8, -7, 16, 14, 2, '#ff8fb1');
      fillRR(ctx, -8, -2, 16, 3, 1, '#ffd166');
      fillRR(ctx, -2, -7, 4, 14, 1, '#ffd166');
      ctx.fillStyle = '#ffd166';
      circle(ctx, -4, -8, 3);
      circle(ctx, 4, -8, 3);
      circle(ctx, 0, -9, 2.5);
    } else if (kind === 'lolli') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 8);
      ctx.stroke();
      ctx.fillStyle = '#ffb3d1';
      circle(ctx, 0, -3, 7);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, -3, 4, t * 2, t * 2 + 4.2);
      ctx.stroke();
    } else if (kind === 'candy') {
      ctx.fillStyle = '#8ed4ff';
      circle(ctx, 0, -1, 6);
      ctx.beginPath();
      ctx.moveTo(-6, -1);
      ctx.lineTo(-12, -6);
      ctx.lineTo(-12, 4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(6, -1);
      ctx.lineTo(12, -6);
      ctx.lineTo(12, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      circle(ctx, -2, -3, 2);
    } else if (kind === 'star') {
      /* A little gold star that twinkles as it bobs. */
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      for (var s = 0; s < 10; s++) {
        var sr = (s % 2 === 0) ? 8.5 : 3.8;
        var sa = -Math.PI / 2 + s * Math.PI / 5 + Math.sin(t * 2) * 0.07;
        var sx = Math.cos(sa) * sr;
        var sy = Math.sin(sa) * sr;
        if (s === 0) { ctx.moveTo(sx, sy); } else { ctx.lineTo(sx, sy); }
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      circle(ctx, -1.8, -2.8, 1.5);
    } else {
      ctx.fillStyle = '#f7c59f';
      ctx.beginPath();
      ctx.moveTo(-7, 6);
      ctx.lineTo(7, 6);
      ctx.lineTo(5, -2);
      ctx.lineTo(-5, -2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffb3d1';
      circle(ctx, 0, -5, 6);
      circle(ctx, -4, -2, 4);
      circle(ctx, 4, -2, 4);
      ctx.fillStyle = '#e8433f';
      circle(ctx, 0, -10, 2.4);
    }
  }

  function drawItems(ctx, items, time) {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.taken) { continue; }

      var bob = Math.sin(time * 2.2 + it.x * 0.05) * 2.5;
      var y = it.y + bob;

      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#ffffff';
      circle(ctx, it.x, y, 11);
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.translate(it.x, y);
      ctx.rotate(Math.sin(time * 1.6 + it.x * 0.03) * 0.08);
      drawItemIcon(ctx, it.kind, time + i);
      ctx.restore();
    }
  }

  /* ------------------------------------------------------------ enemies */

  /* Two friendly-but-in-the-way party creatures. Both are drawn on a
     16px footprint so they match their collision boxes. */

  function drawCupcakeEnemy(ctx, x, y, w, h, t) {
    var cx = x + w / 2;
    var step = Math.sin(t * 9) * 1.6;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 6, y + h - 2 + step, 3, 3);
    ctx.fillRect(cx + 3, y + h - 2 - step, 3, 3);

    ctx.fillStyle = '#d9a066';
    ctx.beginPath();
    ctx.moveTo(x + 1, y + 6);
    ctx.lineTo(x + w - 1, y + 6);
    ctx.lineTo(x + w - 3, y + h - 2);
    ctx.lineTo(x + 3, y + h - 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#b8825a';
    ctx.lineWidth = 1;
    for (var i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 1 + i * 4.5, y + 6);
      ctx.lineTo(x + 3 + i * 3, y + h - 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffb3d1';
    circle(ctx, cx - 4, y + 4, 5);
    circle(ctx, cx + 4, y + 4, 5);
    circle(ctx, cx, y, 5.5);

    cuteEyes(ctx, cx, y + 4, 3.2, 1.6, '#5a3a46');
    ctx.strokeStyle = '#5a3a46';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, y + 9.5, 2.4, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    ctx.fillStyle = '#e8433f';
    circle(ctx, cx, y - 5, 3);
    ctx.strokeStyle = '#4f8f4f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, y - 7);
    ctx.lineTo(cx + 2, y - 11);
    ctx.stroke();
  }

  function drawParcelEnemy(ctx, x, y, w, h, t) {
    var cx = x + w / 2;
    var step = Math.sin(t * 8) * 1.4;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 6, y + h - 2 + step, 3, 3);
    ctx.fillRect(cx + 3, y + h - 2 - step, 3, 3);

    fillRR(ctx, x, y, w, h, 3, '#8ed4ff');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 2, y, 4, h);
    ctx.fillRect(x, y + h / 2 - 2, w, 4);
    ctx.fillStyle = '#ffd166';
    circle(ctx, cx - 4, y - 1, 3.2);
    circle(ctx, cx + 4, y - 1, 3.2);
    circle(ctx, cx, y - 2.5, 2.6);

    cuteEyes(ctx, cx, y + h * 0.42, 3.2, 1.5, '#3a5a70');
  }

  function drawEnemies(ctx, enemies, time) {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.kind === 'cupcake') {
        drawCupcakeEnemy(ctx, e.x, e.y, e.w, e.h, time + i);
      } else {
        drawParcelEnemy(ctx, e.x, e.y, e.w, e.h, time + i);
      }
    }
  }

  /* -------------------------------------------------------------- shots */

  function drawShots(ctx, shots, time) {
    for (var i = 0; i < shots.length; i++) {
      var s = shots[i];
      if (s.kind === 'heart') {
        heart(ctx, s.x + s.w / 2, s.y + s.h / 2, s.h, '#f06ea9');
      } else {
        ctx.save();
        ctx.translate(s.x + s.w / 2, s.y + s.h / 2);
        ctx.rotate(time * 6 + i);
        ctx.fillStyle = ['#ffd166', '#8ed4ff', '#b8f2c9'][i % 3];
        ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
        ctx.restore();
      }
    }
  }

  /* -------------------------------------------------------------- signs */

  /* A wooden sign with a chunky arrow on it. Used to point the player
     toward the finish so they always know where to go next. */
  function drawSign(ctx, s, pal) {
    var dir = s.dir === -1 ? -1 : 1;
    ctx.fillStyle = '#c68b59';
    ctx.fillRect(s.x - 2, s.y, 4, s.h);

    var bw = 34;
    var bh = 18;
    var bx = s.x - bw / 2;
    var by = s.y - bh + 4;

    fillRR(ctx, bx, by, bw, bh, 4, '#f0c088');
    fillRR(ctx, bx + 2, by + 2, bw - 4, bh - 4, 3, pal.signFace || '#ffe6c2');

    ctx.save();
    ctx.translate(s.x, by + bh / 2);
    if (dir < 0) { ctx.scale(-1, 1); }
    ctx.fillStyle = '#e8734a';
    ctx.beginPath();
    ctx.moveTo(-7, -4);
    ctx.lineTo(2, -4);
    ctx.lineTo(2, -8);
    ctx.lineTo(10, 0);
    ctx.lineTo(2, 8);
    ctx.lineTo(2, 4);
    ctx.lineTo(-7, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* ------------------------------------------------------------- finish */

  function drawFinish(ctx, finish, time) {
    var x = finish.x;
    var top = finish.y;
    var base = finish.y + finish.h;

    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.beginPath();
    ctx.ellipse(x, base, 14, 4, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#c68b59';
    ctx.fillRect(x - 2, top, 4, finish.h);

    var wave = Math.sin(time * 3) * 2;
    ctx.fillStyle = '#ff8fb1';
    ctx.beginPath();
    ctx.moveTo(x + 2, top + 2);
    ctx.quadraticCurveTo(x + 16, top + 4 + wave, x + 30, top + 8 + wave);
    ctx.lineTo(x + 30, top + 24 + wave);
    ctx.quadraticCurveTo(x + 16, top + 20 + wave, x + 2, top + 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    circle(ctx, x + 15, top + 12 + wave, 4);
    ctx.fillStyle = '#ff8fb1';
    circle(ctx, x + 15, top + 12 + wave, 2);

    var colors = ['#ffd166', '#8ed4ff', '#b8f2c9'];
    for (var i = 0; i < 3; i++) {
      var bx = x - 18 - i * 9;
      var by = top - 4 + Math.sin(time * 1.5 + i) * 3;
      ctx.fillStyle = colors[i];
      rr(ctx, bx - 6, by, 12, 14, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx, by + 14);
      ctx.lineTo(bx, by + 22);
      ctx.stroke();
    }
  }

  /* ------------------------------------------------------------- bosses */

  function drawBossHealth(ctx, b) {
    var w = 54;
    var h = 6;
    var x = b.x + b.w / 2 - w / 2;
    var y = b.y - 16;
    var pct = b.maxHp > 0 ? b.hp / b.maxHp : 0;
    if (pct < 0) { pct = 0; }

    fillRR(ctx, x - 1, y - 1, w + 2, h + 2, 4, 'rgba(60,40,55,0.55)');
    fillRR(ctx, x, y, w, h, 3, 'rgba(255,255,255,0.55)');
    if (pct > 0) {
      fillRR(ctx, x, y, w * pct, h, 3, b.barColor || '#f06ea9');
    }
    fillRR(ctx, x + 1, y + 1, Math.max(0, w * pct - 2), 2, 1, 'rgba(255,255,255,0.6)');

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.name, b.x + b.w / 2, y - 6);
  }

  function drawBoss(ctx, b, drawSprite) {
    /* Knocked down reads as solid, so it is checked first and wins over
       the faded "out of the fight" look. That way Pinku lying on the
       floor talking is clearly visible instead of ghostly. */
    if (b.animName === 'hurt') {
      ctx.globalAlpha = 0.9;
    } else if (b.defeat) {
      ctx.globalAlpha = 0.35;
    } else if (b.stun > 0) {
      ctx.globalAlpha = 0.75;
    }

    var cell = b.cell || 44;
    var anim = b.animName || (b.stun > 0 ? 'hurt' : 'idle');
    drawSprite(ctx, b.key, anim, b.frame,
               b.x + b.w / 2, b.y + b.h, cell, b.facing < 0);

    ctx.globalAlpha = 1;

    /* The health bar stays hidden until the entrance is over and the
       fight has actually started. */
    if (!b.defeat && b.ready) { drawBossHealth(ctx, b); }
  }

  /* ---------------------------------------------------------------- HUD */

  function drawHud(ctx, hud) {
    var w = SCREEN_W;   /* world width, not the bitmap width */

    ctx.save();
    ctx.textBaseline = 'middle';

    /* collectible counter, top right */
    var label = 'TREATS ' + hud.collected + ' / ' + hud.total;
    ctx.font = 'bold 11px system-ui, sans-serif';
    var tw = ctx.measureText(label).width;
    var pw = tw + 26;
    fillRR(ctx, w - pw - 8, 8, pw, 20, 10, 'rgba(255,255,255,0.72)');

    ctx.save();
    ctx.translate(w - pw + 2, 18);
    ctx.scale(0.7, 0.7);
    drawItemIcon(ctx, 'present', hud.time);
    ctx.restore();

    ctx.fillStyle = '#7a4a62';
    ctx.textAlign = 'left';
    ctx.fillText(label, w - pw + 16, 19);

    /* level name, top left */
    ctx.font = 'bold 10px system-ui, sans-serif';
    var lw = ctx.measureText(hud.levelName).width + 20;
    fillRR(ctx, 8, 8, lw, 20, 10, 'rgba(255,255,255,0.72)');
    ctx.fillStyle = '#7a4a62';
    ctx.textAlign = 'left';
    ctx.fillText(hud.levelName, 18, 19);

    ctx.restore();
  }

  global.BirthdayArt = {
    SCREEN_W: SCREEN_W,
    SCREEN_H: SCREEN_H,
    rr: rr,
    fillRR: fillRR,
    circle: circle,
    heart: heart,
    drawSky: drawSky,
    drawClouds: drawClouds,
    drawHills: drawHills,
    drawMotes: drawMotes,
    drawBunting: drawBunting,
    drawSolids: drawSolids,
    drawDecor: drawDecor,
    drawItems: drawItems,
    drawItemIcon: drawItemIcon,
    drawEnemies: drawEnemies,
    drawShots: drawShots,
    drawSign: drawSign,
    drawFinish: drawFinish,
    drawBoss: drawBoss,
    drawHud: drawHud
  };

})(window);
