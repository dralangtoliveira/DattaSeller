# REC-UI-001 — Comparação entre a linha V0, o dashboard/POC e a interface atual

Data: 2026-09-17. Referências registradas: `v0/dattaseller-visual@a82bad0` e
`codex/mvp-local-ready@d90844e`.

## Inventário medido

| Linha | Artefato | Stack | Conteúdo verificado | Estado |
| --- | --- | --- | --- | --- |
| V0 — `v0/dattaseller-visual@a82bad0` | 22 arquivos | Next.js + shadcn/ui (`components.json`, `lib/utils.ts`, `postcss.config.mjs`) | **um** componente (`components/ui/button.tsx`), tokens em `app/globals.css`, placeholders de imagem, `app/page.tsx` | starter de tema; 4 commits, o primeiro é "Initial commit from v0" |
| POC/CRM local — `poc/dattaseller-local/app/dashboard.html` | HTML+JS em linhagem única (83.454 bytes à época da medição) | HTML/CSS/JS puro, sem build | 12 views na navegação (geral, pipeline, clientes, intelligence, workspace, timeline, sites, comparador, followup, contratos, financeiro, config), 20 referências de e-mail | é a **fonte** do dashboard publicado |
| Interface atual — `public/dashboard.html` | artefato gerado por `scripts/sync-dashboard.mjs` + `scripts/production-dashboard-patch.mjs` | HTML/CSS/JS puro + patches de build | CRM autenticado, guarda de sessão, e-mail com envio real e follow-up, contratos com DOCX, sem reset DEMO | interface em uso na linha web |

## Comparação

- **V0 × atual:** não são a mesma aplicação. O V0 é um starter visual do v0
  (tema + um botão), enquanto a interface atual é um CRM funcional em HTML/JS
  servido com sessão autenticada. O V0 não contém nenhuma view, chamada de API
  ou regra comercial do DattaSeller.
- **POC × atual:** a POC é a origem direta da interface atual. O artefato
  publicado é o mesmo HTML com patches de produção (título, aviso, boot
  protegido, navegação restaurada, e-mail real, remoção do reset DEMO).
- O que o V0 tem de reaproveitável é limitado a **tokens de tema**
  (`app/globals.css`) e ao componente `Button`. Reaproveitar isso significa
  migrar a UI para React/Next — mudança grande, com risco de regressão em todas
  as views — e não é necessária para o MVP.

## Recomendação

1. **Não migrar** a interface atual para a base do V0 neste ciclo.
2. Se houver decisão explícita de reaproveitar, extrair apenas os tokens de
   tema e o `Button`, registrando a origem (`v0/dattaseller-visual@a82bad0`) e
   validando responsividade, compatibilidade com o CRM atual e ausência de
   regressão — nada é reaproveitado sem essa validação.
3. A validação visual (responsividade e comparação pixel a pixel) **não foi
   feita**: exige sessão autenticada no CRM de Production e/ou o servidor local
   da POC, e `python` não está instalado nesta máquina. Ela permanece dentro do
   Final Gate n. 4.

## Registro de origem

Nenhum componente foi copiado do V0 ou de `codex/mvp-local-ready@d90844e` nesta
reconciliação. Portanto não há, até aqui, reaproveitamento a rastrear.
