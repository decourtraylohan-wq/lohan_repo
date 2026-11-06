// Profil joueur, système classé (RP, rangs) et historique des parties
G.Ranked = (function () {
  const KEY = 'deadblock_profile_v1';
  const TIERS = [
    { name: 'Bronze', color: '#c9803f', min: 0 },
    { name: 'Argent', color: '#b9c6cf', min: 300 },
    { name: 'Or', color: '#f2c443', min: 600 },
    { name: 'Platine', color: '#4fd6c4', min: 900 },
    { name: 'Diamant', color: '#63a6ff', min: 1200 },
    { name: 'Maître', color: '#c46bff', min: 1500 },
    { name: 'Légende', color: '#ff4d6a', min: 1800 },
  ];
  const DIV = ['III', 'II', 'I'];

  function defaults() {
    return {
      name: 'Survivant', rp: 0, peakRp: 0, xp: 0,
      settings: { sens: 1.0, vol: 0.6, fov: 75, quality: 'haute', aim: 'leger' },
      career: { runs: 0, rankedRuns: 0, kills: 0, headshots: 0, shots: 0, hits: 0, dmgDealt: 0, dmgTaken: 0, points: 0, time: 0, bosses: 0, bestWave: {}, bestRankedWave: 0, specials: 0 },
      runs: [],
    };
  }
  let P = Object.assign(defaults(), G.store.get(KEY, {}));
  P.settings = Object.assign(defaults().settings, P.settings || {});
  P.career = Object.assign(defaults().career, P.career || {});
  const save = () => G.store.set(KEY, P);

  function tierIndex(rp) { let t = 0; for (let i = 0; i < TIERS.length; i++) if (rp >= TIERS[i].min) t = i; return t; }
  function rankInfo(rp) {
    const t = tierIndex(rp), T = TIERS[t];
    if (t === TIERS.length - 1) return { t, name: T.name, label: T.name, color: T.color, progress: 1, into: rp - T.min, next: null };
    const into = rp - T.min, div = Math.min(2, Math.floor(into / 100));
    return { t, name: T.name, div: DIV[div], label: T.name + ' ' + DIV[div], color: T.color, progress: (into % 100) / 100, into, next: T.min + (div + 1) * 100 };
  }

  // Modificateurs de difficulté : plus le rang est élevé, plus la partie se complexifie
  function modifiers(mode) {
    const t = mode === 'ranked' ? tierIndex(P.rp) : 0;
    const m = {
      tier: t,
      hp: 1 + 0.12 * t,
      speed: 1 + 0.035 * t,
      dmg: 1 + 0.1 * t,
      early: t,                    // les zombies spéciaux arrivent N vagues plus tôt
      drops: 1 - 0.08 * t,
      armoredFrom: [18, 16, 13, 11, 9, 7, 5][t],
      elite: 0.03 * t,
      bossHp: 1 + 0.15 * t,
      regenDelay: 4 + 0.4 * t,
      maxAlive: 24 + t * 2,
    };
    m.list = [];
    if (t > 0) {
      m.list.push('Zombies +' + Math.round((m.hp - 1) * 100) + '% PV', 'Dégâts subis +' + Math.round((m.dmg - 1) * 100) + '%');
      m.list.push('Zombies spéciaux ' + t + ' vague' + (t > 1 ? 's' : '') + ' plus tôt', 'Blindés dès la vague ' + m.armoredFrom);
      m.list.push('Bonus lâchés −' + Math.round((1 - m.drops) * 100) + '%', 'Élites : ' + Math.round(m.elite * 100) + '% des zombies');
      if (t >= 3) m.list.push('Boss +' + Math.round((m.bossHp - 1) * 100) + '% PV');
    } else m.list.push('Difficulté de base');
    return m;
  }

  function expectedWave(t) { return 5 + t * 3; }

  function record(run) {
    const before = P.rp, infoBefore = rankInfo(before);
    let delta = 0;
    if (run.mode === 'ranked') {
      const t = tierIndex(before);
      const hsRatio = run.kills ? run.headshots / run.kills : 0;
      let d = (run.wave - expectedWave(t)) * 9 + Math.min(25, run.kills * 0.06) + hsRatio * 15 + run.bosses * 8;
      d = d > 0 ? d * run.rpMult : d / run.rpMult;
      if (t === 0 && d < 0) d *= 0.5;
      delta = Math.round(G.clamp(d, -40, 160));
      P.rp = Math.max(0, before + delta);
      P.peakRp = Math.max(P.peakRp, P.rp);
      P.career.rankedRuns++;
      P.career.bestRankedWave = Math.max(P.career.bestRankedWave, run.wave);
    }
    const xpGain = run.kills * 5 + run.wave * 40 + run.bosses * 200;
    const lvlBefore = level().lvl;
    P.xp += xpGain;
    const c = P.career;
    c.runs++; c.kills += run.kills; c.headshots += run.headshots; c.shots += run.shots; c.hits += run.hits;
    c.dmgDealt += run.dmgDealt; c.dmgTaken += run.dmgTaken; c.points += run.points; c.time += run.time; c.bosses += run.bosses; c.specials += run.specials || 0;
    const bk = run.map + (run.gameType === 'soldats' ? ':s' : '');
    c.bestWave[bk] = Math.max(c.bestWave[bk] || 0, run.wave);
    run.rpBefore = before; run.rpDelta = delta; run.rankLabel = infoBefore.label; run.id = Date.now();
    P.runs.unshift(run);
    if (P.runs.length > 60) P.runs.length = 60;
    save();
    const infoAfter = rankInfo(P.rp);
    return { delta, before, after: P.rp, infoBefore, infoAfter, promoted: infoAfter.label !== infoBefore.label && P.rp > before, demoted: infoAfter.label !== infoBefore.label && P.rp < before, xpGain, levelUp: level().lvl > lvlBefore };
  }

  function level() {
    let lvl = 1, need = 800, xp = P.xp;
    while (xp >= need) { xp -= need; lvl++; need = Math.round(800 * Math.pow(lvl, 1.15)); }
    return { lvl, into: xp, need };
  }

  function reset() { const s = P.settings; P = defaults(); P.settings = s; save(); }

  return { TIERS, get profile() { return P; }, save, rankInfo, tierIndex, modifiers, record, level, reset, expectedWave };
})();
