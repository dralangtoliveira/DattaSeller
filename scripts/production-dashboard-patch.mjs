import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function applyProductionDashboardPatch(input) {
let html = input;

function replaceRequired(source, expected, replacement, description) {
  if (!source.includes(expected)) {
    throw new Error(`dashboard.html sem alvo esperado: ${description}; patch de produção não aplicado`);
  }
  return source.replace(expected, replacement);
}

function requireTarget(source, expected, description) {
  if (!source.includes(expected)) {
    throw new Error(`dashboard.html sem alvo esperado: ${description}; patch de produção não aplicado`);
  }
  return source;
}

function replaceRegexRequired(source, pattern, replacement, description) {
  if (!pattern.test(source)) {
    throw new Error(`dashboard.html sem alvo esperado: ${description}; patch de produção não aplicado`);
  }
  return source.replace(pattern, replacement);
}

html = replaceRequired(
  html,
  "<title>DattaSeller — Painel comercial local</title>",
  "<title>DattaSeller — CRM Comercial</title>",
  "título da POC"
);
// Guard de modo arquivo da POC: existe para o arquivo histórico e NÃO pode
// existir na aplicação servida (aqui ele é removido por inteiro, com alvo
// obrigatório para o patch falhar fechado se o marcador desaparecer).
html = requireTarget(html, "<!-- POC-FILE-GUARD-START -->", "marcador inicial do guard de arquivo da POC");
html = requireTarget(html, "<!-- POC-FILE-GUARD-END -->", "marcador final do guard de arquivo da POC");
html = replaceRegexRequired(
  html,
  /<!-- POC-FILE-GUARD-START -->[\s\S]*?<!-- POC-FILE-GUARD-END -->/,
  "",
  "guard de modo arquivo da POC"
);
html = replaceRequired(
  html,
  "<span>operação comercial local</span>",
  "<span>CRM comercial</span>",
  "rótulo de operação local no logo"
);
// O indicador "modo arquivo" era escondido só por CSS: o texto (e o title da POC)
// ficavam no HTML servido e podiam aparecer antes do CSS do patch. O elemento é
// preservado para o script base, mas sem nenhum resíduo de POC.
html = replaceRegexRequired(
  html,
  /<span class="modo file" id="modo"[^>]*>[^<]*<\/span>/,
  '<span class="modo" id="modo">conectando</span>',
  "indicador de modo arquivo da POC"
);
html = replaceRequired(
  html,
  "Baseado no Prospector. Contatos, envio de propostas, publicação e checkout exigem confirmação humana.",
  "CRM comercial Datta. Operação autenticada e persistida no servidor.",
  "aviso operacional da POC"
);
// O boot da POC renderizava o estado local e disparava dsLoad() antes deste patch
// existir. O artefato de CRM entra em estado de sincronização usando o MESMO menu
// canônico (NAV_CANONICO), sem exibir dado local/fixture como se fosse real.
html = replaceRequired(
  html,
  "render();dsLoad();",
  String.raw`nav();document.getElementById("view").innerHTML="<div class=\"painel\"><h2>Sincronizando com o servidor</h2><p>Carregando leads e recursos persistidos no CRM. Nenhum dado local é exibido neste artefato.</p></div>";`,
  "boot assíncrono da POC"
);

const patch = String.raw`
<style>
#modo,#limpar-ov{display:none!important}
.prod-alert{background:#fff7e8;border:1px solid #efd39a;border-radius:10px;padding:12px 14px;margin:0 0 16px;font-size:12.5px;color:#6d5524}
.prod-ok{background:#edf6ef;border:1px solid #bed9c4;border-radius:10px;padding:12px 14px;margin:0 0 16px;font-size:12.5px;color:#315d39}
.prod-error{background:#fff0ee;border:1px solid #e5b8b0;border-radius:10px;padding:18px;margin:10px 0;color:#7f2f24}
.readonly-state{display:inline-block;padding:3px 8px;border-radius:8px;background:var(--paper);border:1px solid var(--line);font-size:11px;color:var(--muted)}
</style>
<script>
(function(){
  function apiJson(path, options){
    return fetch(path, options || {cache:'no-store'}).then(function(r){
      if(r.status===401){ window.location.replace('/login'); throw new Error('Sessão expirada.'); }
      return r.json().catch(function(){return {}}).then(function(data){
        if(!r.ok || data.error || data.erro) throw new Error(data.error || data.erro || ('Erro HTTP '+r.status));
        return data;
      });
    });
  }
  function fail(error){
    var el=document.getElementById('view');
    var upd=document.getElementById('upd');
    if(upd) upd.textContent='sincronização indisponível';
    if(el) el.innerHTML='<div class="prod-error"><b>CRM indisponível.</b><br>Não foi possível carregar os dados do servidor. Nenhuma alteração local foi aplicada.<br><small>'+esc((error&&error.message)||'Falha de conexão')+'</small></div>';
  }
  function markSynced(){
    var upd=document.getElementById('upd');
    if(upd) upd.textContent='sincronizado em '+new Date().toLocaleString('pt-BR');
  }

  var oldSave=salvarOv, oldDelete=deletar;
  salvarOv=function(slug,ch){
    if(MODE!=='db'){ alert('CRM sem conexão com o banco. A alteração não foi salva.'); return; }
    return oldSave(slug,ch);
  };
  deletar=function(slug){
    if(MODE!=='db'){ alert('CRM sem conexão com o banco. A exclusão não foi executada.'); return; }
    return oldDelete(slug);
  };
  recarrega=function(){
    return apiJson('/api/leads',{cache:'no-store'}).then(function(data){MODE='db';leads=(Array.isArray(data)?data:[]).filter(function(l){return /^[a-z0-9][a-z0-9-]{0,71}$/.test(String(l.slug||''))});return leads}).catch(function(e){fail(e);throw e});
  };
  dsLoad=function(){
    var names=['products','proposals','emails','orders','checkouts','payments','contracts','handoffs','commissions','financial','timeline','settings','previews','qualifications','diagnoses'];
    var jobs=names.map(function(n){return apiJson('/api/'+n,{cache:'no-store'}).then(function(x){DS[n]=x})});
    jobs.push(apiJson('/api/social-audits',{cache:'no-store'}).then(function(x){DS.socialAudits=x}));
    return Promise.all(jobs).then(function(){markSynced();render()}).catch(function(e){fail(e);throw e});
  };

  NOMES={novo:'Novo lead',redesenhado:'Qualificado',publicado:'Em preparação',proposta:'Proposta enviada',respondeu:'Em negociação',fechado:'Fechado',descartado:'Perdido'};

  // Navegação: fonte única (NAV_CANONICO, definida no HTML base). Este patch NÃO
  // declara uma segunda lista — ele só falha fechado se a lista canônica perder
  // uma área já entregue, e a limpeza de estado local da POC.
  ['geral','prospeccao','pipeline','clientes','intelligence','workspace','timeline','sites','comparador','followup','contratos','financeiro','config'].forEach(function(id){
    if(!NAV_CANONICO.some(function(i){return i[0]===id})) throw new Error('navegação canônica perdeu a área: '+id);
  });
  try{ localStorage.removeItem('prospector_ov') }catch(_){}

  var normalSetView=setView;
  window.dsProspect=function(){var raw=document.getElementById('prospect-candidates').value, candidates;try{candidates=JSON.parse(raw)}catch(_){alert('Informe uma lista JSON de candidatos públicos.');return}apiJson('/api/prospects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:{niche:document.getElementById('prospect-niche').value,city:document.getElementById('prospect-city').value,region:document.getElementById('prospect-region').value,product:document.getElementById('prospect-product').value,search_radius_km:Number(document.getElementById('prospect-radius').value||0),target_quantity:Number(document.getElementById('prospect-target').value||0),search_limit:Number(document.getElementById('prospect-limit').value||0)},candidates:candidates})}).then(function(result){document.getElementById('prospect-result').textContent='Avaliados: '+result.evaluated+'; reconciliados: '+result.results.filter(function(x){return x.deduplicated}).length;return recarrega()}).then(dsLoad).catch(function(e){document.getElementById('prospect-result').textContent=e.message})};
  setView=function(next){if(next!=='prospeccao')return normalSetView(next);view=next;nav();document.getElementById('view').innerHTML='<div class="painel"><h2>Pesquisa pública assistida</h2><p>Importe apenas candidatos obtidos por fontes públicas. E-mail não é obrigatório; fonte e rastreabilidade são obrigatórias. Não há scraping, envio ou contato automático.</p><div class="mrow"><div><label>Nicho</label><input id="prospect-niche"></div><div><label>Cidade</label><input id="prospect-city"></div><div><label>Região</label><input id="prospect-region"></div><div><label>Raio (km)</label><input id="prospect-radius" type="number" min="0" max="500"></div></div><div class="mrow"><div><label>Produto preferencial</label><select id="prospect-product"><option value="">não definido</option><option value="datta360">Datta360°</option><option value="dattavps">DattaVPS</option><option value="both">ambos</option></select></div><div><label>Quantidade alvo</label><input id="prospect-target" type="number" min="1" max="100" value="10"></div><div><label>Limite de candidatos</label><input id="prospect-limit" type="number" min="1" max="25" value="25"></div></div><label>Candidatos públicos (JSON)</label><textarea id="prospect-candidates" rows="8" placeholder="[{&quot;slug&quot;:&quot;empresa-exemplo&quot;,&quot;nome&quot;:&quot;Empresa Exemplo&quot;,&quot;source_url&quot;:&quot;https://fonte-publica.exemplo&quot;,&quot;public_contact_type&quot;:&quot;telefone&quot;}]"></textarea><button onclick="dsProspect()">Salvar e deduplicar</button><p id="prospect-result"></p></div>'};
  var oldIntelligence=vIntelligence;
  // A área de Prospecção passou a ser um formulário real definido no HTML base
  // (sem JSON para o operador). O interceptador antigo, que exigia colar JSON,
  // fica neutralizado: qualquer troca de área volta a usar a navegação canônica.
  setView=function(next){return normalSetView(next)};
  vIntelligence=function(){return oldIntelligence()+'<div class="painel"><h2>Direção social para proposta</h2><p>Registre somente o que foi observado no perfil público. A direção criativa é uma demonstração sujeita à revisão; não publica conteúdo.</p><div class="mrow"><div><label>URL</label><input id="social-url"></div><div><label>Usuário</label><input id="social-user"></div><div><label>Bio / CTA</label><input id="social-bio"></div><div><label>Link</label><input id="social-link"></div></div><div class="mrow"><div><label>Consistência visual</label><input id="social-visual"></div><div><label>Frequência aparente</label><input id="social-frequency"></div><div><label>Recomendação</label><input id="social-recommendation"></div><div><label>Direção criativa</label><input id="social-direction"></div></div><label>Evidência pública</label><input id="social-evidence"><button onclick="dsSocialVisual()">Salvar auditoria social completa</button></div>'};
  dsSocialVisual=function(){var g=function(id){return document.getElementById(id).value};dsPost('/api/social-audits',{lead_slug:document.getElementById('iq-lead').value,platform:document.getElementById('is-platform').value,url:g('social-url'),username:g('social-user'),bio:g('social-bio'),cta:g('social-bio'),link:g('social-link'),visual_identity:g('social-visual'),consistency_note:g('social-visual'),frequency_note:g('social-frequency'),factual_notes:g('is-notes'),recommendation:g('social-recommendation'),creative_direction:g('social-direction'),evidence:g('social-evidence')})};
  dsCreateProposal=function(){var lead=document.getElementById('ws-lead').value.trim(),product=document.getElementById('ws-product').value,price=document.getElementById('ws-price').value;if(!lead){document.getElementById('ws-msg').textContent='Informe o slug de um lead existente.';return}var ids=function(items){return(items||[]).filter(function(x){return x.lead_slug===lead}).map(function(x){return x.id})};dsPost('/api/proposals',{lead_slug:lead,product_id:product,negotiated_price:price===''?null:Number(price),diagnosis_ids:ids(DS.diagnoses),preview_ids:ids(DS.previews),social_audit_ids:ids(DS.socialAudits),comparator:ids(DS.previews).length>0})};

  acoes=function(l){
    var a=[],slug=jsArg(l.slug);
    if(/^\d{6,20}$/.test(String(l.whatsapp||''))) a.push('<a href="https://wa.me/'+esc(l.whatsapp)+'" target="_blank" rel="noopener">WhatsApp</a>');
    if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(l.email||''))) a.push('<a href="#" onclick="dsQuickEmail(decodeURIComponent(\''+slug+'\'));return false">e-mail</a>');
    a.push('<a href="#" onclick="abrirEdit(decodeURIComponent(\''+slug+'\'));return false">✎ dados</a>');
    a.push('<a href="#" onclick="dsEnriquecer(decodeURIComponent(\''+slug+'\'));return false">enriquecer</a>');
    a.push('<a href="#" onclick="dsDiagnostico(decodeURIComponent(\''+slug+'\'));return false">diagnóstico</a>');
    a.push('<a href="#" onclick="dsRedesign(decodeURIComponent(\''+slug+'\'));return false">redesign</a>');
    a.push('<a href="#" onclick="dsSocialAnalise(decodeURIComponent(\''+slug+'\'));return false">social</a>');
    a.push('<a href="#" onclick="dsSocialDemo(decodeURIComponent(\''+slug+'\'));return false">demo social</a>');
    a.push('<a href="#" class="del" onclick="deletar(decodeURIComponent(\''+slug+'\'));return false">✕ excluir</a>');
    return '<div class="acoes">'+a.join('')+'</div>';
  };

  vGeral=function(){
    var ls=fil(), at=ls.filter(function(l){return l.status!=='descartado'&&l.status!=='fechado'});
    var props=(DS.proposals||[]).filter(function(p){return p.status!=='revised'});
    var fu=ls.filter(function(l){return l.status==='proposta'&&dias(l.dataProposta)>=Number((DS.settings||{}).followup_days||4)});
    var paidOrders=(DS.orders||[]).filter(function(o){return o.status==='paid'}), fin=DS.financial||{};
    var html='<div class="prod-ok"><b>CRM conectado.</b> Leads, propostas, e-mails e timeline são persistidos no servidor.</div>';
    html+='<div class="stats">'+[['Leads em andamento',at.length,''],['Propostas registradas',props.length,''],['Follow-ups pendentes',fu.length,'ambar'],['Vendas confirmadas',paidOrders.length,'verde'],['Receita registrada',money(fin.revenue||0),'verde'],['Recebido registrado',money(fin.received||0),'verde']].map(function(s){return '<div class="stat '+s[2]+'"><div class="n">'+s[1]+'</div><div class="l">'+s[0]+'</div></div>'}).join('')+'</div>';
    var max=Math.max.apply(null,ORDEM.map(function(s){return ls.filter(function(l){return l.status===s}).length}).concat([1]));
    html+='<div class="painel funil"><h2>Funil comercial</h2>'+ORDEM.map(function(s){var n=ls.filter(function(l){return l.status===s}).length;return '<div class="linha"><span>'+NOMES[s]+'</span><div class="barra"><div class="fill" style="width:'+(n/max*100)+'%;background:'+CORES[s]+'"></div></div><b>'+n+'</b></div>'}).join('')+'</div>';
    html+='<div class="painel"><h2>Follow-ups pendentes</h2>'+(fu.length?fu.map(function(l){return '<div class="fup-item"><b>'+esc(l.nome)+'</b><span class="dias">'+dias(l.dataProposta)+' dias</span><span style="color:var(--muted);font-size:12px">proposta em '+esc(l.dataProposta||'')+'</span></div>'}).join(''):'<div class="vazio">Nenhum follow-up pendente.</div>')+'</div>';
    return html;
  };

  var oldPipeline=vPipeline;
  vPipeline=function(){
    return oldPipeline().replace('Arraste um card para mudar o status — os automáticos (redesenhado, publicado, proposta) o plugin move sozinho; use o arrasto principalmente para <b>Respondeu</b> e <b>Fechado</b>.','Arraste os cards para atualizar o estágio comercial. O fechamento deve ser confirmado pelo fluxo comercial.');
  };
  var oldDrop=solta;
  solta=function(e,st){
    if(st==='fechado'){e.preventDefault();e.currentTarget.classList.remove('alvo');dragSlug=null;alert('Use o fluxo comercial para confirmar o fechamento.');return}
    return oldDrop(e,st);
  };

  var oldClientes=vClientes;
  vClientes=function(){
    return oldClientes()
      .replace('Nome/empresa','Nome / empresa')
      .replace('Telefone público (e-mail opcional)','Telefone / contato')
      .replace('URL da fonte pública','Origem / URL (opcional)')
      .replace('Contato / páginas','Contato / ações');
  };

  vFollowup=function(){
    var prazo=Number((DS.settings||{}).followup_days||4);
    var fu=fil().filter(function(l){return l.status==='proposta'&&dias(l.dataProposta)>=prazo});
    return '<div class="painel"><h2>Propostas aguardando follow-up</h2><p style="font-size:12px;color:var(--muted)">Prazo configurado: '+prazo+' dia(s).</p>'+(fu.length?fu.map(card).join(''):'<div class="vazio">Nenhum follow-up pendente.</div>')+'</div>';
  };

  ['dsOrder','dsCheckout','dsPayment','dsContractState','dsHandoff'].forEach(function(name){
    window[name]=function(){alert('Ação de simulação desativada em produção. Use a integração real do produto/checkout.')};
  });

  vOrders=function(){
    var orders=DS.orders||[];
    if(!orders.length) return '<div class="painel"><h2>Pedidos e integrações</h2><div class="vazio">Nenhum pedido registrado.</div></div>';
    return '<div class="painel"><h2>Pedidos e integrações</h2><div class="prod-alert"><b>Somente leitura:</b> checkout, pagamento, contrato e entrega dependem das integrações reais.</div><div class="twrap"><table><thead><tr><th>Pedido</th><th>Lead</th><th>Produto / valor</th><th>Checkout</th><th>Pagamento</th><th>Contrato</th><th>Entrega</th></tr></thead><tbody>'+orders.map(function(o){var ck=(DS.checkouts||[]).filter(function(x){return x.order_id===o.id})[0],pay=(DS.payments||[]).filter(function(x){return x.order_id===o.id})[0],ct=(DS.contracts||[]).filter(function(x){return x.order_id===o.id})[0],h=(DS.handoffs||[]).filter(function(x){return x.order_id===o.id})[0];return '<tr><td><small>'+esc(o.id)+'</small></td><td>'+esc(o.lead_slug)+'</td><td>'+esc(o.product_id)+'<br>'+money(o.negotiated_price)+'</td><td><span class="readonly-state">'+esc((ck&&ck.status)||'aguardando integração')+'</span></td><td><span class="readonly-state">'+esc((pay&&pay.status)||'aguardando confirmação')+'</span></td><td><span class="readonly-state">'+esc((ct&&ct.status)||'não gerado')+'</span></td><td><span class="readonly-state">'+esc((h&&h.status)||'não iniciado')+'</span></td></tr>'}).join('')+'</tbody></table></div></div>';
  };

  var oldWorkspace=vWorkspace;
  vWorkspace=function(){
    return oldWorkspace()
      .replace(/<small style="color:var\(--accent\)">MODO DEMONSTRAÇÃO<\/small>/g,'')
      .replace(/ · MODO DEMONSTRAÇÃO/g,'')
      .replace('Pedidos, checkout, pagamento e handoff','Pedidos e integrações');
  };

  // Rascunhos criados pela Central seguem o procedimento Prospector no servidor;
  // falhas de pré-requisito (link público, domínio, e-mail) ficam visíveis e não
  // degradam para o texto genérico anterior.
  dsEmail=function(proposalId){
    return apiJson('/api/proposals/'+encodeURIComponent(proposalId)+'/prospector-draft',{method:'POST'})
      .then(function(){return dsLoad()})
      .catch(function(error){alert(error.message||'Não foi possível criar o rascunho Prospector.')});
  };

  // O token é opaco e só é criado pelo backend autenticado. A Central não
  // reconstrói nem expõe dados extras: ela apenas oferece o link público já
  // vinculado à versão selecionada da proposta.
  var oldProposalEditor=vProposalEditor;
  vProposalEditor=function(){
    var result=oldProposalEditor(), proposal=(DS.proposals||[]).filter(function(x){return x.id===dsProposalEditId})[0];
    var token=proposal&&proposal.artifacts&&typeof proposal.artifacts.public_token==='string'&&/^[A-Za-z0-9_-]{32,128}$/.test(proposal.artifacts.public_token)?proposal.artifacts.public_token:'';
    if(!result||!token)return result;
    return result.replace('</div>','<p><a href="/p/'+esc(token)+'" target="_blank" rel="noopener">Abrir proposta pública ↗</a></p></div>');
  };

  var oldFinance=vFinanceiroLocal;
  vFinanceiroLocal=function(){
    return '<div class="prod-alert">Indicadores operacionais do CRM. Pagamentos só são definitivos quando confirmados pelo gateway integrado.</div>'+oldFinance();
  };

  var oldGeneral=vGeneralSettings;
  vGeneralSettings=function(){
    return oldGeneral()
      .replace('Operação local','Configuração da operação')
      .replace(/MODO (DEMO|LOCAL)/g,'')
      .replace(/<div><label>Modo<\/label><select id="set-demo">[\s\S]*?<\/select><\/div>/,'')
      .replace('Provider real, senha, token e chave não são armazenados nesta POC; o adapter mock é o único provider local disponível.','A chave do Resend permanece somente no servidor. O envio real exige revisão, aprovação e confirmação humana.');
  };

  var configuredGeneralSettings=vGeneralSettings;
  vGeneralSettings=function(){
    var result=configuredGeneralSettings(), value=esc((DS.settings||{}).public_base_url||'');
    if(!/<\/div>$/.test(result)) return result;
    return result.replace(/<\/div>$/,'<div class="mrow"><div><label>URL pública das propostas</label><input id="set-public-base-url" type="url" inputmode="url" placeholder="https://hml.exemplo.com" value="'+value+'"></div><div style="align-self:end"><button onclick="dsSavePublicBaseUrl()">Salvar URL pública</button></div></div><p style="font-size:12px;color:var(--muted)">Use somente a origem HTTPS do ambiente atual, sem caminho. Esta URL é usada nos rascunhos; o envio continua sujeito à aprovação humana.</p></div>');
  };
  window.dsSavePublicBaseUrl=function(){
    var input=document.getElementById('set-public-base-url'), value=input?input.value.trim():'';
    if(value&&!/^https:\/\/[^/?#]+$/i.test(value)){alert('Informe apenas uma origem HTTPS, sem caminho.');return}
    apiJson('/api/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({public_base_url:value})}).then(dsLoad).catch(function(error){alert(error&&error.message?error.message:'Não foi possível salvar a URL pública.')});
  };

  var oldOffer=vOfferRules;
  vOfferRules=function(){
    return oldOffer()
      .replace('Oferta, CTA e checkout externo','Produtos, CTA e checkout')
      .replace('Informação comercial configurável. Checkout real não é aberto nem cobrado por esta POC.','Configure a URL oficial de checkout de cada produto. O pagamento deve ser confirmado pelo retorno do provedor.');
  };

  var oldConfig=vConfigLocal;
  vConfigLocal=function(){
    return oldConfig()
      .replace('Catálogo DEMO / TESTE','Catálogo comercial')
      .replace(/<button[^>]*\/api\/demo\/reset[^>]*>[^<]*<\/button>/g,'')
      .replace(/<button[^>]*>Resetar dados DEMO<\/button>/g,'');
  };

  // Texto residual da POC/DEMO não pode aparecer no CRM servidor. A limpeza roda
  // dentro do próprio render(), então nenhum estado intermediário chega à tela.
  var oldRender=render;
  render=function(){
    oldRender();
    var el=document.getElementById('view');
    if(!el) return;
    el.innerHTML=el.innerHTML.replace(/<small style="color:var\(--accent\)">MODO DEMONSTRAÇÃO<\/small>/g,'').replace(/MODO DEMONSTRAÇÃO/g,'').replace(/MODO (DEMO|LOCAL)/g,'');
  };

  var oldPost=dsPost;
  dsPost=function(path,body){
    return oldPost(path,body);
  };

  var side=document.querySelector('.side-foot');
  if(side) side.textContent='CRM comercial Datta. Operação autenticada e persistida no servidor.';

  recarrega().then(function(){return dsLoad()}).catch(function(){});
})();
</script>`;

if (!html.includes("</body>")) throw new Error("dashboard.html sem </body>; patch de produção não aplicado");
// O controle de reset da POC é removido em runtime; o alvo precisa existir no build para o patch não falhar em silêncio.
html = requireTarget(html, "/api/demo/reset", "botão de reset DEMO da POC");
// Contrato de navegação: o patch não cria lista própria; ele exige a canônica.
html = requireTarget(html, "var NAV_CANONICO=[", "fonte única de navegação (NAV_CANONICO)");
html = requireTarget(html, "['prospeccao','Prospecção']", "área Prospecção na navegação canônica");
html = requireTarget(html, "['contratos','Contratos']", "área Contratos na navegação canônica");
html = requireTarget(html, "['intelligence','Inteligência']", "área Inteligência na navegação canônica");
return html.replace("</body>", `${patch}\n</body>`);
}

const isEntrypoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntrypoint) {
  const target = resolve("public/dashboard.html");
  writeFileSync(target, applyProductionDashboardPatch(readFileSync(target, "utf8")), "utf8");
  console.log(`Dashboard ajustado para CRM de produção: ${target}`);
}
