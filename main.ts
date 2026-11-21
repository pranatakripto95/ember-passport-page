// Ember Passport Page — an invented passport spread, drawn entirely in code.
// Republic of Caldris: a northern island republic that does not exist.
// No network, no external images: every pixel is plotted by the code below
// into a 1024x640 PNG written to /output/entry.png.
// Holder: Mara Ilsen Vey, lighthouse keeper of Port Sarelle.
// Passport issued 12 FEB 2024; every stamp is dated after issue, in order.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 640;

// ---- palette: security paper, navy ink, faded stamp inks -------------------
const PAPER_L = [238, 232, 214]; // data page
const PAPER_R = [240, 234, 218]; // visa page
const DESK = [38, 44, 58];       // dark surface the spread lies on
const INK = [24, 38, 66];        // navy document ink
const INK_SOFT = [58, 74, 104];
const GREY = [96, 100, 108];
const GOLD = [168, 124, 42];
const RED = [158, 42, 38];
const BLUE = [34, 84, 138];
const GREEN = [34, 110, 74];
const PURPLE = [104, 62, 128];
const TEAL = [16, 110, 104];
const SKIN = [226, 183, 145];
const SKIN_D = [203, 156, 118];
const HAIR = [58, 38, 28];
const NAVY_JACKET = [36, 52, 88];
const SHIRT = [244, 244, 240];
const PHOTO_BG = [168, 188, 204];
const VISA_BG = [226, 236, 228];
const MRZ_BG = [228, 230, 226];

// ---- pixel canvas -----------------------------------------------------------
const px = new Uint8Array(W * H * 3);
function fillAll(c: number[]) {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0]; px[i * 3 + 1] = c[1]; px[i * 3 + 2] = c[2];
  }
}
function setPix(x: number, y: number, c: number[]) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}
function blendPix(x: number, y: number, c: number[], a: number) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = Math.round(px[i] * (1 - a) + c[0] * a);
  px[i + 1] = Math.round(px[i + 1] * (1 - a) + c[1] * a);
  px[i + 2] = Math.round(px[i + 2] * (1 - a) + c[2] * a);
}
function rect(x: number, y: number, w: number, h: number, c: number[]) {
  const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(W, Math.round(x + w)), y1 = Math.min(H, Math.round(y + h));
  for (let yy = y0; yy < y1; yy++)
    for (let xx = x0; xx < x1; xx++) setPix(xx, yy, c);
}
function rectA(x: number, y: number, w: number, h: number, c: number[], a: number) {
  const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(W, Math.round(x + w)), y1 = Math.min(H, Math.round(y + h));
  for (let yy = y0; yy < y1; yy++)
    for (let xx = x0; xx < x1; xx++) blendPix(xx, yy, c, a);
}
function hline(x: number, y: number, w: number, c: number[], t = 1) {
  rect(x, y, w, t, c);
}
function vline(x: number, y: number, h: number, c: number[], t = 1) {
  rect(x, y, t, h, c);
}
function disc(cx: number, cy: number, r: number, c: number[]) {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++)
      if (x * x + y * y <= r * r) setPix(cx + x, cy + y, c);
}
function discA(cx: number, cy: number, r: number, c: number[], a: number) {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++)
      if (x * x + y * y <= r * r) blendPix(cx + x, cy + y, c, a);
}
function ring(cx: number, cy: number, r: number, t: number, c: number[]) {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (d <= r && d >= r - t) setPix(cx + x, cy + y, c);
    }
}
function ellipse(cx: number, cy: number, rx: number, ry: number, c: number[]) {
  for (let y = -ry; y <= ry; y++)
    for (let x = -rx; x <= rx; x++)
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) setPix(cx + x, cy + y, c);
}
function ellipseA(cx: number, cy: number, rx: number, ry: number, c: number[], a: number) {
  for (let y = -ry; y <= ry; y++)
    for (let x = -rx; x <= rx; x++)
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) blendPix(cx + x, cy + y, c, a);
}
// filled polygon (scanline)
function poly(pts: number[][], c: number[]) {
  let minY = Infinity, maxY = -Infinity;
  for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  for (let y = Math.max(0, Math.ceil(minY)); y <= Math.min(H - 1, Math.floor(maxY)); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2)
      for (let x = Math.max(0, Math.ceil(xs[i])); x <= Math.min(W - 1, Math.floor(xs[i + 1])); x++)
        setPix(x, y, c);
  }
}
function polyA(pts: number[][], c: number[], a: number) {
  let minY = Infinity, maxY = -Infinity;
  for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  for (let y = Math.max(0, Math.ceil(minY)); y <= Math.min(H - 1, Math.floor(maxY)); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a2 = pts[i], b = pts[(i + 1) % pts.length];
      if ((a2[1] <= y && b[1] > y) || (b[1] <= y && a2[1] > y)) {
        xs.push(a2[0] + (y - a2[1]) * (b[0] - a2[0]) / (b[1] - a2[1]));
      }
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2)
      for (let x = Math.max(0, Math.ceil(xs[i])); x <= Math.min(W - 1, Math.floor(xs[i + 1])); x++)
        blendPix(x, y, c, a);
  }
}
function line(x0: number, y0: number, x1: number, y1: number, c: number[], t = 1) {
  const dx = x1 - x0, dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let i = 0; i <= steps; i++) {
    const x = x0 + dx * i / steps, y = y0 + dy * i / steps;
    if (t <= 1) setPix(x, y, c);
    else disc(Math.round(x), Math.round(y), Math.floor(t / 2), c);
  }
}
function lineA(x0: number, y0: number, x1: number, y1: number, c: number[], t: number, a: number) {
  const dx = x1 - x0, dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let i = 0; i <= steps; i++) {
    const x = x0 + dx * i / steps, y = y0 + dy * i / steps;
    if (t <= 1) blendPix(x, y, c, a);
    else discA(Math.round(x), Math.round(y), Math.floor(t / 2), c, a);
  }
}
// rotated rectangle outline (stamp frame)
function rotRect(cx: number, cy: number, w: number, h: number, angDeg: number, c: number[], t = 2) {
  const a = angDeg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  const corners = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
  const pts = corners.map(([x, y]) => [cx + x * ca - y * sa, cy + x * sa + y * ca]);
  for (let i = 0; i < 4; i++) {
    const p = pts[i], q = pts[(i + 1) % 4];
    line(p[0], p[1], q[0], q[1], c, t);
  }
  return pts;
}

// ---- 5x7 bitmap font (capitals, digits, punctuation — passports are caps) --
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "<": ["00010", "00100", "01000", "10000", "01000", "00100", "00010"],
  ">": ["01000", "00100", "00010", "00001", "00010", "00100", "01000"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "*": ["00000", "10101", "01110", "10101", "00000", "00000", "00000"],
};
function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}
function drawGlyph(ch: string, x: number, y: number, scale: number, c: number[], bold = false) {
  const g = FONT[ch] || FONT["?"];
  for (let r = 0; r < 7; r++)
    for (let col = 0; col < 5; col++)
      if (g[r][col] === "1") {
        rect(x + col * scale, y + r * scale, scale, scale, c);
        if (bold) rect(x + col * scale + 1, y + r * scale, scale, scale, c);
      }
}
function drawText(x: number, y: number, s: string, scale: number, c: number[], bold = false) {
  for (let i = 0; i < s.length; i++)
    drawGlyph(s[i], x + i * 6 * scale, y, scale, c, bold);
}
function drawTextC(cx: number, y: number, s: string, scale: number, c: number[], bold = false) {
  drawText(cx - Math.floor(textWidth(s, scale) / 2), y, s, scale, c, bold);
}
// text along a rotated baseline (for stamps)
function drawTextA(x: number, y: number, s: string, scale: number, c: number[], angDeg: number) {
  const a = angDeg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  for (let i = 0; i < s.length; i++) {
    const g = FONT[s[i]] || FONT["?"];
    for (let r = 0; r < 7; r++)
      for (let col = 0; col < 5; col++)
        if (g[r][col] === "1") {
          const gx = i * 6 * scale + col * scale, gy = r * scale;
          for (let dy = 0; dy < scale; dy++)
            for (let dx = 0; dx < scale; dx++) {
              const px0 = gx + dx, py0 = gy + dy;
              setPix(x + px0 * ca - py0 * sa, y + px0 * sa + py0 * ca, c);
            }
        }
  }
}

// ---- coat of arms of Caldris: shield, three peaks, three waves, one star ---
function coatOfArms(cx: number, cy: number, s: number) {
  // shield
  const w = 46 * s, h = 56 * s;
  const top = cy - h / 2, bot = cy + h / 2;
  poly([
    [cx - w / 2, top], [cx + w / 2, top], [cx + w / 2, top + h * 0.62],
    [cx, bot], [cx - w / 2, top + h * 0.62],
  ], GOLD);
  poly([
    [cx - w / 2 + 3 * s, top + 3 * s], [cx + w / 2 - 3 * s, top + 3 * s],
    [cx + w / 2 - 3 * s, top + h * 0.6], [cx, bot - 3 * s], [cx - w / 2 + 3 * s, top + h * 0.6],
  ], [238, 232, 214]);
  // three peaks
  const py = top + h * 0.42;
  poly([
    [cx - w / 2 + 5 * s, py], [cx - w * 0.22, top + 8 * s], [cx - w * 0.05, py],
  ], INK);
  poly([
    [cx - w * 0.14, py], [cx + w * 0.08, top + 5 * s], [cx + w * 0.3, py],
  ], INK);
  poly([
    [cx + w * 0.18, py], [cx + w * 0.32, top + 10 * s], [cx + w / 2 - 5 * s, py],
  ], INK);
  // three waves
  for (let i = 0; i < 3; i++) {
    const wy = py + 7 * s + i * 6 * s;
    line(cx - w / 2 + 6 * s, wy, cx + w / 2 - 6 * s, wy, BLUE, 2);
  }
  // star above peaks
  const sx = cx, sy = top - 12 * s, r = 7 * s;
  const star: number[][] = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + i * Math.PI / 5;
    const rr = i % 2 === 0 ? r : r * 0.42;
    star.push([sx + rr * Math.cos(ang), sy + rr * Math.sin(ang)]);
  }
  poly(star, GOLD);
}

// ---- portrait: Mara Ilsen Vey, front-facing, flat passport-photo style -----
function portrait(x: number, y: number, w: number, h: number) {
  rect(x, y, w, h, PHOTO_BG);
  // faint backdrop arcs
  for (let i = 0; i < 4; i++)
    ring(x + w / 2, y + h * 0.62, 34 + i * 12, 1, [150, 172, 190]);
  const cx = x + w / 2;
  const headY = y + h * 0.36, headRx = w * 0.26, headRy = h * 0.30;
  // hair mass behind the face + top bun
  disc(cx + 6, headY - headRy - 6, 11, HAIR);
  ellipse(cx, headY - 12, headRx + 5, headRy + 5, HAIR);
  // shoulders / navy jacket
  poly([
    [x + w * 0.06, y + h], [x + w * 0.06, y + h * 0.78],
    [cx - w * 0.30, y + h * 0.66], [cx - w * 0.16, y + h * 0.60],
    [cx + w * 0.16, y + h * 0.60], [cx + w * 0.30, y + h * 0.66],
    [x + w * 0.94, y + h * 0.78], [x + w * 0.94, y + h],
  ], NAVY_JACKET);
  // shirt V + collar
  poly([[cx - w * 0.16, y + h * 0.60], [cx, y + h * 0.86], [cx + w * 0.16, y + h * 0.60]], SHIRT);
  poly([[cx - w * 0.17, y + h * 0.60], [cx, y + h * 0.70], [cx - w * 0.05, y + h * 0.60]], [226, 226, 220]);
  poly([[cx + w * 0.17, y + h * 0.60], [cx, y + h * 0.70], [cx + w * 0.05, y + h * 0.60]], [226, 226, 220]);
  // neck
  rect(cx - w * 0.09, headY + headRy * 0.55, w * 0.18, h * 0.12, SKIN_D);
  ellipse(cx, headY + headRy * 0.62, w * 0.09, h * 0.05, SKIN);
  // face (covers the lower hair mass, leaving a clean hairline crescent)
  ellipse(cx, headY + 2, headRx, headRy, SKIN);
  // ears
  ellipse(cx - headRx, headY + 4, 5, 9, SKIN);
  ellipse(cx + headRx, headY + 4, 5, 9, SKIN);
  // fringe sweep across the forehead
  poly([
    [cx - headRx + 2, headY - headRy * 0.42], [cx - headRx * 0.4, headY - headRy * 0.86],
    [cx + headRx * 0.5, headY - headRy * 0.88], [cx + headRx - 2, headY - headRy * 0.42],
    [cx + headRx * 0.55, headY - headRy * 0.62], [cx, headY - headRy * 0.68],
    [cx - headRx * 0.55, headY - headRy * 0.62],
  ], HAIR);
  // brows
  line(cx - headRx * 0.58, headY - headRy * 0.22, cx - headRx * 0.12, headY - headRy * 0.26, HAIR, 2);
  line(cx + headRx * 0.12, headY - headRy * 0.26, cx + headRx * 0.58, headY - headRy * 0.22, HAIR, 2);
  // eyes
  ellipse(cx - headRx * 0.33, headY - headRy * 0.06, 6, 4, [250, 250, 248]);
  ellipse(cx + headRx * 0.33, headY - headRy * 0.06, 6, 4, [250, 250, 248]);
  disc(cx - headRx * 0.33, headY - headRy * 0.06, 2, [32, 28, 24]);
  disc(cx + headRx * 0.33, headY - headRy * 0.06, 2, [32, 28, 24]);
  // nose + mouth
  line(cx, headY + headRy * 0.06, cx - 2, headY + headRy * 0.30, SKIN_D, 2);
  line(cx - 2, headY + headRy * 0.30, cx + 3, headY + headRy * 0.32, SKIN_D, 2);
  line(cx - 8, headY + headRy * 0.52, cx + 8, headY + headRy * 0.52, [168, 96, 84], 2);
  // photo frame
  rect(x, y, w, 2, INK); rect(x, y + h - 2, w, 2, INK);
  rect(x, y, 2, h, INK); rect(x + w - 2, y, 2, h, INK);
}

// ---- guilloche: faint security waves across a page --------------------------
function guilloche(x0: number, y0: number, x1: number, y1: number, c: number[]) {
  for (let yy = y0 + 6; yy < y1; yy += 9) {
    for (let xx = x0; xx < x1; xx += 2) {
      const yy2 = yy + Math.round(2.2 * Math.sin((xx - x0) / 26) + 1.4 * Math.sin((xx - x0) / 9));
      blendPix(xx, yy2, c, 0.10);
    }
  }
}

// ---- entry / exit stamp (rotated frame + lines) -----------------------------
function stamp(cx: number, cy: number, w: number, h: number, ang: number,
  c: number[], lines: { t: string; s: number }[], shape: "rect" | "circle") {
  if (shape === "circle") {
    ring(cx, cy, w / 2, 3, c);
    ring(cx, cy, w / 2 - 7, 1, c);
    const n = lines.length;
    lines.forEach((ln, i) => {
      const ly = cy - ((n - 1) * 11) / 2 + i * 11 - 3;
      drawText(cx - Math.floor(textWidth(ln.t, ln.s) / 2), ly, ln.t, ln.s, c);
    });
    return;
  }
  rotRect(cx, cy, w, h, ang, c, 2);
  rotRect(cx, cy, w - 8, h - 8, ang, c, 1);
  const n = lines.length;
  lines.forEach((ln, i) => {
    const off = -((n - 1) * 17) / 2 + i * 17;
    const tw = textWidth(ln.t, ln.s);
    const a = ang * Math.PI / 180;
    const bx = cx - (tw / 2) * Math.cos(a) - off * Math.sin(a);
    const by = cy - (tw / 2) * Math.sin(a) + off * Math.cos(a);
    drawTextA(bx, by, ln.t, ln.s, c, ang);
  });
}

// ---- handwritten signature (drawn strokes, not a font) ----------------------
function signature(x: number, y: number, c: number[]) {
  // "Mara Vey" as a flowing squiggle
  const pts: [number, number][] = [
    [0, 14], [6, 2], [10, 12], [14, 4], [18, 13], [24, 6], [30, 14], [36, 8],
    [42, 14], [50, 10], [58, 14], [64, 4], [70, 12], [76, 6], [84, 13], [92, 9],
  ];
  for (let i = 0; i + 1 < pts.length; i++)
    line(x + pts[i][0], y + pts[i][1], x + pts[i + 1][0], y + pts[i + 1][1], c, 2);
  line(x + 4, y + 20, x + 88, y + 18, c, 1);
}

// ---- MRZ check digits (ICAO 9303) -------------------------------------------
function mrzVal(ch: string): number {
  if (ch >= "0" && ch <= "9") return ch.charCodeAt(0) - 48;
  if (ch >= "A" && ch <= "Z") return ch.charCodeAt(0) - 55;
  return 0;
}
function mrzCheck(s: string): number {
  const w = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += mrzVal(s[i]) * w[i % 3];
  return sum % 10;
}
function mrzLines(): [string, string] {
  const doc = "CD482917<";
  const dob = "940314", exp = "340211", personal = "<<<<<<<<<<<<<<";
  const seg1 = doc + mrzCheck(doc);
  const seg2 = dob + mrzCheck(dob);
  const seg3 = exp + mrzCheck(exp);
  const seg4 = personal + mrzCheck(personal);
  const composite = mrzCheck(seg1 + seg2 + seg3 + seg4);
  const line2 = seg1 + "CDV" + seg2 + "F" + seg3 + seg4 + composite;
  const name = "VEY<<MARA<ILSEN";
  const line1 = "P<CDV" + name + "<".repeat(44 - 5 - name.length);
  return [line1, line2];
}
function drawMRZ(x: number, y: number, s: string, scale: number, c: number[]) {
  // dense pitch (10px per char at scale 2) like a real MRZ
  for (let i = 0; i < s.length; i++)
    drawGlyph(s[i], x + i * 10, y, scale, c);
}

// ---- PNG encoder (8-bit RGB, filter 0, zlib via stdlib) ---------------------
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ---- composition -------------------------------------------------------------
function field(x: number, y: number, label: string, value: string, valueColor = INK) {
  drawText(x, y, label, 1, GREY);
  drawText(x, y + 11, value, 2, valueColor, true);
}

function main() {
  fillAll(DESK);
  // pages with a soft shadow, lying open
  rect(20, 20, 992, 612, [22, 26, 36]);
  rect(14, 14, 491, 612, PAPER_L);
  rect(519, 14, 491, 612, PAPER_R);
  // gutter shadow
  for (let i = 0; i < 14; i++) {
    const a = 0.16 * (1 - Math.abs(i - 7) / 7);
    vline(505 + i, 14, 612, [60, 55, 40], 1);
    blendPix(505 + i, 14, [0, 0, 0], 0);
    void a;
  }
  rect(504, 14, 2, 612, [120, 112, 92]);
  rect(517, 14, 2, 612, [120, 112, 92]);
  guilloche(24, 110, 495, 490, INK);
  guilloche(529, 30, 1000, 610, INK);

  // ================= LEFT PAGE: data page =================
  coatOfArms(66, 68, 1);
  drawTextC(292, 40, "REPUBLIC OF CALDRIS", 2, INK, true);
  drawTextC(292, 62, "PASSPORT", 2, GOLD, true);
  drawTextC(292, 82, "PASSPORT - PASSEPORT", 1, INK_SOFT);
  hline(36, 104, 448, INK, 2);
  hline(36, 108, 448, GOLD, 1);

  portrait(36, 122, 150, 190);
  drawTextC(111, 316, "PHOTOGRAPH", 1, GREY);

  field(204, 122, "SURNAME / SURNAM", "VEY");
  field(204, 154, "GIVEN NAMES / GIVNAM", "MARA ILSEN");
  field(204, 186, "NATIONALITY / NASJON", "CALDRISI");
  field(204, 218, "DATE OF BIRTH / BORNDAG", "14 MAR 1994");
  field(204, 250, "PLACE OF BIRTH / BORNSTED", "PORT SARELLE");
  field(204, 282, "SEX / KJONN", "F");
  field(292, 282, "OCCUPATION / YRKE", "LIGHTHOUSE KEEPER");

  drawText(36, 340, "HOLDER'S SIGNATURE", 1, GREY);
  signature(40, 352, INK);
  hline(36, 374, 180, GREY, 1);

  field(36, 392, "DATE OF ISSUE / UTSTEDT", "12 FEB 2024");
  field(270, 392, "DATE OF EXPIRY / UTLOP", "11 FEB 2034");
  field(36, 436, "PLACE OF ISSUE / UTSTEDSTED", "PORT SARELLE");
  field(270, 436, "PASSPORT NO. / PASSNR", "CD 482 917", RED);

  drawText(36, 478, "THIS PASSPORT REMAINS THE PROPERTY OF THE", 1, GREY);
  drawText(36, 488, "REPUBLIC OF CALDRIS.", 1, GREY);

  // MRZ
  rect(24, 504, 471, 112, MRZ_BG);
  rect(24, 504, 471, 2, INK); rect(24, 614, 471, 2, INK);
  const [m1, m2] = mrzLines();
  drawMRZ(40, 522, m1, 2, INK);
  drawMRZ(40, 556, m2, 2, INK);

  // ================= RIGHT PAGE: visas & stamps =================
  drawTextC(764, 34, "VISAS / VISUM", 2, INK, true);
  drawText(958, 36, "5", 2, GREY);
  hline(539, 58, 452, INK, 2);

  // Veyland visa sticker
  rect(548, 72, 232, 142, VISA_BG);
  rect(548, 72, 232, 2, GREEN); rect(548, 212, 232, 2, GREEN);
  rect(548, 72, 2, 142, GREEN); rect(778, 72, 2, 142, GREEN);
  rect(554, 78, 220, 130, VISA_BG);
  hline(554, 78, 220, GREEN, 1); hline(554, 207, 220, GREEN, 1);
  vline(554, 78, 130, GREEN, 1); vline(773, 78, 130, GREEN, 1);
  drawTextC(664, 86, "KINGDOM OF VEYLAND", 1, GREEN, true);
  drawTextC(664, 102, "VISA", 3, GREEN, true);
  drawTextC(664, 136, "TYPE C - SINGLE ENTRY", 1, INK);
  drawTextC(664, 152, "VALID 01 SEP 2026 - 30 NOV 2026", 1, INK);
  drawTextC(664, 168, "STAY MAX 90 DAYS", 1, INK);
  drawTextC(664, 184, "NO EMPLOYMENT", 1, RED, true);
  drawTextC(664, 200, "FEE 45 CRS - PAID 12 AUG 2026", 1, INK_SOFT);

  // fee stamp overlapping the sticker's corner
  stamp(786, 222, 68, 68, 0, PURPLE, [
    { t: "FEE PAID", s: 1 }, { t: "45 CRS", s: 1 }, { t: "12.08.26", s: 1 },
  ], "circle");

  // arrival / departure stamps — all dated after issue (12 FEB 2024), in order
  stamp(898, 122, 168, 92, -8, BLUE, [
    { t: "MIRELLIA", s: 2 }, { t: "ARRIVAL", s: 1 }, { t: "03 MAR 2024", s: 1 },
  ], "rect");
  stamp(898, 258, 168, 92, 6, BLUE, [
    { t: "MIRELLIA", s: 2 }, { t: "DEPARTURE", s: 1 }, { t: "17 MAR 2024", s: 1 },
  ], "rect");
  stamp(664, 300, 168, 92, -5, GREEN, [
    { t: "OSTARA", s: 2 }, { t: "ARRIVAL", s: 1 }, { t: "22 JUN 2025", s: 1 },
  ], "rect");
  stamp(898, 400, 168, 92, -7, TEAL, [
    { t: "VEYLAND", s: 2 }, { t: "ARRIVAL", s: 1 }, { t: "09 SEP 2026", s: 1 },
  ], "rect");
  stamp(664, 448, 168, 92, 4, TEAL, [
    { t: "VEYLAND", s: 2 }, { t: "DEPARTURE", s: 1 }, { t: "21 SEP 2026", s: 1 },
  ], "rect");

  // the telling detail: a harbour-tax exemption for a lighthouse keeper
  rect(548, 516, 452, 62, PAPER_R);
  rect(548, 516, 452, 2, GOLD); rect(548, 576, 452, 2, GOLD);
  rect(548, 516, 2, 62, GOLD); rect(998, 516, 2, 62, GOLD);
  drawText(562, 528, "NOTE: HOLDER IS A LIGHTHOUSE KEEPER.", 1, INK, true);
  drawText(562, 544, "EXEMPT FROM HARBOUR TAX IN CALDRISI PORTS.", 1, INK);
  drawText(562, 560, "OFFICER E. SOLBERG - PORT SARELLE", 1, GREY);
  drawTextC(764, 596, "CD 482 917", 1, GREY);

  // write out
  const buf = encodePNG();
  let outPath = "/output/entry.png";
  try {
    mkdirSync("/output", { recursive: true });
    writeFileSync(outPath, buf);
  } catch {
    mkdirSync("out", { recursive: true });
    outPath = "out/entry.png";
    writeFileSync(outPath, buf);
  }
  console.log(`wrote ${outPath} (${buf.length} bytes, ${W}x${H})`);
}

main();
