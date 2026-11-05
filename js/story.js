// Mode Histoire « Protocole Cendre » et Missions qui en découlent : objectifs, dialogues radio, marqueurs, étoiles
// Qui parle : OPALE (la commanditaire, à la radio), VEX (vous), LENZ (le virologue), ROOK (le pilote), KESSLER, DRAVIK
G.SPEAKERS = {
  OPALE: { name: 'OPALE', color: '#c48cff', voice: 'handler' },
  VEX: { name: 'VEX', color: '#f2c443', voice: 'vex' },
  LENZ: { name: 'DR LENZ', color: '#7fd6ff', voice: 'other' },
  ROOK: { name: 'ROOK', color: '#7fe08a', voice: 'other' },
  KESSLER: { name: 'GÉNÉRAL KESSLER', color: '#ff6a5a', voice: 'other' },
  DRAVIK: { name: 'COLONEL DRAVIK', color: '#ff9a5a', voice: 'other' },
};

G.STORY = {
  title: 'PROTOCOLE CENDRE',
  pitch: "Vous êtes Sacha « Vex » Varenne, ancien commando devenu nettoyeur pour des contrats privés. Votre commanditaire, une voix à la radio qui se fait appeler Opale, vous envoie chercher un virologue disparu. Derrière lui : ORBIS, la milice privée du général Kessler, une spore exhumée sous une pyramide et une épidémie qui transforme les campagnes en charniers. Chaque contrat vous rapproche de la vérité, et d'une trahison.",
  chapters: [
    {
      id: 'ch1', n: 1, title: 'Patient zéro', map: 'village', type: 'zombies', level: 3, start: [40, 42],
      brief: "Le Dr Lenz a caché un disque dur dans sa maison de campagne avant de disparaître. Le village ne répond plus depuis 48 heures.",
      loadout: { weapons: ['rifle', 'pistol'], points: 1500, armor: 50, grenades: 2 },
      steps: [
        { t: 'say', lines: [['OPALE', "Vex, ici Opale. Contrat simple : le docteur Ilan Lenz, virologue, a disparu il y a trois jours."], ['OPALE', "Avant de partir, il a caché un disque dur dans sa maison, la grande bâtisse en brique à l'ouest du village."], ['VEX', 'Et les habitants ?'], ['OPALE', 'Plus aucun signal depuis 48 heures. Sois prudent.']] },
        { t: 'goto', label: 'Rejoindre la maison du Dr Lenz', at: [16, 44], r: 2.5, spawn: [{ types: ['walker'], n: 6, near: [24, 40], r: [3, 10] }, { types: ['walker'], n: 4, near: [12, 30], r: [2, 8] }] },
        { t: 'say', lines: [['VEX', 'Opale… les habitants. Ils ne sont plus humains.'], ['OPALE', 'Je vois. Ça change le tarif. Trouve ce disque.']] },
        { t: 'interact', label: 'Fouiller le bureau du docteur', at: [14, 7, 42], dur: 4, prop: 'laptop' },
        { t: 'say', lines: [['VEX', "J'ai le disque. Il y a des notes : « Souche N… ORBIS… la pyramide »."], ['OPALE', "ORBIS ? La milice privée du général Kessler. Reste en vie, l'hélico arrive sur la colline dans une minute."]] },
        { t: 'survive', label: "Tenir jusqu'à l'arrivée de l'hélico", dur: 70, pressure: { types: [['walker', 3], ['runner', 1]], every: [1.1, 1.8], max: 14, r: [14, 30] } },
        { t: 'goto', label: "Rejoindre l'extraction au sommet de la colline", at: [15, 15], r: 4, pressure: { types: [['walker', 3], ['runner', 2], ['brute', 0.3]], every: [1.2, 2], max: 14, r: [14, 26] } },
        { t: 'say', lines: [['OPALE', 'Beau travail. Le disque parle d\'un chantier de fouilles dans le désert. Ton prochain contrat t\'attend.']] },
      ],
      stars: [{ label: 'Moins de 6 minutes', time: 360 }, { label: 'Moins de 300 dégâts subis', dmg: 300 }],
    },
    {
      id: 'ch2', n: 2, title: 'Le tombeau', map: 'desert', type: 'soldats', level: 4, start: [40, 70],
      brief: "ORBIS fouille les ruines du canyon. D'après le disque, la Souche N vient d'une spore trouvée sous la pyramide.",
      loadout: { weapons: ['rifle', 'pistol'], points: 2500, armor: 100, grenades: 3 },
      steps: [
        { t: 'say', lines: [['OPALE', "ORBIS a installé un chantier autour de la pyramide du canyon. D'après le disque de Lenz, la Souche N vient d'une spore trouvée dans le tombeau."], ['OPALE', 'Sabote leurs foreuses, puis ramène-moi un échantillon. Kessler ne doit pas être le seul à l\'avoir.']] },
        { t: 'clear', label: 'Neutraliser la patrouille de la ziggourat', spawn: [{ types: ['rifleman', 'rifleman', 'assault', 'assault', 'marksman', 'rifleman'], near: [40, 40], r: [5, 12] }] },
        { t: 'multi', label: 'Saboter les foreuses', points: [[70, 58], [60, 21], [46, 5]], dur: 3, prop: 'drill', blast: true, pressure: { types: [['rifleman', 3], ['assault', 2], ['breacher', 1], ['marksman', 1]], every: [9, 14], max: 8, squad: [2, 3], r: [18, 34] } },
        { t: 'say', lines: [['VEX', 'Foreuses détruites.'], ['OPALE', "Parfait. Le portail au sommet de la pyramide mène au tombeau. Descends."]] },
        { t: 'goto', label: 'Prendre le portail de la pyramide vers le tombeau', at: [16, 61], r: 4, maxY: 6, hint: [60, 11] },
        { t: 'interact', label: 'Prélever la spore', at: [17, 2, 58], dur: 4, prop: 'spore' },
        { t: 'say', lines: [['VEX', "J'ai l'échantillon. Ça pulse… c'est vivant."], ['OPALE', "Ne traîne pas, un convoi ORBIS arrive. Sors par la gorge, au nord-ouest du canyon."]] },
        { t: 'goto', label: 'Fuir par la gorge, au nord-ouest', at: [5, 7], r: 4, pressure: { types: [['rifleman', 3], ['assault', 2], ['knifer', 1], ['grenadier', 1]], every: [7, 11], max: 9, squad: [2, 4], r: [16, 32] } },
        { t: 'say', lines: [['OPALE', "Les relevés de la spore désignent un responsable : le colonel Dravik, à l'avant-poste du nord. Il a la clé de leur laboratoire."]] },
      ],
      stars: [{ label: 'Moins de 9 minutes', time: 540 }, { label: 'Au moins 10 tirs à la tête', hs: 10 }],
    },
    {
      id: 'ch3', n: 3, title: 'Le Colonel', map: 'toundra', type: 'soldats', level: 5, start: [12, 72],
      brief: "Le colonel Dravik tient l'avant-poste gelé. Il porte la carte d'accès au laboratoire du volcan.",
      loadout: { weapons: ['sniper', 'smg'], points: 3000, armor: 100, grenades: 2 },
      steps: [
        { t: 'say', lines: [['OPALE', "Le colonel Dravik commande l'avant-poste. Il surveille la vallée depuis le mirador, sur la colline."], ['OPALE', "Élimine-le, récupère sa carte d'accès et file par la vieille mine, sous le mirador."], ['VEX', 'Discret ou bruyant ?'], ['OPALE', 'Comme tu veux. Mais il ne quitte pas la colline vivant.']] },
        { t: 'kill', label: 'Éliminer le colonel Dravik', target: { type: 'marksman', name: 'COLONEL DRAVIK', hp: 6, at: [64, 28, 61], anchor: true },
          spawn: [{ types: ['rifleman', 'rifleman', 'assault', 'grenadier'], near: [40, 40], r: [2, 8] }, { types: ['rifleman', 'breacher', 'rifleman'], near: [60, 54], r: [3, 9] }, { types: ['sniper'], at: [[45, 11, 31]], anchor: true }] },
        { t: 'say', lines: [['DRAVIK', 'Kessler… vous… vengera…'], ['OPALE', 'Prends sa carte, vite.']] },
        { t: 'interact', label: "Récupérer la carte d'accès sur le corps", at: 'target', dur: 1.5, prop: 'card' },
        { t: 'goto', label: 'Fuir par la mine : trappe entre les pilotis du mirador', at: [61, 45], r: 3, hint: [64, 62], pressure: { types: [['rifleman', 3], ['assault', 2], ['knifer', 1]], every: [8, 12], max: 8, squad: [2, 3], r: [16, 30] } },
        { t: 'say', lines: [['OPALE', "Carte récupérée. Le laboratoire est sous la forteresse du volcan. C'est là que tout a commencé."]] },
      ],
      stars: [{ label: 'Colonel tué à la tête', headTarget: true }, { label: 'Moins de 7 minutes', time: 420 }],
    },
    {
      id: 'ch4', n: 4, title: 'Le cœur du volcan', map: 'enfer', type: 'zombies', level: 6, start: [40, 37],
      brief: "Le terminal du laboratoire est dans la première tour. ORBIS y garde ses recherches sur un remède.",
      loadout: { weapons: ['shotgun', 'rifle'], points: 4000, armor: 100, grenades: 3 },
      steps: [
        { t: 'say', lines: [['OPALE', "La carte de Dravik ouvre le terminal du labo, au premier étage de la tour ouest. Copie leurs recherches sur le remède."], ['VEX', 'Un remède ?'], ['OPALE', 'Kessler en a un. Et il compte le vendre très cher.']] },
        { t: 'goto', label: 'Entrer dans la tour ouest', at: [12, 40], r: 3, maxY: 10, spawn: [{ types: ['walker', 'walker', 'runner', 'walker', 'crawler'], near: [24, 44], r: [2, 8] }] },
        { t: 'interact', label: 'Pirater le terminal (1er étage)', at: [13, 12, 41], dur: 4, prop: 'terminal' },
        { t: 'say', lines: [['OPALE', "Transfert lancé. Tiens la position, ça va attirer tous les sujets d'expérience de la forteresse."]] },
        { t: 'defend', label: 'Défendre le terminal pendant le transfert', at: [13, 12, 41], r: 7, dur: 80, pressure: { types: [['walker', 3], ['runner', 2], ['crawler', 1], ['brute', 0.6]], every: [1.0, 1.7], max: 14, r: [12, 26] } },
        { t: 'say', lines: [['VEX', "Transfert terminé… quelque chose d'énorme arrive."], ['OPALE', 'Le sujet numéro un. Abats-le.']] },
        { t: 'boss', label: 'Abattre le sujet n°1 : LE COLOSSE', boss: 'colosse', at: [40, 40], name: 'SUJET N°1' },
        { t: 'goto', label: "Rejoindre l'extraction sur l'îlot du lac de lave", at: [60, 56], r: 4, pressure: { types: [['walker', 3], ['runner', 2]], every: [1.2, 2], max: 10, r: [14, 26] } },
        { t: 'say', lines: [['OPALE', "J'ai les données. Kessler détient le Dr Lenz en ville : lui seul peut produire le remède. Va le chercher."]] },
      ],
      stars: [{ label: 'Moins de 8 minutes', time: 480 }, { label: 'Moins de 400 dégâts subis', dmg: 400 }],
    },
    {
      id: 'ch5', n: 5, title: 'Protocole Cendre', map: 'ville', type: 'soldats', level: 7, start: [48, 44], startY: 13,
      brief: "Le Dr Lenz est retenu sous les combles d'un immeuble haussmannien, près de la place. Ramenez-le vivant.",
      loadout: { weapons: ['rifle', 'shotgun'], points: 5000, armor: 150, grenades: 4 },
      steps: [
        { t: 'say', lines: [['OPALE', "Lenz est retenu sous les combles de l'immeuble haussmannien, à l'est de la place à la statue."], ['ROOK', "Ici Rook, pilote. Je vous récupère sur la place quand vous êtes prêts."]] },
        { t: 'goto', label: "Monter sous les combles de l'immeuble haussmannien", at: [88, 37, 64], r: 2.5, minY: 36,
          spawn: [{ types: ['rifleman', 'assault'], at: [[86, 17, 58], [90, 17, 62]] }, { types: ['breacher', 'rifleman'], at: [[86, 25, 58], [90, 25, 62]] }, { types: ['assault', 'rifleman'], at: [[86, 33, 58], [90, 33, 62]] }, { types: ['rifleman', 'rifleman', 'marksman'], near: [70, 60], r: [3, 10] }] },
        { t: 'interact', label: 'Libérer le Dr Lenz', at: [86, 37, 61], dur: 3, prop: 'chains' },
        { t: 'say', lines: [['LENZ', 'Vous êtes venu… Kessler veut raser la ville pour effacer les preuves !'], ['OPALE', 'Désolée, Vex. Le remède vaut plus que toi : Kessler paie mieux.'], ['VEX', 'Opale…'], ['ROOK', "Moi, je ne la suis pas. Il faut que tout le monde sache : l'antenne sur le toit de la tour new-yorkaise, au sud !"]] },
        { t: 'goto', label: 'Atteindre le toit de la tour (escalier de secours, côté ouest)', at: [87, 41, 87], r: 3, minY: 40, pressure: { types: [['rifleman', 3], ['assault', 2], ['sniper', 1], ['marksman', 1], ['grenadier', 1]], every: [7, 10], max: 10, squad: [2, 4], r: [16, 34] } },
        { t: 'interact', label: 'Diffuser les preuves depuis l\'antenne', at: [86, 41, 86], dur: 5, prop: 'antenna' },
        { t: 'say', lines: [['KESSLER', "Vous avez tout gâché. Je vais vous écraser moi-même."], ['ROOK', "Kessler arrive sur la place, en armure lourde !"]] },
        { t: 'boss', label: 'Abattre le général Kessler', boss: 'juggernaut', at: [61, 66], name: 'GÉNÉRAL KESSLER' },
        { t: 'goto', label: "Rejoindre l'hélico de Rook sur la place", at: [61, 66], r: 4 },
        { t: 'say', lines: [['ROOK', 'Accroche-toi ! Les preuves tournent sur toutes les fréquences. ORBIS est fini.'], ['LENZ', 'Avec ces données, je peux produire le remède.'], ['VEX', 'Et Opale ?'], ['ROOK', "Elle a disparu. Mais ça, c'est un autre contrat…"]] },
      ],
      stars: [{ label: 'Moins de 12 minutes', time: 720 }, { label: 'Au moins 15 tirs à la tête', hs: 15 }],
    },
  ],
};

// Missions : contrats rejouables tirés de l'histoire, débloqués au fil des chapitres
G.MISSIONS = [
  {
    id: 'm1', after: 'ch1', title: 'Nettoyage du hameau', map: 'village', type: 'zombies', level: 4, start: [40, 42],
    brief: "Le village est perdu, mais il reste des survivants à couvrir le temps qu'ils fuient. Tenez 2 min 30.",
    loadout: { weapons: ['rifle', 'shotgun'], points: 2000, armor: 50, grenades: 3 },
    steps: [
      { t: 'say', lines: [['OPALE', "Des survivants évacuent par la route du sud. Occupe les morts sur la place du village."]] },
      { t: 'survive', label: 'Tenir sur la place du village', dur: 150, pressure: { types: [['walker', 3], ['runner', 2], ['crawler', 1], ['brute', 0.4], ['bloater', 0.3]], every: [1.0, 1.6], max: 16, r: [12, 30] } },
    ],
    stars: [{ label: 'Au moins 50 éliminations', kills: 50 }, { label: 'Moins de 200 dégâts subis', dmg: 200 }],
  },
  {
    id: 'm2', after: 'ch2', title: 'Sabotage express', map: 'desert', type: 'soldats', level: 5, start: [40, 70], limit: 300,
    brief: 'Quatre foreuses ORBIS, cinq minutes. Faites tout sauter avant que le convoi ne reparte.',
    loadout: { weapons: ['smg', 'pistol'], points: 2500, armor: 100, grenades: 3 },
    steps: [
      { t: 'say', lines: [['OPALE', 'Quatre foreuses, cinq minutes. Pas une de plus.']] },
      { t: 'multi', label: 'Saboter les foreuses', points: [[70, 58], [60, 21], [46, 5], [22, 52]], dur: 2.5, prop: 'drill', blast: true, spawn: [{ types: ['rifleman', 'assault', 'rifleman'], near: [40, 40], r: [4, 10] }], pressure: { types: [['rifleman', 3], ['assault', 2], ['breacher', 1], ['grenadier', 1]], every: [8, 12], max: 9, squad: [2, 3], r: [16, 32] } },
    ],
    stars: [{ label: 'Moins de 3 minutes', time: 180 }, { label: 'Moins de 250 dégâts subis', dmg: 250 }],
  },
  {
    id: 'm3', after: 'ch3', title: "Contrat : l'Intendant", map: 'toundra', type: 'soldats', level: 6, start: [12, 72],
    brief: "L'intendant de l'avant-poste se planque dans le fort, protégé par sa garde. Une balle, un contrat.",
    loadout: { weapons: ['sniper', 'pistol'], points: 2000, armor: 100, grenades: 2 },
    steps: [
      { t: 'say', lines: [['OPALE', "L'intendant d'ORBIS se terre sur le chemin de ronde du fort. Sa garde patrouille autour. Une balle, un contrat."]] },
      { t: 'kill', label: "Éliminer l'intendant", target: { type: 'rifleman', name: "L'INTENDANT", hp: 4, at: [40, 11, 31], anchor: true },
        spawn: [{ types: ['rifleman', 'assault', 'rifleman', 'breacher'], near: [40, 40], r: [2, 8] }, { types: ['sniper'], at: [[64, 28, 61]], anchor: true }, { types: ['rifleman', 'grenadier'], near: [20, 40], r: [2, 6] }] },
      { t: 'goto', label: 'Quitter la zone (lac gelé)', at: [16, 18], r: 5, pressure: { types: [['rifleman', 3], ['assault', 2], ['knifer', 1]], every: [7, 11], max: 8, squad: [2, 3], r: [16, 30] } },
    ],
    stars: [{ label: "Intendant tué à la tête", headTarget: true }, { label: 'Moins de 4 minutes', time: 240 }],
  },
  {
    id: 'm4', after: 'ch4', title: 'Le terminal', map: 'enfer', type: 'zombies', level: 6,
    start: [14, 41], startY: 12,
    brief: "Un second transfert est lancé depuis la tour ouest. Tenez la salle du terminal 2 minutes.",
    loadout: { weapons: ['shotgun', 'lmg'], points: 3000, armor: 150, grenades: 4 },
    steps: [
      { t: 'say', lines: [['OPALE', 'Second transfert. Ne laisse rien approcher du terminal.']] },
      { t: 'defend', label: 'Défendre le terminal', at: [13, 12, 41], r: 7, dur: 120, prop: 'terminal', pressure: { types: [['walker', 3], ['runner', 2], ['crawler', 1], ['brute', 0.8], ['stalker', 0.5]], every: [0.9, 1.5], max: 16, r: [12, 26] } },
    ],
    stars: [{ label: 'Au moins 60 éliminations', kills: 60 }, { label: 'Moins de 350 dégâts subis', dmg: 350 }],
  },
  {
    id: 'm5', after: 'ch5', title: 'Exfiltration', map: 'ville', type: 'soldats', level: 7, start: [20, 120], startY: 13, limit: 300,
    brief: 'Traversez la ville en diagonale, sous le feu, jusqu\'au point de récupération de Rook.',
    loadout: { weapons: ['rifle', 'smg'], points: 3000, armor: 150, grenades: 3 },
    steps: [
      { t: 'say', lines: [['ROOK', "Je ne peux pas me poser au sud-ouest, trop de tireurs. Rejoins-moi au nord-est de la ville, je t'attends cinq minutes."]] },
      { t: 'goto', label: 'Rejoindre Rook au nord-est de la ville', at: [103, 13, 8], r: 4, pressure: { types: [['rifleman', 3], ['assault', 2], ['sniper', 1], ['marksman', 1], ['knifer', 1]], every: [6, 9], max: 11, squad: [2, 4], r: [18, 36] } },
    ],
    stars: [{ label: 'Moins de 3 min 30', time: 210 }, { label: 'Moins de 250 dégâts subis', dmg: 250 }],
  },
  {
    id: 'm6', after: 'ch5', title: 'Chasse aux tireurs', map: 'ville', type: 'soldats', level: 7, start: [48, 44], startY: 13,
    brief: "Six tireurs d'élite d'ORBIS tiennent les toits et les fenêtres du quartier. Faites le ménage.",
    loadout: { weapons: ['sniper', 'rifle'], points: 3000, armor: 100, grenades: 2 },
    steps: [
      { t: 'say', lines: [['ROOK', "Six tireurs sur les toits et aux fenêtres. Tant qu'ils sont là, je ne peux pas me poser."]] },
      { t: 'clear', label: "Abattre les tireurs d'élite", snipers: 6, spawn: [{ types: ['rifleman', 'assault', 'rifleman'], near: [48, 60], r: [6, 14] }] },
    ],
    stars: [{ label: 'Moins de 6 minutes', time: 360 }, { label: 'Au moins 4 tirs à la tête', hs: 4 }],
  },
];

G.MissionRun = class {
  constructor(game, def, kind) {
    this.game = game; this.def = def; this.kind = kind;
    this.idx = -1; this.step = null; this.t = 0;
    this.queue = []; this.sayT = 0; this.line = null;
    this.props = []; this.done = false;
    this.kills = 0; this.pressureT = 3;
    this.marker = new THREE.Vector3(); this.hasMarker = false;
  }
  begin() {
    const g = this.game, pl = g.player, d = this.def, w = g.world;
    g.wave = d.level; g.phase = 'active'; g.toSpawn = 0;
    g.curWave = { n: d.level, t0: 0, kills: 0, hs: 0, dmgTaken: 0, pts: 0, specials: 0 };
    g.points = d.loadout.points || 0;
    if (d.start) {
      const y = d.startY || w.standAt(d.start[0], d.start[1]);
      if (y < 999) { pl.pos.set(d.start[0] + 0.5, y, d.start[1] + 0.5); pl.camY = y + pl.eyeH; }
    }
    pl.slots = d.loadout.weapons.map((id) => pl.newSlot(id)); pl.cur = 0; pl.setViewWeapon();
    pl.armor = d.loadout.armor || 0; pl.grenades = d.loadout.grenades || 2; pl.plates = 2;
    pl.yaw = Math.atan2(-(w.W / 2 - pl.pos.x), -(w.D / 2 - pl.pos.z));
    g.world.computeFlow(pl.pos.x, pl.pos.y, pl.pos.z);
    g.message((this.kind === 'story' ? 'CHAPITRE ' + d.n + ' — ' : 'MISSION — ') + d.title.toUpperCase(), d.brief, 5);
    G.Audio.S.waveStart();
    this.next();
  }
  get timeLimit() { return this.def.limit || 0; }

  // ---------- étapes ----------
  next() {
    if (this.step) this.clearProps();
    this.idx++;
    this.step = this.def.steps[this.idx] || null;
    this.t = 0; this.stepKills = 0; this.pressureT = 4;
    if (!this.step) { this.finish(true); return; }
    const s = this.step;
    s.state = {};
    if (s.t === 'say') { for (const l of s.lines) this.queue.push(l); return; }
    if (s.spawn) for (const sp of s.spawn) this.spawnGroup(sp, s);
    if (s.t !== 'say' && this.idx > 0) G.Audio.S.objective();
    if (s.t === 'interact') { this.addProp(this.resolve(s.at), s.prop); }
    if (s.t === 'defend' && s.prop) this.addProp(this.resolve(s.at), s.prop);
    if (s.t === 'multi') { s.state.left = s.points.map((p) => this.resolve(p)); s.state.total = s.points.length; s.state.props = s.state.left.map((p) => this.addProp(p, s.prop)); }
    if (s.t === 'kill') { const e = this.spawnOne(s.target.type, this.resolve(s.target.at), s.target); e.named = s.target.name; e.maxHp = e.hp = Math.round(e.hp * (s.target.hp || 3)); e.elite = true; s.state.target = e; this.target = e; }
    if (s.t === 'clear') { s.state.group = this.lastGroup ? this.lastGroup.slice() : []; if (s.snipers) for (let i = 0; i < s.snipers; i++) { const p = this.perchFor(i); if (p) { const e = this.spawnOne('sniper', p, { anchor: true }); s.state.group.push(e); } } }
    if (s.t === 'boss') {
      const list = this.game.gameType === 'soldats' ? G.SBOSSES : G.BOSSES, T = list.find((b) => b.id === s.boss) || list[0];
      const p = this.resolve(s.at);
      const b = new G.Enemy(this.game, T.id, p, { boss: Object.assign({}, T, { name: s.name || T.name }), hpScale: 1 + this.def.level * 0.08, cycle: 0 });
      this.game.enemies.push(b); this.game.boss = b; s.state.boss = b;
      G.Audio.S.boss(); this.game.shake(0.5);
    }
  }
  resolve(at) {
    const w = this.game.world;
    if (at === 'target') { const e = this.target; return e ? e.pos.clone() : this.game.player.pos.clone(); }
    if (at.length === 3) return new THREE.Vector3(at[0] + 0.5, at[1], at[2] + 0.5);
    const y = w.standAt(at[0], at[1]);
    return new THREE.Vector3(at[0] + 0.5, y < 999 ? y : 8, at[1] + 0.5);
  }
  perchFor(i) {
    const P = (this.game.map.perches || []).concat(this.game.map.windows || []), pl = this.game.player;
    const ok = P.filter((c) => { const d = Math.hypot(c.x - pl.pos.x, c.z - pl.pos.z); return d > 18 && d < 70 && this.game.world.nav.dist[c.id] >= 0; });
    if (!ok.length) return null;
    for (let k = 0; k < 20; k++) { const c = ok[Math.floor(Math.random() * ok.length)]; if (!this.game.enemies.some((e) => !e.dead && Math.hypot(e.pos.x - c.x, e.pos.z - c.z) < 8)) return new THREE.Vector3(c.x + 0.5, c.y, c.z + 0.5); }
    return null;
  }
  spawnOne(type, pos, opts = {}) {
    const g = this.game, w = g.world;
    const y = w.standBelow(Math.floor(pos.x), pos.y + 0.5, Math.floor(pos.z));
    const p = new THREE.Vector3(pos.x, y < 999 ? y : pos.y, pos.z);
    const e = g.spawnEnemy(type, p);
    if (opts.anchor && e.soldier) { const id = w.nodeNear(p.x, p.y, p.z); e.anchor = { x: p.x, y: p.y, z: p.z, id, perch: true }; }
    return e;
  }
  // point d'apparition hors de vue, sur le graphe de navigation, entre r0 et r1 d'un centre
  spawnPoint(center, r0, r1, hidden = true) {
    const g = this.game, w = g.world, pl = g.player;
    let fallback = null;
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, rr = r0 + Math.random() * (r1 - r0);
      const x = Math.floor(center.x + Math.cos(a) * rr), z = Math.floor(center.z + Math.sin(a) * rr);
      if (x < 2 || z < 2 || x >= w.W - 2 || z >= w.D - 2) continue;
      const y = w.standAt(x, z); if (y >= 999 || w.top(x, z) + 1 - y > 1) continue; // sol à ciel ouvert (pas d'égout, pas d'intérieur)
      const b = w.get(x, y, z); if (b === G.B.WATER || b === G.B.LAVA || b === G.B.LAVA_FLOW) continue;
      if (w.flowDistAt(x + 0.5, y, z + 0.5) < 0) continue;
      if (Math.hypot(x - pl.pos.x, z - pl.pos.z) < 9) continue;
      const p = new THREE.Vector3(x + 0.5, y, z + 0.5);
      if (!hidden || !w.lineOfSight(new THREE.Vector3(p.x, y + 1.6, p.z), pl.eye)) return p;
      fallback = fallback || p;
    }
    return fallback || g.pickSpawn(12, 30);
  }
  spawnGroup(sp, step) {
    const g = this.game, group = [];
    if (sp.at) sp.at.forEach((a, i) => group.push(this.spawnOne(sp.types[i % sp.types.length], this.resolve(a), sp)));
    else {
      const n = sp.n || sp.types.length, c = this.resolve(sp.near);
      for (let i = 0; i < n; i++) { const p = this.spawnPoint(c, sp.r[0], sp.r[1], false); if (p) group.push(this.spawnOne(sp.types[i % sp.types.length], p, sp)); }
    }
    const squad = { leader: group[0], members: group };
    for (const e of group) if (e.soldier) e.squad = squad;
    this.lastGroup = group;
    return group;
  }
  pickType(list) {
    let tot = 0; for (const [, wgt] of list) tot += wgt;
    let r = Math.random() * tot; for (const [t, wgt] of list) { r -= wgt; if (r <= 0) return t; }
    return list[0][0];
  }
  pressure(dt, P) {
    const g = this.game;
    this.pressureT -= dt;
    if (this.pressureT > 0 || g.aliveCount() >= P.max) return;
    this.pressureT = P.every[0] + Math.random() * (P.every[1] - P.every[0]);
    const n = P.squad ? Math.min(P.max - g.aliveCount(), P.squad[0] + Math.floor(Math.random() * (P.squad[1] - P.squad[0] + 1))) : 1;
    const c = this.spawnPoint(g.player.pos, P.r[0], P.r[1], true); if (!c) return;
    const group = [];
    for (let i = 0; i < n; i++) {
      const q = c.clone().add(new THREE.Vector3((i % 2) * 1.2 - 0.6, 0, Math.floor(i / 2) * 1.2));
      q.y = g.world.standBelow(Math.floor(q.x), c.y + 1, Math.floor(q.z)); if (q.y >= 999) q.copy(c);
      group.push(g.spawnEnemy(this.pickType(P.types), q));
    }
    if (group.length > 1) { const squad = { leader: group[0], members: group }; for (const e of group) e.squad = squad; }
  }

  update(dt) {
    const g = this.game, pl = g.player;
    this.t += dt; this.total = (this.total || 0) + dt;
    this.updateDialogue(dt);
    for (const pr of this.props) if (pr.mesh) { pr.mesh.rotation.y += dt * 0.8; if (pr.glow) pr.glow.material.opacity = 0.35 + Math.sin(g.time * 4) * 0.15; }
    if (this.done) return;
    if (this.timeLimit && this.total > this.timeLimit) { this.fail('time'); return; }
    const s = this.step; if (!s) return;
    this.hasMarker = false;
    if (s.pressure) this.pressure(dt, s.pressure);
    const near = (p, r) => Math.hypot(pl.pos.x - p.x, pl.pos.z - p.z) < r && Math.abs(pl.pos.y - p.y) < 2.6;
    switch (s.t) {
      case 'say': if (!this.queue.length && !this.line) this.next(); break;
      case 'goto': {
        const p = this.resolve(s.at); this.setMarker(p);
        const okY = (s.maxY === undefined || pl.pos.y <= s.maxY) && (s.minY === undefined || pl.pos.y >= s.minY);
        if (Math.hypot(pl.pos.x - p.x, pl.pos.z - p.z) < s.r && okY && (s.maxY !== undefined || s.minY !== undefined || Math.abs(pl.pos.y - p.y) < 4)) this.next();
        else if (s.hint && this.t > 1) { const h = this.resolve(s.hint); if (Math.hypot(pl.pos.x - p.x, pl.pos.z - p.z) > 12) this.setMarker(h, p); }
        break;
      }
      case 'interact': {
        const p = this.resolve(s.at); this.setMarker(p);
        s.state.p = p; this.holdAt(p, s, dt, () => this.next());
        break;
      }
      case 'multi': {
        const L = s.state.left;
        let best = null, bd = 1e9; for (const p of L) { const d = p.distanceTo(pl.pos); if (d < bd) { bd = d; best = p; } }
        if (best) this.setMarker(best);
        if (best) this.holdAt(best, s, dt, () => {
          const i = L.indexOf(best); L.splice(i, 1);
          const pr = s.state.props.splice(i, 1)[0]; this.removeProp(pr);
          if (s.blast) { const bp = best.clone().add(new THREE.Vector3(0, 0.6, 0)); setTimeout(() => { if (g.phase === 'active') g.explode(bp, 3.5, 400, 'player', 0xff8030); }, 1800); }
          g.message('', 'Charge posée — ' + (s.state.total - L.length) + '/' + s.state.total, 2, '#f2c443');
          if (!L.length) this.next();
        });
        break;
      }
      case 'clear': {
        const alive = s.state.group.filter((e) => !e.dead);
        if (alive.length) { let best = alive[0]; for (const e of alive) if (e.pos.distanceTo(pl.pos) < best.pos.distanceTo(pl.pos)) best = e; if (alive.length <= 3 || s.snipers) this.setMarker(best.pos.clone().add(new THREE.Vector3(0, 2.4, 0))); }
        if (!alive.length && this.t > 1) this.next();
        break;
      }
      case 'kill': {
        const e = s.state.target;
        if (e && !e.dead) this.setMarker(e.pos.clone().add(new THREE.Vector3(0, 2.4, 0)));
        else if (e) { this.headTarget = e.lastPart === 'head'; this.target = e; this.next(); }
        break;
      }
      case 'survive': if (this.t >= s.dur) this.next(); break;
      case 'defend': {
        const p = this.resolve(s.at); this.setMarker(p);
        s.state.held = (s.state.held || 0) + (near(p, s.r) ? dt : 0);
        if (s.state.held >= s.dur) this.next();
        break;
      }
      case 'boss': {
        const b = s.state.boss;
        if (b && !b.dead) this.setMarker(b.pos.clone().add(new THREE.Vector3(0, b.h + 0.5, 0)));
        else if (b) this.next();
        break;
      }
    }
  }
  // maintenir E près d'un point pendant "dur" secondes
  holdAt(p, s, dt, done) {
    const pl = this.game.player;
    const close = Math.hypot(pl.pos.x - p.x, pl.pos.z - p.z) < 2.2 && Math.abs(pl.pos.y - p.y) < 2.2;
    this.nearAct = close ? s : null;
    if (close && pl.keys.KeyE) {
      s.state.hold = (s.state.hold || 0) + dt;
      if (s.state.hold >= s.dur) { s.state.hold = 0; this.nearAct = null; G.Audio.S.buy(); done(); }
    } else if (s.state.hold) s.state.hold = Math.max(0, s.state.hold - dt * 2);
  }
  nearInteract() { return !!this.nearAct && !this.done; }
  setMarker(p, real) { this.marker.copy(p); this.markerReal = real || p; this.hasMarker = true; }
  onKilled(e, part) { this.kills++; e.lastPart = part; }

  // ---------- dialogues (sous-titres + voix radio) ----------
  updateDialogue(dt) {
    if (this.line) { this.sayT -= dt; if (this.sayT <= 0) this.line = null; }
    if (!this.line && this.queue.length) {
      const [who, text] = this.queue.shift();
      this.line = { who, text }; this.sayT = Math.max(2.6, text.length * 0.065);
      G.Audio.S.radio();
      G.Voice.radio(text, (G.SPEAKERS[who] || {}).voice);
    }
  }

  // ---------- objets à l'objectif ----------
  addProp(p, kind) {
    const g = this.game, grp = new THREE.Group();
    const col = { laptop: 0x40a0ff, drill: 0xff8030, spore: 0x80ff60, card: 0xffd040, terminal: 0x40ffd0, chains: 0xc0c0c0, antenna: 0xff4040 }[kind] || 0xffffff;
    const mat = new THREE.MeshLambertMaterial({ color: 0x3a3a40, emissive: col, emissiveIntensity: 0.35 });
    const box = (sx, sy, sz, x, y, z, m = mat) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); grp.add(b); return b; };
    if (kind === 'drill') { box(0.9, 1.4, 0.9, 0, 0.7, 0); box(0.3, 1.6, 0.3, 0, 2.1, 0); box(1.4, 0.2, 0.2, 0, 1.5, 0); }
    else if (kind === 'terminal' || kind === 'antenna') { box(0.7, 1.1, 0.4, 0, 0.55, 0); box(0.6, 0.4, 0.06, 0, 1.1, -0.2, new THREE.MeshBasicMaterial({ color: col })); if (kind === 'antenna') box(0.1, 2.2, 0.1, 0.3, 1.6, 0); }
    else if (kind === 'chains') { box(0.5, 1.6, 0.4, 0, 0.8, 0, new THREE.MeshLambertMaterial({ color: 0x8a6a50 })); box(0.6, 0.08, 0.5, 0, 1.1, 0); }
    else box(0.5, 0.3, 0.4, 0, 0.75, 0);
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 40, 6, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.4, depthWrite: false, fog: false }));
    glow.position.y = 20; grp.add(glow);
    grp.position.set(p.x, p.y, p.z);
    g.scene.add(grp);
    const pr = { mesh: grp, glow }; this.props.push(pr);
    return pr;
  }
  removeProp(pr) { if (!pr) return; this.game.scene.remove(pr.mesh); pr.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); const i = this.props.indexOf(pr); if (i >= 0) this.props.splice(i, 1); }
  clearProps() { while (this.props.length) this.removeProp(this.props[0]); }

  // ---------- informations pour l'interface ----------
  hud() {
    const s = this.step, pl = this.game.player;
    let label = s && s.t !== 'say' ? s.label : (this.lastLabel || '');
    if (s && s.t !== 'say') this.lastLabel = s.label;
    let extra = '';
    if (s) {
      if (s.t === 'multi' && s.state.left) extra = (s.state.total - s.state.left.length) + ' / ' + s.state.total;
      if (s.t === 'clear' && s.state.group) extra = s.state.group.filter((e) => e.dead).length + ' / ' + s.state.group.length;
      if (s.t === 'survive') extra = G.fmtTime(Math.max(0, s.dur - this.t));
      if (s.t === 'defend') extra = G.fmtTime(Math.max(0, s.dur - (s.state.held || 0))) + (this.hasMarker && Math.hypot(pl.pos.x - this.marker.x, pl.pos.z - this.marker.z) > s.r ? ' — revenez dans la zone !' : '');
    }
    const hold = this.nearAct && this.nearAct.state ? (this.nearAct.state.hold || 0) / this.nearAct.dur : 0;
    return {
      title: this.kind === 'story' ? 'Chapitre ' + this.def.n + ' — ' + this.def.title : 'Mission — ' + this.def.title,
      label, extra,
      timer: this.timeLimit ? G.fmtTime(Math.max(0, this.timeLimit - (this.total || 0))) : null,
      line: this.line ? { who: (G.SPEAKERS[this.line.who] || { name: this.line.who }).name, color: (G.SPEAKERS[this.line.who] || {}).color, text: this.line.text } : null,
      prompt: this.nearAct ? '[E] maintenir : ' + this.nearAct.label : '',
      hold,
      marker: this.hasMarker ? this.marker : null,
      markerReal: this.hasMarker ? this.markerReal : null,
    };
  }

  // ---------- fin ----------
  stars(success) {
    if (!success) return { n: 0, list: [] };
    const st = this.game.stats, d = this.def, list = [{ label: 'Mission accomplie', ok: true }];
    for (const c of d.stars || []) {
      let ok = false;
      if (c.time) ok = this.total <= c.time;
      else if (c.dmg) ok = st.dmgTaken < c.dmg;
      else if (c.hs) ok = st.headshots >= c.hs;
      else if (c.kills) ok = st.kills >= c.kills;
      else if (c.headTarget) ok = !!this.headTarget;
      list.push({ label: c.label, ok });
    }
    return { n: list.filter((x) => x.ok).length, list };
  }
  finish(success, reason) {
    if (this.done) return;
    this.done = true;
    const g = this.game, st = this.stars(success);
    const P = G.Ranked.profile;
    P.story = P.story || { unlocked: 1, stars: {} }; P.missions = P.missions || { stars: {}, best: {} };
    if (success) {
      if (this.kind === 'story') {
        P.story.stars[this.def.id] = Math.max(P.story.stars[this.def.id] || 0, st.n);
        P.story.unlocked = Math.max(P.story.unlocked || 1, this.def.n + 1);
      } else {
        P.missions.stars[this.def.id] = Math.max(P.missions.stars[this.def.id] || 0, st.n);
        const b = P.missions.best[this.def.id]; if (!b || this.total < b) P.missions.best[this.def.id] = Math.round(this.total);
      }
      G.Ranked.save();
    }
    g.endMission(success, {
      kind: this.kind, def: this.def, success, reason, stars: st, time: Math.round(this.total || 0),
      kills: g.stats.kills, headshots: g.stats.headshots, dmgTaken: Math.round(g.stats.dmgTaken), shots: g.stats.shots, hits: g.stats.hits,
    });
  }
  fail(reason) { this.finish(false, reason); }
  dispose() { this.clearProps(); }
};

// suite logique d'un chapitre
G.Story = {
  chapter(n) { return G.STORY.chapters.find((c) => c.n === n); },
  unlocked() { const P = G.Ranked.profile; return (P.story && P.story.unlocked) || 1; },
  missionUnlocked(m) { const P = G.Ranked.profile, ch = G.STORY.chapters.find((c) => c.id === m.after); return !!(P.story && P.story.stars && P.story.stars[m.after] !== undefined) || (ch && G.Story.unlocked() > ch.n); },
};
