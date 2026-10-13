/* Postes, clients et factures. Dépend de index.html (S, $, esc, save, render, pad, dkey, dur) et de invoice.js */
S.clients = Array.isArray(S.clients) ? S.clients : [];
S.invoices = Array.isArray(S.invoices) ? S.invoices : [];
S.nextNo = S.nextNo || 13;
S.me = S.me || { name: 'Erik Guertin', lines: ['Canada'] };
S.positions = Array.isArray(S.positions) ? S.positions : [
  { id: 'p1', title: 'Technicien Audiovisuel', rate: 32 },
  { id: 'p2', title: 'Gestionnaire de projets', rate: 32 },
  { id: 'p3', title: 'Gestionnaire TI', rate: 115 }];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const fd = s => { const [y, m, d] = s.split('-'); return (+d) + ' ' + MOIS[m - 1] + ' ' + y; };
const fdate = t => { const d = new Date(t); return d.getDate() + ' ' + MOIS[d.getMonth()] + ' ' + d.getFullYear(); };
const hh = t => { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
let RND = 0.25;
const nfr = n => String(n).replace('.', ',');
const qty = l => { const h = dur(l) / 36e5; if (!(h > 0)) return 0; return RND >= 0.25 ? Math.max(RND, Math.round(h / RND) * RND) : +h.toFixed(2); };
const kmRate = () => { const r = parseFloat($('i-kmr').value); return r >= 0 ? r : 0.67; };
const money = n => invoiceFR.money(n);

/* ---------- Onglets ---------- */
function showView(v) {
  ['h', 'f', 'c'].forEach(k => $('v-' + k).hidden = k !== v);
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  $('add').hidden = v !== 'h';
}
$('tabs').onclick = e => { const b = e.target.closest('button'); if (b) showView(b.dataset.v); };

/* ---------- Postes ---------- */
function fillPos(id, entry) {
  const sel = $(id);
  if (entry && entry.pos && !S.positions.some(p => p.title === entry.pos && p.rate === entry.rate))
    S.positions.push({ id: 'p' + Date.now().toString(36), title: entry.pos, rate: +entry.rate || 0 });
  let cur = '';
  if (entry && entry.pos) cur = (S.positions.find(p => p.title === entry.pos && p.rate === entry.rate) || {}).id || '';
  else if (!entry && S.positions.some(p => p.id === S.lastPos)) cur = S.lastPos;
  sel.innerHTML = '<option value="">Choisir le poste…</option>' + S.positions.map(p => '<option value="' + p.id + '">' + esc(p.title) + ' — ' + p.rate + ' $/h</option>').join('') + '<option value="__new">Sur mesure…</option>';
  sel.value = cur; $(id + '-c').hidden = true;
}
function pickPos(id, required) {
  const v = $(id).value;
  if (v === '__new') {
    const t = $(id + '-n').value.trim(), r = parseFloat($(id + '-r').value);
    if (!t || isNaN(r) || r < 0) { alert('Nom du poste et taux horaire requis'); return null; }
    let p = S.positions.find(x => x.title.toLowerCase() === t.toLowerCase() && x.rate === r);
    if (!p) { p = { id: 'p' + Date.now().toString(36), title: t, rate: r }; S.positions.push(p); }
    S.lastPos = p.id; return p;
  }
  if (!v) { if (required) { alert('Choisis un poste'); return null; } return { empty: true }; }
  S.lastPos = v; return S.positions.find(x => x.id === v);
}
['pos', 'e-pos'].forEach(id => $(id).onchange = () => { $(id + '-c').hidden = $(id).value !== '__new'; });

/* ---------- Affichage ---------- */
let posSig = -1;
function afterRender() {
  if (posSig !== S.positions.length) { fillPos('pos', null); posSig = S.positions.length; }
  $('pos').disabled = !!S.run;
  if (S.run) { $('pos-c').hidden = true; const p = S.positions.find(x => x.title === S.run.pos && x.rate === S.run.rate); if (p) $('pos').value = p.id; }
  drawInvoices(); drawClients();
}
function drawInvoices() {
  const L = [...S.invoices].sort((a, b) => b.no - a.no);
  $('finv').innerHTML = L.length ? L.map(i => '<div class="row" data-inv="' + i.id + '"><div><p>Facture ' + esc(i.no) + ' · ' + esc(i.to.name) + '</p><small>' + fd(i.date) + '</small></div><div class="d">' + money(i.total) + '</div></div>').join('') : '<p class="empty">Aucune facture. Appuie sur « Nouvelle facture ».</p>';
}
function drawClients() {
  const known = S.clients.map(c => c.name.toLowerCase());
  const loose = [...new Set(S.logs.map(l => (l.client || '').trim()).filter(n => n && !known.includes(n.toLowerCase())))];
  $('fcl').innerHTML = (S.clients.map(c => '<div class="row" data-cid="' + c.id + '"><div><p>' + esc(c.name) + '</p><small>' + esc([c.contact, c.a1, c.a2].filter(Boolean).join(' · ') || 'Aucun détail') + '</small></div></div>').join('') +
    (loose.length ? '<p class="hint">Vus dans tes heures, sans fiche :</p>' + loose.map(n => '<div class="row" data-new="' + esc(n) + '"><div><p>' + esc(n) + '</p><small>Toucher pour créer la fiche</small></div></div>').join('') : '')) || '<p class="empty">Aucun client. Crée ta première fiche.</p>';
}
$('finv').onclick = e => { const r = e.target.closest('.row'); if (r) openPreview(r.dataset.inv); };

/* ---------- Clients ---------- */
const CF = ['name', 'contact', 'a1', 'a2', 'a3', 'email', 'phone']; let CID = null;
function openClient(id, pre) {
  CID = id; const c = S.clients.find(x => x.id === id) || { name: pre || '' };
  $('c-t').textContent = id ? 'Modifier le client' : 'Nouveau client';
  CF.forEach(f => $('c-' + f).value = c[f] || '');
  $('c-d').hidden = !id; $('cdlg').showModal();
}
$('nc').onclick = () => openClient(null);
$('fcl').onclick = e => { const r = e.target.closest('.row'); if (!r) return; r.dataset.cid ? openClient(r.dataset.cid) : openClient(null, r.dataset.new); };
$('c-x').onclick = () => $('cdlg').close();
$('c-ok').onclick = () => {
  const v = {}; CF.forEach(f => v[f] = $('c-' + f).value.trim());
  if (!v.name) return alert('Le nom est requis');
  if (S.clients.some(c => c.id !== CID && c.name.toLowerCase() === v.name.toLowerCase())) return alert('Un client porte déjà ce nom');
  if (CID) { const c = S.clients.find(x => x.id === CID); if (c.name !== v.name) S.logs.forEach(l => { if ((l.client || '').trim() === c.name) l.client = v.name; }); Object.assign(c, v); }
  else S.clients.push(Object.assign({ id: 'c' + Date.now().toString(36) }, v));
  save(); $('cdlg').close(); render();
};
$('c-d').onclick = () => { if (confirm('Supprimer ce client? Tes heures et factures restent.')) { S.clients = S.clients.filter(c => c.id !== CID); save(); $('cdlg').close(); render(); } };

/* ---------- Profil ---------- */
$('prof').onclick = () => { $('p-name').value = S.me.name; [1, 2, 3].forEach(i => $('p-a' + i).value = S.me.lines[i - 1] || ''); $('pdlg').showModal(); };
$('p-x').onclick = () => $('pdlg').close();
$('p-ok').onclick = () => {
  const n = $('p-name').value.trim(); if (!n) return alert('Le nom est requis');
  S.me = { name: n, lines: [1, 2, 3].map(i => $('p-a' + i).value.trim()).filter(Boolean) }; save(); $('pdlg').close();
};

/* ---------- Nouvelle facture ---------- */
const matchLogs = c => { const n = c.name.trim().toLowerCase(); return S.logs.filter(l => (l.client || '').trim().toLowerCase() === n && !l.inv).sort((a, b) => a.start - b.start); };
function openBuilder() {
  if (!S.clients.length) return alert("Crée d'abord un client (onglet Clients).");
  $('i-cl').innerHTML = S.clients.map(c => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('');
  $('i-no').value = S.nextNo; RND = 0.25; $('i-rnd').value = '0.25'; $('i-km').checked = false; $('i-kmr').value = '0.67'; const t = new Date(), u = new Date(); u.setDate(u.getDate() + 21);
  $('i-d').value = dkey(t.getTime()); $('i-due').value = dkey(u.getTime());
  fillList(); $('idlg').showModal();
}
function fillList() {
  const c = S.clients.find(x => x.id === $('i-cl').value), L = matchLogs(c);
  $('i-list').innerHTML = L.length ? L.map(l => { const ok = l.pos && l.rate != null;
    return '<label class="chk"><input type="checkbox" data-id="' + l.id + '"' + (ok ? ' checked' : ' disabled') + '><span>' + esc(fdate(l.start)) + ' · ' + hh(l.start) + '–' + hh(l.end) + ' · ' + nfr(qty(l)) + ' h' + (l.km > 0 ? ' · ' + nfr(l.km) + ' km' : '') + '<br><small>' + (ok ? esc(l.pos) + ' · ' + money(Math.round(qty(l) * l.rate * 100) / 100) : 'poste manquant — assigne-le dans Heures') + '</small></span></label>'; }).join('') : '<p class="hint">Aucune entrée non facturée pour ce client.</p>';
  sumList();
}
function sumList() {
  const L = [...$('i-list').querySelectorAll('input:checked')].map(i => S.logs.find(x => x.id === i.dataset.id)), withKm = L.filter(l => l.km > 0), kmOn = $('i-km').checked && withKm.length > 0;
  $('i-kmw').hidden = !withKm.length; $('i-kmrw').hidden = !kmOn;
  const km = withKm.reduce((a, l) => a + l.km, 0);
  $('i-kmt').textContent = withKm.length ? nfr(+km.toFixed(1)) + ' km sur ' + withKm.length + ' entrée(s)' + (kmOn ? '' : ' — non facturé') : '';
  let h = 0, t = 0; L.forEach(l => { h += qty(l); t += Math.round(qty(l) * l.rate * 100) / 100; });
  if (kmOn) withKm.forEach(l => { t += Math.round(l.km * kmRate() * 100) / 100; });
  $('i-sum').textContent = L.length ? L.length + ' entrée(s) · ' + nfr(+h.toFixed(2)) + ' h' + (kmOn ? ' + ' + nfr(+km.toFixed(1)) + ' km' : '') + ' · ' + money(t) : '';
}
$('nf').onclick = openBuilder; $('i-cl').onchange = fillList; $('i-list').onchange = sumList; $('i-km').onchange = sumList; $('i-kmr').oninput = sumList; $('i-rnd').onchange = () => { RND = parseFloat($('i-rnd').value); fillList(); }; $('i-x').onclick = () => $('idlg').close();
$('i-ok').onclick = () => {
  const c = S.clients.find(x => x.id === $('i-cl').value), ids = [...$('i-list').querySelectorAll('input:checked')].map(i => i.dataset.id);
  if (!ids.length) return alert('Sélectionne au moins une entrée');
  const no = parseInt($('i-no').value, 10); if (!(no > 0)) return alert('Numéro de facture invalide');
  if (!$('i-d').value || !$('i-due').value) return alert('Dates requises');
  if (S.invoices.some(i => i.no === no) && !confirm('Une facture ' + no + ' existe déjà. Continuer?')) return;
  const logs = ids.map(id => S.logs.find(l => l.id === id));
  const kmOn = $('i-km').checked, kr = kmRate(), items = [];
  logs.forEach(l => { items.push({ title: l.pos, desc: (l.note ? l.note + ' ' : '') + fdate(l.start) + ' ' + hh(l.start) + '@' + hh(l.end), qty: qty(l), price: l.rate, logId: l.id }); if (kmOn && l.km > 0) items.push({ title: 'Kilométrage', desc: 'Déplacement ' + fdate(l.start), qty: +l.km, price: kr, logId: l.id, km: true }); });
  const inv = { id: 'i' + Date.now().toString(36), no, date: $('i-d').value, due: $('i-due').value, to: { name: c.name, lines: [c.contact, c.a1, c.a2, c.a3].filter(Boolean) }, from: JSON.parse(JSON.stringify(S.me)), items,
    total: Math.round(items.reduce((a, i) => a + Math.round(i.qty * i.price * 100) / 100, 0) * 100) / 100 };
  logs.forEach(l => { l.inv = no; l.invId = inv.id; });
  S.invoices.push(inv); S.nextNo = Math.max(S.nextNo, no + 1); save(); $('idlg').close(); render(); openPreview(inv.id);
};

/* ---------- Aperçu, impression / PDF ---------- */
let PV = null;
const pagesOf = inv => invoiceSVGs({ number: String(inv.no), date: fd(inv.date), due: fd(inv.due), currency: 'CAD', from: inv.from, to: inv.to, items: inv.items }, invoiceFR);
function openPreview(id) {
  PV = S.invoices.find(i => i.id === id); if (!PV) return;
  $('pv-t').textContent = 'Facture ' + PV.no; $('pv-p').innerHTML = pagesOf(PV).map(s => '<div class="sheet">' + s + '</div>').join('');
  $('pv').hidden = false; document.body.style.overflow = 'hidden';
}
function closePreview() { $('pv').hidden = true; document.body.style.overflow = ''; }
$('pv-x').onclick = closePreview;
$('pv-d').onclick = () => {
  if (!confirm('Supprimer la facture ' + PV.no + '? Les entrées redeviennent non facturées.')) return;
  S.logs.forEach(l => { if (l.invId === PV.id) { delete l.inv; delete l.invId; } });
  S.invoices = S.invoices.filter(i => i.id !== PV.id); save(); render(); closePreview();
};
function printInv(inv) {
  $('printArea').innerHTML = pagesOf(inv).map(s => '<div class="pg">' + s + '</div>').join('');
  const t = document.title; document.title = 'Facture_' + inv.no + '_' + inv.date;
  Promise.all([document.fonts.load('400 10px Figtree'), document.fonts.load('700 10px Figtree')]).catch(() => {}).then(() => { window.print(); setTimeout(() => { document.title = t; }, 4000); });
}
$('pv-pr').onclick = () => printInv(PV);

showView('h'); render();
