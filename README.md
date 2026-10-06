# Piggu's Birthday Adventure

A small 2D birthday platformer made with plain HTML, CSS and JavaScript.
No frameworks, no server, no build step. You play it by opening `index.html`
in a web browser (or on a phone).

## The three characters and their roles

| Character | Who | Role in the game |
| --- | --- | --- |
| **Piggu** | The birthday pig | **MAIN PLAYABLE CHARACTER** |
| **Pinku** | Piggu's girlfriend | **FINAL BOSS 1** (level 3) |
| **Paddy** | You, the boy in the pink-and-white striped shirt | **FINAL BOSS 2** (level 3) |

## The files

| File | What it does |
| --- | --- |
| `index.html` | The game. Open this one to play. |
| `css/style.css` | Layout, mobile sizing, touch buttons, on-screen cards. |
| `js/characters.js` | Loads the three sprite sheets and draws animation frames. |
| `js/art.js` | All the drawing: sky, hills, platforms, balloons, bosses, HUD. |
| `js/levels.js` | The three levels as plain data (platforms, items, enemies, bosses). |
| `js/game.js` | The engine: physics, collision, camera, controls, game flow. |
| `js/audio.js` | All the sound: music, effects, Pinku's voice, the volumes. |
| `assets/audio/` | Where you put the music, the sounds and Pinku's clips. |
| `assets/images/characters/` | The three character sprite sheets. |
| `test.html` | Extra screen: the three characters with every animation. |

## The three levels

**Level 1 - Birthday Morning.** A short, easy run. A few small gaps, four
treats to collect and two slow party poppers. Reach the flag.

**Level 2 - The Sweet Park.** A different look (warm sunset colours). A few
platforms, three treats, one sliding cupcake. Reach the flag.

**Level 3 - The Birthday Boss Bash.** No running - one small arena. Piggu
throws birthday treats at **Pinku** and **Paddy**, who each have their own
attack and their own health bar. Beat both of them and the birthday
celebration plays.

Beat level 1 and level 2 to unlock level 3. Every level takes a minute or two.

## Controls

| Action | Keyboard | Phone |
| --- | --- | --- |
| Move left | `A` or Left arrow | the left button |
| Move right | `D` or Right arrow | the right button |
| Jump | `Space` | the JUMP button |
| Throw (level 3) | `Space` or `J` | the JUMP button |
| Pause | `Escape` | the Pause button |
| Restart level | `R` | the Restart button |

The on-screen buttons work with a mouse too, so you can test them on a
computer. Hold the left and right buttons to keep moving - you can press
both the move and jump buttons at the same time.

## If something looks wrong

* **Blank screen?** Press `F12`, open the **Console** tab, and read the red text.
* **Status line under the buttons** says what the game is doing. If it says
  `Running`, the game loop is alive. If it stays on `Loading...`, a file did
  not load.
* **A square or grey box behind a character** means that sprite sheet still has
  a background. Tell me and I will clean it again.

## How the sprite sheets work

Every sheet is a **6 column x 4 row** grid, one frame per cell, transparent
background:

| Row | Animation | Frames |
| --- | --- | --- |
| 0 | Idle | 6 |
| 1 | Walk | 6 |
| 2 | Jump (first 3), then Fall (last 3) | 3 + 3 |
| 3 | Hurt (first 3), then Victory (last 3) | 3 + 3 |

## Sound and music

All the audio is wired up. The game looks for the files in three folders,
and nothing needs to be turned on:

```
assets/audio/music/          birthday_theme.mp3, boss_theme.mp3, birthday_ending.mp3
assets/audio/sfx/            jump.mp3, land.mp3, collect_item.mp3, ... (see the folder note)
assets/audio/voices/pinku/   pinku_dialogue_01.mp3 ... pinku_dialogue_04.mp3
```

Each folder has a small text file listing the exact filenames to use.
**Any file that is missing is simply silent** - the game never crashes and
never refuses to start because a sound is absent. So you can add them one
at a time and hear each one as it lands.

### Where the sound turns on

Mobile browsers block audio until the player taps something, so sound
starts the moment you tap **START GAME**. Nothing plays before that.

### The Audio panel

The **Audio** button under the game opens a small panel with three sliders -
Music, Sounds and Pinku's voice - plus Mute all and per-category on/off
buttons. The game pauses while the panel is open, so it never covers
anything you are playing, and the music keeps playing so you can hear the
slider working.

### Pinku's voice

Pinku's four lines are shown as text at the bottom of the screen whenever
they happen. If you put the matching clips in `assets/audio/voices/pinku/`,
your real recording plays over the text. Only one line plays at a time and
there is a short gap between lines.

To make the clips from a screen recording, see the text file inside that
folder - it explains turning a video into MP3 and cutting it into four.
Please only use the recordings if you have Pinku's permission.

### If audio misbehaves

* **No sound at all?** Make sure you tapped START GAME, and check the panel
  is not set to Mute all.
* **Music stops when you switch tabs?** That is the browser, not the game -
  tap the game once to wake it up.
* **A sound is too loud or too quiet?** Use the sliders; each category is
  separate. If one effect is still off, tell me and I will adjust its level.
