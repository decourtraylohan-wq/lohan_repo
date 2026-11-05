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

  function buildAtlas() {
    atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = TILE * COLS; atlasCanvas.height = TILE * COLS;

    tile('grass_top', speckle(0x5fa83a, 40));
    tile('dirt', speckle(0x8a5a35, 36));
    tile('grass_side', (t) => {
      speckle(0x8a5a35, 36)(t);
      for (let x = 0; x < 16; x++) { const d = 3 + Math.floor(t.rnd() * 3); for (let y = 0; y < d; y++) t.px(x, y, 0x5fa83a, Math.floor((t.rnd() - 0.5) * 40)); }
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
    tile('leaves', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { if (t.rnd() < 0.18) t.clear(x, y); else t.px(x, y, 0x3e7d24, Math.floor((t.rnd() - 0.5) * 50)); } });
    tile('sand', speckle(0xdccf8e, 26));
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
    tile('basalt', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.px(x, y, (y % 5 === 0) ? 0x2a2a2e : 0x3b3a40, Math.floor((t.rnd() - 0.5) * 18)); });
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
        const row = Math.floor(y / 4), off = row % 2 ? 4 : 0;
        const mortar = y % 4 === 3 || (x + off) % 8 === 7;
        t.px(x, y, mortar ? 0x1e0c0f : 0x4a1a20, mortar ? 0 : Math.floor((t.rnd() - 0.5) * 16));
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
    tile('flower_red', plant(0x3e8a24, 0xd02828, [[6, 3], [7, 3], [8, 3], [6, 4], [7, 4], [8, 4], [7, 2], [7, 5], [5, 4], [9, 4]]));
    tile('flower_yellow', plant(0x3e8a24, 0xf0d020, [[6, 4], [7, 4], [8, 4], [7, 3], [7, 5], [6, 5], [8, 3]]));
    tile('tallgrass', (t) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) t.clear(x, y); for (let i = 0; i < 9; i++) { const x = 1 + Math.floor(t.rnd() * 14), h = 5 + Math.floor(t.rnd() * 10); for (let y = 16 - h; y < 16; y++) t.px(x, y, 0x5aa03a, Math.floor((t.rnd() - 0.5) * 40)); } });
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

  return { buildAtlas, uv, get atlas() { return atlasTexture; }, pix, noiseTex, faceTex, rgb };
})();
