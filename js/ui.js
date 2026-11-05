// Interface : menus, écrans, HUD
G.UI = (function () {
  const $ = (id) => document.getElementById(id);
  const R = G.Ranked;
  let current = 'main', previous = 'main';
  let selMode = 'classic', selMap = 'village', selType = 'zombies';
  let msgTimer = null;
  const thumbs = {};

  function go(name) {
    if (name === 'back') name = previous;
    G.Audio.init(); G.Audio.S.click();
    document.querySelectorAll('#menus .screen').forEach((s) => { if (s.id !== 'scr-pause') s.classList.add('hidden'); });
    if (name === 'options') previous = current;
    current = name;
    if (name === 'pause') { $('scr-pause').classList.remove('hidden'); return; }
    $('scr-pause').classList.add('hidden');
    $('scr-' + name).classList.remove('hidden');
    if (name === 'main') renderProfile();
    if (name === 'play') renderPlay();
    if (name === 'stats') renderStats();
    if (name === 'arsenal') renderArsenal();
    if (name === 'options') renderOptions();
  }

  function emblem(info, size = 78) {
    const letters = { Bronze: 'B', Argent: 'A', Or: 'O', Platine: 'P', Diamant: 'D', 'Maître': 'M', 'Légende': 'L' };
    return '<div class="emblem" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size / 3) + 'px;background:' + info.color + '">' + letters[info.name] + (info.div ? '<small style="font-size:' + Math.round(size / 6) + 'px;margin-left:2px">' + info.div + '</small>' : '') + '</div>';
  }

  function renderProfile() {
    const P = R.profile, info = R.rankInfo(P.rp), lv = R.level(), c = P.career;
    const acc = c.shots ? Math.round((c.hits / c.shots) * 100) : 0;
    $('profileCard').innerHTML = '<div class="panel profile">' +
      '<div class="rankbadge">' + emblem(info) + '<div style="flex:1"><div class="rankname" style="color:' + info.color + '">' + info.label + '</div>' +
      '<div class="rp">' + P.rp + ' RP' + (info.next ? ' — prochain palier à ' + info.next : '') + '</div>' +
      '<div class="bar"><div style="width:' + Math.round(info.progress * 100) + '%;background:' + info.color + '"></div></div></div></div>' +
      '<div class="kv"><span>' + G.esc(P.name) + '</span><span>Niveau ' + lv.lvl + '</span>' +
      '<span>Expérience</span><span>' + lv.into + ' / ' + lv.need + '</span>' +
      '<span>Parties</span><span>' + c.runs + '</span>' +
      '<span>Éliminations</span><span>' + c.kills + '</span>' +
      '<span>Meilleure vague classée</span><span>' + c.bestRankedWave + '</span>' +
      '<span>Précision</span><span>' + acc + ' %</span></div></div>';
  }

  function thumb(id) {
    if (thumbs[id]) return thumbs[id];
    const m = G.Maps.create(id);
    const c = G.topDown(m.world), S = m.world.W;
    const big = document.createElement('canvas'); big.width = 256; big.height = 96;
    const ctx = big.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(c, 0, S * 0.31, S, S * 0.375, 0, 0, 256, 96);
    thumbs[id] = big.toDataURL();
    return thumbs[id];
  }

  function renderPlay() {
    document.querySelectorAll('.mode').forEach((b) => b.classList.toggle('active', b.dataset.mode === selMode));
    document.querySelectorAll('.gtype').forEach((b) => b.classList.toggle('active', b.dataset.type === selType));
    const P = R.profile;
    const ri = $('rankedInfo');
    if (selMode === 'ranked') {
      const info = R.rankInfo(P.rp), mods = R.modifiers('ranked');
      ri.classList.remove('hidden');
      ri.innerHTML = '<div class="rankedrow">' + emblem(info, 64) + '<div><div class="rankname" style="color:' + info.color + '">' + info.label + '</div><div class="rp">' + P.rp + ' RP — objectif : atteindre la vague ' + R.expectedWave(info.t) + ' pour gagner des RP</div></div></div>' +
        '<div class="mods">' + mods.list.map((m) => '<span>' + m + '</span>').join('') + '</div>' +
        '<p class="hint" style="margin:10px 0 0">Plus votre rang monte, plus les parties se compliquent. Les cartes difficiles multiplient les RP gagnés.</p>';
    } else ri.classList.add('hidden');
    $('mapList').innerHTML = G.Maps.list.map((m) => {
      const best = P.career.bestWave[m.id + (selType === 'soldats' ? ':s' : '')] || 0;
      return '<button class="mapcard' + (m.id === selMap ? ' active' : '') + '" data-map="' + m.id + '"><div class="thumb" style="background-image:url(' + thumb(m.id) + ')"></div><div class="info"><h3>' + m.name + '</h3><p>' + m.desc + '</p>' +
        '<div class="meta"><span class="stars">' + '★'.repeat(m.stars) + '<span style="opacity:.25">' + '★'.repeat(4 - m.stars) + '</span></span><span>Record : vague ' + best + '</span></div>' +
        (selMode === 'ranked' ? '<div class="meta" style="margin-top:4px"><span style="color:var(--muted)">Multiplicateur RP</span><span>×' + m.rpMult.toFixed(2) + '</span></div>' : '') + '</div></button>';
    }).join('');
    document.querySelectorAll('.mapcard').forEach((b) => b.addEventListener('click', () => { selMap = b.dataset.map; G.Audio.S.click(); renderPlay(); }));
  }

  function fmtDate(t) { const d = new Date(t); return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }

  function renderStats(selId) {
    const P = R.profile, c = P.career, info = R.rankInfo(P.rp), peak = R.rankInfo(P.peakRp);
    const acc = c.shots ? Math.round((c.hits / c.shots) * 100) : 0;
    const hs = c.kills ? Math.round((c.headshots / c.kills) * 100) : 0;
    const stat = (v, l) => '<div class="stat"><b>' + v + '</b><small>' + l + '</small></div>';
    let h = '<div class="panel"><div class="rankedrow">' + emblem(info) + '<div style="flex:1;min-width:220px"><div class="rankname" style="color:' + info.color + '">' + info.label + '</div><div class="rp">' + P.rp + ' RP — pic : ' + peak.label + ' (' + P.peakRp + ' RP)</div><div class="bar"><div style="width:' + Math.round(info.progress * 100) + '%;background:' + info.color + '"></div></div></div></div>';
    h += '<div class="ladder">' + R.TIERS.map((T, i) => '<div class="' + (i === info.t ? 'cur' : '') + '" style="color:' + T.color + '"><b>' + T.name + '</b><span style="color:var(--muted)">' + T.min + '+ RP</span></div>').join('') + '</div></div>';
    h += '<div class="panel"><div class="statgrid">' +
      stat(c.runs, 'Parties') + stat(c.rankedRuns, 'Parties classées') + stat(c.kills, 'Éliminations') + stat(c.headshots, 'Tirs à la tête') +
      stat(hs + ' %', 'Ratio tête') + stat(acc + ' %', 'Précision') + stat(c.bosses, 'Boss vaincus') + stat(c.specials, 'Spéciaux tués') +
      stat(Math.round(c.dmgDealt).toLocaleString('fr-FR'), 'Dégâts infligés') + stat(Math.round(c.dmgTaken).toLocaleString('fr-FR'), 'Dégâts subis') +
      stat(c.points.toLocaleString('fr-FR'), 'Points gagnés') + stat(G.fmtTime(c.time), 'Temps de jeu') +
      G.Maps.list.map((m) => stat((c.bestWave[m.id] || 0) + ' / ' + (c.bestWave[m.id + ':s'] || 0), 'Record ' + m.name + ' (Z / S)')).join('') + '</div></div>';
    h += '<div class="cols"><div class="panel"><h3 class="sec">Historique</h3>';
    if (!P.runs.length) h += '<p class="hint">Aucune partie jouée pour l\'instant.</p>';
    else {
      h += '<table><tr><th>Date</th><th>Mode</th><th>Type</th><th>Carte</th><th>Vague</th><th>Kills</th><th>RP</th></tr>';
      for (const r of P.runs) {
        h += '<tr class="run' + (r.id === selId ? ' sel' : '') + '" data-id="' + r.id + '"><td>' + fmtDate(r.date) + '</td><td><span class="tagm' + (r.mode === 'ranked' ? ' r' : '') + '">' + (r.mode === 'ranked' ? 'Classé' : 'Classique') + '</span></td><td>' + (r.gameType === 'soldats' ? 'Soldats' : 'Zombies') + '</td><td>' + G.esc(r.mapName) + '</td><td>' + r.wave + '</td><td>' + r.kills + '</td><td class="' + (r.rpDelta > 0 ? 'pos' : r.rpDelta < 0 ? 'neg' : '') + '">' + (r.mode === 'ranked' ? (r.rpDelta > 0 ? '+' : '') + r.rpDelta : '—') + '</td></tr>';
      }
      h += '</table>';
    }
    h += '<div class="btnrow"><button class="act danger" id="btnReset">Réinitialiser le profil</button></div></div>';
    h += '<div class="panel" id="runDetail">' + runDetail(P.runs.find((r) => r.id === selId) || P.runs[0]) + '</div></div>';
    $('statsBody').innerHTML = h;
    document.querySelectorAll('tr.run').forEach((tr) => tr.addEventListener('click', () => renderStats(Number(tr.dataset.id))));
    $('btnReset').addEventListener('click', () => { if (confirm('Effacer tout le profil (rang, stats, historique) ?')) { R.reset(); renderStats(); } });
  }

  function runDetail(r) {
    if (!r) return '<h3 class="sec">Détail</h3><p class="hint">Sélectionnez une partie.</p>';
    const acc = r.shots ? Math.round((r.hits / r.shots) * 100) : 0;
    let h = '<h3 class="sec">Partie du ' + fmtDate(r.date) + '</h3>';
    h += '<div class="kv" style="margin-top:0"><span>Carte</span><span>' + G.esc(r.mapName) + '</span><span>Mode</span><span>' + (r.mode === 'ranked' ? 'Classé (' + r.rankLabel + ')' : 'Classique') + ' — ' + (r.gameType === 'soldats' ? 'Soldats' : 'Zombies') + '</span>' +
      '<span>Vague atteinte</span><span>' + r.wave + '</span><span>Durée</span><span>' + G.fmtTime(r.time) + '</span>' +
      '<span>Éliminations / tête</span><span>' + r.kills + ' / ' + r.headshots + '</span><span>Précision</span><span>' + acc + ' %</span>' +
      '<span>Dégâts infligés / subis</span><span>' + r.dmgDealt + ' / ' + r.dmgTaken + '</span><span>Points</span><span>' + r.points + '</span>' +
      '<span>Boss vaincus</span><span>' + r.bosses + '</span>' +
      (r.perks && r.perks.length ? '<span>Atouts</span><span>' + r.perks.map((p) => G.PERKS[p] ? G.PERKS[p].name : p).join(', ') + '</span>' : '') +
      (r.weapons ? '<span>Armes finales</span><span>' + r.weapons.map(G.esc).join(', ') + '</span>' : '') +
      (r.mode === 'ranked' ? '<span>RP</span><span class="' + (r.rpDelta >= 0 ? 'pos' : 'neg') + '">' + (r.rpDelta > 0 ? '+' : '') + r.rpDelta + ' (' + r.rpBefore + ' → ' + Math.max(0, r.rpBefore + r.rpDelta) + ')</span>' : '') + '</div>';
    if (r.waves && r.waves.length) {
      const maxK = Math.max(1, ...r.waves.map((w) => w.kills));
      h += '<h3 class="sec" style="margin-top:18px">Vague par vague</h3><table><tr><th>Vague</th><th>Durée</th><th>Kills</th><th>Tête</th><th>Dégâts subis</th><th>Points</th></tr>';
      for (const w of r.waves) {
        h += '<tr><td>' + w.n + (w.boss ? ' <span class="tagm r">Boss</span>' : '') + (w.died ? ' <span class="tagm">✝</span>' : '') + '</td><td>' + G.fmtTime(w.t) + '</td><td><span class="mini" style="width:' + Math.round((w.kills / maxK) * 50) + 'px"></span> ' + w.kills + '</td><td>' + w.hs + '</td><td>' + w.dmgTaken + '</td><td>' + w.pts + '</td></tr>';
      }
      h += '</table>';
    }
    return h;
  }

  function renderArsenal() {
    let h = '<h3 class="sec">Armes</h3><div class="cards">';
    for (const w of Object.values(G.WEAPONS)) {
      const where = w.price ? 'Mur — ' + w.price + ' pts' : w.id === 'pistol' ? 'Arme de départ' : 'Caisse mystère';
      h += '<div class="card"><h4>' + w.name + '</h4><div class="sub">' + w.cls + ' — ' + (w.id === 'pistol' ? 'Arme de départ' : where) + '</div>' +
        '<div class="row"><span>Dégâts</span><span>' + w.dmg + (w.pellets > 1 ? ' ×' + w.pellets : '') + (w.splash ? ' (zone)' : '') + '</span></div>' +
        '<div class="row"><span>Cadence</span><span>' + w.rpm + ' cps/min' + (w.auto ? ' (auto)' : '') + '</span></div>' +
        '<div class="row"><span>Chargeur</span><span>' + w.mag + ' / ' + w.reserve + '</span></div>' +
        '<div class="row"><span>Rechargement</span><span>' + w.reload + ' s</span></div>' +
        '<div class="row"><span>Perforation</span><span>' + w.pierce + '</span></div></div>';
    }
    h += '</div><p class="hint">Forge ★ (dès la vague 8, 5000 pts) : dégâts ×2, chargeur ×1,5, réserve ×1,6.</p>';
    h += '<h3 class="sec">Atouts</h3><div class="cards">' + Object.values(G.PERKS).map((p) => '<div class="card"><h4 style="color:#' + p.color.toString(16).padStart(6, '0') + '">' + p.icon + ' ' + p.name + '</h4><div class="sub">' + p.price + ' pts</div>' + p.desc + '</div>').join('') + '</div>';
    h += '<h3 class="sec">Bonus</h3><div class="cards">' + Object.values(G.POWERUPS).map((p) => '<div class="card"><h4 style="color:#' + p.color.toString(16).padStart(6, '0') + '">' + p.icon + ' ' + p.name + '</h4><div class="sub">' + ({ 'MUNITIONS MAX': 'Recharge toutes les armes et grenades', 'MORT INSTANTANÉE': 'Tout tue en un coup (20 s)', 'POINTS ×2': 'Points doublés (20 s)', 'BOMBE': 'Élimine tous les zombies (hors boss)', 'FUREUR': 'Munitions infinies sans recharger (15 s)', 'BUTIN': '+500 points' }[p.name]) + '</div></div>').join('') + '</div>';
    const ZD = { crawler: 'Rampe au sol : petite cible, difficile à toucher. Vague 4+.', stalker: 'Créature à quatre pattes qui bondit sur vous. Vague 7+.', screamer: 'Son cri vous ralentit, brouille la vue et enrage les zombies proches. Vague 9+.', walker: 'Lent au début, il accélère au fil des vagues.', runner: 'Rapide et fragile. Vague 3+.', brute: 'Énorme réservoir de PV, frappe fort. Vague 6+.', bloater: 'Explose au contact ou à sa mort. Vague 8+.', spitter: 'Garde ses distances et crache de l\'acide. Vague 11+.', armored: 'Casque qui absorbe les tirs à la tête.', minion: 'Invoqué par le Nécromancien.' };
    h += '<h3 class="sec">Bestiaire</h3><div class="cards">' + Object.entries(G.ZTYPES).map(([k, z]) => '<div class="card"><h4>' + z.name + '</h4><div class="sub">PV ×' + z.hp + ' — vitesse ' + z.speed + '</div>' + ZD[k] + '</div>').join('') + '</div>';
    const BD = { colosse: 'Vagues 5, 20, 35… Frappe le sol : sautez pour éviter l\'onde de choc !', necro: 'Vagues 10, 25, 40… Invoque des squelettes, se téléporte et lance des orbes.', belier: 'Vagues 15, 30, 45… Charge en ligne droite. Faites-le percuter un mur pour l\'étourdir (dégâts ×2).' };
    h += '<h3 class="sec">Boss</h3><div class="cards">' + G.BOSSES.map((b) => '<div class="card"><h4 style="color:#ff5a5a">' + b.name + '</h4><div class="sub">' + b.hp + ' PV de base</div>' + BD[b.id] + '</div>').join('') + '</div>';
    const SD = { rifleman: 'Rafales au fusil d\'assaut, garde ses distances.', assault: 'Fonce au contact avec sa mitraillette.', breacher: 'Fusil à pompe et casque : dévastateur de près.', sniper: 'Un laser rouge trahit sa visée : mettez-vous à couvert !', heavy: 'Blindé, longues rafales de mitrailleuse.', grenadier: 'Lance des grenades pour vous déloger.' };
    h += '<h3 class="sec">Mode Soldats</h3><div class="cards">' + Object.entries(G.STYPES).map(([k, z]) => '<div class="card"><h4>' + z.name + '</h4><div class="sub">PV ×' + z.hp + ' — ' + G.WEAPONS[z.weapon].name + '</div>' + SD[k] + '</div>').join('') + '</div>';
    const SBD = { juggernaut: 'Armure lourde et minigun : il lance la rotation avant de tirer. Restez à couvert.', commandant: 'Appelle des renforts et lance des grenades.', pyro: 'Lance-flammes à courte portée et zones de feu. Gardez vos distances.' };
    h += '<h3 class="sec">Boss soldats</h3><div class="cards">' + G.SBOSSES.map((b) => '<div class="card"><h4 style="color:#ff5a5a">' + b.name + '</h4><div class="sub">' + b.hp + ' PV de base</div>' + SBD[b.id] + '</div>').join('') + '</div>';
    $('arsenalBody').innerHTML = h;
  }

  function renderOptions() {
    const s = R.profile.settings;
    $('optName').value = R.profile.name;
    $('optSens').value = s.sens; $('optSensV').textContent = s.sens.toFixed(2);
    $('optVol').value = s.vol; $('optVolV').textContent = Math.round(s.vol * 100) + '%';
    $('optFov').value = s.fov; $('optFovV').textContent = s.fov + '°';
    $('optQual').value = s.quality;
  }
  function bindOptions() {
    const s = () => R.profile.settings;
    $('optName').addEventListener('input', (e) => { R.profile.name = e.target.value.trim() || 'Survivant'; R.save(); });
    $('optSens').addEventListener('input', (e) => { s().sens = Number(e.target.value); $('optSensV').textContent = s().sens.toFixed(2); R.save(); });
    $('optVol').addEventListener('input', (e) => { s().vol = Number(e.target.value); $('optVolV').textContent = Math.round(s().vol * 100) + '%'; G.Audio.setVolume(s().vol); R.save(); });
    $('optFov').addEventListener('input', (e) => { s().fov = Number(e.target.value); $('optFovV').textContent = s().fov + '°'; R.save(); });
    $('optQual').addEventListener('change', (e) => { s().quality = e.target.value; R.save(); G.game.applyQuality(); });
  }

  function showGameOver(run, res) {
    const acc = run.shots ? Math.round((run.hits / run.shots) * 100) : 0;
    let h = '<p class="over-title">VOUS ÊTES MORT</p><div style="color:var(--muted)">' + G.esc(run.mapName) + ' — ' + (run.gameType === 'soldats' ? 'Soldats' : 'Zombies') + ' — ' + (run.mode === 'ranked' ? 'Classé' : 'Classique') + '</div>';
    h += '<div class="statgrid" style="margin:14px 0">' + [
      [run.wave, 'Vague atteinte'], [run.kills, 'Éliminations'], [run.headshots, 'Tirs à la tête'], [acc + ' %', 'Précision'],
      [run.points, 'Points gagnés'], [G.fmtTime(run.time), 'Temps survécu'], [run.bosses, 'Boss vaincus'], [run.dmgTaken, 'Dégâts subis'],
    ].map(([v, l]) => '<div class="stat"><b>' + v + '</b><small>' + l + '</small></div>').join('') + '</div>';
    if (run.mode === 'ranked') {
      const a = res.infoAfter;
      h += '<div class="panel" style="margin:0"><div class="rankedrow">' + emblem(a, 64) + '<div style="flex:1"><div class="rankname" style="color:' + a.color + '">' + a.label + '</div><div class="rp">' + res.before + ' → ' + res.after + ' RP (objectif vague ' + R.expectedWave(res.infoBefore.t) + ')</div><div class="bar"><div id="overBar" style="width:' + Math.round(res.infoBefore.progress * 100) + '%;background:' + a.color + '"></div></div></div>' +
        '<div class="rpchange ' + (res.delta >= 0 ? 'pos' : 'neg') + '">' + (res.delta > 0 ? '+' : '') + res.delta + ' RP</div></div>' +
        (res.promoted ? '<div class="promo" style="background:' + a.color + ';color:#111;margin-top:12px">PROMOTION : ' + a.label.toUpperCase() + '</div>' : '') +
        (res.demoted ? '<div class="promo" style="background:#3a1a1a;color:#ff8080;margin-top:12px">RÉTROGRADATION : ' + a.label.toUpperCase() + '</div>' : '') + '</div>';
    }
    h += '<div style="color:var(--muted);margin-top:8px">+' + res.xpGain + ' XP' + (res.levelUp ? ' — <b style="color:var(--accent2)">NIVEAU ' + R.level().lvl + ' !</b>' : '') + '</div>';
    h += '<div class="btnrow"><button class="big" id="btnAgain">Rejouer</button><button id="btnDetail">Détail des vagues</button><button id="btnMenu">Menu principal</button></div>';
    $('overBody').innerHTML = h;
    $('scr-over').classList.remove('hidden');
    if (res.promoted) G.Audio.S.rankUp();
    setTimeout(() => { const b = $('overBar'); if (b) b.style.width = Math.round(res.infoAfter.progress * 100) + '%'; }, 200);
    $('btnAgain').addEventListener('click', () => { $('scr-over').classList.add('hidden'); G.game.start(run.map, run.mode, run.gameType || 'zombies'); });
    $('btnDetail').addEventListener('click', () => { $('scr-over').classList.add('hidden'); G.game.quitToMenu(); go('stats'); });
    $('btnMenu').addEventListener('click', () => { $('scr-over').classList.add('hidden'); G.game.quitToMenu(); go('main'); });
  }

  // ---------- HUD ----------
  const cache = {};
  function setText(id, v) { if (cache[id] !== v) { cache[id] = v; $(id).textContent = v; } }
  function setHTML(id, v) { if (cache[id] !== v) { cache[id] = v; $(id).innerHTML = v; } }

  function updateHUD(d) {
    setText('points', d.points.toLocaleString('fr-FR'));
    setText('wave', d.wave || '');
    setText('left', d.left ? d.left + ' zombie' + (d.left > 1 ? 's' : '') : '');
    const hpP = Math.max(0, d.hp / d.maxHp);
    $('hpbar').style.width = (hpP * 100).toFixed(1) + '%';
    $('hpbar').style.background = hpP < 0.35 ? 'linear-gradient(#ff6a5a,#b0150a)' : '';
    setText('hptext', Math.max(0, Math.ceil(d.hp)));
    $('vignette').style.opacity = Math.max(G.UI._hurt || 0, hpP < 0.35 ? (0.35 - hpP) * 2 : 0).toFixed(2);
    $('stamina').firstChild.style.width = Math.round(d.stamina * 100) + '%';
    setText('wname', d.weapon);
    setText('mag', d.mag);
    setText('reserve', '/ ' + d.reserve);
    $('ammo').classList.toggle('low', typeof d.mag === 'number' && d.mag <= 3);
    setText('grenades', '💣 × ' + d.grenades);
    setText('reloadhint', d.reloading ? 'Rechargement…' : (typeof d.mag === 'number' && d.mag === 0 && d.reserve === 0 ? 'Plus de munitions !' : (typeof d.mag === 'number' && d.mag <= 3 ? '[R] Recharger' : '')));
    setHTML('slots', d.slots.map((s, i) => '<span class="' + (s.cur ? 'cur' : '') + '">' + (i + 1) + ' · ' + G.esc(s.name) + '</span>').join(''));
    setHTML('perks', d.perks.map((p) => { const P = G.PERKS[p]; return '<span title="' + P.name + '" style="color:#' + P.color.toString(16).padStart(6, '0') + '">' + P.icon + '</span>'; }).join(''));
    setHTML('powers', Object.entries(d.power).filter(([, v]) => v > 0).map(([k, v]) => { const P = G.POWERUPS[k]; return '<div style="color:#' + P.color.toString(16).padStart(6, '0') + '">' + P.icon + ' ' + Math.ceil(v) + 's</div>'; }).join(''));
    setText('prompt', d.prompt);
    if (d.boss) { $('bossbar').classList.remove('hidden'); setText('bossname', d.boss.name + (d.boss.stunned ? ' — ÉTOURDI' : '')); $('bosshp').style.width = (d.boss.hp * 100).toFixed(1) + '%'; }
    else $('bossbar').classList.add('hidden');
    const gap = 6 + (1 - d.ads) * 6 + (d.sprint ? 8 : 0);
    $('crosshair').style.setProperty('--gap', gap + 'px');
    $('crosshair').style.opacity = d.ads > 0.7 ? 0 : 1;
    G.UI._hurt = Math.max(0, (G.UI._hurt || 0) - 0.03);
  }
  let hmT = null;
  function hitmarker(kill, head) {
    const h = $('hitmarker');
    h.style.color = kill ? '#ff3030' : head ? '#ffd040' : '#ffffff';
    h.style.opacity = 1; h.style.transform = kill ? 'scale(1.3)' : 'scale(1)';
    clearTimeout(hmT); hmT = setTimeout(() => { h.style.opacity = 0; }, 90);
  }
  function pointsPopup(text, neg) {
    const d = document.createElement('div'); d.textContent = text; if (neg) d.className = 'neg';
    d.style.left = Math.round(Math.random() * 40) + 'px';
    $('pops').appendChild(d);
    setTimeout(() => d.remove(), 1000);
    while ($('pops').children.length > 8) $('pops').firstChild.remove();
  }
  function hurt(frac) { G.UI._hurt = Math.min(0.9, (G.UI._hurt || 0) + 0.25 + frac); }
  let ddT = null;
  function damageDir(ang) {
    const d = $('dmgdir'); d.style.transform = 'rotate(' + (-ang) + 'rad)'; d.style.opacity = 1; d.style.transition = 'none';
    clearTimeout(ddT); ddT = setTimeout(() => { d.style.transition = 'opacity .6s'; d.style.opacity = 0; }, 250);
  }
  function flash(color) {
    const f = $('flash'); f.style.transition = 'none'; f.style.background = color; f.style.opacity = 0.7;
    setTimeout(() => { f.style.transition = 'opacity .8s'; f.style.opacity = 0; }, 50);
  }
  function message(title, sub, dur = 2, color) {
    $('msgTitle').textContent = title || '';
    $('msgSub').textContent = sub || '';
    $('msgTitle').style.color = color && title ? color : '';
    $('msgSub').style.color = color && !title ? color : '';
    $('msg').style.opacity = 1;
    clearTimeout(msgTimer); msgTimer = setTimeout(() => { $('msg').style.opacity = 0; }, dur * 1000);
  }
  function showHUD(on) {
    $('hud').classList.toggle('hidden', !on);
    document.querySelectorAll('#menus .screen').forEach((s) => s.classList.add('hidden'));
    if (!on && G.game && G.game.phase === 'menu') go('main');
    for (const k in cache) delete cache[k];
  }
  function showPause(p) {
    if (p) { current = 'pause'; $('scr-pause').classList.remove('hidden'); }
    else { document.querySelectorAll('#menus .screen').forEach((s) => s.classList.add('hidden')); current = 'game'; }
  }
  function showScoreboard(on) {
    const g = G.game; const sb = $('scoreboard');
    if (!on || !g || g.phase === 'menu') { sb.classList.add('hidden'); return; }
    const s = g.stats; const acc = s.shots ? Math.round((s.hits / s.shots) * 100) : 0;
    sb.innerHTML = '<h3>' + G.esc(R.profile.name) + ' — vague ' + g.wave + '</h3><div class="kv" style="margin-top:0">' +
      '<span>Temps</span><span>' + G.fmtTime(g.time) + '</span><span>Éliminations</span><span>' + s.kills + '</span><span>Tirs à la tête</span><span>' + s.headshots + '</span>' +
      '<span>Précision</span><span>' + acc + ' %</span><span>Points gagnés</span><span>' + s.points + '</span><span>Dégâts subis</span><span>' + Math.round(s.dmgTaken) + '</span><span>Boss vaincus</span><span>' + s.bosses + '</span>' +
      '<span>Mode</span><span>' + (g.mode === 'ranked' ? 'Classé — ' + R.rankInfo(R.profile.rp).label : 'Classique') + '</span></div>';
    sb.classList.remove('hidden');
  }

  function init() {
    document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
    document.querySelectorAll('.mode').forEach((b) => b.addEventListener('click', () => { selMode = b.dataset.mode; G.Audio.S.click(); renderPlay(); }));
    $('btnLaunch').addEventListener('click', () => { G.Audio.init(); G.game.start(selMap, selMode, selType); });
    document.querySelectorAll('.gtype').forEach((b) => b.addEventListener('click', () => { selType = b.dataset.type; G.Audio.S.click(); renderPlay(); }));
    $('btnResume').addEventListener('click', () => G.game.setPaused(false));
    $('btnAbandon').addEventListener('click', () => { $('scr-pause').classList.add('hidden'); G.game.paused = false; G.game.gameOver(); });
    bindOptions();
    G.Audio.setVolume(R.profile.settings.vol);
    go('main');
  }

  return { init, go, updateHUD, hitmarker, pointsPopup, hurt, damageDir, flash, message, showHUD, showPause, showScoreboard, showGameOver };
})();
