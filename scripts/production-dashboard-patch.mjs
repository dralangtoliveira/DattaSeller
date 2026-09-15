import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const target = resolve("public/dashboard.html");
let html = readFileSync(target, "utf8");

html = html
  .replace("<title>DattaSeller — Painel comercial local</title>", "<title>DattaSeller — CRM Comercial</title>")
  .replace(
    "Baseado no Prospector. Contatos, envio de propostas, publicação e checkout exigem confirmação humana.",
    "CRM comercial Datta. Operação autenticada e persistida no servidor."
  );

const patch = String.raw`
<style>
#modo,#limpar-ov{display:none!important}
.prod-alert{background:#fff7e8;border:1px solid #efd39a;border-radius:10px;padding:12px 14px;margin:0 0 16px;font-size:12.5px;color:#6d5524}
.prod-ok{background:#edf6ef;border:1px solid #bed9c4;border-radius:10px;padding:12px 14px;margin:0 0 16px;font-size:12.5px;color:#315d39}
.prod-error{background:#fff0ee;border:1px solid #e5b8b0;border-radius:10px;padding:18px;margin:10px 0;color:#7f2f24}
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
    if(el) el.innerHTML='<div class="prod-error"><b>CRM indisponível.</b><br>Não foi possível carregar os dados do servidor. Nenhuma alteração local foi aplicada.<br><small>'+esc((error&&error.message)||'Falha de conexão')+'</small></div>';
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
    return apiJson('/api/leads',{cache:'no-store'}).then(function(data){MODE='db';leads=data;return data}).catch(function(e){fail(e);throw e});
  };
  dsLoad=function(){
    var names=['products','proposals','emails','orders','checkouts','payments','contracts','handoffs','commissions','financial','timeline','settings','previews','qualifications','diagnoses'];
    var jobs=names.map(function(n){return apiJson('/api/'+n,{cache:'no-store'}).then(function(x){DS[n]=x})});
    jobs.push(apiJson('/api/social-audits',{cache:'no-store'}).then(function(x){DS.socialAudits=x}));
    return Promise.all(jobs).then(render).catch(function(e){fail(e);throw e});
  };

  NOMES={novo:'Novo lead',redesenhado:'Qualificado',publicado:'Em preparação',proposta:'Proposta enviada',respondeu:'Em negociação',fechado:'Fechado',descartado:'Perdido'};

  nav=function(){
    var fu=fil().filter(function(l){return l.status==='proposta'&&dias(l.dataProposta)>=Number((DS.settings||{}).followup_days||4)});
    var itens=[['geral','Visão geral',null],['pipeline','Pipeline',ativos().length],['clientes','Clientes',fil().length],['workspace','Central comercial',null],['timeline','Timeline',null],['followup','Follow-ups',fu.length],['financeiro','Financeiro',null],['config','Configurações',null]];
    if(!itens.some(function(i){return i[0]===view})) view='geral';
    document.getElementById('nav').innerHTML=itens.map(function(i){return '<button class="'+(view===i[0]?'on':'')+'" onclick="setView(\\''+i[0]+'\\')">'+i[1]+(i[2]!==null?'<span class="qt">'+i[2]+'</span>':'')+'</button>'}).join('');
    document.getElementById('titulo').textContent=itens.filter(function(i){return i[0]===view})[0][1];
  };

  vGeral=function(){
    var ls=fil(), at=ls.filter(function(l){return l.status!=='descartado'&&l.status!=='fechado'});
    var props=(DS.proposals||[]).filter(function(p){return p.status!=='revised'});
    var fu=ls.filter(function(l){return l.status==='proposta'&&dias(l.dataProposta)>=Number((DS.settings||{}).followup_days||4)});
    var fech=ls.filter(function(l){return l.status==='fechado'}), fin=DS.financial||{};
    var html='<div class="prod-ok"><b>CRM conectado.</b> Leads, propostas, e-mails e timeline são persistidos no servidor.</div>';
    html+='<div class="stats">'+[['Leads em andamento',at.length,''],['Propostas registradas',props.length,''],['Follow-ups pendentes',fu.length,'ambar'],['Fechados',fech.length,'verde'],['Receita registrada',money(fin.revenue||0),'verde'],['Recebido registrado',money(fin.received||0),'verde']].map(function(s){return '<div class="stat '+s[2]+'"><div class="n">'+s[1]+'</div><div class="l">'+s[0]+'</div></div>'}).join('')+'</div>';
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

  ['dsOrder','dsCheckout','dsPayment','dsContractState','dsHandoff'].forEach(function(name){
    window[name]=function(){alert('Ação de simulação desativada em produção. Use a integração real do produto/checkout.')};
  });

  var oldWorkspace=vWorkspace;
  vWorkspace=function(){
    return oldWorkspace()
      .replace(/<small style="color:var\(--accent\)">MODO DEMONSTRAÇÃO<\/small>/g,'')
      .replace(/ · MODO DEMONSTRAÇÃO/g,'')
      .replace('Pedidos, checkout, pagamento e handoff','Pedidos e integrações')
      .replace('<div class="twrap"><table><thead><tr><th>Pedido</th>','<div class="prod-alert"><b>Atenção:</b> controles manuais de checkout, pagamento, contrato e handoff estão bloqueados em produção. Os estados devem vir das integrações reais.</div><div class="twrap"><table><thead><tr><th>Pedido</th>');
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
      .replace('Provider real, senha, token e chave não são armazenados nesta POC; o adapter mock é o único provider local disponível.','A chave do Resend permanece somente no servidor. O envio real exige revisão, aprovação e confirmação humana.');
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
      .replace(/<button style="margin-top:12px"[^>]*>Resetar dados DEMO<\/button>/,'');
  };

  var oldPost=dsPost;
  dsPost=function(path,body){
    if(path==='/api/demo/reset'){alert('Reset de dados DEMO desativado em produção.');return Promise.resolve()}
    return oldPost(path,body);
  };

  var side=document.querySelector('.side-foot');
  if(side) side.textContent='CRM comercial Datta. Operação autenticada e persistida no servidor.';

  recarrega().then(function(){return dsLoad()}).catch(function(){});
})();
</script>`;

if (!html.includes("</body>")) throw new Error("dashboard.html sem </body>; patch de produção não aplicado");
html = html.replace("</body>", `${patch}\n</body>`);
writeFileSync(target, html, "utf8");
console.log(`Dashboard ajustado para CRM de produção: ${target}`);
