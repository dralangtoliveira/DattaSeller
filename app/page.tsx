const navigation = [
  ['Visão geral', '6'],
  ['Pipeline', '2'],
  ['Clientes', '2'],
  ['Sites', '1'],
  ['Comparador', '1'],
  ['Follow-ups', '1'],
  ['Contratos', '0'],
  ['Financeiro', ''],
  ['Configurações', ''],
]

const stages = [
  { name: 'Novo', count: 1, tone: 'blue' },
  { name: 'Redesenhado', count: 0, tone: 'lilac' },
  { name: 'Publicado', count: 0, tone: 'teal' },
  { name: 'Proposta enviada', count: 1, tone: 'amber' },
  { name: 'Respondeu', count: 0, tone: 'green' },
  { name: 'Fechado', count: 0, tone: 'green' },
]

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">✳</div>
        <div><strong>DattaSeller</strong><span>operação comercial local</span></div>
      </div>
      <nav aria-label="Navegação principal">
        {navigation.map(([label, count], index) => (
          <a className={`nav-item ${index === 0 ? 'active' : ''}`} href="#" key={label}>
            <span>{label}</span>{count && <b>{count}</b>}
          </a>
        ))}
      </nav>
      <p className="sidebar-note">Baseado no Prospector. Contatos, envio de propostas, publicação e checkout exigem confirmação humana.</p>
    </aside>
  )
}

function Header({ title }: { title: string }) {
  return (
    <header className="page-header">
      <div className="heading-group"><h1>{title}</h1><span>atualizado em —</span><em className="status-badge connected">banco conectado</em></div>
      <label className="search"><span className="search-icon" aria-hidden="true" /> <input aria-label="Buscar" placeholder="Buscar cliente, nicho, cidade..." /></label>
    </header>
  )
}

function Overview() {
  const metrics = [
    ['2', 'Leads ativos', 'neutral'], ['1', 'Propostas na rua', 'neutral'], ['1', 'Follow-ups pendentes', 'amber'],
    ['0', 'Fechados', 'green'], ['R$ 0', 'Receita fechada', 'green'], ['R$ 1.400', 'Potencial (R$700/página)', 'coral'],
  ]
  return <>
    <div className="metric-grid">{metrics.map(([value, label, tone]) => <article className={`metric-card ${tone}`} key={label}><strong>{value}</strong><span>{label}</span></article>)}</div>
    <section className="surface funnel"><h2>Funil do pipeline</h2><div className="funnel-list">{stages.map(stage => <div className="funnel-row" key={stage.name}><span>{stage.name}</span><div className="funnel-track"><div className={`funnel-fill ${stage.tone}`} style={{ width: `${stage.count ? 100 : 0}%` }} /></div><b>{stage.count}</b></div>)}</div></section>
    <section className="surface followup"><h2>Follow-ups pendentes <small>(4+ dias sem resposta)</small></h2><div className="followup-line"><strong>Amostra local 2</strong><span className="status-badge warning">11 dias</span><span>proposta em 2026-09-01</span></div></section>
  </>
}

function LeadCard({ proposal = false }: { proposal?: boolean }) {
  return <article className={`lead-card ${proposal ? 'proposal' : 'new'}`}><div className="lead-title"><strong>{proposal ? 'Amostra local 2' : 'Amostra local 1'}</strong>{proposal && <span className="status-badge warning">follow-up 11d</span>}</div><span className="lead-city">· Cidade de teste</span><div className="card-actions">{proposal && <button>página</button>}{proposal && <button>editar site</button>}<button>⌕ dados</button><button className="danger">× excluir</button></div></article>
}

function Pipeline() {
  const columns = [['NOVO', 1, <LeadCard key="one" />], ['REDESENHADO', 0, null], ['PUBLICADO', 0, null], ['PROPOSTA ENVIADA', 1, <LeadCard proposal key="two" />]]
  return <><div className="pipeline-tip">Arraste um card para mudar o status — os automáticos (redesenhado, publicado, proposta) o plugin move sozinho; use o arrasto principalmente para <strong>Respondeu</strong> e <strong>Fechado</strong>.</div><div className="kanban">{columns.map(([name, count, card]) => <section className="kanban-column" key={name as string}><div className="column-heading"><span>{name}</span><b>{count as number}</b></div>{card || <div className="drop-zone">solte aqui</div>}</section>)}</div></>
}

export default function Page() {
  return <div className="app-shell"><Sidebar /><main className="content"><Header title="Visão geral" /><Overview /><div className="section-heading"><h2>Pipeline comercial</h2><span>2 leads em acompanhamento</span></div><Pipeline /></main></div>
}
