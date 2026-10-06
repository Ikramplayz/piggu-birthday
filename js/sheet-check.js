/* sheet-check.js
   ---------------------------------------------------------------
   A small diagnostic panel for the test screen.

   It answers one question: did the three sprite sheets really load,
   and does each one look like a clean 6 column x 4 row grid?

   The game works out the frame size from the image itself, so a sheet
   only lines up if width / 6 and height / 4 come out about the same.
   If they do not, every frame is slightly wrong and the characters
   will look chopped. This panel prints the real numbers so that
   problem is visible instead of silent.

   Loaded after characters.js and test-screen.js. It does not change
   anything in the game, it only reads and reports.
   --------------------------------------------------------------- */

(function (global) {
  'use strict';

  var COLS = 6;
  var ROWS = 4;

  var BC = global.BirthdayCharacters;
  if (!BC) { return; }

  var listEl = null;
  var result = {};

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) { n.className = className; }
    if (text != null) { n.textContent = text; }
    return n;
  }

  /* Read each sheet a second time, just to measure it. */
  BC.CHARACTER_ORDER.forEach(function (key) {
    result[key] = { state: 'loading' };

    var img = new Image();
    img.onload = function () {
      result[key] = { state: 'ready', w: img.naturalWidth, h: img.naturalHeight };
      render();
    };
    img.onerror = function () {
      result[key] = { state: 'error' };
      render();
    };
    img.src = BC.CHARACTERS[key].sheet;
  });

  function row(key) {
    var c = BC.CHARACTERS[key];
    var r = result[key] || { state: 'loading' };
    var line = el('div', 'check-row');

    line.appendChild(el('span', 'check-name', c.name));

    if (r.state === 'loading') {
      line.appendChild(el('span', 'check-note', 'loading ' + c.sheet + ' ...'));
      return line;
    }

    if (r.state === 'error') {
      line.appendChild(el('span', 'check-bad', 'NOT FOUND - expected ' + c.sheet));
      return line;
    }

    var cw = r.w / COLS;
    var ch = r.h / ROWS;
    var square = Math.abs(cw - ch) <= 1;

    line.appendChild(el('span', 'check-note',
      'sheet ' + r.w + ' x ' + r.h + ' px  ->  cell ' +
      Math.round(cw) + ' x ' + Math.round(ch) + ' px'));

    line.appendChild(el('span', square ? 'check-ok' : 'check-bad',
      square
        ? 'grid looks right'
        : 'cell is not square - the 6 x 4 grid may not match this sheet'));

    return line;
  }

  function render() {
    if (!listEl) { return; }
    listEl.textContent = '';
    BC.CHARACTER_ORDER.forEach(function (key) {
      listEl.appendChild(row(key));
    });
  }

  function build() {
    var page = document.getElementById('page');
    if (!page) { return; }

    var section = el('section', 'panel');
    section.appendChild(el('h2', null, 'Sheet check'));
    section.appendChild(el('p', 'hint',
      'Each character needs a 6 columns by 4 rows sheet with a transparent ' +
      'background. This reads the real files and reports what it found.'));

    listEl = el('div', 'sheetcheck');
    section.appendChild(listEl);
    page.appendChild(section);

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }

})(window);
