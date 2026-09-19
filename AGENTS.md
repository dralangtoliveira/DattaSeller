# DattaSeller — instruções para agentes e automações

## Identidade canônica

- **Projeto:** DattaSeller
- **Repositório:** `dralangtoliveira/DattaSeller`
- **Remote esperado:** `https://github.com/dralangtoliveira/DattaSeller`
- **Branch canônica operacional:** `hardening/phase-a-containment-clean`
- **Checkpoint da automação:** `docs/SUPERVISOR_DATTASELLER.md`
- **Cérebro supervisor local:** `C:\Users\dr_al\OneDrive\Documentos\ChatGPT\DattaBrain\DattaSeller`
- **Grafo técnico do projeto:** `graphify-out\graph.json` + `graphify-out\GRAPH_REPORT.md`
- **Contrato funcional obrigatório:** `docs/CONTRATO-FUNCIONAL-CANONICO-DATTASELLER.md`
- **Instrução de sincronização do cérebro:** `docs/DATTABRAIN-SUPERVISOR-DATTASELLER.md`

Antes de qualquer alteração, confirme `pwd`, `git remote -v`,
`git branch --show-current`, `git status --short` e `git rev-parse HEAD`. Se o
repositório, o remote ou a pasta não forem do DattaSeller, pare com
`SCOPE_MISMATCH` e não altere nada.

## Preflight obrigatório do supervisor

Antes de planejar ou executar qualquer mudança relevante, leia e reconcilie:

1. `~/.codex/AGENTS.md`;
2. `C:\Users\dr_al\OneDrive\Documentos\ChatGPT\DattaBrain\00-GOVERNANCE`;
3. `C:\Users\dr_al\OneDrive\Documentos\ChatGPT\DattaBrain\DattaSeller`;
4. este `AGENTS.md`;
5. `docs/CONTRATO-FUNCIONAL-CANONICO-DATTASELLER.md`;
6. `product-contract/dattaseller-value-gates.json`;
7. `docs/DATTABRAIN-SUPERVISOR-DATTASELLER.md`;
8. `graphify-out/GRAPH_REPORT.md` e o grafo `graphify-out/graph.json`;
9. código, testes, migrations, CI, banco e evidências reais afetados pela mudança;
10. material original Prospector preservado quando o fluxo tocado deriva dele.

Se a pasta DattaBrain ou o Graphify esperado estiver ausente/desatualizado, registre
`BRAIN_SYNC_MISSING` ou `GRAPH_SYNC_MISSING`. Não use essa ausência para
rebaixar silenciosamente requisito antigo nem para declarar capacidade concluída.

O DattaBrain contém o estado operacional e os requisitos que não podem se perder
entre sessões. O Graphify contém relações técnicas do código. O Git comprova a
implementação. O Notion é espelho visual/operacional e não promove sozinho um gate
para pronto.

## Isolamento absoluto de escopo

É proibido tratar como trabalho do DattaSeller qualquer conteúdo pertencente a
outros projetos, inclusive: DattaX, cards `DXM-*`, cards `EV-*`, o projeto
Supabase `zbwspbzvndkdhjqranwz`, `investigator_notes`, migrations do DattaX,
DattaVPS/`DVPS-*`, DattaSeg, DattaLex, `tributario-rag`, Cubo e quaisquer outros
repositórios Datta.

Se o histórico da conversa mencionar esses projetos, ignore-os para execução e
registre `FOREIGN_CONTEXT_IGNORED`. Nunca execute comandos, migrations, Supabase,
GitHub, Vercel ou qualquer alteração baseada em contexto de outro projeto.

`datta360` só pode aparecer quando for integração diretamente necessária ao
DattaSeller (por exemplo `crm.datta360.com.br`), e isso não autoriza editar o
repositório Datta360. DattaVPS e DattaSeg podem aparecer apenas como produtos
vendidos ou integrados pelo DattaSeller, sem autorização para editá-los.

## Fontes de verdade e conflito

Para **estado funcional**, use:
1. contrato funcional + gates de valor;
2. evidência executável/reproduzível;
3. código/commit que produz a evidência;
4. DattaBrain reconciliado;
5. Registro Canônico;
6. Notion como espelho.

Para **topologia/impacto técnico**, use:
1. código atual da branch canônica;
2. Graphify atualizado;
3. testes/migrations/CI;
4. histórico Git.

Para **comportamento original migrado do Prospector**, consulte também as skills,
prompts e artefatos preservados. Eles são procedimentos de origem e não podem ser
reduzidos a mera referência documental.

Divergência entre fontes não se resolve em silêncio: registre
`CONFLITO_DE_EVIDÊNCIA` e investigue.

## Regra anti-regressão de valor

Nenhuma capacidade é considerada migrada ou pronta porque existe:
- rota/API;
- tabela/coluna;
- formulário;
- botão;
- mock/fixture;
- build;
- CI verde;
- Preview verde;
- documentação.

Uma capacidade só é considerada migrada quando a **mesma entrada de negócio**
produz uma saída equivalente ou melhor que a implementação anterior, com evidência.

Exemplos:
- `POST /api/prospects = 200` não prova descoberta de leads;
- persistir `creative_direction` não prova demonstração social;
- um template genérico não prova redesign real;
- Resend funcionando não prova o e-mail Prospector;
- rota admin-only não prova proposta pública para o cliente.

`PRODUCT_READY=true` somente quando todos os gates `DS-VALUE-01` a
`DS-VALUE-11` estiverem `PROVEN_REAL`.

## Limites sem autorização humana explícita

Não mergear em `main`; não promover Production; não executar `vercel --prod`; não
alterar domínio/alias de Production; não aplicar migration em Supabase de
Production; não enviar e-mail real fora de caixa controlada já autorizada; não
contatar leads; não alterar preços comerciais; não contratar serviço; não pagar
fornecedor; não apagar dados; não resetar banco; não remover branches com trabalho
não reconciliado.

Permitido sem nova autorização: corrigir código, criar testes, corrigir CI,
atualizar documentação, criar branches `codex/*`, commitar, fazer push, abrir ou
atualizar PR, usar Preview, rodar testes locais e investigar Git/GitHub.

## Ciclo e formato de retorno

Ciclo permanente: AUDITAR → PLANEJAR → EXECUTAR → REVISAR → TESTAR → REGISTRAR →
PRÓXIMA ENTREGA.

Antes de executar, declare:
- qual `DS-VALUE-*` está sendo trabalhado;
- qual entrada real recebe;
- qual saída utilizável entrega;
- qual componente histórico será reutilizado;
- qual prova encerra o gate.

Não crie trabalho periférico para simular progresso enquanto o gate de valor
correspondente permanecer ausente.

Toda resposta do supervisor de DattaSeller começa com `DATTASELLER SUPERVISOR` e
termina com `NEXT_EXECUTABLE:` e `HUMAN_BLOCKERS:`. Não devolva contexto de outro
projeto.
