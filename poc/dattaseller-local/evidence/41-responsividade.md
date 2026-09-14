# DS-MVP-46 — auditoria responsiva local

Data: 2026-09-13. O dashboard foi aberto em Chrome local headless contra `http://127.0.0.1:8765/dashboard.html`; não há tráfego externo.

| Largura | Captura | Resultado |
|---:|---|---|
| 360 px | `responsive/dashboard-360-fixed.png` | métricas em uma coluna; navegação horizontal e funil preservados |
| 375 px | `responsive/dashboard-375.png` | layout móvel, busca ocupando a linha inteira |
| 768 px | `responsive/dashboard-768.png` | layout de tablet com duas métricas por linha |
| 1024 px | `responsive/dashboard-1024.png` | dashboard completo sem quebra de cards |
| 1280 px | `responsive/dashboard-1280.png` | desktop intermediário com navegação lateral |
| 1440 px | `responsive/dashboard-1440.png` | desktop largo com cartões, funil e navegação íntegros |

## Superfícies verificadas

- Dashboard, Kanban, tabelas de CRM/central comercial, financeiro e configurações usam contêineres `.twrap`/`.board` com rolagem horizontal explícita em vez de recorte de dados.
- Lead/modal usa largura máxima de viewport, altura máxima e uma coluna de campos até 520 px.
- Proposta, e-mail, contratos e configurações usam os mesmos painéis, tabelas e modal responsivos; comparador alterna a uma coluna abaixo de 900 px.

## Correção encontrada

A captura inicial de 360 px revelou que a grade de métricas podia manter duas colunas em viewport estreito. Foi corrigida com `@media(max-width:520px){ .stats{grid-template-columns:1fr} }`; a recaptura `dashboard-360-fixed.png` comprova cards não cortados.

Verificação sintática posterior: `dashboard JavaScript: OK`.
