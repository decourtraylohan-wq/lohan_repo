// Coop en ligne (jusqu'à 4 joueurs) via le salon temps réel de la page (capacité « room » de claude.ai).
// Chaque joueur publie sa « présence » : l'hôte y met l'état du monde (vagues, ennemis, dégâts infligés aux autres),
// les invités y mettent leur position et leurs tirs. L'hôte simule tout ; les invités affichent des marionnettes.
G.VS_MODES = {
  '1v1': { name: '1 contre 1', max: 2, limit: 10, time: 480, zone: 24, goal: 'Premier à 10 éliminations' },
  ffa: { name: 'Chacun pour soi', max: 4, limit: 15, time: 600, zone: 32, goal: 'Premier à 15 éliminations' },
  '2v2': { name: '2 contre 2', max: 4, limit: 20, time: 600, zone: 32, goal: 'Première équipe à 20 éliminations' },
};
G.Coop = class {
  constructor(game) {
    this.game = game;
    this.room = null; this.available = false; this.connected = false;
    this.myPeer = null; this.peers = []; this.ready = false;
    // étiquette courte (les identifiants de la salle sont longs et la présence est limitée à 4 Ko)
    this.tag = Array.from({ length: 5 }, () => 'abcdefghijkmnpqrstuvwxyz0123456789'[Math.floor(Math.random() * 34)]).join('');
    this.mine = {};
    this.code = null; this.role = null; this.started = false; // role : 'host' | 'client'
    this.mapId = 'village'; this.type = 'zombies';
    this.others = new Map(); // peer -> { peer, nick, avatar, proxy, lastH, lastX, car, shotT, ... }
    this.puppets = new Map(); // nid -> Enemy (invité)
    this.seq = 0;
    this.hOut = []; this.xOut = []; // invité -> hôte : touches, explosions
    this.dOut = []; this.kOut = []; this.fxOut = []; this.shOut = []; this.peOut = []; this.pkOut = []; // hôte -> invités / invité -> hôte
    this.last = { d: 0, k: 0, fx: 0, sh: 0, w: 0, pe: 0 };
    this.sendT = 0; this.fieldT = 0;
    this.listeners = [];
    this.init();
  }
  get active() { return !!this.code && this.started; }
  get isHost() { return this.active && this.role === 'host'; }
  get isClient() { return this.active && this.role === 'client'; }

  async init() {
    let room = null;
    try { room = window.claude && window.claude.use ? await window.claude.use('room') : null; } catch (e) { room = null; }
    this.ready = true;
    if (!room) { this.available = false; this.changed(); return; }
    this.room = room; this.available = true;
    room.onPeers((c) => {
      this.peers = c.peers;
      for (const p of c.peers) if (p.isMe && p.sameTab) this.myPeer = p.peer;
      for (const p of c.left) this.dropPeer(p.peer);
      this.changed();
    }, () => { this.available = false; this.changed(); });
    room.onConnection((ok) => { this.connected = ok; this.changed(); });
    this.push({ v: 1, id: this.tag, nick: this.nick(), g: null, role: null, lb: null });
  }
  nick() { return (G.Ranked.profile.name || 'Survivant').slice(0, 16); }
  push(patch) {
    if (!this.room) return;
    for (const k in patch) { if (patch[k] === null) delete this.mine[k]; else this.mine[k] = patch[k]; }
    this.room.presence(patch).catch(() => {});
  }
  tagOf(peer) { const o = this.others.get(peer); return o && o.tag ? o.tag : ''; }
  onChange(fn) { this.listeners.push(fn); }
  changed() { for (const fn of this.listeners) { try { fn(); } catch (e) { /* interface */ } } }

  // ---------- salon ----------
  games() {
    const out = [];
    for (const p of this.peers) {
      const pr = p.presence || {};
      if (pr.role !== 'host' || !pr.g || !pr.lb || p.sameTab) continue;
      out.push({ code: String(pr.g), host: String(pr.nick || 'Hôte').slice(0, 16), map: pr.lb.m, type: pr.lb.t, vs: G.VS_MODES[pr.lb.vs] ? pr.lb.vs : null, started: !!pr.lb.st, players: this.members(pr.g).length });
    }
    return out;
  }
  members(code) { return this.peers.filter((p) => p.presence && p.presence.g === code); }
  hostPeer() { return this.peers.find((p) => p.presence && p.presence.g === this.code && p.presence.role === 'host' && !p.sameTab); }
  // vs : null (coop contre les vagues) | '1v1' | 'ffa' (chacun pour soi) | '2v2'
  create(mapId, type, vs) {
    const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
    this.code = Array.from({ length: 4 }, () => abc[Math.floor(Math.random() * abc.length)]).join('');
    this.role = 'host'; this.mapId = mapId; this.type = type; this.started = false;
    this.vs = G.VS_MODES[vs] ? vs : null; this.myTeam = this.vs === '2v2' ? 0 : null;
    this.push({ nick: this.nick(), g: this.code, role: 'host', lb: this.lobbyInfo(0), tm: this.myTeam, vs: null, sc: null });
    this.changed();
  }
  lobbyInfo(st) { return { m: this.mapId, t: this.type, st, vs: this.vs }; }
  maxPlayers(vs) { return vs && G.VS_MODES[vs] ? G.VS_MODES[vs].max : 4; }
  // 2v2 : on rejoint l'équipe la moins remplie, puis on peut changer
  ensureTeam() {
    if (!this.code || this.vs !== '2v2') { if (this.myTeam != null && this.vs !== '2v2') { this.myTeam = null; this.push({ tm: null }); } return; }
    if (this.myTeam != null) return;
    const n = [0, 0]; for (const p of this.members(this.code)) if (!p.sameTab && (p.presence.tm === 0 || p.presence.tm === 1)) n[p.presence.tm]++;
    this.myTeam = n[0] <= n[1] ? 0 : 1; this.push({ tm: this.myTeam }); this.changed();
  }
  switchTeam() { if (this.vs !== '2v2' || this.started) return; this.myTeam = this.myTeam === 0 ? 1 : 0; this.push({ tm: this.myTeam }); this.changed(); }
  join(code) {
    code = String(code || '').trim().toLowerCase();
    if (!code) return false;
    this.code = code; this.role = 'client'; this.started = false; this.vs = null; this.myTeam = null;
    this.push({ nick: this.nick(), g: code, role: 'client', lb: null, tm: null, vs: null, sc: null });
    this.changed();
    return true;
  }
  launch() {
    if (this.role !== 'host') return;
    this.started = true;
    this.push({ lb: this.lobbyInfo(1), vs: null });
    this.game.start(this.mapId, 'classic', this.type, null);
  }
  // l'invité démarre quand l'hôte a lancé la partie (ou la rejoint en cours)
  pollLobby() {
    if (!this.code || this.started) return;
    if (this.role === 'client') {
      const h = this.hostPeer(), lb = h && h.presence.lb;
      if (lb) { const vs = G.VS_MODES[lb.vs] ? lb.vs : null; if (vs !== this.vs) { this.vs = vs; this.myTeam = null; if (!vs) this.push({ tm: null }); this.changed(); } }
      this.ensureTeam();
      if (lb && lb.st && !(h.presence.s && h.presence.s.ph === 'o') && !(Array.isArray(h.presence.vs) && h.presence.vs[1])) {
        this.mapId = lb.m; this.type = lb.t; this.started = true;
        this.game.start(this.mapId, 'classic', this.type, null);
      }
    } else this.ensureTeam();
  }
  leave() {
    for (const o of this.others.values()) this.removeOther(o);
    this.others.clear(); this.clearPuppets();
    this.code = null; this.role = null; this.started = false; this.vs = null; this.myTeam = null;
    this.hOut = []; this.xOut = []; this.dOut = []; this.kOut = []; this.fxOut = []; this.shOut = []; this.peOut = []; this.pkOut = [];
    this.last = { d: 0, k: 0, fx: 0, sh: 0, w: 0, pe: 0 };
    this.push({ g: null, role: null, lb: null, me: null, s: null, h: null, x: null, car: null, wp: null, pk: null, tm: null, vs: null, sc: null, pv: null, dth: null });
    this.changed();
  }
  // fin de partie : on reste dans le salon pour relancer avec la même équipe
  backToRoom() {
    for (const o of this.others.values()) this.removeOther(o);
    this.others.clear(); this.clearPuppets();
    this.started = false;
    this.hOut = []; this.xOut = []; this.dOut = []; this.kOut = []; this.shOut = []; this.peOut = []; this.pkOut = [];
    if (this.role === 'host') this.push({ lb: this.lobbyInfo(0), s: null, me: null, x: null, car: null, wp: null, vs: null, sc: null, pv: null, dth: null });
    else this.push({ me: null, h: null, x: null, pk: null, car: null, wp: null, sc: null, pv: null, dth: null });
    this.changed();
  }
  dropPeer(peer) {
    const o = this.others.get(peer);
    if (o) { this.removeOther(o); this.others.delete(peer); }
    if (this.isClient && this.hostGone()) this.endForClient("L'hôte a quitté la partie");
  }
  hostGone() { return !this.hostPeer(); }

  // ---------- partie ----------
  onGameStart() {
    if (!this.code || !this.started) return;
    this.others.clear(); this.puppets.clear();
    this.hOut = []; this.xOut = []; this.dOut = []; this.kOut = []; this.shOut = []; this.peOut = []; this.pkOut = [];
    this.last = { d: 0, k: 0, fx: 0, sh: 0, w: 0, pe: 0 };
    this.seq = 0; this.hostGoneT = 0;
    if (this.vs) { this.vsStart(); return; }
    this.game.message(this.role === 'host' ? 'COOP — HÔTE' : 'COOP — INVITÉ', 'Partie ' + this.code.toUpperCase() + ' — ' + this.game.map.def.name + (this.role === 'host' ? '' : ' — cliquez dans l\'écran pour jouer'), 4);
  }
  update(dt) {
    if (!this.active) return;
    const g = this.game, pl = g.player;
    // les autres joueurs de la partie
    const seen = new Set();
    for (const p of this.peers) {
      if (p.sameTab || !p.presence || p.presence.g !== this.code) continue;
      seen.add(p.peer);
      let o = this.others.get(p.peer);
      if (!o) { o = this.addOther(p); this.others.set(p.peer, o); }
      o.tag = String(p.presence.id || '').slice(0, 8);
      this.syncOther(o, p.presence, dt);
      if (!o.enemy) o.avatar.update(dt); // les adversaires (VS) sont dans la liste des ennemis : déjà animés
    }
    for (const [peer, o] of this.others) if (!seen.has(peer)) { this.removeOther(o); this.others.delete(peer); }
    if (this.vs) this.vsTick(dt);
    else if (this.isHost) this.hostTick(dt); else this.clientTick(dt);
    // publication de notre état
    this.sendT -= dt;
    if (this.sendT <= 0) { this.sendT = this.isHost ? 1 / 12 : 1 / 15; this.publish(); }
    // fin de partie côté hôte : tout le monde à terre
    if (!this.vs && this.isHost && g.phase === 'active' && pl.dead && this.allDead()) g.gameOver();
  }
  publish() {
    const g = this.game, pl = g.player, r = (v) => Math.round(v * 100) / 100;
    const fl = (pl.dead ? 1 : 0) | (pl.crouch ? 2 : 0) | (pl.mouse.left && !pl.dead && pl.slot && pl.slot.mag > 0 ? 4 : 0);
    const v = pl.vehicle;
    const patch = {
      me: [r(pl.pos.x), r(pl.pos.y), r(pl.pos.z), r(pl.yaw), r(pl.pitch), fl, Math.max(0, Math.round(pl.hp / pl.maxHp * 100))],
      wp: pl.slot ? pl.slot.id : 'pistol',
      car: v ? [g.vehicles.indexOf(v), r(v.pos.x), r(v.pos.y), r(v.pos.z), r(v.yaw), Math.round(v.hp / v.maxHp * 100)] : 0,
    };
    patch.x = this.xOut.slice(-4);
    if (this.vs) {
      patch.sc = [this.score.k, this.score.d]; patch.pv = this.pvOut.slice(-16); patch.dth = this.dthOut.slice(-4);
      if (this.isHost) patch.vs = this.vsState;
    } else if (this.isHost) {
      // la présence entière doit tenir dans 4 Ko : on retire des ennemis (les plus lointains) si besoin
      const s = patch.s = this.snapshot();
      const size = () => JSON.stringify(Object.assign({}, this.mine, patch)).length;
      while (s.e.length > 4 && size() > 3900) s.e.length = Math.max(4, s.e.length - 3);
      if (size() > 3900) { s.sh = []; s.pj = []; }
    } else { patch.h = this.hOut.slice(-16); patch.pk = this.pkOut.slice(-4); }
    this.hSent = this.seq;
    this.push(patch);
  }

  // ---------- autres joueurs : avatar + (hôte) cible pour les ennemis ----------
  addOther(p) {
    const g = this.game, colors = [0x3a6ab0, 0xb08a2a, 0x8a3ab0, 0x2a9a7a];
    const pr = p.presence || {}, team = pr.tm === 0 || pr.tm === 1 ? pr.tm : null;
    const enemy = !!this.vs && !(this.vs === '2v2' && team === this.myTeam);
    const col = this.vs === '2v2' ? (team === 1 ? 0xb03a2a : 0x3a6ab0) : enemy ? [0xb03a2a, 0xb08a2a, 0x8a3ab0, 0x2a9a7a][[...this.others.keys()].length % 4] : colors[[...this.others.keys()].length % colors.length];
    const T = Object.assign({}, G.STYPES.rifleman, { shirt: col, pants: 0x2a2e36, skin: 0xd8a880, name: enemy ? 'Adversaire' : 'Équipier' });
    const pos = new THREE.Vector3(g.map.playerSpawn.x, g.map.playerSpawn.y, g.map.playerSpawn.z);
    const avatar = new G.Enemy(g, 'ally', pos, { T, avatar: true });
    // adversaire : nom caché derrière les murs, et cible pour nos tirs (liste des ennemis)
    const tag = this.nameTag(String(pr.nick || 'Équipier').slice(0, 16), enemy ? '#ff4a3a' : '#' + col.toString(16).padStart(6, '0'), !enemy);
    tag.position.set(0, 2.45, 0); avatar.mesh.add(tag);
    if (enemy) { avatar.vsPeer = p.peer; g.enemies.push(avatar); }
    const proxy = {
      isRemote: true, peer: p.peer, nick: '', pos: pos.clone(), eye: pos.clone().add(new THREE.Vector3(0, 1.62, 0)), vel: new THREE.Vector3(),
      yaw: 0, pitch: 0, hp: 100, dead: false, up: false, vehicle: null, field: null, spectator: false,
      lookDir() { return new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ')); },
    };
    const seqMax = (l) => (Array.isArray(l) ? l.reduce((m, x) => Math.max(m, Array.isArray(x) && Number.isFinite(x[0]) ? x[0] : 0), 0) : 0);
    return { peer: p.peer, avatar, tag, proxy, lastH: 0, lastX: 0, shotT: 0, color: col, carIdx: -1, enemy, team, lastPv: seqMax(pr.pv), lastDth: seqMax(pr.dth), k: 0, d: 0 };
  }
  nameTag(text, color, through = true) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = Math.min(250, ctx.measureText(text).width + 24);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(128 - w / 2, 12, w, 40);
    ctx.fillStyle = color; ctx.fillRect(128 - w / 2, 48, w, 4);
    ctx.fillStyle = '#ffffff'; ctx.fillText(text, 128, 32);
    const t = new THREE.CanvasTexture(c);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, depthTest: !through, fog: false }));
    s.scale.set(2.0, 0.5, 1); s.renderOrder = 10;
    return s;
  }
  removeOther(o) {
    const i = this.game.enemies.indexOf(o.avatar); if (i >= 0) this.game.enemies.splice(i, 1);
    if (o.avatar) o.avatar.remove();
    if (o.carIdx >= 0) this.freeCar(o.carIdx);
  }
  freeCar(i) {
    const v = this.game.vehicles[i]; if (!v) return;
    if (v.net && !v.dead) { v.pos.copy(v.net.pos); v.yaw = v.net.yaw; v.syncMesh(); v.updateSolid(); v.reblock(); }
    v.remote = null; v.net = null; v.speed = 0; if (v.driver) v.driver.visible = false;
  }
  syncOther(o, pr, dt) {
    const g = this.game, me = pr.me;
    o.nick = String(pr.nick || 'Équipier').slice(0, 16); o.proxy.nick = o.nick;
    if (Array.isArray(pr.sc)) { o.k = Math.max(0, Math.floor(+pr.sc[0] || 0)); o.d = Math.max(0, Math.floor(+pr.sc[1] || 0)); }
    if (!Array.isArray(me) || me.length < 7) return;
    const [x, y, z, yaw, pitch, fl, hp] = me.map(Number);
    if (![x, y, z, yaw, pitch].every(Number.isFinite)) return;
    const P = o.proxy, prev = P.pos.clone();
    P.pos.set(x, y, z); P.yaw = yaw; P.pitch = pitch; P.hp = hp;
    P.vel.copy(P.pos).sub(prev).multiplyScalar(1 / Math.max(dt, 0.016));
    if (P.vel.lengthSq() > 400) P.vel.set(0, 0, 0);
    const dead = !!(fl & 1), crouch = !!(fl & 2);
    P.eye.set(x, y + (crouch ? 1.05 : 1.62), z);
    if (dead !== P.dead) { P.dead = dead; o.avatar.dead = dead; o.avatar.deadT = 0; if (!dead) o.avatar.mesh.rotation.x = 0; }
    const ground = g.world.standAt(Math.floor(x), Math.floor(z));
    P.up = ground < 999 && y - ground > 3.5;
    o.avatar.net = { x, y, z, yaw: yaw + Math.PI, crouch };
    o.avatar.mesh.visible = !(Array.isArray(pr.car) && pr.car[0] >= 0);
    // voiture conduite par ce joueur : on déplace notre copie
    const car = pr.car;
    if (Array.isArray(car) && Number.isInteger(car[0]) && g.vehicles[car[0]]) {
      const v = g.vehicles[car[0]];
      if (o.carIdx !== car[0]) { if (o.carIdx >= 0) this.freeCar(o.carIdx); o.carIdx = car[0]; }
      if (g.player.vehicle !== v && [1, 2, 3, 4].every((i) => Number.isFinite(+car[i]))) {
        if (!v.remote) { v.net = null; v.speed = 0; }
        v.remote = o.peer;
        if (!v.net) v.net = { pos: new THREE.Vector3(), yaw: +car[4] };
        v.net.pos.set(+car[1], +car[2], +car[3]); v.net.yaw = +car[4];
        if (+car[5] <= 0 && !v.dead) v.explode();
      }
      P.vehicle = v.dead ? null : v;
    } else {
      if (o.carIdx >= 0) this.freeCar(o.carIdx);
      o.carIdx = -1; P.vehicle = null;
    }
    // tirs de l'équipier : éclair, traçante et son
    o.shotT -= dt;
    if ((fl & 4) && !dead && o.shotT <= 0) {
      const W = G.WEAPONS[pr.wp] || G.WEAPONS.rifle;
      o.shotT = Math.max(0.09, 60 / (W.rpm || 400));
      o.avatar.vsSeen = g.time + 1.5; // un adversaire qui tire apparaît sur la minimap
      const dir = P.lookDir(), from = P.eye.clone().addScaledVector(dir, 0.6);
      const hit = g.world.raycast(from.x, from.y, from.z, dir.x, dir.y, dir.z, 60);
      g.tracer(from, from.clone().addScaledVector(dir, hit ? hit.dist : 60), 0xfff0b0);
      G.Audio.S.shotAt(W.sound || pr.wp || 'rifle', from);
    }
    // explosions de l'équipier (ses grenades)
    for (const e of Array.isArray(pr.x) ? pr.x : []) if (Array.isArray(e) && e[0] > o.lastX) { o.lastX = e[0]; g.boom(new THREE.Vector3(+e[1], +e[2], +e[3]), 0xff8030); G.Audio.S.explosion(new THREE.Vector3(+e[1], +e[2], +e[3])); }
  }
  // cible la plus proche pour un ennemi (hôte) : nous ou un équipier vivant
  nearestTarget(pos) {
    const pl = this.game.player;
    let best = pl.dead ? null : pl, bd = pl.dead ? Infinity : pl.pos.distanceToSquared(pos);
    for (const o of this.others.values()) { const P = o.proxy; if (P.dead) continue; const d = P.pos.distanceToSquared(pos); if (d < bd) { bd = d; best = P; } }
    return best;
  }
  allDead() { if (!this.game.player.dead) return false; for (const o of this.others.values()) if (!o.proxy.dead) return false; return true; }
  aliveTeammate() { for (const o of this.others.values()) if (!o.proxy.dead) return o; return null; }

  // ---------- hôte ----------
  hostTick(dt) {
    const g = this.game;
    // champ de navigation vers chaque équipier (les ennemis qui le ciblent le suivent)
    this.fieldT -= dt;
    if (this.fieldT <= 0) {
      this.fieldT = 0.4;
      for (const o of this.others.values()) {
        const P = o.proxy; if (P.dead) { P.field = null; continue; }
        const id = g.world.nodeNear(P.pos.x, P.pos.y, P.pos.z);
        if (id >= 0) P.field = g.world.fieldTo(id);
      }
    }
    // touches et explosions déclarées par les invités
    const byNid = new Map(); for (const e of g.enemies) if (!e.dead) byNid.set(e.nid, e);
    for (const p of this.peers) {
      const pr = p.presence; if (!pr || pr.g !== this.code || p.sameTab) continue;
      const o = this.others.get(p.peer); if (!o) continue;
      const list = Array.isArray(pr.h) ? pr.h : [];
      let maxSeq = o.lastH;
      for (const h of list) {
        if (!Array.isArray(h) || !(h[0] > o.lastH)) continue;
        maxSeq = Math.max(maxSeq, h[0]);
        const e = byNid.get(h[1]); if (!e || e.dead) continue;
        let dmg = G.clamp(+h[2] || 0, 0, 20000);
        if (g.power.insta > 0 && !e.isBoss) dmg = e.hp + e.helmet + 1;
        e.lastBy = p.peer;
        g.damageEnemyNet(e, dmg, h[3] ? 'head' : 'body', h[4] || 'gun');
      }
      o.lastH = maxSeq;
      // bonus ramassés par l'invité : effet pour toute l'équipe
      for (const k of Array.isArray(pr.pk) ? pr.pk : []) {
        if (!Array.isArray(k) || !(k[0] > (o.lastPk || 0))) continue;
        o.lastPk = k[0];
        const i = g.powerups.findIndex((q) => q.id === k[1]);
        if (i < 0) continue;
        const pu = g.powerups[i];
        g.applyPowerup(pu.type); this.powerEvent(pu.type);
        pu.drop = true; pu.t = pu.life + 1;
      }
    }
  }
  powerEvent(type) { if (!this.isHost) return; this.peOut.push([++this.seq, type]); if (this.peOut.length > 4) this.peOut.shift(); }
  claimPowerup(id) {
    const g = this.game, i = g.powerups.findIndex((q) => q.id === id); if (i < 0) return;
    g.powerups[i].drop = true; g.powerups[i].t = g.powerups[i].life + 1; // disparaît tout de suite chez nous ; l'hôte applique l'effet
    this.pkOut.push([++this.seq, id]); if (this.pkOut.length > 4) this.pkOut.shift();
  }
  queueDamage(peer, amount, src) { if (amount < 0.5) return; this.dOut.push([++this.seq, this.tagOf(peer), Math.round(amount), src && src.nid ? src.nid : 0]); if (this.dOut.length > 10) this.dOut.shift(); }
  creditKill(peer, pts, head) { this.kOut.push([++this.seq, this.tagOf(peer), Math.round(pts), head ? 1 : 0]); if (this.kOut.length > 10) this.kOut.shift(); }
  recordFx(pos) { if (!this.active) return; const r = (v) => Math.round(v * 10) / 10; this.xOut.push([++this.seq, r(pos.x), r(pos.y), r(pos.z)]); if (this.xOut.length > 6) this.xOut.shift(); }
  recordShot(e, target, hit) { if (!this.isHost) return; this.shOut.push([++this.seq, e.nid, target && target.isRemote ? this.tagOf(target.peer) : '', hit ? 1 : 0]); if (this.shOut.length > 8) this.shOut.shift(); }
  snapshot() {
    const g = this.game, r = (v) => Math.round(v * 10) / 10;
    // ennemis les plus proches d'un joueur (taille de message limitée)
    const players = [g.player.pos, ...[...this.others.values()].map((o) => o.proxy.pos)];
    const list = g.enemies.filter((e) => !e.dead || e.deadT < 0.6).map((e) => ({ e, d: Math.min(...players.map((p) => p.distanceToSquared(e.pos))) })).sort((a, b) => a.d - b.d).slice(0, 30);
    const en = list.map(({ e }) => [e.nid, e.isBoss ? e.T.id : e.type, r(e.pos.x), r(e.pos.y), r(e.pos.z), Math.round(e.mesh.rotation.y * 100) / 100, Math.max(0, Math.round(e.hp / e.maxHp * 100)), (e.dead ? 1 : 0) | (e.crouching ? 2 : 0) | (e.isBoss ? 4 : 0) | (e.elite ? 8 : 0)]);
    const pj = g.projectiles.filter((p) => p.owner !== 'player').slice(0, 6).map((p) => [p.type, r(p.pos.x), r(p.pos.y), r(p.pos.z), r(p.vel.x), r(p.vel.y), r(p.vel.z)]);
    return {
      w: g.wave, ph: g.phase === 'active' ? 'a' : g.phase === 'over' ? 'o' : 'i', t: Math.ceil(g.phaseT || 0), l: (g.toSpawn || 0) + g.aliveCount(),
      br: r(g.borderR || 0), b: g.boss && !g.boss.dead ? g.boss.nid : 0,
      e: en, pj, d: this.dOut.slice(-10), k: this.kOut.slice(-10), sh: this.shOut.slice(-8), pe: this.peOut.slice(-4),
      pu: g.powerups.filter((p) => !p.drop).slice(0, 6).map((p) => [p.id, p.type, r(p.base.x), r(p.base.y), r(p.base.z)]),
    };
  }

  // ---------- invité ----------
  clientTick(dt) {
    const g = this.game, h = this.hostPeer();
    if (!h) { this.hostGoneT = (this.hostGoneT || 0) + dt; if (this.hostGoneT > 4) this.endForClient("L'hôte a quitté la partie"); return; }
    this.hostGoneT = 0;
    const s = h.presence.s;
    if (!s || typeof s !== 'object') return;
    // vague, phase, zone
    const ph = s.ph === 'a' ? 'active' : s.ph === 'o' ? g.phase : 'intermission';
    if (Number.isFinite(s.w) && s.w > g.wave) {
      g.wave = this.last.w = s.w;
      if (ph === 'active') {
        g.curWave = { n: s.w, t0: g.time, kills: 0, hs: 0, dmgTaken: 0, pts: 0, boss: null, specials: 0 };
        this.onWaveStart();
        { g.message('VAGUE ' + s.w, s.w % 5 === 0 ? '⚠ UN BOSS APPROCHE ⚠' : 'Tenez bon, ensemble !', 3); if (s.w % 5 === 0) G.Audio.S.boss(); else G.Audio.S.waveStart(); }
      }
    }
    if (g.phase === 'active' && ph === 'intermission') {
      if (g.curWave) { g.curWave.t = g.time - g.curWave.t0; g.waveStats.push(g.curWave); g.curWave = null; }
      g.player.grenades = Math.min(4, g.player.grenades + 2);
      G.Audio.S.waveEnd();
      g.message('VAGUE ' + g.wave + ' TERMINÉE', '+2 grenades — 30 s pour se préparer (l\'hôte peut lancer la suite avec [N])', 4);
    }
    g.phase = ph;
    g.phaseT = +s.t || 0;
    g.toSpawn = Math.max(0, (+s.l || 0) - g.aliveCount());
    if (Number.isFinite(s.br) && s.br > 0 && Math.abs((g.borderR || 0) - s.br) > 0.05) { g.borderR = g.borderTarget = s.br; g.layoutBorder(); }
    if (s.ph === 'o' && g.phase !== 'over') { g.coopFinal = true; g.gameOver(); return; }
    // ennemis
    const seen = new Set();
    for (const it of Array.isArray(s.e) ? s.e : []) {
      if (!Array.isArray(it) || it.length < 8) continue;
      const [nid, type, x, y, z, yaw, hp, fl] = it;
      if (!Number.isFinite(nid)) continue;
      seen.add(nid);
      let e = this.puppets.get(nid);
      if (!e) {
        const bossT = (fl & 4) ? (G.BOSSES.find((b) => b.id === type) || G.SBOSSES.find((b) => b.id === type)) : null;
        if (!bossT && !G.ZTYPES[type] && !G.STYPES[type]) continue;
        if (fl & 1) continue;
        e = new G.Enemy(g, String(type), new THREE.Vector3(+x, +y, +z), bossT ? { boss: bossT, hpScale: 1, cycle: 0, puppet: true, nid, elite: false } : { puppet: true, nid, elite: !!(fl & 8) });
        e.mesh.rotation.y = +yaw || 0;
        this.puppets.set(nid, e); g.enemies.push(e);
      }
      e.net = { x: +x, y: +y, z: +z, yaw: +yaw || 0, crouch: !!(fl & 2) };
      e.hp = Math.max(1, (+hp || 0) / 100 * e.maxHp);
      if ((fl & 1) && !e.dead && e.isBoss) { g.stats.bosses++; g.message(e.T.name + ' EST TOMBÉ', 'Bien joué, l\'équipe !', 3); g.shake(0.8); }
      if ((fl & 1) && !e.dead) { e.dead = true; e.deadT = 0; G.Audio.S.death(e.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), e.isBoss ? 'boss' : e.soldier ? 'soldier' : 'zombie', e.voicePitch || 1); }
      e.missT = 0;
    }
    for (const [nid, e] of this.puppets) {
      if (seen.has(nid)) continue;
      e.missT = (e.missT || 0) + dt;
      if (e.missT > 1.2 && !e.dead) { e.dead = true; e.deadT = 1.4; }
      if (e.dead && e.deadT >= 2.3) this.puppets.delete(nid);
    }
    g.boss = s.b ? this.puppets.get(s.b) || null : null;
    // bonus au sol et bonus ramassés (effet pour toute l'équipe)
    const want = new Map(); for (const p of Array.isArray(s.pu) ? s.pu : []) if (Array.isArray(p) && G.POWERUPS[p[1]]) want.set(p[0], p);
    for (const pu of g.powerups) if (!want.has(pu.id) && !pu.drop) { pu.drop = true; pu.t = 1e9; }
    for (const [id, p] of want) if (!g.powerups.some((q) => q.id === id) && !this.pkOut.some((k) => k[1] === id)) g.spawnPowerup(p[1], new THREE.Vector3(+p[2], +p[3], +p[4]), id);
    for (const pe of Array.isArray(s.pe) ? s.pe : []) {
      if (!Array.isArray(pe) || !(pe[0] > this.last.pe)) continue;
      const fresh = this.last.pe > 0 || this.peReady; this.last.pe = pe[0];
      if (fresh && G.POWERUPS[pe[1]]) g.applyPowerup(pe[1]);
    }
    this.peReady = true;
    // projectiles ennemis (affichage)
    this.syncProjectiles(Array.isArray(s.pj) ? s.pj : [], dt);
    // dégâts qui nous visent
    for (const d of Array.isArray(s.d) ? s.d : []) {
      if (!Array.isArray(d) || !(d[0] > this.last.d)) continue;
      this.last.d = Math.max(this.last.d, d[0]);
      if (d[1] === this.tag && !g.player.dead) g.damagePlayer(G.clamp(+d[2] || 0, 0, 500), this.puppets.get(d[3]) || null);
    }
    // éliminations qui nous reviennent
    for (const k of Array.isArray(s.k) ? s.k : []) {
      if (!Array.isArray(k) || !(k[0] > this.last.k)) continue;
      this.last.k = Math.max(this.last.k, k[0]);
      if (k[1] !== this.tag) continue;
      g.stats.kills++; if (k[3]) g.stats.headshots++;
      if (g.curWave) { g.curWave.kills++; if (k[3]) g.curWave.hs++; }
      g.addPoints(G.clamp(+k[2] || 0, 0, 10000), k[3] ? 'TÊTE' : null);
      G.UI.hitmarker(true, !!k[3]); G.Audio.S.kill();
    }
    // tirs ennemis : traçante et son
    for (const sh of Array.isArray(s.sh) ? s.sh : []) {
      if (!Array.isArray(sh) || !(sh[0] > this.last.sh)) continue;
      this.last.sh = Math.max(this.last.sh, sh[0]);
      const e = this.puppets.get(sh[1]); if (!e || e.dead) continue;
      const tp = sh[2], ho = this.others.get(h.peer);
      const ot = tp ? [...this.others.values()].find((o) => o.tag === tp) : null;
      const tgt = tp === this.tag ? g.player.eye : ot ? ot.proxy.eye : ho ? ho.proxy.eye : g.player.eye;
      const from = e.soldier ? e.muzzlePos() : e.headPos();
      const end = sh[3] ? tgt.clone() : tgt.clone().add(new THREE.Vector3(G.rand(-1, 1), G.rand(-0.5, 1), G.rand(-1, 1)));
      g.tracer(from, end, 0xffb060);
      G.Audio.S.shotAt(e.T.sound || 'rifle', from);
    }
    // explosions côté hôte
    for (const x of Array.isArray(h.presence.x) ? h.presence.x : []) if (Array.isArray(x) && x[0] > this.last.fx) { this.last.fx = x[0]; const p = new THREE.Vector3(+x[1], +x[2], +x[3]); g.boom(p, 0xff8030); G.Audio.S.explosion(p); }
  }
  syncProjectiles(list, dt) {
    const g = this.game;
    this.pjMeshes = this.pjMeshes || [];
    while (this.pjMeshes.length > list.length) { const m = this.pjMeshes.pop(); g.scene.remove(m.mesh); m.mesh.geometry.dispose(); m.mesh.material.dispose(); }
    list.forEach((p, i) => {
      if (!Array.isArray(p)) return;
      let m = this.pjMeshes[i];
      if (!m || m.type !== p[0]) {
        if (m) { g.scene.remove(m.mesh); m.mesh.geometry.dispose(); m.mesh.material.dispose(); }
        const size = p[0] === 'boulder' ? 0.7 : 0.25, col = p[0] === 'spit' ? 0x80ff40 : p[0] === 'orb' ? 0xb050ff : p[0] === 'boulder' ? 0x7d7a74 : 0x5a3a2a;
        m = { type: p[0], mesh: new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshLambertMaterial({ color: col, emissive: p[0] === 'orb' ? 0x5020a0 : 0 })), key: '' };
        g.scene.add(m.mesh); this.pjMeshes[i] = m;
      }
      const key = p.join(',');
      if (key !== m.key) { m.key = key; m.pos = new THREE.Vector3(+p[1], +p[2], +p[3]); m.vel = new THREE.Vector3(+p[4], +p[5], +p[6]); }
      else { m.vel.y -= (p[0] === 'orb' ? 0 : 18) * dt; m.pos.addScaledVector(m.vel, dt); }
      m.mesh.position.copy(m.pos); m.mesh.rotation.x += dt * 6;
    });
  }
  // touche détectée chez l'invité : envoyée à l'hôte qui l'applique
  claimHit(e, dmg, part, src) {
    if (this.game.power.insta > 0 && !e.isBoss) dmg = 20000;
    const last = this.hOut[this.hOut.length - 1];
    // plusieurs plombs sur la même cible entre deux envois : une seule ligne
    if (last && last[1] === e.nid && last[0] > (this.hSent || 0)) { last[2] += Math.round(dmg); last[3] = last[3] || (part === 'head' ? 1 : 0); e.flash = 0.09; return; }
    this.hOut.push([++this.seq, e.nid, Math.round(dmg), part === 'head' ? 1 : 0, src === 'melee' ? 'melee' : src === 'car' ? 'car' : src === 'explosive' ? 'explosive' : 'gun']);
    if (this.hOut.length > 16) this.hOut.shift();
    e.flash = 0.09;
  }
  clearPuppets() { for (const e of this.puppets.values()) e.dead = true; this.puppets.clear(); if (this.pjMeshes) for (const m of this.pjMeshes) this.game.scene.remove(m.mesh); this.pjMeshes = []; }
  endForClient(msg) {
    const g = this.game;
    if (!this.isClient || g.phase === 'over' || g.phase === 'menu') return;
    G.UI.message('', msg, 3, '#ffa060');
    g.coopFinal = true; g.gameOver();
  }

  // ---------- à terre / retour ----------
  downed() {
    const g = this.game, pl = g.player;
    pl.dead = true; pl.hp = 0; pl.vehicle && g.exitVehicle(true);
    g.message('À TERRE', 'Vous revenez à la prochaine vague — vos équipiers doivent tenir !', 4, '#ff6060');
    G.Audio.S.playerDeath();
  }
  onWaveStart() {
    const g = this.game, pl = g.player;
    if (!pl.dead) return;
    pl.dead = false; pl.hp = pl.maxHp; pl.armor = 0;
    const o = this.aliveTeammate();
    const at = o ? o.proxy.pos : g.map.playerSpawn;
    const y = g.world.standBelow(Math.floor(at.x), at.y + 1, Math.floor(at.z));
    pl.pos.set(at.x, y < 999 ? y : at.y, at.z); pl.vel.set(0, 0, 0); pl.camY = pl.pos.y + pl.eyeH;
    g.message('DE RETOUR', 'Vous rejoignez votre équipe', 2.5, '#60ff90');
  }
  // caméra quand on est à terre : derrière un équipier vivant
  spectate(cam, dt) {
    const g = this.game;
    let o = this.vs ? (this.killerPeer && this.others.get(this.killerPeer)) : this.aliveTeammate();
    if (o && o.proxy.dead) o = null;
    const target = o ? o.proxy.pos.clone().add(new THREE.Vector3(0, 1.4, 0)) : (this.vs && this.deathPos ? this.deathPos.clone() : g.player.pos.clone()).add(new THREE.Vector3(0, 1.4, 0));
    this.specA = (this.specA || 0) + dt * 0.25;
    const want = target.clone().add(new THREE.Vector3(Math.sin(this.specA) * 6, 3.2, Math.cos(this.specA) * 6));
    const d = want.clone().sub(target), L = d.length(); d.normalize();
    const hit = g.world.raycast(target.x, target.y, target.z, d.x, d.y, d.z, L);
    if (hit && hit.dist < L) want.copy(target).addScaledVector(d, Math.max(1, hit.dist - 0.3));
    cam.position.lerp(want, Math.min(1, dt * 4)); cam.lookAt(target);
  }
  // ---------- VS : 1v1, chacun pour soi, 2v2 ----------
  vsStart() {
    const g = this.game, pl = g.player, M = G.VS_MODES[this.vs];
    g.vs = this.vs;
    g.wave = 99; g.phase = 'active'; g.phaseT = 0; g.toSpawn = 0; g.points = 1500; // toutes les stations ouvertes, pas de vagues
    this.score = { k: 0, d: 0 }; this.pvOut = []; this.dthOut = []; this.lastHitBy = null; this.killerPeer = null;
    this.respawnT = 0; this.protectT = 3; this.vsTime = M.time; this.vsState = [M.time, 0, '']; this.vsEndT = 0;
    // zone de combat resserrée
    g.borderR = g.borderTarget = Math.min(g.borderFull, M.zone); g.layoutBorder();
    this.vsSpots = this.vsSpawnSpots();
    // départ : chacun à un coin différent (ordre fixe des étiquettes)
    const mates = this.members(this.code).filter((p) => !p.sameTab && (this.vs !== '2v2' || p.presence.tm === this.myTeam));
    const tags = [this.tag, ...mates.map((p) => String(p.presence.id || ''))].sort();
    const i = Math.max(0, tags.indexOf(this.tag));
    let sp;
    if (this.vs === '2v2') {
      // chaque équipe part de son côté, les équipiers côte à côte
      const base = this.vsStartSpots[this.myTeam === 1 ? 1 : 0];
      const near = this.vsSpots.filter((p) => p.distanceTo(base) > 4 && p.distanceTo(base) < 11).sort((a, b) => a.distanceTo(base) - b.distanceTo(base));
      sp = i === 0 || !near.length ? base : near[Math.min(near.length - 1, (i - 1) * 2)];
    } else sp = this.vsStartSpots[i % this.vsStartSpots.length];
    sp = sp || g.map.playerSpawn;
    pl.pos.copy(sp); pl.vel.set(0, 0, 0); pl.camY = pl.pos.y + pl.eyeH;
    pl.yaw = Math.atan2(-(g.borderC.x - sp.x), -(g.borderC.y - sp.z)); pl.pitch = 0;
    // arrivée en cours de manche : on se place loin des adversaires dès qu'on les voit
    const h = this.role === 'client' ? this.hostPeer() : null;
    this.lateSpawnT = h && Array.isArray(h.presence.vs) && +h.presence.vs[0] < M.time - 5 ? 0.6 : 0;
    g.message(M.name.toUpperCase(), M.goal + ' — ' + g.map.def.name + (this.role === 'host' ? '' : ' — cliquez dans l\'écran pour jouer'), 4);
    G.Audio.S.waveStart();
  }
  // points d'apparition : au sol, dans la zone, accessibles (même liste chez tout le monde : carte identique)
  vsSpawnSpots() {
    const g = this.game, w = g.world, c = g.borderC, R = g.borderR - 3, y0 = g.map.playerSpawn.y;
    const out = [], ok = (x, y, z) => {
      if (y >= 999 || Math.abs(x + 0.5 - c.x) > R || Math.abs(z + 0.5 - c.y) > R || Math.abs(y - y0) > 6) return false;
      const b = w.blockAt(x, y + 0.5, z), b2 = w.blockAt(x, y - 0.5, z);
      if (b === G.B.WATER || b === G.B.LAVA || b === G.B.LAVA_FLOW || b2 === G.B.LAVA || b2 === G.B.LAVA_FLOW) return false;
      if (w.collides(x + 0.5, y, z + 0.5, 0.35, 1.8, 'player')) return false;
      return w.flowDistAt(x + 0.5, y, z + 0.5) >= 0;
    };
    for (const [x, y, z] of g.map.spawns || []) if (ok(x, y, z)) out.push(new THREE.Vector3(x + 0.5, y, z + 0.5));
    for (let z = Math.floor(c.y - R); z <= c.y + R; z += 3) for (let x = Math.floor(c.x - R); x <= c.x + R; x += 3) {
      const y = w.standBelow(x, y0 + 2.5, z); if (ok(x, y, z)) out.push(new THREE.Vector3(x + 0.5, y, z + 0.5));
    }
    if (!out.length) out.push(g.map.playerSpawn.clone());
    // 4 départs éloignés les uns des autres (tirage du point le plus loin)
    const start = [out.reduce((b, p) => (p.x + p.z < b.x + b.z ? p : b), out[0])];
    while (start.length < 4) start.push(out.reduce((b, p) => (Math.min(...start.map((q) => q.distanceTo(p))) > Math.min(...start.map((q) => q.distanceTo(b))) ? p : b), out[0]));
    this.vsStartSpots = start;
    return out;
  }
  vsRespawn(quiet) {
    const g = this.game, pl = g.player, foes = [...this.others.values()].filter((o) => o.enemy && !o.proxy.dead).map((o) => o.proxy.pos);
    const cands = [];
    for (let i = 0; i < 40; i++) {
      const p = G.pick(this.vsSpots), d = foes.length ? Math.min(...foes.map((f) => f.distanceTo(p))) : G.rand(10, 30);
      const seen = foes.some((f) => f.distanceTo(p) < 40 && g.world.lineOfSight(f.clone().add(new THREE.Vector3(0, 1.6, 0)), p.clone().add(new THREE.Vector3(0, 1.6, 0))));
      cands.push({ p, k: d - (seen ? 25 : 0) + Math.random() * 4 });
    }
    cands.sort((a, b) => b.k - a.k);
    const sp = cands[0].p;
    pl.dead = false; pl.hp = pl.maxHp; pl.armor = 0; pl.grenades = 2; pl.refillAmmo(); pl.slideT = 0; pl.crouch = false;
    pl.pos.copy(sp); pl.vel.set(0, 0, 0); pl.camY = pl.pos.y + pl.eyeH; pl.pitch = 0;
    pl.yaw = Math.atan2(-(g.borderC.x - sp.x), -(g.borderC.y - sp.z));
    this.protectT = 2.5; this.lastHitBy = null; this.killerPeer = null;
    if (!quiet) g.message('', 'De retour au combat — protégé 2 s', 1.5, '#60ff90');
  }
  vsTick(dt) {
    const g = this.game, pl = g.player, M = G.VS_MODES[this.vs];
    this.protectT -= dt;
    if (this.lateSpawnT > 0) { this.lateSpawnT -= dt; if (this.lateSpawnT <= 0 && !pl.dead) this.vsRespawn(true); }
    if (pl.dead && g.phase === 'active') { this.respawnT -= dt; if (this.respawnT <= 0) this.vsRespawn(); }
    // touches reçues, éliminations et fil des morts
    for (const o of this.others.values()) {
      const pr = (this.peers.find((p) => p.peer === o.peer) || {}).presence || {};
      for (const h of Array.isArray(pr.pv) ? pr.pv : []) {
        if (!Array.isArray(h) || !(h[0] > o.lastPv)) continue;
        o.lastPv = h[0];
        if (h[1] !== this.tag || pl.dead || this.protectT > 0 || g.phase !== 'active' || !o.enemy) continue;
        this.lastHitBy = { peer: o.peer, tag: o.tag, t: g.time, head: !!h[3] };
        g.damagePlayer(G.clamp(+h[2] || 0, 0, 400), { pos: o.proxy.pos, vsBy: o.tag });
      }
      for (const d of Array.isArray(pr.dth) ? pr.dth : []) {
        if (!Array.isArray(d) || !(d[0] > o.lastDth)) continue;
        o.lastDth = d[0];
        const killer = d[1] === this.tag ? 'Vous' : this.nickOfTag(d[1]);
        G.UI.feed(killer ? killer + ' <b>⟶</b> ' + G.esc(o.nick) + (d[2] ? ' ☠' : '') : G.esc(o.nick) + ' est mort', d[1] === this.tag ? '#f2c443' : null);
        if (d[1] === this.tag && o.enemy) {
          this.score.k++;
          g.stats.kills++; if (d[2]) g.stats.headshots++;
          g.addPoints(d[2] ? 300 : 250, d[2] ? 'TÊTE' : 'ÉLIMINATION');
          G.UI.hitmarker(true, !!d[2]); G.Audio.S.kill();
        }
      }
    }
    // arbitrage par l'hôte : score à atteindre ou fin du temps
    if (this.isHost && g.phase === 'active') {
      this.vsTime -= dt;
      const st = this.standings(), lim = M.limit;
      let win = null;
      if (this.vs === '2v2') { const t = [0, 0]; for (const r of st) if (r.team === 0 || r.team === 1) t[r.team] += r.k; if (t[0] >= lim) win = 't0'; else if (t[1] >= lim) win = 't1'; else if (this.vsTime <= 0) win = t[0] > t[1] ? 't0' : t[1] > t[0] ? 't1' : ''; }
      else { const top = st[0]; if (top && top.k >= lim) win = top.tag; else if (this.vsTime <= 0) win = st.length > 1 && st[0].k === st[1].k ? '' : (top ? top.tag : ''); }
      this.vsState = [Math.max(0, Math.ceil(this.vsTime)), 0, ''];
      if (win !== null) this.vsFinish(win, 1);
    } else if (!this.isHost) {
      const h = this.hostPeer();
      if (!h) { this.hostGoneT = (this.hostGoneT || 0) + dt; if (this.hostGoneT > 4) this.endForClient("L'hôte a quitté la partie"); return; }
      this.hostGoneT = 0;
      const v = h.presence.vs;
      if (Array.isArray(v)) { this.vsState = [+v[0] || 0, +v[1] || 0, String(v[2] || '')]; if (this.vsState[1] && g.phase === 'active') { g.coopFinal = true; g.gameOver('vs'); } }
    }
  }
  vsFinish(win, code) {
    if (!this.isHost) return;
    this.vsState = [Math.max(0, Math.ceil(this.vsTime)), code, win];
    this.publish();
    const g = this.game;
    if (g.phase === 'active') { g.coopFinal = true; g.gameOver('vs'); }
  }
  // tir qui touche un adversaire : la touche est envoyée à la victime, qui l'applique chez elle
  vsHit(e, dmg, part, src) {
    const g = this.game, o = this.others.get(e.vsPeer);
    if (!o || o.proxy.dead || g.player.dead) return;
    let d = dmg * 0.6;
    if (src === 'melee') d = 70;
    else if (src === 'explosive' || src === 'shock') d = Math.min(dmg * 0.25, 110);
    else if (src === 'car') d = Math.min(dmg * 0.2, 150);
    else if (part === 'head') d = Math.min(d, 160);
    else if (!(g.player.slot && (g.player.slot.id === 'sniper' || g.player.slot.id === 'ray'))) d = Math.min(d, 95);
    this.vsSend(o, d, part === 'head', src);
    g.stats.dmgDealt += d;
    if (src === 'gun' || src === 'melee' || src === 'energy') g.addPoints(10);
    G.UI.hitmarker(false, part === 'head');
    if (part === 'head') G.Audio.S.headshot(); else G.Audio.S.hit();
    e.flash = 0.09;
  }
  vsCarHit(peer, n) { const o = this.others.get(peer); if (o && o.enemy && !o.proxy.dead) this.vsSend(o, n / 1.2, false, 'gun'); }
  vsSend(o, d, head, src) {
    const last = this.pvOut[this.pvOut.length - 1];
    if (last && last[1] === o.tag && last[0] > (this.hSent || 0)) { last[2] += Math.round(d); last[3] = last[3] || (head ? 1 : 0); return; }
    this.pvOut.push([++this.seq, o.tag, Math.round(d), head ? 1 : 0, src === 'melee' ? 'm' : src === 'car' ? 'c' : src === 'explosive' ? 'x' : 'g']);
    if (this.pvOut.length > 16) this.pvOut.shift();
  }
  // nous tombons : mort comptée, tueur annoncé, réapparition dans 4 s
  vsDied() {
    const g = this.game, pl = g.player;
    pl.dead = true; pl.hp = 0; if (pl.vehicle) g.exitVehicle(true);
    this.score.d++;
    const kb = this.lastHitBy && g.time - this.lastHitBy.t < 8 ? this.lastHitBy : null;
    this.dthOut.push([++this.seq, kb ? kb.tag : '', kb && kb.head ? 1 : 0]); if (this.dthOut.length > 4) this.dthOut.shift();
    this.respawnT = 4; this.deathPos = pl.pos.clone(); this.killerPeer = kb ? kb.peer : null;
    const kn = kb ? this.nickOfTag(kb.tag) : '';
    G.UI.feed(kn ? kn + ' <b>⟶</b> Vous' + (kb.head ? ' ☠' : '') : 'Vous êtes mort', '#ff6050');
    g.message('ÉLIMINÉ', kn ? 'par ' + kn + ' — réapparition dans 4 s' : 'Réapparition dans 4 s', 3, '#ff6060');
    G.Audio.S.death(pl.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), 'soldier', 1);
    this.lastHitBy = null;
    this.publish();
  }
  nickOfTag(tag) {
    if (!tag) return '';
    if (tag === this.tag) return G.esc(this.nick());
    for (const o of this.others.values()) if (o.tag === tag) return G.esc(o.nick || 'Joueur');
    return 'Joueur';
  }
  // classement de la partie (nous compris)
  standings() {
    const rows = [{ tag: this.tag, nick: this.nick(), k: this.score ? this.score.k : 0, d: this.score ? this.score.d : 0, team: this.myTeam, me: true, color: this.vs === '2v2' ? (this.myTeam === 1 ? '#ff5a4a' : '#5a9aff') : '#f2c443' }];
    for (const o of this.others.values()) rows.push({ tag: o.tag, nick: o.nick || 'Joueur', k: o.k, d: o.d, team: o.team, me: false, enemy: o.enemy, color: '#' + o.color.toString(16).padStart(6, '0') });
    return rows.sort((a, b) => b.k - a.k || a.d - b.d);
  }
  vsSummary(reason) {
    const st = this.standings(), M = G.VS_MODES[this.vs], [, code, win] = this.vsState || [0, 0, ''];
    let res = 'draw';
    if (!code) res = 'stopped';
    else if (code === 2) res = 'stopped';
    else if (this.vs === '2v2') res = win === '' ? 'draw' : win === 't' + this.myTeam ? 'win' : 'lose';
    else res = win === '' ? 'draw' : win === this.tag ? 'win' : 'lose';
    const teams = this.vs === '2v2' ? [0, 1].map((t) => st.filter((r) => r.team === t).reduce((a, r) => a + r.k, 0)) : null;
    return { mode: this.vs, name: M.name, res, standings: st, teams, myTeam: this.myTeam, map: this.game.map.def.name, abandon: reason === 'abandon', hostLeft: !this.isHost && !this.hostPeer() };
  }
  // bandeau du haut en VS
  vsHud() {
    if (!this.vs || !this.score) return null;
    const M = G.VS_MODES[this.vs], t = this.isHost ? Math.max(0, Math.ceil(this.vsTime)) : (this.vsState ? this.vsState[0] : M.time);
    const st = this.standings();
    let score;
    if (this.vs === '2v2') {
      const s = [0, 0]; for (const r of st) if (r.team === 0 || r.team === 1) s[r.team] += r.k;
      score = '<span style="color:#5a9aff">BLEUS ' + s[0] + '</span> — <span style="color:#ff5a4a">' + s[1] + ' ROUGES</span>';
    } else if (this.vs === '1v1') {
      const opp = st.find((r) => !r.me);
      score = 'Vous ' + this.score.k + ' — ' + (opp ? opp.k + ' ' + G.esc(opp.nick) : '0 …');
    } else {
      const rank = st.findIndex((r) => r.me) + 1;
      score = 'Vous ' + this.score.k + ' — ' + (rank === 1 ? '1er' : rank + 'e — en tête : ' + G.esc(st[0].nick) + ' ' + st[0].k);
    }
    return { score, time: G.fmtTime(t), goal: 'Premier à ' + M.limit + (this.vs === '2v2' ? ' (équipe)' : ''), dead: this.game.player.dead ? Math.ceil(this.respawnT) : 0 };
  }

  // liste affichée dans le HUD
  team() {
    if (this.vs) return this.standings().map((r) => {
      const o = r.me ? null : [...this.others.values()].find((x) => x.tag === r.tag);
      const dead = r.me ? this.game.player.dead : !!(o && o.proxy.dead);
      const hp = r.me ? Math.round(this.game.player.hp / this.game.player.maxHp * 100) : o && !o.enemy ? o.proxy.hp : null;
      return { nick: r.nick + (r.me ? ' (vous)' : ''), hp, dead, color: r.color, kd: r.k + ' / ' + r.d, enemy: !!r.enemy };
    });
    const out = [{ nick: this.nick() + ' (vous)', hp: Math.round(this.game.player.hp / this.game.player.maxHp * 100), dead: this.game.player.dead, color: '#f2c443' }];
    for (const o of this.others.values()) out.push({ nick: o.nick || 'Équipier', hp: o.proxy.hp, dead: o.proxy.dead, color: '#' + o.color.toString(16).padStart(6, '0') });
    return out;
  }
};
