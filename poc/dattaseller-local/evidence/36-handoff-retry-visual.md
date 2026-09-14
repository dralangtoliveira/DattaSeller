# Verificação visual local — retry de handoff

Data: 2026-09-13. Ambiente: dashboard local e pedido DEMO
`ord_f2506b6131f3`.

Após pagamento aprovado, o dashboard mostrou o handoff com estado `delivered`
e contador `tentativas: 0`. A ação **falhar** alterou o estado para `failed` e
substituiu a ação por **retry**. Ao executar **retry**, o estado passou para
`sent` e o contador exibido passou para `tentativas: 1`.

O núcleo registra `handoff.retry`, limpa o erro local e preserva o contador em
SQLite. O teste unitário cobre falha, retry e entrega; a suíte Python passou
com 10 testes.
