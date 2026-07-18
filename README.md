# Joku 💙 & Jolie 💗 — Enchanted Forest Adventure

A 2-player co-op love adventure made for playing together on a call —
one of you on each phone (or computer). No installs, no accounts, no backend server:
it's a single static web page with peer-to-peer networking.

![genre](https://img.shields.io/badge/genre-co--op%20love%20platformer-ff69b4)

## The story

The Gloomheart is stealing the forest's love. **Joku** (phoenix of the ocean 💙, with
**Lulu** the blue puppy) and **Jolie** (heart of the flowers 💗, with **Biscuit** the pink panda)
journey through seven chapters, ending in the Vietnamese folklore-inspired *Bamboo Homeland*.
They fight shadows side by side, hold hands, hug, and (when the
Love Meter is full) kiss to unleash a screen-clearing **Love Burst**. 💥💋

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
| Equipped weapon skill | U, O or B | ✦ button |
| Pick / drop weapon | Q | ⇩ button |
| **Heart** | L, C or E | 💗 button |

**The Heart button ❤ (stand close to each other):**
- **Tap** — hold hands: +speed, −30% damage taken, love grows faster
- **Hold** — hug: heals you both (also revives a fallen partner)
- **Full Love Meter + tap** — 💋 KISS → Love Burst: clears enemies, full heal

**Character powers:** Joku's special is a phoenix water-dash (invulnerable, damages
everything in the way). Jolie's special blooms a healing flower field, and holding jump
lets her glide on petals. Hitting the same enemy within a second of each other triggers a
**Combo of Love** for bonus meter.

**Your supporters fight too:** 🐶 Lulu dashes in and BITES enemies that get close to you.
🐼 Biscuit lobs healing hearts at whoever is hurting. They also fetch nearby pickups.

## Bamboo Homeland

The seventh chapter turns Vietnamese countryside and folklore into gameplay: bamboo groves,
rice fields, water buffalo, a village drum, a woven hammock, and a peaceful harvest terrace.
Joku and Jolie must take separate drum marks, combine water and flower magic, then hold hands,
hug, and kiss to awaken **Thánh Gióng** and bridge an uncrossable burning flood. Two strong
bosses guard the road before the supernatural memory of a thirteenth-century invading army,
the **Mongol Iron Warlord**, attacks with arrow rain, cavalry shockwaves, and a magic shield.

Bosses in this chapter favor four new drops: **Sacred Bamboo Spear**, **Buffalo Horn Shield**,
**Golden Rice Sickle**, and the playful **Dép Tổ Ong Boomerang**. Bàu Đá and banana-seed rice
wine appear only as a cultural still life in the rest area, not as a combat power-up.

The chapter's large PNGs are loaded only when that chapter is selected or prefetched. Each new
sprite atlas is also physically downscaled and optimized so it stays sharp without making the
first mobile load heavier.

**The devils:** grinning slimes, spiky thorns, ghostly wisps that snipe from above, and
dive-bombing imps — plus the Gloomheart itself, whose shockwaves you must jump and whose
eyes catch fire as it rages. It's a real fight: heal each other, hold hands for protection,
revive with hugs (a revive grants a Love Surge), and finish big moments with a kiss.

## Deploying (pick any — all free)

The game is 100% static files. Any static host works, **HTTPS required** (WebRTC).

- **Netlify Drop** (easiest): go to https://app.netlify.com/drop and drag this whole folder in. Done.
- **GitHub Pages:** push this folder to a repo, then Settings -> Pages -> Source: **GitHub Actions**. The included workflow publishes only the game files from `dist/`.
- **Vercel:** `vercel deploy` in this folder, or import the repo at https://vercel.com.
- **Cloudflare Pages:** create a project → direct upload of this folder.

No app build step. `serve.ps1` and `.claude/` are dev helpers; the GitHub Pages workflow does not publish them.

## Running locally (for testing)

Any static file server works, e.g. from this folder:

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1   # → http://localhost:8340
```

Online play uses PeerJS Cloud for the introduction, then WebRTC sends the encrypted game
traffic directly between the two browsers. When a carrier, router, or firewall blocks a
direct route, the game automatically retries through TURN relay mode. It also keeps the
same network identity on localhost and GitHub Pages, so a local host and a published guest
can find the same room.

The included public TURN relay is a best-effort fallback and has no uptime guarantee. For
dependable overseas play, set the `joku-turn-endpoint` meta tag in `index.html` to a trusted
HTTPS endpoint that returns either an `iceServers` array or `{ "iceServers": [...] }`. Use
short-lived TURN credentials from a provider such as Cloudflare Realtime TURN or Metered,
and keep the provider's permanent secret in the credential endpoint rather than in this
public GitHub Pages repository. The endpoint must allow cross-origin requests from the
published game URL.

The `joku-public-url` meta tag controls which published HTTPS link is copied when you host
from a local test server. Update it if the GitHub Pages address changes.

## Notes & troubleshooting

- **Connection lost mid-game?** The host keeps the world alive; the guest re-joins with the
  same code automatically and lands back at the current chapter.
- **No sound on the phone?** Tap the screen once (browsers require a gesture), and check the 🔊 toggle.
- **Portrait mode?** You'll get a rotate hint — landscape is the way.
- Dev/test URL flags (solo only): `?solo&lvl=2` jump to a chapter, `&x=1600` teleport,
  `&skip` skip intro, `&auto` auto-advance dialogue, `&boss` wake the boss instantly.
- Network diagnostic flag: add `&relay=1` to an invite URL to test the TURN-only path.

---

made with 💙💗 for Joku & Jolie
