# Audio files - where everything goes

The game looks for audio at the exact paths below. Any file that is not
there yet is simply skipped: the game plays on in silence instead of
breaking. So you can add these one at a time, in any order.

All files are **mp3**, which every phone browser plays. When you save a
recording, choose MP3. Keep music around 96-128 kbps - small files load
faster on a phone.

## Music

Loops while you play. Keep the volume low and gentle.

| File | When it plays |
| --- | --- |
| `music/birthday_theme.mp3` | Levels 1 and 2 - the chill, cute, exploring track |
| `music/boss_theme.mp3` | Level 3 - the boss fight. Faster and sillier, still cute |
| `music/birthday_ending.mp3` | The Happy Birthday ending |

These should be **30-60 seconds each and loop cleanly** - the end should
join back to the start without a click or a gap.

## Sound effects

Short - most under 1 second. Cute and soft, not harsh.

| File | When it plays |
| --- | --- |
| `sfx/jump.mp3` | Piggu jumps |
| `sfx/land.mp3` | Piggu lands |
| `sfx/collect_item.mp3` | Collecting a cupcake, candy or lollipop |
| `sfx/collect_present.mp3` | Collecting a birthday present - the special one |
| `sfx/star_chime.mp3` | Collecting a star - a gentle chime |
| `sfx/checkpoint.mp3` | Passing a signpost - a short cheerful ping |
| `sfx/hurt.mp3` | Taking damage - soft cartoon bonk, not scary |
| `sfx/victory.mp3` | Finishing level 1 or 2 |
| `sfx/boss_appear.mp3` | The bosses arrive - dramatic but funny |
| `sfx/boss_attack.mp3` | A boss throws an attack |
| `sfx/boss_defeat.mp3` | A boss is beaten - a funny little fanfare |
| `sfx/celebration.mp3` | The birthday ending - cheering and confetti |
| `sfx/ui_click.mp3` | Tapping any button |
| `sfx/ui_pause.mp3` | Pausing and unpausing |
| `sfx/finish_bell.mp3` | Reaching the finish line - a birthday bell |
| `sfx/balloon.mp3` | Passing a balloon - a soft squeak |
| `sfx/cake_sparkle.mp3` | Getting close to a birthday cake - a sparkle |

## Pinku's voice

Put the clips here:

```
assets/audio/voices/pinku/
```

Named exactly:

| File | The line |
| --- | --- |
| `pinku_dialogue_01.mp3` | "Oh! Piggu, you actually came. Happy birthday, little piggy!" |
| `pinku_dialogue_02.mp3` | "Careful! I'm not going easy on you today!" |
| `pinku_dialogue_03.mp3` | "Okay, okay! You win. Paddy, you're on your own!" |
| `pinku_dialogue_04.mp3` | "Happy birthday, Piggu. We love you." |

These are the lines the game expects. Record those four as separate
files, one per line, and they will play at the matching moments: the
boss arrival, the middle of the fight, Pinku being beaten, and the
ending.

If a clip is not there, the game shows the line as **text on screen**
instead and carries on. Nothing breaks.

### If you only have one long screen recording

Put the raw recording in this folder:

```
assets/audio/voices/pinku/raw/
```

and tell me. I will help you cut it into the four clips above. You do
not need to own any editing software - there are free options, and I
can walk you through whichever you prefer.

## Checking what is loaded

The little status line under the Pause button tells you when pictures
are missing. Open the browser console (**F12**) to see the audio list:

```
[audio] not found yet (game still playable): jump.mp3, land.mp3
```

That is the fastest way to see which files the game is still waiting
for.
