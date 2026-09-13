#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prospector — servidor local do dashboard (SQLite). Sem dependências: só Python padrão.
Uso: python dashboard-server.py  (ou duplo clique em iniciar-dashboard.bat)
Abre em http://localhost:8765 — edições, exclusões e drag&drop salvam no prospector.db"""
import json, sqlite3, os, sys, webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PASTA = os.path.dirname(os.path.abspath(__file__))
os.chdir(PASTA)
DB = os.path.normpath(os.path.join(PASTA, '..', 'data', 'dattaseller-local.db'))
CONFIG = os.path.join(PASTA, 'prospector-config.json')

def ler_config():
    try: return json.load(open(CONFIG, encoding='utf-8'))
    except Exception: return {}

# O CRM original continua dono da tabela leads. O módulo novo acrescenta as
# entidades comerciais ao mesmo arquivo SQLite, sem criar um segundo CRM.
import dattaseller_local as local
PORTA = 8765
CAMPOS = ['slug','nome','nicho','cidade','nota','avaliacoes','email','telefone','whatsapp',
          'siteAntigo','motivo','status','urlNova','dataProposta','valor','obs',
          'contratoStatus','contratoEm','manutencao','pago','docCliente','endCliente',
          'instagram_url','source_url','source_checked_at','public_contact_type',
          'product_suggested','product_reason','next_action','delivery_status',
          'checkout_url','checkout_presented_at','checkout_clicked_at','qualification_json',
          'site_audit_json','instagram_audit_json','valor_fechado','closing_confirmed_at']

def conexao():
    c = sqlite3.connect(DB)
    c.execute('''CREATE TABLE IF NOT EXISTS leads(
        slug TEXT PRIMARY KEY, nome TEXT, nicho TEXT, cidade TEXT, nota REAL, avaliacoes INTEGER,
        email TEXT, telefone TEXT, whatsapp TEXT, siteAntigo TEXT, motivo TEXT,
        status TEXT DEFAULT 'novo', urlNova TEXT, dataProposta TEXT, valor REAL, obs TEXT,
        contratoStatus TEXT DEFAULT 'pendente', contratoEm TEXT, manutencao REAL, pago INTEGER DEFAULT 0,
        docCliente TEXT, endCliente TEXT, instagram_url TEXT, source_url TEXT, source_checked_at TEXT,
        public_contact_type TEXT, product_suggested TEXT, product_reason TEXT, next_action TEXT,
        delivery_status TEXT, checkout_url TEXT, checkout_presented_at TEXT, checkout_clicked_at TEXT,
        qualification_json TEXT, site_audit_json TEXT, instagram_audit_json TEXT, valor_fechado REAL,
        closing_confirmed_at TEXT,
        atualizado TEXT DEFAULT (datetime('now','localtime')))''')
    for col, tipo in [('contratoStatus',"TEXT DEFAULT 'pendente'"),('contratoEm','TEXT'),('manutencao','REAL'),('pago','INTEGER DEFAULT 0'),('docCliente','TEXT'),('endCliente','TEXT'),('instagram_url','TEXT'),('source_url','TEXT'),('source_checked_at','TEXT'),('public_contact_type','TEXT'),('product_suggested','TEXT'),('product_reason','TEXT'),('next_action','TEXT'),('delivery_status','TEXT'),('checkout_url','TEXT'),('checkout_presented_at','TEXT'),('checkout_clicked_at','TEXT'),('qualification_json','TEXT'),('site_audit_json','TEXT'),('instagram_audit_json','TEXT'),('valor_fechado','REAL'),('closing_confirmed_at','TEXT')]:
        try: c.execute('ALTER TABLE leads ADD COLUMN %s %s' % (col, tipo))
        except sqlite3.OperationalError: pass
    return c

def importar_snapshot():
    """Primeira execução sem banco: importa os leads embutidos no dashboard.html."""
    try:
        html = open(os.path.join(PASTA, 'dashboard.html'), encoding='utf-8').read()
        ini = html.index('<script id="dados" type="application/json">') + len('<script id="dados" type="application/json">')
        fim = html.index('</script>', ini)
        dados = json.loads(html[ini:fim])
        c = conexao()
        for l in dados.get('leads', []):
            c.execute('INSERT OR IGNORE INTO leads (%s) VALUES (%s)' % (','.join(CAMPOS), ','.join('?'*len(CAMPOS))),
                      [l.get(k) for k in CAMPOS])
        c.commit(); c.close()
        print('Snapshot importado do dashboard.html para o prospector.db')
    except Exception as e:
        print('(sem snapshot para importar: %s)' % e)

class App(SimpleHTTPRequestHandler):
    def _json(self, code, obj):
        corpo = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(corpo)))
        self.end_headers(); self.wfile.write(corpo)
    def _corpo(self):
        n = int(self.headers.get('Content-Length', 0))
        return json.loads(self.rfile.read(n).decode('utf-8')) if n else {}
    def do_GET(self):
        path = self.path.split('?')[0]
        if path == '/api/settings': return self._json(200, local.get_settings())
        if path == '/api/products': return self._json(200, local.products())
        if path == '/api/previews':
            c=local.connect(); result=local.rows(c,'SELECT id,lead_slug,kind,url,status,created_at FROM ds_previews ORDER BY created_at DESC'); c.close(); return self._json(200,result)
        if path.startswith('/api/previews/'):
            c=local.connect(); preview=local.one(c,'SELECT * FROM ds_previews WHERE id=?',(path.split('/')[3],)); c.close()
            if not preview: return self._json(404,{'error':'Preview não encontrado'})
            body=preview['content'].encode('utf-8'); self.send_response(200); self.send_header('Content-Type','text/html; charset=utf-8'); self.send_header('Content-Length',str(len(body))); self.end_headers(); self.wfile.write(body); return
        if path == '/api/financial': return self._json(200, local.financial_summary())
        if path in ('/api/proposals','/api/emails','/api/orders','/api/checkouts','/api/payments','/api/contracts','/api/handoffs','/api/commissions','/api/qualifications','/api/diagnoses','/api/social-audits'):
            table=path.split('/')[-1]
            table={'checkouts':'ds_checkouts','payments':'ds_payments','proposals':'ds_proposals','emails':'ds_emails','orders':'ds_orders','contracts':'ds_contracts','handoffs':'ds_handoffs','commissions':'ds_commissions','qualifications':'ds_qualifications','diagnoses':'ds_site_diagnoses','social-audits':'ds_social_audits'}[table]
            c=local.connect(); result=local.rows(c,'SELECT * FROM %s ORDER BY created_at DESC' % table); c.close(); return self._json(200,result)
        if path == '/api/timeline':
            c=local.connect(); result=local.rows(c,'SELECT * FROM ds_timeline ORDER BY created_at DESC'); c.close(); return self._json(200,result)
        if self.path.split('?')[0] == '/api/config':
            cfg = ler_config()
            return self._json(200, {'contratante': cfg.get('contratante', {}), 'dattavps': cfg.get('dattavps', {})})
        if self.path.split('?')[0] == '/api/leads':
            c = conexao(); c.row_factory = sqlite3.Row
            rows = [dict(r) for r in c.execute('SELECT * FROM leads').fetchall()]; c.close()
            return self._json(200, rows)
        if self.path in ('/', ''):
            self.path = '/dashboard.html'
        return SimpleHTTPRequestHandler.do_GET(self)
    def do_POST(self):
        path = self.path.split('?')[0]; body = self._corpo()
        if path == '/api/proposals': return self._json(200, local.create_proposal(body.get('lead_slug',''),body.get('product_id',''),body.get('negotiated_price'),body.get('terms','Pagamento mock local'),int(body.get('valid_days',7))))
        if path == '/api/qualifications': return self._json(200, local.qualify_lead(body.get('lead_slug',''),body.get('facts',[]),body.get('hypotheses',[]),body.get('recommendation','insufficient'),body.get('reason',''),body.get('confidence','low'),body.get('validation_question',''),body.get('next_action',''),body.get('owner','')))
        if path == '/api/diagnoses': return self._json(200, local.diagnose_site(body.get('lead_slug',''),body.get('criteria',[])))
        if path == '/api/social-audits':
            fields=dict(body); fields.pop('lead_slug',None); fields.pop('platform',None); return self._json(200, local.audit_social(body.get('lead_slug',''),body.get('platform',''),**fields))
        if path == '/api/previews': return self._json(200, local.create_local_preview(body.get('lead_slug',''),body.get('kind','redesign')))
        if path == '/api/emails': return self._json(200, local.create_email(body.get('lead_slug',''),body.get('proposal_id'),body.get('subject',''),body.get('body','')))
        if path.startswith('/api/emails/') and path.endswith('/transition'):
            return self._json(200, local.email_transition(path.split('/')[3],body.get('status',''),body.get('fixture','')))
        if path == '/api/orders': return self._json(200, local.create_order(body.get('proposal_id','')))
        if path.startswith('/api/orders/') and path.endswith('/checkout'):
            return self._json(200, local.checkout(path.split('/')[3],body.get('result')))
        if path.startswith('/api/orders/') and path.endswith('/payment'):
            return self._json(200, local.payment(path.split('/')[3],body.get('status','pending')))
        if path.startswith('/api/orders/') and path.endswith('/contract'):
            return self._json(200, local.generate_contract(path.split('/')[3]))
        if path.startswith('/api/orders/') and path.endswith('/handoff'):
            return self._json(200, local.handoff(path.split('/')[3],body.get('status','sent')))
        if path.startswith('/api/contracts/') and path.endswith('/transition'):
            status=body.get('status','generated')
            if status not in ('generated','sent_simulated','signed','refused','cancelled'): return self._json(400,{'error':'Estado de contrato inválido'})
            c=local.connect(); existing=local.one(c,'SELECT * FROM ds_contracts WHERE id=?',(path.split('/')[3],))
            if not existing: c.close(); return self._json(404,{'error':'Contrato não encontrado'})
            c.execute('UPDATE ds_contracts SET status=?,updated_at=? WHERE id=?',(status,local.now(),existing['id'])); c.commit(); result=local.one(c,'SELECT * FROM ds_contracts WHERE id=?',(existing['id'],)); c.close(); return self._json(200,result)
        if path == '/api/demo/reset': return self._json(200, local.reset_demo())
        if self.path.split('?')[0] == '/api/leads':
            l = body; c = conexao()
            if l.get('status') == 'fechado':
                c.close(); return self._json(400, {'erro': 'Fechamento exige confirmação explícita e valor_fechado positivo.'})
            c.execute('INSERT OR REPLACE INTO leads (%s) VALUES (%s)' % (','.join(CAMPOS), ','.join('?'*len(CAMPOS))),
                      [l.get(k) for k in CAMPOS])
            c.commit(); c.close(); return self._json(200, {'ok': True})
        return self._json(404, {'erro': 'rota'})
    def do_PUT(self):
        path = self.path.split('?')[0]
        if path.startswith('/api/previews/'):
            body=self._corpo(); return self._json(200, local.edit_preview(path.split('/')[3],body.get('title',''),body.get('body',''),body.get('cta',''),body.get('contact','')))
        if path == '/api/settings': return self._json(200, local.update_settings(self._corpo()))
        if path.startswith('/api/products/'):
            return self._json(200, local.update_product(path.split('/')[3], self._corpo()))
        if self.path.split('?')[0] == '/api/config':
            cfg = ler_config(); corpo = self._corpo()
            if 'contratante' in corpo:
                ct = cfg.get('contratante', {})
                ct.update({k: v for k, v in corpo['contratante'].items() if isinstance(v, str)})
                cfg['contratante'] = ct
            if 'dattavps' in corpo:
                recebido = corpo['dattavps'] if isinstance(corpo['dattavps'], dict) else {}
                permitido = {'checkout_url', 'offer_name', 'offer_description', 'offer_price', 'enabled'}
                vps = cfg.get('dattavps', {})
                vps.update({k: v for k, v in recebido.items() if k in permitido and isinstance(v, (str, int, float, bool))})
                vps['enabled'] = vps.get('enabled') is True
                if vps['enabled']:
                    from urllib.parse import urlparse
                    url = str(vps.get('checkout_url', '')).strip()
                    try: preco = float(vps.get('offer_price', 0))
                    except (TypeError, ValueError): preco = 0
                    parsed = urlparse(url)
                    if parsed.scheme != 'https' or not parsed.netloc or not str(vps.get('offer_name', '')).strip() or not str(vps.get('offer_description', '')).strip() or preco <= 0:
                        return self._json(400, {'erro': 'Para ativar, informe nome, descrição, preço positivo e URL oficial HTTPS.'})
                vps.setdefault('notice', 'Preencha somente com a URL oficial aprovada. Nenhum checkout é criado localmente.')
                cfg['dattavps'] = vps
            else:  # compatibilidade: corpo plano = contratante
                if 'contratante' not in corpo:
                    ct = cfg.get('contratante', {})
                    ct.update({k: v for k, v in corpo.items() if isinstance(v, str)})
                    cfg['contratante'] = ct
            json.dump(cfg, open(CONFIG, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
            return self._json(200, {'ok': True})
        partes = self.path.split('?')[0].split('/')
        if len(partes) == 4 and partes[1] == 'api' and partes[2] == 'leads':
            slug, ch = partes[3], self._corpo()
            if ch.get('status') == 'fechado':
                valor = ch.get('valor_fechado', ch.get('valor'))
                if ch.get('closingConfirmed') is not True or not isinstance(valor, (int, float)) or valor <= 0:
                    return self._json(400, {'erro': 'Fechamento exige confirmação explícita e valor_fechado positivo.'})
                ch['valor_fechado'] = valor
                ch['valor'] = valor
                ch['closing_confirmed_at'] = __import__('datetime').datetime.now().isoformat(timespec='seconds')
            sets = [k for k in ch if k in CAMPOS and k != 'slug']
            if sets:
                c = conexao()
                c.execute('UPDATE leads SET %s, atualizado=datetime("now","localtime") WHERE slug=?' %
                          ','.join('%s=?' % k for k in sets), [ch[k] for k in sets] + [slug])
                c.commit(); c.close()
            return self._json(200, {'ok': True})
        return self._json(404, {'erro': 'rota'})
    def do_DELETE(self):
        partes = self.path.split('?')[0].split('/')
        if len(partes) == 4 and partes[1] == 'api' and partes[2] == 'leads':
            c = conexao(); c.execute('DELETE FROM leads WHERE slug=?', (partes[3],)); c.commit(); c.close()
            return self._json(200, {'ok': True})
        return self._json(404, {'erro': 'rota'})
    def log_message(self, *a): pass

if __name__ == '__main__':
    novo = not os.path.exists(DB)
    conexao().close()
    if novo: importar_snapshot()
    print('Prospector rodando em http://localhost:%d  (Ctrl+C para parar)' % PORTA)
    try: webbrowser.open('http://localhost:%d' % PORTA)
    except Exception: pass
    try: ThreadingHTTPServer(('127.0.0.1', PORTA), App).serve_forever()
    except KeyboardInterrupt: print('\nEncerrado.')
