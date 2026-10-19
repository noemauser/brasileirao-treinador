// Brasileirão v11.0 — emblemas oficiais via Transfermarkt CDN + fallback local
// Unificado: noemauser/brasileirao-treinador
window.LOGO_TM = {
  abc: 7209,
  acg: 15172,
  afo: 21409,
  aim: 29501,
  alt: 62794,
  ame: 2863,
  amz: 87727,
  ana: 17568,
  apa: 25209,
  arn: 1751,
  ath: 64918,
  ava: 2035,
  bah: 10010,
  bar: 52519,
  bot: 537,
  bpb: 17964,
  bpe: 10560,
  brs: 3973,
  bru: 14390,
  bsp: 9030,
  cam: 330,
  cap: 679,
  cas: 28621,
  cax: 9141,
  cea: 2029,
  cfc: 776,
  cha: 17776,
  con: 3280,
  cor: 199,
  cpn: 1753,
  crb: 11449,
  cri: 7178,
  cru: 609,
  csa: 18545,
  cui: 28022,
  des: 22013,
  fer: 15882,
  fig: 4064,
  fla: 614,
  flo: 65477,
  flu: 2462,
  for: 10870,
  gam: 7014,
  goi: 3197,
  gre: 210,
  gtb: 8567,
  gua: 1755,
  hlu: 40196,
  ili: 308,
  int: 6600,
  ita: 8547,
  itu: 4773,
  juv: 10492,
  jvl: 3330,
  lon: 1693,
  mar: 34293,
  mau: 46022,
  mdi: 4759,
  mga: 33003,
  mir: 3876,
  nau: 2646,
  nov: 37474,
  ope: 27214,
  ovg: 32386,
  pal: 1023,
  pay: 6347,
  pon: 1134,
  por: 10247,
  prh: 41872,
  rbb: 8793,
  rbe: 30489,
  rem: 10997,
  ret: 76156,
  riv: 35388,
  sad: 7478,
  sam: 3319,
  san: 221,
  sao: 585,
  sbe: 16439,
  sca: 291,
  scr: 1785,
  sjr: 7535,
  spt: 8718,
  sra: 73574,
  toc: 27242,
  trz: 11086,
  vas: 978,
  vil: 5677,
  vit: 2125,
  vor: 4176,
  xvp: 55335,
  ypi: 16869,
};

// Resolve logo URL: local first, then TM CDN crest
window.logoUrl = function(clubId) {
  const local = 'assets/img/logos/' + clubId + '.png';
  const id = (window.LOGO_TM || {})[clubId];
  if (!id) return local;
  // Prefer local file; browsers load local; CDN as secondary via onerror in UI
  return local;
};

window.logoCdnUrl = function(clubId) {
  const id = (window.LOGO_TM || {})[clubId];
  if (!id) return null;
  return 'https://tmssl.akamaized.net/images/wappen/head/' + id + '.png';
};

// Optional: patch club.logo at runtime if local fails
document.addEventListener("error", function(e) {
  const t = e.target;
  if (!t || t.tagName !== 'IMG') return;
  const src = t.getAttribute('src') || '';
  if (!src.includes('assets/img/logos/')) return;
  if (t.dataset.cdnTried) return;
  const m = src.match(/logos\/([a-z0-9]+)\.png/i);
  if (!m) return;
  const cdn = window.logoCdnUrl && window.logoCdnUrl(m[1]);
  if (cdn) { t.dataset.cdnTried = "1"; t.src = cdn; }
}, true);

