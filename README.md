# Joku 💙 & Jolie 💗 — Enchanted Forest Adventure

A 2-player co-op love adventure made for playing together on a call —
one of you on each phone (or computer). No installs, no accounts, no backend server:
it's a single static web page with peer-to-peer networking.

![genre](https://img.shields.io/badge/genre-co--op%20love%20platformer-ff69b4)

## The story

The Gloomheart is stealing the forest's love. **Joku** (phoenix of the ocean 💙, with
**Kai** the blue puppy) and **Jolie** (heart of the flowers 💗, with **Momo** the pink panda)
journey through 4 chapters — *Enchanted Forest*, *Crystal Falls*, *Blossom Glade*, and
*Gloomheart Hollow* — fighting shadows side by side, holding hands, hugging, and (when the
Love Meter is full) kissing to unleash a screen-clearing **Love Burst**. 💥💋

## How to play together (during your call)

1. **Deploy the game** (see below) so you both have an HTTPS link, e.g. `https://your-game.netlify.app`
2. **Joku (host):** open the link → tap **💙 Host as Joku** → you get a 4-letter room code
3. Tap **💌 Copy invite link** and send it to Jolie (or just tell her the code)
4. **Jolie (guest):** open the invite link (auto-joins) — or open the game → **💗 Join as Jolie** → enter the code
5. Adventure! 📱 Play in **landscape** on phones. Tap ⛶ on the menu for fullscreen.

> Want to practice alone first? **🐾 Practice Solo** gives you an AI partner.

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move | A/D or ◀ ▶ | left-side joystick |
| Jump / double-jump | W / ▲ / Space | ⬆️ button (or flick joystick up) |
| Attack | J or Z | ⚔️ button |
| Special (35 MP) | K or X | 🌊 / 🌸 button |
| **Heart** | L, C or E | 💗 button |

**The Heart button ❤ (stand close to each other):**
- **Tap** — hold hands: +speed, −30% damage taken, love grows faster
- **Hold** — hug: heals you both (also revives a fallen partner)
- **Full Love Meter + tap** — 💋 KISS → Love Burst: clears enemies, full heal

**Character powers:** Joku's special is a phoenix water-dash (invulnerable, damages
everything in the way). Jolie's special blooms a healing flower field, and holding jump
lets her glide on petals. Hitting the same enemy within a second of each other triggers a
**Combo of Love** for bonus meter.

**Your supporters fight too:** 🐶 Kai dashes in and BITES enemies that get close to you.
🐼 Momo lobs healing hearts at whoever is hurting. They also fetch nearby pickups.

**The devils:** grinning slimes, spiky thorns, ghostly wisps that snipe from above, and
dive-bombing imps — plus the Gloomheart itself, whose shockwaves you must jump and whose
eyes catch fire as it rages. It's a real fight: heal each other, hold hands for protection,
revive with hugs (a revive grants a Love Surge), and finish big moments with a kiss.

## Deploying (pick any — all free)

The game is 100% static files. Any static host works, **HTTPS required** (WebRTC).

- **Netlify Drop** (easiest): go to https://app.netlify.com/drop and drag this whole folder in. Done.
- **GitHub Pages:** push this folder to a repo → Settings → Pages → deploy from branch.
- **Vercel:** `vercel deploy` in this folder, or import the repo at https://vercel.com.
- **Cloudflare Pages:** create a project → direct upload of this folder.

No build step. `serve.ps1` and `.claude/` are dev helpers — they deploy harmlessly or can be deleted.

## Running locally (for testing)

Any static file server works, e.g. from this folder:

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1   # → http://localhost:8340
```

Online play uses the free public PeerJS broker to introduce the two phones to each other
(the gameplay itself is direct peer-to-peer). If a join ever fails, both players refresh
and try a new room code — and Wi-Fi works better than spotty cellular.

## Notes & troubleshooting

- **Connection lost mid-game?** The host keeps the world alive; the guest re-joins with the
  same code from the menu and lands back at the current chapter.
- **No sound on the phone?** Tap the screen once (browsers require a gesture), and check the 🔊 toggle.
- **Portrait mode?** You'll get a rotate hint — landscape is the way.
- Dev/test URL flags (solo only): `?solo&lvl=2` jump to a chapter, `&x=1600` teleport,
  `&skip` skip intro, `&auto` auto-advance dialogue, `&boss` wake the boss instantly.

---

made with 💙💗 for Joku & Jolie
