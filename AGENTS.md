# DattaSeller — instruções para agentes e automações

## Identidade canônica

- **Projeto:** DattaSeller
- **Repositório:** `dralangtoliveira/DattaSeller`
- **Remote esperado:** `https://github.com/dralangtoliveira/DattaSeller`
- **Branch canônica operacional:** `hardening/phase-a-containment-clean`
- **Checkpoint da automação:** `docs/SUPERVISOR_DATTASELLER.md`

Antes de qualquer alteração, confirme `pwd`, `git remote -v`,
`git branch --show-current`, `git status --short` e `git rev-parse HEAD`. Se o
repositório, o remote ou a pasta não forem do DattaSeller, pare com
`SCOPE_MISMATCH` e não altere nada.

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

## Fontes de verdade (nesta ordem)

1. estado real do repositório DattaSeller;
2. branch canônica;
3. documentação versionada do DattaSeller;
4. Registro Canônico do DattaSeller (`docs/REC-CANON-001-*`);
5. PRs, commits, migrations e testes do DattaSeller;
6. CI e Preview reais;
7. histórico desta conversa apenas quando compatível com as fontes anteriores.

Divergência entre fontes não se resolve em silêncio: registre
`CONFLITO_DE_EVIDÊNCIA` e investigue.

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
PRÓXIMA ENTREGA. Não pare após concluir um card; se um item estiver bloqueado por
humano, registre o bloqueio, preserve a evidência e siga para o próximo item
executável.

Toda resposta do supervisor de DattaSeller começa com `DATTASELLER SUPERVISOR` e
termina com `NEXT_EXECUTABLE:` e `HUMAN_BLOCKERS:`. Não devolva contexto de outro
projeto.
