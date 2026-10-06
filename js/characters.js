/* characters.js
   ---------------------------------------------------------------
   Loads the three character sprite sheets and draws animation frames.

   THE CAST - these roles are fixed and must not be swapped:

     piggu  = Piggu.  Piglet, birthday friend.  THE PLAYER.
     pinku  = Pinku.  Girl in the pink dress, Piggu's girlfriend.
                       FINAL BOSS 1.
     paddy  = Paddy.  Boy in the pink-and-white striped shirt.
                       FINAL BOSS 2.

   Sheet layout - all three sheets use the same layout:
     6 columns x 4 rows, one animation frame per cell.

       row 0 : idle      6 frames
       row 1 : walk      6 frames
       row 2 : jump      3 frames, then fall      3 frames
       row 3 : hurt      3 frames, then victory   3 frames

   The cell size is read from the image, so a 384x256 sheet and a
   768x512 sheet both work. The sheets need a transparent background.

   Public API:
     CHARACTERS / CHARACTER_ORDER
     ANIMATIONS / ANIMATION_ORDER
     PLAYER_KEY / BOSS_KEYS
     sheetReady(key) / sheetFailed(key)
     drawCharacterFrame(ctx, key, anim, frame, centerX, feetY, cellPx, flip)
   --------------------------------------------------------------- */

(function (global) {
  'use strict';

  var SHEET_COLS = 6;
  var SHEET_ROWS = 4;

  var PLAYER_KEY = 'piggu';
  var BOSS_KEYS = ['pinku', 'paddy'];

  var CHARACTERS = {
    piggu: {
      key: 'piggu',
      name: 'Piggu',
      role: 'The birthday friend - you play as him',
      sheet: 'assets/images/characters/piggu_sheet.png',
      accent: '#e8433f'
    },
    pinku: {
      key: 'pinku',
      name: 'Pinku',
      role: 'Final Boss 1',
      sheet: 'assets/images/characters/pinku_sheet.png',
      accent: '#f06ea9'
    },
    paddy: {
      key: 'paddy',
      name: 'Paddy',
      role: 'Final Boss 2',
      sheet: 'assets/images/characters/paddy_sheet.png',
      accent: '#f2a9c4'
    }
  };

  var CHARACTER_ORDER = ['piggu', 'pinku', 'paddy'];

  var ANIMATIONS = {
    idle:    { row: 0, start: 0, count: 6, fps: 6,  loop: true,  label: 'Idle' },
    walk:    { row: 1, start: 0, count: 6, fps: 10, loop: true,  label: 'Walk' },
    jump:    { row: 2, start: 0, count: 3, fps: 8,  loop: false, label: 'Jump' },
    fall:    { row: 2, start: 3, count: 3, fps: 8,  loop: false, label: 'Fall' },
    hurt:    { row: 3, start: 0, count: 3, fps: 8,  loop: false, label: 'Hurt' },
    victory: { row: 3, start: 3, count: 3, fps: 6,  loop: true,  label: 'Victory' }
  };

  var ANIMATION_ORDER = ['idle', 'walk', 'jump', 'fall', 'hurt', 'victory'];

  var images = {};
  var status = {};

  CHARACTER_ORDER.forEach(function (key) {
    status[key] = 'loading';
    var img = new Image();
    img.onload = function () { status[key] = 'ready'; };
    img.onerror = function () { status[key] = 'error'; };
    img.src = CHARACTERS[key].sheet;
    images[key] = img;
  });

  function sheetReady(key) { return status[key] === 'ready'; }
  function sheetFailed(key) { return status[key] === 'error'; }

  /* Frame numbers step through a whole row of the sheet. */
  function frameFor(animName, frame) {
    var anim = ANIMATIONS[animName] || ANIMATIONS.idle;
    var f = Math.floor(frame);
    if (!isFinite(f) || f < 0) { f = 0; }
    if (anim.loop) { f = f % anim.count; }
    if (f > anim.count - 1) { f = anim.count - 1; }
    return { anim: anim, frame: f };
  }

  function drawPlaceholder(ctx, key, centerX, feetY, cellPx) {
    var c = CHARACTERS[key] || CHARACTERS.piggu;
    var w = cellPx * 0.7;
    var h = cellPx;
    var x = centerX - w / 2;
    var y = feetY - h;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.setLineDash([]);
    ctx.restore();
  }

  /* Draws one animation frame, anchored at the bottom center (the feet).
     cellPx is how tall the square sprite cell should appear on screen. */
  function drawCharacterFrame(ctx, key, animName, frame, centerX, feetY, cellPx, flip) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (!sheetReady(key)) {
      drawPlaceholder(ctx, key, centerX, feetY, cellPx);
      ctx.restore();
      return;
    }

    var img = images[key];
    var pick = frameFor(animName, frame);
    var cw = img.naturalWidth / SHEET_COLS;
    var ch = img.naturalHeight / SHEET_ROWS;

    var sx = (pick.anim.start + pick.frame) * cw;
    var sy = pick.anim.row * ch;

    ctx.translate(centerX, feetY);
    if (flip) { ctx.scale(-1, 1); }
    ctx.drawImage(img, sx, sy, cw, ch, -cellPx / 2, -cellPx, cellPx, cellPx);
    ctx.restore();
  }

  global.BirthdayCharacters = {
    CHARACTERS: CHARACTERS,
    CHARACTER_ORDER: CHARACTER_ORDER,
    ANIMATIONS: ANIMATIONS,
    ANIMATION_ORDER: ANIMATION_ORDER,
    PLAYER_KEY: PLAYER_KEY,
    BOSS_KEYS: BOSS_KEYS,
    sheetReady: sheetReady,
    sheetFailed: sheetFailed,
    drawCharacterFrame: drawCharacterFrame
  };

})(window);
