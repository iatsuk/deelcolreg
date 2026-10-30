import { ISLANDS, random, angle } from './watch-engine.js';

const INK = '#173e4b', CREAM = '#f4ebd1';
const rounded = (c, x, y, w, h, r = 2) => { c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); c.stroke(); };
function coastline(c, i, extra = 0) {
  c.beginPath();
  for (let k = 0; k <= 42; k++) {
    const a = k / 42 * Math.PI * 2;
    const r = i.r * (1 + .08 * Math.sin(k * 2.3 + i.y) + .06 * Math.cos(k * 1.7)) + extra;
    const x = i.x + Math.cos(a) * r, y = i.y + Math.sin(a) * r * .8;
    if (!k) c.moveTo(x, -y); else c.lineTo(x, -y);
  }
  c.closePath();
}
function pine(c, x, y, r) {
  c.fillStyle = '#486e5b'; c.strokeStyle = '#355a51'; c.lineWidth = 1.5;
  c.beginPath();
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; const radius = k % 2 ? r * .67 : r; c.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius); }
  c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#67846b'; c.beginPath(); c.arc(x - 3, y - 4, r * .4, 0, Math.PI * 2); c.fill();
}
function house(c, x, y, w, h) {
  c.fillStyle = '#eae2cb'; c.strokeStyle = INK; c.lineWidth = 1.6; rounded(c, x, y, w, h, 1);
  c.fillStyle = '#bf7051'; c.beginPath(); c.moveTo(x - 3, y - 2); c.lineTo(x + w / 2, y - 14); c.lineTo(x + w + 3, y - 2); c.lineTo(x + w + 3, y + h * .45); c.lineTo(x - 3, y + h * .45); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = '#8b493d'; c.beginPath(); c.moveTo(x + w / 2, y - 12); c.lineTo(x + w / 2, y + h * .43); c.stroke();
  c.fillStyle = '#224753'; c.fillRect(x + 6, y + h * .64, 6, 8); c.fillRect(x + w - 12, y + h * .64, 6, 8);
}
function drawIsland(c, i) {
  coastline(c, i, 67); c.fillStyle = '#276b76'; c.fill();
  coastline(c, i, 31); c.fillStyle = '#44817e'; c.fill();
  coastline(c, i, 11); c.strokeStyle = '#9bb9a344'; c.lineWidth = 2; c.stroke();
  coastline(c, i); c.fillStyle = '#e8dfc3'; c.strokeStyle = '#d9e0bc'; c.lineWidth = 4; c.fill(); c.stroke();
  const rng = random(i.y + 7881);
  for (let k = 0; k < 23; k++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * i.r * .72;
    const x = i.x + Math.cos(a) * r, y = -i.y + Math.sin(a) * r * .8;
    if (k < 14) pine(c, x, y, 12 + rng() * 15);
    else { c.fillStyle = '#b9b9a0'; c.strokeStyle = '#808e7c'; c.lineWidth = 1.4; c.beginPath(); c.ellipse(x, y, 12 + rng() * 9, 8 + rng() * 7, a, 0, Math.PI * 2); c.fill(); c.stroke(); }
  }
  if (i.houses) {
    house(c, i.x + 35, -i.y + 15, 32, 37); house(c, i.x - 40, -i.y - 40, 37, 43); house(c, i.x + 10, -i.y - 80, 26, 30);
    c.save(); c.translate(i.x + i.r * .64, -i.y + 32); c.rotate(.06); c.fillStyle = '#b29b73'; c.strokeStyle = '#536c65'; c.lineWidth = 2; rounded(c, 0, 0, 109, 17, 1);
    c.strokeStyle = '#816f52'; c.lineWidth = 1; for (let x = 4; x < 109; x += 8) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 17); c.stroke(); } c.restore();
  }
  if (i.name) { c.fillStyle = '#e7e7c9'; c.font = '12px Golos, sans-serif'; c.textAlign = 'center'; c.fillText(i.name.toLocaleUpperCase('ru'), i.x, -i.y + i.r + 68); }
}
function drawWake(c, boat, time) {
  if (boat.speed < .5) return;
  c.save(); c.translate(boat.x, -boat.y); c.rotate(boat.h * Math.PI / 180);
  const length = 24 + boat.speed * 13;
  for (const side of [-1, 1]) {
    c.strokeStyle = '#d8e4cd66'; c.lineWidth = 2.3; c.beginPath();
    c.moveTo(side * 14, 26); c.bezierCurveTo(side * 22, 50, side * (29 + Math.sin(time * .08) * 3), length * .9, side * 47, length + 20); c.stroke();
    c.strokeStyle = '#d8e4cd27'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(side * 15, 38); c.quadraticCurveTo(side * 30, length * .75, side * 62, length * 1.2); c.stroke();
  }
  c.strokeStyle = '#e7e9cd44'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 35); c.lineTo(Math.sin(time * .12) * 2, length * .8); c.stroke(); c.restore();
}
export function drawBoat(c, boat, own = false, ghost = false) {
  c.save(); c.translate(boat.x, -boat.y); c.rotate(boat.h * Math.PI / 180); if (ghost) c.globalAlpha = .5;
  if (boat.renderScale) c.scale(boat.renderScale, boat.renderScale);
  const sail = ['sail', 'motor-sail'].includes(boat.type);
  c.fillStyle = '#092e3a3b'; c.beginPath(); c.ellipse(4, 4, sail ? 15 : 21, 42, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = INK; c.lineWidth = 2;
  c.fillStyle = own || sail ? '#f2e8cd' : '#c67450';
  c.beginPath(); c.moveTo(0, -43); c.bezierCurveTo(18, -28, 21, -8, 19, 29); c.quadraticCurveTo(0, 39, -19, 29); c.bezierCurveTo(-21, -8, -18, -28, 0, -43); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = own ? '#436476' : '#8c513e'; c.lineWidth = 3; c.beginPath(); c.moveTo(-16, 24); c.quadraticCurveTo(-19, -10, 0, -37); c.quadraticCurveTo(19, -10, 16, 24); c.stroke();
  if (sail) {
    c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -32); c.lineTo(0, 28); c.stroke();
    c.fillStyle = '#fbf3d8'; c.beginPath(); c.moveTo(0, -27); c.quadraticCurveTo(36, -8, 32, 25); c.lineTo(0, 13); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#dcdcc4'; c.beginPath(); c.moveTo(-2, -24); c.lineTo(-19, 11); c.lineTo(-2, 8); c.closePath(); c.fill(); c.stroke();
  } else {
    c.strokeStyle = INK; c.lineWidth = 1.4; c.fillStyle = '#f2ead3'; rounded(c, -12, -15, 24, 27, 4);
    c.fillStyle = own ? '#365468' : '#526b6c'; rounded(c, -9, -12, 18, 11, 2);
    c.fillStyle = '#d9dcc4'; c.strokeStyle = '#617476'; rounded(c, -8, 3, 16, 6, 1);
    c.fillStyle = '#6c8c8b'; c.strokeStyle = INK; rounded(c, -5, 17, 10, 8, 1);
    c.strokeStyle = '#586c6a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, -31); c.lineTo(0, -8); c.moveTo(-7, -23); c.lineTo(7, -23); c.stroke();
    c.fillStyle = '#dc8353'; c.strokeStyle = '#fff2d3'; c.lineWidth = 1.4; c.beginPath(); c.arc(12, 16, 3.5, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = INK; for (const side of [-1, 1]) { c.beginPath(); c.ellipse(side * 20, 12, 2.6, 4, 0, 0, Math.PI * 2); c.fill(); }
    if (boat.type === 'fishing') {
      c.fillStyle = '#496b5b'; c.strokeStyle = '#2e524d'; c.lineWidth = 1; rounded(c, -13, 14, 10, 13, 1);
      c.fillStyle = '#172e32'; c.beginPath(); c.moveTo(-7, -41); c.lineTo(7, -41); c.lineTo(0, -32); c.closePath(); c.fill(); c.beginPath(); c.moveTo(-7, -23); c.lineTo(7, -23); c.lineTo(0, -32); c.closePath(); c.fill();
      c.strokeStyle = '#bbc9a68a'; c.lineWidth = 1.2;
      for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(18, 20 + k * 2); c.lineTo(80, 60 + k * 9); c.stroke(); }
    }
  }
  if (boat.type === 'motor-sail') { c.fillStyle = INK; c.beginPath(); c.moveTo(-7, -36); c.lineTo(7, -36); c.lineTo(0, -23); c.closePath(); c.fill(); }
  if (boat.type === 'nuc') { c.fillStyle = INK; for (const y of [-37, -22]) { c.beginPath(); c.arc(0, y, 5, 0, Math.PI * 2); c.fill(); } }
  if (own && !ghost) { c.strokeStyle = '#e9e7c77a'; c.lineWidth = 1; c.setLineDash([5, 9]); c.beginPath(); c.ellipse(0, 0, 33, 55, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]); }
  c.restore();
}
export class Sea {
  constructor(canvas) { this.canvas = canvas; this.c = canvas.getContext('2d'); this.w = 0; this.h = 0; this.camera = { x: 0, y: 0 }; this.scale = 1; this.pointer = null; }
  size() {
    const r = this.canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    if (this.w !== r.width || this.h !== r.height || this.dpr !== dpr) { this.w = r.width; this.h = r.height; this.dpr = dpr; this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr); }
  }
  toWorld(x, y) { return { x: (x - this.w / 2) / this.scale + this.camera.x, y: -(y - this.h / 2) / this.scale + this.camera.y }; }
  toScreen(p) { return { x: this.w / 2 + (p.x - this.camera.x) * this.scale, y: this.h / 2 - (p.y - this.camera.y) * this.scale }; }
  draw(s, replayIndex = null) {
    this.size(); const { c, w, h } = this; if (!w || !h) return;
    this.scale = w < 650 ? Math.min(w / 930, h / 1000) : Math.min(w / 1450, h / 850);
    this.camera = { x: s.own.x * .65, y: s.own.y + h / this.scale * .15 };
    if (s.fit) {
      const points = s.fit.points, xs = points.map(p => p.x), ys = points.map(p => p.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      this.scale = Math.min(w / (maxX - minX + 430), h / (maxY - minY + 410));
      this.camera = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 - 20 };
      s.own.renderScale = Math.max(1, 60 / (86 * this.scale)); if (s.contact) s.contact.renderScale = s.own.renderScale;
    }
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = '#12546b'; c.fillRect(0, 0, w, h);
    const g = c.createRadialGradient(w * .55, h * .4, 0, w * .55, h * .4, w * .8); g.addColorStop(0, '#17627855'); g.addColorStop(1, '#083b511f'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.save(); c.translate(w / 2, h / 2); c.scale(this.scale, this.scale); c.translate(-this.camera.x, this.camera.y);
    c.lineWidth = 1.7; c.strokeStyle = '#c1d9c54c';
    const left = Math.floor((this.camera.x - w / this.scale / 2) / 150) * 150;
    const bottom = Math.floor((this.camera.y - h / this.scale / 2) / 135) * 135;
    for (let x = left; x < left + w / this.scale + 160; x += 150) for (let y = bottom; y < bottom + h / this.scale + 140; y += 135) {
      const dx = Math.sin(y * .005 + x) * 50, dy = Math.cos(s.time * .025 + x * .1) * 2;
      c.beginPath(); c.moveTo(x + dx, -y + dy); c.quadraticCurveTo(x + dx + 8, -y + 6 + dy, x + dx + 16, -y + dy); c.quadraticCurveTo(x + dx + 24, -y + 6 + dy, x + dx + 32, -y + dy); c.stroke();
    }
    for (const i of ISLANDS) if (Math.abs(i.y - this.camera.y) < h / this.scale / 2 + 350) drawIsland(c, i);
    // Destination is a game waypoint, not an IALA navigation mark.
    const port = { x: -130, y: 3350 };
    if (s.leg === 3 || s.own.y > 2600) {
      c.strokeStyle = '#e4e9c588'; c.lineWidth = 1.5; c.setLineDash([7, 9]); c.beginPath(); c.arc(port.x, -port.y, 100, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
      c.strokeStyle = '#e4ddbd'; c.lineWidth = 3; c.beginPath(); c.moveTo(port.x, -port.y + 15); c.lineTo(port.x, -port.y - 36); c.stroke();
      c.fillStyle = '#e4a46c'; c.beginPath(); c.moveTo(port.x, -port.y - 36); c.lineTo(port.x + 25, -port.y - 26); c.lineTo(port.x, -port.y - 16); c.fill();
      c.fillStyle = '#e8e7c8'; c.font = '11px Golos,sans-serif'; c.textAlign = 'center'; c.fillText('ПРИЧАЛ · МАЛЫЙ ХОД', port.x, -port.y + 133);
    }
    if (s.phase === 'review' || replayIndex !== null) {
      const line = (items, color) => { if (items.length < 2) return; c.strokeStyle = color; c.lineWidth = 2.2; c.setLineDash([6, 6]); c.beginPath(); items.forEach((p, i) => i ? c.lineTo(p.x, -p.y) : c.moveTo(p.x, -p.y)); c.stroke(); c.setLineDash([]); };
      line(s.trail, '#efebcfaa'); if (s.contact) line(s.contact.trail, '#eaa67ccc');
    }
    drawWake(c, s.own, s.time); if (s.contact) drawWake(c, s.contact, s.time);
    drawBoat(c, s.own, true); if (s.contact) drawBoat(c, s.contact);
    if (replayIndex !== null && s.history[replayIndex]) { const snap = s.history[replayIndex]; drawBoat(c, snap.own, true, true); if (snap.contact) drawBoat(c, snap.contact, false, true); }
    if (s.contact && !s.fit) { c.fillStyle = '#f2e9cfbb'; c.font = '10px Golos,sans-serif'; c.textAlign = 'center'; c.fillText(s.contact.name, s.contact.x, -s.contact.y + 64); }
    if (s.phase === 'sailing') {
      const r = 115; c.save(); c.translate(s.own.x, -s.own.y); c.rotate(s.course * Math.PI / 180); c.strokeStyle = '#dddcc066'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-6, -r + 8); c.lineTo(0, -r); c.lineTo(6, -r + 8); c.stroke(); c.restore();
    }
    c.restore();
    if (s.fit) {
      for (const [boat, label] of [[s.own, 'А'], [s.contact, 'Б']]) {
        if (!boat) continue; const p = this.toScreen(boat);
        c.fillStyle = '#f5ecd6'; c.strokeStyle = '#9cad93'; c.lineWidth = 1; c.beginPath(); c.arc(p.x - 32, p.y - 28, 12, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = INK; c.font = '600 11px Golos,sans-serif'; c.textAlign = 'center'; c.fillText(label, p.x - 32, p.y - 24);
        if (s.selected === (label === 'А' ? 'own' : 'other')) { c.strokeStyle = s.correct ? '#bad9a0' : '#edb28b'; c.lineWidth = 2.5; c.setLineDash([5, 5]); c.beginPath(); c.arc(p.x, p.y, 47, 0, Math.PI * 2); c.stroke(); c.setLineDash([]); }
        if (s.expectedActor === (label === 'А' ? 'own' : 'other')) { c.strokeStyle = '#c7dfa7'; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y, 43, 0, Math.PI * 2); c.stroke(); c.fillStyle = '#e1ebc6'; c.font = '600 14px Golos,sans-serif'; c.fillText('✓', p.x + 40, p.y - 30); }
      }
    }
    // Contacts outside the viewport remain discoverable through a bearing marker.
    if (s.contact) {
      const p = this.toScreen(s.contact);
      if (p.x < 25 || p.x > w - 25 || p.y < 25 || p.y > h - 25) {
        const x = Math.max(25, Math.min(w - 25, p.x)), y = Math.max(150, Math.min(h - 150, p.y));
        const a = Math.atan2(p.y - h / 2, p.x - w / 2);
        c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = '#f2dec0'; c.beginPath(); c.moveTo(9, 0); c.lineTo(-5, -6); c.lineTo(-5, 6); c.closePath(); c.fill(); c.restore();
      }
    }
  }
}
