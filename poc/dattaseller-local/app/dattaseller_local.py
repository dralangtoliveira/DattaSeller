#!/usr/bin/env python3
"""Núcleo local do DattaSeller.

Extensão deliberadamente pequena do CRM Prospector: usa o mesmo SQLite e não
realiza chamadas de rede. Providers são mocks persistentes, substituíveis por
adapters reais depois da validação comercial.
"""
import datetime as dt
import json
import os
import sqlite3
import uuid

PASTA = os.path.dirname(os.path.abspath(__file__))
DB = os.path.normpath(os.path.join(PASTA, '..', 'data', 'dattaseller-local.db'))

DEMO_PRODUCTS = [
    ('datta360', 'Datta360° — DEMO / TESTE', 'one_time', 1500, 400, 10),
    ('dattavps', 'DattaVPS — DEMO / TESTE', 'recurring', 190, 55, 12),
    ('dattaseg', 'DattaSeg — DEMO / TESTE', 'recurring', 240, 80, 12),
    ('dattahost', 'DattaHost — DEMO / TESTE', 'recurring', 45, 12, 12),
]

def now(): return dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
def ident(prefix): return '%s_%s' % (prefix, uuid.uuid4().hex[:12])

def connect():
    os.makedirs(os.path.dirname(DB), exist_ok=True)
    c = sqlite3.connect(DB); c.row_factory = sqlite3.Row
    migrate(c); return c

def migrate(c):
    c.executescript('''
    CREATE TABLE IF NOT EXISTS ds_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ds_products (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, billing TEXT NOT NULL, public_price REAL NOT NULL,
      base_price REAL NOT NULL, cost REAL NOT NULL, commission_pct REAL NOT NULL DEFAULT 0,
      max_discount_pct REAL NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'BRL', active INTEGER NOT NULL DEFAULT 1,
      adapter TEXT NOT NULL, is_demo INTEGER NOT NULL DEFAULT 1, terms TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ds_timeline (id TEXT PRIMARY KEY, lead_slug TEXT, event TEXT NOT NULL, detail TEXT, created_at TEXT NOT NULL, is_demo INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS ds_proposals (id TEXT PRIMARY KEY, lead_slug TEXT NOT NULL, product_id TEXT NOT NULL, base_price REAL NOT NULL,
      negotiated_price REAL NOT NULL, discount REAL NOT NULL, margin REAL NOT NULL, currency TEXT NOT NULL, terms TEXT, valid_until TEXT, version INTEGER NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ds_emails (id TEXT PRIMARY KEY, lead_slug TEXT NOT NULL, proposal_id TEXT, sender TEXT, recipient TEXT, reply_to TEXT,
      subject TEXT NOT NULL, body TEXT NOT NULL, template TEXT, status TEXT NOT NULL, attempt INTEGER NOT NULL DEFAULT 0, error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ds_orders (id TEXT PRIMARY KEY, lead_slug TEXT NOT NULL, product_id TEXT NOT NULL, offer_name TEXT NOT NULL, seller TEXT,
      base_price REAL NOT NULL, negotiated_price REAL NOT NULL, discount REAL NOT NULL, cost REAL NOT NULL, margin REAL NOT NULL, currency TEXT NOT NULL,
      commission_pct REAL NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ds_checkouts (id TEXT PRIMARY KEY, order_id TEXT UNIQUE NOT NULL, status TEXT NOT NULL, expires_at TEXT, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ds_payments (id TEXT PRIMARY KEY, order_id TEXT UNIQUE NOT NULL, status TEXT NOT NULL, amount REAL NOT NULL, currency TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ds_contracts (id TEXT PRIMARY KEY, order_id TEXT UNIQUE NOT NULL, status TEXT NOT NULL, html TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ds_handoffs (id TEXT PRIMARY KEY, order_id TEXT UNIQUE NOT NULL, product_id TEXT NOT NULL, client TEXT, seller TEXT, requirements TEXT, status TEXT NOT NULL, retry_count INTEGER NOT NULL DEFAULT 0, error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ds_commissions (id TEXT PRIMARY KEY, order_id TEXT UNIQUE NOT NULL, seller TEXT, base REAL NOT NULL, pct REAL NOT NULL, amount REAL NOT NULL, state TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ds_previews (id TEXT PRIMARY KEY, lead_slug TEXT NOT NULL, kind TEXT NOT NULL, url TEXT NOT NULL, content TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ds_qualifications (id TEXT PRIMARY KEY, lead_slug TEXT NOT NULL, facts TEXT NOT NULL, hypotheses TEXT NOT NULL, recommendation TEXT NOT NULL, reason TEXT NOT NULL, confidence TEXT NOT NULL, validation_question TEXT, next_action TEXT, owner TEXT, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ds_site_diagnoses (id TEXT PRIMARY KEY, lead_slug TEXT NOT NULL, criteria TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ds_social_audits (id TEXT PRIMARY KEY, lead_slug TEXT NOT NULL, platform TEXT NOT NULL, url TEXT, username TEXT, bio TEXT, cta TEXT, link TEXT, visual_identity TEXT, consistency_note TEXT, frequency_note TEXT, factual_notes TEXT, recommendation TEXT, creative_direction TEXT, evidence TEXT, created_at TEXT NOT NULL);
    ''')
    try: c.execute('ALTER TABLE ds_timeline ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 1')
    except sqlite3.OperationalError: pass
    try: c.execute("ALTER TABLE ds_products ADD COLUMN terms TEXT NOT NULL DEFAULT ''")
    except sqlite3.OperationalError: pass
    for p, name, billing, price, cost, pct in DEMO_PRODUCTS:
        c.execute('''INSERT OR IGNORE INTO ds_products(id,name,billing,public_price,base_price,cost,commission_pct,max_discount_pct,currency,active,adapter,is_demo,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,1,?,1,?)''', (p,name,billing,price,price,cost,pct,20,'BRL','Mock%sAdapter' % p.title(),now()))
    defaults = {'company_name':'DattaSeller','seller_name':'Vendedor DEMO','demo_mode':True,'email_provider':'mock','email_sender':'demo@local.invalid','email_reply_to':'demo@local.invalid','followup_days':3}
    for k,v in defaults.items(): c.execute('INSERT OR IGNORE INTO ds_settings VALUES(?,?,?)',(k,json.dumps(v),now()))
    c.commit()

def rows(c, query, args=()): return [dict(r) for r in c.execute(query,args).fetchall()]
def one(c, query, args=()):
    r=c.execute(query,args).fetchone(); return dict(r) if r else None
def timeline(c, lead, event, detail='', is_demo=True): c.execute('INSERT INTO ds_timeline(id,lead_slug,event,detail,created_at,is_demo) VALUES(?,?,?,?,?,?)',(ident('evt'),lead,event,detail,now(),1 if is_demo else 0))

def get_settings():
    c=connect(); result={r['key']:json.loads(r['value']) for r in c.execute('SELECT * FROM ds_settings')}; c.close(); return result
def update_settings(values):
    allowed={'company_name','seller_name','signature','phone','whatsapp','region','identity','language','demo_mode','limits','email_provider','email_sender','email_reply_to','smtp_host','smtp_port','smtp_user','spf_status','dkim_status','dmarc_status','hour_limit','day_limit','followup_days'}
    c=connect()
    for k,v in values.items():
        if k in allowed and not any(x in k.lower() for x in ('secret','key','password')): c.execute('INSERT OR REPLACE INTO ds_settings VALUES(?,?,?)',(k,json.dumps(v),now()))
    c.commit(); c.close(); return get_settings()
def products():
    c=connect(); result=rows(c,'SELECT * FROM ds_products ORDER BY id'); c.close(); return result
def update_product(product_id, values):
    allowed={'name','billing','public_price','base_price','cost','commission_pct','max_discount_pct','currency','active','terms'}
    c=connect(); fields=[k for k in values if k in allowed]
    if not fields: c.close(); return {'error':'Nenhum campo comercial permitido'}
    c.execute('UPDATE ds_products SET %s,updated_at=? WHERE id=?' % ','.join('%s=?'%k for k in fields),[values[k] for k in fields]+[now(),product_id]); c.commit(); r=one(c,'SELECT * FROM ds_products WHERE id=?',(product_id,)); c.close(); return r

def create_proposal(lead_slug, product_id, negotiated_price=None, terms='Pagamento mock local', valid_days=7):
    c=connect(); p=one(c,'SELECT * FROM ds_products WHERE id=? AND active=1',(product_id,))
    if not p: c.close(); return {'error':'Produto não disponível'}
    base=float(p['base_price']); price=base if negotiated_price is None else float(negotiated_price); discount=base-price
    if price<=0 or discount > base*float(p['max_discount_pct'])/100: c.close(); return {'error':'Preço inválido ou desconto acima do máximo'}
    r={'id':ident('prop'),'lead_slug':lead_slug,'product_id':product_id,'base_price':base,'negotiated_price':price,'discount':discount,'margin':price-float(p['cost']),'currency':p['currency'],'terms':terms,'valid_until':(dt.date.today()+dt.timedelta(days=valid_days)).isoformat(),'version':1,'status':'draft','created_at':now()}
    c.execute('INSERT INTO ds_proposals VALUES(:id,:lead_slug,:product_id,:base_price,:negotiated_price,:discount,:margin,:currency,:terms,:valid_until,:version,:status,:created_at)',r); timeline(c,lead_slug,'proposal.created',r['id']); c.commit(); c.close(); return r
def create_email(lead_slug, proposal_id, subject, body):
    s=get_settings(); c=connect(); r={'id':ident('email'),'lead_slug':lead_slug,'proposal_id':proposal_id,'sender':s.get('email_sender','demo@local.invalid'),'recipient':'','reply_to':s.get('email_reply_to','demo@local.invalid'),'subject':subject,'body':body,'template':'default','status':'draft','attempt':0,'error':None,'created_at':now(),'updated_at':now()}
    lead=one(c,'SELECT email FROM leads WHERE slug=?',(lead_slug,)); r['recipient']=(lead or {}).get('email','')
    c.execute('INSERT INTO ds_emails VALUES(:id,:lead_slug,:proposal_id,:sender,:recipient,:reply_to,:subject,:body,:template,:status,:attempt,:error,:created_at,:updated_at)',r); timeline(c,lead_slug,'email.draft',r['id']); c.commit(); c.close(); return r
def email_transition(email_id, status, response_fixture=''):
    if status not in ('reviewed','approved','sent_simulated','delivered_simulated','positive_reply','negative_reply','bounce','failed','no_reply','generic_reply'): return {'error':'Estado de e-mail inválido'}
    c=connect(); e=one(c,'SELECT * FROM ds_emails WHERE id=?',(email_id,))
    if not e: c.close(); return {'error':'E-mail não encontrado'}
    if status=='sent_simulated' and e['status']!='approved': c.close(); return {'error':'Somente rascunho aprovado pode ser enviado/simulado'}
    c.execute('UPDATE ds_emails SET status=?,attempt=attempt+?,updated_at=? WHERE id=?',(status,1 if status=='sent_simulated' else 0,now(),email_id)); timeline(c,e['lead_slug'],'email.'+status,response_fixture); c.commit(); c.close(); return {'ok':True,'status':status}
def create_order(proposal_id):
    c=connect(); p=one(c,'SELECT * FROM ds_proposals WHERE id=?',(proposal_id,))
    if not p: c.close(); return {'error':'Proposta não encontrada'}
    prod=one(c,'SELECT * FROM ds_products WHERE id=?',(p['product_id'],)); s=get_settings(); r={'id':ident('ord'),'lead_slug':p['lead_slug'],'product_id':p['product_id'],'offer_name':prod['name'],'seller':s.get('seller_name','Vendedor DEMO'),'base_price':p['base_price'],'negotiated_price':p['negotiated_price'],'discount':p['discount'],'cost':prod['cost'],'margin':p['margin'],'currency':p['currency'],'commission_pct':prod['commission_pct'],'status':'open','created_at':now()}
    c.execute('INSERT INTO ds_orders VALUES(:id,:lead_slug,:product_id,:offer_name,:seller,:base_price,:negotiated_price,:discount,:cost,:margin,:currency,:commission_pct,:status,:created_at)',r); c.execute('UPDATE ds_proposals SET status="accepted" WHERE id=?',(proposal_id,)); timeline(c,r['lead_slug'],'order.created',r['id']); c.commit(); c.close(); return r
def checkout(order_id, result=None):
    c=connect(); o=one(c,'SELECT * FROM ds_orders WHERE id=?',(order_id,))
    if not o: c.close(); return {'error':'Pedido não encontrado'}
    ck=one(c,'SELECT * FROM ds_checkouts WHERE order_id=?',(order_id,))
    if not ck:
        ck={'id':ident('checkout'),'order_id':order_id,'status':'open','expires_at':(dt.date.today()+dt.timedelta(days=1)).isoformat(),'created_at':now()}; c.execute('INSERT INTO ds_checkouts VALUES(:id,:order_id,:status,:expires_at,:created_at)',ck); timeline(c,o['lead_slug'],'checkout.open',ck['id'])
    if result in ('completed','abandoned','expired'): c.execute('UPDATE ds_checkouts SET status=? WHERE order_id=?',(result,order_id)); ck['status']=result; timeline(c,o['lead_slug'],'checkout.'+result,ck['id'])
    c.commit(); c.close(); return ck
def payment(order_id, status):
    if status not in ('pending','approved','declined','cancelled','refunded'): return {'error':'Pagamento inválido'}
    c=connect(); o=one(c,'SELECT * FROM ds_orders WHERE id=?',(order_id,))
    if not o: c.close(); return {'error':'Pedido não encontrado'}
    existing=one(c,'SELECT * FROM ds_payments WHERE order_id=?',(order_id,));
    if existing and existing['status']=='approved': c.close(); return existing
    if existing: c.execute('UPDATE ds_payments SET status=?,updated_at=? WHERE order_id=?',(status,now(),order_id))
    else: c.execute('INSERT INTO ds_payments VALUES(?,?,?,?,?,?,?)',(ident('pay'),order_id,status,o['negotiated_price'],o['currency'],now(),now()))
    c.execute('UPDATE ds_orders SET status=? WHERE id=?',('paid' if status=='approved' else status,order_id)); timeline(c,o['lead_slug'],'payment.'+status,order_id)
    if status=='approved':
        c.execute('INSERT OR IGNORE INTO ds_handoffs VALUES(?,?,?,?,?,?,?,?,?,?,?)',(ident('hand'),order_id,o['product_id'],o['lead_slug'],o['seller'],'','pending',0,None,now(),now()))
        amount=float(o['negotiated_price'])*float(o['commission_pct'])/100; c.execute('INSERT OR IGNORE INTO ds_commissions VALUES(?,?,?,?,?,?,?,?)',(ident('comm'),order_id,o['seller'],o['negotiated_price'],o['commission_pct'],amount,'pending',now())); timeline(c,o['lead_slug'],'handoff.created',order_id)
    c.commit(); result=one(c,'SELECT * FROM ds_payments WHERE order_id=?',(order_id,)); c.close(); return result
def generate_contract(order_id):
    c=connect(); o=one(c,'SELECT * FROM ds_orders WHERE id=?',(order_id,))
    if not o: c.close(); return {'error':'Pedido não encontrado'}
    html='<html><body><h1>Contrato DEMO / TESTE</h1><p>Pedido %s — %s %s</p></body></html>'%(o['id'],o['currency'],o['negotiated_price']); existing=one(c,'SELECT * FROM ds_contracts WHERE order_id=?',(order_id,))
    if existing: c.execute('UPDATE ds_contracts SET status="generated",html=?,updated_at=? WHERE order_id=?',(html,now(),order_id))
    else: c.execute('INSERT INTO ds_contracts VALUES(?,?,?,?,?,?)',(ident('contract'),order_id,'generated',html,now(),now()))
    timeline(c,o['lead_slug'],'contract.generated',order_id); c.commit(); r=one(c,'SELECT * FROM ds_contracts WHERE order_id=?',(order_id,)); c.close(); return r
def handoff(order_id, status='sent'):
    if status not in ('pending','sent','executing','delivered','failed'): return {'error':'Handoff inválido'}
    c=connect(); h=one(c,'SELECT * FROM ds_handoffs WHERE order_id=?',(order_id,))
    if not h: c.close(); return {'error':'Handoff só existe após pagamento aprovado'}
    c.execute('UPDATE ds_handoffs SET status=?,updated_at=? WHERE order_id=?',(status,now(),order_id)); o=one(c,'SELECT * FROM ds_orders WHERE id=?',(order_id,)); timeline(c,o['lead_slug'],'handoff.'+status,order_id); c.commit(); r=one(c,'SELECT * FROM ds_handoffs WHERE order_id=?',(order_id,)); c.close(); return r
def financial_summary():
    c=connect(); r=one(c,"SELECT COUNT(*) sales,COALESCE(SUM(negotiated_price),0) revenue,COALESCE(SUM(cost),0) cost,COALESCE(SUM(margin),0) margin FROM ds_orders WHERE status='paid'"); received=one(c,"SELECT COALESCE(SUM(amount),0) received FROM ds_payments WHERE status='approved'"); comm=one(c,"SELECT COALESCE(SUM(amount),0) commission FROM ds_commissions"); mrr=one(c,"SELECT COALESCE(SUM(o.negotiated_price),0) mrr FROM ds_orders o JOIN ds_products p ON p.id=o.product_id WHERE o.status='paid' AND p.billing='recurring'"); c.close(); return dict(r,received=received['received'],receivable=r['revenue']-received['received'],mrr=mrr['mrr'],projection=r['revenue']+mrr['mrr']*12,commission=comm['commission'])
def create_local_preview(lead_slug, kind='redesign'):
    """Preview local factual: só utiliza os campos já registrados no lead."""
    c=connect(); lead=one(c,'SELECT * FROM leads WHERE slug=?',(lead_slug,))
    if not lead: c.close(); return {'error':'Lead não encontrado'}
    name=lead.get('nome') or lead_slug; contact=lead.get('email') or lead.get('whatsapp') or lead.get('siteAntigo') or 'Contato público não informado'
    content='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>%s — preview local</title><body style="font-family:system-ui;max-width:760px;margin:40px auto;padding:24px"><small>PREVIEW LOCAL / DEMO — revisão humana obrigatória</small><h1>%s</h1><p>Prévia baseada somente nos dados públicos registrados no CRM.</p><p><b>Contato:</b> %s</p><p>Serviços e provas sociais não são inventados neste preview.</p></body></html>' % (name,name,contact)
    preview={'id':ident('preview'),'lead_slug':lead_slug,'kind':kind,'url':'/api/previews/PLACEHOLDER','content':content,'status':'published_mock','created_at':now()}; preview['url']='/api/previews/'+preview['id']; c.execute('INSERT INTO ds_previews VALUES(:id,:lead_slug,:kind,:url,:content,:status,:created_at)',preview); timeline(c,lead_slug,'preview.published_mock',preview['id']); c.commit(); c.close(); return preview
def edit_preview(preview_id, title='', body='', cta='', contact=''):
    """Adapta o preview existente; não cria conteúdo além dos campos revisados pelo operador."""
    c=connect(); p=one(c,'SELECT * FROM ds_previews WHERE id=?',(preview_id,))
    if not p: c.close(); return {'error':'Preview não encontrado'}
    import html
    content='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;max-width:760px;margin:40px auto;padding:24px"><small>PREVIEW LOCAL / DEMO — revisão humana obrigatória</small><h1>%s</h1><p>%s</p><p><b>CTA:</b> %s</p><p><b>Contato:</b> %s</p></body></html>' % tuple(html.escape(str(x)) for x in (title,body,cta,contact))
    c.execute('UPDATE ds_previews SET content=? WHERE id=?',(content,preview_id)); timeline(c,p['lead_slug'],'preview.edited',preview_id); c.commit(); result=one(c,'SELECT * FROM ds_previews WHERE id=?',(preview_id,)); c.close(); return result
def qualify_lead(lead_slug, facts, hypotheses, recommendation, reason, confidence, validation_question='', next_action='', owner=''):
    if recommendation not in ('datta360','dattavps','dattaseg','dattahost','insufficient'): return {'error':'Recomendação inválida'}
    if not isinstance(facts,list) or not isinstance(hypotheses,list): return {'error':'Fatos e hipóteses devem ser listas separadas'}
    c=connect(); lead=one(c,'SELECT slug FROM leads WHERE slug=?',(lead_slug,))
    if not lead: c.close(); return {'error':'Lead não encontrado'}
    r={'id':ident('qual'),'lead_slug':lead_slug,'facts':json.dumps(facts,ensure_ascii=False),'hypotheses':json.dumps(hypotheses,ensure_ascii=False),'recommendation':recommendation,'reason':reason,'confidence':confidence,'validation_question':validation_question,'next_action':next_action,'owner':owner,'created_at':now()}
    c.execute('INSERT INTO ds_qualifications VALUES(:id,:lead_slug,:facts,:hypotheses,:recommendation,:reason,:confidence,:validation_question,:next_action,:owner,:created_at)',r); c.execute('UPDATE leads SET product_suggested=?,product_reason=?,next_action=? WHERE slug=?',(recommendation if recommendation!='insufficient' else '',reason,next_action,lead_slug)); timeline(c,lead_slug,'qualification.created',r['id']); c.commit(); c.close(); return r
def diagnose_site(lead_slug, criteria):
    forbidden={'velocidade','seo','segurança','vulnerabilidade','penalidade google'}
    if not isinstance(criteria,list) or any(not isinstance(x,dict) or not {'criterion','observed_state','evidence','recommendation'}.issubset(x) for x in criteria): return {'error':'Critérios devem conter criterion, observed_state, evidence e recommendation'}
    if any(str(x.get('criterion','')).lower() in forbidden for x in criteria): return {'error':'Critério técnico exige teste específico e não pode ser declarado aqui'}
    c=connect(); r={'id':ident('diag'),'lead_slug':lead_slug,'criteria':json.dumps(criteria,ensure_ascii=False),'created_at':now()}; c.execute('INSERT INTO ds_site_diagnoses VALUES(:id,:lead_slug,:criteria,:created_at)',r); c.execute('UPDATE leads SET site_audit_json=? WHERE slug=?',(r['criteria'],lead_slug)); timeline(c,lead_slug,'site_diagnosis.created',r['id']); c.commit(); c.close(); return r
def audit_social(lead_slug, platform, **fields):
    if platform not in ('instagram','tiktok'): return {'error':'Plataforma deve ser instagram ou tiktok'}
    allowed=['url','username','bio','cta','link','visual_identity','consistency_note','frequency_note','factual_notes','recommendation','creative_direction','evidence']; c=connect(); r={'id':ident('social'),'lead_slug':lead_slug,'platform':platform,'created_at':now()}; r.update({k:str(fields.get(k,'')) for k in allowed}); c.execute('INSERT INTO ds_social_audits VALUES(:id,:lead_slug,:platform,:url,:username,:bio,:cta,:link,:visual_identity,:consistency_note,:frequency_note,:factual_notes,:recommendation,:creative_direction,:evidence,:created_at)',r); c.execute('UPDATE leads SET instagram_audit_json=? WHERE slug=?',(json.dumps(r,ensure_ascii=False),lead_slug)); timeline(c,lead_slug,'social_audit.created',r['id']); c.commit(); c.close(); return r
def reset_demo():
    """Remove apenas transações ligadas a produtos DEMO, nunca configuração ou dados reais."""
    c=connect()
    demo_orders="SELECT o.id FROM ds_orders o JOIN ds_products p ON p.id=o.product_id WHERE p.is_demo=1"
    demo_props="SELECT pr.id FROM ds_proposals pr JOIN ds_products p ON p.id=pr.product_id WHERE p.is_demo=1"
    c.execute('DELETE FROM ds_emails WHERE proposal_id IN (%s)' % demo_props)
    for table in ('ds_checkouts','ds_payments','ds_contracts','ds_handoffs','ds_commissions'):
        c.execute('DELETE FROM %s WHERE order_id IN (%s)' % (table,demo_orders))
    c.execute('DELETE FROM ds_orders WHERE id IN (%s)' % demo_orders)
    c.execute('DELETE FROM ds_proposals WHERE id IN (%s)' % demo_props)
    c.execute('DELETE FROM ds_timeline WHERE is_demo=1')
    c.commit(); c.close(); return {'ok':True,'message':'Dados transacionais DEMO removidos; configurações, produtos e dados não DEMO preservados.'}

def self_test():
    # Testa ciclo simples inteiro no banco configurado por DS_DB_TEST, sem dados reais.
    global DB
    original=DB; DB=os.environ.get('DS_DB_TEST',os.path.join(os.path.dirname(original),'dattaseller-test.db'))
    if os.path.exists(DB): os.remove(DB)
    c=connect(); c.execute("CREATE TABLE IF NOT EXISTS leads(slug TEXT PRIMARY KEY,email TEXT)"); c.execute("INSERT INTO leads VALUES('lead-demo','lead@local.invalid')"); c.commit(); c.close()
    p=create_proposal('lead-demo','dattavps'); assert p['status']=='draft'
    e=create_email('lead-demo',p['id'],'Assunto natural','Mensagem factual'); assert email_transition(e['id'],'approved')['ok']; assert email_transition(e['id'],'sent_simulated')['ok']
    o=create_order(p['id']); assert checkout(o['id'])['status']=='open'; assert payment(o['id'],'approved')['status']=='approved'; assert payment(o['id'],'approved')['status']=='approved'; assert generate_contract(o['id'])['status']=='generated'; assert handoff(o['id'],'delivered')['status']=='delivered'; assert financial_summary()['sales']==1
    print('DATTASELLER LOCAL E2E OK'); os.remove(DB); DB=original

if __name__ == '__main__': self_test()
