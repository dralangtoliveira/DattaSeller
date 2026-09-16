"""E2Es locais reprodutíveis: Datta360, DattaVPS e cenários negativos."""
import os, tempfile
import dattaseller_local as ds

old=ds.DB; f=tempfile.NamedTemporaryFile(suffix='.db',delete=False); f.close(); os.unlink(f.name); ds.DB=f.name
c=ds.connect(); c.execute('CREATE TABLE leads(slug TEXT PRIMARY KEY,email TEXT,product_suggested TEXT,product_reason TEXT,next_action TEXT,site_audit_json TEXT,instagram_audit_json TEXT)'); c.executemany('INSERT INTO leads(slug,email) VALUES(?,?)',[('datta360','360@local.invalid'),('vps','vps@local.invalid'),('negative','negative@local.invalid'),('negative-contract','contract@local.invalid'),('curtume-tropical-franca',None)]); c.commit(); c.close()

def email_flow(lead,product,price):
    p=ds.create_proposal(lead,product,price); e=ds.create_email(lead,p['id'],'Proposta factual','Corpo revisável'); ds.email_transition(e['id'],'reviewed'); ds.email_transition(e['id'],'approved'); ds.email_transition(e['id'],'sent_simulated'); return p,e

# Caso público controlado: fatos e artefatos locais, sem e-mail, proposta ou contato externo.
curtume='curtume-tropical-franca'
qualification=ds.qualify_lead(curtume,
    ['domínio institucional público apresenta Produtos, Tendências, Meio Ambiente, Empresa, Notícias e Contato',
     'fonte pública de Instagram foi indicada pelo operador'],
    ['validar se catálogo e solicitação comercial são prioridade'],
    'datta360','Presença institucional e social pública, sujeita a revisão humana','medium',
    'A prioridade é ampliar solicitações comerciais pelo site?','revisar fontes e objetivos','Operador')
assert qualification['recommendation']=='datta360'
diagnosis=ds.diagnose_site(curtume,[{'criterion':'Jornada comercial','observed_state':'a validar','evidence':'navegação pública observada; sem teste de conversão','recommendation':'revisar CTA e fluxo com a empresa'}])
social=ds.audit_social(curtume,'instagram',url='https://www.instagram.com/curtume_tropical/',factual_notes='fonte pública indicada pelo operador',recommendation='validar CTA e identidade antes de qualquer publicação')
preview_curtume=ds.create_local_preview(curtume)
assert diagnosis['lead_slug']==curtume and social['lead_slug']==curtume and preview_curtume['lead_slug']==curtume

# Datta360 completo
ds.update_product('datta360',{'base_price':100,'public_price':100,'cost':60,'commission_pct':10})
ds.qualify_lead('datta360',['telefone público'],['precisa validar escopo'],'datta360','CTA ausente','medium','Qual serviço prioriza?','proposta','Demo')
ds.diagnose_site('datta360',[{'criterion':'CTA','observed_state':'ausente','evidence':'página observada','recommendation':'inserir CTA'}]); ds.audit_social('datta360','instagram',factual_notes='perfil público observado'); preview=ds.create_local_preview('datta360'); ds.edit_preview(preview['id'],'Título','Texto','Fale conosco','Contato público')
p,e=email_flow('datta360','datta360',100); ds.email_transition(e['id'],'positive_reply'); o=ds.create_order(p['id']); ds.checkout(o['id'],'completed'); ds.payment(o['id'],'approved'); ct=ds.generate_contract(o['id']); ds.contract_transition(ct['id'],'sent_simulated'); ds.contract_transition(ct['id'],'signed'); handoff=ds.handoff(o['id'],'delivered')
assert ds.financial_summary()['revenue']==100 and ct['status']=='generated' and handoff['status']=='delivered'

# DattaVPS mock
ds.qualify_lead('vps',['menção pública a servidor'],[],'dattavps','aderência observada','high','Qual carga?','proposta','Demo'); p2,e2=email_flow('vps','dattavps',190); ds.email_transition(e2['id'],'positive_reply'); o2=ds.create_order(p2['id']); ds.checkout(o2['id'],'completed'); ds.payment(o2['id'],'approved'); assert ds.handoff(o2['id'],'sent')['status']=='sent'; c=ds.connect(); assert ds.one(c,'SELECT amount FROM ds_commissions WHERE order_id=?',(o2['id'],))['amount']==22.8; c.close()

# Negativo: não cria receita, comissão ou handoff
pn,en=email_flow('negative','datta360',100); ds.email_transition(en['id'],'no_reply'); ds.email_transition(en['id'],'bounce'); on=ds.create_order(pn['id']); ds.checkout(on['id'],'abandoned'); assert ds.payment(on['id'],'declined')['status']=='declined'; assert ds.handoff(on['id'],'sent')['error']
# Caminho negativo com pagamento aprovado: contrato recusado/cancelado e handoff que falha e é reenviado.
pc,ec=email_flow('negative-contract','datta360',100); ds.email_transition(ec['id'],'positive_reply'); oc=ds.create_order(pc['id']); ds.checkout(oc['id'],'completed'); ds.payment(oc['id'],'approved'); cc=ds.generate_contract(oc['id']); assert ds.contract_transition(cc['id'],'refused')['status']=='refused'; assert ds.contract_transition(cc['id'],'cancelled')['status']=='cancelled'; assert ds.handoff(oc['id'],'failed')['status']=='failed'; assert ds.handoff(oc['id'],'sent')['retry_count']==1
# Reconexão explícita à mesma base confirma que os estados de todos os cenários coexistem.
c=ds.connect(); assert ds.one(c,'SELECT status FROM ds_contracts WHERE id=?',(ct['id'],))['status']=='signed'; assert ds.one(c,'SELECT status FROM ds_contracts WHERE id=?',(cc['id'],))['status']=='cancelled'; assert ds.one(c,'SELECT status FROM ds_checkouts WHERE order_id=?',(on['id'],))['status']=='abandoned'; assert ds.one(c,'SELECT retry_count FROM ds_handoffs WHERE order_id=?',(oc['id'],))['retry_count']==1; c.close()
print('E2E LOCAL OK: Datta360, DattaVPS mock, negativo e caso público controlado')
os.unlink(ds.DB); ds.DB=old
