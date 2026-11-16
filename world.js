/* Orthographic tile rendering and camera. The world is made of real map cells. */
(function (root) {
  'use strict';
  const image = new Image(); image.src = 'assets/tileset.png';
  const view = { tile: 48, x: 0, y: 0, width: 1, height: 1, zone: 'station' };
  const canvas = document.getElementById('tile-map'), ctx = canvas.getContext('2d');
  let dpr = 1;
  function resize() {
    const rect = document.getElementById('world').getBoundingClientRect();
    if (!rect.width) return;
    view.width = Math.round(rect.width); view.height = Math.round(rect.height);
    view.tile = rect.width < 700 ? 32 : 48;
    dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = view.width * dpr; canvas.height = view.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false;
    document.getElementById('world').style.setProperty('--tile-size', view.tile + 'px');
  }
  function project(point) { return { x: Math.round((point.x + .5 - view.x) * view.tile), y: Math.round((point.y + .92 - view.y) * view.tile) }; }
  function unproject(x, y) { return { x: Math.floor(x / view.tile + view.x), y: Math.floor(y / view.tile + view.y) }; }
  function draw(zone, player, time, phase) {
    const map = root.KiriMaps.maps[zone]; view.zone = zone;
    const cols = view.width / view.tile, rows = view.height / view.tile;
    const camera = (p, span, extent) => extent < span ? -(span - extent) / 2 : Math.max(0, Math.min(extent - span, p + .5 - span / 2));
    view.x = camera(player.x, cols, map.w); view.y = camera(player.y, rows, map.h);
    ctx.fillStyle = '#07151d'; ctx.fillRect(0, 0, view.width, view.height);
    if (!image.complete || !image.naturalWidth) return;
    const sw = image.naturalWidth / 8, sh = image.naturalHeight / 8;
    for (let y = Math.max(0, Math.floor(view.y)); y < Math.min(map.h, Math.ceil(view.y + rows)); y++) {
      for (let x = Math.max(0, Math.floor(view.x)); x < Math.min(map.w, Math.ceil(view.x + cols)); x++) {
        const id = map.tiles[y * map.w + x];
        const px = Math.round((x - view.x) * view.tile), py = Math.round((y - view.y) * view.tile);
        ctx.drawImage(image, (id % 8) * sw + 1, Math.floor(id / 8) * sh + 1, sw - 2, sh - 2, px, py, view.tile + .5, view.tile + .5);
        if (id === 6 || id === 7) { ctx.fillStyle = `rgba(102,183,206,${.04 + Math.sin(time * .0015 + x * .7 + y * .3) * .035})`; ctx.fillRect(px, py, view.tile, view.tile); }
      }
    }
    ctx.fillStyle = phase === 'echo' ? 'rgba(59,84,123,.19)' : 'rgba(5,22,38,.22)'; ctx.fillRect(0, 0, view.width, view.height);
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) if (map.tiles[y * map.w + x] === 40) {
      const p = project({ x, y: y - .35 }), radius = view.tile * 1.7;
      if (p.x < -radius || p.x > view.width + radius || p.y < -radius || p.y > view.height + radius) continue;
      const gradient = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, radius);
      gradient.addColorStop(0, 'rgba(255,194,93,.20)'); gradient.addColorStop(1, 'rgba(255,194,93,0)');
      ctx.fillStyle = gradient; ctx.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2);
    }
  }
  function thumbnail(zone, output) {
    const map = root.KiriMaps.maps[zone], size = 8;
    output.width = map.w * size; output.height = map.h * size;
    const pen = output.getContext('2d'); pen.imageSmoothingEnabled = false;
    if (!image.complete || !image.naturalWidth) return;
    const sw = image.naturalWidth / 8, sh = image.naturalHeight / 8;
    map.tiles.forEach((tile, i) => pen.drawImage(image, tile % 8 * sw + 1, Math.floor(tile / 8) * sh + 1, sw - 2, sh - 2, i % map.w * size, Math.floor(i / map.w) * size, size, size));
  }
  root.KiriRenderer = { view, resize, draw, project, unproject, thumbnail };
})(globalThis);
