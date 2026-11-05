// Armes : définitions et modèles 3D détaillés
G.WEAPONS = {
  pistol: { id: 'pistol', name: 'M19 Sentinelle', cls: 'Pistolet', dmg: 34, pellets: 1, spread: [0.014, 0.004], rpm: 400, auto: false, mag: 10, reserve: 80, reload: 1.3, range: 60, pierce: 1, headMult: 2.2, price: 500, box: 0, recoil: 0.02, zoom: 0.85, move: 1.0, sound: 'pistol', color: 0x44474c },
  smg: { id: 'smg', name: 'Vipère SMG', cls: 'Mitraillette', dmg: 26, pellets: 1, spread: [0.032, 0.012], rpm: 800, auto: true, mag: 32, reserve: 192, reload: 1.8, range: 45, pierce: 1, headMult: 2, price: 1200, box: 3, recoil: 0.012, zoom: 0.8, move: 1.05, sound: 'smg', color: 0x3e4044 },
  shotgun: { id: 'shotgun', name: 'Brise-Os', cls: 'Fusil à pompe', dmg: 24, pellets: 9, spread: [0.09, 0.06], rpm: 80, auto: false, mag: 6, reserve: 48, reload: 2.6, range: 24, pierce: 1, headMult: 1.6, price: 1500, box: 3, recoil: 0.07, zoom: 0.85, move: 0.95, sound: 'shotgun', color: 0x44454a, pump: true },
  rifle: { id: 'rifle', name: 'Kodiak AR', cls: "Fusil d'assaut", dmg: 44, pellets: 1, spread: [0.024, 0.004], rpm: 620, auto: true, mag: 30, reserve: 240, reload: 2.2, range: 80, pierce: 2, headMult: 2, price: 2200, box: 3, recoil: 0.016, zoom: 0.7, move: 0.95, sound: 'rifle', color: 0x484a44 },
  sniper: { id: 'sniper', name: 'Faucon .50', cls: 'Sniper', dmg: 330, pellets: 1, spread: [0.06, 0.0], rpm: 45, auto: false, mag: 5, reserve: 40, reload: 3.0, range: 120, pierce: 5, headMult: 3, price: 3000, box: 2, recoil: 0.09, zoom: 0.28, move: 0.9, sound: 'sniper', color: 0x4c5640, scope: true },
  magnum: { id: 'magnum', name: 'Fracas .44', cls: 'Revolver', dmg: 170, pellets: 1, spread: [0.02, 0.003], rpm: 170, auto: false, mag: 6, reserve: 54, reload: 2.4, range: 70, pierce: 2, headMult: 3, price: 0, box: 3, recoil: 0.06, zoom: 0.8, move: 1.0, sound: 'magnum', color: 0x8a8d92 },
  lmg: { id: 'lmg', name: 'Marteau LMG', cls: 'Mitrailleuse', dmg: 48, pellets: 1, spread: [0.04, 0.014], rpm: 700, auto: true, mag: 100, reserve: 400, reload: 4.2, range: 80, pierce: 2, headMult: 1.8, price: 0, box: 2, recoil: 0.014, zoom: 0.75, move: 0.85, sound: 'lmg', color: 0x4a4c42 },
  ray: { id: 'ray', name: 'Désintégrateur', cls: 'Arme spéciale', dmg: 650, pellets: 1, spread: [0.01, 0.004], rpm: 200, auto: false, mag: 20, reserve: 120, reload: 2.8, range: 90, pierce: 1, headMult: 1, price: 0, box: 1, recoil: 0.03, zoom: 0.8, move: 1.0, sound: 'energy', color: 0x2aa86a, projectile: true, splash: 3.2, wonder: true },
};

G.upgradeStats = function (id) {
  const w = G.WEAPONS[id];
  return Object.assign({}, w, {
    name: w.name + ' ★', dmg: Math.round(w.dmg * (w.wonder ? 1.6 : 2.1)), mag: Math.round(w.mag * 1.5), reserve: Math.round(w.reserve * 1.6),
    reload: w.reload * 0.85, upgraded: true, splash: w.splash ? w.splash * 1.3 : 0,
  });
};
G.weaponStats = (slot) => (slot.up ? G.upgradeStats(slot.id) : G.WEAPONS[slot.id]);

// Modèle 3D. L'arme pointe vers -Z, la poignée est à l'origine.
// userData : muzzle (bout du canon), sightY (hauteur de la ligne de visée), bolt / pump / mag (pièces animées), eject (fenêtre d'éjection)
G.makeWeaponModel = function (id, up, simple) {
  const g = new THREE.Group();
  const M = (color, shin = 40) => simple ? new THREE.MeshLambertMaterial({ color }) : new THREE.MeshPhongMaterial({ color, shininess: shin, specular: 0x333333 });
  const camo = up ? G.Tex.pix('upcamo', 16, 16, (ctx, rnd, px) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = Math.sin(x * 0.8 + y * 0.5) + Math.sin(y * 1.1 - x * 0.3); px(x, y, v > 0.6 ? 0xd040ff : v > -0.4 ? 0x5a1a8a : 0x1a0a2a); } }) : null;
  const metal = up ? (simple ? new THREE.MeshLambertMaterial({ map: camo }) : new THREE.MeshPhongMaterial({ map: camo, shininess: 70, specular: 0x8040a0 })) : M(G.WEAPONS[id].color, 60);
  const dark = M(0x2a2b2e, 40), poly = M(0x35363a, 18), steel = M(0x7a7d82, 90);
  const wood = M(up ? 0x2a1040 : 0x6b4426, 20), tan = M(0xa48a62, 15);
  const glow = new THREE.MeshBasicMaterial({ color: up ? 0xff60ff : 0x60ffb0 });
  const lens = new THREE.MeshBasicMaterial({ color: 0x3a8ac8 });
  const brass = M(0xc8a040, 80);
  const box = (sx, sy, sz, x, y, z, m, parent = g) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); parent.add(b); return b; };
  const cyl = (r, l, x, y, z, m, seg = 8, parent = g) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, seg), m); c.rotation.x = Math.PI / 2; c.position.set(x, y, z); parent.add(c); return c; };
  const U = g.userData;

  if (id === 'pistol') {
    U.bolt = box(0.032, 0.034, 0.19, 0, 0.044, -0.06, metal);
    for (let i = 0; i < 4; i++) box(0.033, 0.026, 0.004, 0, 0.044, 0.0 + i * 0.008, dark);
    box(0.03, 0.026, 0.165, 0, 0.012, -0.055, poly);
    const grip = box(0.03, 0.11, 0.05, 0, -0.05, 0.015, poly); grip.rotation.x = 0.22;
    box(0.006, 0.02, 0.045, 0, -0.012, -0.03, poly);
    U.mag = box(0.024, 0.02, 0.04, 0, -0.105, 0.028, dark);
    box(0.004, 0.01, 0.006, 0, 0.066, -0.145, dark); box(0.007, 0.012, 0.006, -0.009, 0.066, 0.025, dark); box(0.007, 0.012, 0.006, 0.009, 0.066, 0.025, dark);
    cyl(0.009, 0.02, 0, 0.046, -0.16, steel);
    U.sightY = 0.07; U.muzzle = new THREE.Vector3(0, 0.046, -0.18); U.eject = new THREE.Vector3(0.02, 0.05, -0.04);
  } else if (id === 'smg') {
    box(0.045, 0.06, 0.28, 0, 0.03, -0.1, metal);
    for (let i = 0; i < 5; i++) box(0.05, 0.05, 0.012, 0, 0.026, -0.2 - i * 0.022, poly);
    cyl(0.011, 0.1, 0, 0.035, -0.31, dark);
    const mg = new THREE.Group(); mg.position.set(0, -0.02, -0.12); g.add(mg); U.mag = mg;
    box(0.026, 0.1, 0.04, 0, -0.04, 0, dark, mg); const m2 = box(0.026, 0.08, 0.04, 0, -0.11, -0.018, dark, mg); m2.rotation.x = 0.35;
    const grip = box(0.032, 0.1, 0.045, 0, -0.04, 0.02, poly); grip.rotation.x = 0.25;
    box(0.008, 0.008, 0.18, 0.018, 0.02, 0.12, steel); box(0.008, 0.008, 0.18, -0.018, 0.02, 0.12, steel); box(0.044, 0.05, 0.012, 0, 0.0, 0.21, poly);
    box(0.006, 0.022, 0.014, -0.008, 0.07, 0.015, dark); box(0.006, 0.022, 0.014, 0.008, 0.07, 0.015, dark); box(0.022, 0.024, 0.01, 0, 0.068, -0.22, dark); box(0.004, 0.016, 0.004, 0, 0.07, -0.22, steel);
    U.bolt = box(0.012, 0.012, 0.03, -0.028, 0.045, -0.17, steel);
    U.sightY = 0.078; U.muzzle = new THREE.Vector3(0, 0.035, -0.37); U.eject = new THREE.Vector3(0.026, 0.04, -0.08);
  } else if (id === 'shotgun') {
    box(0.046, 0.06, 0.24, 0, 0.02, -0.05, metal);
    cyl(0.014, 0.5, 0, 0.04, -0.42, steel);
    cyl(0.012, 0.36, 0, 0.012, -0.35, dark);
    U.pump = box(0.04, 0.04, 0.15, 0, 0.012, -0.3, simple ? poly : wood);
    for (let i = 0; i < 6; i++) box(0.042, 0.042, 0.006, 0, 0, 0.055 - i * 0.022, dark, U.pump);
    const stock = box(0.04, 0.07, 0.26, 0, -0.02, 0.18, wood); stock.rotation.x = -0.12;
    box(0.042, 0.075, 0.02, 0, -0.035, 0.31, poly);
    const grip = box(0.03, 0.08, 0.04, 0, -0.04, 0.03, wood); grip.rotation.x = 0.3;
    box(0.006, 0.006, 0.006, 0, 0.058, -0.66, brass);
    U.sightY = 0.06; U.muzzle = new THREE.Vector3(0, 0.04, -0.68); U.eject = new THREE.Vector3(0.026, 0.03, -0.04);
  } else if (id === 'rifle') {
    box(0.044, 0.05, 0.3, 0, 0.035, -0.08, metal);
    box(0.04, 0.04, 0.22, 0, -0.005, -0.06, metal);
    box(0.054, 0.054, 0.24, 0, 0.03, -0.34, poly);
    for (let i = 0; i < 10; i++) box(0.024, 0.006, 0.012, 0, 0.062, -0.24 - i * 0.022, dark);
    cyl(0.011, 0.16, 0, 0.03, -0.53, dark); box(0.026, 0.026, 0.05, 0, 0.03, -0.62, dark);
    box(0.004, 0.05, 0.008, 0, 0.075, -0.44, dark); box(0.02, 0.012, 0.012, 0, 0.055, -0.44, dark);
    box(0.024, 0.016, 0.22, 0, 0.068, -0.06, dark); box(0.006, 0.024, 0.02, -0.009, 0.084, 0.03, dark); box(0.006, 0.024, 0.02, 0.009, 0.084, 0.03, dark);
    const mg = new THREE.Group(); mg.position.set(0, -0.03, -0.12); g.add(mg); U.mag = mg;
    const s1 = box(0.028, 0.1, 0.055, 0, -0.04, 0, dark, mg); s1.rotation.x = 0.12; const s2 = box(0.028, 0.08, 0.05, 0, -0.12, -0.03, dark, mg); s2.rotation.x = 0.4;
    const grip = box(0.032, 0.1, 0.042, 0, -0.06, 0.04, poly); grip.rotation.x = 0.3;
    box(0.04, 0.06, 0.2, 0, 0.0, 0.17, poly); box(0.042, 0.09, 0.03, 0, -0.012, 0.27, poly);
    U.bolt = box(0.012, 0.014, 0.03, 0.026, 0.045, -0.06, steel);
    U.sightY = 0.092; U.muzzle = new THREE.Vector3(0, 0.03, -0.66); U.eject = new THREE.Vector3(0.026, 0.045, -0.04);
  } else if (id === 'sniper') {
    box(0.046, 0.05, 0.3, 0, 0.03, -0.06, metal);
    cyl(0.013, 0.62, 0, 0.035, -0.5, steel); box(0.034, 0.03, 0.06, 0, 0.035, -0.83, dark);
    const stock = box(0.05, 0.08, 0.5, 0, 0.0, -0.05, tan); stock.position.z = 0.0;
    box(0.05, 0.1, 0.22, 0, -0.02, 0.2, tan); box(0.044, 0.03, 0.12, 0, 0.055, 0.16, tan);
    cyl(0.02, 0.32, 0, 0.105, -0.07, dark, 10);
    cyl(0.026, 0.07, 0, 0.105, -0.25, dark, 10); cyl(0.024, 0.05, 0, 0.105, 0.11, dark, 10);
    box(0.012, 0.03, 0.02, 0, 0.075, -0.15, dark); box(0.012, 0.03, 0.02, 0, 0.075, 0.03, dark);
    const l1 = cyl(0.021, 0.004, 0, 0.105, -0.287, lens, 10); l1.material = lens;
    U.bolt = new THREE.Group(); U.bolt.position.set(0.03, 0.045, 0.02); g.add(U.bolt);
    box(0.06, 0.012, 0.012, 0.025, 0, 0, steel, U.bolt); box(0.02, 0.02, 0.02, 0.055, 0, 0, dark, U.bolt);
    U.mag = box(0.03, 0.05, 0.07, 0, -0.04, -0.06, dark);
    const b1 = box(0.008, 0.008, 0.16, 0.02, -0.01, -0.62, dark); b1.rotation.x = 0.2; const b2 = box(0.008, 0.008, 0.16, -0.02, -0.01, -0.62, dark); b2.rotation.x = 0.2;
    U.sightY = 0.105; U.muzzle = new THREE.Vector3(0, 0.035, -0.87); U.eject = new THREE.Vector3(0.026, 0.04, -0.02);
  } else if (id === 'magnum') {
    box(0.03, 0.05, 0.1, 0, 0.03, -0.04, metal);
    const cy = cyl(0.028, 0.06, 0, 0.028, -0.06, steel, 6); U.cyl = cy;
    box(0.022, 0.028, 0.2, 0, 0.04, -0.18, metal); box(0.012, 0.01, 0.2, 0, 0.058, -0.18, metal);
    box(0.006, 0.016, 0.01, 0, 0.07, -0.27, dark);
    const grip = box(0.03, 0.1, 0.045, 0, -0.04, 0.03, wood); grip.rotation.x = 0.35;
    U.bolt = box(0.01, 0.025, 0.015, 0, 0.065, 0.01, steel);
    box(0.006, 0.02, 0.04, 0, -0.005, -0.02, steel);
    U.sightY = 0.075; U.muzzle = new THREE.Vector3(0, 0.04, -0.29);
  } else if (id === 'lmg') {
    box(0.07, 0.08, 0.32, 0, 0.03, -0.06, metal);
    box(0.072, 0.025, 0.22, 0, 0.083, -0.07, dark);
    cyl(0.03, 0.34, 0, 0.035, -0.4, poly, 8);
    for (let i = 0; i < 6; i++) box(0.065, 0.012, 0.012, 0, 0.065, -0.27 - i * 0.045, dark);
    cyl(0.012, 0.18, 0, 0.035, -0.65, steel); box(0.03, 0.03, 0.05, 0, 0.035, -0.75, dark);
    const mg = new THREE.Group(); mg.position.set(0.0, -0.06, -0.08); g.add(mg); U.mag = mg;
    box(0.11, 0.1, 0.11, 0, -0.02, 0, poly, mg); box(0.112, 0.02, 0.112, 0, 0.02, 0, dark, mg);
    for (let i = 0; i < 5; i++) box(0.012, 0.016, 0.02, 0.04 - i * 0.008, 0.05 + i * 0.006, -0.01, brass, mg);
    box(0.016, 0.05, 0.09, 0, 0.13, -0.12, dark);
    const grip = box(0.034, 0.1, 0.045, 0, -0.05, 0.08, poly); grip.rotation.x = 0.3;
    box(0.05, 0.08, 0.2, 0, 0.0, 0.22, poly);
    const b1 = box(0.01, 0.01, 0.2, 0.025, 0.0, -0.55, dark); b1.rotation.x = 0.15; const b2 = box(0.01, 0.01, 0.2, -0.025, 0.0, -0.55, dark); b2.rotation.x = 0.15;
    U.bolt = box(0.014, 0.014, 0.03, 0.04, 0.05, -0.02, steel);
    U.sightY = 0.1; U.muzzle = new THREE.Vector3(0, 0.035, -0.79); U.eject = new THREE.Vector3(0.04, 0.03, -0.04);
  } else if (id === 'ray') {
    box(0.07, 0.08, 0.3, 0, 0.03, -0.08, metal);
    for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 12), glow); r.position.set(0, 0.03, -0.26 - i * 0.05); g.add(r); }
    cyl(0.018, 0.24, 0, 0.03, -0.33, steel);
    box(0.05, 0.05, 0.05, 0, 0.03, -0.47, glow);
    box(0.04, 0.09, 0.06, 0.0, 0.1, -0.02, glow);
    const grip = box(0.034, 0.1, 0.045, 0, -0.05, 0.03, poly); grip.rotation.x = 0.3;
    U.mag = box(0.03, 0.05, 0.06, 0, -0.04, -0.12, glow);
    U.sightY = 0.08; U.muzzle = new THREE.Vector3(0, 0.03, -0.5);
  }
  if (up && !simple) {
    const strip = box(0.004, 0.006, 0.15, 0.03, 0.04, -0.1, glow);
    strip.position.x = 0.028;
  }
  U.boltBase = U.bolt ? U.bolt.position.clone() : null;
  U.pumpBase = U.pump ? U.pump.position.clone() : null;
  U.magBase = U.mag ? U.mag.position.clone() : null;
  U.brass = brass;
  return g;
};
