/* Brasileirão v10.7 — Fase 4 torcida · notícias · lesões · canvas */
(() => {
"use strict";
const SAVE_KEY = "brasileirao_coach_v10";
const SAVE_KEY_V9 = "brasileirao_coach_v9";
const SAVE_KEY_OLD = "brasileirao_coach_v8";
const VERSION = "10.7";

const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const rnd = (a=0,b=1) => a + Math.random()*(b-a);
const ri = (a,b) => a + Math.floor(Math.random()*(b-a+1));
const pick = a => a[Math.floor(Math.random()*a.length)];
const fmtBRL = n => "R$ " + Math.round(n).toLocaleString("pt-BR");
const fmtM = n => {
  n = Math.round(n||0);
  if (n >= 1e6) return "R$ " + (n/1e6).toFixed(n>=1e7?0:1).replace(".",",") + " mi";
  if (n >= 1e3) return "R$ " + Math.round(n/1e3) + " mil";
  return fmtBRL(n);
};
const toast = (msg, ms=2200) => {
  const t = $("#toast");
  if (!t) { try { console.log("[toast]", msg); } catch(e) {} return; }
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(()=>t.classList.remove("show"), ms);
};
const POS_LABEL = {G:"GOL",Z:"ZAG",LD:"LD",LE:"LE",V:"VOL",M:"MEI",A:"ATA"};
const posLabel = p => POS_LABEL[p] || p || "?";

const DIFF = {
  easy:   { id:"easy",   label:"Amador",       aiXg:0.82, humanXg:1.12, money:1.15 },
  normal: { id:"normal", label:"Profissional", aiXg:1.00, humanXg:1.00, money:1.00 },
  hard:   { id:"hard",   label:"Série A",      aiXg:1.12, humanXg:0.92, money:0.90 },
  elite:  { id:"elite",  label:"Elite",        aiXg:1.22, humanXg:0.85, money:0.80 }
};
function diffCfg() {
  const id = (S && S.difficulty) || (ui && ui.difficulty) || "normal";
  return DIFF[id] || DIFF.normal;
}
function maxWeeksForSerie(serie) {
  return serie === "D" ? 31 : 38;
}
function ensureSquadBalance(club) {
  const squad = club.squad || [];
  if (!squad.length) return;
  const cnt = pos => squad.filter(p => p.pos === pos).length;
  const take = (fromList, to, need, preferLow) => {
    while (cnt(to) < need) {
      let pool = squad.filter(p => fromList.includes(p.pos));
      if (!pool.length) pool = squad.filter(p => p.pos !== to);
      if (!pool.length) break;
      pool.sort((a,b) => preferLow ? (a.ovr-b.ovr) : (b.ovr-a.ovr));
      pool[0].pos = to;
    }
  };
  take(["M","V","Z","LD","LE","A"], "G", 2, true);
  take(["M","V","LD","LE"], "A", 3, false);
  take(["LD","LE","V","M"], "Z", 2, true);
  take(["Z","LE","V"], "LD", 1, true);
  take(["Z","LD","V"], "LE", 1, true);
  take(["M","A"], "V", 1, false);
  take(["V","A"], "M", 1, false);
}


// ---------- Fase 3: valor, mercado, objetivos ----------
const BR_FIRST = ["João","Pedro","Lucas","Gabriel","Matheus","Rafael","Bruno","Felipe","Gustavo","Diego","Caio","Thiago","André","Vitor","Leonardo","Rodrigo","Marcos","Paulo","Carlos","Ricardo","Samuel","Igor","Murilo","Arthur","Enzo","Nicolas","Kaique","Ruan","Yan","Luan","Davi","Otávio","Renan","Wesley","Everton","Douglas","Jeferson","Wellington","Cristiano","Allan"];
const BR_LAST = ["Silva","Santos","Oliveira","Souza","Lima","Ferreira","Alves","Pereira","Gomes","Costa","Ribeiro","Martins","Carvalho","Rocha","Barbosa","Dias","Nunes","Moraes","Cardoso","Teixeira","Mendes","Araujo","Castro","Pinto","Moreira","Nascimento","Correia","Vieira","Campos","Batista"];
const POS_ALL = ["G","Z","LD","LE","V","M","A"];

function valueFromPlayer(p, serie) {
  const ovr = p.ovr || 50, age = p.age || 25;
  let base = Math.pow(Math.max(ovr - 38, 1), 2.35) * 9000;
  base *= ({A:9, B:2.6, C:1.15, D:0.38}[serie] || 1);
  if (age <= 20) base *= 1.22;
  else if (age <= 23) base *= 1.1;
  else if (age >= 34) base *= 0.55;
  else if (age >= 31) base *= 0.72;
  else if (age >= 28) base *= 0.9;
  if (p.pos === "A") base *= 1.18;
  else if (p.pos === "G") base *= 0.72;
  else if (p.pos === "M") base *= 1.05;
  return Math.max(25000, Math.round(base / 1000) * 1000);
}
function wageFromPlayer(p, serie) {
  const ovr = p.ovr || 50;
  let base = Math.pow(Math.max(ovr - 40, 1), 1.8) * 180;
  base *= ({A:8, B:2.2, C:1, D:0.45}[serie] || 1);
  return Math.max(800, Math.round(base / 100) * 100);
}
function squadWageMonthly(club) {
  return (club.squad || []).reduce((s, p) => s + (p.wage || 0), 0);
}
function refreshPlayerEconomy(club) {
  const serie = club.serie || "D";
  (club.squad || []).forEach(p => {
    if (!p.value || p.value < 1000) p.value = valueFromPlayer(p, serie);
    if (!p.wage || p.wage < 100) p.wage = wageFromPlayer(p, serie);
  });
}
function makeFreeAgent(serieHint) {
  const serie = serieHint || "D";
  const pos = pick(POS_ALL);
  const baseOvr = serie === "A" ? ri(62, 74) : serie === "B" ? ri(56, 66) : serie === "C" ? ri(48, 60) : ri(42, 54);
  const age = ri(18, 34);
  let ovr = baseOvr + (age <= 21 ? ri(0, 2) : age >= 32 ? ri(-3, 0) : 0);
  ovr = clamp(ovr, 40, 80);
  const name = pick(BR_FIRST) + " " + pick(BR_LAST);
  const p = {
    id: "fa_" + ri(100000, 999999),
    name, pos, ovr, age,
    value: 0, wage: 0,
    energy: 100, form: ri(4, 7), goals: 0, apps: 0,
    face: "", faceReal: false, tmId: null, num: ri(1, 99), inj: 0,
    freeAgent: true
  };
  p.value = valueFromPlayer(p, serie);
  p.wage = wageFromPlayer(p, serie);
  return p;
}
function ensureFreeAgents(force) {
  if (!S) return;
  const me = meClub && S.clubId ? meClub() : null;
  const serie = me ? me.serie : "D";
  if (force || !S.freeAgents || S.freeAgents.length < 8) {
    S.freeAgents = [];
    for (let i = 0; i < 16; i++) S.freeAgents.push(makeFreeAgent(serie));
    if (serie !== "A") {
      S.freeAgents.push(makeFreeAgent(serie === "D" ? "C" : serie === "C" ? "B" : "A"));
      S.freeAgents.push(makeFreeAgent(serie));
    }
  }
}
function objectiveDefs(serie) {
  if (serie === "D") return [
    { id: "promote", label: "Acesso à Série C (top 6)", type: "max_pos", target: 6, money: 0.9, rep: 6 },
    { id: "top10", label: "Ficar no top 10", type: "max_pos", target: 10, money: 0.45, rep: 3 },
    { id: "pts28", label: "Somar 28+ pontos", type: "min_pts", target: 28, money: 0.35, rep: 2 },
    { id: "wins8", label: "Vencer 8+ jogos", type: "min_wins", target: 8, money: 0.3, rep: 2 }
  ];
  if (serie === "C") return [
    { id: "promote", label: "Acesso à Série B (top 4)", type: "max_pos", target: 4, money: 1.0, rep: 7 },
    { id: "top8", label: "Top 8 da Série C", type: "max_pos", target: 8, money: 0.5, rep: 3 },
    { id: "avoid", label: "Evitar rebaixamento (não ser 19º/20º)", type: "avoid_rel", target: 2, money: 0.25, rep: 2 },
    { id: "pts48", label: "Somar 48+ pontos", type: "min_pts", target: 48, money: 0.4, rep: 2 }
  ];
  if (serie === "B") return [
    { id: "promote", label: "Acesso à Série A (top 4)", type: "max_pos", target: 4, money: 1.2, rep: 8 },
    { id: "top10", label: "Ficar no top 10", type: "max_pos", target: 10, money: 0.5, rep: 3 },
    { id: "avoid", label: "Evitar rebaixamento", type: "avoid_rel", target: 4, money: 0.3, rep: 2 },
    { id: "pts52", label: "Somar 52+ pontos", type: "min_pts", target: 52, money: 0.4, rep: 2 }
  ];
  return [
    { id: "title", label: "Campeão brasileiro", type: "max_pos", target: 1, money: 1.5, rep: 10 },
    { id: "g4", label: "G4 (Libertadores)", type: "max_pos", target: 4, money: 1.0, rep: 6 },
    { id: "g6", label: "G6 (sul-americana)", type: "max_pos", target: 6, money: 0.6, rep: 4 },
    { id: "avoid", label: "Evitar rebaixamento", type: "avoid_rel", target: 4, money: 0.35, rep: 2 }
  ];
}
function assignBoardObjectives(club) {
  if (!club || !S) return;
  const defs = objectiveDefs(club.serie);
  const rep = club.rep || 50;
  const ovr = club.ovr || 50;
  let primary;
  if (club.serie === "D") primary = rep >= 55 || ovr >= 51 ? defs.find(d => d.id === "promote") : defs.find(d => d.id === "top10");
  else if (club.serie === "C") primary = rep >= 62 || ovr >= 58 ? defs.find(d => d.id === "promote") : defs.find(d => d.id === "top8");
  else if (club.serie === "B") primary = rep >= 78 || ovr >= 66 ? defs.find(d => d.id === "promote") : defs.find(d => d.id === "top10");
  else primary = rep >= 90 || ovr >= 76 ? defs.find(d => d.id === "title") : defs.find(d => d.id === "g6");
  const secondary = defs.find(d => d.id === "avoid") || defs.find(d => d.type === "min_pts") || defs[defs.length - 1];
  const pickSec = secondary && primary && secondary.id !== primary.id ? secondary : (defs.find(d => !primary || d.id !== primary.id) || defs[0]);
  S.objectives = [primary, pickSec].filter(Boolean).map(d => ({
    id: d.id, label: d.label, type: d.type, target: d.target,
    money: d.money, rep: d.rep, status: "active"
  }));
  S.seasonWins = 0;
  S.inbox = S.inbox || [];
  S.inbox.unshift({
    t: S.week || 0,
    title: "Metas da diretoria · " + (S.year || ""),
    body: S.objectives.map(o => "• " + o.label).join(" ")
  });
}
function objectiveProgress(obj, me, pos, row, n) {
  const pts = (row && row.pts) || 0;
  const wins = (S && S.seasonWins) || 0;
  if (obj.type === "max_pos") {
    const ok = pos > 0 && pos <= obj.target;
    return { ok, text: pos ? (pos + "º / meta ≤" + obj.target + "º") : "—", pct: pos ? clamp(100 * (obj.target / Math.max(pos, 1)), 0, 100) : 0 };
  }
  if (obj.type === "min_pts") {
    return { ok: pts >= obj.target, text: pts + " / " + obj.target + " pts", pct: clamp(100 * pts / obj.target, 0, 100) };
  }
  if (obj.type === "min_wins") {
    return { ok: wins >= obj.target, text: wins + " / " + obj.target + " vitórias", pct: clamp(100 * wins / obj.target, 0, 100) };
  }
  if (obj.type === "avoid_rel") {
    const danger = n - (obj.target || 4) + 1;
    const ok = pos > 0 && pos < danger;
    return { ok, text: pos ? (pos + "º · zona a partir do " + danger + "º") : "—", pct: ok ? 70 : 25 };
  }
  return { ok: false, text: "—", pct: 0 };
}
function evaluateObjectives(pos, n, wasSerie) {
  const row = tableRow(S.clubId) || { pts: 0, v: 0 };
  const prize = (SERIE_RULES[wasSerie] || SERIE_RULES.D).prize;
  let msg = [];
  let moneyGain = 0;
  let repGain = 0;
  (S.objectives || []).forEach(obj => {
    const pr = objectiveProgress(obj, null, pos, row, n);
    if (pr.ok) {
      const bonus = Math.round(prize * (obj.money || 0.3));
      moneyGain += bonus;
      repGain += (obj.rep || 2);
      obj.status = "done";
      msg.push("✓ " + obj.label + " (+" + fmtM(bonus) + ")");
    } else {
      obj.status = "fail";
      const hit = Math.max(1, Math.round((obj.rep || 2) * 0.5));
      repGain -= hit;
      msg.push("✗ " + obj.label + " (−" + hit + " rep)");
    }
  });
  S.money += moneyGain;
  S.reputation = clamp((S.reputation || 30) + repGain, 0, 100);
  if (msg.length) {
    S.inbox.unshift({ t: S.week, title: "Balanço da diretoria", body: msg.join(" · ") });
  }
  return { moneyGain, repGain, msg };
}
function transferAskPrice(p, seller) {
  let v = p.value || valueFromPlayer(p, (seller && seller.serie) || "D");
  const form = (p.form || 5) / 5;
  v *= (0.85 + form * 0.2);
  if ((p.age || 25) <= 22) v *= 1.12;
  if ((p.age || 25) >= 32) v *= 0.8;
  return Math.round(v / 1000) * 1000;
}
function negotiateBuy(seller, p, offer) {
  const ask = transferAskPrice(p, seller);
  const ratio = offer / Math.max(ask, 1);
  let chance = 0.05;
  if (ratio >= 1.15) chance = 0.95;
  else if (ratio >= 1.0) chance = 0.8;
  else if (ratio >= 0.9) chance = 0.55;
  else if (ratio >= 0.8) chance = 0.28;
  else if (ratio >= 0.7) chance = 0.12;
  if ((seller.rep || 50) > 80) chance *= 0.75;
  try {
    if (seller.serie === "A" && meClub() && meClub().serie !== "A") chance *= 0.7;
  } catch (e) {}
  if ((seller.xi || []).includes(p.id) && p.ovr >= 65) chance *= 0.6;
  return { ask, chance: clamp(chance, 0.02, 0.98), ok: Math.random() < chance };
}
function filterMarketTargets(me) {
  const f = ui.market || { pos: "ALL", serie: "ALL", sort: "ovr", q: "" };
  const q = (f.q || "").trim().toLowerCase();
  const targets = [];
  S.clubs.forEach(c => {
    if (c.id === me.id) return;
    if (f.serie !== "ALL" && c.serie !== f.serie) return;
    const ranked = c.squad.slice().sort((a, b) => b.ovr - a.ovr);
    const protectedIds = new Set(ranked.slice(0, 3).map(p => p.id));
    c.squad.forEach(p => {
      if (protectedIds.has(p.id) && (c.serie === "A" || c.serie === "B")) return;
      const bandLo = (me.ovr || 50) - 12;
      const bandHi = (me.ovr || 50) + 10;
      if (p.ovr < bandLo - 5 || p.ovr > bandHi + 8) return;
      if (f.pos !== "ALL" && p.pos !== f.pos) return;
      if (q && !p.name.toLowerCase().includes(q) && !(c.short || "").toLowerCase().includes(q)) return;
      targets.push({ kind: "club", c, p, ask: transferAskPrice(p, c) });
    });
  });
  ensureFreeAgents(false);
  (S.freeAgents || []).forEach(p => {
    if (f.pos !== "ALL" && p.pos !== f.pos) return;
    if (q && !p.name.toLowerCase().includes(q)) return;
    targets.push({ kind: "fa", c: { id: "fa", short: "Livre", name: "Agente livre", serie: "—", logo: me.logo }, p, ask: Math.round((p.value || 0) * 0.35) });
  });
  const sort = f.sort || "ovr";
  if (sort === "value") targets.sort((a, b) => a.ask - b.ask);
  else if (sort === "age") targets.sort((a, b) => a.p.age - b.p.age);
  else targets.sort((a, b) => b.p.ovr - a.p.ovr);
  return targets;
}


// ---------- Fase 4: torcida, notícias, lesões ----------
const INJ_TYPES = [
  { id: "contusao", label: "contusão muscular", weeks: [1, 2] },
  { id: "torcao", label: "torção leve", weeks: [1, 3] },
  { id: "estouro", label: "estouro muscular", weeks: [2, 4] },
  { id: "corte", label: "corte / trauma", weeks: [1, 2] },
  { id: "cansaco", label: "sobrecarga", weeks: [1, 1] }
];
function isInjured(p) { return !!(p && (p.inj || 0) > 0); }
function pushNews(title, body, kind) {
  if (!S) return;
  S.inbox = S.inbox || [];
  S.inbox.unshift({ t: S.week || 0, title, body, kind: kind || "info", year: S.year });
  if (S.inbox.length > 24) S.inbox.length = 24;
}
function moraleLabel(m) {
  m = m == null ? 50 : m;
  if (m >= 85) return "Êxtase";
  if (m >= 70) return "Quente";
  if (m >= 55) return "Animada";
  if (m >= 40) return "Fria";
  if (m >= 25) return "Inquieta";
  return "Em revolta";
}
function moraleColor(m) {
  m = m == null ? 50 : m;
  if (m >= 70) return "var(--acc2)";
  if (m >= 45) return "var(--gold)";
  return "#ff8a8a";
}
function adjustMorale(delta, reason) {
  if (!S) return;
  const prev = S.morale == null ? 55 : S.morale;
  S.morale = Math.round(clamp(prev + delta, 0, 100));
  if (reason && Math.abs(delta) >= 4) {
    pushNews("Torcida: " + moraleLabel(S.morale), reason + " · Moral " + prev + " → " + S.morale, "torcida");
  }
}
function applyMatchMorale(M) {
  if (!S || !S.clubId || !M) return;
  const meId = S.clubId;
  const isHome = M.home.id === meId;
  const isAway = M.away.id === meId;
  if (!isHome && !isAway) return;
  const gh = isHome ? M.gh : M.ga;
  const ga = isHome ? M.ga : M.gh;
  const opp = isHome ? M.away : M.home;
  let d = 0;
  let reason = "";
  if (gh > ga) {
    d = 6 + Math.min(4, gh - ga) + (isHome ? 1 : 2);
    reason = "Vitória " + gh + "x" + ga + " contra " + opp.short;
    if (gh - ga >= 3) { d += 3; reason += " (goleada!)"; }
  } else if (gh === ga) {
    d = isHome ? 0 : 2;
    reason = "Empate " + gh + "x" + ga + " vs " + opp.short;
  } else {
    d = -5 - Math.min(4, ga - gh) - (isHome ? 2 : 0);
    reason = "Derrota " + gh + "x" + ga + " para " + opp.short;
  }
  // form streak
  const recent = (S.results || []).filter(r => r.home === meId || r.away === meId).slice(-4);
  let wins = 0, losses = 0;
  recent.forEach(r => {
    const mg = r.home === meId ? r.gh : r.ga;
    const og = r.home === meId ? r.ga : r.gh;
    if (mg > og) wins++; else if (mg < og) losses++;
  });
  if (wins >= 3 && gh > ga) { d += 2; reason += " · sequência vitoriosa"; }
  if (losses >= 3 && gh < ga) { d -= 2; reason += " · crise na torcida"; }
  adjustMorale(d, reason);
  pushNews(
    gh > ga ? "Vitória!" : gh === ga ? "Empate" : "Derrota",
    meClub().short + " " + gh + "x" + ga + " " + opp.short + " · Rodada " + S.week,
    "jogo"
  );
}
function rollMatchInjuries(M) {
  if (!M) return [];
  const out = [];
  const sides = [
    { club: M.home, xi: M.hXI, ment: M.hMent },
    { club: M.away, xi: M.aXI, ment: M.aMent }
  ];
  sides.forEach(({ club, xi, ment }) => {
    (xi || []).forEach(id => {
      const p = playerById(club, id);
      if (!p || isInjured(p)) return;
      const en = p.energy || 100;
      const age = p.age || 25;
      let chance = 0.028;
      if (en < 45) chance += 0.04;
      else if (en < 60) chance += 0.02;
      if (age >= 33) chance += 0.025;
      else if (age >= 30) chance += 0.012;
      if (ment === "ultra") chance += 0.02;
      if (ment === "attacking") chance += 0.008;
      // human games slightly more narrative injuries
      if (S && (club.id === S.clubId)) chance += 0.01;
      if (Math.random() > chance) return;
      const t = pick(INJ_TYPES);
      const weeks = ri(t.weeks[0], t.weeks[1]);
      p.inj = weeks;
      p.energy = Math.min(p.energy || 100, 55);
      p.form = Math.max(1, (p.form || 5) - 1);
      out.push({ club, p, weeks, label: t.label });
      if (S && club.id === S.clubId) {
        pushNews(
          "Lesão: " + p.name,
          p.name + " sofreu " + t.label + " · fora por " + weeks + " rodada(s).",
          "lesao"
        );
      }
    });
  });
  return out;
}
function healInjuriesWeek() {
  if (!S) return;
  S.clubs.forEach(c => {
    (c.squad || []).forEach(p => {
      if ((p.inj || 0) > 0) {
        p.inj = Math.max(0, (p.inj || 0) - 1);
        if (p.inj === 0 && c.id === S.clubId) {
          pushNews("Alta médica", p.name + " está liberado para jogar.", "lesao");
          p.energy = Math.max(p.energy || 50, 70);
        }
      }
    });
  });
}
function weeklyAtmosphereNews() {
  if (!S) return;
  const me = meClub();
  if (!me) return;
  // random flavor ~35% weeks
  if (Math.random() > 0.35) return;
  const pos = (() => {
    const tab = sortTable(myTable());
    return tab.findIndex(r => r.id === S.clubId) + 1;
  })();
  const templates = [
    () => ({ t: "Bastidores", b: "Diretoria monitora a campanha. Posição atual: " + pos + "º na Série " + me.serie + ".", k: "bastidor" }),
    () => ({ t: "Imprensa", b: "Colunistas discutem o trabalho de " + (S.manager || "técnico") + " no " + me.short + ".", k: "imprensa" }),
    () => ({ t: "Torcida organizada", b: "Faixa na geral: \"Moral " + moraleLabel(S.morale) + " (" + (S.morale || 50) + ")\".", k: "torcida" }),
    () => ({ t: "Departamento médico", b: (me.squad.filter(isInjured).length ? (me.squad.filter(isInjured).length + " jogador(es) em recuperação.") : "Nenhuma lesão grave no elenco."), k: "lesao" }),
    () => ({ t: "Mercado", b: S.transferWindow ? "Janela aberta — olheiros ativos." : "Janela fechada. Foco em resultados.", k: "mercado" }),
    () => ({ t: me.stadium || "Estádio", b: "Expectativa de público: " + (S.morale >= 65 ? "alta" : S.morale >= 40 ? "média" : "baixa") + " para o próximo mando.", k: "torcida" })
  ];
  const n = pick(templates)();
  pushNews(n.t, n.b, n.k);
}
function moraleHomeBoost() {
  // 0.96 .. 1.08 based on morale
  const m = (S && S.morale != null) ? S.morale : 55;
  return clamp(0.96 + (m - 50) * 0.0024, 0.92, 1.10);
}
function newsIcon(kind) {
  return ({ jogo: "⚽", torcida: "📣", lesao: "🏥", mercado: "💰", bastidor: "📋", imprensa: "📰", info: "✉" }[kind] || "✉");
}

const deep = o => JSON.parse(JSON.stringify(o));

// ---------- formations (y=1 defend bottom for home) ----------
const FORM_POS = {
  "4-3-3":[[0.5,0.92],[0.12,0.72],[0.36,0.74],[0.64,0.74],[0.88,0.72],[0.28,0.48],[0.5,0.52],[0.72,0.48],[0.18,0.22],[0.5,0.16],[0.82,0.22]],
  "4-4-2":[[0.5,0.92],[0.12,0.72],[0.36,0.74],[0.64,0.74],[0.88,0.72],[0.18,0.48],[0.38,0.50],[0.62,0.50],[0.82,0.48],[0.38,0.18],[0.62,0.18]],
  "4-2-3-1":[[0.5,0.92],[0.12,0.72],[0.36,0.74],[0.64,0.74],[0.88,0.72],[0.35,0.55],[0.65,0.55],[0.18,0.32],[0.5,0.30],[0.82,0.32],[0.5,0.12]],
  "3-5-2":[[0.5,0.92],[0.28,0.74],[0.5,0.76],[0.72,0.74],[0.10,0.48],[0.32,0.50],[0.5,0.46],[0.68,0.50],[0.90,0.48],[0.38,0.16],[0.62,0.16]],
  "5-3-2":[[0.5,0.92],[0.08,0.68],[0.28,0.74],[0.5,0.76],[0.72,0.74],[0.92,0.68],[0.30,0.48],[0.5,0.50],[0.70,0.48],[0.38,0.16],[0.62,0.16]],
  "4-1-4-1":[[0.5,0.92],[0.12,0.72],[0.36,0.74],[0.64,0.74],[0.88,0.72],[0.5,0.58],[0.16,0.36],[0.36,0.34],[0.64,0.34],[0.84,0.36],[0.5,0.12]],
  "3-4-3":[[0.5,0.92],[0.28,0.74],[0.5,0.76],[0.72,0.74],[0.14,0.48],[0.38,0.50],[0.62,0.50],[0.86,0.48],[0.20,0.18],[0.5,0.14],[0.80,0.18]]
};

const MENTALITY = {
  defensive: {label:"Retranca", atk:0.78, def:1.22, tempo:0.85, press:0.7},
  normal:    {label:"Equilibrado", atk:1.0, def:1.0, tempo:1.0, press:1.0},
  attacking: {label:"Ofensivo", atk:1.22, def:0.82, tempo:1.15, press:1.2},
  ultra:     {label:"Tudo ou nada", atk:1.38, def:0.68, tempo:1.28, press:1.35}
};

const CMD = {
  press:   {label:"Pressão alta", dur:6, atk:1.10, def:0.94, poss:2.5, energy:3, cd:8},
  hold:    {label:"Linha baixa", dur:7, atk:0.88, def:1.14, poss:-1.5, energy:2, cd:8},
  counter: {label:"Contra-ataque", dur:5, atk:1.20, def:0.92, poss:-2, energy:3, cd:9},
  shoot:   {label:"Finalizar", dur:1, atk:1.0, def:1.0, poss:0, energy:2, cd:12}
};


// ---------- league rules (CBF-inspired, playable) ----------
const SERIE_ORDER = ["A","B","C","D"];
const SERIE_RULES = {
  A: { promote:0, relegate:4, promoteTo:null, relegateTo:"B", prize:2.5e6, label:"Série A" },
  B: { promote:4, relegate:4, promoteTo:"A", relegateTo:"C", prize:1.0e6, label:"Série B" },
  C: { promote:4, relegate:2, promoteTo:"B", relegateTo:"D", prize:4e5,  label:"Série C" },
  D: { promote:6, relegate:0, promoteTo:"C", relegateTo:null, prize:1.5e5, label:"Série D" }
};
const SERIE_RANK = { A:4, B:3, C:2, D:1 };
const emptyRow = id => ({id, pj:0, v:0, e:0, d:0, gp:0, gc:0, pts:0});
function tableFor(serie) {
  if (!S) return [];
  if (serie==="A") return S.tableA || [];
  if (serie==="B") return S.tableB || [];
  if (serie==="C") return S.tableC || [];
  if (serie==="D") return S.tableD || [];
  return [];
}
function buildTables(clubs) {
  return {
    tableA: clubs.filter(c=>c.serie==="A").map(c=>emptyRow(c.id)),
    tableB: clubs.filter(c=>c.serie==="B").map(c=>emptyRow(c.id)),
    tableC: clubs.filter(c=>c.serie==="C").map(c=>emptyRow(c.id)),
    tableD: clubs.filter(c=>c.serie==="D").map(c=>emptyRow(c.id))
  };
}
function sortTable(tab) {
  return tab.slice().sort((a,b)=> b.pts-a.pts || (b.gp-b.gc)-(a.gp-a.gc) || b.gp-a.gp);
}
function zoneClass(serie, i, n) {
  const r = SERIE_RULES[serie] || SERIE_RULES.A;
  if (r.promote && i < r.promote) return "up";
  if (r.relegate && i >= n - r.relegate) return "dn";
  if (serie==="A" && i < 4) return "up";
  return "";
}
function zoneLegend(serie) {
  const r = SERIE_RULES[serie] || {};
  const bits = [];
  if (r.promote) bits.push("Top " + r.promote + " · acesso → Série " + r.promoteTo);
  if (r.relegate) bits.push("Últimos " + r.relegate + " · rebaixamento → Série " + r.relegateTo);
  if (serie==="A") bits.push("Top 4 · G4");
  if (serie==="D") bits.push("Sem rebaixamento (recorte 32 clubes)");
  return bits.join(" · ") || "Classificação";
}
function managerRepGain(serie, pos, n) {
  const rank = SERIE_RANK[serie] || 1;
  const posScore = Math.max(0, (n - pos + 1) / n);
  let gain = Math.round(6 + posScore * 18 + rank * 2);
  if (pos <= (SERIE_RULES[serie] && SERIE_RULES[serie].promote || 0)) gain += 12;
  if (SERIE_RULES[serie] && SERIE_RULES[serie].relegate && pos > n - SERIE_RULES[serie].relegate) gain -= 8;
  return gain;
}
function minRepForSerie(serie) {
  return ({ D:0, C:25, B:48, A:72 })[serie] || 0;
}

let DATA = null;
let S = null;
let match = null;
let ui = { screen:"menu", tab:"home", selPlayer:null, pickClub:null, tSelIdx:null, difficulty:"normal", market:{pos:"ALL", serie:"ALL", sort:"ovr", q:""} };

const clubByIdState = id => S.clubs.find(c => c.id === id);
const playerById = (club, pid) => club.squad.find(p => p.id === pid);
const meClub = () => S.clubs.find(c => c.id === S.clubId);
const myTable = () => tableFor(meClub().serie);
const tableRow = id => S.tableA.find(r=>r.id===id) || S.tableB.find(r=>r.id===id) || (S.tableC||[]).find(r=>r.id===id) || (S.tableD||[]).find(r=>r.id===id);

function squadOVR(club, ids) {
  const list = (ids || club.xi).map(id => playerById(club, id)).filter(Boolean);
  if (!list.length) return 60;
  return Math.round(list.reduce((s,p)=>s+p.ovr,0)/list.length);
}

function sectorPower(club, formation, xi, mentality="normal") {
  const form = formation || club.formation || "4-3-3";
  const coords = FORM_POS[form] || FORM_POS["4-3-3"];
  const ids = xi || club.xi;
  let defB=0, midB=0, atkB=0, defS=0, midS=0, atkS=0;
  ids.forEach((id,i) => {
    const p = playerById(club, id); if (!p) return;
    const y = (coords[i] || [0.5,0.5])[1];
    const enBase = 0.65 + 0.35 * ((p.energy || 100) / 100);
    const en = isInjured(p) ? enBase * 0.35 : enBase;
    const formN = 0.92 + 0.02 * ((p.form || 5));
    let fit = 1;
    if (y >= 0.62) {
      defB++;
      if (p.pos==="G") fit=1.18; else if (p.pos==="Z"||p.pos==="LD"||p.pos==="LE") fit=1.12; else if (p.pos==="V") fit=1.0; else fit=0.82;
      defS += p.ovr * fit * en * formN;
    } else if (y >= 0.34) {
      midB++;
      if (p.pos==="V"||p.pos==="M") fit=1.12; else if (p.pos==="A") fit=0.95; else fit=0.88;
      midS += p.ovr * fit * en * formN;
    } else {
      atkB++;
      if (p.pos==="A") fit=1.14; else if (p.pos==="M") fit=1.06; else fit=0.86;
      atkS += p.ovr * fit * en * formN;
    }
  });
  const m = MENTALITY[mentality] || MENTALITY.normal;
  // density: bodies in sector matter a lot (formation impact)
  const dens = b => 0.78 + 0.07 * b; // 2→0.92, 3→0.99, 4→1.06, 5→1.13
  const def = Math.round((defS / Math.max(1,defB)) * dens(defB) * m.def);
  const mid = Math.round((midS / Math.max(1,midB)) * dens(midB));
  const atk = Math.round((atkS / Math.max(1,atkB)) * dens(atkB) * m.atk);
  return {def, mid, atk, bodies:{def:defB, mid:midB, atk:atkB}};
}

function humanSectors(M) {
  if (!M) return {H:null,A:null,mine:null,opp:null};
  const mine = M.humanSide === "home" ? M.H : M.A;
  const opp  = M.humanSide === "home" ? M.A : M.H;
  return {mine, opp};
}

// ---------- career ----------
function newCareer(clubId, managerName) {
  const clubs = deep(DATA.clubs);
  clubs.forEach(c => {
    ensureSquadBalance(c);
    rebalanceXI(c);
    c.mentality = c.mentality || "normal";
    c.formation = c.formation || "4-3-3";
  });
  const me = clubs.find(c => c.id === clubId);
  if (!me) { toast("Clube inválido"); return; }
  if (me.serie === "A" || me.serie === "B") {
    toast("Carreira começa na Série C ou D. Suba com resultados e propostas.");
    return;
  }
  const tables = buildTables(clubs);
  const startRep = Math.min(me.rep || 40, me.serie === "D" ? 22 : 35);
  const dcfg = DIFF[ui.difficulty] || DIFF.normal;
  const weeks = maxWeeksForSerie(me.serie);
  S = {
    version: VERSION,
    manager: managerName || "Técnico",
    clubId,
    week: 1,
    maxWeeks: weeks,
    year: DATA.season_year || 2026,
    money: Math.round((me.budget || 12) * 1e6 * dcfg.money),
    clubs,
    tableA: tables.tableA,
    tableB: tables.tableB,
    tableC: tables.tableC,
    tableD: tables.tableD,
    fixtures: makeFixtures(clubs),
    results: [],
    inbox: [{ t: 0, title: "Boas-vindas", body: (managerName || "Técnico") + ", bem-vindo ao " + me.name + " (Série " + me.serie + ")! Temporada com " + weeks + " rodadas · dificuldade " + dcfg.label + ". Suba com resultados; A/B exigem reputação alta." }],
    transferWindow: true,
    history: [],
    reputation: startRep,
    jobOffers: [],
    seasonsAtClub: 0,
    difficulty: dcfg.id,
    freeAgents: [],
    objectives: [],
    seasonWins: 0,
    morale: 55
  };
  clubs.forEach(c => refreshPlayerEconomy(c));
  ensureFreeAgents(true);
  assignBoardObjectives(me);
  pushNews("Boas-vindas", "A torcida do " + me.name + " espera comprometimento. Moral inicial 55.", "torcida");
  save();
}

function makeFixtures(clubs) {
  const fix = [];
  function roundRobin(ids, serie, doubleRound) {
    if (ids.length < 2) return;
    const list = ids.slice();
    if (list.length % 2) list.push(null);
    const n = list.length, rounds = n - 1, half = n / 2;
    let arr = list.slice(), weekBase = 1;
    const turns = doubleRound ? 2 : 1;
    for (let turn=0; turn<turns; turn++) {
      for (let r=0; r<rounds; r++) {
        const week = weekBase + r;
        for (let i=0;i<half;i++) {
          let home = arr[i], away = arr[n-1-i];
          if (!home || !away) continue;
          if (turn===1) { const t=home; home=away; away=t; }
          if ((r+i)%3===0 && turn===0) { const t=home; home=away; away=t; }
          fix.push({week, serie, home, away, played:false, gh:null, ga:null});
        }
        arr = [arr[0], arr[n-1], ...arr.slice(1,n-1)];
      }
      weekBase += rounds;
    }
  }
  // A/B/C: ida e volta (como pontos corridos oficiais)
  ["A","B","C"].forEach(serie => {
    roundRobin(clubs.filter(c=>c.serie===serie).map(c=>c.id), serie, true);
  });
  // D: turno único (recorte jogável; 32 clubes → ~31 rodadas)
  roundRobin(clubs.filter(c => c.serie === "D").map(c => c.id), "D", false);
  // A/B/C: 38 rodadas · D: 31 — sem comprimir calendário
  return fix;
}

function save() {
  try {
    const payload = deep(S);
    (payload.clubs || []).forEach(c => {
      (c.squad || []).forEach(p => { if (p && p.at) delete p.at; });
    });
    if (payload.freeAgents && payload.freeAgents.length > 20) {
      payload.freeAgents = payload.freeAgents.slice(0, 20);
    }
    (payload.freeAgents || []).forEach(p => { if (p && p.at) delete p.at; });
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch (e) {
    toast("Save cheio — limpe dados do navegador.");
  }
}
function load() {
  try {
    let raw = localStorage.getItem(SAVE_KEY);
    if (!raw) raw = localStorage.getItem(typeof SAVE_KEY_V9!=="undefined"?SAVE_KEY_V9:null);
    if (!raw) raw = localStorage.getItem(SAVE_KEY_OLD);
    if (!raw) return false;
    S = JSON.parse(raw);
    if (!S || !S.clubId) return false;
    S.version = VERSION;
    S.reputation = S.reputation ?? 30;
    S.jobOffers = S.jobOffers || [];
    S.seasonsAtClub = S.seasonsAtClub || 0;
    if (!S.tableC || !S.tableD) {
      const have = new Set(S.clubs.map(c=>c.id));
      (DATA.clubs||[]).forEach(c => {
        if ((c.serie==="C"||c.serie==="D") && !have.has(c.id)) {
          const nc = deep(c); rebalanceXI(nc); S.clubs.push(nc);
        }
      });
      const t = buildTables(S.clubs);
      S.tableA = S.tableA || t.tableA;
      S.tableB = S.tableB || t.tableB;
      S.tableC = t.tableC;
      S.tableD = t.tableD;
      S.fixtures = makeFixtures(S.clubs);
    }
    S.clubs.forEach(c => {
      ensureSquadBalance(c);
      c.squad.forEach(p => {
        p.ovr = Math.round(p.ovr);
        p.energy = Math.round(clamp(p.energy || 100, 0, 100));
        p.value = Math.round(p.value || 0);
        p.form = Math.round(clamp(p.form || 5, 1, 10));
      });
      if (!c.xi || c.xi.length !== 11) rebalanceXI(c);
    });
    S.difficulty = S.difficulty || "normal";
    ui.difficulty = S.difficulty;
    S.freeAgents = S.freeAgents || [];
    S.objectives = S.objectives || [];
    S.seasonWins = S.seasonWins || 0;
    S.morale = S.morale != null ? S.morale : 55;
    S.clubs.forEach(c => {
      refreshPlayerEconomy(c);
      (c.squad || []).forEach(p => { if (p.inj == null) p.inj = 0; });
    });
    const me = S.clubs.find(c => c.id === S.clubId);
    if (me) {
      S.maxWeeks = S.maxWeeks || maxWeeksForSerie(me.serie);
      if (!S.objectives.length) assignBoardObjectives(me);
    }
    ensureFreeAgents(false);
    return true;
  } catch (e) { return false; }
}

// ---------- match engine ----------
function simMatch(homeId, awayId, opts={}) {
  const home = S.clubs.find(c=>c.id===homeId);
  const away = S.clubs.find(c=>c.id===awayId);
  const hForm = opts.hForm || home.formation || "4-3-3";
  const aForm = opts.aForm || away.formation || "4-3-3";
  const hMent = opts.hMent || home.mentality || "normal";
  const aMent = opts.aMent || away.mentality || "normal";
  const hXI = opts.hXI || home.xi;
  const aXI = opts.aXI || away.xi;

  const H = sectorPower(home, hForm, hXI, hMent);
  const A = sectorPower(away, aForm, aXI, aMent);
  const hOVR = squadOVR(home, hXI);
  const aOVR = squadOVR(away, aXI);
  let homeAdv = 1.05;
  if (S && S.clubId && home.id === S.clubId) homeAdv *= moraleHomeBoost();


  const midGap = H.mid - A.mid;
  let possH = clamp(50 + midGap * 0.6 + (hOVR-aOVR)*0.3, 30, 70);

  function xgSide(atk, oppDef, midOwn, midOpp, mentAtk, isHome, bodiesAtk, bodiesOppDef) {
    const gap = clamp(atk - oppDef, -25, 25);
    const midCtrl = clamp((midOwn - midOpp) * 0.055, -0.4, 0.4);
    const densBonus = clamp((bodiesAtk - bodiesOppDef) * 0.04, -0.2, 0.25);
    let base = 1.02 + gap * 0.018 + midCtrl + densBonus;
    base *= (0.93 + 0.07 * mentAtk);
    if (isHome) base *= homeAdv;
    base *= rnd(0.88, 1.12);
    return clamp(base, 0.45, 2.25);
  }
  const hMentM = MENTALITY[hMent], aMentM = MENTALITY[aMent];
  let xgH = xgSide(H.atk, A.def, H.mid, A.mid, hMentM.atk, true,  H.bodies.atk, A.bodies.def);
  let xgA = xgSide(A.atk, H.def, A.mid, H.mid, aMentM.atk, false, A.bodies.atk, H.bodies.def);

  // Dificuldade: reforça/enfraquece xG do humano vs IA
  const dcfg = diffCfg();
  const humanSide = opts.humanSide || null;
  if (humanSide === "home") {
    xgH *= dcfg.humanXg;
    xgA *= dcfg.aiXg;
  } else if (humanSide === "away") {
    xgA *= dcfg.humanXg;
    xgH *= dcfg.aiXg;
  }

  return {
    home, away, hForm, aForm, hMent, aMent, hXI: hXI.slice(), aXI: aXI.slice(),
    H, A, hOVR, aOVR, possH, xgH, xgA,
    gh:0, ga:0, minute:0, events:[],
    live: !!opts.live, humanSide: opts.humanSide || null,
    paused: false, ended: false, half: 1,
    ball:{x:0.5,y:0.5}, lastEvent: "Apito inicial!",
    momentum: 0,
    activeCmd: null, // {type, until, side}
    cmdCD: {}, // type -> minute available
    subsLeft: 3,
    flash: null, // {t, kind}
    bobT: 0
  };
}

function refreshSectors(M) {
  M.H = sectorPower(M.home, M.hForm, M.hXI, M.hMent);
  M.A = sectorPower(M.away, M.aForm, M.aXI, M.aMent);
  // soft-update xG baseline from current sectors (partial)
  const hM = MENTALITY[M.hMent], aM = MENTALITY[M.aMent];
  const gapH = clamp(M.H.atk - M.A.def, -25, 25);
  const gapA = clamp(M.A.atk - M.H.def, -25, 25);
  M.xgH = clamp(0.7 * M.xgH + 0.3 * (1.02 + gapH*0.018) * (0.93+0.07*hM.atk) * 1.05, 0.45, 2.3);
  M.xgA = clamp(0.7 * M.xgA + 0.3 * (1.02 + gapA*0.018) * (0.93+0.07*aM.atk), 0.45, 2.3);
}

function applyCmd(M, type) {
  if (!M.humanSide || !CMD[type]) return;
  if (type === "shoot") {
    // only if cooldown ready
    if ((M.cmdCD.shoot||0) > M.minute) { M.lastEvent = "Equipe ainda organiza o ataque..."; return; }
    M.cmdCD.shoot = M.minute + CMD.shoot.cd;
    // territorial check
    const mine = M.humanSide==="home" ? M.H : M.A;
    const opp  = M.humanSide==="home" ? M.A : M.H;
    const adv = mine.atk - opp.def + (M.humanSide==="home" ? (M.possH-50) : (50-M.possH)) * 0.15;
    const forceHome = M.humanSide==="home";
    // better chance if advantage
    const bonus = clamp(0.08 + adv * 0.008, 0.05, 0.22);
    tryChance(M, forceHome, bonus);
    applyFatigueSide(M, M.humanSide, CMD.shoot.energy);
    M.lastEvent = M.lastEvent || "Mandou a equipe finalizar!";
    return;
  }
  if ((M.cmdCD[type]||0) > M.minute) {
    M.lastEvent = "Instrução ainda em cooldown.";
    return;
  }
  const c = CMD[type];
  M.activeCmd = { type, until: M.minute + c.dur, side: M.humanSide };
  M.cmdCD[type] = M.minute + c.cd;
  applyFatigueSide(M, M.humanSide, c.energy);
  M.lastEvent = c.label + "!";
  if (M.humanSide==="home") M.possH = clamp(M.possH + c.poss, 28, 72);
  else M.possH = clamp(M.possH - c.poss, 28, 72);
}

function applyFatigueSide(M, side, amt) {
  const club = side==="home" ? M.home : M.away;
  const xi = side==="home" ? M.hXI : M.aXI;
  xi.forEach(id => {
    const p = playerById(club, id);
    if (p) p.energy = Math.round(clamp((p.energy||100) - amt, 20, 100));
  });
  refreshSectors(M);
}

function stepMatch(M, userAction=null) {
  if (M.ended || M.paused) return;
  M.minute++;
  M.bobT = (M.bobT||0) + 1;

  if (userAction) applyCmd(M, userAction);

  // expire active cmd
  if (M.activeCmd && M.minute >= M.activeCmd.until) M.activeCmd = null;

  if (M.minute % 12 === 0) {
    applyFatigue(M.home, M.hXI, 2);
    applyFatigue(M.away, M.aXI, 2);
    refreshSectors(M);
  }

  // modifiers from active command
  let boostH = 1, boostA = 1, defH = 1, defA = 1;
  if (M.activeCmd) {
    const c = CMD[M.activeCmd.type];
    if (M.activeCmd.side === "home") { boostH = c.atk; defH = c.def; }
    else { boostA = c.atk; defA = c.def; }
  }

  // midfield pulls possession
  const midPull = (M.H.mid - M.A.mid) * 0.025;
  M.possH = clamp(M.possH + midPull + rnd(-0.7,0.7), 28, 72);

  // chance rates: xG/90 * possession * boost * density
  const densH = 1 + (M.H.bodies.atk - M.A.bodies.def) * 0.03;
  const densA = 1 + (M.A.bodies.atk - M.H.bodies.def) * 0.03;
  const rateH = (M.xgH / 90) * boostH * densH * (M.possH/50) * rnd(0.7,1.3);
  const rateA = (M.xgA / 90) * boostA * densA * ((100-M.possH)/50) * rnd(0.7,1.3);

  // defense reduces finish later in tryChance via def mult stored
  M._defMulH = defH; M._defMulA = defA;

  if (Math.random() < rateH * 0.9) tryChance(M, true);
  else if (Math.random() < rateA * 0.9) tryChance(M, false);
  else if (Math.random() < 0.05) {
    const flavors = [
      "Falta no meio-campo.","Lateral demorado.","Bola aérea dominada.",
      "Troca de passes na defesa.","Torcida empurra!","Juiz manda seguir.",
      "Cobrança rápida.","Pressão na saída de bola.","Cruzamento repelido."
    ];
    if (Math.random() < 0.4) M.lastEvent = pick(flavors);
  }

  // ball cosmetic toward possession side (home defends bottom → attack is lower y for home)
  const toward = M.possH > 50 ? rnd(0.12, 0.48) : rnd(0.52, 0.88);
  M.ball.y += (toward - M.ball.y) * 0.18;
  M.ball.x = clamp(M.ball.x + rnd(-0.06,0.06), 0.12, 0.88);

  if (M.minute === 45) {
    M.half = 2; M.lastEvent = "Fim do 1º tempo."; M.paused = true; M._ht = true;
  }
  if (M.minute >= 90 + ri(0,4)) {
    M.ended = true; M.lastEvent = "Fim de jogo!";
  }
}

function tryChance(M, homeAttacks, finishBonus=0) {
  const atk = homeAttacks ? M.H : M.A;
  const def = homeAttacks ? M.A : M.H;
  const club = homeAttacks ? M.home : M.away;
  const xi = homeAttacks ? M.hXI : M.aXI;
  const defMul = homeAttacks ? (M._defMulA||1) : (M._defMulH||1);

  const gap = atk.atk - def.def * defMul;
  const finish = clamp(0.14 + gap*0.01 + finishBonus + rnd(-0.04,0.06), 0.06, 0.45);

  // pick scorer weighted by pos + ovr
  const pool = xi.map(id => playerById(club,id)).filter(Boolean);
  const attackers = pool.filter(p => p.pos==="A" || p.pos==="M");
  const list = attackers.length ? attackers : pool;
  list.sort((a,b) => (b.ovr*(b.pos==="A"?1.2:1)) - (a.ovr*(a.pos==="A"?1.2:1)));
  // weighted random top 3
  const top = list.slice(0,3);
  const scorer = top[Math.floor(Math.pow(Math.random(),1.4)*top.length)] || list[0];

  const chanceType = gap > 8 ? pick(["contra","área","bola parada"]) :
                     gap > 0 ? pick(["construção","área","cruzamento"]) :
                     pick(["chute longe","cruzamento","erro na zaga"]);

  M.lastEvent = `${club.short} chega (${chanceType})`;
  M.flash = {t: 12, kind: "chance", side: homeAttacks?"H":"A"};

  if (Math.random() < 0.52 + finish*0.35) {
    if (Math.random() < finish) {
      if (homeAttacks) M.gh++; else M.ga++;
      if (scorer) scorer.goals = (scorer.goals||0)+1;
      const ev = {min:M.minute, type:"goal", side: homeAttacks?"H":"A", player: scorer?scorer.name:"?", playerId: scorer?scorer.id:null, club:club.id, face: scorer?scorer.face:null};
      M.events.push(ev);
      M.lastEvent = `GOL! ${scorer?scorer.name:club.short} (${M.minute}')`;
      M._goal = ev;
      M.momentum = homeAttacks ? 0.7 : -0.7;
      M.ball = {x:0.5,y:0.5};
      M.flash = {t: 20, kind: "goal", side: homeAttacks?"H":"A"};
    } else {
      M.lastEvent = `Defesa espetacular! Chance do ${club.short}.`;
      M.events.push({min:M.minute, type:"save", side: homeAttacks?"H":"A"});
    }
  } else {
    M.lastEvent = `Pra fora — ${club.short}.`;
  }
}

function applyFatigue(club, xi, amt) {
  xi.forEach(id => {
    const p = playerById(club, id);
    if (p) p.energy = Math.round(clamp((p.energy||100) - amt, 20, 100));
  });
}

function finishMatchToTable(M) {
  const mark = (id, gh, ga) => {
    const row = tableRow(id); if (!row) return;
    row.pj++; row.gp += gh; row.gc += ga;
    if (gh>ga) { row.v++; row.pts += 3; }
    else if (gh===ga) { row.e++; row.pts += 1; }
    else row.d++;
  };
  mark(M.home.id, M.gh, M.ga);
  mark(M.away.id, M.ga, M.gh);
  M.hXI.forEach(id => { const p=playerById(M.home,id); if(p) p.apps=(p.apps||0)+1; });
  M.aXI.forEach(id => { const p=playerById(M.away,id); if(p) p.apps=(p.apps||0)+1; });
  // form nudge
  const nudge = (xi, club, won) => xi.forEach(id => {
    const p = playerById(club,id); if(!p) return;
    p.form = Math.round(clamp((p.form||5) + (won?0.4:-0.2) + rnd(-0.2,0.3), 1, 10));
  });
  if (M.gh>M.ga) { nudge(M.hXI,M.home,true); nudge(M.aXI,M.away,false); }
  else if (M.ga>M.gh) { nudge(M.aXI,M.away,true); nudge(M.hXI,M.home,false); }

  // Vitórias do técnico (metas da diretoria)
  if (S && S.clubId) {
    if (M.home.id === S.clubId && M.gh > M.ga) S.seasonWins = (S.seasonWins || 0) + 1;
    if (M.away.id === S.clubId && M.ga > M.gh) S.seasonWins = (S.seasonWins || 0) + 1;
  }

  S.results.push({week:S.week, home:M.home.id, away:M.away.id, gh:M.gh, ga:M.ga});
  const f = S.fixtures.find(x => x.week===S.week && x.home===M.home.id && x.away===M.away.id);
  if (f) { f.played=true; f.gh=M.gh; f.ga=M.ga; }

  // Lesões leves + moral da torcida (só se jogo do técnico)
  const injList = rollMatchInjuries(M);
  M.injuries = injList;
  if (S && (M.home.id === S.clubId || M.away.id === S.clubId)) {
    applyMatchMorale(M);
    // se lesionou titular do técnico, tira do XI
    const me = meClub();
    if (me) {
      let dirty = false;
      injList.forEach(({ club, p }) => {
        if (club.id === me.id && (me.xi || []).includes(p.id)) dirty = true;
      });
      if (dirty) rebalanceXI(me);
    }
  }
  save();
}

function simAIMatch(homeId, awayId, opts={}) {
  const M = simMatch(homeId, awayId, Object.assign({ live: false }, opts));
  function pois(L) {
    L = clamp(L, 0.05, 5);
    let k=0,p=Math.exp(-L),s=p,u=Math.random();
    while (u>s && k<8){k++;p*=L/k;s+=p;}
    return k;
  }
  const bodyMid = (M.H.bodies.mid - M.A.bodies.mid) * 0.035;
  const bodyAtk = (M.H.bodies.atk - M.A.bodies.def) * 0.02;
  M.gh = pois(M.xgH * (1 + bodyMid + bodyAtk));
  M.ga = pois(M.xgA * (1 - bodyMid*0.7 - bodyAtk*0.4));
  if (M.gh + M.ga > 5 && Math.random() < 0.7) {
    M.gh = Math.min(M.gh, 3); M.ga = Math.min(M.ga, 3);
  }
  if (M.gh + M.ga === 0 && Math.random() < 0.28) {
    if (Math.random() < 0.5) M.gh = 1; else M.ga = 1;
  }
  M.ended = true; M.minute = 90;
  finishMatchToTable(M);
  return M;
}

function myFixtureThisWeek() {
  return S.fixtures.find(f => f.week===S.week && !f.played && (f.home===S.clubId || f.away===S.clubId));
}

function advanceWeek() {
  S.fixtures.filter(f => f.week === S.week && !f.played).forEach(f => {
    if (f.home === S.clubId || f.away === S.clubId) return;
    simAIMatch(f.home, f.away);
  });
  S.clubs.forEach(c => c.squad.forEach(p => {
    if (isInjured(p)) {
      p.energy = Math.round(clamp((p.energy || 50) + ri(4, 10), 30, 85));
    } else {
      p.energy = Math.round(clamp((p.energy || 100) + ri(10, 18), 45, 100));
    }
  }));
  healInjuriesWeek();
  // Folha salarial semanal (1/4 do mensal) — pressiona caixa
  const me = meClub();
  if (me) {
    const weekly = Math.round(squadWageMonthly(me) / 4);
    if (weekly > 0) {
      S.money = Math.max(0, S.money - weekly);
    }
  }
  // Deriva leve da moral em direção a 50 se estagnar
  if (S.morale != null && Math.random() < 0.25) {
    if (S.morale > 60) S.morale = Math.max(50, S.morale - 1);
    else if (S.morale < 40) S.morale = Math.min(50, S.morale + 1);
  }
  weeklyAtmosphereNews();
  S.week++;
  const midOpen = S.maxWeeks <= 31 ? 15 : 18;
  const midClose = S.maxWeeks <= 31 ? 18 : 21;
  const wasOpen = S.transferWindow;
  S.transferWindow = (S.week >= 1 && S.week <= 3) || (S.week >= midOpen && S.week <= midClose);
  // Renova agentes livres ao abrir janela
  if (S.transferWindow && !wasOpen) ensureFreeAgents(true);
  if (S.week > S.maxWeeks) endSeason();
  save();
}

function endSeason() {
  const me = meClub();
  const tab = sortTable(myTable());
  const pos = tab.findIndex(r=>r.id===S.clubId)+1;
  const pts = (tab.find(r=>r.id===S.clubId)||{}).pts||0;
  const n = tab.length || 20;
  const wasSerie = me.serie;
  S.history.push({year:S.year, serie:wasSerie, pos, pts, rep:S.reputation});
  S.seasonsAtClub = (S.seasonsAtClub||0) + 1;

  const gain = managerRepGain(wasSerie, pos || n, n);
  S.reputation = clamp((S.reputation||30) + gain, 0, 100);

  const sorted = {
    A: sortTable(S.tableA||[]),
    B: sortTable(S.tableB||[]),
    C: sortTable(S.tableC||[]),
    D: sortTable(S.tableD||[])
  };
  const moves = [];
  SERIE_ORDER.forEach(serie => {
    const r = SERIE_RULES[serie];
    const t = sorted[serie];
    if (!t || !t.length) return;
    if (r.promote && r.promoteTo) {
      t.slice(0, r.promote).forEach(row => moves.push({id:row.id, to:r.promoteTo, kind:"up"}));
    }
    if (r.relegate && r.relegateTo) {
      t.slice(-r.relegate).forEach(row => moves.push({id:row.id, to:r.relegateTo, kind:"dn"}));
    }
  });
  moves.forEach(m => {
    const c = clubByIdState(m.id);
    if (c) c.serie = m.to;
  });
  rebalanceSeriesSizes();

  const myMove = moves.find(m => m.id === S.clubId);
  let seasonMsg = "Série " + wasSerie + ": " + pos + "º · " + pts + " pts · Rep " + S.reputation;
  if (myMove && myMove.kind==="up") {
    toast("ACESSO! " + me.name + " sobe para a Série " + myMove.to + "!", 3500);
    seasonMsg += " · ACESSO → " + myMove.to;
  } else if (myMove && myMove.kind==="dn") {
    toast("Rebaixado para a Série " + myMove.to + "...", 3500);
    seasonMsg += " · REBAIXAMENTO → " + myMove.to;
  } else {
    toast("Temporada: " + pos + "º lugar · Rep " + S.reputation, 2800);
  }
  S.inbox.unshift({t:S.week, title:"Fim de " + S.year, body:seasonMsg});

  const prize = (SERIE_RULES[wasSerie] || SERIE_RULES.D).prize;
  S.money += Math.round((n + 1 - Math.min(pos, n)) * prize / 10);

  // Metas da diretoria (bônus / punição)
  evaluateObjectives(pos, n, wasSerie);

  S.jobOffers = generateJobOffers(wasSerie, pos, n);

  // Moral: nova temporada, torcida "renova esperança" levemente
  S.morale = Math.round(clamp((S.morale || 55) * 0.7 + 40 * 0.3, 35, 75));
  pushNews("Pré-temporada", "Torcida renovada para " + (S.year + 1) + ". Moral " + S.morale + ".", "torcida");
  S.year++;
  S.week = 1;
  const tables = buildTables(S.clubs);
  S.tableA = tables.tableA; S.tableB = tables.tableB;
  S.tableC = tables.tableC; S.tableD = tables.tableD;
  S.fixtures = makeFixtures(S.clubs);
  S.results = [];
  S.transferWindow = true;
  const meNow = meClub();
  if (meNow) {
    S.maxWeeks = maxWeeksForSerie(meNow.serie);
    assignBoardObjectives(meNow);
    ensureFreeAgents(true);
  }
  save();
}


function rebalanceSeriesSizes() {
  // Mantém A=20 B=20 C=20 D=32 após a cadeia de acesso/rebaixamento.
  // Cotas esportivas (ex.: 6 da D) podem gerar sobra na C; o excesso
  // desce/ sobe pelos piores/melhores da tabela da temporada anterior.
  const targets = { A:20, B:20, C:20, D:32 };
  const order = ["A","B","C","D"];
  // tables already rebuilt? use current serie on clubs + previous sorted tables if needed
  function clubsIn(serie) {
    return S.clubs.filter(c => c.serie === serie);
  }
  // rank helper using last season tables when available
  function strength(c) {
    const row = tableRow(c.id);
    if (row) return row.pts * 100 + (row.gp - row.gc);
    return (c.rep || 50) * 10 + (c.ovr || 50);
  }
  // Overflow: from A down to D, push worst extras down one step
  for (let i = 0; i < order.length - 1; i++) {
    const serie = order[i];
    const next = order[i+1];
    let list = clubsIn(serie).sort((a,b) => strength(a) - strength(b)); // worst first
    while (list.length > targets[serie]) {
      const victim = list.shift();
      victim.serie = next;
      list = clubsIn(serie).sort((a,b) => strength(a) - strength(b));
    }
  }
  // Underflow: from D up to A, pull best from lower series
  for (let i = order.length - 2; i >= 0; i--) {
    const serie = order[i];
    const lower = order[i+1];
    let list = clubsIn(serie);
    while (list.length < targets[serie]) {
      const pool = clubsIn(lower).sort((a,b) => strength(b) - strength(a)); // best first
      if (!pool.length) break;
      const hero = pool[0];
      hero.serie = serie;
      list = clubsIn(serie);
    }
  }
  // Final D pad/truncate not needed if total clubs = 92 and targets sum 92
}

function generateJobOffers(wasSerie, pos, n) {
  const offers = [];
  const rep = S.reputation || 0;
  const meId = S.clubId;
  const cands = S.clubs.filter(c => c.id !== meId && rep >= minRepForSerie(c.serie));
  const scored = cands.map(c => {
    const rank = SERIE_RANK[c.serie];
    const want = (rank > SERIE_RANK[wasSerie] ? 1.4 : 1) * (c.rep||50);
    const formBoost = pos <= Math.ceil(n/3) ? 1.3 : pos <= Math.ceil(n/2) ? 1.1 : 0.85;
    return {c, score: want * formBoost * (0.7 + Math.random())};
  }).sort((a,b)=>b.score-a.score);

  const maxOffers = rep >= 70 ? 4 : rep >= 50 ? 3 : rep >= 30 ? 2 : 1;
  const seenSerie = new Set();
  for (const {c} of scored) {
    if (offers.length >= maxOffers) break;
    if (seenSerie.has(c.serie) && offers.length < maxOffers - 1 && Math.random() < 0.5) continue;
    seenSerie.add(c.serie);
    const wageBonus = Math.round((c.budget||10) * 0.08 * 1e6);
    offers.push({
      clubId: c.id,
      serie: c.serie,
      name: c.name,
      short: c.short,
      logo: c.logo,
      budget: c.budget,
      rep: c.rep,
      wageBonus,
      reason: repReason(c, wasSerie, pos, rep)
    });
  }
  if (offers.length) {
    S.inbox.unshift({
      t: S.week,
      title: offers.length + " proposta(s) de trabalho",
      body: offers.map(o => o.name + " (Série " + o.serie + ")").join(" · ")
    });
  }
  return offers;
}

function repReason(c, wasSerie, pos, rep) {
  if (SERIE_RANK[c.serie] > SERIE_RANK[wasSerie]) return "Sua reputação (" + rep + ") chamou a diretoria. Chance de subir de nível.";
  if (pos <= 4) return "Campanha forte na Série " + wasSerie + " (" + pos + "º). Queremos seu trabalho.";
  return "Projeto de reconstrução na Série " + c.serie + ".";
}

function acceptJobOffer(clubId) {
  const off = (S.jobOffers||[]).find(o => o.clubId===clubId);
  if (!off) return;
  const club = clubByIdState(clubId);
  if (!club) { toast("Clube sumiu."); return; }
  if ((S.reputation||0) < minRepForSerie(club.serie)) {
    toast("Rep mínima " + minRepForSerie(club.serie) + " para Série " + club.serie + ".");
    return;
  }
  S.clubId = clubId;
  S.money = Math.round((club.budget || 10) * 1e6) + (off.wageBonus || 0);
  S.seasonsAtClub = 0;
  S.jobOffers = [];
  S.maxWeeks = maxWeeksForSerie(club.serie);
  assignBoardObjectives(club);
  ensureFreeAgents(true);
  S.inbox.unshift({
    t: S.week,
    title: "Novo emprego: " + club.name,
    body: "Você assumiu a Série " + club.serie + ". Caixa inicial " + fmtM(S.money) + ". Boa sorte!"
  });
  toast("Agora é técnico do " + club.name + "!", 3000);
  save();
  ui.tab = "home";
  renderHub();
}

function dismissJobOffers() {
  S.jobOffers = [];
  save();
  renderHub();
}

// ---------- XI ----------
function rebalanceXI(club) {
  const form = club.formation || "4-3-3";
  const need = {
    "4-3-3":["G","LD","Z","Z","LE","V","V","M","A","A","A"],
    "4-4-2":["G","LD","Z","Z","LE","V","M","M","V","A","A"],
    "4-2-3-1":["G","LD","Z","Z","LE","V","V","M","M","M","A"],
    "3-5-2":["G","Z","Z","Z","LD","LE","V","V","M","A","A"],
    "5-3-2":["G","LD","Z","Z","Z","LE","V","V","M","A","A"],
    "4-1-4-1":["G","LD","Z","Z","LE","V","M","M","M","M","A"],
    "3-4-3":["G","Z","Z","Z","LD","LE","V","M","A","A","A"]
  }[form] || ["G","LD","Z","Z","LE","V","V","M","A","A","A"];
  const used = new Set(), xi = [];
  need.forEach(pos => {
    let cands = club.squad.filter(p => !used.has(p.id) && p.pos === pos && !isInjured(p));
    if (!cands.length) cands = club.squad.filter(p => !used.has(p.id) && closePos(p.pos, pos) && !isInjured(p));
    if (!cands.length) cands = club.squad.filter(p => !used.has(p.id) && !isInjured(p));
    if (!cands.length) cands = club.squad.filter(p => !used.has(p.id)); // último recurso
    cands.sort((a, b) => b.ovr - a.ovr);
    if (cands[0]) { xi.push(cands[0].id); used.add(cands[0].id); }
  });
  club.xi = xi.slice(0,11);
}
function closePos(a,b){
  const g={G:["G"],Z:["Z","LD","LE"],LD:["LD","Z"],LE:["LE","Z"],V:["V","M"],M:["M","V","A"],A:["A","M"]};
  return (g[b]||[]).includes(a);
}
function autoXI(club) {
  if (club.xi && club.xi.length===11) return club.xi.slice();
  rebalanceXI(club); return club.xi.slice();
}

// ---------- UI ----------
function showScreen(name) {
  $$(".screen").forEach(s => {
    s.classList.remove("active");
    s.classList.remove("on");
  });
  const el = document.getElementById(name);
  if (el) el.classList.add("active");
  else console.warn("[Brasileirão] tela ausente:", name);
  ui.screen = name;
}

function renderMenu() {
  showScreen("menuScreen");
  const has = !!(localStorage.getItem(SAVE_KEY) || localStorage.getItem(SAVE_KEY_V9) || localStorage.getItem(SAVE_KEY_OLD));
  const btn = $("#btnContinue");
  if (btn) btn.style.display = has ? "flex" : "none";
  const diffBox = $("#menuDiff");
  if (diffBox) {
    diffBox.querySelectorAll("[data-d]").forEach(b => {
      b.classList.toggle("on", b.dataset.d === (ui.difficulty || "normal"));
      b.onclick = () => {
        ui.difficulty = b.dataset.d;
        if (S) S.difficulty = ui.difficulty;
        renderMenu();
        toast("Dificuldade: " + (DIFF[ui.difficulty] || DIFF.normal).label);
      };
    });
  }
  const note = $("#menuDiffNote");
  if (note) note.textContent = (DIFF[ui.difficulty] || DIFF.normal).label + " · afeta xG e caixa inicial";
}

function renderCreate() {
  showScreen("createScreen");
  const box = $("#clubPick");
  const sel = $("#createSerie");
  if (!box || !sel) { console.warn("[Brasileirão] createScreen incompleto"); return; }
  let serie = sel.value;
  if (serie !== "C" && serie !== "D") { serie = "D"; sel.value = "D"; }
  const list = DATA.clubs.filter(c => c.serie === serie).sort((a,b) => (b.rep||0) - (a.rep||0) || (b.ovr||0) - (a.ovr||0));
  if (!list.length) {
    box.innerHTML = '<div class="muted">Nenhum clube nesta série.</div>';
    return;
  }
  box.innerHTML = list.map(c => `
    <div class="c ${ui.pickClub===c.id?"on":""}" data-id="${c.id}">
      <img src="${c.logo}" alt="" onerror="this.style.opacity=.3">
      <div class="nm">${c.name}</div>
      <div class="sg">${c.city||""}/${c.state||""} · OVR ${c.ovr||"—"} · ${fmtM((c.budget||10)*1e6)}</div>
    </div>`).join("");
  box.onclick = e => {
    const c = e.target.closest(".c"); if (!c) return;
    ui.pickClub = c.dataset.id;
    renderCreate();
  };
}

function renderHub() {
  showScreen("hubScreen");
  const me = meClub();
  const row = tableRow(me.id) || {pts:0,pj:0};
  const tab = myTable().slice().sort((a,b)=> b.pts-a.pts || (b.gp-b.gc)-(a.gp-a.gc));
  const pos = tab.findIndex(r=>r.id===me.id)+1;
  $("#hubCrest").src = me.logo;
  $("#hubName").textContent = me.name;
  $("#hubInfo").textContent = `Série ${me.serie} · ${pos}º · ${row.pts} pts · Rep ${S.reputation||0} · Rod. ${S.week}/${S.maxWeeks} · ${diffCfg().label}`;
  $("#hubMoney").textContent = fmtM(S.money);
  $$("#hubNav button").forEach(b => b.classList.toggle("on", b.dataset.tab===ui.tab));
  const body = $("#hubBody");
  if (ui.tab==="home") body.innerHTML = viewHome(me, pos, row);
  else if (ui.tab==="squad") body.innerHTML = viewSquad(me);
  else if (ui.tab==="tactics") body.innerHTML = viewTactics(me);
  else if (ui.tab==="table") body.innerHTML = viewTable(me);
  else if (ui.tab==="market") body.innerHTML = viewMarket(me);
  bindHub(me);
}

function tempFor(club) {
  const map = {temperado:"14–22°C","quente-úmido":"28–34°C",quente:"29–33°C",subtropical:"18–27°C"};
  const t = map[club.climate] || "22–28°C";
  const hour = pick(["16:00","18:30","19:00","21:00","16:30"]);
  return `${hour} · ${t} · ${club.city}/${club.state}`;
}

function viewHome(me, pos, row) {
  const fix = myFixtureThisWeek();
  let next = `<div class="muted">Sem jogo nesta rodada — avance a semana.</div>`;
  if (fix) {
    const home = clubByIdState(fix.home), away = clubByIdState(fix.away);
    const isHome = fix.home===me.id;
    const host = isHome ? me : away;
    next = `
      <div class="next-match">
        <div class="side"><img src="${home.logo}"><b>${home.short}</b></div>
        <div class="mid">
          <div class="date">Rodada ${S.week} · ${isHome?"Casa":"Fora"}</div>
          <div class="vs">VS</div>
          <div class="place">${host.stadium} · ${(host.capacity||0).toLocaleString("pt-BR")}</div>
          <div class="muted" style="margin-top:4px">${tempFor(host)}</div>
        </div>
        <div class="side"><img src="${away.logo}"><b>${away.short}</b></div>
      </div>
      <div style="margin-top:10px;display:flex;gap:8px">
        <button class="primary" id="btnPlayMatch" style="flex:1">Preparar partida</button>
        <button class="ghost" id="btnSimMatch">Simular</button>
      </div>`;
  }
  const H = sectorPower(me, me.formation, me.xi, me.mentality||"normal");
  const recent = S.results.filter(r=>r.home===me.id||r.away===me.id).slice(-5).reverse();
  const strip = recent.length ? `<div class="strip" style="margin-top:8px">${recent.map(r=>{
    const gh = r.home===me.id?r.gh:r.ga, ga = r.home===me.id?r.ga:r.gh;
    const opp = clubByIdState(r.home===me.id?r.away:r.home);
    const res = gh>ga?"V":gh===ga?"E":"D";
    return `<div class="r"><b>${res} ${gh}x${ga}</b>${opp?opp.short:""}</div>`;
  }).join("")}</div>` : "";

  return `
    <div class="card"><h3>Próximo jogo</h3>${next}</div>
    <div class="card"><h3>Força do XI · ${me.formation}</h3>
      <div class="sector-bars">
        <div class="s def"><b>${H.def}</b><span>DEF · ${H.bodies.def} jog.</span></div>
        <div class="s mid"><b>${H.mid}</b><span>MEIO · ${H.bodies.mid} jog.</span></div>
        <div class="s atk"><b>${H.atk}</b><span>ATA · ${H.bodies.atk} jog.</span></div>
      </div>
      <div class="muted" style="margin-top:8px">OVR XI: <b style="color:var(--acc2)">${squadOVR(me)}</b> · ${MENTALITY[me.mentality||"normal"].label}</div>
      ${strip}
    </div>
    <div class="grid3">
      <div class="stat"><b>${pos}º</b><span>posição</span></div>
      <div class="stat"><b>${row.pts||0}</b><span>pontos</span></div>
      <div class="stat"><b>${S.seasonWins||0}</b><span>vitórias</span></div>
    </div>
    <div class="card" style="margin-top:10px"><h3>Torcida · ${moraleLabel(S.morale)}</h3>
      <div class="morale-row">
        <div class="morale-bar"><div class="fill" style="width:${Math.round(S.morale||55)}%;background:${moraleColor(S.morale)}"></div></div>
        <b style="color:${moraleColor(S.morale)}">${Math.round(S.morale||55)}</b>
      </div>
      <div class="muted" style="margin-top:6px">Mando de campo ${((moraleHomeBoost()-1)*100).toFixed(1)}% · ${moraleLabel(S.morale)}</div>
    </div>
    ${(() => {
      const news = (S.inbox || []).slice(0, 6);
      if (!news.length) return "";
      return `<div class="card" style="margin-top:10px"><h3>Notícias</h3>
        <div class="news-list">${news.map(n => `
          <div class="news-item">
            <span class="ic">${newsIcon(n.kind)}</span>
            <div><div class="nt">${n.title}</div><div class="nb">${(n.body||"").slice(0,110)}</div></div>
          </div>`).join("")}</div>
      </div>`;
    })()}
    ${(() => {
      const objs = S.objectives || [];
      if (!objs.length) return "";
      const n = (myTable() || []).length || 20;
      return `<div class="card" style="margin-top:10px;border:1px solid rgba(240,193,74,.35)"><h3>Metas da diretoria</h3>
        <div class="plist">${objs.map(o => {
          const pr = objectiveProgress(o, me, pos, row, n);
          const col = pr.ok ? "var(--acc2)" : "var(--mut)";
          return `<div class="pitem" style="cursor:default">
            <div class="who"><div class="n">${o.label}</div>
              <div class="s" style="color:${col}">${pr.text}</div>
              <div class="bar" style="margin-top:4px;height:4px;background:#1a2533;border-radius:2px;overflow:hidden">
                <div style="height:100%;width:${Math.round(pr.pct)}%;background:${pr.ok ? "var(--acc2)" : "var(--gold)"}"></div>
              </div>
            </div>
            <div class="ovr" style="font-size:11px;color:${col}">${pr.ok ? "OK" : "…"}</div>
          </div>`;
        }).join("")}</div>
        <div class="muted" style="margin-top:6px">Cumprir no fim da temporada gera bônus de caixa e reputação.</div>
      </div>`;
    })()}
    ${(S.jobOffers&&S.jobOffers.length)?`
    <div class="card" style="margin-top:10px;border:1px solid var(--acc2)"><h3>Propostas de trabalho</h3>
      <div class="muted" style="margin-bottom:8px">Sua reputação: <b style="color:var(--acc2)">${S.reputation||0}</b>/100 · A/B exigem rep alta</div>
      <div class="plist">${S.jobOffers.map(o=>`
        <div class="pitem">
          <img class="face" src="${o.logo}" onerror="this.style.opacity=.3">
          <div class="who"><div class="n">${o.name}</div>
            <div class="s">Série ${o.serie} · Rep clube ${o.rep} · bônus ${fmtM(o.wageBonus||0)}</div>
            <div class="s">${o.reason||""}</div>
          </div>
          <button class="primary btnAcceptJob" data-cid="${o.clubId}" style="padding:8px 10px">Aceitar</button>
        </div>`).join("")}</div>
      <button class="ghost" id="btnDismissJobs" style="width:100%;margin-top:8px">Recusar todas</button>
    </div>`:""}
    <div class="card" style="margin-top:10px"><h3>Diretoria</h3>
      <div class="muted">${me.saf?`SAF · ${me.owner||me.president}`:`Presidente: ${me.president||"—"}`}</div>
      <div class="muted">Caixa: <span class="money">${fmtM(S.money)}</span> · Folha/mês: <span class="money">${fmtM(squadWageMonthly(me))}</span></div>
      <div class="muted">Janela: ${S.transferWindow?"ABERTA":"fechada"} · Temporada ${S.year}</div>
      <div class="muted">Rep. técnico: <b>${S.reputation||0}</b> · Temporadas no clube: ${S.seasonsAtClub||0}</div>
      <div class="muted" style="margin-top:4px;font-size:11px">Rep p/ Série C:25 · B:48 · A:72</div>
      <div class="muted" style="margin-top:4px">Lesionados: <b>${me.squad.filter(isInjured).length}</b></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button id="btnAdvance" class="ghost" style="flex:1">Avançar semana</button>
      <button id="btnSave" class="ghost">Salvar</button>
    </div>`;
}

function viewSquad(me) {
  const sorted = me.squad.slice().sort((a,b)=> b.ovr-a.ovr);
  return `<div class="card"><h3>Elenco (${sorted.length})</h3>
    <div class="muted" style="margin-bottom:6px">Toque num jogador para detalhes / venda.</div>
    <div class="plist">${sorted.map(p => {
      const inXI = me.xi.includes(p.id);
      const en = Math.round(p.energy||100);
      const enClass = en>75?"ok":en>50?"warn":"bad";
      const inj = isInjured(p);
      return `<div class="pitem ${inj ? "inj" : ""}" data-pid="${p.id}">
        <img class="face" src="${p.face}" onerror="this.src='${me.logo}'">
        <div class="who"><div class="n">${p.name} ${inXI?'<span class="badge xi">XI</span>':''}${inj?'<span class="badge inj">🏥'+p.inj+'s</span>':''}</div>
          <div class="s">${posLabel(p.pos)} · ${p.age}a · ${fmtM(p.value)} · ⚡<span class="badge ${enClass}">${en}</span></div>
        </div>
        <div class="ovr">${p.ovr}</div>
      </div>`;
    }).join("")}</div></div>`;
}

function viewTactics(me) {
  const forms = DATA.formations || Object.keys(FORM_POS);
  const H = sectorPower(me, me.formation, me.xi, me.mentality||"normal");
  const coords = FORM_POS[me.formation] || FORM_POS["4-3-3"];
  const slots = me.xi.map((id,i) => {
    const p = playerById(me, id);
    const [x,y] = coords[i] || [0.5,0.5];
    return `<div class="slot" data-idx="${i}" style="left:${x*100}%;top:${y*100}%">
      <img src="${p?p.face:me.logo}" onerror="this.src='${me.logo}'">
      <div class="lab">${p?p.name.split(" ").slice(-1)[0]:""}</div>
    </div>`;
  }).join("");
  return `
    <div class="card"><h3>Formação</h3>
      <select id="selForm">${forms.map(f=>`<option value="${f}" ${f===me.formation?"selected":""}>${f}</option>`).join("")}</select>
      <div class="hr"></div>
      <div class="muted">Mentalidade</div>
      <div class="grid2" style="margin-top:6px" id="mentRow">
        ${Object.entries(MENTALITY).map(([k,v])=>`<button data-m="${k}" class="${(me.mentality||'normal')===k?"primary":"ghost"}">${v.label}</button>`).join("")}
      </div>
    </div>
    <div class="tboard" id="tboard">${slots}</div>
    <div class="sector-bars">
      <div class="s def"><b>${H.def}</b><span>DEF (${H.bodies.def})</span></div>
      <div class="s mid"><b>${H.mid}</b><span>MEIO (${H.bodies.mid})</span></div>
      <div class="s atk"><b>${H.atk}</b><span>ATA (${H.bodies.atk})</span></div>
    </div>
    <div class="card" style="margin-top:10px"><h3>Banco · toque titular → reserva</h3>
      <div class="plist" id="benchList">
        ${me.squad.filter(p=>!me.xi.includes(p.id)).sort((a,b)=>b.ovr-a.ovr).slice(0,14).map(p=>`
          <div class="pitem bench ${isInjured(p)?"inj":""}" data-pid="${p.id}">
            <img class="face" src="${p.face}" onerror="this.src='${me.logo}'">
            <div class="who"><div class="n">${p.name}${isInjured(p)?' 🏥':''}</div><div class="s">${posLabel(p.pos)} · ⚡${Math.round(p.energy||100)}${isInjured(p)?' · fora '+p.inj+'s':''}</div></div>
            <div class="ovr">${p.ovr}</div>
          </div>`).join("")}
      </div>
    </div>`;
}

function viewTable(me) {
  const tab = sortTable(myTable());
  const n = tab.length;
  return `<div class="card"><h3>Classificação · Série ${me.serie}</h3>
    <table class="tbl"><thead><tr><th>#</th><th class="club">Clube</th><th>P</th><th>J</th><th>V</th><th>SG</th></tr></thead>
    <tbody>${tab.map((r,i)=>{
      const c = clubByIdState(r.id) || {logo:"", short:r.id, name:r.id};
      const z = zoneClass(me.serie, i, n);
      return `<tr class="${r.id===me.id?"me":""} ${z}"><td>${i+1}</td>
        <td class="club"><img src="${c.logo}" onerror="this.style.opacity=.2">${c.short}</td>
        <td><b>${r.pts}</b></td><td>${r.pj}</td><td>${r.v}</td><td>${r.gp-r.gc}</td></tr>`;
    }).join("")}</tbody></table>
    <div class="muted" style="margin-top:8px">${zoneLegend(me.serie)}</div>
  </div>`;
}

function viewMarket(me) {
  const f = ui.market || (ui.market = { pos: "ALL", serie: "ALL", sort: "ovr", q: "" });
  const sellList = me.squad.filter(p => !me.xi.includes(p.id)).sort((a, b) => b.value - a.value).slice(0, 12);
  const sellHTML = sellList.map(p => `
    <div class="pitem">
      <img class="face" src="${p.face}" onerror="this.src='${me.logo}'">
      <div class="who"><div class="n">${p.name}</div>
        <div class="s">${posLabel(p.pos)} · ${p.ovr} · ${p.age}a · vale ${fmtM(p.value)}</div></div>
      <button class="ghost btnSell" data-pid="${p.id}" style="padding:8px 10px">Vender</button>
    </div>`).join("");

  const wageM = squadWageMonthly(me);
  const head = `<div class="card"><h3>Mercado</h3>
    <p class="muted">Caixa: <span class="money">${fmtM(S.money)}</span> · Folha: <span class="money">${fmtM(wageM)}</span>/mês</p>
    <p class="muted">Janela: <b style="color:${S.transferWindow ? "var(--acc2)" : "var(--mut)"}">${S.transferWindow ? "ABERTA" : "FECHADA"}</b>
      · Compra só na janela · Venda de reservas sempre</p>
  </div>`;

  if (!S.transferWindow) {
    return head + `<div class="card"><h3>Vender reservas</h3>
      <div class="muted" style="margin-bottom:6px">Fora da janela a venda rende ~55% do valor.</div>
      <div class="plist">${sellHTML || '<div class="muted">Só reservas.</div>'}</div></div>`;
  }

  ensureFreeAgents(false);
  const all = filterMarketTargets(me);
  const list = all.slice(0, 36);
  const posOpts = ["ALL", "G", "Z", "LD", "LE", "V", "M", "A"].map(x =>
    `<option value="${x}" ${f.pos === x ? "selected" : ""}>${x === "ALL" ? "Posição" : posLabel(x)}</option>`).join("");
  const serieOpts = ["ALL", "D", "C", "B", "A"].map(x =>
    `<option value="${x}" ${f.serie === x ? "selected" : ""}>${x === "ALL" ? "Série" : "Série " + x}</option>`).join("");
  const sortOpts = [
    ["ovr", "Maior OVR"], ["value", "Menor preço"], ["age", "Mais jovem"]
  ].map(([v, l]) => `<option value="${v}" ${f.sort === v ? "selected" : ""}>${l}</option>`).join("");

  return head + `
  <div class="card"><h3>Filtros</h3>
    <div class="grid2" style="gap:8px">
      <select id="mktPos">${posOpts}</select>
      <select id="mktSerie">${serieOpts}</select>
      <select id="mktSort">${sortOpts}</select>
      <input id="mktQ" type="search" placeholder="Buscar nome" value="${(f.q || "").replace(/"/g, "")}" style="padding:10px;border-radius:10px;border:1px solid var(--line);background:#0a121c;color:#fff">
    </div>
    <div class="muted" style="margin-top:6px">${all.length} disponíveis · mostrando ${list.length}</div>
  </div>
  <div class="card"><h3>Negociar contratações</h3>
    <div class="muted" style="margin-bottom:8px">Oferta em % do pedido. Clubes grandes e titulares resistem mais.</div>
    <div class="plist">${list.map(({ kind, c, p, ask }) => {
      const face = p.face || c.logo || me.logo;
      const tag = kind === "fa" ? "Agente livre" : ("Série " + c.serie);
      return `<div class="pitem" style="flex-wrap:wrap">
        <img class="face" src="${face}" onerror="this.src='${me.logo}'">
        <div class="who" style="min-width:120px"><div class="n">${p.name}</div>
          <div class="s">${tag} · ${posLabel(p.pos)} · OVR ${p.ovr} · ${p.age}a</div>
          <div class="s">Pedido <span class="money">${fmtM(ask)}</span> · Sal. ${fmtM(p.wage || 0)}/mês</div>
        </div>
        <div class="ovr">${p.ovr}</div>
        <div style="display:flex;gap:4px;width:100%;margin-top:6px">
          <button class="ghost btnOffer" data-kind="${kind}" data-cid="${c.id}" data-pid="${p.id}" data-pct="80" style="flex:1;padding:8px;font-size:11px">80%</button>
          <button class="ghost btnOffer" data-kind="${kind}" data-cid="${c.id}" data-pid="${p.id}" data-pct="100" style="flex:1;padding:8px;font-size:11px">100%</button>
          <button class="primary btnOffer" data-kind="${kind}" data-cid="${c.id}" data-pid="${p.id}" data-pct="120" style="flex:1;padding:8px;font-size:11px">120%</button>
        </div>
      </div>`;
    }).join("") || '<div class="muted">Nenhum alvo com esses filtros.</div>'}</div>
  </div>
  <div class="card"><h3>Vender reservas</h3>
    <div class="muted" style="margin-bottom:6px">Na janela: ~75% do valor.</div>
    <div class="plist">${sellHTML || '<div class="muted">—</div>'}</div>
  </div>`;
}

function showPlayerSheet(me, pid) {
  const p = playerById(me, pid); if (!p) return;
  $("#playerBody").innerHTML = `
    <img class="face-lg" src="${p.face}" onerror="this.src='${me.logo}'">
    <h2 style="margin:0;text-align:center">${p.name}</h2>
    <div class="muted" style="text-align:center">${posLabel(p.pos)} · ${p.age} anos · ${me.short}</div>
    <div class="attr-row">
      <div class="a"><b>${p.ovr}</b><span>OVR</span></div>
      <div class="a"><b>${Math.round(p.energy||100)}</b><span>Energia</span></div>
      <div class="a"><b>${Math.round(p.form||5)}</b><span>Forma</span></div>
      <div class="a"><b>${p.goals||0}</b><span>Gols</span></div>
    </div>
    <div class="muted">Valor: <span class="money">${fmtM(p.value)}</span> · Salário: ${fmtM((p.wage||0)*12)}/ano · Jogos: ${p.apps||0}</div>
    <div class="muted" style="margin-top:4px">${isInjured(p) ? ("🏥 Lesionado · " + p.inj + " rodada(s) restantes") : "Disponível"}</div>
    <div class="grid2" style="margin-top:12px">
      <button class="ghost" id="psClose">Fechar</button>
      <button class="danger" id="psSell" ${me.xi.includes(p.id)?"disabled":""}>Vender 70%</button>
    </div>`;
  $("#playerSheet").classList.add("show");
  $("#psClose").onclick = () => $("#playerSheet").classList.remove("show");
  $("#psSell").onclick = () => {
    if (me.xi.includes(p.id)) { toast("Tire do XI primeiro."); return; }
    if (me.squad.length <= 18) { toast("Elenco mínimo."); return; }
    const mult = S.transferWindow ? 0.75 : 0.55;
    const val = Math.round(p.value * mult);
    S.money += val;
    me.squad = me.squad.filter(x => x.id !== p.id);
    toast(`${p.name} vendido por ${fmtM(val)}`);
    $("#playerSheet").classList.remove("show");
    save(); renderHub();
  };
}

function bindHub(me) {
  const play = $("#btnPlayMatch");
  if (play) play.onclick = () => openPrematch();
  const sim = $("#btnSimMatch");
  if (sim) sim.onclick = () => {
    const f = myFixtureThisWeek(); if (!f) return;
    const humanSide = f.home === S.clubId ? "home" : "away";
    const M = simAIMatch(f.home, f.away, { humanSide });
    showPostMatch(M);
  };
  const adv = $("#btnAdvance");
  if (adv) adv.onclick = () => {
    if (myFixtureThisWeek()) { toast("Jogue ou simule sua partida antes."); return; }
    advanceWeek(); toast(`Rodada ${S.week}`); renderHub();
  };
  const saveB = $("#btnSave");
  if (saveB) saveB.onclick = () => { save(); toast("Jogo salvo."); };
  $$(".btnAcceptJob").forEach(b => b.onclick = () => acceptJobOffer(b.dataset.cid));
  const dj = $("#btnDismissJobs");
  if (dj) dj.onclick = () => dismissJobOffers();

  const sel = $("#selForm");
  if (sel) sel.onchange = () => {
    me.formation = sel.value; rebalanceXI(me); save(); renderHub();
  };
  const ment = $("#mentRow");
  if (ment) ment.onclick = e => {
    const b = e.target.closest("button[data-m]"); if (!b) return;
    me.mentality = b.dataset.m; save(); renderHub();
  };

  ui.tSelIdx = null;
  const board = $("#tboard");
  if (board) board.onclick = e => {
    const sl = e.target.closest(".slot"); if (!sl) return;
    ui.tSelIdx = +sl.dataset.idx;
    $$(".slot", board).forEach(s => s.classList.toggle("sel", +s.dataset.idx===ui.tSelIdx));
    toast("Escolha um reserva");
  };
  const bench = $("#benchList");
  if (bench) bench.onclick = e => {
    const it = e.target.closest(".pitem"); if (!it || ui.tSelIdx == null) return;
    const pid = it.dataset.pid;
    const pl = playerById(me, pid);
    if (pl && isInjured(pl)) { toast("Jogador lesionado — indisponível."); return; }
    me.xi[ui.tSelIdx] = pid;
    ui.tSelIdx = null; save(); renderHub();
  };

  // squad click
  if (ui.tab==="squad") {
    $$(".pitem[data-pid]").forEach(el => {
      el.onclick = () => showPlayerSheet(me, el.dataset.pid);
    });
  }

  // Mercado: filtros
  const mktPos = $("#mktPos"), mktSerie = $("#mktSerie"), mktSort = $("#mktSort"), mktQ = $("#mktQ");
  const applyMkt = () => {
    ui.market = ui.market || { pos: "ALL", serie: "ALL", sort: "ovr", q: "" };
    if (mktPos) ui.market.pos = mktPos.value;
    if (mktSerie) ui.market.serie = mktSerie.value;
    if (mktSort) ui.market.sort = mktSort.value;
    if (mktQ) ui.market.q = mktQ.value || "";
    renderHub();
  };
  if (mktPos) mktPos.onchange = applyMkt;
  if (mktSerie) mktSerie.onchange = applyMkt;
  if (mktSort) mktSort.onchange = applyMkt;
  if (mktQ) mktQ.onchange = applyMkt;

  $$(".btnOffer").forEach(b => b.onclick = () => {
    if (!S.transferWindow) { toast("Janela fechada."); return; }
    if (me.squad.length >= 32) { toast("Elenco cheio (máx. 32)."); return; }
    const kind = b.dataset.kind;
    const pct = (+b.dataset.pct || 100) / 100;
    let p, seller, ask;
    if (kind === "fa") {
      p = (S.freeAgents || []).find(x => x.id === b.dataset.pid);
      if (!p) { toast("Jogador sumiu do mercado."); return; }
      seller = { id: "fa", serie: me.serie, rep: 40, xi: [] };
      ask = Math.round((p.value || 0) * 0.35);
    } else {
      seller = clubByIdState(b.dataset.cid);
      p = playerById(seller, b.dataset.pid);
      if (!p || !seller) return;
      ask = transferAskPrice(p, seller);
    }
    const offer = Math.round(ask * pct / 1000) * 1000;
    if (S.money < offer) { toast("Sem verba para " + fmtM(offer)); return; }
    const neg = kind === "fa"
      ? { ask, chance: pct >= 1 ? 0.95 : 0.7, ok: Math.random() < (pct >= 1 ? 0.95 : 0.7) }
      : negotiateBuy(seller, p, offer);
    if (!neg.ok) {
      toast(`Negativa: ${p.name} pediu ${fmtM(ask)}. Oferta ${fmtM(offer)} recusada.`);
      return;
    }
    S.money -= offer;
    if (kind === "fa") {
      S.freeAgents = (S.freeAgents || []).filter(x => x.id !== p.id);
    } else {
      seller.squad = seller.squad.filter(x => x.id !== p.id);
      if ((seller.xi || []).includes(p.id)) rebalanceXI(seller);
    }
    const np = deep(p);
    np.id = me.id + "_t" + Math.floor(Math.random() * 1e6);
    np.freeAgent = false;
    np.wage = wageFromPlayer(np, me.serie);
    np.value = valueFromPlayer(np, me.serie);
    me.squad.push(np);
    toast(`${np.name} contratado por ${fmtM(offer)}!`);
    save(); renderHub();
  });

  $$(".btnSell").forEach(b => b.onclick = () => {
    const p = playerById(me, b.dataset.pid); if (!p) return;
    if (me.xi.includes(p.id)) { toast("Tire do XI primeiro."); return; }
    if (me.squad.length <= 18) { toast("Elenco mínimo de 18 jogadores."); return; }
    const mult = S.transferWindow ? 0.75 : 0.55;
    const val = Math.round(p.value * mult);
    S.money += val;
    me.squad = me.squad.filter(x => x.id !== p.id);
    // vira agente livre ocasional
    if (Math.random() < 0.35) {
      const fa = deep(p);
      fa.id = "fa_" + ri(100000, 999999);
      fa.freeAgent = true;
      S.freeAgents = S.freeAgents || [];
      S.freeAgents.unshift(fa);
      if (S.freeAgents.length > 24) S.freeAgents.length = 24;
    }
    toast(`Vendido: ${fmtM(val)}${S.transferWindow ? "" : " (fora da janela)"}`);
    save(); renderHub();
  });
}

// ---------- PREMATCH ----------
function openPrematch() {
  const f = myFixtureThisWeek(); if (!f) return;
  const me = meClub();
  const home = clubByIdState(f.home), away = clubByIdState(f.away);
  const isHome = f.home === me.id;
  const opp = isHome ? away : home;
  const host = isHome ? me : away;

  // AI set formation lightly
  if (!opp.formation) opp.formation = pick(Object.keys(FORM_POS));
  const H = sectorPower(me, me.formation, me.xi, me.mentality||"normal");
  const A = sectorPower(opp, opp.formation||"4-3-3", autoXI(opp), opp.mentality||"normal");

  showScreen("prematchScreen");
  $("#preMeta").textContent = `Rodada ${S.week} · ${host.stadium}`;
  $("#preBody").innerHTML = `
    <div class="vs-row">
      <div style="text-align:center"><img src="${home.logo}"><div><b>${home.short}</b></div></div>
      <div class="x">×</div>
      <div style="text-align:center"><img src="${away.logo}"><div><b>${away.short}</b></div></div>
    </div>
    <div class="card">
      <div class="muted">${tempFor(host)}</div>
      <div class="muted">${host.stadium} · ${(host.capacity||0).toLocaleString("pt-BR")} lugares</div>
      <div class="muted">${isHome?"Você joga em CASA":"Você joga FORA"} · ${me.saf?`SAF ${me.owner||""}`:`Pres. ${me.president||""}`}</div>
    </div>
    <div class="card"><h3>Comparativo de setores (você · rival)</h3>
      <div class="sector-bars">
        <div class="s def"><b>${H.def} · ${A.def}</b><span>DEF (${H.bodies.def}×${A.bodies.def})</span></div>
        <div class="s mid"><b>${H.mid} · ${A.mid}</b><span>MEIO (${H.bodies.mid}×${A.bodies.mid})</span></div>
        <div class="s atk"><b>${H.atk} · ${A.atk}</b><span>ATA (${H.bodies.atk}×${A.bodies.atk})</span></div>
      </div>
      <div class="muted" style="margin-top:8px">Sua formação ${me.formation} · Rival ${opp.formation||"4-3-3"}</div>
      <div class="muted">OVR XI ${squadOVR(me)} · rival ${squadOVR(opp, autoXI(opp))}</div>
    </div>
    <div class="card"><h3>Mentalidade rápida</h3>
      <div class="grid2" id="preMent">
        ${Object.entries(MENTALITY).map(([k,v])=>`<button data-m="${k}" class="${(me.mentality||'normal')===k?"primary":"ghost"}">${v.label}</button>`).join("")}
      </div>
    </div>
    <button class="primary" id="btnKickoff" style="width:100%;margin:8px 0 20px">Apitar início</button>
    <button class="ghost" id="btnPrematchTactics" style="width:100%">Ajustar tática / XI</button>
  `;
  $("#preMent").onclick = e => {
    const b = e.target.closest("button[data-m]"); if (!b) return;
    me.mentality = b.dataset.m; save(); openPrematch();
  };
  $("#btnKickoff").onclick = () => startLiveMatch();
  $("#btnPrematchTactics").onclick = () => { ui.tab="tactics"; renderHub(); };
}

// ---------- LIVE MATCH ----------
let matchRAF = null, matchAcc = 0;

function startLiveMatch() {
  const f = myFixtureThisWeek();
  if (!f) { toast("Sem jogo."); return; }
  const humanSide = f.home===S.clubId ? "home" : "away";
  const me = meClub();
  match = simMatch(f.home, f.away, {
    live:true, humanSide,
    hForm: f.home===me.id ? me.formation : (clubByIdState(f.home).formation||"4-3-3"),
    aForm: f.away===me.id ? me.formation : (clubByIdState(f.away).formation||"4-3-3"),
    hMent: f.home===me.id ? (me.mentality||"normal") : "normal",
    aMent: f.away===me.id ? (me.mentality||"normal") : "normal",
    hXI: f.home===me.id ? me.xi.slice() : autoXI(clubByIdState(f.home)),
    aXI: f.away===me.id ? me.xi.slice() : autoXI(clubByIdState(f.away))
  });
  match.userCmd = null;
  match.speed = 1;
  showScreen("matchScreen");
  $("#goalOverlay").classList.remove("show");
  $("#htPanel").classList.remove("show");
  $("#subPanel").classList.remove("show");
  $("#btnSpeed").textContent = "1x";
  $("#btnPause").textContent = "⏸";
  drawMatchFrame();
  updateMatchHUD();
  startMatchLoop();
}

function startMatchLoop() {
  cancelAnimationFrame(matchRAF);
  let last = performance.now();
  matchAcc = 0;
  const tick = (now) => {
    if (!match || match.ended) return;
    const dt = now - last; last = now;
    if (!match.paused) {
      matchAcc += dt;
      const interval = 260 / (match.speed||1);
      while (matchAcc >= interval && !match.paused && !match.ended) {
        matchAcc -= interval;
        const cmd = match.userCmd; match.userCmd = null;
        stepMatch(match, cmd);
        if (match.flash) { match.flash.t--; if (match.flash.t<=0) match.flash=null; }
        if (match._goal) {
          showGoal(match._goal); match._goal = null;
          match.paused = true;
          setTimeout(() => {
            if (match) { match.paused = false; $("#goalOverlay").classList.remove("show"); }
          }, 2000);
        }
        if (match._ht) { match._ht = false; showHT(); }
        if (match.ended) { onMatchEnd(); return; }
      }
      updateMatchHUD();
      drawMatchFrame();
    } else {
      drawMatchFrame();
    }
    matchRAF = requestAnimationFrame(tick);
  };
  matchRAF = requestAnimationFrame(tick);
}

function showGoal(ev) {
  const club = clubByIdState(ev.club);
  $("#goalCrest").src = club.logo;
  const face = $("#goalFace");
  if (ev.face) { face.src = ev.face; face.style.display="block"; }
  else face.style.display="none";
  $("#goalText").textContent = "GOOOL!";
  $("#goalSub").textContent = `${ev.player} · ${ev.min}' · ${club.name}`;
  $("#goalOverlay").classList.add("show");
}

function showHT() {
  const M = match;
  const {mine, opp} = humanSectors(M);
  const insight = halfInsight(M, mine, opp);
  $("#htBody").innerHTML = `
    <h2 style="margin:0 0 8px">Intervalo · ${M.gh} x ${M.ga}</h2>
    <div class="sector-bars">
      <div class="s def"><b>${mine.def} / ${opp.def}</b><span>DEF você / rival</span></div>
      <div class="s mid"><b>${mine.mid} / ${opp.mid}</b><span>MEIO</span></div>
      <div class="s atk"><b>${mine.atk} / ${opp.atk}</b><span>ATA</span></div>
    </div>
    <p style="margin:10px 0;font-size:13px;line-height:1.45">${insight}</p>
    <div class="grid2" style="margin-top:10px">
      <button class="ghost" id="htDef">Retranca</button>
      <button class="ghost" id="htAtk">Ofensivo</button>
    </div>
    <button class="ghost" id="htUltra" style="width:100%;margin-top:8px">Tudo ou nada</button>
    <button class="primary" id="htGo" style="width:100%;margin-top:10px">2º tempo</button>`;
  $("#htPanel").classList.add("show");
  $("#htGo").onclick = () => {
    $("#htPanel").classList.remove("show");
    match.paused = false; match.minute = 45;
    refreshSectors(match);
  };
  const setMent = m => {
    if (match.humanSide==="home") match.hMent = m; else match.aMent = m;
    refreshSectors(match);
    toast("Mentalidade: " + MENTALITY[m].label);
  };
  $("#htDef").onclick = () => setMent("defensive");
  $("#htAtk").onclick = () => setMent("attacking");
  $("#htUltra").onclick = () => setMent("ultra");
}

function halfInsight(M, mine, opp) {
  const mid = mine.mid - opp.mid;
  const def = mine.def - opp.atk;
  const atk = mine.atk - opp.def;
  const lines = [];
  if (mid > 5) lines.push("Você domina o meio — controle o ritmo ou mate o jogo.");
  else if (mid < -5) lines.push("Rival ganha no meio. Falta volume de volantes ou compactar (Recuar).");
  else lines.push("Meio equilibrado. Detalhes e bola parada decidem.");
  if (def < -6) lines.push("Zaga exposta — pense em 5º defensor ou retranca.");
  if (atk > 6) lines.push("Seu ataque sobra — pressione e finalize.");
  else if (atk < -4) lines.push("Pouco volume na frente — ofensivo ou meia extra.");
  const poss = M.humanSide==="home" ? Math.round(M.possH) : Math.round(100-M.possH);
  lines.push(`Sua posse: ${poss}%.`);
  return lines.join(" ");
}

function showPostMatch(M) {
  if (!M) return;
  match = M;
  showScreen("matchScreen");
  const go = $("#goalOverlay"); if (go) go.classList.remove("show");
  const sp = $("#subPanel"); if (sp) sp.classList.remove("show");
  const goals = (M.events || []).filter(e => e.type === "goal");
  const meId = S.clubId;
  const myGh = M.home.id === meId ? M.gh : M.ga;
  const myGa = M.home.id === meId ? M.ga : M.gh;
  const res = myGh > myGa ? "Vitória" : myGh < myGa ? "Derrota" : "Empate";
  const resCol = myGh > myGa ? "var(--acc2)" : myGh < myGa ? "#ff8a8a" : "var(--gold)";
  const myInjs = (M.injuries || []).filter(x => x.club && x.club.id === meId);
  const injHtml = myInjs.length
    ? `<div class="muted" style="margin-top:8px;color:#ff8a8a">🏥 ${myInjs.map(x => x.p.name + " (" + x.weeks + " sem.)").join(" · ")}</div>`
    : "";
  $("#htBody").innerHTML = `
    <h2 style="margin:0 0 4px;color:${resCol}">${res}</h2>
    <div style="font-size:22px;font-weight:900;margin-bottom:6px">${M.home.short} ${M.gh} x ${M.ga} ${M.away.short}</div>
    <div class="muted">xG ${M.xgH.toFixed(1)} · ${M.xgA.toFixed(1)} · Posse ${Math.round(M.possH)}% · ${diffCfg().label}</div>
    <div class="muted" style="margin-top:4px">Torcida: <b style="color:${moraleColor(S.morale)}">${moraleLabel(S.morale)} (${Math.round(S.morale||55)})</b></div>
    <div class="plist" style="margin-top:8px;max-height:140px;overflow:auto">
      ${goals.map(e => `<div class="muted">${e.min}' ⚽ ${e.player}</div>`).join("") || "<div class='muted'>Sem gols.</div>"}
    </div>
    ${injHtml}
    <button class="primary" id="ftGo" type="button" style="width:100%;margin-top:12px">Continuar temporada</button>`;
  $("#htPanel").classList.add("show");
  $("#ftGo").onclick = () => {
    $("#htPanel").classList.remove("show");
    advanceWeek();
    match = null;
    ui.tab = "home";
    renderHub();
  };
}

function onMatchEnd() {
  finishMatchToTable(match);
  showPostMatch(match);
}

function openSubPanel() {
  if (!match || match.subsLeft <= 0) { toast("Sem substituições."); return; }
  match.paused = true;
  const side = match.humanSide;
  const club = side==="home" ? match.home : match.away;
  const xi = side==="home" ? match.hXI : match.aXI;
  const bench = club.squad.filter(p => !xi.includes(p.id) && !isInjured(p)).sort((a,b)=>b.ovr-a.ovr).slice(0,10);
  const body = $("#subBody");
  if (!body) return;
  body.innerHTML = `
    <h2 style="margin:0 0 8px">Substituição (${match.subsLeft} rest.)</h2>
    <div class="muted">Toque no titular, depois no reserva.</div>
    <div class="plist" id="subXI" style="margin-top:8px;max-height:28vh;overflow:auto">${xi.map((id,i)=>{
      const p=playerById(club,id);
      if (!p) return "";
      return `<div class="pitem" data-idx="${i}"><img class="face" src="${p.face}" onerror="this.style.opacity=.3"><div class="who"><div class="n">${p.name}</div><div class="s">${posLabel(p.pos)} · ⚡${Math.round(p.energy||100)}</div></div><div class="ovr">${p.ovr}</div></div>`;
    }).join("")}</div>
    <div class="hr"></div>
    <div class="plist" id="subBench" style="max-height:28vh;overflow:auto">${bench.map(p=>`
      <div class="pitem" data-pid="${p.id}"><img class="face" src="${p.face}" onerror="this.style.opacity=.3"><div class="who"><div class="n">${p.name}</div><div class="s">${posLabel(p.pos)} · ${p.ovr}</div></div><div class="ovr">${p.ovr}</div></div>
    `).join("")}</div>
    <button class="ghost" id="subCancel" type="button" style="width:100%;margin-top:10px">Cancelar</button>`;
  $("#subPanel").classList.add("show");
  let sel = null;
  const xiEl = $("#subXI");
  const benchEl = $("#subBench");
  if (xiEl) xiEl.onclick = e => {
    const it = e.target.closest(".pitem"); if (!it) return;
    sel = +it.dataset.idx;
    $$("#subXI .pitem").forEach(x => x.style.borderColor = "");
    it.style.borderColor = "var(--yel)";
  };
  if (benchEl) benchEl.onclick = e => {
    const it = e.target.closest(".pitem"); if (!it || sel == null) return;
    xi[sel] = it.dataset.pid;
    match.subsLeft--;
    refreshSectors(match);
    $("#subPanel").classList.remove("show");
    match.paused = false;
    toast("Substituição feita · restam " + match.subsLeft);
    if (club.id === S.clubId) { meClub().xi = xi.slice(); save(); }
  };
  const cancel = $("#subCancel");
  if (cancel) cancel.onclick = () => { $("#subPanel").classList.remove("show"); match.paused = false; };
}

function updateMatchHUD() {
  if (!match) return;
  const M = match;
  $("#mHomeN").textContent = M.home.short;
  $("#mAwayN").textContent = M.away.short;
  $("#mHomeL").src = M.home.logo;
  $("#mAwayL").src = M.away.logo;
  $("#mScore").textContent = `${M.gh} - ${M.ga}`;
  $("#mMin").textContent = M.ended ? "FIM" : `${M.minute}'`;
  $("#mEvent").textContent = M.lastEvent || "—";
  const ph = M.possH;
  $("#possH").style.width = ph+"%";
  $("#possA").style.width = (100-ph)+"%";

  const {mine, opp} = humanSectors(M);
  if (mine && opp) {
    $("#liveSec").innerHTML = `
      <span style="color:#40c4ff">DEF ${mine.def}-${opp.def}</span> ·
      <span style="color:var(--yel)">MEIO ${mine.mid}-${opp.mid}</span> ·
      <span style="color:#ff8a80">ATA ${mine.atk}-${opp.atk}</span>`;
  }
  if (M.activeCmd) {
    const left = Math.max(0, M.activeCmd.until - M.minute);
    $("#cmdActive").textContent = `▶ ${CMD[M.activeCmd.type].label} (${left}')`;
  } else {
    const m = S && S.morale != null ? S.morale : 55;
    $("#cmdActive").textContent = `📣 Torcida ${moraleLabel(m)} (${Math.round(m)})`;
  }
  const atm = $("#mAtm");
  if (atm) {
    const m = S && S.morale != null ? S.morale : 55;
    atm.textContent = moraleLabel(m);
    atm.style.color = moraleColor(m).replace("var(--acc2)", "#7dffa3").replace("var(--gold)", "#f0c14a");
  }

  // cooldown visual
  $$("[data-cmd]").forEach(b => {
    const t = b.dataset.cmd;
    if (t==="sub") return;
    const cd = M.cmdCD[t]||0;
    b.classList.toggle("cd", cd > M.minute);
  });
}

function drawMatchFrame() {
  const canvas = $("#pitch");
  if (!canvas || !match) return;
  const wrap = $("#pitchWrap");
  const w = Math.max(280, (wrap && wrap.clientWidth) || 360);
  const h = Math.max(360, (wrap && wrap.clientHeight) || 520);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const serie = match.home.serie || "D";
  const palettes = {
    A: ["#178a42", "#136f36", "#0f5a2c"],
    B: ["#2f7a38", "#256330", "#1d5128"],
    C: ["#3a6e3a", "#2f5a30", "#254828"],
    D: ["#3d5c2e", "#324a24", "#283c1c"]
  };
  const [g1, g2, g3] = palettes[serie] || palettes.D;

  // vertical gradient grass
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, g1);
  grad.addColorStop(0.5, g2);
  grad.addColorStop(1, g3);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // mowing stripes
  const stripes = 14;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.05)";
    ctx.fillRect(0, (h / stripes) * i, w, h / stripes);
  }

  // stadium crowd bands (top/bottom) intensity by morale
  const mrl = (S && S.morale != null) ? S.morale : 55;
  const crowdA = 0.08 + (mrl / 100) * 0.18;
  ctx.fillStyle = `rgba(20,10,30,${crowdA})`;
  ctx.fillRect(0, 0, w, 10);
  ctx.fillRect(0, h - 10, w, 10);
  // speckles (crowd lights)
  ctx.fillStyle = `rgba(255,220,120,${0.15 + mrl / 400})`;
  for (let i = 0; i < 18 + Math.floor(mrl / 8); i++) {
    ctx.fillRect((i * 47 + (match.bobT || 0) * 0.3) % w, 2 + (i % 3), 2, 2);
    ctx.fillRect((i * 53) % w, h - 6 + (i % 2), 2, 2);
  }

  const m = 12;
  const fw = w - 2 * m, fh = h - 2 * m;

  // pitch outer
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.lineWidth = 2.2;
  ctx.strokeRect(m, m, fw, fh);

  // halfway
  ctx.beginPath(); ctx.moveTo(m, h / 2); ctx.lineTo(w - m, h / 2); ctx.stroke();
  // center circle + spot
  const cr = Math.min(w, h) * 0.105;
  ctx.beginPath(); ctx.arc(w / 2, h / 2, cr, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(w / 2, h / 2, 2.4, 0, Math.PI * 2);
  ctx.fillStyle = "#fff"; ctx.fill();

  // penalty areas
  const boxW = fw * 0.56, boxH = fh * 0.15;
  ctx.strokeRect((w - boxW) / 2, m, boxW, boxH);
  ctx.strokeRect((w - boxW) / 2, h - m - boxH, boxW, boxH);
  // 6-yard
  const sixW = fw * 0.28, sixH = fh * 0.055;
  ctx.strokeRect((w - sixW) / 2, m, sixW, sixH);
  ctx.strokeRect((w - sixW) / 2, h - m - sixH, sixW, sixH);
  // penalty spots
  ctx.beginPath(); ctx.arc(w / 2, m + boxH * 0.72, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(w / 2, h - m - boxH * 0.72, 2.2, 0, Math.PI * 2); ctx.fill();
  // arcs (simple)
  ctx.beginPath();
  ctx.arc(w / 2, m + boxH * 0.72, cr * 0.55, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w / 2, h - m - boxH * 0.72, cr * 0.55, 1.15 * Math.PI, 1.85 * Math.PI);
  ctx.stroke();
  // corners
  const cornerR = 8;
  [[m, m, 0, 0.5], [w - m, m, 0.5, 1], [m, h - m, 1.5, 0], [w - m, h - m, 1, 1.5]].forEach(([cx, cy, a0, a1]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, cornerR, a0 * Math.PI, a1 * Math.PI);
    ctx.stroke();
  });
  // goals
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  const gw = fw * 0.18, gh = 5;
  ctx.fillRect((w - gw) / 2, m - 2, gw, gh);
  ctx.fillRect((w - gw) / 2, h - m - 3, gw, gh);

  // sector bands subtle
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  ctx.fillRect(m, m, fw, fh * 0.33);
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(m, m + fh * 0.33, fw, fh * 0.34);

  // labels
  ctx.font = "bold 10px system-ui,sans-serif";
  [[0.16, "ATA"], [0.50, "MEIO"], [0.84, "DEF"]].forEach(([yy, lab]) => {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(8, h * yy - 8, 46, 15);
    ctx.fillStyle = "#d7f0e0";
    ctx.fillText(lab, 14, h * yy + 3);
  });

  // possession tint
  const poss = match.possH || 50;
  ctx.fillStyle = `rgba(100,180,255,${0.04 + (poss - 50) * 0.001})`;
  ctx.fillRect(m, h / 2, fw, fh / 2);
  ctx.fillStyle = `rgba(255,200,80,${0.04 + (50 - poss) * 0.001})`;
  ctx.fillRect(m, m, fw, fh / 2);

  drawFormLines(ctx, w, h, match.home, match.hForm, match.hXI, false, m, "rgba(255,255,255,0.22)");
  drawFormLines(ctx, w, h, match.away, match.aForm, match.aXI, true, m, "rgba(255,213,79,0.20)");

  drawTeam(ctx, w, h, match.home, match.hForm, match.hXI, false, "#ffffff", m, match.bobT || 0);
  drawTeam(ctx, w, h, match.away, match.aForm, match.aXI, true, "#ffd54f", m, match.bobT || 0);

  // ball + shadow + soft trail
  const bx = m + match.ball.x * fw;
  const by = m + match.ball.y * fh;
  match._ballTrail = match._ballTrail || [];
  match._ballTrail.push({ x: bx, y: by });
  if (match._ballTrail.length > 6) match._ballTrail.shift();
  match._ballTrail.forEach((pt, i) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2 + i * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.08 + i * 0.06})`;
    ctx.fill();
  });
  ctx.beginPath();
  ctx.ellipse(bx + 1, by + 4, 5, 2.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bx, by, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#f5f5f5";
  ctx.fill();
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // pentagon hint
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.arc(bx - 1, by - 1, 2.2, 0, Math.PI * 2);
  ctx.stroke();

  // minute progress bar
  const prog = clamp((match.minute || 0) / 90, 0, 1);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(m, h - 6, fw, 3);
  ctx.fillStyle = match.ended ? "#7dffa3" : "#40c4ff";
  ctx.fillRect(m, h - 6, fw * prog, 3);

  // score flash
  if (match.flash && match.flash.kind === "goal") {
    ctx.fillStyle = `rgba(0,200,83,${0.14 * (match.flash.t / 20)})`;
    ctx.fillRect(0, 0, w, h);
    // sparkles
    ctx.fillStyle = `rgba(255,255,255,${0.35 * (match.flash.t / 20)})`;
    for (let i = 0; i < 12; i++) {
      const ang = i * 0.52 + (match.bobT || 0) * 0.1;
      const rr = 30 + (20 - match.flash.t);
      ctx.fillRect(w / 2 + Math.cos(ang) * rr, h / 2 + Math.sin(ang) * rr, 3, 3);
    }
  } else if (match.flash && match.flash.kind === "chance") {
    ctx.fillStyle = `rgba(255,213,79,${0.09 * (match.flash.t / 12)})`;
    ctx.fillRect(0, 0, w, h);
  }

  // serie badge
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(w - 54, 12, 42, 16);
  ctx.fillStyle = "#cfe8d8";
  ctx.font = "bold 10px system-ui,sans-serif";
  ctx.fillText("Série " + serie, w - 50, 24);
}

function drawFormLines(ctx, w, h, club, form, xi, mirror, m, color) {
  const coords = FORM_POS[form] || FORM_POS["4-3-3"];
  const pts = (xi || []).map((id, i) => {
    let [px, py] = coords[i] || [0.5, 0.5];
    if (mirror) py = 1 - py;
    return { x: m + px * (w - 2 * m), y: m + py * (h - 2 * m) };
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  const sectors = [[], [], []];
  pts.forEach((pt, i) => {
    let [, py] = coords[i] || [0.5, 0.5];
    if (mirror) py = 1 - py;
    if (py >= 0.62) sectors[0].push(pt);
    else if (py >= 0.34) sectors[1].push(pt);
    else sectors[2].push(pt);
  });
  sectors.forEach(sec => {
    if (sec.length < 2) return;
    sec.sort((a, b) => a.x - b.x);
    ctx.beginPath();
    sec.forEach((pt, i) => { if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y); });
    ctx.stroke();
  });
}

const faceCache = {};
function getFace(src) {
  if (!src) return null;
  if (!faceCache[src]) {
    const im = new Image();
    im.src = src;
    faceCache[src] = im;
  }
  return faceCache[src];
}

function drawTeam(ctx, w, h, club, form, xi, mirror, border, m, bobT) {
  const coords = FORM_POS[form] || FORM_POS["4-3-3"];
  (xi || []).forEach((id, i) => {
    const p = playerById(club, id);
    let [px, py] = coords[i] || [0.5, 0.5];
    if (mirror) py = 1 - py;
    const bob = Math.sin((bobT * 0.16) + i * 0.7) * 2.4;
    const x = m + px * (w - 2 * m);
    const y = m + py * (h - 2 * m) + bob;
    const r = Math.max(12, Math.min(w, h) * 0.036);

    // shadow
    ctx.beginPath();
    ctx.ellipse(x + 1, y + r * 0.85, r * 0.75, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fill();

    // ring glow for human team
    if (S && club.id === S.clubId) {
      ctx.beginPath();
      ctx.arc(x, y, r + 2.5, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,200,83,0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    const img = getFace(p ? p.face : club.logo);
    if (img && img.complete && img.naturalWidth) {
      ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    } else {
      const col = (club.colors && club.colors[0]) || (mirror ? "#b8860b" : "#2a4a6a");
      ctx.fillStyle = col;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.fillStyle = "#fff";
      ctx.font = "bold " + Math.round(r * 0.9) + "px sans-serif";
      const num = (p && p.num) ? String(p.num) : String(i + 1);
      const tw = ctx.measureText(num).width;
      ctx.fillText(num, x - tw / 2, y + r * 0.32);
    }
    ctx.restore();

    // border
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = border;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // injury mark
    if (p && isInjured(p)) {
      ctx.beginPath();
      ctx.arc(x + r * 0.65, y - r * 0.65, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ff5252";
      ctx.fill();
    }

    // name plate
    if (p && h > 280) {
      const lab = p.name.split(" ").slice(-1)[0].slice(0, 9);
      ctx.font = "bold 9px system-ui,sans-serif";
      const tw = ctx.measureText(lab).width;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(x - tw / 2 - 3, y + r + 1, tw + 6, 12);
      ctx.fillStyle = "#fff";
      ctx.fillText(lab, x - tw / 2, y + r + 10);
    }
  });
}


// ---------- boot ----------
function bindGlobal() {
  const on = (sel, fn) => { const el = $(sel); if (el) el.onclick = fn; };
  on("#btnNew", () => { ui.pickClub = null; renderCreate(); });
  on("#btnContinue", () => {
    if (load()) { ui.tab = "home"; renderHub(); }
    else toast("Nenhum save.");
  });
  on("#btnBackMenu", renderMenu);
  on("#btnPrematchBack", () => { ui.tab = "home"; renderHub(); });
  const serieSel = $("#createSerie");
  if (serieSel) serieSel.onchange = renderCreate;
  on("#btnStartCareer", () => {
    if (!ui.pickClub) { toast("Escolha um clube"); return; }
    const name = (($("#mgrName") && $("#mgrName").value) || "Técnico").trim();
    newCareer(ui.pickClub, name);
    if (!S) return;
    ui.tab = "home";
    renderHub();
  });
  $$("#hubNav button").forEach(b => b.onclick = () => { ui.tab = b.dataset.tab; renderHub(); });

  $$("[data-cmd]").forEach(b => b.onclick = () => {
    if (!match || match.ended) return;
    const cmd = b.dataset.cmd;
    if (cmd === "sub") { openSubPanel(); return; }
    match.userCmd = cmd;
    $$("[data-cmd]").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
    setTimeout(() => b.classList.remove("on"), 350);
  });
  on("#btnSpeed", () => {
    if (!match) return;
    match.speed = match.speed >= 3 ? 1 : (match.speed || 1) + 1;
    const sp = $("#btnSpeed");
    if (sp) sp.textContent = match.speed + "x";
  });
  on("#btnPause", () => {
    if (!match) return;
    match.paused = !match.paused;
    const pb = $("#btnPause");
    if (pb) pb.textContent = match.paused ? "▶" : "⏸";
  });
}

function boot() {
  if (!window.CLUBS_DATA) {
    document.body.innerHTML = "<p style='padding:20px;color:#fff'>Erro: clubs-data.js não carregou. Abra o index.html de dentro da pasta Brasileirao.</p>";
    return;
  }
  DATA = window.CLUBS_DATA;
  if (!Array.isArray(DATA.clubs)) {
    document.body.innerHTML = "<p style='padding:20px;color:#fff'>Erro: clubs-data em formato inválido (esperado array).</p>";
    return;
  }
  // ensure logo paths & xi
  DATA.clubs.forEach(c => {
    if (!c.logo) c.logo = "assets/img/logos/" + c.id + ".png";
    if (!c.short) c.short = (c.name || c.id).slice(0, 3).toUpperCase();
    if (!c.formation) c.formation = "4-3-3";
    if (!c.mentality) c.mentality = "normal";
    (c.squad || []).forEach(p => {
      p.energy = p.energy != null ? p.energy : 100;
      p.form = p.form != null ? p.form : 5;
      p.value = Math.round(p.value || 0);
      p.ovr = Math.round(p.ovr || 60);
      p.goals = p.goals || 0;
      p.apps = p.apps || 0;
    });
    ensureSquadBalance(c);
    if (!c.xi || c.xi.length !== 11) rebalanceXI(c);
    else {
      // drop dead ids from xi
      c.xi = c.xi.filter(id => (c.squad || []).some(p => p.id === id));
      if (c.xi.length !== 11) rebalanceXI(c);
    }
  });
  bindGlobal();
  renderMenu();
  console.log("[Brasileirão]", VERSION, "clubes", DATA.clubs.length, "file:// ok");
}

document.addEventListener("DOMContentLoaded", boot);
})();
