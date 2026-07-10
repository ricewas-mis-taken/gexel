import { useEffect, useRef, useState } from "react";
import AppShell from "./AppShell";
import { useCoins } from "./CoinContext";
import BossEnding from "./transitions/BossEnding";
import punchSfx from "../assets/sf2/punch.mp3";
import kickSfx from "../assets/sf2/kick.mp3";
import blockSfx from "../assets/sf2/block.wav";
import bgImg from "../assets/sf2/bg.gif";
import bgMusicSrc from "../assets/sf2/bgmusic.mp3";
import bgMusicCriticalSrc from "../assets/sf2/bgmusiccritical.mp3";
import gunChargeSfx from "../assets/sf2/guncharge.mp3";
import firebreathSfx from "../assets/sf2/firebreath.mp3";
import deathMusicSrc from "../assets/galaga/deathmusic.mp3";
import { fadeOutAudio, cancelFade } from "./audioFade";
import { ensureAudioPlays } from "./audioUnlock";
import { createLoopPlayer, unlockWebAudio } from "./webAudioLoop";

const sndPools = new Map();
const SND_POOL_SIZE=6;

function playSnd(src, vol = 0.5) {
  let pool = sndPools.get(src);
  if (!pool) {
      pool = [];
      sndPools.set(src, pool);
  }
  let a = pool.find((el) => el.paused);
  if (!a) {
    if (pool.length < SND_POOL_SIZE) {
      a = new Audio(src);
      pool.push(a);
    } else {
      a = pool[0];
    }
  }
  a.currentTime = 0;
  a.volume = vol;
  a.play().catch(() => {});
}

const files = import.meta.glob("../assets/sf2/*.png", { eager: true, import: "default" });
const SPRITES = {};
for (const path in files) {
  const name = path.split("/").pop().replace(".png", "").toLowerCase();
  SPRITES[name] = files[path];
}

function spr(name)
{
  return SPRITES[name.toLowerCase()] || null;
}

function frameList(prefix) {
  const re = new RegExp(`^${prefix}(\\d+)$`);
  return Object.keys(SPRITES)
    .map((name) => {
      const m = name.match(re);
      return m ? { name, n: parseInt(m[1], 10) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.n - b.n)
    .map((x) => x.name);
}

const ANIM = {
  walk: ["walk1", "walk2", "walk3", "walk4", "walk5"],
  bwalk: ["walk1", "walk2", "walk3", "walk4", "walk5"],
  punch: ["punch1", "punch2"],
  kick: ["kick1", "kick2", "kick3", "kick4", "kick5"],
  block: ["block"],
  abhit: ["abhit1", "abhit2", "abhit3"],
  headhit: ["headhit1", "headhit2", "headhit3"],
  idle: ["walk1"],
  gun: ["gun1", "gun2"],
  fire: frameList("fire"),
};
const ENEMY_ANIM = {
  walk: ["ryuwalk1", "ryuwalk2", "ryuwalk3", "ryuwalk4", "ryuwalk5"],
  bwalk: ["ryuwalk1", "ryuwalk2", "ryuwalk3", "ryuwalk4", "ryuwalk5"],
  punch: ["ryupunch1", "ryupunch2"],
  kick: ["ryukick1", "ryukick2", "ryukick3", "ryukick4", "ryukick5"],
  block: ["ryublock"],
  abhit: ["ryuabhit1", "ryuabhit2", "ryuabhit3"],
  headhit: ["ryuheadhit1", "ryuheadhit2", "ryuheadhit3"],
  idle: ["ryuwalk1"],
  kill: frameList("kill"),
  die: frameList("die"),
};

const FIGHT_W = 900, FLOOR_Y = 478;
const PLAYER_START_X = 140, ENEMY_START_X = 660;
const CHAR_W = 168, CHAR_H = 308;
const FIRE_W = Math.round(280 * 1.4), FIRE_H = Math.round(190 * 1.4);
const FIRE_LEFT_OFFSET = -52;
const FIRE_TOP_OFFSET = -8;
// the icon strip holds 4 equal-width slots, and each fire frame only lights
// up ONE new slot (fire1: none colored, fire2: slot0 colored, fire3:
// slot0-1, ... fire5: all 4) — the still-black slots don't need wiping
// (they're already black in the art) and already-revealed slots shouldn't
// be re-covered either, so the wipe is scoped to just the single slot each
// frame newly reveals.
const FIRE_ICON_STRIP_LEFT_PCT = 151 / 280;
const FIRE_ICON_SLOT_WIDTH_PCT = ((276 - 151) / 4) / 280;
const FIRE_ICON_TOP_PCT = 33 / 190;
const FIRE_ICON_HEIGHT_PCT = (60 - 33) / 190;
const KILL_RAW_W = 1749, KILL_RAW_H = 899;
const KILL_H = 420;
const KILL_W = Math.round(KILL_H * (KILL_RAW_W / KILL_RAW_H));
const KILL_LEFT = (FIGHT_W - KILL_W) / 2;
// kill1.png has a lot of empty space below both characters' feet (feet bottom
// out around y=830 of the 899px-tall source), so bottom-aligning the image's
// own edge to FLOOR_Y left everyone floating well above the ground. Align by
// the actual foot position instead.
const KILL_FOOT_Y_FRAC = 830 / KILL_RAW_H;
const KILL_TOP = FLOOR_Y - KILL_FOOT_Y_FRAC * KILL_H;
const KILL_BEAM_SPLIT_PCT = (895 / KILL_RAW_W) * 100;
const PLAYER_CUTSCENE_X = 125;
const ENEMY_CUTSCENE_X = FIGHT_W - CHAR_W - 30;
const HIT_RANGE = 45;
const MIN_GAP = 15;
const MOVE_SPEED = 5;
const ENEMY_MOVE_SPEED = MOVE_SPEED * 9;
const AGGRESSIVE_SPEED_MULT = 1.6;
const RECENTLY_HIT_AGGRO_MS = 1500;
const PLAYER_ANIM_SLOWDOWN = 5;
const ENEMY_ANIM_SLOWDOWN = 4;

const WALK_CENTER_EASE = 0.12;
const WALK_CENTER_JITTER_MIN = 0.6;
const WALK_CENTER_JITTER_MAX = 1.5;
const WALK_CENTER_TICK_MS = 30;
const WALK_CENTER_DURATION_MS = 1000;
const WALK_CENTER_ANIM_SLOWDOWN = 2;

const PUNCH_DMG=8;
const KICK_DMG=14;
const BLOCK_CHIP_DMG = 0.5;

const PLAYER_BASE_HP = 100;
const HEALTH_COIN_BONUS_SCALE = 40;
const HEALTH_COIN_LOG_DIVISOR = 50;
function healthBonusFromCoins(coinCount) {
  return HEALTH_COIN_BONUS_SCALE * Math.log10(1 + Math.max(0, coinCount) / HEALTH_COIN_LOG_DIVISOR);
}

const COMBO_GAP_MS = 380;
const MAX_COMBO_HITS = 3;
const ENEMY_STUN_MS = 700;

const BLOCK_STREAK_LIMIT = 5;
const BLOCK_BREAK_STUN_MS = 900;

const ENEMY_LEARN_BLOCK_HITS = 10;

const ENEMY_HP_MULT = 5;
const ENEMY_MAX_HP = 100 * ENEMY_HP_MULT;

const RAM_MAX = 50;

const KO_PLAYER_SHARE = 20;
const KO_RAM_BASE_SHARE = 2;
const KO_RAM_MAX_BONUS_SHARE = 8;
const KO_BAR_WIDTH = 420;

const SHOVE_RANGE = HIT_RANGE + 40;
const SHOVE_DISTANCE = 35;
const SHOVE_COOLDOWN_MS = 500;

const PLAYER_HIT_KNOCKBACK = 10;

const LOW_HP_FLASH_FRACTION = 1 / 3;

const FEET_FADE_MASK = "linear-gradient(to bottom, #000 72%, transparent 94%)";
const KILL_FEET_FADE_MASK = "linear-gradient(to bottom, #000 78%, transparent 93%)";

const AI_TICK_MS = 80;
const ENEMY_ANIM_MS = 110;
function enemyBlockChance(attackType) {
  return attackType === "kick" ? 0.2 : 0.85;
}

const TAUNT_LINE = "Haha, you are weak.";

const MONOLOGUE = "It…it…it.. Can't be! How did you get the RAM stick? And working!!!! By what means did you defeat Kyran's race time? How did you open the Thousand-Year apple? What sorcery did you proclaim to bewitch the King Frog to hand over his only Lily Flower? And the…the…the…BUTTERFLIES!!!!";

export default function BossFight({ onWin, onLose }) {
  const { coins } = useCoins();
  const keys = useRef({});

  const ramBonus = Math.min(coins || 0, RAM_MAX);
  const [playerMaxHP] = useState(() => PLAYER_BASE_HP + healthBonusFromCoins(coins || 0));
  const [playerHP, setPlayerHP] = useState(playerMaxHP);
  const [ramHP, setRamHP] = useState(ramBonus);
  const [enemyHP, setEnemyHP] = useState(ENEMY_MAX_HP);

  const [playerX, setPlayerX] = useState(PLAYER_START_X);
  const [enemyX, setEnemyX] = useState(ENEMY_START_X);
  const [playerAction, setPlayerAction] = useState({ type: "idle", frame: 0, lock: false });
  const [enemyAction, setEnemyAction] = useState({ type: "idle", frame: 0, lock: false });
  const [enemyBlocking, setEnemyBlocking] = useState(false);
  const [playerBlocking, setPlayerBlocking] = useState(false);

  const [phase, setPhase] = useState("fight");
  const [dialogue, setDialogue] = useState(null);
  const bossHealedOnce = useRef(false);
  const frozenTriggered = useRef(false);
  const deathFrame = useRef(0);

  const [fireWipeRevealed, setFireWipeRevealed] = useState(false);
  const [fireFrameMs, setFireFrameMs] = useState(320);

  const playerActionRef = useRef(playerAction);
  useEffect(() => { playerActionRef.current = playerAction; }, [playerAction]);
  const playerBlockingRef = useRef(playerBlocking);
  useEffect(() => { playerBlockingRef.current = playerBlocking; }, [playerBlocking]);
  const enemyBlockingRef = useRef(enemyBlocking);
  useEffect(() => { enemyBlockingRef.current = enemyBlocking; }, [enemyBlocking]);
  const enemyHPRef = useRef(enemyHP);
  useEffect(() => { enemyHPRef.current = enemyHP; }, [enemyHP]);
  const enemyWhiffs = useRef(0);
  const blockingThisSwing = useRef(false);
  const enemyLandedHits = useRef(0);
  const enemyLearnedBlock = useRef(false);
  const recentlyHitRef = useRef(false);
  const recentlyHitTimer = useRef(null);

  const enemyDmgMult = useRef(1);
  const enemySpeedMult = useRef(1);
  const ENEMY_DMG_RAMP = 1.15;
  const ENEMY_SPEED_RAMP = 1.1;

  const registerPlayerSwing = (type) => {
    blockingThisSwing.current = enemyLearnedBlock.current || Math.random() < enemyBlockChance(type);
  };
  const walkTick = useRef(0);
  const enemyWalkTick = useRef(0);
  const enemyXRef = useRef(enemyX);
  useEffect(() => { enemyXRef.current = enemyX; }, [enemyX]);
  const playerXRef = useRef(playerX);
  useEffect(() => { playerXRef.current = playerX; }, [playerX]);
  const enemyActionRef = useRef(enemyAction);
  useEffect(() => { enemyActionRef.current = enemyAction; }, [enemyAction]);
  const lastShoveTime = useRef(0);

  const [playerStunned, setPlayerStunned] = useState(false);
  const playerStunnedRef = useRef(false);
  useEffect(() => { playerStunnedRef.current = playerStunned; }, [playerStunned]);
  const [enemyStunned, setEnemyStunned] = useState(false);
  const enemyStunnedRef = useRef(false);
  useEffect(() => { enemyStunnedRef.current = enemyStunned; }, [enemyStunned]);
  const comboActive = useRef(false);
  const comboHits = useRef(0);
  const comboTimer = useRef(null);
  const enemyStunTimer = useRef(null);

  const breakCombo = () => {
    comboActive.current = false;
    comboHits.current = 0;
    if (comboTimer.current) { clearTimeout(comboTimer.current); comboTimer.current = null; }
    setPlayerStunned(false);
  };

  const [playerBlockBroken, setPlayerBlockBroken] = useState(false);
  const playerBlockBrokenRef = useRef(false);
  useEffect(() => { playerBlockBrokenRef.current = playerBlockBroken; }, [playerBlockBroken]);
  const playerBlockStreak = useRef(0);
  const blockBreakTimer = useRef(null);

  const resetBlockStreak = () => {
      playerBlockStreak.current = 0;
      if (blockBreakTimer.current) { clearTimeout(blockBreakTimer.current); blockBreakTimer.current = null; }
      setPlayerBlockBroken(false);
  };

  useEffect(() => () => {
    if (comboTimer.current) clearTimeout(comboTimer.current);
    if (enemyStunTimer.current) clearTimeout(enemyStunTimer.current);
    if (blockBreakTimer.current) clearTimeout(blockBreakTimer.current);
    if (recentlyHitTimer.current) clearTimeout(recentlyHitTimer.current);
  }, []);

  useEffect(() => {
    if (phase !== "fight") {
      breakCombo();
      setEnemyStunned(false);
      if (enemyStunTimer.current) { clearTimeout(enemyStunTimer.current); enemyStunTimer.current = null; }
      resetBlockStreak();
      setPlayerBlocking(false);
    }
  }, [phase]);

  useEffect(() => {
    const GAME_KEYS = ["a", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];
    const down = (e) => {
      const key = e.key.toLowerCase();
      keys.current[key] = true;
      if (GAME_KEYS.includes(key)) e.preventDefault();
    };
    const up = (e) => { keys.current[e.key.toLowerCase()] = false; };
    const clearAll = () => { keys.current = {}; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clearAll);
    document.addEventListener("visibilitychange", clearAll);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clearAll);
      document.removeEventListener("visibilitychange", clearAll);
    };
  }, []);

  useEffect(() => {
    if (phase !== "fight") return;
    if (dialogue) return;
    const loop = setInterval(() => {
      setPlayerBlocking(!playerBlockBrokenRef.current && !!keys.current["arrowdown"]);

      if (playerStunnedRef.current || playerBlockBrokenRef.current) return;

      let dx = 0;
      if (keys.current["a"]) dx -= MOVE_SPEED;
      if (keys.current["d"]) dx += MOVE_SPEED;

      if (dx !== 0 && !enemyStunnedRef.current) {
        const ea = enemyActionRef.current;
        if (ea.lock && (ea.type === "punch" || ea.type === "kick")) {
          const now = Date.now();
          if (now - lastShoveTime.current > SHOVE_COOLDOWN_MS) {
            const dist = Math.abs(enemyXRef.current - (playerXRef.current + CHAR_W));
            if (dist <= SHOVE_RANGE) {
              lastShoveTime.current = now;
              playSnd(blockSfx, 0.6);
              setEnemyX(x => Math.min(FIGHT_W - CHAR_W - 20, x + SHOVE_DISTANCE));
              setEnemyAction({ type: "idle", frame: 0, lock: false });
            }
          }
        }
      }

      if (dx !== 0 && !playerAction.lock) {
        const maxX = Math.min(FIGHT_W - CHAR_W - 20, enemyXRef.current - CHAR_W - MIN_GAP);
        setPlayerX(x => Math.max(20, Math.min(maxX, x + dx)));
        walkTick.current++;
        const advance = walkTick.current % PLAYER_ANIM_SLOWDOWN === 0;
        setPlayerAction(a => (a.lock ? a : { type: dx > 0 ? "walk" : "bwalk", frame: advance ? (a.frame + 1) % 5 : a.frame, lock: false }));
      } else if (!playerAction.lock) {
        walkTick.current = 0;
        setPlayerAction(a => ({ ...a, type: "idle", frame: 0 }));
      }

      if (keys.current["arrowright"] && !playerAction.lock) {
        registerPlayerSwing("punch");
        setPlayerAction({ type: "punch", frame: 0, lock: true });
      } else if (keys.current["arrowup"] && !playerAction.lock) {
        registerPlayerSwing("kick");
        setPlayerAction({ type: "kick", frame: 0, lock: true });
      }
    }, 30);
    return () => clearInterval(loop);
  }, [phase, playerAction.lock, dialogue]);

  useEffect(() => {
    if (!playerAction.lock) return;
    if (playerAction.type === "gun" || playerAction.type === "fire") return;
    const list = ANIM[playerAction.type] || ANIM.idle;
    const timer = setTimeout(() => {
      const next = playerAction.frame + 1;
      if (next >= list.length) {
        if ((playerAction.type === "punch" || playerAction.type === "kick") && Math.abs((playerXRef.current + CHAR_W) - enemyXRef.current) < HIT_RANGE) {
          const dmg = playerAction.type === "punch" ? PUNCH_DMG : KICK_DMG;
          if (enemyBlockingRef.current) {
            playSnd(blockSfx);
          } else {
            playSnd(playerAction.type === "punch" ? punchSfx : kickSfx);
            enemyLandedHits.current += 1;
            if (enemyLandedHits.current >= ENEMY_LEARN_BLOCK_HITS) {
              enemyLearnedBlock.current = true;
            }
          }
          setEnemyHP(hp => Math.max(1, hp - (enemyBlockingRef.current ? BLOCK_CHIP_DMG : dmg)));
          setEnemyX(x => Math.min(FIGHT_W - CHAR_W - 20, x + PLAYER_HIT_KNOCKBACK));
        }
        setPlayerAction({ type: "idle", frame: 0, lock: false });
      } else {
        setPlayerAction(a => ({ ...a, frame: next }));
      }
    }, 110);
    return () => clearTimeout(timer);
  }, [playerAction]);

  useEffect(() => {
    if (!enemyAction.lock) return;
    if (enemyAction.type === "kill" || enemyAction.type === "die") return;
    const list = ENEMY_ANIM[enemyAction.type] || ENEMY_ANIM.idle;
    const timer = setTimeout(() => {
      const next = enemyAction.frame + 1;
      if (next >= list.length) {
        if ((enemyAction.type === "punch" || enemyAction.type === "kick") && Math.abs((enemyXRef.current) - (playerXRef.current + CHAR_W)) < HIT_RANGE) {
          const dmg = (enemyAction.type === "punch" ? PUNCH_DMG : KICK_DMG) * enemyDmgMult.current;
          if (playerBlockingRef.current) {
            playSnd(blockSfx);
            setRamHP(r => {
              if (r > 0) return Math.max(0, r - BLOCK_CHIP_DMG);
              setPlayerHP(hp => Math.max(0, hp - BLOCK_CHIP_DMG));
              return 0;
            });
            playerBlockStreak.current += 1;
            if (playerBlockStreak.current > BLOCK_STREAK_LIMIT) {
              playerBlockStreak.current = 0;
              setPlayerBlockBroken(true);
              if (blockBreakTimer.current) clearTimeout(blockBreakTimer.current);
              blockBreakTimer.current = setTimeout(() => { blockBreakTimer.current = null; setPlayerBlockBroken(false); }, BLOCK_BREAK_STUN_MS);
            }
            if (comboActive.current) {
              breakCombo();
              setEnemyStunned(true);
              if (enemyStunTimer.current) clearTimeout(enemyStunTimer.current);
              enemyStunTimer.current = setTimeout(() => setEnemyStunned(false), ENEMY_STUN_MS);
            }
          } else {
            playSnd(enemyAction.type === "punch" ? punchSfx : kickSfx);
            resetBlockStreak();
            const floor = bossHealedOnce.current ? 1 : 0;
            setRamHP(r => {
              if (r > 0) return Math.max(0, r - dmg);
              setPlayerHP(hp => Math.max(floor, hp - dmg));
              return 0;
            });
            if (!comboActive.current) {
              comboActive.current = true;
              comboHits.current = 1;
              setPlayerStunned(true);
            } else {
              comboHits.current += 1;
            }
            if (comboHits.current < MAX_COMBO_HITS) {
              comboTimer.current = setTimeout(() => {
                if (!comboActive.current || enemyStunnedRef.current) return;
                setEnemyAction({ type: Math.random() < 0.5 ? "kick" : "punch", frame: 0, lock: true });
              }, COMBO_GAP_MS);
            } else {
              breakCombo();
            }
          }
        }
        setEnemyAction({ type: "idle", frame: 0, lock: false });
      } else {
        setEnemyAction(a => ({ ...a, frame: next }));
      }
    }, ENEMY_ANIM_MS);
    return () => clearTimeout(timer);
  }, [enemyAction]);

  useEffect(() => {
    if (phase !== "fight") return;
    if (dialogue) return;
    const ai = setInterval(() => {
      const ea = enemyActionRef.current;
      if (ea.lock) return;
      if (comboActive.current || enemyStunnedRef.current) return;
      const eX = enemyXRef.current;
      const pX = playerXRef.current;
      const dist = Math.abs(eX - (pX + CHAR_W));
      const pAction = playerActionRef.current;
      const playerSwinging = pAction.lock && (pAction.type === "punch" || pAction.type === "kick");

      if (playerSwinging && blockingThisSwing.current && dist <= HIT_RANGE) {
        setEnemyBlocking(true);
        return;
      }
      setEnemyBlocking(false);

      if (dist > HIT_RANGE) {
        const aggressive = enemyWhiffs.current >= 1 || recentlyHitRef.current;
        const moveAmt = (aggressive ? ENEMY_MOVE_SPEED * AGGRESSIVE_SPEED_MULT : ENEMY_MOVE_SPEED) * enemySpeedMult.current;
        const minX = pX + CHAR_W + MIN_GAP;
        setEnemyX(x => Math.max(minX, x - moveAmt));
        enemyWalkTick.current++;
        const advance = enemyWalkTick.current % ENEMY_ANIM_SLOWDOWN === 0;
        setEnemyAction(a => ({ type: "bwalk", frame: advance ? (a.frame + 1) % 5 : a.frame, lock: false }));
        return;
      }

      setEnemyAction({ type: Math.random() < 0.4 ? "kick" : "punch", frame: 0, lock: true });
    }, AI_TICK_MS);
    return () => clearInterval(ai);
  }, [phase, dialogue]);

  const prevEnemyActionType = useRef("idle");
  useEffect(() => {
    const wasSwinging = prevEnemyActionType.current === "punch" || prevEnemyActionType.current === "kick";
    if (wasSwinging && enemyAction.type === "idle") {
      const dist = Math.abs(enemyX - (playerX + CHAR_W));
      if (playerBlockingRef.current || dist > HIT_RANGE) {
        enemyWhiffs.current = Math.min(5, enemyWhiffs.current + 1);
      } else {
        enemyWhiffs.current = 0;
      }
    }
    prevEnemyActionType.current = enemyAction.type;
  }, [enemyAction.type]);

  const prevEnemyHP = useRef(enemyHP);
  const prevPlayerHP = useRef(playerHP);
  useEffect(() => {
    if (phase === "fight" && enemyHP < prevEnemyHP.current) {
      if (comboActive.current) breakCombo();
      setEnemyAction({ type: playerAction.type === "kick" ? "headhit" : "abhit", frame: 0, lock: true });
      recentlyHitRef.current = true;
      if (recentlyHitTimer.current) clearTimeout(recentlyHitTimer.current);
      recentlyHitTimer.current = setTimeout(() => { recentlyHitRef.current = false; }, RECENTLY_HIT_AGGRO_MS);
    }
    prevEnemyHP.current = enemyHP;
  }, [enemyHP, phase]);
  useEffect(() => {
    if (phase === "fight" && playerHP < prevPlayerHP.current) {
      setPlayerAction({ type: enemyAction.type === "kick" ? "headhit" : "abhit", frame: 0, lock: true });
    }
    prevPlayerHP.current = playerHP;
  }, [playerHP, phase]);

  const bgTracksRef = useRef(null);
  const bgMusicKind = useRef(null);
  const bgMusicUnlocks = useRef({ normal: () => {}, critical: () => {} });

  const getBgTracks = () => {
    if (!bgTracksRef.current) {
      const normal = new Audio(bgMusicSrc);
      normal.loop = true;
      normal.volume = 0;
      const critical = new Audio(bgMusicCriticalSrc);
      critical.loop = true;
      critical.volume = 0;
      bgTracksRef.current = { normal, critical };
    }
    return bgTracksRef.current;
  };

  const stopBgMusic = (duration) => {
    const kind = bgMusicKind.current;
    if (!kind) return;
    bgMusicUnlocks.current[kind]();
    fadeOutAudio(bgTracksRef.current[kind], duration);
    bgMusicKind.current = null;
  };

  const startBgMusic = (kind) => {
    const tracks = getBgTracks();
    const other = kind === "critical" ? "normal" : "critical";
    bgMusicUnlocks.current[other]();
    fadeOutAudio(tracks[other], 250);
    const audio = tracks[kind];
    cancelFade(audio);
    audio.volume = 0.35;
    bgMusicKind.current = kind;
    bgMusicUnlocks.current[kind] = ensureAudioPlays(audio, () => bgMusicKind.current === kind);
  };

  useEffect(() => {
    startBgMusic("normal");
    const stopUnlock = unlockWebAudio();
    return () => { stopBgMusic(300); stopUnlock(); };
  }, []);

  useEffect(() => {
    if (phase === "wizard") { stopBgMusic(300); return; }
    if (phase !== "fight") return;
    const wantKind = playerHP < playerMaxHP * LOW_HP_FLASH_FRACTION ? "critical" : "normal";
    if (bgMusicKind.current !== wantKind) startBgMusic(wantKind);
  }, [phase, playerHP]);

  useEffect(() => {
    if (phase === "fight" && !dialogue && enemyHP <= 1) {
      bossHealedOnce.current = true;
      enemyDmgMult.current *= ENEMY_DMG_RAMP;
      enemySpeedMult.current *= ENEMY_SPEED_RAMP;
      setDialogue({ text: TAUNT_LINE, after: () => setEnemyHP(ENEMY_MAX_HP) });
    }
  }, [enemyHP, phase, dialogue]);

  useEffect(() => {
    if (phase === "fight" && bossHealedOnce.current && !frozenTriggered.current && playerHP <= 1 && ramHP <= 0) {
      frozenTriggered.current = true;
      setPhase("gunIntro");
    }
  }, [playerHP, ramHP, phase]);

  useEffect(() => {
    if (phase === "fight" && playerHP <= 0 && ramHP <= 0 && !bossHealedOnce.current) {
      onLose && onLose();
    }
  }, [playerHP, ramHP, phase]);

  useEffect(() => {
    if (phase !== "gunIntro") return;
    let i = 0;
    setPlayerAction({ type: "gun", frame: 0, lock: true });
    const id = setInterval(() => {
      i++;
      if (i >= ANIM.gun.length) {
        clearInterval(id);
        setPhase("walkCenter");
      } else {
        setPlayerAction({ type: "gun", frame: i, lock: true });
      }
    }, 200);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "walkCenter") return;
    const playerTarget = PLAYER_CUTSCENE_X;
    const enemyTarget = ENEMY_CUTSCENE_X;
    const stepToward = (x, target) => {
      const remaining = target - x;
      if (Math.abs(remaining) < 0.5) return target;
      const jitter = WALK_CENTER_JITTER_MIN + Math.random() * (WALK_CENTER_JITTER_MAX - WALK_CENTER_JITTER_MIN);
      return x + remaining * WALK_CENTER_EASE * jitter;
    };
    let tick = 0;
    const id = setInterval(() => {
      tick++;
      const advance = tick % WALK_CENTER_ANIM_SLOWDOWN === 0;
      setPlayerX(x => stepToward(x, playerTarget));
      setEnemyX(x => stepToward(x, enemyTarget));
      setPlayerAction(a => ({ type: "walk", frame: advance ? (a.frame + 1) % 5 : a.frame, lock: false }));
      setEnemyAction(a => ({ type: "walk", frame: advance ? (a.frame + 1) % 5 : a.frame, lock: false }));
    }, WALK_CENTER_TICK_MS);
    const done = setTimeout(() => {
      clearInterval(id);
      setPlayerX(playerTarget);
      setEnemyX(enemyTarget);
      if (ANIM.fire.length > 0) {
        setPlayerAction({ type: "fire", frame: ANIM.fire.length - 1, lock: true });
      }
      setPhase("monologue");
    }, WALK_CENTER_DURATION_MS);
    return () => { clearInterval(id); clearTimeout(done); };
  }, [phase]);

  useEffect(() => {
    if (phase !== "monologue") return;
    setDialogue({ text: MONOLOGUE, after: () => setPhase("fireCharge") });
  }, [phase]);

  useEffect(() => {
    if (phase !== "fireCharge") return;
    if (ANIM.fire.length === 0) { setPhase("firebreath"); return; }
    const frames = ANIM.fire;
    let cancelled = false;
    let frameTimer = null;
    let started = false;
    setPlayerAction({ type: "fire", frame: 0, lock: true });

    const audio = new Audio(gunChargeSfx);
    audio.volume = 0.7;

    const goToFirebreath = () => {
      if (cancelled) return;
      cancelled = true;
      if (frameTimer) clearTimeout(frameTimer);
      setPhase("firebreath");
    };

    const runSequence = (totalMs) => {
      if (started || cancelled) return;
      started = true;
      const perFrameMs = Math.max(60, totalMs / frames.length);
      setFireFrameMs(perFrameMs);
      let i = 0;
      const showFrame = () => {
        if (cancelled) return;
        setPlayerAction({ type: "fire", frame: i, lock: true });
        setFireWipeRevealed(false);
        requestAnimationFrame(() => { if (!cancelled) setFireWipeRevealed(true); });
        frameTimer = setTimeout(() => {
          i++;
          if (i < frames.length) showFrame();
        }, perFrameMs);
      };
      showFrame();
    };

    const FALLBACK_TOTAL_MS = 320 * frames.length;
    const onMeta = () => {
      const ms = isFinite(audio.duration) && audio.duration > 0 ? audio.duration * 1000 : FALLBACK_TOTAL_MS;
      runSequence(ms);
    };
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", goToFirebreath);
    audio.play().catch(goToFirebreath);
    const metaFallback = setTimeout(() => runSequence(FALLBACK_TOTAL_MS), 150);

    return () => {
      cancelled = true;
      clearTimeout(metaFallback);
      if (frameTimer) clearTimeout(frameTimer);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", goToFirebreath);
      audio.pause();
    };
  }, [phase]);

  const KILL_DRAIN_MS = 2400;
  const firebreathPlayerRef = useRef(null);
  useEffect(() => {
    if (phase !== "firebreath") return;
    if (ENEMY_ANIM.kill.length === 0) { setEnemyHP(0); setPhase("dieSeq"); return; }
    setEnemyAction({ type: "kill", frame: 0, lock: true });
    const player = createLoopPlayer(firebreathSfx, { volume: 2.4 });
    player.start();
    firebreathPlayerRef.current = player;
    const startHP = enemyHPRef.current;
    const startTime = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - startTime) / KILL_DRAIN_MS);
      setEnemyHP(startHP * (1 - t));
      if (t >= 1) {
        clearInterval(id);
        setPhase("dieSeq");
      }
    }, 50);
    return () => {
      clearInterval(id);
      if (firebreathPlayerRef.current) { firebreathPlayerRef.current.fadeOut(500); firebreathPlayerRef.current = null; }
    };
  }, [phase]);

  const [deathOpacity, setDeathOpacity] = useState(1);
  const [screenFadeOut, setScreenFadeOut] = useState(false);
  const SCREEN_FADE_MS = 700;
  useEffect(() => {
    if (phase !== "dieSeq") return;
    let loopId = null;
    if (ENEMY_ANIM.die.length > 0) {
      loopId = setInterval(() => {
        deathFrame.current = (deathFrame.current + 1) % ENEMY_ANIM.die.length;
        setEnemyAction({ type: "die", frame: deathFrame.current, lock: true });
      }, 150);
    }
    const fadeStart = setTimeout(() => {
      let op = 1;
      const fade = setInterval(() => {
        op -= 0.03;
        setDeathOpacity(Math.max(0, op));
        if (op <= 0) {
          clearInterval(fade);
          if (loopId) clearInterval(loopId);
          const deathMusic = new Audio(deathMusicSrc);
          deathMusic.volume = 0.8;
          deathMusic.play().catch(() => {});
          setScreenFadeOut(true);
        }
      }, 40);
    }, 900);
    return () => { if (loopId) clearInterval(loopId); clearTimeout(fadeStart); };
  }, [phase]);

  useEffect(() => {
    if (!screenFadeOut) return;
    const id = setTimeout(() => setPhase("wizard"), SCREEN_FADE_MS);
    return () => clearTimeout(id);
  }, [screenFadeOut]);

  const getPlayerFrame = () => {
    const list = ANIM[playerAction.type] || ANIM.idle;
    return list[Math.min(playerAction.frame, list.length - 1)];
  };
  const getEnemyFrame = () => {
    const list = ENEMY_ANIM[enemyAction.type] || ENEMY_ANIM.idle;
    return list[Math.min(enemyAction.frame, list.length - 1)];
  };
  const playerBlockFrame = playerBlocking ? "block" : null;
  const enemyBlockFrame = enemyBlocking ? "ryublock" : null;
  const isKillPose = (phase === "firebreath" || phase === "dieSeq") && enemyAction.type === "kill";

  const flashRed = playerHP < playerMaxHP * LOW_HP_FLASH_FRACTION;

  const triggerInstantWin = () => {
    bossHealedOnce.current = true;
    frozenTriggered.current = true;
    setPlayerHP(1);
    setRamHP(0);
    setPhase("gunIntro");
  };

  if (phase === "wizard") {
    return <BossEnding onDone={() => onWin && onWin()} />;
  }

  return (
    <AppShell>
      <div style={{
        flex: 1, position: "relative", overflow: "hidden",
        backgroundImage: `url(${bgImg})`, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat", backgroundPosition: "center",
      }}>
        <style>{`
          @font-face { font-family: 'PokemonClassic'; src: url('/fonts/PokemonClassic.ttf') format('truetype'); }
          @keyframes redflash { 0%,100%{box-shadow: inset 0 0 0 rgba(255,0,0,0);} 50%{box-shadow: inset 0 0 60px 20px rgba(255,0,0,0.6);} }
          @keyframes killwrithe {
            0%   { transform: scale(1,1) skewX(0deg) translateX(0); filter: brightness(1) saturate(1) hue-rotate(0deg); }
            20%  { transform: scale(1.04,0.96) skewX(-2deg) translateX(-2px); filter: brightness(1.25) saturate(1.3) hue-rotate(10deg); }
            45%  { transform: scale(0.96,1.05) skewX(2deg) translateX(2px); filter: brightness(0.85) saturate(1.1) hue-rotate(-8deg); }
            70%  { transform: scale(1.03,0.97) skewX(-1.5deg) translateX(-1px); filter: brightness(1.2) saturate(1.2) hue-rotate(6deg); }
            100% { transform: scale(1,1) skewX(0deg) translateX(0); filter: brightness(1) saturate(1) hue-rotate(0deg); }
          }
        `}</style>

        {flashRed && (
          <div style={{ position: "absolute", inset: 0, zIndex: 50, pointerEvents: "none", animation: "redflash 0.5s infinite" }} />
        )}

        {(() => {
          const ramShare = KO_RAM_BASE_SHARE + (ramBonus / RAM_MAX) * KO_RAM_MAX_BONUS_SHARE;
          const enemyShare = 100 - KO_PLAYER_SHARE - ramShare;
          const tickOverlay = {
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "repeating-linear-gradient(to right, transparent 0 9px, rgba(0,0,0,0.55) 9px 11px)",
          };
          return (
            <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", width: KO_BAR_WIDTH }}>
              <div style={{
                display: "flex", height: 18, background: "#0a0a0a",
                border: "2px solid #000", borderRadius: 3,
                boxShadow: "inset 0 2px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.6), 0 0 0 2px #666, 0 0 8px rgba(0,0,0,0.8)",
                padding: 2, gap: 1,
              }}>
                <div style={{ flex: `${KO_PLAYER_SHARE} 0 0%`, height: "100%", position: "relative", background: "#1a1a1a" }}>
                  <div style={{ height: "100%", width: `${(playerHP / playerMaxHP) * 100}%`, background: "linear-gradient(to bottom, #fff2a8, #ffcc00 40%, #cc9900)", transition: "width .2s", boxShadow: "inset 0 0 4px rgba(255,255,255,0.5)" }} />
                  <div style={tickOverlay} />
                </div>
                <div style={{ flex: `${ramShare} 0 0%`, height: "100%", position: "relative", background: "#1a1a1a", transition: "flex-grow .3s" }}>
                  <div style={{ height: "100%", width: `${ramBonus > 0 ? (ramHP / ramBonus) * 100 : 0}%`, background: "linear-gradient(to bottom, #e0b3ff, #9933ff 40%, #6600cc)", transition: "width .2s", boxShadow: "inset 0 0 4px rgba(255,255,255,0.5)" }} />
                  <div style={tickOverlay} />
                </div>
                <div style={{ flex: `${enemyShare} 0 0%`, height: "100%", position: "relative", background: "#1a1a1a", transition: "flex-grow .3s" }}>
                  <div style={{ marginLeft: "auto", height: "100%", width: `${(enemyHP / ENEMY_MAX_HP) * 100}%`, background: "linear-gradient(to bottom, #ff9d9d, #ff2222 40%, #aa0000)", transition: "width .2s", boxShadow: "inset 0 0 4px rgba(255,255,255,0.5)" }} />
                  <div style={tickOverlay} />
                </div>
              </div>
              <div style={{ display: "flex", fontFamily: "'PokemonClassic', monospace", fontSize: 10, color: "#ddd", marginTop: 3, letterSpacing: 1, textShadow: "0 0 3px #000, 0 0 3px #000" }}>
                <div style={{ flex: `${KO_PLAYER_SHARE} 0 0%`, color: "#ffcc00" }}>YOU</div>
                <div style={{ flex: `${ramShare} 0 0%`, textAlign: "center", color: "#cc88ff" }}>RAM</div>
                <div style={{ flex: `${enemyShare} 0 0%`, textAlign: "right", color: "#ff6666" }}>IT</div>
              </div>
            </div>
          );
        })()}

        {isKillPose ? (
          <div style={{ position: "absolute", left: KILL_LEFT, top: KILL_TOP, width: KILL_W, height: KILL_H }}>
            <img
              src={spr("kill1")}
              alt="the RAM beam overloading the boss"
              style={{
                position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated",
                clipPath: `inset(0 ${100 - KILL_BEAM_SPLIT_PCT}% 0 0)`, WebkitClipPath: `inset(0 ${100 - KILL_BEAM_SPLIT_PCT}% 0 0)`,
                maskImage: KILL_FEET_FADE_MASK, WebkitMaskImage: KILL_FEET_FADE_MASK,
              }}
            />
            <img
              src={spr("kill1")}
              alt=""
              aria-hidden="true"
              style={{
                position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated",
                clipPath: `inset(0 0 0 ${KILL_BEAM_SPLIT_PCT}%)`, WebkitClipPath: `inset(0 0 0 ${KILL_BEAM_SPLIT_PCT}%)`,
                maskImage: KILL_FEET_FADE_MASK, WebkitMaskImage: KILL_FEET_FADE_MASK,
                opacity: deathOpacity,
                animation: phase === "firebreath" ? "killwrithe 0.45s ease-in-out infinite" : "none",
              }}
            />
          </div>
        ) : (
          <>
            {(() => {
              const isFirePose = playerAction.type === "fire" && !playerBlockFrame;
              const playerBoxW = isFirePose ? FIRE_W : CHAR_W;
              const playerBoxH = isFirePose ? FIRE_H : CHAR_H;
              const left = isFirePose ? playerX + FIRE_LEFT_OFFSET : playerX;
              const top = (isFirePose ? FLOOR_Y - playerBoxH + FIRE_TOP_OFFSET : FLOOR_Y - playerBoxH);
              return (
                <>
                  <img
                    src={spr(playerBlockFrame || getPlayerFrame())}
                    alt="player"
                    style={{
                      position: "absolute", left, top, width: playerBoxW, height: playerBoxH, imageRendering: "pixelated",
                      maskImage: FEET_FADE_MASK, WebkitMaskImage: FEET_FADE_MASK,
                    }}
                  />
                  {isFirePose && phase === "fireCharge" && playerAction.frame >= 1 && (
                    <div style={{
                      position: "absolute",
                      left: left + (FIRE_ICON_STRIP_LEFT_PCT + (playerAction.frame - 1) * FIRE_ICON_SLOT_WIDTH_PCT) * playerBoxW,
                      top: top + FIRE_ICON_TOP_PCT * playerBoxH,
                      width: FIRE_ICON_SLOT_WIDTH_PCT * playerBoxW,
                      height: FIRE_ICON_HEIGHT_PCT * playerBoxH,
                      overflow: "hidden", pointerEvents: "none",
                    }}>
                      <div style={{
                        position: "absolute", top: 0, bottom: 0, right: 0,
                        width: fireWipeRevealed ? "0%" : "100%",
                        background: "#000",
                        transition: fireWipeRevealed ? `width ${fireFrameMs}ms linear` : "none",
                      }} />
                    </div>
                  )}
                </>
              );
            })()}
            {playerStunned && (
              <div style={{
                position: "absolute", left: playerX - 10, top: FLOOR_Y - CHAR_H - 24, width: CHAR_W + 20,
                textAlign: "center", color: "#ffcc00", fontSize: 12, fontFamily: "'PokemonClassic', monospace",
                textShadow: "0 0 4px #000, 0 0 4px #000", letterSpacing: 1, pointerEvents: "none",
              }}>STUNNED!</div>
            )}
            {playerBlockBroken && (
              <div style={{
                position: "absolute", left: playerX - 10, top: FLOOR_Y - CHAR_H - 24, width: CHAR_W + 20,
                textAlign: "center", color: "#ff5555", fontSize: 12, fontFamily: "'PokemonClassic', monospace",
                textShadow: "0 0 4px #000, 0 0 4px #000", letterSpacing: 1, pointerEvents: "none",
              }}>GUARD BROKEN!</div>
            )}
            {deathOpacity > 0 && (
              <img
                src={spr(enemyBlockFrame || getEnemyFrame())}
                alt="enemy"
                style={{
                  position: "absolute", left: enemyX, top: FLOOR_Y - CHAR_H, width: CHAR_W, height: CHAR_H, imageRendering: "pixelated", opacity: deathOpacity,
                  maskImage: FEET_FADE_MASK, WebkitMaskImage: FEET_FADE_MASK,
                }}
              />
            )}
            {enemyStunned && deathOpacity > 0 && (
              <div style={{
                position: "absolute", left: enemyX - 10, top: FLOOR_Y - CHAR_H - 24, width: CHAR_W + 20,
                textAlign: "center", color: "#ff5555", fontSize: 12, fontFamily: "'PokemonClassic', monospace",
                textShadow: "0 0 4px #000, 0 0 4px #000", letterSpacing: 1, pointerEvents: "none",
              }}>STUNNED!</div>
            )}
          </>
        )}

        {dialogue && (
          <div style={{
            position: "absolute", bottom: 18, left: 18, right: 18,
            background: "#111", border: "4px solid #2ea84a", borderRadius: 4,
            boxShadow: "0 0 0 2px #000, 0 0 20px #2ea84a66",
            padding: "16px 20px 20px", zIndex: 60, minHeight: 100,
          }}>
            <div style={{
              position: "absolute", top: -26, left: 16,
              background: "#111", border: "4px solid #2ea84a", borderBottom: "4px solid #111",
              padding: "3px 14px", fontFamily: "'PokemonClassic', monospace",
              fontSize: 11, color: "#fff", letterSpacing: 1, borderRadius: "4px 4px 0 0",
            }}>IT</div>
            <p style={{ margin: 0, fontFamily: "'PokemonClassic', monospace", fontSize: 11, color: "#fff", lineHeight: 2, letterSpacing: 0.5 }}>
              {dialogue.text}
            </p>
            <button onClick={() => { const a = dialogue.after; setDialogue(null); a && a(); }} style={{
              position: "absolute", bottom: 10, right: 14,
              background: "transparent", border: "none", color: "#9933ff", fontSize: 14, cursor: "pointer",
              fontFamily: "'PokemonClassic', monospace", letterSpacing: 1,
            }}>NEXT ▼</button>
          </div>
        )}

        {phase === "fight" && !dialogue && (
          <button onClick={triggerInstantWin} style={{
            position: "absolute", bottom: 10, left: 10, zIndex: 60,
            background: "#111", color: "#9933ff", border: "2px solid #9933ff", borderRadius: 3,
            fontFamily: "'PokemonClassic', monospace", fontSize: 10, padding: "6px 12px",
            cursor: "pointer", letterSpacing: 1,
          }}>instant win</button>
        )}

        <div style={{
          position: "absolute", inset: 0, background: "#000", zIndex: 999, pointerEvents: "none",
          opacity: screenFadeOut ? 1 : 0, transition: `opacity ${SCREEN_FADE_MS}ms ease`,
        }} />
      </div>
    </AppShell>
  );
}
