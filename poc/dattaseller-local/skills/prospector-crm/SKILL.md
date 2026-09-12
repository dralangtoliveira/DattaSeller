---
name: prospector-crm
description: Cria e mantém o CRM local do prospector — dashboard com kanban, funil, clientes, sites, comparador antes/depois, follow-ups, contratos e financeiro, salvo em banco SQLite no computador do usuário. Use quando o usuário pedir "dashboard", "painel", "meus leads", "CRM", "controle de clientes", ou sempre que qualquer etapa da prospecção mudar o status de um lead (prospectou, redesenhou, publicou, enviou proposta, respondeu, fechou).
---

# CRM local (dashboard + SQLite)

Painel completo na pasta do projeto: `dashboard.html` + `prospector.db` + `dashboard-server.py` + `iniciar-dashboard.bat`. Sem servidor externo, sem mensalidade — tudo na máquina do usuário.

## Instalação (primeira vez)

1. Copie de `references/` para a pasta do projeto: `dashboard-template.html` (salve como base), `dashboard-server.py` e `iniciar-dashboard.bat`.
2. Gere o `dashboard.html`: substitua `__DADOS__` no template por `{"atualizado":"[data hora]","leads":[...]}` com os leads atuais.
3. O banco `prospector.db` se cria sozinho no primeiro uso (servidor Python com sqlite3 embutido). Requisito único: Python instalado (python.org/downloads, marcar "Add to PATH"; ou `winget install Python.Python.3.12`).
4. Oriente: duplo clique no `iniciar-dashboard.bat` → abre em http://localhost:8765 com selo "banco conectado" (edição/drag & drop salvam no banco). Abrir o dashboard.html direto = modo leitura.

## Vistas

Visão geral (números + funil) · Pipeline (kanban drag & drop; soltar em "Fechado" pede o valor e soma a receita) · Clientes (tabela com busca/edição/exclusão/paginação) · Sites (preview de cada página) · Comparador (antes/depois embutido) · Follow-ups (alerta laranja 3+ dias) · Contratos (ver folha, imprimir, baixar Word, marcar assinado) · Financeiro (recebido, a receber, MRR de manutenções, projeção 12 meses) · Configurações (dados do contratante para contratos).

## Regra de alimentação (OBRIGATÓRIA)

Toda etapa do fluxo ATUALIZA o CRM na hora, sem o usuário pedir: prospecção insere leads (`novo`); redesign → `redesenhado`; publicação → `publicado` + URL; proposta → `proposta` + data; resposta detectada → `respondeu` + resumo em obs (NUNCA marque `fechado` sozinho — preço é conversa do usuário); fechamento manual → valor/manutenção. Atualize via API local (http://localhost:8765/api/leads) se o servidor estiver rodando, senão direto no SQLite, e regenere o dashboard.html (snapshot). Termine cada etapa confirmando: "CRM atualizado: [N] leads".

## Leitura de respostas (automação)

Com o app de e-mail conectado, verifique diariamente (tarefa agendada do ChatGPT) as respostas às propostas: quem respondeu vira `respondeu` com resumo de 1 linha. Nunca responda e-mail sozinho — só leia e organize.


## Regra de execução (NÃO NEGOCIÁVEL)

Esta skill é um PROCEDIMENTO, não uma referência: siga TODOS os passos na ordem, sem improvisar nem pular etapas "para simplificar". É PROIBIDO encerrar a resposta com qualquer entrega listada acima pendente — se faltar, gere agora. Toda mudança de status de lead DEVE ser gravada no leads.md E no CRM local antes de encerrar, terminando com a confirmação "CRM atualizado: [N] leads".
