// Brasileirão v10.9 — emblemas oficiais (Transfermarkt CDN) + fallback local
const LOGO_TM = {
  cap: 679,
  cam: 330,
  bah: 10010,
  bot: 537,
  cha: 17776,
  cor: 199,
  cfc: 776,
  cru: 609,
  fla: 614,
  flu: 2462,
  gre: 210,
  int: 6600,
  mir: 3876,
  pal: 1023,
  rbb: 8793,
  rem: 10997,
  san: 221,
  sao: 585,
  vas: 978,
  vit: 2125,
  ame: 2863,
  ath: 64918,
  acg: 15172,
  ava: 2035,
  bsp: 9030,
  crb: 11449,
  cea: 2029,
  cri: 7178,
  cui: 28022,
  for: 10870,
  goi: 3197,
  juv: 10492,
  lon: 1693,
  nov: 37474,
  nau: 2646,
  ope: 27214,
  pon: 1134,
  spt: 8718,
  sbe: 16439,
  vil: 5677,
  amz: 87727,
  ana: 17568,
  bar: 52519,
  bpb: 9030,
  bru: 14390,
  cax: 9141,
  con: 3280,
  fer: 15882,
  fig: 4064,
  flo: 65477,
  gua: 1755,
  ili: 308,
  ita: 8547,
  itu: 4773,
  mar: 34293,
  mga: 33003,
  pay: 6347,
  scr: 1785,
  vor: 4176,
  ypi: 16869,
  abc: 7209,
  alt: 62794,
  apa: 25209,
  arn: 1751,
  bpe: 11449,
  brs: 3973,
  cas: 28621,
  csa: 18545,
  gam: 978,
  gtb: 8567,
  jvl: 3330,
  mau: 46022,
  mdi: 4759,
  ovg: 32386,
  por: 10247,
  prh: 41872,
  rbe: 30489,
  ret: 76156,
  riv: 64925,
  sam: 3319,
  sca: 585,
  sjr: 7535,
  sra: 73574,
  toc: 27242,
  trz: 11086,
  xvp: 55335
};
function logoUrl(club) {
  if (!club) return "";
  const id = typeof club === "string" ? club : (club.id || "");
  const tm = (typeof club === "object" && club.tmId) || LOGO_TM[id];
  if (tm) return "https://img.a.transfermarkt.technology/wappen/big/" + tm + ".png?lm=1";
  if (typeof club === "object" && club.logo && String(club.logo).indexOf("http") === 0) return club.logo;
  return (typeof club === "object" && club.logo) || ("assets/img/logos/" + id + ".png");
}
function faceUrl(p) {
  if (!p) return "";
  if (p.portraitUrl) return p.portraitUrl;
  if (p.face && String(p.face).indexOf("http") === 0) return p.face;
  return p.face || "";
}
function clubLogoSrc(club) { return logoUrl(club); }

// Aplica emblemas oficiais em CLUBS_DATA antes do game.js iniciar
(function () {
  function patchClub(c) {
    if (!c || !c.id) return;
    const tm = c.tmId || LOGO_TM[c.id];
    if (tm) {
      c.tmId = tm;
      c.logo = "https://img.a.transfermarkt.technology/wappen/big/" + tm + ".png?lm=1";
    } else if (c.logo && c.logo.indexOf("http") !== 0) {
      c.logo = "assets/img/logos/" + c.id + ".png";
    }
  }
  function patchAll() {
    try {
      if (typeof CLUBS_DATA !== "undefined" && CLUBS_DATA && Array.isArray(CLUBS_DATA.clubs)) {
        CLUBS_DATA.clubs.forEach(patchClub);
        CLUBS_DATA.version = 10.9;
      }
    } catch (e) { console.warn("logo-tm patch", e); }
  }
  patchAll();
  document.addEventListener("error", function (ev) {
    const t = ev.target;
    if (!t || t.tagName !== "IMG") return;
    if (t.dataset.logoFallback) return;
    const src = t.getAttribute("src") || "";
    if (src.indexOf("/logos/") !== -1) {
      const m = src.match(/\/logos\/([a-z0-9]+)\./i);
      if (m && LOGO_TM[m[1]]) {
        t.dataset.logoFallback = "1";
        t.src = "https://img.a.transfermarkt.technology/wappen/big/" + LOGO_TM[m[1]] + ".png?lm=1";
      }
    }
  }, true);
})();
