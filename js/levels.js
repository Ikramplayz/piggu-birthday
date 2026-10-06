/* levels.js
   ---------------------------------------------------------------
   Exactly THREE levels. No more.

     Level 1  Birthday Morning      - small, easy, first steps
     Level 2  Sweet Sunset Park     - small, easy, different scenery
     Level 3  The Birthday Boss Bash - the boss fight, and the ending

   Every level uses the same simple shape:

     { name, pal, width, spawn, solids, decor, signs, items,
       enemies, bosses, finish }

   Coordinates are world pixels. The ground surface is always at
   y = 210, and the screen is 480 x 270, so nothing scrolls up or
   down and the player never loses sight of the ground.

   The levels are deliberately SHORT. Level 1 and 2 are about twice
   as wide as the screen. Level 3 is one single arena.

   Level numbers here match the level, not the stage we built in.

   --------------------------------------------------------------- */

(function (global) {
  'use strict';

  function ground(x, w) { return { x: x, y: 210, w: w, h: 60 }; }
  function plat(x, y, w) { return { x: x, y: y, w: w, h: 10 }; }

  /* Sign posts: y is the top of the post, h is the post height, so the
     foot lands on the ground at y + h = 210. dir is the way it points. */
  function sign(x, dir) { return { x: x, y: 166, h: 44, dir: dir }; }

  var LEVELS = [

    /* ------------------------------------------------------------ 1 --- */
    {
      name: '1. Birthday Morning',
      pal: {
        skyTop: '#a9e4ff', skyMid: '#d8f4ff', skyLow: '#fff2f8',
        hillBack: '#cdeccf', hillFront: '#a9dfae',
        body: '#ffd9e6', top: '#fff7fa', edge: '#f2b9cc', speck: '#ffffff',
        mote: '#ffd0e2', mote2: '#ffe9a8', mote3: '#c9e8ff',
        bunting: ['#ff8fb1', '#ffd166', '#8ed4ff', '#b8f2c9'],
        balloons: ['#ff8fb1', '#ffd166', '#8ed4ff', '#b8f2c9'],
        bush: '#8ed9a0', cloud: 'rgba(255,255,255,0.82)', signFace: '#ffe6c2'
      },
      width: 1200,
      spawn: { x: 50, y: 210 },

      solids: [
        ground(0, 320), ground(365, 230), ground(640, 150), ground(835, 365),
        plat(200, 165, 70), plat(430, 155, 70), plat(560, 120, 70),
        plat(700, 160, 70), plat(1010, 160, 70)
      ],

      decor: [
        { kind: 'balloon', x: 120, y: 210 }, { kind: 'balloon', x: 280, y: 210 },
        { kind: 'balloon', x: 520, y: 210 }, { kind: 'balloon', x: 680, y: 210 },
        { kind: 'balloon', x: 900, y: 210 }, { kind: 'balloon', x: 1120, y: 210 },
        { kind: 'bush', x: 60, y: 210 }, { kind: 'bush', x: 290, y: 210 },
        { kind: 'bush', x: 880, y: 210 }, { kind: 'bush', x: 1160, y: 210 },
        { kind: 'cake', x: 220, y: 210 }, { kind: 'cake', x: 1080, y: 210 }
      ],

      signs: [sign(300, 1), sign(930, 1)],

      items: [
        { x: 235, y: 140, kind: 'present' },
        { x: 300, y: 176, kind: 'star' },
        { x: 465, y: 128, kind: 'lolli' },
        { x: 595, y: 94, kind: 'candy' },
        { x: 735, y: 134, kind: 'cupcake' },
        { x: 900, y: 176, kind: 'star' },
        { x: 1045, y: 134, kind: 'present' }
      ],

      enemies: [
        { kind: 'cupcake', x: 400, y: 194, w: 16, h: 16, min: 375, max: 560, speed: 32, dir: 1 },
        { kind: 'parcel', x: 960, y: 194, w: 16, h: 16, min: 850, max: 1120, speed: 38, dir: -1 }
      ],

      bosses: [],
      finish: { x: 1175, y: 150, h: 60 }
    },

    /* ------------------------------------------------------------ 2 --- */
    {
      name: '2. Sweet Sunset Park',
      pal: {
        skyTop: '#ffd6a5', skyMid: '#ffc0cb', skyLow: '#ffeccf',
        hillBack: '#e3c6f5', hillFront: '#c9a8e8',
        body: '#ffe0b8', top: '#fff8ec', edge: '#e8b98a', speck: '#ffffff',
        mote: '#fff0c0', mote2: '#ffc9e4', mote3: '#d9c2ff',
        bunting: ['#ff9ec7', '#ffd166', '#c9a8e8', '#8ed4ff'],
        balloons: ['#ff9ec7', '#ffd166', '#c9a8e8', '#8ed4ff'],
        bush: '#b6e3b0', cloud: 'rgba(255,255,255,0.72)', signFace: '#ffe6c2'
      },
      width: 1200,
      spawn: { x: 40, y: 210 },

      solids: [
        ground(0, 200), ground(250, 180), ground(480, 160), ground(690, 510),
        plat(140, 170, 70), plat(300, 158, 70), plat(400, 115, 70),
        plat(540, 165, 70), plat(620, 130, 70), plat(760, 160, 70),
        plat(880, 125, 70), plat(1000, 165, 70), plat(1100, 140, 70)
      ],

      decor: [
        { kind: 'balloon', x: 80, y: 210 }, { kind: 'balloon', x: 230, y: 210 },
        { kind: 'balloon', x: 460, y: 210 }, { kind: 'balloon', x: 700, y: 210 },
        { kind: 'balloon', x: 950, y: 210 }, { kind: 'balloon', x: 1150, y: 210 },
        { kind: 'bush', x: 60, y: 210 }, { kind: 'bush', x: 350, y: 210 },
        { kind: 'bush', x: 720, y: 210 }, { kind: 'bush', x: 1080, y: 210 },
        { kind: 'cake', x: 170, y: 210 }, { kind: 'cake', x: 1060, y: 210 }
      ],

      signs: [sign(160, 1), sign(1130, 1)],

      items: [
        { x: 175, y: 145, kind: 'candy' },
        { x: 335, y: 133, kind: 'lolli' },
        { x: 435, y: 90, kind: 'present' },
        { x: 610, y: 176, kind: 'star' },
        { x: 655, y: 105, kind: 'cupcake' },
        { x: 915, y: 100, kind: 'present' },
        { x: 1050, y: 176, kind: 'star' },
        { x: 1135, y: 115, kind: 'candy' }
      ],

      enemies: [
        { kind: 'parcel', x: 290, y: 194, w: 16, h: 16, min: 260, max: 410, speed: 36, dir: 1 },
        { kind: 'cupcake', x: 520, y: 194, w: 16, h: 16, min: 490, max: 620, speed: 30, dir: -1 },
        { kind: 'parcel', x: 800, y: 194, w: 16, h: 16, min: 700, max: 1000, speed: 42, dir: 1 }
      ],

      bosses: [],
      finish: { x: 1170, y: 150, h: 60 }
    },

    /* ------------------------------------------------------------ 3 --- */
    {
      name: '3. The Birthday Boss Bash',
      pal: {
        skyTop: '#9fc0f5', skyMid: '#cdbcf5', skyLow: '#ffe0ef',
        hillBack: '#b7a8e0', hillFront: '#9a8ad0',
        body: '#ffd9e6', top: '#fff7fa', edge: '#f2b9cc', speck: '#fff6c9',
        mote: '#ffe9a8', mote2: '#ffc9e4', mote3: '#c9e8ff',
        bunting: ['#ffd166', '#ff8fb1', '#8ed4ff', '#b8f2c9'],
        balloons: ['#ffd166', '#ff8fb1', '#8ed4ff', '#b8f2c9'],
        bush: '#8ec9a8', cloud: 'rgba(255,255,255,0.6)', signFace: '#ffe6c2'
      },
      width: 560,
      spawn: { x: 60, y: 210 },

      solids: [
        ground(0, 560),
        plat(110, 160, 70), plat(250, 150, 70)
      ],

      decor: [
        { kind: 'balloon', x: 30, y: 210 }, { kind: 'balloon', x: 525, y: 210 },
        { kind: 'bush', x: 20, y: 210 }, { kind: 'bush', x: 540, y: 210 },
        { kind: 'cake', x: 480, y: 210 }
      ],

      signs: [],

      items: [
        { x: 145, y: 135, kind: 'present' },
        { x: 285, y: 125, kind: 'lolli' },
        { x: 520, y: 172, kind: 'candy' }
      ],

      enemies: [],

      /* Pinku is Final Boss 1 and Paddy is Final Boss 2. Piggu fights
         both of them.

         This level does NOT start with a fight. It starts with an
         arrival: Paddy walks in from the right first, and then Pinku
         drops out of the sky to back him up. entry says where each one
         comes in from, how long they wait, how long the move takes and
         which animation to use. Nobody can be hit and no health bar
         shows until the entrance is over.

         hp is deliberately generous (six hits and five hits) so the
         fight lasts long enough to be fun instead of ending in a few
         seconds. */
      bosses: [
        {
          key: 'pinku', name: 'PINKU', x: 345, y: 170, w: 20, h: 40,
          hp: 6, speed: 34, shot: 'heart', atkEvery: 2.0,
          cell: 46, barColor: '#f06ea9',
          entry: { fromX: 345, fromY: -60, delay: 2.1, dur: 2.4,
                   anim: 'fall', voice: 'arrive' }
        },
        {
          key: 'paddy', name: 'PADDY', x: 420, y: 170, w: 20, h: 40,
          hp: 5, speed: 28, shot: 'confetti', atkEvery: 2.4,
          cell: 46, barColor: '#f2a9c4',
          entry: { fromX: 505, fromY: 170, delay: 0.35, dur: 2.1, anim: 'walk' }
        }
      ],

      finish: null
    }
  ];

  global.BirthdayLevels = LEVELS;

})(window);
