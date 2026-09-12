#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Prospector de Sites — servidor MCP do CRM (STDIO)
Funciona no ChatGPT (Work/Codex) e no Claude (Desktop/Cowork) ao mesmo tempo,
por cima do MESMO prospector.db do dashboard.

Instalação:  pip install "mcp[cli]"
Execução:    python prospector-mcp.py            (usa a pasta atual)
             python prospector-mcp.py --pasta "C:\\Users\\voce\\Desktop\\Clientes"
Teste local: python prospector-mcp.py --teste
"""
import argparse, json, os, sqlite3, sys, datetime, re, unicodedata
from urllib.parse import urlparse

parser = argparse.ArgumentParser()
parser.add_argument('--pasta', default=os.environ.get('PROSPECTOR_DIR', '.'),
                    help='Pasta do projeto (onde ficam prospector.db e dashboard.html)')
parser.add_argument('--teste', action='store_true', help='Roda o autoteste e sai')
ARGS, _ = parser.parse_known_args()
PASTA = os.path.abspath(ARGS.pasta)
DB = os.path.normpath(os.path.join(PASTA, '..', 'data', 'dattaseller-local.db'))

CAMPOS = ['slug','nome','nicho','cidade','nota','avaliacoes','email','telefone','whatsapp',
          'siteAntigo','motivo','status','urlNova','dataProposta','valor','obs',
          'contratoStatus','contratoEm','manutencao','pago','docCliente','endCliente',
          'instagram_url','source_url','source_checked_at','public_contact_type',
          'product_suggested','product_reason','next_action','delivery_status',
          'checkout_url','checkout_presented_at','checkout_clicked_at','qualification_json',
          'site_audit_json','instagram_audit_json','valor_fechado','closing_confirmed_at']
STATUS_VALIDOS = ['novo','redesenhado','publicado','proposta','respondeu','fechado','descartado']
PRODUTOS_VALIDOS = ['datta360','dattavps','ambos']
ENTREGAS_VALIDAS = ['nao_iniciado','checkout_apresentado','checkout_acessado','pagamento_confirmado_manual','handoff_manual','entregue','falha']

def conexao():
    c = sqlite3.connect(DB)
    c.execute('''CREATE TABLE IF NOT EXISTS leads(
        slug TEXT PRIMARY KEY, nome TEXT, nicho TEXT, cidade TEXT, nota REAL,
        avaliacoes INTEGER, email TEXT, telefone TEXT, whatsapp TEXT, siteAntigo TEXT,
        motivo TEXT, status TEXT DEFAULT 'novo', urlNova TEXT, dataProposta TEXT,
        valor REAL, obs TEXT, contratoStatus TEXT DEFAULT 'pendente', contratoEm TEXT,
        manutencao REAL, pago INTEGER DEFAULT 0, docCliente TEXT, endCliente TEXT,
        instagram_url TEXT, source_url TEXT, source_checked_at TEXT, public_contact_type TEXT,
        product_suggested TEXT, product_reason TEXT, next_action TEXT, delivery_status TEXT,
        checkout_url TEXT, checkout_presented_at TEXT, checkout_clicked_at TEXT,
        qualification_json TEXT, site_audit_json TEXT, instagram_audit_json TEXT,
        valor_fechado REAL, closing_confirmed_at TEXT,
        atualizado TEXT)''')
    for col, tipo in [('instagram_url','TEXT'),('source_url','TEXT'),('source_checked_at','TEXT'),('public_contact_type','TEXT'),('product_suggested','TEXT'),('product_reason','TEXT'),('next_action','TEXT'),('delivery_status','TEXT'),('checkout_url','TEXT'),('checkout_presented_at','TEXT'),('checkout_clicked_at','TEXT'),('qualification_json','TEXT'),('site_audit_json','TEXT'),('instagram_audit_json','TEXT'),('valor_fechado','REAL'),('closing_confirmed_at','TEXT')]:
        try: c.execute('ALTER TABLE leads ADD COLUMN %s %s' % (col, tipo))
        except sqlite3.OperationalError: pass
    c.commit()
    return c

def _linhas(rows, cols):
    return [dict(zip(cols, r)) for r in rows]

def _agora():
    return datetime.datetime.now().strftime('%Y-%m-%d %H:%M')

def _texto_normalizado(valor):
    texto = unicodedata.normalize('NFKD', str(valor or '')).encode('ascii', 'ignore').decode('ascii')
    return ' '.join(texto.lower().split())

def _telefone_normalizado(valor):
    return re.sub(r'\D', '', str(valor or ''))

def _url_normalizada(valor, somente_dominio=False):
    bruto = str(valor or '').strip().lower()
    if not bruto: return ''
    parsed = urlparse(bruto if '://' in bruto else 'https://' + bruto)
    dominio = (parsed.netloc or '').split('@')[-1].split(':')[0]
    if dominio.startswith('www.'): dominio = dominio[4:]
    if somente_dominio: return dominio
    return (dominio + parsed.path.rstrip('/')).strip('/')

def _encontrar_duplicado(dados):
    chaves = [
        ('nome', _texto_normalizado(dados.get('nome'))),
        ('dominio', _url_normalizada(dados.get('siteAntigo'), True)),
        ('telefone', _telefone_normalizado(dados.get('telefone') or dados.get('whatsapp'))),
        ('perfil', _url_normalizada(dados.get('instagram_url'))),
    ]
    for existente in f_listar():
        if existente.get('slug') == dados.get('slug'): continue
        valores = {
            'nome': _texto_normalizado(existente.get('nome')),
            'dominio': _url_normalizada(existente.get('siteAntigo'), True),
            'telefone': _telefone_normalizado(existente.get('telefone') or existente.get('whatsapp')),
            'perfil': _url_normalizada(existente.get('instagram_url')),
        }
        for campo, valor in chaves:
            if valor and valor == valores[campo]: return existente, campo
    return None, None

# ---------- Lógica (compartilhada entre MCP e autoteste) ----------

def f_listar(status=None):
    c = conexao(); cur = c.cursor()
    if status:
        cur.execute('SELECT %s FROM leads WHERE status=? ORDER BY nome' % ','.join(CAMPOS), (status,))
    else:
        cur.execute('SELECT %s FROM leads ORDER BY status, nome' % ','.join(CAMPOS))
    r = _linhas(cur.fetchall(), CAMPOS); c.close(); return r

def f_obter(slug):
    c = conexao(); cur = c.cursor()
    cur.execute('SELECT %s FROM leads WHERE slug=?' % ','.join(CAMPOS), (slug,))
    row = cur.fetchone(); c.close()
    return dict(zip(CAMPOS, row)) if row else None

def f_salvar(dados):
    if not dados.get('slug'):
        return {'erro': 'slug é obrigatório (ex.: maria-silva)'}
    if dados.get('status') and dados['status'] not in STATUS_VALIDOS:
        return {'erro': 'status inválido. Use: %s' % ', '.join(STATUS_VALIDOS)}
    if dados.get('product_suggested') and dados['product_suggested'].lower() not in PRODUTOS_VALIDOS:
        return {'erro': 'produto inválido. Use: %s' % ', '.join(PRODUTOS_VALIDOS)}
    if dados.get('delivery_status') and dados['delivery_status'] not in ENTREGAS_VALIDAS:
        return {'erro': 'delivery_status inválido. Use: %s' % ', '.join(ENTREGAS_VALIDAS)}
    if dados.get('status') == 'fechado':
        return {'erro': "Não marque 'fechado' por salvar_lead; use registrar_fechamento com confirmação explícita."}
    atual = f_obter(dados['slug'])
    duplicado_por = None
    if atual is None:
        atual, duplicado_por = _encontrar_duplicado(dados)
    atual = atual or {}
    slug_solicitado = dados['slug']
    if atual:
        dados = dict(dados)
        dados['slug'] = atual['slug']
        if duplicado_por and atual.get('nome'):
            dados['nome'] = atual['nome']
    atual.update({k: v for k, v in dados.items() if k in CAMPOS and v is not None})
    atual.setdefault('status', 'novo'); atual.setdefault('contratoStatus', 'pendente'); atual.setdefault('pago', 0)
    c = conexao()
    c.execute('INSERT OR REPLACE INTO leads (%s,atualizado) VALUES (%s,?)' % (','.join(CAMPOS), ','.join('?'*len(CAMPOS))),
              [atual.get(k) for k in CAMPOS] + [_agora()])
    c.commit(); c.close()
    resposta = {'ok': True, 'lead': atual['slug'], 'status': atual['status']}
    if duplicado_por:
        resposta.update({'deduplicado': True, 'duplicado_por': duplicado_por, 'slug_solicitado': slug_solicitado})
    return resposta

def f_status(slug, status, obs_extra=None):
    if status not in STATUS_VALIDOS:
        return {'erro': 'status inválido. Use: %s' % ', '.join(STATUS_VALIDOS)}
    if status == 'fechado':
        return {'erro': "Não marque 'fechado' por atualizar_status; use registrar_fechamento com confirmação explícita."}
    lead = f_obter(slug)
    if not lead: return {'erro': 'lead não encontrado: %s' % slug}
    c = conexao()
    if status == 'proposta' and not lead.get('dataProposta'):
        c.execute('UPDATE leads SET dataProposta=? WHERE slug=?', (datetime.date.today().isoformat(), slug))
    if obs_extra:
        novo_obs = ((lead.get('obs') or '') + ' | ' + obs_extra).strip(' |')
        c.execute('UPDATE leads SET obs=? WHERE slug=?', (novo_obs, slug))
    c.execute('UPDATE leads SET status=?, atualizado=? WHERE slug=?', (status, _agora(), slug))
    c.commit(); c.close()
    return {'ok': True, 'lead': slug, 'novo_status': status}

def f_fechar(slug, valor, manutencao=None, confirmacao_explicita=False):
    lead = f_obter(slug)
    if not lead: return {'erro': 'lead não encontrado: %s' % slug}
    if not confirmacao_explicita or not isinstance(valor, (int, float)) or valor <= 0:
        return {'erro': 'Fechamento exige confirmação explícita e valor_fechado positivo.'}
    c = conexao()
    c.execute('UPDATE leads SET status=?, valor=?, valor_fechado=?, manutencao=?, closing_confirmed_at=?, atualizado=? WHERE slug=?',
              ('fechado', valor, valor, manutencao, _agora(), _agora(), slug))
    c.commit(); c.close()
    return {'ok': True, 'lead': slug, 'valor': valor, 'manutencao': manutencao}

def f_followups(dias=3):
    limite = (datetime.date.today() - datetime.timedelta(days=dias)).isoformat()
    c = conexao(); cur = c.cursor()
    cur.execute("SELECT slug,nome,email,dataProposta,obs FROM leads WHERE status='proposta' AND dataProposta<=? ", (limite,))
    r = _linhas(cur.fetchall(), ['slug','nome','email','dataProposta','obs']); c.close()
    return [x for x in r if 'follow-up' not in (x.get('obs') or '').lower()]

def f_financeiro():
    c = conexao(); cur = c.cursor()
    cur.execute("SELECT COALESCE(SUM(valor),0), COALESCE(SUM(CASE WHEN pago=1 THEN valor ELSE 0 END),0), COALESCE(SUM(manutencao),0), COUNT(*) FROM leads WHERE status='fechado'")
    total, recebido, mrr, n = cur.fetchone(); c.close()
    return {'fechados': n, 'total_fechado': total, 'recebido': recebido,
            'a_receber': total - recebido, 'mrr_manutencoes': mrr, 'projecao_12m': total + mrr*12}

def f_dashboard():
    """Regenera o dashboard.html (snapshot) a partir do banco, se houver template na pasta."""
    tpl_path = None
    for cand in ['dashboard.html', 'dashboard-template.html']:
        p = os.path.join(PASTA, cand)
        if os.path.exists(p): tpl_path = p; break
    if not tpl_path: return {'erro': 'dashboard.html/template não encontrado na pasta %s' % PASTA}
    import re
    t = open(tpl_path, encoding='utf-8').read()
    dados = json.dumps({'atualizado': _agora(), 'leads': f_listar()}, ensure_ascii=False)
    if '__DADOS__' in t:
        novo = t.replace('__DADOS__', dados)
    else:
        novo = re.sub(r'(<script id="dados"[^>]*>).*?(</script>)', lambda m: m.group(1)+dados+m.group(2), t, flags=re.S)
    open(os.path.join(PASTA, 'dashboard.html'), 'w', encoding='utf-8').write(novo)
    return {'ok': True, 'leads': len(f_listar())}

# ---------- Autoteste ----------
if ARGS.teste:
    import tempfile
    PASTA = tempfile.mkdtemp(); DB = os.path.join(PASTA, 'prospector.db')
    print('1 salvar:', f_salvar({'slug':'teste-mcp','nome':'Teste MCP','email':'t@t.com','nicho':'nutricionista','cidade':'SP','telefone':'(11) 99999-0000'}))
    dedup = f_salvar({'slug':'teste-repetido','nome':'Outro nome','telefone':'11 99999-0000','source_url':'https://fonte.exemplo/perfil'})
    assert dedup.get('deduplicado') is True and dedup.get('lead') == 'teste-mcp' and len(f_listar()) == 1
    print('2 deduplicar:', dedup)
    f_salvar({'slug':'teste-dominio','nome':'Teste Domínio','siteAntigo':'https://www.exemplo.com/inicial'})
    dedup_dominio = f_salvar({'slug':'teste-dominio-repetido','nome':'Outro domínio','siteAntigo':'http://exemplo.com/outra'})
    assert dedup_dominio.get('duplicado_por') == 'dominio' and dedup_dominio.get('lead') == 'teste-dominio' and len(f_listar()) == 2
    print('3 deduplicar domínio:', dedup_dominio)
    print('4 listar:', len(f_listar()), 'lead(s)')
    print('5 status:', f_status('teste-mcp','proposta'))
    import sqlite3 as s3
    c=s3.connect(DB); c.execute("UPDATE leads SET dataProposta=date('now','-5 day') WHERE slug='teste-mcp'"); c.commit(); c.close()
    print('6 followups pendentes:', f_followups())
    print('7 fechar:', f_fechar('teste-mcp', 700, 100, True))
    print('8 financeiro:', f_financeiro())
    print('9 status inválido (deve dar erro):', f_status('teste-mcp','banana'))
    print('AUTOTESTE OK')
    sys.exit(0)

# ---------- Servidor MCP ----------
from mcp.server.fastmcp import FastMCP
mcp = FastMCP('prospector-crm')

@mcp.tool()
def listar_leads(status: str = '') -> str:
    """Lista os leads do CRM. Opcional: filtrar por status (novo, redesenhado, publicado, proposta, respondeu, fechado, descartado)."""
    return json.dumps(f_listar(status or None), ensure_ascii=False)

@mcp.tool()
def obter_lead(slug: str) -> str:
    """Retorna todos os dados de um lead pelo slug (ex.: maria-silva)."""
    return json.dumps(f_obter(slug) or {'erro': 'não encontrado'}, ensure_ascii=False)

@mcp.tool()
def salvar_lead(slug: str, nome: str = '', nicho: str = '', cidade: str = '', nota: float = 0,
                avaliacoes: int = 0, email: str = '', telefone: str = '', whatsapp: str = '',
                siteAntigo: str = '', motivo: str = '', urlNova: str = '', obs: str = '',
                instagram_url: str = '', source_url: str = '', source_checked_at: str = '',
                public_contact_type: str = '',
                product_suggested: str = '', product_reason: str = '', next_action: str = '',
                delivery_status: str = '', checkout_url: str = '', qualification_json: str = '',
                site_audit_json: str = '', instagram_audit_json: str = '') -> str:
    """Cria ou atualiza um lead no CRM (usar após prospectar ou ao corrigir dados). Slug no formato nome-sobrenome."""
    d = {k: v for k, v in locals().items() if v not in ('', 0)}
    return json.dumps(f_salvar(d), ensure_ascii=False)

@mcp.tool()
def atualizar_status(slug: str, status: str, observacao: str = '') -> str:
    """Move o lead no funil: novo → redesenhado → publicado → proposta → respondeu → fechado/descartado. NUNCA use 'fechado' sem confirmação explícita do usuário (para fechar com valor, use registrar_fechamento)."""
    return json.dumps(f_status(slug, status, observacao or None), ensure_ascii=False)

@mcp.tool()
def registrar_fechamento(slug: str, valor: float, manutencao_mensal: float = 0, confirmacao_explicita: bool = False) -> str:
    """Registra um cliente FECHADO com o valor acordado (e manutenção mensal, se houver). Use somente quando o usuário confirmar o fechamento e o valor."""
    return json.dumps(f_fechar(slug, valor, manutencao_mensal or None, confirmacao_explicita), ensure_ascii=False)

@mcp.tool()
def followups_pendentes(dias: int = 3) -> str:
    """Lista leads com proposta enviada há N+ dias, sem resposta e sem follow-up registrado — os que precisam de follow-up agora."""
    return json.dumps(f_followups(dias), ensure_ascii=False)

@mcp.tool()
def registrar_followup(slug: str) -> str:
    """Registra que o follow-up foi enviado hoje para o lead (1 por lead, nunca repetir)."""
    return json.dumps(f_status(slug, 'proposta', 'Follow-up enviado em %s' % datetime.date.today().isoformat()), ensure_ascii=False)

@mcp.tool()
def resumo_financeiro() -> str:
    """Painel financeiro: total fechado, recebido, a receber, MRR de manutenções e projeção 12 meses."""
    return json.dumps(f_financeiro(), ensure_ascii=False)

@mcp.tool()
def regenerar_dashboard() -> str:
    """Regenera o dashboard.html (painel visual) com os dados atuais do banco. Use ao final de qualquer sequência de alterações."""
    return json.dumps(f_dashboard(), ensure_ascii=False)

if __name__ == '__main__':
    mcp.run()
