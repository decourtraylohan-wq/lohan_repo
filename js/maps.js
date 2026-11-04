// Générateurs des cartes
G.Maps = (function () {
  const B = G.B;
  const SIZE = 64, HEIGHT = 32;

  // --- Aides de construction ---
  function terrain(w, heightFn, layers) {
    for (let z = 0; z < w.D; z++) for (let x = 0; x < w.W; x++) {
      const h = Math.round(heightFn(x, z));
      w.set(x, 0, z, B.BEDROCK);
      for (let y = 1; y <= h; y++) w.set(x, y, z, layers(x, y, z, h));
    }
  }
  function flatten(w, cx, cz, r, h, surface, under) {
    for (let z = cz - r; z <= cz + r; z++) for (let x = cx - r; x <= cx + r; x++) {
      if (Math.hypot(x - cx, z - cz) > r) continue;
      for (let y = 1; y < w.H; y++) {
        if (y < h) w.set(x, y, z, under);
        else if (y === h) w.set(x, y, z, surface);
        else w.set(x, y, z, B.AIR);
      }
    }
  }
  function tree(w, x, y, z, rnd) {
    const th = 4 + Math.floor(rnd() * 2);
    for (let i = 1; i <= th; i++) w.set(x, y + i, z, B.LOG);
    for (let dy = th - 1; dy <= th + 1; dy++) {
      const r = dy === th + 1 ? 1 : 2;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) === r && Math.abs(dz) === r && rnd() < 0.6) continue;
        if (!w.get(x + dx, y + dy, z + dz)) w.set(x + dx, y + dy, z + dz, B.LEAVES);
      }
    }
    w.set(x, y + th + 2, z, B.LEAVES);
  }
  function pine(w, x, y, z, rnd) {
    const th = 5 + Math.floor(rnd() * 3);
    for (let i = 1; i <= th; i++) w.set(x, y + i, z, B.LOG);
    let r = 2;
    for (let dy = 2; dy <= th + 1; dy++) {
      const rr = dy === th + 1 ? 0 : r;
      for (let dz = -rr; dz <= rr; dz++) for (let dx = -rr; dx <= rr; dx++) {
        if (Math.abs(dx) + Math.abs(dz) > rr + 0.5) continue;
        if (!w.get(x + dx, y + dy, z + dz)) w.set(x + dx, y + dy, z + dz, B.PINE);
      }
      if (dy % 2 === 0) r = Math.max(1, r - 1);
    }
    w.set(x, y + th + 2, z, B.PINE);
  }
  function palm(w, x, y, z, rnd) {
    const th = 5 + Math.floor(rnd() * 2);
    for (let i = 1; i <= th; i++) w.set(x, y + i, z, B.LOG);
    const t = y + th + 1;
    w.set(x, t, z, B.LEAVES);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      w.set(x + dx, t, z + dz, B.LEAVES); w.set(x + dx * 2, t, z + dz * 2, B.LEAVES); w.set(x + dx * 3, t - 1, z + dz * 3, B.LEAVES);
    }
  }
  // maison : (x0,z0) coin, taille sx*sz, porte côté 'n','s','e','w'
  function house(w, x0, z0, sx, sz, gy, door, wall, corner, roof) {
    const x1 = x0 + sx - 1, z1 = z0 + sz - 1;
    w.fill(x0, gy, z0, x1, gy, z1, B.COBBLE);
    w.fill(x0, gy + 1, z0, x1, gy + 5, z1, B.AIR);
    for (let y = gy + 1; y <= gy + 3; y++) {
      for (let x = x0; x <= x1; x++) { w.set(x, y, z0, wall); w.set(x, y, z1, wall); }
      for (let z = z0; z <= z1; z++) { w.set(x0, y, z, wall); w.set(x1, y, z, wall); }
      w.set(x0, y, z0, corner); w.set(x1, y, z0, corner); w.set(x0, y, z1, corner); w.set(x1, y, z1, corner);
    }
    const mx = Math.floor((x0 + x1) / 2), mz = Math.floor((z0 + z1) / 2);
    // fenêtres
    w.set(x0, gy + 2, mz, B.AIR); w.set(x1, gy + 2, mz, B.AIR); w.set(mx, gy + 2, z0, B.AIR); w.set(mx, gy + 2, z1, B.AIR);
    // porte (2 de large)
    const doorCells = door === 'n' ? [[mx, z0], [mx + 1, z0]] : door === 's' ? [[mx, z1], [mx + 1, z1]] : door === 'w' ? [[x0, mz], [x0, mz + 1]] : [[x1, mz], [x1, mz + 1]];
    for (const [dx, dz] of doorCells) { w.set(dx, gy + 1, dz, B.AIR); w.set(dx, gy + 2, dz, B.AIR); }
    // toit en escalier
    w.fill(x0 - 1, gy + 4, z0 - 1, x1 + 1, gy + 4, z1 + 1, roof);
    w.fill(x0 + 1, gy + 5, z0 + 1, x1 - 1, gy + 5, z1 - 1, roof);
    if (sx > 5 && sz > 5) w.fill(x0 + 2, gy + 6, z0 + 2, x1 - 2, gy + 6, z1 - 2, roof);
    return { mx, mz };
  }
  function edgeSpawns(margin, step) {
    const s = [];
    for (let i = margin; i < SIZE - margin; i += step) { s.push([i, margin]); s.push([i, SIZE - 1 - margin]); s.push([margin, i]); s.push([SIZE - 1 - margin, i]); }
    return s;
  }

  // ---------------- CARTES ----------------
  const list = [];

  list.push({
    id: 'village', name: 'Village Sylvestre', desc: 'Un hameau perdu au milieu des bois. Idéal pour débuter.', stars: 1, rpMult: 1.0,
    sky: 0x86b8e8, fog: [0x9cc4e8, 18, 62], hemi: [0xdfefff, 0x5a4a30, 0.75], sun: [0xfff2d0, 0.85], weather: null,
    build(w, rnd) {
      const n = G.makeNoise(101);
      terrain(w, (x, z) => 6 + (n(x * 0.06, z * 0.06) - 0.5) * 6, (x, y, z, h) => (y === h ? B.GRASS : y > h - 3 ? B.DIRT : B.STONE));
      flatten(w, 32, 32, 14, 6, B.GRASS, B.DIRT);
      // chemins
      for (let i = 12; i < 52; i++) for (let d = -1; d <= 0; d++) { if (w.top(i, 32 + d) === 6) w.set(i, 6, 32 + d, B.GRAVEL); if (w.top(32 + d, i) === 6) w.set(32 + d, 6, i, B.GRAVEL); }
      house(w, 21, 20, 7, 7, 6, 's', B.PLANKS, B.LOG, B.STONEBRICK);
      house(w, 37, 20, 7, 7, 6, 's', B.PLANKS, B.LOG, B.STONEBRICK);
      house(w, 21, 38, 7, 7, 6, 'n', B.COBBLE, B.LOG, B.PLANKS);
      house(w, 37, 38, 7, 7, 6, 'n', B.PLANKS, B.LOG, B.STONEBRICK);
      // puits
      w.fill(31, 7, 27, 33, 7, 29, B.COBBLE); w.set(32, 7, 28, B.WATER); w.set(32, 6, 28, B.WATER);
      // bottes de foin et caisses
      for (const [x, z] of [[18, 31], [18, 33], [46, 30], [46, 34], [30, 45], [35, 19]]) w.set(x, 7, z, rnd() < 0.5 ? B.HAY : B.CRATE);
      w.set(46, 8, 30, B.HAY);
      // étang
      for (let z = 6; z < 15; z++) for (let x = 6; x < 17; x++) {
        if (Math.hypot((x - 11) / 5.5, (z - 10) / 4.5) < 1) { const t = w.top(x, z); w.set(x, t, z, B.WATER); w.set(x, t - 1, z, B.SAND); }
      }
      // arbres
      for (let i = 0; i < 70; i++) {
        const x = 3 + Math.floor(rnd() * 58), z = 3 + Math.floor(rnd() * 58);
        if (Math.hypot(x - 32, z - 32) < 17) continue;
        const t = w.top(x, z);
        if (w.get(x, t, z) !== B.GRASS) continue;
        if (w.get(x + 1, t + 1, z) || w.get(x - 1, t + 1, z) || w.get(x, t + 1, z + 1) || w.get(x, t + 1, z - 1)) continue;
        tree(w, x, t, z, rnd);
      }
    },
    player: [32, 34],
    stations: [
      { type: 'box', x: 34, z: 34 },
      { type: 'wall', weapon: 'smg', x: 28, z: 27 },
      { type: 'wall', weapon: 'shotgun', x: 36, z: 27 },
      { type: 'wall', weapon: 'rifle', x: 28, z: 37 },
      { type: 'wall', weapon: 'sniper', x: 44, z: 37 },
      { type: 'perk', perk: 'cuirasse', x: 24, z: 23, wave: 1 },
      { type: 'perk', perk: 'rafale', x: 40, z: 23, wave: 3 },
      { type: 'perk', perk: 'mainleste', x: 24, z: 41, wave: 5 },
      { type: 'perk', perk: 'souffle', x: 40, z: 41, wave: 2 },
      { type: 'perk', perk: 'foulee', x: 19, z: 36, wave: 4 },
      { type: 'perk', perk: 'bandouliere', x: 45, z: 28, wave: 7 },
      { type: 'forge', x: 30, z: 30, wave: 8 },
    ],
    spawns: edgeSpawns(3, 6),
  });

  list.push({
    id: 'desert', name: 'Ruines du Désert', desc: 'Une ziggourat oubliée sous un soleil de plomb. Peu d\'abris.', stars: 2, rpMult: 1.15,
    sky: 0xf0c890, fog: [0xe8c89a, 20, 66], hemi: [0xfff0d0, 0x8a6a40, 0.8], sun: [0xffe0a0, 1.0], weather: null,
    build(w, rnd) {
      const n = G.makeNoise(202);
      terrain(w, (x, z) => 6 + (n(x * 0.05, z * 0.05) - 0.5) * 7, (x, y, z, h) => (y > h - 3 ? B.SAND : B.SANDSTONE));
      flatten(w, 32, 32, 13, 6, B.SAND, B.SANDSTONE);
      // ziggourat à marches
      for (let lvl = 0; lvl < 6; lvl++) {
        const r = 7 - lvl;
        w.fill(32 - r, 7 + lvl, 32 - r, 32 + r, 7 + lvl, 32 + r, lvl % 2 ? B.SANDSTONE : B.STONEBRICK);
      }
      w.set(32, 13, 32, B.GLOW);
      // piliers en ruine
      for (let i = 0; i < 16; i++) {
        if (i % 4 === 0) continue; // garde les accès cardinaux dégagés
        const a = (i / 16) * Math.PI * 2, x = Math.round(32 + Math.cos(a) * 11), z = Math.round(32 + Math.sin(a) * 11);
        const hgt = 2 + Math.floor(rnd() * 4);
        for (let y = 7; y < 7 + hgt; y++) w.set(x, y, z, B.SANDSTONE);
      }
      // murs brisés
      const walls = [[14, 16, 22, 16], [44, 48, 50, 48], [16, 44, 16, 52], [48, 12, 48, 20]];
      for (const [ax, az, bx, bz] of walls) {
        for (let x = ax; x <= bx; x++) for (let z = az; z <= bz; z++) {
          const t = w.top(x, z); const hh = 1 + Math.floor(rnd() * 3);
          for (let y = t + 1; y <= t + hh; y++) w.set(x, y, z, B.SANDSTONE);
        }
      }
      // oasis
      for (let z = 46; z < 58; z++) for (let x = 42; x < 58; x++) {
        if (Math.hypot((x - 50) / 6, (z - 52) / 4.5) < 1) { const t = w.top(x, z); w.set(x, t, z, B.WATER); w.set(x, t - 1, z, B.SAND); }
      }
      palm(w, 43, w.top(43, 49), 49, rnd); palm(w, 56, w.top(56, 55), 55, rnd); palm(w, 47, w.top(47, 57), 57, rnd);
      // cactus
      for (let i = 0; i < 40; i++) {
        const x = 3 + Math.floor(rnd() * 58), z = 3 + Math.floor(rnd() * 58);
        if (Math.hypot(x - 32, z - 32) < 15) continue;
        const t = w.top(x, z);
        if (w.get(x, t, z) !== B.SAND) continue;
        const hh = 1 + Math.floor(rnd() * 3);
        for (let y = t + 1; y <= t + hh; y++) w.set(x, y, z, B.CACTUS);
      }
    },
    player: [32, 22],
    stations: [
      { type: 'box', x: 32, z: 20 },
      { type: 'wall', weapon: 'smg', x: 22, z: 26 },
      { type: 'wall', weapon: 'shotgun', x: 42, z: 26 },
      { type: 'wall', weapon: 'rifle', x: 22, z: 38 },
      { type: 'wall', weapon: 'sniper', x: 42, z: 38 },
      { type: 'perk', perk: 'cuirasse', x: 26, z: 21, wave: 1 },
      { type: 'perk', perk: 'souffle', x: 38, z: 21, wave: 2 },
      { type: 'perk', perk: 'rafale', x: 20, z: 32, wave: 3 },
      { type: 'perk', perk: 'foulee', x: 44, z: 32, wave: 4 },
      { type: 'perk', perk: 'mainleste', x: 26, z: 43, wave: 5 },
      { type: 'perk', perk: 'bandouliere', x: 38, z: 43, wave: 7 },
      { type: 'forge', x: 33, z: 32, wave: 8 },
    ],
    spawns: edgeSpawns(3, 6),
  });

  list.push({
    id: 'toundra', name: 'Avant-poste Gelé', desc: 'Un fort enneigé, de nuit. La visibilité est réduite.', stars: 3, rpMult: 1.3,
    sky: 0x1a2540, fog: [0x2a3858, 12, 46], hemi: [0x9ab0e0, 0x202838, 0.55], sun: [0xc0d0ff, 0.45], weather: 'snow',
    build(w, rnd) {
      const n = G.makeNoise(303);
      terrain(w, (x, z) => 6 + (n(x * 0.07, z * 0.07) - 0.5) * 8, (x, y, z, h) => (y === h ? B.SNOW : y > h - 3 ? B.DIRT : B.STONE));
      flatten(w, 32, 32, 15, 6, B.SNOW, B.DIRT);
      // fort
      const x0 = 22, x1 = 42, z0 = 22, z1 = 42;
      for (let y = 7; y <= 10; y++) {
        for (let x = x0; x <= x1; x++) { w.set(x, y, z0, B.STONEBRICK); w.set(x, y, z1, B.STONEBRICK); }
        for (let z = z0; z <= z1; z++) { w.set(x0, y, z, B.STONEBRICK); w.set(x1, y, z, B.STONEBRICK); }
      }
      for (let x = x0; x <= x1; x += 2) { w.set(x, 11, z0, B.STONEBRICK); w.set(x, 11, z1, B.STONEBRICK); }
      for (let z = z0; z <= z1; z += 2) { w.set(x0, 11, z, B.STONEBRICK); w.set(x1, 11, z, B.STONEBRICK); }
      // portes
      for (let d = -1; d <= 1; d++) for (let y = 7; y <= 9; y++) { w.set(32 + d, y, z0, B.AIR); w.set(32 + d, y, z1, B.AIR); w.set(x0, y, 32 + d, B.AIR); w.set(x1, y, 32 + d, B.AIR); }
      // tours d'angle
      for (const [tx, tz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) { w.fill(tx - 1, 7, tz - 1, tx + 1, 12, tz + 1, B.COBBLE); w.set(tx, 13, tz, B.GLOW); }
      // baraquements
      house(w, 26, 26, 6, 5, 6, 'e', B.PLANKS, B.LOG, B.SNOW);
      house(w, 34, 35, 6, 5, 6, 'w', B.PLANKS, B.LOG, B.SNOW);
      // lampadaires
      for (const [x, z] of [[29, 33], [36, 30], [32, 18], [32, 46], [18, 32], [46, 32]]) { const t = w.top(x, z); w.set(x, t + 1, z, B.LOG); w.set(x, t + 2, z, B.LOG); w.set(x, t + 3, z, B.GLOW); }
      // lac gelé
      for (let z = 4; z < 18; z++) for (let x = 40; x < 60; x++) {
        if (Math.hypot((x - 50) / 9, (z - 11) / 6) < 1) { const t = w.top(x, z); for (let y = t + 1; y < w.H; y++) w.set(x, y, z, B.AIR); w.set(x, t, z, B.ICE); }
      }
      // sapins
      for (let i = 0; i < 80; i++) {
        const x = 3 + Math.floor(rnd() * 58), z = 3 + Math.floor(rnd() * 58);
        if (Math.hypot(x - 32, z - 32) < 17) continue;
        const t = w.top(x, z);
        if (w.get(x, t, z) !== B.SNOW) continue;
        if (w.get(x + 1, t + 1, z) || w.get(x - 1, t + 1, z) || w.get(x, t + 1, z + 1) || w.get(x, t + 1, z - 1)) continue;
        pine(w, x, t, z, rnd);
      }
      // rochers
      for (let i = 0; i < 14; i++) {
        const x = 3 + Math.floor(rnd() * 58), z = 3 + Math.floor(rnd() * 58);
        if (Math.hypot(x - 32, z - 32) < 16) continue;
        const t = w.top(x, z); w.set(x, t + 1, z, B.STONE); if (rnd() < 0.5) w.set(x + 1, t + 1, z, B.MOSSY);
      }
    },
    player: [30, 31],
    stations: [
      { type: 'box', x: 32, z: 32 },
      { type: 'wall', weapon: 'smg', x: 24, z: 32 },
      { type: 'wall', weapon: 'shotgun', x: 40, z: 32 },
      { type: 'wall', weapon: 'rifle', x: 32, z: 24 },
      { type: 'wall', weapon: 'sniper', x: 32, z: 40 },
      { type: 'perk', perk: 'cuirasse', x: 24, z: 24, wave: 1 },
      { type: 'perk', perk: 'souffle', x: 40, z: 24, wave: 2 },
      { type: 'perk', perk: 'rafale', x: 24, z: 40, wave: 3 },
      { type: 'perk', perk: 'mainleste', x: 40, z: 40, wave: 5 },
      { type: 'perk', perk: 'foulee', x: 28, z: 37, wave: 4 },
      { type: 'perk', perk: 'bandouliere', x: 37, z: 27, wave: 7 },
      { type: 'forge', x: 35, z: 33, wave: 8 },
    ],
    spawns: edgeSpawns(3, 6),
  });

  list.push({
    id: 'enfer', name: 'Forteresse Infernale', desc: 'Rivières de lave et forteresse maudite. Pour les vétérans.', stars: 4, rpMult: 1.5,
    sky: 0x2a0806, fog: [0x4a120a, 10, 50], hemi: [0xff9a70, 0x301010, 0.6], sun: [0xff6a3a, 0.55], weather: 'ash',
    build(w, rnd) {
      const n = G.makeNoise(404);
      terrain(w, (x, z) => 7 + (n(x * 0.08, z * 0.08) - 0.5) * 8, (x, y, z, h) => (y === h ? (n(x * 0.3, z * 0.3) > 0.55 ? B.REDSAND : B.BASALT) : B.BASALT));
      flatten(w, 32, 32, 12, 7, B.DARKBRICK, B.BASALT);
      // rivières de lave
      for (let x = 0; x < 64; x++) {
        const zc = Math.round(14 + Math.sin(x * 0.15) * 3), zc2 = Math.round(50 + Math.cos(x * 0.13) * 3);
        for (const c of [zc, zc2]) for (let dz = -1; dz <= 1; dz++) {
          const z = c + dz; const t = w.top(x, z);
          for (let y = t; y > 4; y--) w.set(x, y, z, B.AIR);
          w.set(x, 4, z, B.LAVA); w.set(x, 3, z, B.MAGMA);
        }
      }
      // ponts
      for (const bx of [10, 32, 54]) for (const c of [14, 50]) {
        for (let dx = -1; dx <= 1; dx++) {
          const x = bx + dx;
          const zc = Math.round(c === 14 ? 14 + Math.sin(x * 0.15) * 3 : 50 + Math.cos(x * 0.13) * 3);
          for (let dz = -5; dz <= 5; dz++) {
            const z = zc + dz;
            for (let y = 7; y < w.H; y++) w.set(x, y, z, B.AIR);
            w.set(x, 5, z, B.DARKBRICK); w.set(x, 6, z, B.DARKBRICK);
          }
        }
      }
      // donjon central
      const k0 = 25, k1 = 39;
      for (let y = 8; y <= 11; y++) {
        for (let i = k0; i <= k1; i++) { w.set(i, y, k0, B.DARKBRICK); w.set(i, y, k1, B.DARKBRICK); w.set(k0, y, i, B.DARKBRICK); w.set(k1, y, i, B.DARKBRICK); }
      }
      for (let d = -1; d <= 1; d++) for (let y = 8; y <= 10; y++) { w.set(32 + d, y, k0, B.AIR); w.set(32 + d, y, k1, B.AIR); w.set(k0, y, 32 + d, B.AIR); w.set(k1, y, 32 + d, B.AIR); }
      for (const [tx, tz] of [[k0, k0], [k1, k0], [k0, k1], [k1, k1]]) { w.fill(tx, 8, tz, tx, 14, tz, B.OBSIDIAN); w.set(tx, 15, tz, B.MAGMA); }
      w.fill(31, 8, 31, 33, 8, 33, B.OBSIDIAN); w.set(32, 9, 32, B.GLOW);
      // piliers d'obsidienne et lumières
      for (let i = 0; i < 26; i++) {
        const x = 3 + Math.floor(rnd() * 58), z = 3 + Math.floor(rnd() * 58);
        if (Math.hypot(x - 32, z - 32) < 15) continue;
        const t = w.top(x, z); if (t < 6) continue;
        const hh = 2 + Math.floor(rnd() * 6);
        for (let y = t + 1; y <= t + hh; y++) w.set(x, y, z, rnd() < 0.8 ? B.OBSIDIAN : B.BASALT);
        if (rnd() < 0.4) w.set(x, t + hh + 1, z, B.GLOW);
      }
      for (let i = 0; i < 30; i++) { const x = Math.floor(rnd() * 64), z = Math.floor(rnd() * 64); const t = w.top(x, z); if (t >= 6 && w.get(x, t, z) !== B.LAVA) w.set(x, t, z, B.MAGMA); }
    },
    player: [32, 29],
    stations: [
      { type: 'box', x: 32, z: 35 },
      { type: 'wall', weapon: 'smg', x: 27, z: 29 },
      { type: 'wall', weapon: 'shotgun', x: 37, z: 29 },
      { type: 'wall', weapon: 'rifle', x: 27, z: 36 },
      { type: 'wall', weapon: 'sniper', x: 37, z: 36 },
      { type: 'perk', perk: 'cuirasse', x: 21, z: 25, wave: 1 },
      { type: 'perk', perk: 'souffle', x: 43, z: 25, wave: 2 },
      { type: 'perk', perk: 'rafale', x: 21, z: 39, wave: 3 },
      { type: 'perk', perk: 'mainleste', x: 43, z: 39, wave: 5 },
      { type: 'perk', perk: 'foulee', x: 32, z: 21, wave: 4 },
      { type: 'perk', perk: 'bandouliere', x: 32, z: 43, wave: 7 },
      { type: 'forge', x: 29, z: 32, wave: 8 },
    ],
    spawns: edgeSpawns(3, 6),
  });

  function create(id) {
    const def = list.find((m) => m.id === id) || list[0];
    const w = new G.World(SIZE, HEIGHT, SIZE);
    def.build(w, G.mulberry32(def.id.length * 1337 + def.stars));
    // dégager l'emplacement des stations et les rendre solides
    for (const s of def.stations) {
      let t = w.top(s.x, s.z);
      for (let y = 1; y < w.H - 2; y++) { if (w.isSolid(s.x, y - 1, s.z) && !w.isSolid(s.x, y, s.z) && !w.isSolid(s.x, y + 1, s.z)) { t = y - 1; break; } }
      for (let y = t + 1; y < t + 4; y++) w.set(s.x, y, s.z, B.AIR);
      s.y = t + 1;
      const tall = s.type === 'perk' ? 2 : 1;
      for (let y = 0; y < tall; y++) w.set(s.x, s.y + y, s.z, B.METAL);
    }
    w.buildNav();
    for (const s of def.stations) w.hazard[s.z * w.W + s.x] = 1; // les zombies contournent les stations
    const py = w.standAt(def.player[0], def.player[1]);
    const spawns = def.spawns.filter(([x, z]) => w.standAt(x, z) < 999 && !w.hazard[z * w.W + x]);
    return { def, world: w, playerSpawn: new THREE.Vector3(def.player[0] + 0.5, py, def.player[1] + 0.5), spawns };
  }

  // vue de dessus colorée (mini-carte et vignettes)
  function topDown(w) {
    const c = document.createElement('canvas'); c.width = w.W; c.height = w.D;
    const ctx = c.getContext('2d');
    const cols = { 1: 0x5fa83a, 2: 0x8a5a35, 3: 0x7d7d7d, 4: 0x8a8a8a, 5: 0x6b4c2c, 6: 0xa98653, 7: 0x3e7d24, 8: 0xdccf8e, 9: 0xd2bf7e, 10: 0xf2f6fa, 11: 0x9cc7f0, 12: 0x9c4a3a, 13: 0x3b3a40, 14: 0x2d1f40, 15: 0xf06a10, 16: 0x2e64c8, 17: 0xffe080, 18: 0x2f7424, 19: 0x2b5a3a, 20: 0xc6c9cc, 21: 0x857f7b, 23: 0x4a1a20, 24: 0xb58a4e, 25: 0xd6b23a, 26: 0x7a7a7a, 27: 0x5c7a44, 28: 0xa04010, 29: 0xb8643a };
    for (let z = 0; z < w.D; z++) for (let x = 0; x < w.W; x++) {
      let y = w.H - 1, b = 0;
      for (; y >= 0; y--) { b = w.get(x, y, z); if (b) break; }
      const col = cols[b] || 0x555555;
      const shade = G.clamp(0.55 + y * 0.04, 0.5, 1.2);
      ctx.fillStyle = 'rgb(' + Math.min(255, ((col >> 16) & 255) * shade) + ',' + Math.min(255, ((col >> 8) & 255) * shade) + ',' + Math.min(255, (col & 255) * shade) + ')';
      ctx.fillRect(x, z, 1, 1);
    }
    return c;
  }
  G.topDown = topDown;

  return { list, create };
})();
