// Clearday front end - vanilla JS, no build step.
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const gbp = n => "£" + Math.round(n).toLocaleString("en-GB");
const api = (p, body) => fetch(p, body ? {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)} : {}).then(r => r.json());
const AREA = {ap: "Bills and spend", recon: "Bookkeeping", cash: "Cash and runway", close: "Month-end close", board: "Reporting", entity: "Multi-entity"};
let S = {approver: "p_founder", home: null, open: null, history: []};

function sky() {
  const h = new Date().getHours(), el = $("#sky");
  el.className = "sky"; // Hark daytime sky, always
  const part = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  return part;
}

async function load(animate) {
  const d = await api("/api/home");
  S.home = d;
  const part = sky();
  const need = d.cards.filter(c => c.needs_approval && !c.waiting_for).length;
  $("#hello").innerHTML = `Good ${part}, Dinesh. <em>${need} ${need === 1 ? "thing needs" : "things need"} you.</em>`;
  $("#sub").textContent = `I checked ${d.company.name}'s ${d.counts ? "" : ""}bills, payments, cards and accounts across the UK and Ireland. Runway ${d.runway.months} months.`;
  $("#src").innerHTML = `<span class="dot"></span>Seapoint sandbox · synced ${esc(d.company.synced_at.split(", ")[1] || d.company.synced_at)}`;
  $("#ai").textContent = d.mode.claude ? `Claude · ${d.mode.model}` : "Claude off · local answers";
  $("#who").innerHTML = d.people.map(p => `<button class="${p.id === S.approver ? "on" : ""}" data-p="${p.id}" title="Approves up to ${gbp(p.approval_limit)}">${esc(p.name.split(" ")[0])} · ${gbp(p.approval_limit / 1000)}k</button>`).join("");
  const steps = $("#steps");
  steps.innerHTML = d.steps.map(s => `<li>${esc(s.label)} <b>${s.found}</b></li>`).join("");
  const lis = [...steps.children];
  if (animate) lis.forEach((li, i) => setTimeout(() => li.classList.add("done"), 180 * i + 150));
  else lis.forEach(li => li.classList.add("done"));
  renderCards(d.cards, animate ? 180 * lis.length + 200 : 0);
  renderOutbox(d.outbox);
}

function renderCards(cards, delay) {
  const el = $("#cards");
  const draw = () => el.innerHTML = cards.map(c => `
    <article class="card" data-id="${esc(c.id)}" tabindex="0">
      <div class="meta"><span class="area">${AREA[c.area] || c.area}</span><span class="risk ${c.risk}">${c.risk === "high" ? "Needs care" : c.risk === "medium" ? "Worth a look" : "Routine"}</span>
        ${c.deadline_days <= 0 ? `<span>${c.deadline_days < 0 ? "Overdue" : "Due today"}</span>` : c.deadline_days <= 7 ? `<span>Due in ${c.deadline_days} days</span>` : ""}</div>
      <h3>${esc(c.title)}</h3>
      <p>${esc(c.reason)}</p>
      <div class="act">
        ${c.at_stake ? `<span class="amt">${gbp(c.at_stake)}</span>` : ""}
        ${c.waiting_for ? `<span class="wait">Waiting for ${esc(c.waiting_for.split(" ")[0])}</span>` : ""}
        <button class="btn ${c.needs_approval ? "primary" : ""} sm">${esc(c.waiting_for ? "Approve as " + c.waiting_for.split(" ")[0] : c.verb)}</button>
      </div>
    </article>`).join("") || `<div class="panel"><h2 class="title">All clear.</h2><p class="muted">Nothing needs you right now.</p></div>`;
  delay ? setTimeout(draw, delay) : draw();
}

function renderOutbox(ob) {
  $("#outbox").innerHTML = ob.length ? ob.map(o => `<li><b>${esc(o.title)}</b><br><code>${esc(o.tool)}</code> · approved by ${esc(o.approved_by)} at ${esc(o.at)} · <span class="muted">${esc(o.status)}</span></li>`).join("")
    : `<li class="muted sm">Nothing queued.</li>`;
}

function openCard(id) {
  const c = S.home.cards.find(x => x.id === id);
  if (!c) return;
  S.open = c;
  const asWho = c.waiting_for ? S.home.people.find(p => p.name === c.waiting_for) : S.home.people.find(p => p.id === S.approver);
  $("#sheet").innerHTML = `
    <button class="close-btn" aria-label="Close" onclick="closeSheet()">×</button>
    <div class="meta label">${AREA[c.area]} · <span class="risk ${c.risk}">${c.risk}</span></div>
    <h2>${esc(c.title)}</h2>
    <p class="muted">${esc(c.reason)}</p>
    <div class="sec"><h4>Evidence</h4><ul class="ev">${c.evidence.map(e => `<li>${esc(e)}</li>`).join("")}</ul></div>
    <div class="sec"><h4>What I'll do</h4><ol class="plan">${c.plan.map(p => `<li>${esc(p)}</li>`).join("")}</ol></div>
    ${c.seapoint ? `<div class="sec"><h4>Seapoint change</h4><ul class="ev"><li>${esc(c.seapoint.tool)}(${esc(JSON.stringify(c.seapoint.args))})</li></ul></div>` : ""}
    <div class="sec" id="gchecks"></div>
    <div class="row">
      <button class="btn primary" id="go">${esc(c.needs_approval ? `${c.verb} as ${asWho.name.split(" ")[0]}` : c.verb)}</button>
      <button class="btn" id="later">Not now</button>
    </div>`;
  $("#go").onclick = () => act(c, asWho.id);
  $("#later").onclick = async () => { await api("/api/snooze", {card: c.id}); closeSheet(); toast("Snoozed until tomorrow."); load(); };
  $("#scrim").classList.add("on"); $("#sheet").classList.add("on"); $("#sheet").setAttribute("aria-hidden", "false");
}
function closeSheet() { $("#scrim").classList.remove("on"); $("#sheet").classList.remove("on"); $("#sheet").setAttribute("aria-hidden", "true"); }

async function act(c, approver) {
  if (c.action.type === "open") { closeSheet(); return show(c.action.view); }
  if (c.action.type === "board_pack") { closeSheet(); show("board"); return makePack(); }
  $("#go").disabled = true; $("#go").textContent = "Checking…";
  const r = await api("/api/act", {card: c.id, approver});
  $("#gchecks").innerHTML = `<h4>Guard checks</h4><ul class="checks">${(r.checks || []).map(k => `<li><span class="${k.ok ? "ok" : "no"}">${k.ok ? "✓" : "✕"}</span><span>${esc(k.rule)} <span class="muted">· ${esc(k.detail)}</span></span></li>`).join("")}</ul>`;
  if (r.status === "done") { toast(r.message); setTimeout(() => { closeSheet(); load(); }, 1100); }
  else if (r.status === "routed") { toast(`Over your limit - sent to ${r.to} for approval.`); $("#go").textContent = `Sent to ${r.to.split(" ")[0]}`; setTimeout(() => { closeSheet(); load(); }, 1600); }
  else { toast("Blocked by the guard - see the checks."); $("#go").textContent = "Blocked"; }
}

function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("on"), 3200); }

function show(v) {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("on", t.dataset.v === v));
  document.querySelectorAll(".view").forEach(x => x.classList.toggle("on", x.id === "v-" + v));
  if (v === "close") loadClose(); if (v === "cash") loadCash(); if (v === "log") loadLog();
}

async function loadClose() {
  const d = await api("/api/close"), done = d.items.filter(i => i.done).length;
  $("#close").innerHTML = `<h2 class="title">${esc(d.month)} close</h2><p class="muted">${done} of ${d.items.length} ready. Following Seapoint's month-end playbook: drafts only, your accountant posts.</p>
    <ul class="cl">${d.items.map(i => `<li><span class="tick ${i.done ? "y" : ""}">${i.done ? "✓" : ""}</span><span>${esc(i.label)}${!i.done && i.note ? ` <span class="muted">· ${esc(i.note)}</span>` : ""}</span></li>`).join("")}</ul>`;
}

async function loadCash(extra) {
  const d = await api("/api/cash");
  const max = Math.max(...d.burn.net);
  $("#cash").innerHTML = `<h2 class="title">Cash and runway</h2>
    <div class="kpis"><div class="kpi"><small>Group cash</small><b>${gbp(d.cash.total)}</b></div><div class="kpi"><small>Operating</small><b>${gbp(d.cash.operating)}</b></div>
    <div class="kpi"><small>Treasury</small><b>${gbp(d.cash.treasury)}</b></div><div class="kpi"><small>Net burn</small><b>${gbp(d.runway.burn)}/mo</b></div>
    <div class="kpi"><small>Runway</small><b>${d.runway.months} mo</b></div><div class="kpi"><small>Cash lasts to</small><b>${esc(d.runway.zero_date)}</b></div></div>
    <h3 class="label">Net burn by month (UK + IE)</h3>
    <div class="bars">${d.burn.net.map((n, i) => `<div class="bar" style="height:${Math.round(100 * n / max)}%"><em>${gbp(n / 1000)}k</em><span>${d.burn.months[i].slice(5)}</span></div>`).join("")}</div>
    <h3 class="label" style="margin-top:32px">What if we hire?</h3>
    <input type="range" min="0" max="10" value="0" id="hires"><p id="wi" class="muted">Move the slider: each hire costs about £8,500 a month.</p>
    <h3 class="label" style="margin-top:20px">Accounts</h3>
    <table><tr><th>Account</th><th>Entity</th><th style="text-align:right">Balance</th></tr>${d.accounts.map(a => `<tr><td>${esc(a.name)}</td><td>${a.entity === d.entities[0].id ? "UK" : "IE"}</td><td class="n">${a.currency} ${Math.round(a.balance).toLocaleString("en-GB")}</td></tr>`).join("")}</table>`;
  $("#hires").oninput = async e => {
    const n = +e.target.value, r = await api("/api/whatif", {extra_monthly: n * 8500});
    $("#wi").innerHTML = n ? `<b>${n} hire${n > 1 ? "s" : ""}</b>: burn ${gbp(r.after.burn)}/mo, runway <b>${r.after.months} months</b> (to ${r.after.zero_date}), down from ${r.before.months}.` : "Move the slider: each hire costs about £8,500 a month.";
  };
}

async function makePack() {
  $("#pack").innerHTML = `<p class="muted">Drafting from both Seapoint organisations…</p>`;
  const p = await api("/api/board");
  $("#pack").innerHTML = `<div class="kpis">${p.kpis.map(([k, v]) => `<div class="kpi"><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join("")}</div>
    <h3 class="label">Narrative</h3><p>${esc(p.narrative)}</p>
    <h3 class="label">September vs August</h3><table><tr><th>Category</th><th style="text-align:right">Aug</th><th style="text-align:right">Sep</th><th style="text-align:right">Change</th></tr>
    ${p.variance.map(v => `<tr><td>${esc(v.category)}</td><td class="n">${gbp(v.aug)}</td><td class="n">${gbp(v.sep)}</td><td class="n">${v.change > 0 ? "+" : ""}${gbp(v.change)}</td></tr>`).join("")}</table>`;
  load();
}

async function loadLog() {
  const d = await api("/api/audit");
  $("#log").innerHTML = d.map(e => `<li>${esc(e.what)}<small>${esc(e.at)} · ${esc(e.actor)}${e.approver ? " · approved by " + esc(e.approver) : ""}${e.money ? " · " + gbp(e.money) : ""} · ${esc(e.detail)}</small></li>`).join("");
}

$("#cards").addEventListener("click", e => { const c = e.target.closest(".card"); if (c) openCard(c.dataset.id); });
$("#cards").addEventListener("keydown", e => { if (e.key === "Enter") { const c = e.target.closest(".card"); if (c) openCard(c.dataset.id); } });
$("#scrim").onclick = closeSheet;
document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });
document.querySelectorAll(".tab").forEach(t => t.onclick = () => show(t.dataset.v));
$("#who").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { S.approver = b.dataset.p; load(); } });
$("#mkpack").onclick = makePack;
document.querySelectorAll(".chip").forEach(c => c.onclick = () => { $("#q").value = c.textContent; $("#askf").requestSubmit(); });
$("#askf").onsubmit = async e => {
  e.preventDefault();
  const q = $("#q").value.trim(); if (!q) return;
  $("#ans").innerHTML = `<span class="muted">Looking at the books…</span>`;
  const r = await api("/api/ask", {q, history: S.history});
  S.history.push({role: "user", content: q}, {role: "assistant", content: r.answer});
  $("#ans").innerHTML = esc(r.answer) + (r.trace?.length ? `<div class="trace">${r.trace.map(t => esc(t.tool)).join(" → ")}</div>` : "");
};
load(true);
