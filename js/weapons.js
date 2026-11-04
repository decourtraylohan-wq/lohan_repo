// Armes : définitions et modèles 3D en blocs
G.WEAPONS = {
  pistol: { id: 'pistol', name: 'M19 Sentinelle', cls: 'Pistolet', dmg: 34, pellets: 1, spread: [0.014, 0.004], rpm: 400, auto: false, mag: 10, reserve: 80, reload: 1.3, range: 60, pierce: 1, headMult: 2.2, price: 500, box: 0, recoil: 0.02, zoom: 0.85, move: 1.0, sound: 'pistol', color: 0x3a3d42, len: 0.32 },
  smg: { id: 'smg', name: 'Vipère SMG', cls: 'Mitraillette', dmg: 26, pellets: 1, spread: [0.032, 0.012], rpm: 800, auto: true, mag: 32, reserve: 192, reload: 1.8, range: 45, pierce: 1, headMult: 2, price: 1200, box: 3, recoil: 0.012, zoom: 0.8, move: 1.05, sound: 'smg', color: 0x2c3e2c, len: 0.45 },
  shotgun: { id: 'shotgun', name: 'Brise-Os', cls: 'Fusil à pompe', dmg: 24, pellets: 9, spread: [0.09, 0.06], rpm: 80, auto: false, mag: 6, reserve: 48, reload: 2.6, range: 24, pierce: 1, headMult: 1.6, price: 1500, box: 3, recoil: 0.07, zoom: 0.85, move: 0.95, sound: 'shotgun', color: 0x5a3a20, len: 0.7 },
  rifle: { id: 'rifle', name: 'Kodiak AR', cls: "Fusil d'assaut", dmg: 44, pellets: 1, spread: [0.024, 0.004], rpm: 620, auto: true, mag: 30, reserve: 240, reload: 2.2, range: 80, pierce: 2, headMult: 2, price: 2200, box: 3, recoil: 0.016, zoom: 0.7, move: 0.95, sound: 'rifle', color: 0x30302c, len: 0.7 },
  sniper: { id: 'sniper', name: 'Faucon .50', cls: 'Sniper', dmg: 330, pellets: 1, spread: [0.06, 0.0], rpm: 45, auto: false, mag: 5, reserve: 40, reload: 3.0, range: 120, pierce: 5, headMult: 3, price: 3000, box: 2, recoil: 0.09, zoom: 0.28, move: 0.9, sound: 'sniper', color: 0x3c4a3c, len: 0.95, scope: true },
  magnum: { id: 'magnum', name: 'Fracas .44', cls: 'Revolver', dmg: 170, pellets: 1, spread: [0.02, 0.003], rpm: 170, auto: false, mag: 6, reserve: 54, reload: 2.4, range: 70, pierce: 2, headMult: 3, price: 0, box: 3, recoil: 0.06, zoom: 0.8, move: 1.0, sound: 'sniper', color: 0x6a6a72, len: 0.38 },
  lmg: { id: 'lmg', name: 'Marteau LMG', cls: 'Mitrailleuse', dmg: 48, pellets: 1, spread: [0.04, 0.014], rpm: 700, auto: true, mag: 100, reserve: 400, reload: 4.2, range: 80, pierce: 2, headMult: 1.8, price: 0, box: 2, recoil: 0.014, zoom: 0.75, move: 0.85, sound: 'lmg', color: 0x3a3a2a, len: 0.85, drum: true },
  ray: { id: 'ray', name: 'Désintégrateur', cls: 'Arme spéciale', dmg: 650, pellets: 1, spread: [0.01, 0.004], rpm: 200, auto: false, mag: 20, reserve: 120, reload: 2.8, range: 90, pierce: 1, headMult: 1, price: 0, box: 1, recoil: 0.03, zoom: 0.8, move: 1.0, sound: 'energy', color: 0x2aa86a, len: 0.5, projectile: true, splash: 3.2, wonder: true },
};

G.upgradeStats = function (id) {
  const w = G.WEAPONS[id];
  return Object.assign({}, w, {
    name: w.name + ' ★', dmg: Math.round(w.dmg * (w.wonder ? 1.6 : 2.1)), mag: Math.round(w.mag * 1.5), reserve: Math.round(w.reserve * 1.6),
    reload: w.reload * 0.85, color: w.wonder ? 0xc040ff : 0x8a40c0, upgraded: true, splash: w.splash ? w.splash * 1.3 : 0,
  });
};
G.weaponStats = (slot) => (slot.up ? G.upgradeStats(slot.id) : G.WEAPONS[slot.id]);

G.makeWeaponModel = function (id, up) {
  const w = up ? G.upgradeStats(id) : G.WEAPONS[id];
  const g = new THREE.Group();
  const body = new THREE.MeshLambertMaterial({ color: w.color });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1c1c1e });
  const wood = new THREE.MeshLambertMaterial({ color: up ? 0xd4a020 : 0x7a5228 });
  const glow = new THREE.MeshBasicMaterial({ color: up ? 0xff60ff : 0x60ffb0 });
  const box = (sx, sy, sz, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); g.add(b); return b; };
  const L = w.len;
  // corps
  box(0.08, 0.1, L * 0.55, 0, 0, -L * 0.15, body);
  // canon
  box(0.04, 0.04, L * 0.5, 0, 0.02, -L * 0.6, dark);
  // poignée
  box(0.06, 0.13, 0.07, 0, -0.1, 0.02, w.id === 'shotgun' || w.id === 'rifle' || w.id === 'sniper' ? wood : dark);
  if (w.id !== 'pistol' && w.id !== 'magnum') {
    // crosse
    box(0.06, 0.09, 0.2, 0, -0.02, 0.2, w.id === 'smg' ? dark : wood);
    // chargeur
    if (w.drum) box(0.12, 0.12, 0.12, 0, -0.1, -L * 0.2, dark);
    else if (w.id !== 'shotgun') box(0.05, 0.14, 0.06, 0, -0.12, -L * 0.22, dark);
    else box(0.07, 0.06, L * 0.3, 0, -0.06, -L * 0.45, wood);
  }
  if (w.id === 'magnum') { box(0.09, 0.09, 0.08, 0, 0.0, -0.08, dark); }
  if (w.scope) { box(0.05, 0.05, 0.28, 0, 0.09, -0.1, dark); box(0.06, 0.06, 0.02, 0, 0.09, -0.25, glow); }
  if (w.wonder) {
    box(0.12, 0.12, 0.12, 0, 0.0, -L * 0.45, glow);
    box(0.02, 0.02, L * 0.4, 0.05, 0.06, -L * 0.3, glow);
    box(0.02, 0.02, L * 0.4, -0.05, 0.06, -L * 0.3, glow);
  } else {
    box(0.02, 0.025, 0.02, 0, 0.065, -L * 0.75, glow); // guidon
  }
  if (up) { const r = box(0.085, 0.02, L * 0.5, 0, 0.055, -L * 0.15, glow); r.scale.x = 1.02; }
  g.userData.muzzle = new THREE.Vector3(0, 0.02, -L * 0.85 - 0.05);
  return g;
};
