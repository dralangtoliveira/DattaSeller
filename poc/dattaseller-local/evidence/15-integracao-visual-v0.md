# Integração visual v0

Fonte visual inspecionada: branch `v0/dattaseller-visual`, commit `a82bad033023ace1a92051447fa19164c6d44988`, correspondente ao deployment Vercel informado pelo usuário.

O branch contém uma demonstração Next.js estática. Foram transportadas somente decisões de apresentação para o dashboard Prospector operacional: fundo marfim, superfícies brancas, coral queimado, títulos serifados, interface sans-serif, bordas claras, sombras suaves, raios moderados, escala de 8 px, estados tonais e hierarquia de cards. Campos, SQLite, API, Kanban, comparador, contratos, financeiro e fluxo de follow-up permaneceram no aplicativo local.

O menu móvel passou a ser horizontal e rolável, preservando acesso às nove views. O verificador `verify-responsive.cjs` abriu todas as views e gerou capturas em `responsive/` para 360, 375, 768, 1024, 1280 e 1440 px. Todos os casos registraram HTTP 200, nove views, conteúdo visível, ausência de overflow no documento, nenhum campo de senha e nenhum texto HostGator/cPanel.

Os arquivos Next.js originais do mesmo commit também foram preservados na raiz do repositório como preview visual isolado para a Vercel. Esse preview não grava dados e não substitui o aplicativo operacional. A validação local executou `pnpm install --frozen-lockfile`, `pnpm exec tsc --noEmit` e `pnpm run build`; o build gerou a rota estática `/` com sucesso.
