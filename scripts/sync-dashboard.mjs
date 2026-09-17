import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const source = resolve("poc/dattaseller-local/app/dashboard.html");
const target = resolve("public/dashboard.html");
mkdirSync(dirname(target), { recursive: true });

let html = readFileSync(source, "utf8");

const emailPatch = String.raw`
<script>
(function(){
  var originalTransitionEmail = dsTransitionEmail;
  var originalEmailEditor = vEmailEditor;
  var originalGeneralSettings = vGeneralSettings;

  window.dsQuickEmail = function(slug){
    var lead = (leads || []).filter(function(l){ return l.slug === slug; })[0];
    if(!lead || !lead.email || lead.email.indexOf('@') < 1){
      alert('Este lead não possui e-mail válido cadastrado.');
      return;
    }

    var existing = (DS.emails || []).filter(function(e){
      return e.lead_slug === slug && ['draft','reviewed','approved','failed'].indexOf(e.status) >= 0;
    })[0];

    view = 'workspace';
    if(existing){
      dsEmailEditId = existing.id;
      render();
      return;
    }

    fetch('/api/emails', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        lead_slug: slug,
        subject: 'Contato Datta360',
        body: 'Olá,\n\nEdite esta mensagem antes do envio.\n\nAtenciosamente,\nDatta360'
      })
    }).then(function(r){
      return r.json().then(function(data){ return {ok:r.ok,data:data}; });
    }).then(function(result){
      if(!result.ok || result.data.error || result.data.erro) throw new Error(result.data.error || result.data.erro || 'Não foi possível criar o rascunho.');
      dsEmailEditId = result.data.id;
      return dsLoad();
    }).catch(function(error){
      alert(error.message || 'Não foi possível abrir o e-mail no DattaSeller.');
    });
  };

  window.dsSendRealEmail = function(emailId){
    if(!confirm('Enviar este e-mail agora pelo Resend?')) return Promise.resolve();
    return fetch('/api/email-send', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({email_id: emailId})
    }).then(function(r){
      return r.json().then(function(data){ return {ok:r.ok,data:data}; });
    }).then(function(result){
      if(!result.ok || result.data.error) throw new Error(result.data.error || 'Falha no envio.');
      alert('E-mail enviado pelo Resend para ' + result.data.recipient + '.');
      return dsLoad();
    }).catch(function(error){
      alert(error.message || 'Falha no envio pelo Resend.');
    });
  };

  window.dsScheduleFollowUp = function(emailId){
    return fetch('/api/emails/' + emailId + '/follow-up', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: '{}'
    }).then(function(r){
      return r.json().then(function(data){ return {ok:r.ok,data:data}; });
    }).then(function(result){
      if(!result.ok || result.data.error){
        var code = result.data.error || '';
        if(code === 'follow_up_requires_sent_email') throw new Error('O follow-up só pode ser agendado depois de um envio com desfecho: enviado, sem resposta ou resposta genérica.');
        throw new Error(code || 'Não foi possível agendar o follow-up.');
      }
      alert(result.data.duplicate ? 'Já existe um follow-up agendado para este envio.' : 'Follow-up criado como novo rascunho. Revise, aprove e envie pelo mesmo fluxo.');
      return dsLoad();
    }).catch(function(error){
      alert(error.message || 'Não foi possível agendar o follow-up.');
    });
  };

  dsTransitionEmail = function(id, status){
    if(status === 'sent_simulated') return dsSendRealEmail(id);
    return originalTransitionEmail(id, status);
  };

  vEmailEditor = function(){
    var result = originalEmailEditor();
    if(!result) return result;
    var email = (DS.emails || []).filter(function(e){ return e.id === dsEmailEditId; })[0];
    if(email){
      var lead = (leads || []).filter(function(l){ return l.slug === email.lead_slug; })[0];
      if(!email.recipient && lead && lead.email){
        result = result.replace('<b>Para:</b> não informado', '<b>Para:</b> ' + esc(lead.email));
      }
    }
    result = result.replace(/<button onclick="dsTransitionEmail\('([^']+)','sent_simulated'\)">Simular envio<\/button>/g, '<button onclick="dsSendRealEmail(\'$1\')">Enviar via Resend</button>');
    return result.replace(/<button onclick="dsSendRealEmail\('([^']+)'\)">Enviar via Resend<\/button>/g, '<button onclick="dsSendRealEmail(\'$1\')">Enviar via Resend</button> <button onclick="dsScheduleFollowUp(\'$1\')">Criar follow-up</button>');
  };

  vGeneralSettings = function(){
    var result = originalGeneralSettings();
    var settings = DS.settings || {};
    var select = '<select id="set-email-provider"><option value="mock" ' + (settings.email_provider === 'mock' ? 'selected' : '') + '>mock</option><option value="resend" ' + (settings.email_provider === 'resend' ? 'selected' : '') + '>resend</option></select>';
    result = result.replace(/<select id="set-email-provider">.*?<\/select>/, select);
    result = result.replace('Provider real, senha, token e chave não são armazenados nesta POC; o adapter mock é o único provider local disponível.', 'A chave do Resend permanece somente no servidor. O envio real exige revisão, aprovação e confirmação humana.');
    return result;
  };

  document.addEventListener('click', function(event){
    var target = event.target && event.target.closest ? event.target.closest('a[href^="mailto:"]') : null;
    if(!target) return;
    event.preventDefault();
    var href = target.getAttribute('href') || '';
    var address = decodeURIComponent(href.slice(7).split('?')[0]).trim().toLowerCase();
    var lead = (leads || []).filter(function(l){ return String(l.email || '').trim().toLowerCase() === address; })[0];
    if(!lead){
      alert('Não foi possível localizar o lead deste e-mail no DattaSeller.');
      return;
    }
    dsQuickEmail(lead.slug);
  });
})();
</script>`;

if (!html.includes("</body>")) throw new Error("dashboard.html sem </body>; patch de e-mail não aplicado");
html = html.replace("</body>", `${emailPatch}\n</body>`);
writeFileSync(target, html, "utf8");
console.log(`Dashboard sincronizado com fluxo de e-mail interno: ${target}`);
