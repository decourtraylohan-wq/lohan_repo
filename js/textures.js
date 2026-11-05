// Textures pixel-art générées procéduralement (atlas des blocs + textures des entités)
G.Tex = (function () {
  const TILE = 16, COLS = 16;
  const tiles = {}; // nom -> index
  let atlasCanvas, atlasTexture;
  let next = 0;

  function rgb(c, v = 0) {
    const r = G.clamp(((c >> 16) & 255) + v, 0, 255), g = G.clamp(((c >> 8) & 255) + v, 0, 255), b = G.clamp((c & 255) + v, 0, 255);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function tile(name, draw) {
    const idx = next++;
    tiles[name] = idx;
    const x0 = (idx % COLS) * TILE, y0 = Math.floor(idx / COLS) * TILE;
    const ctx = atlasCanvas.getContext('2d');
    const rnd = G.mulberry32(idx * 7919 + 13);
    const px = (x, y, c, v = 0) => { ctx.fillStyle = rgb(c, v); ctx.fillRect(x0 + x, y0 + y, 1, 1); };
    const clear = (x, y) => ctx.clearRect(x0 + x, y0 + y, 1, 1);
    draw({ px, clear, rnd, ctx, x0, y0 });
  }

  function speckle(base, amt) {
    return ({ px, rnd }) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(x, y, base, Math.floor((rnd() - 0.5) * amt)); };
  }

  // pierres irrégulières (cellules de Voronoï répétables) : scories, basalte…
  function voronoi(palette, gap, n, pores) {
    return (t) => {
      const pts = [];
      for (let i = 0; i < n; i++) pts.push([t.rnd() * 16, t.rnd() * 16, palette[Math.floor(t.rnd() * palette.length)], Math.floor((t.rnd() - 0.5) * 24)]);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        let d1 = 1e9, d2 = 1e9, c = null;
        for (const p of pts) for (let ox = -16; ox <= 16; ox += 16) for (let oy = -16; oy <= 16; oy += 16) {
          const d = Math.hypot(x + 0.5 - p[0] - ox, y + 0.5 - p[1] - oy);
          if (d < d1) { d2 = d1; d1 = d; c = p; } else if (d < d2) d2 = d;
        }
        if (d2 - d1 < 1.1) t.px(x, y, gap, Math.floor((t.rnd() - 0.5) * 10));
        else {
          let v = c[3] + Math.floor((t.rnd() - 0.5) * 26) + (d1 < 2 ? 10 : 0);
          if (t.rnd() < pores) v -= 40;
          t.px(x, y, c[2], v);
        }
      }
    };
  }
  function buildAtlas() {
    atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = TILE * COLS; atlasCanvas.height = TILE * COLS;

    tile('grass_top', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, t.rnd() < 0.12 ? 0x5e7440 : 0x6d8248, Math.floor((t.rnd() - 0.5) * 26)); });
    tile('dirt', speckle(0x7a5a3e, 28));
    tile('grass_side', (t) => {
      speckle(0x8a5a35, 36)(t);
      for (let x = 0; x < 16; x++) { const d = 3 + Math.floor(t.rnd() * 3); for (let y = 0; y < d; y++) t.px(x, y, 0x6d8248, Math.floor((t.rnd() - 0.5) * 26)); }
    });
    tile('stone', (t) => { speckle(0x7d7d7d, 30)(t); for (let i = 0; i < 6; i++) { const x = Math.floor(t.rnd() * 14), y = Math.floor(t.rnd() * 15); t.px(x, y, 0x5e5e5e); t.px(x + 1, y, 0x5e5e5e); } });
    tile('cobble', (t) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const cell = ((Math.floor(x / 4) + Math.floor(y / 4) * 3) * 37) % 5;
        const edge = x % 4 === 0 || y % 4 === 0;
        t.px(x, y, edge ? 0x4f4f4f : 0x8a8a8a, edge ? 0 : (cell - 2) * 10 + Math.floor((t.rnd() - 0.5) * 20));
      }
    });
    tile('log_side', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, (x % 4 === 0) ? 0x4a3420 : 0x6b4c2c, Math.floor((t.rnd() - 0.5) * 20)); });
    tile('log_top', (t) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const r = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
        const c = r > 6.5 ? 0x4a3420 : (Math.floor(r) % 2 ? 0xb08a55 : 0x9a7445);
        t.px(x, y, c, Math.floor((t.rnd() - 0.5) * 14));
      }
    });
    tile('planks', (t) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const line = y % 4 === 3;
        const seam = (y % 8 < 4 ? x === 5 : x === 12) && !line;
        t.px(x, y, line || seam ? 0x6e5233 : 0xa98653, Math.floor((t.rnd() - 0.5) * 18));
      }
    });
    tile('leaves', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { if (t.rnd() < 0.18) t.clear(x, y); else t.px(x, y, 0x4a6534, Math.floor((t.rnd() - 0.5) * 36)); } });
    tile('sand', speckle(0xcdbf94, 20));
    tile('sandstone_top', speckle(0xd8c88a, 16));
    tile('sandstone_side', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const band = y < 3 ? 10 : y > 12 ? -14 : (y % 5 === 0 ? -10 : 0); t.px(x, y, 0xd2bf7e, band + Math.floor((t.rnd() - 0.5) * 12)); } });
    tile('snow', speckle(0xf2f6fa, 12));
    tile('snow_side', (t) => {
      speckle(0x8a5a35, 36)(t);
      for (let x = 0; x < 16; x++) { const d = 3 + Math.floor(t.rnd() * 3); for (let y = 0; y < d; y++) t.px(x, y, 0xf2f6fa, Math.floor((t.rnd() - 0.5) * 12)); }
    });
    tile('ice', (t) => { speckle(0x9cc7f0, 16)(t); for (let i = 0; i < 10; i++) { const x = Math.floor(t.rnd() * 15); const y = Math.floor(t.rnd() * 15); t.px(x, y, 0xe0f0ff); t.px(x + 1, y + 1, 0xe0f0ff); } });
    tile('brick', (t) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const row = Math.floor(y / 4), off = row % 2 ? 4 : 0;
        const mortar = y % 4 === 3 || (x + off) % 8 === 7;
        t.px(x, y, mortar ? 0xb5aca0 : 0x9c4a3a, mortar ? 0 : Math.floor((t.rnd() - 0.5) * 24));
      }
    });
    tile('basalt', voronoi([0x3c3634, 0x46403c, 0x34302e, 0x4c4440], 0x1c1818, 7, 0.25));
    tile('obsidian', (t) => { speckle(0x1d1428, 16)(t); for (let i = 0; i < 8; i++) t.px(Math.floor(t.rnd() * 16), Math.floor(t.rnd() * 16), 0x5a3a8a); });
    tile('lava', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = Math.sin(x * 0.9 + y * 0.5) * 30 + Math.floor((t.rnd() - 0.5) * 30); t.px(x, y, 0xf06a10, v); } });
    tile('water', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, 0x2e64c8, Math.floor(Math.sin((x + y) * 0.7) * 12 + (t.rnd() - 0.5) * 10)); });
    tile('glowstone', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, t.rnd() < 0.3 ? 0xfff3a8 : 0xd9a43c, Math.floor((t.rnd() - 0.5) * 30)); });
    tile('cactus_side', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const c = x === 0 || x === 15 ? 0x1f5a1a : (x % 4 === 2 ? 0x3a8a2e : 0x2f7424); t.px(x, y, c, Math.floor((t.rnd() - 0.5) * 16)); if (x % 4 === 2 && y % 4 === 1) t.px(x, y, 0xe8e0a0); } });
    tile('cactus_top', speckle(0x3a8a2e, 20));
    tile('pine', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { if (t.rnd() < 0.14) t.clear(x, y); else t.px(x, y, t.rnd() < 0.15 ? 0xe8f0f5 : 0x2b5a3a, Math.floor((t.rnd() - 0.5) * 30)); } });
    tile('metal', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const e = x === 0 || y === 0 || x === 15 || y === 15; t.px(x, y, e ? 0x8f9296 : 0xc6c9cc, Math.floor((t.rnd() - 0.5) * 10)); } t.px(2, 2, 0x6f7276); t.px(13, 2, 0x6f7276); t.px(2, 13, 0x6f7276); t.px(13, 13, 0x6f7276); });
    tile('gravel', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, G.pick([0x857f7b, 0x6c6764, 0x9c9692, 0x5a5552]), 0); });
    tile('bedrock', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, t.rnd() < 0.5 ? 0x333333 : 0x575757, 0); });
    tile('darkbrick', (t) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const bx = Math.floor((x + (Math.floor(y / 8) % 2 ? 4 : 0)) / 8), by = Math.floor(y / 8);
        const mortar = y % 8 === 7 || (x + (by % 2 ? 4 : 0)) % 8 === 7;
        const shade = ((bx * 7 + by * 13) % 5) * 6 - 12;
        const bevel = (y % 8 === 0 || (x + (by % 2 ? 4 : 0)) % 8 === 0) ? 14 : 0;
        t.px(x, y, mortar ? 0x1a1012 : 0x4a2a28, mortar ? 0 : shade + bevel + Math.floor((t.rnd() - 0.5) * 22));
      }
    });
    tile('crate', (t) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const frame = x < 2 || y < 2 || x > 13 || y > 13 || Math.abs(x - y) < 1.5;
        t.px(x, y, frame ? 0x7a5528 : 0xb58a4e, Math.floor((t.rnd() - 0.5) * 16));
      }
    });
    tile('hay_side', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const band = y === 4 || y === 11; t.px(x, y, band ? 0x8a3a1a : 0xd6b23a, Math.floor((t.rnd() - 0.5) * 30)); } });
    tile('hay_top', speckle(0xc9a630, 34));
    tile('stonebrick', (t) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const row = Math.floor(y / 8), off = row % 2 ? 8 : 0;
        const mortar = y % 8 === 7 || (x + off) % 16 === 15;
        t.px(x, y, mortar ? 0x4e4e4e : 0x7a7a7a, mortar ? 0 : Math.floor((t.rnd() - 0.5) * 18));
      }
    });
    tile('mossy', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, t.rnd() < 0.35 ? 0x4c7a34 : 0x7d7d7d, Math.floor((t.rnd() - 0.5) * 24)); });
    tile('magma', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const crack = ((x * 3 + y * 5) % 7 === 0) || ((x + y * 2) % 9 === 0); t.px(x, y, crack ? 0xff8a20 : 0x4a1e10, Math.floor((t.rnd() - 0.5) * 20)); } });
    tile('redsand', speckle(0xb8643a, 26));


    // --- plantes (rendues en croix) ---
    const plant = (stem, head, headRows) => (t) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.clear(x, y);
      for (let y = 6; y < 16; y++) t.px(7 + (y % 3 === 0 ? 1 : 0), y, stem, Math.floor((t.rnd() - 0.5) * 20));
      if (head) for (const [x, y] of headRows) t.px(x, y, head, Math.floor((t.rnd() - 0.5) * 30));
    };
    tile('flower_red', plant(0x4a6a34, 0xb03a30, [[6, 3], [7, 3], [8, 3], [6, 4], [7, 4], [8, 4], [7, 2], [7, 5], [5, 4], [9, 4]]));
    tile('flower_yellow', plant(0x4a6a34, 0xd8b840, [[6, 4], [7, 4], [8, 4], [7, 3], [7, 5], [6, 5], [8, 3]]));
    tile('tallgrass', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.clear(x, y); for (let i = 0; i < 9; i++) { const x = 1 + Math.floor(t.rnd() * 14), h = 5 + Math.floor(t.rnd() * 10); for (let y = 16 - h; y < 16; y++) t.px(x, y, 0x6a8048, Math.floor((t.rnd() - 0.5) * 30)); } });
    tile('wheat', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.clear(x, y); for (let x = 1; x < 16; x += 3) { for (let y = 4; y < 16; y++) t.px(x, y, y < 8 ? 0xd8b040 : 0x9a9a30, Math.floor((t.rnd() - 0.5) * 30)); t.px(x + 1, 5, 0xe0c050); t.px(x - 1 < 0 ? 0 : x - 1, 6, 0xe0c050); } });
    tile('deadbush', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.clear(x, y); for (let i = 0; i < 6; i++) { let x = 8, y = 15; const dx = t.rnd() < 0.5 ? -1 : 1; for (let k = 0; k < 9; k++) { t.px(G.clamp(x, 0, 15), y, 0x7a5a30); y--; if (t.rnd() < 0.5) x += dx; } } });
    tile('farmland', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, y % 4 === 0 ? 0x4a2e18 : 0x6a4426, Math.floor((t.rnd() - 0.5) * 20)); });
    tile('dirtpath', speckle(0x9a7a48, 30));
    // --- ville ---
    tile('asphalt', speckle(0x3a3b3e, 14));
    tile('asphalt_line', (t) => { speckle(0x3a3b3e, 14)(t); for (let y = 0; y < 16; y++) if (y % 8 < 5) { t.px(7, y, 0xe8c840); t.px(8, y, 0xe8c840); } });
    tile('sidewalk', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, (x % 8 === 0 || y % 8 === 0) ? 0x8a8a86 : 0xb0b0aa, Math.floor((t.rnd() - 0.5) * 12)); });
    tile('concrete', speckle(0xa8a6a0, 12));
    tile('concrete_dark', speckle(0x6a6a6e, 14));
    tile('glass', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const e = x === 0 || y === 0 || x === 15 || y === 15; if (e) t.px(x, y, 0x3a4048); else if ((x + y) % 11 === 0 && x > 2 && x < 13) t.px(x, y, 0xd8e8f0); else t.clear(x, y); } });
    tile('sewer', (t) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const row = Math.floor(y / 4), off = row % 2 ? 4 : 0;
        const mortar = y % 4 === 3 || (x + off) % 8 === 7;
        t.px(x, y, mortar ? 0x2a2e24 : (t.rnd() < 0.25 ? 0x4a5a30 : 0x5a5e52), mortar ? 0 : Math.floor((t.rnd() - 0.5) * 16));
      }
    });
    tile('roof', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, y % 4 === 3 ? 0x2a2224 : 0x4a3a3e, Math.floor((t.rnd() - 0.5) * 14)); });
    tile('grate', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { if (x % 4 === 0 || y % 4 === 0) t.px(x, y, 0x5a5c60, Math.floor((t.rnd() - 0.5) * 16)); else t.px(x, y, 0x101010); } });
    const car = (c) => (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, c, (y < 2 ? 25 : y > 13 ? -30 : 0) + Math.floor((t.rnd() - 0.5) * 8)); };
    tile('car_red', car(0xb02020)); tile('car_blue', car(0x2050b0)); tile('car_white', car(0xd8d8d8));
    tile('awning', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, Math.floor(x / 4) % 2 ? 0xe8e8e0 : 0xc03030, Math.floor((t.rnd() - 0.5) * 10)); });
    tile('whitewall', speckle(0xe2ddd2, 10));
    tile('tire', speckle(0x1c1c1e, 10));
    tile('bookshelf', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const shelf = y % 8 === 0 || y % 8 === 7; t.px(x, y, shelf ? 0xa98653 : G.pick([0x8a2020, 0x20508a, 0x2a7a2a, 0x8a7a20, 0x4a2a6a]), shelf ? 0 : -10); } });
    tile('snowgrass', (t) => { speckle(0xe8eef4, 14)(t); for (let i = 0; i < 20; i++) t.px(Math.floor(t.rnd() * 16), Math.floor(t.rnd() * 16), 0x6a8a5a); });
    tile('clay', speckle(0xb06a40, 24));


    // --- variété : bouleau, chêne sombre, buissons, sacs de sable, pyramide, portail ---
    tile('birch_side', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, 0xd8d4c8, Math.floor((t.rnd() - 0.5) * 14)); for (let i = 0; i < 12; i++) { const x = Math.floor(t.rnd() * 14), y = Math.floor(t.rnd() * 16); t.px(x, y, 0x2a2a28); t.px(x + 1, y, 0x2a2a28); } });
    tile('birch_top', speckle(0xc8b890, 16));
    tile('birch_leaves', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { if (t.rnd() < 0.2) t.clear(x, y); else t.px(x, y, 0x6a7a40, Math.floor((t.rnd() - 0.5) * 34)); } });
    tile('dark_leaves', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { if (t.rnd() < 0.15) t.clear(x, y); else t.px(x, y, 0x34482a, Math.floor((t.rnd() - 0.5) * 28)); } });
    tile('dark_log', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, (x % 3 === 0) ? 0x2a1e14 : 0x3c2c1c, Math.floor((t.rnd() - 0.5) * 16)); });
    tile('autumn_leaves', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { if (t.rnd() < 0.18) t.clear(x, y); else t.px(x, y, t.rnd() < 0.4 ? 0xa0582a : 0x8a6a2a, Math.floor((t.rnd() - 0.5) * 30)); } });
    tile('sandbag', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const row = Math.floor(y / 5), off = row % 2 ? 4 : 0; const seam = y % 5 === 4 || (x + off) % 8 === 7; t.px(x, y, seam ? 0x5e553e : 0x958866, seam ? 0 : Math.floor((t.rnd() - 0.5) * 18) + (y % 5 === 0 ? 10 : 0)); } });
    tile('chiseled', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const e = x === 0 || y === 0 || x === 15 || y === 15 || (x > 4 && x < 11 && (y === 4 || y === 11)) || (y > 4 && y < 11 && (x === 4 || x === 11)); t.px(x, y, e ? 0xa8946a : 0xcbb88a, Math.floor((t.rnd() - 0.5) * 10)); } });
    tile('portal', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, 0x8a3ad8, Math.floor(Math.sin(x * 0.9 + y * 0.6) * 40 + (t.rnd() - 0.5) * 30)); });
    tile('rock', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, t.rnd() < 0.3 ? 0x6e6a64 : 0x84807a, Math.floor((t.rnd() - 0.5) * 20)); });
    tile('bush', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { if (t.rnd() < 0.1) t.clear(x, y); else t.px(x, y, t.rnd() < 0.1 ? 0x8a3030 : 0x45603a, Math.floor((t.rnd() - 0.5) * 30)); } });
    tile('mud', speckle(0x5a4a38, 18));


    tile('scoria', voronoi([0xa65a42, 0x8c4634, 0xb8694c, 0x9a5240, 0x6e4a44, 0xa04e3a], 0x3a2220, 8, 0.18));
    tile('scoria_dark', voronoi([0x5a3a36, 0x6e4038, 0x4a3432, 0x7a4a3c], 0x22161a, 8, 0.22));
    tile('podzol', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const r = t.rnd(); t.px(x, y, r < 0.12 ? 0x7a5a2a : r < 0.2 ? 0x3e4a2a : 0x4e3a28, Math.floor((t.rnd() - 0.5) * 16)); } });
    tile('podzol_side', (t) => { speckle(0x6a4a30, 24)(t); for (let x = 0; x < 16; x++) for (let y = 0; y < 2 + Math.floor(t.rnd() * 2); y++) t.px(x, y, 0x4e3a28, Math.floor((t.rnd() - 0.5) * 16)); });
    tile('barbed', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.clear(x, y); for (let x = 0; x < 16; x++) { const y1 = Math.round(8 + Math.sin(x * 0.8) * 5), y2 = Math.round(8 - Math.sin(x * 0.8) * 5); t.px(x, y1, 0x8a8c90); t.px(x, y2, 0x6a6c70); if (x % 4 === 0) { t.px(x, y1 - 1, 0xa0a2a6); t.px(x, y1 + 1, 0xa0a2a6); } } });
    tile('wallpanel', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, (x % 8 === 0) ? 0x7a7a74 : 0x9a9a92, Math.floor((t.rnd() - 0.5) * 12) + (y > 12 ? -14 : 0)); });


    // --- variantes de pierre volcanique, ville abîmée ---
    tile('volcrock', voronoi([0x2a2628, 0x343032, 0x221f22, 0x3c3638], 0x121012, 9, 0.08));
    tile('basalt2', voronoi([0x55504c, 0x4a4542, 0x605a55], 0x2a2624, 6, 0.12));
    tile('ash', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, t.rnd() < 0.15 ? 0x3a3434 : 0x5a5452, Math.floor((t.rnd() - 0.5) * 22)); });
    tile('scoria3', voronoi([0x7a3a2c, 0x8a4632, 0x6a3428, 0x9a5038], 0x2a1814, 10, 0.25));
    tile('asphalt_crack', (t) => { speckle(0x3a3b3e, 14)(t); let x = 2, y = 0; for (let i = 0; i < 22; i++) { t.px(G.clamp(x, 0, 15), G.clamp(y, 0, 15), 0x1a1a1c); y++; if (t.rnd() < 0.5) x += t.rnd() < 0.5 ? 1 : -1; if (y > 15) { y = Math.floor(t.rnd() * 6); x = 8 + Math.floor(t.rnd() * 6); } } });
    tile('barrel_side', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const band = y === 2 || y === 13 || y === 7; t.px(x, y, band ? 0x3a2a20 : (x === 0 || x === 15 ? 0x6a2a1a : 0x9a3a22), Math.floor((t.rnd() - 0.5) * 20)); } for (let i = 0; i < 6; i++) t.px(Math.floor(t.rnd() * 16), Math.floor(t.rnd() * 16), 0x5a3020); });
    tile('barrel_top', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const r = Math.hypot(x - 7.5, y - 7.5); t.px(x, y, r > 7 ? 0x3a2a20 : r < 2 ? 0x2a2420 : 0x8a3420, Math.floor((t.rnd() - 0.5) * 14)); } });
    tile('locker', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const e = x % 8 === 0 || y === 0 || y === 15; const vent = (y === 3 || y === 5) && x % 8 > 2 && x % 8 < 6; t.px(x, y, e ? 0x3a4a5a : vent ? 0x2a3440 : 0x5a7088, Math.floor((t.rnd() - 0.5) * 8)); } t.px(6, 9, 0xc0c0c0); t.px(14, 9, 0xc0c0c0); });
    tile('bin_side', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, y < 3 ? 0x1e3a28 : (x % 4 === 0 ? 0x24402c : 0x2e5236), Math.floor((t.rnd() - 0.5) * 14)); });
    tile('bin_top', speckle(0x1e3a28, 12));
    const graffiti = (cols) => (t) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const row = Math.floor(y / 4), off = row % 2 ? 4 : 0;
        const mortar = y % 4 === 3 || (x + off) % 8 === 7;
        t.px(x, y, mortar ? 0xb5aca0 : 0x9c4a3a, mortar ? 0 : Math.floor((t.rnd() - 0.5) * 24));
      }
      for (let k = 0; k < 3; k++) { let x = 1 + Math.floor(t.rnd() * 12), y = 3 + Math.floor(t.rnd() * 10); const c = cols[k % cols.length]; for (let i = 0; i < 14; i++) { t.px(G.clamp(x, 0, 15), G.clamp(y, 0, 15), c); t.px(G.clamp(x + 1, 0, 15), G.clamp(y, 0, 15), c); x += t.rnd() < 0.7 ? 1 : 0; y += Math.round((t.rnd() - 0.5) * 3); if (x > 14) break; } }
    };
    tile('graffiti1', graffiti([0x30c0ff, 0xff40a0, 0xffffff]));
    tile('graffiti2', graffiti([0xffd020, 0x40e060, 0x101010]));
    tile('rubble', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, G.pick([0x7a7a74, 0x6a6662, 0x8c4a3a, 0x9a9890, 0x5a5652]), Math.floor((t.rnd() - 0.5) * 14)); });
    tile('cabinet', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const e = x === 0 || x === 15 || y % 5 === 0; t.px(x, y, e ? 0x4a4a4e : 0x7a7a80, Math.floor((t.rnd() - 0.5) * 8)); } for (let y = 2; y < 16; y += 5) { t.px(7, y, 0xd0d0d0); t.px(8, y, 0xd0d0d0); } });
    // pierre de taille haussmannienne : assises horizontales, joints fins
    tile('limestone', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const joint = y % 8 === 7 || (x + (y < 8 ? 0 : 8)) % 16 === 15; t.px(x, y, joint ? 0xb8ad94 : 0xd9cfb6, joint ? 0 : Math.floor((t.rnd() - 0.5) * 10) + (y % 8 === 0 ? 6 : 0)); } });
    // zinc des toits parisiens : tasseaux verticaux
    tile('zinc', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const seam = x % 5 === 0; t.px(x, y, seam ? 0x4a525c : 0x6e7883, seam ? 0 : Math.floor((t.rnd() - 0.5) * 8) + (y < 2 ? 8 : 0)); } });
    // brownstone new-yorkais
    tile('brownstone', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const joint = y % 8 === 7 || (x + (y < 8 ? 4 : 12)) % 16 === 15; t.px(x, y, joint ? 0x4e3228 : 0x7a4c3a, joint ? 0 : Math.floor((t.rnd() - 0.5) * 16)); } });
    // ferronnerie des balcons (fond transparent)
    tile('ironwork', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const bar = y < 2 || y > 14 || x % 4 === 0 || (y > 5 && y < 10 && Math.abs(((x % 4) - 2)) === Math.abs(y - 7.5) - 0.5); if (bar) t.px(x, y, 0x1c1e22, Math.floor((t.rnd() - 0.5) * 6)); else t.clear(x, y); } });
    // bronze doré des statues
    tile('bronze', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, t.rnd() < 0.2 ? 0x8a6a2a : 0xc49a3a, Math.floor((t.rnd() - 0.5) * 30)); });
    // tags de graffiti (fond transparent, posés sur les murs des ruelles)
    const tag = (cols, seed) => (t) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.clear(x, y);
      for (let k = 0; k < 4; k++) {
        let x = 1 + Math.floor(t.rnd() * 4), y = 4 + Math.floor(t.rnd() * 8); const c = cols[k % cols.length];
        for (let i = 0; i < 18 + seed; i++) { t.px(G.clamp(x, 0, 15), G.clamp(y, 0, 15), c); t.px(G.clamp(x, 0, 15), G.clamp(y + 1, 0, 15), c); x += t.rnd() < 0.75 ? 1 : 0; y += Math.round((t.rnd() - 0.5) * 3.2); y = G.clamp(y, 2, 13); if (x > 14) break; }
      }
      for (let i = 0; i < 5; i++) t.px(Math.floor(t.rnd() * 16), 14 + Math.floor(t.rnd() * 2), cols[0]);
    };
    tile('tag1', tag([0x30c0ff, 0xff40a0, 0xf0f0f0], 0));
    tile('tag2', tag([0xffd020, 0x40e060, 0x101010], 2));
    tile('tag3', tag([0xff5020, 0xffffff, 0x8040ff], 4));

    atlasTexture = new THREE.CanvasTexture(atlasCanvas);
    atlasTexture.magFilter = THREE.NearestFilter;
    atlasTexture.minFilter = THREE.NearestFilter;
    atlasTexture.generateMipmaps = false;
    atlasTexture.encoding = THREE.sRGBEncoding;
  }

  // UV d'une tuile (avec un léger retrait pour éviter les bavures)
  function uv(name) {
    const idx = tiles[name];
    const e = 0.4 / (TILE * COLS);
    const u0 = (idx % COLS) / COLS + e, u1 = (idx % COLS + 1) / COLS - e;
    const v1 = 1 - Math.floor(idx / COLS) / COLS - e, v0 = 1 - (Math.floor(idx / COLS) + 1) / COLS + e;
    return [u0, v0, u1, v1];
  }

  // Textures d'entités
  const cache = {};
  function pix(key, w, h, draw) {
    if (cache[key]) return cache[key];
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const rnd = G.mulberry32(key.length * 991 + key.charCodeAt(0) * 31 + (key.charCodeAt(key.length - 1) || 0));
    draw(ctx, rnd, (x, y, col, v = 0) => { ctx.fillStyle = rgb(col, v); ctx.fillRect(x, y, 1, 1); });
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    t.encoding = THREE.sRGBEncoding;
    cache[key] = t;
    return t;
  }

  function noiseTex(key, col, amt, extra) {
    return pix(key, 8, 8, (ctx, rnd, px) => {
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) px(x, y, col, Math.floor((rnd() - 0.5) * amt));
      if (extra) extra(ctx, rnd, px);
    });
  }

  function faceTex(key, skin, eye, mouth) {
    return pix(key, 8, 8, (ctx, rnd, px) => {
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) px(x, y, skin, Math.floor((rnd() - 0.5) * 30));
      px(1, 3, 0x111111); px(2, 3, eye); px(5, 3, eye); px(6, 3, 0x111111);
      px(1, 2, 0x222222); px(6, 2, 0x222222);
      px(2, 5, mouth); px(3, 5, mouth); px(4, 5, mouth); px(5, 5, mouth); px(3, 6, mouth);
    });
  }

  function liquidTex(kind) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const rnd = G.mulberry32(kind === 'water' ? 9 : 19);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const v = Math.sin(x * 0.2 + Math.sin(y * 0.15) * 2) * 0.5 + Math.sin(y * 0.25 + Math.cos(x * 0.1) * 2) * 0.5;
      let r, g, b;
      if (kind === 'water') { const k = v * 14 + (rnd() - 0.5) * 6; r = 38 + k * 0.5; g = 74 + k; b = 92 + k * 1.2; if (v > 0.85) { r += 40; g += 45; b += 45; } }
      else { const k = v * 50 + (rnd() - 0.5) * 20; r = 225 + k * 0.3; g = 90 + k; b = 20 + k * 0.2; if (v < -0.6) { r = 120; g = 30; b = 10; } }
      ctx.fillStyle = 'rgb(' + G.clamp(r, 0, 255) + ',' + G.clamp(g, 0, 255) + ',' + G.clamp(b, 0, 255) + ')'; ctx.fillRect(x, y, 1, 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    t.encoding = THREE.sRGBEncoding; t.repeat.set(0.25, 0.25);
    return t;
  }

  return { liquidTex, buildAtlas, uv, get atlas() { return atlasTexture; }, pix, noiseTex, faceTex, rgb };
})();
