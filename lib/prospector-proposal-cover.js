// Derived from prospector-proposta/references/capa-proposta-template.html.
// This is a private, on-demand cover; it never promotes a factual preview to published work.
const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const httpUrl = (value) => { try { const url = new URL(String(value)); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; } };
const list = (value) => Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()).slice(0, 12) : [];

function renderDiagnosis(criteria) {
  const items = Array.isArray(criteria) ? criteria.slice(0, 12) : [];
  if (!items.length) return "";
  return `<section class="artifact"><div class="kicker">Diagnóstico factual</div><h2>O que foi observado</h2><div class="artifact-grid">${items.map((item) => {
    if (typeof item === "string") return `<article class="artifact-card"><p>${escape(item)}</p></article>`;
    const title = item && typeof item === "object" ? (item.label || item.criterion || item.name || "Observação") : "Observação";
    const detail = item && typeof item === "object" ? (item.detail || item.value || item.note || item.observation || "") : "";
    return `<article class="artifact-card"><b>${escape(title)}</b>${detail ? `<p>${escape(detail)}</p>` : ""}</article>`;
  }).join("")}</div></section>`;
}

function renderSocial(items) {
  const audits = Array.isArray(items) ? items.slice(0, 4) : [];
  if (!audits.length) return "";
  return `<section class="artifact"><div class="kicker">Direção social</div><h2>Presença atual e direção proposta</h2><div class="artifact-grid">${audits.map((audit) => {
    const platform = escape(audit?.platform || "social");
    const user = escape(audit?.username || "");
    const notes = escape(audit?.factual_notes || audit?.consistency_note || "");
    const recommendation = escape(audit?.recommendation || "");
    const direction = escape(audit?.creative_direction || "");
    return `<article class="artifact-card"><b>${platform}${user ? ` · ${user}` : ""}</b>${notes ? `<p><strong>Observado:</strong> ${notes}</p>` : ""}${recommendation ? `<p><strong>Recomendação:</strong> ${recommendation}</p>` : ""}${direction ? `<p><strong>Direção criativa:</strong> ${direction}</p>` : ""}</article>`;
  }).join("")}</div></section>`;
}

export function renderProspectorProposalCover({ clientName, previewUrl, oldUrl, author, identity, whatsapp, diagnosisCriteria = [], socialAudits = [] }) {
  const current = httpUrl(previewUrl) || String(previewUrl || ""), old = httpUrl(oldUrl), phone = String(whatsapp ?? "").replace(/\D/g, "");
  const action = /^55\d{10,11}$/.test(phone) ? `<a class="btn" href="https://wa.me/${phone}?text=${encodeURIComponent(`Olá, ${author || "DattaSeller"}. Vi o preview assistido e quero conversar.`)}" target="_blank" rel="noopener">Conversar no WhatsApp</a>` : `<span class="btn disabled">Contato depende de configuração do operador</span>`;
  const diagnosis = renderDiagnosis(diagnosisCriteria);
  const social = renderSocial(socialAudits);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Preview assistido — ${escape(clientName)}</title><style>:root{--bg:#faf9f5;--ink:#1f1e1d;--muted:#6b6963;--acc:#c15f3c;--card:#fff;--line:#e6e2d8}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.wrap{max-width:1100px;margin:auto;padding:0 20px}.stage{width:min(1560px,96vw);margin:auto}header{padding:56px 0 36px;text-align:center}.kicker{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--acc);font-weight:700}h1{font-family:Georgia,serif;font-size:clamp(28px,4.5vw,44px);margin:14px 0}.sub{color:var(--muted);max-width:680px;margin:auto}.autor{color:var(--muted);margin-top:20px}.toggle{display:flex;justify-content:center;margin:32px 0 18px}.toggle button{padding:12px 28px;border:1px solid var(--line);background:var(--card);cursor:pointer}.toggle .on{background:var(--ink);color:#fff}.frame{background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(31,30,29,.08)}.bar{padding:10px 16px;background:#f4f2ec;color:var(--muted);font-size:12px}iframe{display:block;width:100%;height:80vh;min-height:520px;border:0;background:#fff}.hide{display:none}.artifact{max-width:1100px;margin:52px auto 0;padding:0 20px}.artifact h2{font-family:Georgia,serif;font-size:clamp(26px,4vw,38px);margin:8px 0 22px}.artifact-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.artifact-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px}.artifact-card p{margin:8px 0 0;color:var(--muted)}.cta{text-align:center;padding:42px 0 64px}.btn{display:inline-block;background:var(--acc);color:#fff;text-decoration:none;font-weight:700;padding:15px 28px;border-radius:12px}.disabled{background:#9b968d}@media(max-width:760px){.artifact-grid{grid-template-columns:1fr}}</style></head><body><div class="wrap"><header><div class="kicker">Preview assistido para</div><h1>${escape(clientName)}</h1><p class="sub">Esta página reúne o preview, o diagnóstico factual e a direção social vinculados à proposta. Nada aqui substitui revisão humana nem publica serviços, métricas ou alegações não confirmadas.</p><div class="autor">Preparado por <b>${escape(author || "DattaSeller")}</b>${identity ? ` · ${escape(identity)}` : ""}</div></header></div><div class="stage"><div class="toggle">${old ? '<button id="before">Site atual</button>' : ""}<button id="after" class="on">Preview assistido</button></div><div class="frame"><div class="bar" id="label">${escape(current)}</div>${old ? `<iframe id="old" class="hide" data-src="${escape(old)}" title="Site atual"></iframe>` : ""}<iframe id="new" src="${escape(current)}" title="Preview assistido"></iframe></div></div>${diagnosis}${social}<div class="wrap"><div class="cta"><p>Se o conteúdo revisado fizer sentido, o próximo passo é uma conversa com o operador.</p>${action}</div></div><script>var b=document.getElementById('before'),a=document.getElementById('after'),o=document.getElementById('old'),n=document.getElementById('new'),l=document.getElementById('label');if(b){b.onclick=function(){if(!o.src)o.src=o.dataset.src;o.classList.remove('hide');n.classList.add('hide');b.classList.add('on');a.classList.remove('on');l.textContent=o.dataset.src};a.onclick=function(){o.classList.add('hide');n.classList.remove('hide');a.classList.add('on');b.classList.remove('on');l.textContent=n.src}}</script></body></html>`;
}
