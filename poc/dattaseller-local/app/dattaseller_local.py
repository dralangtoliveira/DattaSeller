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
      adapter TEXT NOT NULL, is_demo INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ds_timeline (id TEXT PRIMARY KEY, lead_slug TEXT, event TEXT NOT NULL, detail TEXT, created_at TEXT NOT NULL);
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
    ''')
    for p, name, billing, price, cost, pct in DEMO_PRODUCTS:
        c.execute('''INSERT OR IGNORE INTO ds_products(id,name,billing,public_price,base_price,cost,commission_pct,max_discount_pct,currency,active,adapter,is_demo,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,1,?,1,?)''', (p,name,billing,price,price,cost,pct,20,'BRL','Mock%sAdapter' % p.title(),now()))
    defaults = {'company_name':'DattaSeller','seller_name':'Vendedor DEMO','demo_mode':True,'email_provider':'mock','email_sender':'demo@local.invalid','email_reply_to':'demo@local.invalid','followup_days':3}
    for k,v in defaults.items(): c.execute('INSERT OR IGNORE INTO ds_settings VALUES(?,?,?)',(k,json.dumps(v),now()))
    c.commit()

def rows(c, query, args=()): return [dict(r) for r in c.execute(query,args).fetchall()]
def one(c, query, args=()):
    r=c.execute(query,args).fetchone(); return dict(r) if r else None
def timeline(c, lead, event, detail=''): c.execute('INSERT INTO ds_timeline VALUES(?,?,?,?,?)',(ident('evt'),lead,event,detail,now()))

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
    allowed={'name','billing','public_price','base_price','cost','commission_pct','max_discount_pct','currency','active'}
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
def reset_demo():
    c=connect(); c.executescript("DELETE FROM ds_timeline; DELETE FROM ds_proposals; DELETE FROM ds_emails; DELETE FROM ds_orders; DELETE FROM ds_checkouts; DELETE FROM ds_payments; DELETE FROM ds_contracts; DELETE FROM ds_handoffs; DELETE FROM ds_commissions;"); c.commit(); c.close(); return {'ok':True,'message':'Dados transacionais DEMO removidos; configurações, produtos e leads preservados.'}

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
