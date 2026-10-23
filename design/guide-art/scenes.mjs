/**
 * GÜVENDE rehber illüstrasyonları — tek görsel dil.
 * Kaynak: bu dosyadaki elle yazılmış vektör sahneler (özgün; dış görsel, fotoğraf veya logo yok).
 * Çıktı: build.mjs ile assets/guide/art/*.jpg|png (uygulama raster dosyaları kullanır).
 *
 * Kurallar: 400×400 tuval, koyu lacivert zemin (kenarlar düz ART_BG; kart içinde "contain" ile
 * boşluk görünmez), ışık sol üstten, tek konu, görselde yazı yok.
 */

export const ART_BG = '#0E1A2E';

// Palet
const P = {
  bg: ART_BG,
  glow: '#1E3658',
  navy: '#22324D',
  navy2: '#2C4166',
  line: '#3A5379',
  ink: '#16233A',
  skin: '#F1C3A0',
  skinD: '#D69C78',
  hair: '#2A2230',
  red: '#F0525A',
  redD: '#C7363F',
  teal: '#19D3A2',
  tealD: '#0FA37D',
  amber: '#F7B548',
  amberD: '#D98E22',
  blue: '#4DA3FF',
  blueD: '#2A73D6',
  wood: '#D2955A',
  woodD: '#9E6534',
  wall: '#E9EEF5',
  wallD: '#C5D0DE',
  white: '#F5F8FC',
  pants: '#2B3C5E',
  pantsD: '#1E2B45',
};

const defs = `
<defs>
  <radialGradient id="glow" cx="50%" cy="46%" r="46%">
    <stop offset="0" stop-color="${P.glow}"/>
    <stop offset="0.75" stop-color="#14243E"/>
    <stop offset="1" stop-color="${P.bg}"/>
  </radialGradient>
  <linearGradient id="gRed" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#FF6E73"/><stop offset="1" stop-color="${P.redD}"/></linearGradient>
  <linearGradient id="gTeal" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#3EE8B9"/><stop offset="1" stop-color="${P.tealD}"/></linearGradient>
  <linearGradient id="gAmber" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#FFC966"/><stop offset="1" stop-color="${P.amberD}"/></linearGradient>
  <linearGradient id="gBlue" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#7AB9FF"/><stop offset="1" stop-color="${P.blueD}"/></linearGradient>
  <linearGradient id="gWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E3AA6E"/><stop offset="1" stop-color="${P.woodD}"/></linearGradient>
  <linearGradient id="gWall" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="${P.wallD}"/></linearGradient>
  <linearGradient id="gNavy" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="${P.navy2}"/><stop offset="1" stop-color="${P.ink}"/></linearGradient>
  <linearGradient id="gPants" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.pants}"/><stop offset="1" stop-color="${P.pantsD}"/></linearGradient>
  <linearGradient id="gGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#BFE0FF" stop-opacity="0.95"/><stop offset="1" stop-color="#5FA8F0" stop-opacity="0.85"/></linearGradient>
  <linearGradient id="gGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#25395C"/><stop offset="1" stop-color="#17263F"/></linearGradient>
  <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B3050"/><stop offset="1" stop-color="#22395E"/></linearGradient>
  <linearGradient id="eL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${P.bg}"/><stop offset="1" stop-color="${P.bg}" stop-opacity="0"/></linearGradient>
  <linearGradient id="eR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${P.bg}"/><stop offset="1" stop-color="${P.bg}" stop-opacity="0"/></linearGradient>
  <linearGradient id="eT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.bg}"/><stop offset="1" stop-color="${P.bg}" stop-opacity="0"/></linearGradient>
  <linearGradient id="eB" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${P.bg}"/><stop offset="1" stop-color="${P.bg}" stop-opacity="0"/></linearGradient>
  <filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#000" flood-opacity="0.35"/></filter>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
</defs>`;

/** Kalın yuvarlak uçlu uzuv (kol/bacak) */
const limb = (pts, color, w = 13) =>
  `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
/** Baş: ten + saç (yön: 1 sağa, -1 sola bakar) */
const head = (cx, cy, r = 15, dir = 1, hair = P.hair) => `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${P.skin}"/>
  <path d="M${cx - r} ${cy + 2} A ${r} ${r} 0 0 1 ${cx + r} ${cy - 1} Q ${cx + dir * r * 0.2} ${cy - r * 0.35} ${cx - dir * r * 0.9} ${cy + r * 0.55} Z" fill="${hair}"/>
  <circle cx="${cx - dir * r * 0.15}" cy="${cy + 2}" r="${r * 0.22}" fill="${P.skinD}"/>`;
const ground = (y = 318, rx = 150) => `<ellipse cx="200" cy="${y}" rx="${rx}" ry="16" fill="#0A1424" opacity="0.55"/>`;
const sparkle = (x, y, s = 1, c = P.white) =>
  `<path d="M${x} ${y - 7 * s} L${x + 2 * s} ${y - 2 * s} L${x + 7 * s} ${y} L${x + 2 * s} ${y + 2 * s} L${x} ${y + 7 * s} L${x - 2 * s} ${y + 2 * s} L${x - 7 * s} ${y} L${x - 2 * s} ${y - 2 * s} Z" fill="${c}" opacity="0.55"/>`;
const check = (cx, cy, r = 22) => `
  <g filter="url(#sh)"><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#gTeal)"/></g>
  <path d="M${cx - r * 0.42} ${cy + 1} L${cx - r * 0.1} ${cy + r * 0.32} L${cx + r * 0.45} ${cy - r * 0.32}" fill="none" stroke="#fff" stroke-width="${r * 0.22}" stroke-linecap="round" stroke-linejoin="round"/>`;

const frame = (body, { transparent = false } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">${defs}
  ${transparent ? '' : `<rect width="400" height="400" fill="${P.bg}"/><rect width="400" height="400" fill="url(#glow)"/>`}
  ${body}
  ${transparent ? '' : `<rect x="0" y="0" width="34" height="400" fill="url(#eL)"/><rect x="366" y="0" width="34" height="400" fill="url(#eR)"/><rect x="0" y="0" width="400" height="34" fill="url(#eT)"/><rect x="0" y="352" width="400" height="48" fill="url(#eB)"/>`}
</svg>`;


/**
 * Dizlerin üzerine çökmüş, öne kapanmış figür (sağa bakar). (x,y): diz-zemin noktası.
 * Yakın kol baş ve enseyi örter; uzak kol `hold` noktasına (masa ayağı) tutunur ya da başı korur.
 */
function crouch(x, y, shirt, shirtD, hold) {
  // x: dizin önü, y: zemin
  const H = [x - 46, y - 38]; // kalça (topuklar üzerinde)
  const S = [x + 16, y - 56]; // omuz
  const hd = [x + 30, y - 30]; // baş: aşağıda, öne eğik
  const far = hold
    ? limb([[S[0] - 4, S[1] + 10], [x + 28, y - 14], [hold[0] - 6, hold[1]]], shirtD, 12) + `<circle cx="${hold[0] - 1}" cy="${hold[1]}" r="7.5" fill="${P.skinD}"/>`
    : limb([[S[0] - 4, S[1] + 6], [hd[0] + 10, hd[1] - 26], [hd[0] + 22, hd[1] - 10]], shirtD, 12) + `<circle cx="${hd[0] + 23}" cy="${hd[1] - 6}" r="7" fill="${P.skinD}"/>`;
  return `
  <ellipse cx="${x - 14}" cy="${y + 4}" rx="74" ry="9" fill="#0A1424" opacity="0.55"/>
  ${far}
  <!-- baldır yerde, ayak geride -->
  ${limb([[x - 70, y - 6], [x - 4, y - 8]], P.pantsD, 18)}
  <!-- uyluk -->
  ${limb([[H[0] + 4, H[1] + 4], [x - 8, y - 14]], 'url(#gPants)', 24)}
  <!-- kambur sırt (kapanmış gövde) -->
  <path d="M${H[0] - 12} ${H[1] + 10} C ${H[0] - 14} ${y - 92}, ${S[0] + 4} ${y - 96}, ${S[0] + 14} ${S[1] + 10} L ${x + 6} ${y - 22} Q ${x - 22} ${y - 10} ${H[0] - 12} ${H[1] + 10} Z" fill="${shirt}"/>
  <path d="M${H[0] - 6} ${H[1] - 4} C ${H[0] - 4} ${y - 84}, ${S[0] - 6} ${y - 88}, ${S[0] + 6} ${S[1] + 2}" fill="none" stroke="#fff" stroke-opacity="0.22" stroke-width="5" stroke-linecap="round"/>
  ${head(hd[0], hd[1], 16, 1)}
  <!-- yakın kol: başın ve ensenin üstünde -->
  ${limb([[S[0] + 4, S[1] + 4], [hd[0] + 2, hd[1] - 24], [hd[0] + 18, hd[1] - 16]], shirtD, 13)}
  <circle cx="${hd[0] + 21}" cy="${hd[1] - 13}" r="7.5" fill="${P.skin}"/>`;
}

// ───────────────────────── 5. Çök – Kapan – Tutun ─────────────────────────
// Doğru davranış (AFAD/ShakeOut): dizlerin üzerine çök, sağlam masanın altına gir, bir kolla baş ve
// enseyi koru, diğer elle masa ayağına tutun.
function dropCoverHold({ transparent = false } = {}) {
  const motion = transparent ? '#FFE4E6' : P.line;
  return frame(
    `
  ${transparent ? '' : `<rect x="64" y="76" width="70" height="56" rx="8" fill="#203554"/><rect x="72" y="84" width="54" height="40" rx="5" fill="#2B4772"/>`}
  ${ground(318, 140)}
  <!-- masa -->
  <g filter="url(#sh)">
    <rect x="84" y="166" width="240" height="20" rx="7" fill="url(#gWood)"/>
    <rect x="98" y="184" width="15" height="128" rx="5" fill="${P.woodD}"/>
    <rect x="292" y="184" width="15" height="128" rx="5" fill="${P.woodD}"/>
    <rect x="84" y="166" width="240" height="6" rx="3" fill="#EDBB83"/>
  </g>
  ${crouch(212, 308, 'url(#gRed)', P.redD, [292, 270])}
  <!-- sarsıntı izi -->
  <path d="M78 196 q -12 16 0 32" fill="none" stroke="${motion}" stroke-width="5" stroke-linecap="round"/>
  <path d="M62 188 q -16 24 0 48" fill="none" stroke="${motion}" stroke-width="5" stroke-linecap="round" opacity="0.6"/>
  <path d="M336 196 q 12 16 0 32" fill="none" stroke="${motion}" stroke-width="5" stroke-linecap="round"/>
  <path d="M352 188 q 16 24 0 48" fill="none" stroke="${motion}" stroke-width="5" stroke-linecap="round" opacity="0.6"/>
  `,
    { transparent },
  );
}

// ───────────────────────── 1. Ev güvenliği ─────────────────────────
function homeSafety() {
  return frame(`
  ${ground(322, 150)}
  <g filter="url(#sh)">
    <rect x="108" y="170" width="184" height="148" rx="10" fill="url(#gWall)"/>
    <path d="M88 182 L200 92 L312 182 Z" fill="url(#gRed)" stroke="${P.redD}" stroke-width="6" stroke-linejoin="round"/>
    <rect x="248" y="104" width="24" height="44" rx="4" fill="${P.redD}"/>
  </g>
  <rect x="180" y="248" width="40" height="70" rx="6" fill="${P.navy2}"/>
  <circle cx="211" cy="285" r="3.5" fill="${P.amber}"/>
  <rect x="128" y="200" width="40" height="36" rx="6" fill="url(#gAmber)"/>
  <rect x="232" y="200" width="40" height="36" rx="6" fill="url(#gAmber)"/>
  <path d="M148 200 V236 M128 218 H168 M252 200 V236 M232 218 H272" stroke="#E9A43B" stroke-width="3"/>
  <!-- boş çıkış yolu -->
  <path d="M200 322 L200 350" stroke="${P.teal}" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 12"/>
  <!-- yangın söndürücü -->
  <g filter="url(#sh)">
    <rect x="66" y="252" width="30" height="66" rx="12" fill="url(#gRed)"/>
    <rect x="72" y="238" width="18" height="16" rx="4" fill="${P.ink}"/>
    <path d="M90 244 q 22 -2 20 22" fill="none" stroke="${P.ink}" stroke-width="5" stroke-linecap="round"/>
    <rect x="70" y="276" width="22" height="16" rx="4" fill="${P.white}" opacity="0.9"/>
  </g>
  <!-- güvenlik kalkanı -->
  <g filter="url(#sh)">
    <path d="M318 214 L352 226 V258 Q352 286 318 302 Q284 286 284 258 V226 Z" fill="url(#gTeal)"/>
  </g>
  <path d="M302 258 L314 270 L336 246" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  `);
}

// ───────────────────────── 2. Acil durum çantası ─────────────────────────
function kit() {
  return frame(`
  ${ground(322, 160)}
  <!-- fener ve ışık -->
  <path d="M86 270 L20 238 L20 312 Z" fill="${P.amber}" opacity="0.18"/>
  <g filter="url(#sh)">
    <rect x="84" y="262" width="62" height="30" rx="10" fill="${P.navy2}"/>
    <rect x="72" y="258" width="20" height="38" rx="7" fill="${P.line}"/>
    <ellipse cx="74" cy="277" rx="5" ry="14" fill="#FFE29A"/>
  </g>
  <!-- çanta -->
  <g filter="url(#sh)">
    <path d="M168 120 Q 168 92 200 92 Q 232 92 232 120" fill="none" stroke="${P.redD}" stroke-width="12" stroke-linecap="round"/>
    <rect x="132" y="116" width="136" height="200" rx="34" fill="url(#gRed)"/>
    <rect x="150" y="214" width="100" height="86" rx="20" fill="${P.redD}"/>
    <rect x="132" y="116" width="136" height="16" rx="8" fill="#FF7C80" opacity="0.6"/>
  </g>
  <rect x="186" y="150" width="28" height="70" rx="6" fill="#fff"/>
  <rect x="165" y="171" width="70" height="28" rx="6" fill="#fff"/>
  <!-- belge kılıfı -->
  <g filter="url(#sh)">
    <rect x="160" y="270" width="64" height="48" rx="6" fill="#DCEBFF" opacity="0.9" transform="rotate(-8 192 294)"/>
    <path d="M170 286 h40 M170 298 h30" stroke="${P.blueD}" stroke-width="4" stroke-linecap="round" transform="rotate(-8 192 294)"/>
  </g>
  <!-- su şişesi -->
  <g filter="url(#sh)">
    <rect x="282" y="166" width="48" height="150" rx="16" fill="url(#gGlass)"/>
    <rect x="292" y="146" width="28" height="24" rx="6" fill="${P.blueD}"/>
    <rect x="282" y="220" width="48" height="40" fill="${P.white}" opacity="0.55"/>
  </g>
  <!-- düdük -->
  <g filter="url(#sh)">
    <rect x="300" y="288" width="44" height="24" rx="10" fill="url(#gAmber)"/>
    <circle cx="340" cy="300" r="10" fill="${P.amberD}"/>
  </g>
  `);
}

// ───────────────────────── 3. Aile iletişim ve buluşma planı ─────────────────────────
function familyPlan() {
  return frame(`
  ${ground(330, 160)}
  <!-- harita -->
  <g filter="url(#sh)">
    <path d="M70 110 L150 92 L230 112 L310 94 L310 262 L230 280 L150 260 L70 278 Z" fill="#E7EEF7"/>
    <path d="M150 92 V260 M230 112 V280" stroke="${P.wallD}" stroke-width="3"/>
    <path d="M70 196 Q 120 170 160 196 T 250 190 T 310 178" fill="none" stroke="#9FD9C6" stroke-width="12" opacity="0.8"/>
    <path d="M110 238 Q 160 220 190 182 T 262 140" fill="none" stroke="${P.blueD}" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 12"/>
    <rect x="96" y="228" width="26" height="22" rx="4" fill="${P.navy2}"/>
    <path d="M92 230 L109 214 L126 230 Z" fill="${P.red}"/>
  </g>
  <!-- buluşma noktası -->
  <g filter="url(#sh)">
    <path d="M262 74 C 238 74 228 94 236 112 L262 150 L288 112 C 296 94 286 74 262 74 Z" fill="url(#gTeal)"/>
    <circle cx="262" cy="100" r="10" fill="#fff"/>
  </g>
  <!-- telefon -->
  <g filter="url(#sh)">
    <rect x="276" y="196" width="78" height="136" rx="16" fill="${P.ink}"/>
    <rect x="283" y="206" width="64" height="116" rx="10" fill="#1F3A60"/>
    <rect x="292" y="222" width="46" height="30" rx="10" fill="${P.teal}"/>
    <path d="M304 237 l7 7 l13 -14" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="292" y="262" width="34" height="10" rx="5" fill="${P.line}"/>
    <rect x="292" y="278" width="40" height="10" rx="5" fill="${P.line}"/>
  </g>
  <!-- aile -->
  <g filter="url(#sh)">
    <path d="M58 338 Q 60 296 92 290 Q 124 296 126 338 Z" fill="url(#gBlue)"/>
    ${head(92, 270, 18, 1)}
    <path d="M124 338 Q 126 312 148 308 Q 170 312 172 338 Z" fill="url(#gAmber)"/>
    ${head(148, 293, 13, 1, '#5A3A2A')}
    <path d="M168 338 Q 172 300 204 294 Q 236 300 240 338 Z" fill="url(#gTeal)"/>
    ${head(204, 273, 17, -1, '#3B2A20')}
  </g>
  `);
}

// ───────────────────────── 4. Dolap ve ağır eşya sabitleme ─────────────────────────
function furniture() {
  return frame(`
  <rect x="40" y="56" width="320" height="270" rx="16" fill="#1A2C48"/>
  <rect x="40" y="300" width="320" height="26" fill="#14233B"/>
  ${ground(330, 150)}
  <!-- dolap -->
  <g filter="url(#sh)">
    <rect x="96" y="104" width="138" height="216" rx="10" fill="url(#gWood)"/>
    <path d="M165 112 V312" stroke="${P.woodD}" stroke-width="4"/>
    <rect x="150" y="196" width="6" height="30" rx="3" fill="${P.ink}"/>
    <rect x="174" y="196" width="6" height="30" rx="3" fill="${P.ink}"/>
    <rect x="96" y="104" width="138" height="10" rx="5" fill="#EDBB83"/>
  </g>
  <!-- L köşebentler (duvara) -->
  <g>
    <path d="M112 104 V84 H136" fill="none" stroke="${P.white}" stroke-width="9" stroke-linejoin="round"/>
    <circle cx="112" cy="96" r="3" fill="${P.ink}"/><circle cx="128" cy="84" r="3" fill="${P.ink}"/>
    <path d="M218 104 V84 H194" fill="none" stroke="${P.white}" stroke-width="9" stroke-linejoin="round"/>
    <circle cx="218" cy="96" r="3" fill="${P.ink}"/><circle cx="202" cy="84" r="3" fill="${P.ink}"/>
  </g>
  <!-- raf + sabitleme kayışı -->
  <g filter="url(#sh)">
    <rect x="256" y="168" width="84" height="152" rx="8" fill="url(#gNavy)" stroke="${P.line}" stroke-width="3"/>
    <path d="M256 218 H340 M256 268 H340" stroke="${P.line}" stroke-width="5"/>
    <rect x="266" y="190" width="14" height="26" rx="2" fill="${P.blue}"/><rect x="284" y="186" width="12" height="30" rx="2" fill="${P.amber}"/><rect x="300" y="194" width="16" height="22" rx="2" fill="${P.red}"/>
    <rect x="270" y="244" width="40" height="22" rx="4" fill="${P.wallD}"/>
  </g>
  <path d="M252 214 H344" stroke="${P.teal}" stroke-width="6" stroke-linecap="round"/>
  <circle cx="252" cy="214" r="5" fill="${P.white}"/><circle cx="344" cy="214" r="5" fill="${P.white}"/>
  ${check(300, 120, 24)}
  `);
}

// ───────────────────────── 6. Deprem sonrası güvenli hareket ─────────────────────────
// Sarsıntı bitince çantayı alıp hasarlı binalardan ve enerji hatlarından uzaklaşarak açık toplanma alanına git.
function afterQuake() {
  return frame(`
  <path d="M0 268 H400 V400 H0 Z" fill="url(#gGround)"/>
  <!-- hasarlı bina (geride, solda) -->
  <g filter="url(#sh)">
    <path d="M40 120 L118 110 L124 268 L36 268 Z" fill="#3A5178"/>
    <path d="M58 140 h18 v18 h-18z M90 138 h18 v18 h-18z M58 180 h18 v18 h-18z M92 178 h18 v18 h-18z M58 222 h18 v18 h-18z" fill="#22385A"/>
    <path d="M86 112 L78 150 L96 176 L84 214 L98 250" fill="none" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M124 268 l18 -10 l10 10 z M30 268 l-8 -8 l16 -4 z" fill="#4C6590"/>
  </g>
  <!-- yol: binadan uzağa -->
  <path d="M150 360 Q 230 320 330 286" fill="none" stroke="${P.teal}" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 14"/>
  <path d="M318 276 L340 284 L324 300" fill="none" stroke="${P.teal}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- toplanma alanı işareti (yazısız) -->
  <g filter="url(#sh)">
    <rect x="320" y="150" width="8" height="122" rx="4" fill="${P.line}"/>
    <rect x="290" y="128" width="68" height="62" rx="10" fill="url(#gTeal)"/>
    <circle cx="310" cy="148" r="6" fill="#fff"/><circle cx="324" cy="144" r="7" fill="#fff"/><circle cx="338" cy="148" r="6" fill="#fff"/>
    <path d="M302 178 q 8 -20 16 0 M314 178 q 10 -26 20 0 M330 178 q 8 -20 16 0" fill="#fff"/>
  </g>
  <ellipse cx="214" cy="334" rx="46" ry="9" fill="#0A1424" opacity="0.55"/>
  <!-- kişi, sırt çantasıyla yürüyor -->
  ${limb([[206, 262], [190, 300], [180, 330]], 'url(#gPants)', 15)}
  ${limb([[212, 262], [234, 296], [248, 326]], P.pantsD, 15)}
  <rect x="172" y="198" width="32" height="56" rx="12" fill="url(#gRed)"/>
  <rect x="190" y="196" width="40" height="72" rx="16" fill="url(#gBlue)"/>
  ${limb([[214, 210], [236, 236], [244, 258]], P.blueD, 11)}
  <circle cx="245" cy="262" r="6" fill="${P.skin}"/>
  ${head(214, 178, 16, 1)}
  `);
}

// ───────────────────────── 7. Enkaz altında mahsur kalma ─────────────────────────
// AFAD: paniklemeyin, enerjinizi koruyun, borulara/zemine vurarak varlığınızı duyurun.
function trapped() {
  return frame(`
  <!-- üst döşeme: sola doğru alçalan beton plaka -->
  <g filter="url(#sh)">
    <path d="M16 214 L384 150 L384 184 L16 248 Z" fill="#56698A"/>
    <path d="M16 214 L384 150 L384 158 L16 222 Z" fill="#8193B2"/>
    <path d="M40 210 l26 -30 l30 22 z M300 156 l30 -34 l26 28 z M200 180 l18 -18 l22 12 z" fill="#4A5D7E"/>
  </g>
  <!-- çatlaktan sızan ışık -->
  <path d="M232 176 L250 172 L300 300 L236 300 Z" fill="#9CC3FF" opacity="0.10"/>
  <!-- zemin döşemesi -->
  <path d="M16 300 H384 V334 H16 Z" fill="#3E5172"/>
  <path d="M16 300 H384 V306 H16 Z" fill="#6A7FA3"/>
  <!-- dikey boru -->
  <rect x="316" y="170" width="18" height="130" rx="6" fill="#8EA3C2"/>
  <rect x="316" y="170" width="6" height="130" rx="3" fill="#B9C8DE"/>
  <rect x="312" y="230" width="26" height="12" rx="4" fill="#6F84A6"/>
  <!-- yüzüstü, dirseklerine dayanmış kişi -->
  <ellipse cx="200" cy="304" rx="120" ry="6" fill="#0A1424" opacity="0.5"/>
  ${limb([[70, 294], [150, 290]], P.pantsD, 18)}
  ${limb([[150, 290], [182, 286]], 'url(#gPants)', 22)}
  ${limb([[176, 288], [246, 274]], 'url(#gTeal)', 36)}
  ${head(270, 262, 16, 1)}
  ${limb([[236, 280], [244, 298], [262, 298]], P.tealD, 12)}
  <circle cx="266" cy="297" r="6.5" fill="${P.skinD}"/>
  <!-- taşla boruya vuran el -->
  ${limb([[246, 272], [276, 286], [302, 272]], P.teal, 12)}
  <circle cx="304" cy="270" r="7" fill="${P.skin}"/>
  <rect x="304" y="258" width="14" height="12" rx="3" fill="#A9B6C9" transform="rotate(-18 311 264)"/>
  <!-- ses dalgaları -->
  <path d="M346 232 q 12 -14 0 -28" fill="none" stroke="${P.amber}" stroke-width="5" stroke-linecap="round"/>
  <path d="M358 246 q 22 -28 0 -56" fill="none" stroke="${P.amber}" stroke-width="5" stroke-linecap="round" opacity="0.65"/>
  <path d="M346 256 q 10 10 0 22" fill="none" stroke="${P.amber}" stroke-width="5" stroke-linecap="round" opacity="0.65"/>
  ${sparkle(120, 260, 0.5)}${sparkle(196, 250, 0.4)}
  `);
}

// ───────────────────────── 8. Açık alanda deprem güvenliği ─────────────────────────
// Binalardan, ağaçlardan, direklerden ve enerji hatlarından uzak açık alanda çömel, başını koru.
function outdoor() {
  return frame(`
  <path d="M0 250 H400 V400 H0 Z" fill="url(#gGround)"/>
  <!-- uzak binalar, ağaç, direk -->
  <g opacity="0.85">
    <rect x="20" y="150" width="38" height="100" rx="4" fill="#2C4166"/>
    <rect x="62" y="176" width="30" height="74" rx="4" fill="#26395A"/>
    <rect x="320" y="160" width="50" height="90" rx="4" fill="#2C4166"/>
    <rect x="300" y="150" width="6" height="100" fill="#3A5379"/>
    <path d="M286 156 h34" stroke="#3A5379" stroke-width="5"/>
    <circle cx="112" cy="198" r="20" fill="#1F5B55"/><rect x="109" y="210" width="6" height="40" fill="#2B3C5E"/>
  </g>
  <!-- güvenli açık alan -->
  <ellipse cx="204" cy="308" rx="124" ry="30" fill="none" stroke="${P.teal}" stroke-width="4" stroke-dasharray="3 12" stroke-linecap="round"/>
  ${crouch(212, 308, 'url(#gAmber)', P.amberD, null)}
  ${check(310, 96, 22)}
  `);
}

// ───────────────────────── 9. Araçta doğru davranış ─────────────────────────
// Güvenliyse yolu kapatmadan sağa yanaş, dur, araçta bekle; köprü, direk, ağaç yanında durma.
function vehicle() {
  return frame(`
  <path d="M0 236 Q 120 214 220 228 T 400 222 V400 H0 Z" fill="#1A2C48"/>
  <!-- yol -->
  <path d="M0 268 H400 V352 H0 Z" fill="#2A3B58"/>
  <path d="M0 268 H400" stroke="#3E5478" stroke-width="4"/>
  <path d="M10 310 H70 M110 310 H170 M210 310 H270" stroke="#7F92B2" stroke-width="5" stroke-linecap="round"/>
  <!-- sağ şerit kenarı -->
  <path d="M0 348 H400" stroke="${P.white}" stroke-width="4" opacity="0.6"/>
  <g transform="translate(-52 0)">
  <ellipse cx="300" cy="352" rx="78" ry="9" fill="#0A1424" opacity="0.6"/>
  <!-- duran araç (sağ kenarda) -->
  <g filter="url(#sh)">
    <path d="M222 336 L224 306 Q 228 296 240 294 L 252 270 Q 258 262 272 262 L 330 262 Q 344 262 352 274 L 364 294 Q 380 298 380 312 L 380 336 Z" fill="url(#gBlue)"/>
    <path d="M258 290 L 266 274 Q 270 270 278 270 L 300 270 L 300 290 Z" fill="#BFE0FF"/>
    <path d="M308 270 L 328 270 Q 338 270 344 278 L 352 290 L 308 290 Z" fill="#BFE0FF"/>
    <circle cx="282" cy="282" r="7" fill="${P.hair}"/>
    <circle cx="252" cy="340" r="17" fill="${P.ink}"/><circle cx="252" cy="340" r="7" fill="#7F92B2"/>
    <circle cx="350" cy="340" r="17" fill="${P.ink}"/><circle cx="350" cy="340" r="7" fill="#7F92B2"/>
  </g>
  <!-- dörtlü flaşör -->
  <circle cx="376" cy="306" r="6" fill="${P.amber}"/>
  <circle cx="376" cy="306" r="16" fill="${P.amber}" opacity="0.25" filter="url(#soft)"/>
  <circle cx="226" cy="310" r="5" fill="${P.amber}"/>
  <circle cx="226" cy="310" r="14" fill="${P.amber}" opacity="0.25" filter="url(#soft)"/>
  </g>
  <!-- duraklama işareti (yazısız) -->
  <g filter="url(#sh)"><circle cx="110" cy="130" r="34" fill="url(#gTeal)"/></g>
  <rect x="96" y="114" width="9" height="32" rx="3" fill="#fff"/><rect x="115" y="114" width="9" height="32" rx="3" fill="#fff"/>
  `);
}

// ───────────────────────── Ek: metro / tren ─────────────────────────
// AFAD: sarsıntı bitene kadar sabit bir askıya veya korkuluğa sıkıca tutunun; gerekmedikçe inmeyin.
function transit() {
  return frame(`
  <!-- vagon içi -->
  <g filter="url(#sh)">
    <rect x="34" y="70" width="332" height="250" rx="34" fill="#22344F"/>
    <rect x="34" y="70" width="332" height="16" rx="8" fill="#2E4468"/>
  </g>
  <rect x="58" y="104" width="90" height="74" rx="14" fill="url(#gSky)"/>
  <rect x="252" y="104" width="90" height="74" rx="14" fill="url(#gSky)"/>
  <path d="M70 160 L100 130 M110 168 L138 140 M264 160 L294 130 M304 168 L332 140" stroke="#3B5A86" stroke-width="5" stroke-linecap="round"/>
  <rect x="34" y="290" width="332" height="30" fill="#1A2A44"/>
  <!-- oturak -->
  <rect x="58" y="236" width="90" height="22" rx="8" fill="url(#gBlue)"/>
  <rect x="252" y="236" width="90" height="22" rx="8" fill="url(#gBlue)"/>
  <!-- dikey tutunma direği -->
  <rect x="226" y="86" width="12" height="206" rx="6" fill="#C9D4E4"/>
  <rect x="226" y="86" width="4" height="206" rx="2" fill="#FFFFFF" opacity="0.6"/>
  <ellipse cx="200" cy="300" rx="56" ry="8" fill="#0A1424" opacity="0.55"/>
  <!-- direğe sıkıca tutunan, dizleri hafif bükük kişi -->
  ${limb([[196, 232], [186, 264], [182, 296]], 'url(#gPants)', 16)}
  ${limb([[204, 232], [216, 264], [214, 296]], P.pantsD, 16)}
  <rect x="180" y="164" width="40" height="76" rx="16" fill="url(#gTeal)"/>
  ${limb([[214, 176], [226, 160], [232, 140]], P.tealD, 12)}
  <circle cx="232" cy="136" r="7.5" fill="${P.skin}"/>
  ${limb([[210, 186], [224, 200], [232, 196]], P.teal, 12)}
  <circle cx="234" cy="196" r="7" fill="${P.skin}"/>
  ${head(200, 144, 16, 1)}
  `);
}

// ───────────────────────── 10. Özel ihtiyaçlar ve evcil hayvanlar ─────────────────────────
function special() {
  return frame(`
  ${ground(330, 160)}
  <!-- tekerlekli sandalye: frenler kilitli -->
  <g filter="url(#sh)">
    <circle cx="140" cy="292" r="40" fill="none" stroke="${P.line}" stroke-width="9"/>
    <circle cx="140" cy="292" r="6" fill="${P.line}"/>
    <path d="M110 230 L 120 286 L 186 286" fill="none" stroke="#8EA3C2" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="196" cy="318" r="12" fill="none" stroke="${P.line}" stroke-width="6"/>
    <path d="M186 286 L 196 318" stroke="#8EA3C2" stroke-width="6" stroke-linecap="round"/>
  </g>
  <!-- kilit simgesi -->
  <g filter="url(#sh)"><circle cx="96" cy="330" r="16" fill="url(#gTeal)"/></g>
  <rect x="89" y="328" width="14" height="11" rx="2" fill="#fff"/><path d="M92 328 v-4 a4 4 0 0 1 8 0 v4" fill="none" stroke="#fff" stroke-width="2.5"/>
  <!-- oturan kişi -->
  ${limb([[150, 272], [186, 272], [190, 312]], 'url(#gPants)', 16)}
  <path d="M120 276 Q 112 220 146 210 Q 168 214 168 246 L 162 278 Z" fill="url(#gBlue)"/>
  ${head(146, 190, 16, 1, '#C9CED6')}
  ${limb([[150, 226], [176, 250], [196, 244]], P.blueD, 11)}
  <circle cx="200" cy="243" r="6" fill="${P.skin}"/>
  <!-- ilaç çantası -->
  <g filter="url(#sh)">
    <rect x="196" y="170" width="66" height="50" rx="10" fill="${P.white}"/>
    <path d="M216 170 v-8 a6 6 0 0 1 6 -6 h14 a6 6 0 0 1 6 6 v8" fill="none" stroke="${P.wallD}" stroke-width="5"/>
    <rect x="224" y="180" width="10" height="30" rx="2" fill="${P.red}"/><rect x="214" y="190" width="30" height="10" rx="2" fill="${P.red}"/>
  </g>
  <!-- evcil hayvan taşıma çantası + kedi -->
  <g filter="url(#sh)">
    <rect x="248" y="240" width="116" height="84" rx="18" fill="url(#gAmber)"/>
    <path d="M276 240 q 30 -34 60 0" fill="none" stroke="${P.amberD}" stroke-width="8" stroke-linecap="round"/>
    <rect x="266" y="254" width="62" height="56" rx="10" fill="#2A3B58"/>
    <path d="M276 260 V304 M290 260 V304 M304 260 V304 M318 260 V304" stroke="#8EA3C2" stroke-width="3"/>
  </g>
  <circle cx="298" cy="286" r="14" fill="#E9A15A"/>
  <path d="M286 278 l2 -14 l8 9 z M310 278 l-2 -14 l-8 9 z" fill="#E9A15A"/>
  <circle cx="293" cy="285" r="2.2" fill="${P.ink}"/><circle cx="303" cy="285" r="2.2" fill="${P.ink}"/>
  `);
}

// ───────────────────────── Ek: kontrol listesi (Küçük adımlarla büyük fark) ─────────────────────────
function checklist() {
  return frame(`
  ${ground(330, 120)}
  <g filter="url(#sh)">
    <rect x="110" y="76" width="180" height="242" rx="18" fill="url(#gWall)"/>
    <rect x="160" y="62" width="80" height="30" rx="10" fill="${P.navy2}"/>
  </g>
  ${[0, 1, 2]
    .map(
      (i) => `
    <circle cx="146" cy="${136 + i * 58}" r="15" fill="url(#gTeal)"/>
    <path d="M139 ${136 + i * 58} l5 5 l10 -10" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="172" y="${128 + i * 58}" width="${i === 1 ? 70 : 92}" height="8" rx="4" fill="#9AABC4"/>
    <rect x="172" y="${142 + i * 58}" width="${i === 2 ? 50 : 64}" height="6" rx="3" fill="#C5D0DE"/>`,
    )
    .join('')}
  <g filter="url(#sh)" transform="rotate(35 300 250)">
    <rect x="290" y="170" width="20" height="120" rx="6" fill="url(#gAmber)"/>
    <path d="M290 290 L300 314 L310 290 Z" fill="${P.skin}"/>
  </g>
  ${sparkle(86, 120, 0.9)}${sparkle(320, 104, 0.7)}
  `);
}

// ───────────────────────── Ana sayfa: "Şu an deprem var mı?" kart dekoru ─────────────────────────
// Yalnızca dekor (sismik dalga + ev). Güvende/uyarı durumu görselde değil, uygulamadaki metin ve
// göstergede verilir; böylece görsel tek başına "güvendesiniz" iddiası taşımaz.
function quakeCard() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="400" height="240">${defs}
  <g opacity="0.55">
    <rect x="236" y="70" width="40" height="120" rx="4" fill="#22385A"/>
    <rect x="282" y="40" width="54" height="150" rx="4" fill="#1E3352"/>
    <rect x="342" y="86" width="44" height="104" rx="4" fill="#22385A"/>
    <path d="M292 60 h10 v10 h-10z M314 60 h10 v10 h-10z M292 84 h10 v10 h-10z M314 108 h10 v10 h-10z M350 104 h10 v10 h-10z" fill="#3B5A86"/>
  </g>
  <!-- sismik dalga -->
  <polyline points="20,96 70,96 82,72 94,124 106,40 120,140 132,78 142,108 152,90 162,100 176,96 200,96" fill="none" stroke="#4DA3FF" stroke-width="12" stroke-linejoin="round" stroke-linecap="round" opacity="0.25" filter="url(#soft)"/>
  <polyline points="20,96 70,96 82,72 94,124 106,40 120,140 132,78 142,108 152,90 162,100 176,96 200,96" fill="none" stroke="#5AB0FF" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
  <!-- ağaçlar -->
  <circle cx="206" cy="176" r="26" fill="#1E5A4E"/><rect x="203" y="190" width="6" height="30" fill="#2B3C5E"/>
  <circle cx="372" cy="170" r="24" fill="#1E5A4E"/><rect x="369" y="182" width="6" height="36" fill="#2B3C5E"/>
  <!-- ev -->
  <ellipse cx="292" cy="226" rx="104" ry="10" fill="#0A1424" opacity="0.5"/>
  <g filter="url(#sh)">
    <rect x="234" y="150" width="118" height="74" rx="6" fill="#E7DCC8"/>
    <path d="M222 156 L293 102 L364 156 Z" fill="#B65A3C"/>
    <rect x="270" y="186" width="24" height="38" rx="3" fill="#5A3A2A"/>
    <rect x="246" y="166" width="20" height="18" rx="3" fill="#FFC966"/>
    <rect x="312" y="166" width="20" height="18" rx="3" fill="#FFC966"/>
    <rect x="320" y="110" width="12" height="24" rx="2" fill="#8E4630"/>
  </g>
</svg>`;
}

// ───────────────────────── Uygulama içi küçük logo ─────────────────────────
function logo() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 132" width="120" height="132">${defs}
  <path d="M60 6 L110 24 V64 Q110 106 60 126 Q10 106 10 64 V24 Z" fill="url(#gRed)"/>
  <path d="M24 70 H44 L52 52 L64 88 L74 62 L80 70 H96" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

/** name → { svg, transparent } */
export const SCENES = {
  'drop-cover-hold': { svg: dropCoverHold(), what: 'Çök-Kapan-Tutun (masa altında, bir el masa ayağında, kol başı/enseyi korur)' },
  'drop-cover-hold-hero': { svg: dropCoverHold({ transparent: true }), transparent: true, what: 'Çök-Kapan-Tutun, saydam (kırmızı kart için)' },
  'home-safety': { svg: homeSafety(), what: 'Deprem öncesi ev güvenliği' },
  kit: { svg: kit(), what: 'Acil durum çantası' },
  'family-plan': { svg: familyPlan(), what: 'Aile iletişim ve buluşma planı' },
  furniture: { svg: furniture(), what: 'Dolap ve ağır eşya sabitleme' },
  'after-quake': { svg: afterQuake(), what: 'Deprem sonrası güvenli hareket' },
  trapped: { svg: trapped(), what: 'Enkaz altında mahsur kalma' },
  outdoor: { svg: outdoor(), what: 'Açık alanda deprem güvenliği' },
  vehicle: { svg: vehicle(), what: 'Araçta doğru davranış' },
  transit: { svg: transit(), what: 'Metro/trende direğe tutunma' },
  'special-needs': { svg: special(), what: 'Özel ihtiyaçlı bireyler ve evcil hayvanlar' },
  checklist: { svg: checklist(), what: 'Hazırlık kontrol listesi' },
  logo: { svg: logo(), transparent: true, size: [120, 132], what: 'Uygulama içi logo' },
  'quake-card': { svg: quakeCard(), transparent: true, size: [400, 240], scale: 2, what: 'Ana sayfa deprem kartı dekoru' },
};
