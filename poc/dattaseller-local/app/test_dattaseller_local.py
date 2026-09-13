"""Cobertura de regressão do núcleo local, sem dependências externas."""
import os, tempfile, unittest
import dattaseller_local as ds

class DattaSellerLocalTests(unittest.TestCase):
    def setUp(self):
        self.old=ds.DB; self.tmp=tempfile.NamedTemporaryFile(suffix='.db',delete=False); self.tmp.close(); os.unlink(self.tmp.name); ds.DB=self.tmp.name
        c=ds.connect(); c.execute('CREATE TABLE IF NOT EXISTS leads(slug TEXT PRIMARY KEY,email TEXT,product_suggested TEXT,product_reason TEXT,next_action TEXT,site_audit_json TEXT,instagram_audit_json TEXT)'); c.execute("INSERT INTO leads(slug,email) VALUES('lead-a','a@local.invalid')"); c.commit(); c.close()
    def tearDown(self):
        if os.path.exists(ds.DB): os.unlink(ds.DB)
        ds.DB=self.old
    def cycle(self, product='datta360', price=None):
        p=ds.create_proposal('lead-a',product,price); self.assertNotIn('error',p); return p
    def test_settings_and_products_persist(self):
        self.assertTrue(ds.get_settings()['demo_mode']); ds.update_settings({'company_name':'Teste Local','secret':'nunca'})
        self.assertEqual(ds.get_settings()['company_name'],'Teste Local'); self.assertNotIn('secret',ds.get_settings())
        product=ds.update_product('datta360',{'public_price':100,'base_price':100,'cost':60,'commission_pct':10})
        self.assertEqual((product['public_price'],product['cost']), (100,60))
    def test_proposal_discount_margin_and_persistence(self):
        ds.update_product('datta360',{'base_price':100,'public_price':100,'cost':60,'max_discount_pct':20,'commission_pct':10})
        p=self.cycle('datta360',90); self.assertEqual((p['discount'],p['margin']),(10,30)); self.assertEqual(ds.create_proposal('lead-a','datta360',70)['error'],'Preço inválido ou desconto acima do máximo')
        c=ds.connect(); self.assertEqual(ds.one(c,'SELECT id FROM ds_proposals WHERE id=?',(p['id'],))['id'],p['id']); c.close()
    def test_email_transitions_and_history(self):
        p=self.cycle(); e=ds.create_email('lead-a',p['id'],'Assunto natural','Corpo factual'); self.assertEqual(e['status'],'draft')
        self.assertEqual(ds.email_transition(e['id'],'sent_simulated')['error'],'Somente rascunho aprovado pode ser enviado/simulado')
        self.assertTrue(ds.email_transition(e['id'],'reviewed')['ok']); self.assertTrue(ds.email_transition(e['id'],'approved')['ok']); self.assertTrue(ds.email_transition(e['id'],'sent_simulated')['ok']); self.assertTrue(ds.email_transition(e['id'],'positive_reply')['ok'])
    def test_order_checkout_payment_contract_handoff_commission_financial(self):
        ds.update_product('datta360',{'base_price':100,'public_price':100,'cost':60,'commission_pct':10}); p=self.cycle('datta360',100); o=ds.create_order(p['id'])
        self.assertEqual(ds.checkout(o['id'])['status'],'open'); self.assertEqual(ds.checkout(o['id'],'abandoned')['status'],'abandoned'); self.assertEqual(ds.checkout(o['id'],'completed')['status'],'completed')
        self.assertEqual(ds.payment(o['id'],'declined')['status'],'declined'); self.assertEqual(ds.payment(o['id'],'approved')['status'],'approved'); self.assertEqual(ds.payment(o['id'],'approved')['status'],'approved')
        self.assertEqual(ds.generate_contract(o['id'])['status'],'generated'); self.assertEqual(ds.handoff(o['id'],'failed')['status'],'failed'); self.assertEqual(ds.handoff(o['id'],'delivered')['status'],'delivered')
        f=ds.financial_summary(); self.assertEqual((f['revenue'],f['cost'],f['margin'],f['commission'],f['received']),(100,60,40,10,100))
    def test_payment_cancellation_and_refund(self):
        o=ds.create_order(self.cycle()['id']); self.assertEqual(ds.payment(o['id'],'cancelled')['status'],'cancelled'); self.assertEqual(ds.payment(o['id'],'refunded')['status'],'refunded')
    def test_local_preview_is_factual_and_persisted(self):
        p=ds.create_local_preview('lead-a'); self.assertEqual(p['status'],'published_mock'); self.assertIn('não são inventados',p['content'])
        c=ds.connect(); self.assertEqual(ds.one(c,'SELECT status FROM ds_previews WHERE id=?',(p['id'],))['status'],'published_mock'); c.close()
        edited=ds.edit_preview(p['id'],'Título revisado','Texto revisado','Fale conosco','contato público'); self.assertIn('Título revisado',edited['content']); self.assertEqual(ds.edit_preview('ausente')['error'],'Preview não encontrado')
    def test_qualification_separates_facts_hypotheses_and_insufficient(self):
        q=ds.qualify_lead('lead-a',['site público observado'],['pode precisar de nova página'],'datta360','CTA não visível','medium','Qual serviço prioriza?','agendar revisão','Demo')
        self.assertEqual(q['recommendation'],'datta360'); self.assertEqual(ds.qualify_lead('lead-a',[],[],'insufficient','recomendação insuficiente','low')['recommendation'],'insufficient')
        self.assertEqual(ds.qualify_lead('lead-a','fato',[],'datta360','x','low')['error'],'Fatos e hipóteses devem ser listas separadas')
    def test_factual_site_diagnosis_and_social_audit(self):
        d=ds.diagnose_site('lead-a',[{'criterion':'CTA','observed_state':'não visível','evidence':'página inicial observada','recommendation':'inserir CTA'}]); self.assertIn('CTA',d['criteria'])
        self.assertIn('exige teste',ds.diagnose_site('lead-a',[{'criterion':'SEO','observed_state':'ruim','evidence':'x','recommendation':'x'}])['error'])
        s=ds.audit_social('lead-a','instagram',url='https://instagram.com/exemplo',factual_notes='bio pública observada',recommendation='testar CTA'); self.assertEqual(s['platform'],'instagram'); self.assertEqual(ds.audit_social('lead-a','x')['error'],'Plataforma deve ser instagram ou tiktok')
    def test_restart_persists_full_local_flow(self):
        ds.update_product('datta360',{'base_price':100,'public_price':100,'cost':60,'commission_pct':10})
        q=ds.qualify_lead('lead-a',['telefone público'],[],'datta360','CTA ausente','medium','Qual prioridade?','proposta','Demo')
        d=ds.diagnose_site('lead-a',[{'criterion':'CTA','observed_state':'ausente','evidence':'página observada','recommendation':'inserir CTA'}])
        s=ds.audit_social('lead-a','instagram',factual_notes='perfil público observado'); pr=ds.create_local_preview('lead-a'); ds.edit_preview(pr['id'],'Título','Texto','CTA','Contato')
        p=self.cycle('datta360',100); e=ds.create_email('lead-a',p['id'],'Assunto','Corpo'); ds.email_transition(e['id'],'reviewed'); ds.email_transition(e['id'],'approved'); ds.email_transition(e['id'],'sent_simulated')
        o=ds.create_order(p['id']); ds.checkout(o['id'],'completed'); ds.payment(o['id'],'approved'); ct=ds.generate_contract(o['id']); ds.handoff(o['id'],'delivered')
        # Simula término e nova abertura da aplicação: nenhuma referência de conexão é reutilizada.
        c=ds.connect(); checks=[('ds_qualifications',q['id']),('ds_site_diagnoses',d['id']),('ds_social_audits',s['id']),('ds_previews',pr['id']),('ds_proposals',p['id']),('ds_emails',e['id']),('ds_orders',o['id']),('ds_contracts',ct['id'])]
        for table, ident in checks: self.assertIsNotNone(ds.one(c,'SELECT id FROM %s WHERE id=?' % table,(ident,)))
        self.assertEqual(ds.one(c,'SELECT status FROM ds_payments WHERE order_id=?',(o['id'],))['status'],'approved'); self.assertEqual(ds.one(c,'SELECT status FROM ds_handoffs WHERE order_id=?',(o['id'],))['status'],'delivered'); self.assertEqual(ds.financial_summary()['revenue'],100); c.close()
    def test_reset_preserves_non_demo_configuration_and_transactions(self):
        demo=self.cycle(); ds.create_order(demo['id'])
        c=ds.connect(); c.execute("INSERT INTO ds_products(id,name,billing,public_price,base_price,cost,commission_pct,max_discount_pct,currency,active,adapter,is_demo,updated_at) VALUES('real','Real','one_time',10,10,1,0,0,'BRL',1,'Mock',0,?)",(ds.now(),)); c.commit(); c.close()
        real=self.cycle('real'); ds.create_order(real['id']); ds.update_settings({'company_name':'Permanece'})
        self.assertTrue(ds.reset_demo()['ok']); c=ds.connect(); self.assertIsNone(ds.one(c,'SELECT id FROM ds_proposals WHERE id=?',(demo['id'],))); self.assertIsNotNone(ds.one(c,'SELECT id FROM ds_proposals WHERE id=?',(real['id'],))); c.close(); self.assertEqual(ds.get_settings()['company_name'],'Permanece')

if __name__ == '__main__': unittest.main()
