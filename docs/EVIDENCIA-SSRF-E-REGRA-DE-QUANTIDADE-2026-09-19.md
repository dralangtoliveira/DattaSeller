# Evidência — proteção SSRF e regra de quantidade/limite

**Data:** 2026-09-19
**Branch:** `codex/ds-value-01-discovery` (base `hardening/phase-a-containment-clean`)
**Escopo:** fechamento do PR #18 antes de DS-VALUE-04

## 1. Auditoria dos fetches server-side

| Ponto | Antes | Risco | Agora |
| --- | --- | --- | --- |
| `lib/enrichment/provider.js` (`fetchText`) | `fetchImpl(url, { redirect: "follow" })` com URL do lead | SSRF: URL do lead podia apontar para localhost, rede privada, link-local/metadata ou redirecionar de público para privado | `guardedFetch` valida esquema, host, **todos** os endereços resolvidos e **cada salto** de redirect antes de requisitar |
| `lib/diagnosis/site.js` (`diagnoseSite`) | idem, `redirect: "follow"` | idem | idem, com os saltos registrados no diagnóstico |
| `lib/discovery/provider.js` (`callProvider`) | provedor por env, `redirect` padrão (follow) | redirect de provedor público para destino privado | mesmo guard (host + DNS + redirect) |
| Endpoint de provedor no enriquecimento (Nominatim) | idem | idem | mesmo guard |

Checklist exigida, toda coberta por teste automatizado (`test/ssrf-guard.test.js`):

- `localhost`, `*.localhost`, `*.internal`, `*.local`, `home.arpa` e host de rótulo único → bloqueados por nome;
- `127.0.0.0/8` (inclusive `127.1.2.3`, IPv4 decimal `2130706433`, hexadecimal `0x7f000001` e octal `0177.0.0.1`, que o parser normaliza para `127.0.0.1`) → bloqueado;
- `::1` e `::` → bloqueados;
- RFC1918 (`10/8`, `172.16/12`, `192.168/16`) → bloqueados;
- link-local `169.254/16` (inclui metadata cloud `169.254.169.254`) e IPv6 `fe80::/10` → bloqueados;
- metadata cloud por nome (`metadata.google.internal`, `instance-data`) → bloqueados;
- host público que **resolve** para IP privado (A/AAAA) → bloqueado; um único registro privado invalida o destino; falha de resolução ou resposta vazia também bloqueia (fail-closed);
- redirect de URL pública para destino privado → bloqueado **antes** da segunda requisição (o teste prova que nenhuma requisição adicional sai);
- faixas extras: CGNAT `100.64/10`, `192.0.0/24`, `198.18/15`, multicast/reservado (`224/4`, `240/4`, broadcast), ULA `fc00::/7`, multicast IPv6 `ff00::/8`, IPv4 mapeado/compatível em IPv6, 6to4 `2002::/16`, Teredo `2001:0000::/32` e NAT64 `64:ff9b::/96`;
- esquemas não HTTP(S) (`file:`, `ftp:`, `gopher:`, `javascript:`, `data:`) → bloqueados.

Comportamento na API: destino bloqueado responde **400** com o código `ssrf_*` e `lead_preservado: true`; indisponibilidade real de fonte continua **503**. Nada é persistido e nada é aberto.

Limite aceito explicitamente: os endereços dos provedores (Nominatim/Overpass) são configuração do operador via variável de ambiente; mesmo assim passam pelo mesmo guard.

## 2. Semântica de QUANTIDADE ALVO × LIMITE DE CANDIDATOS

Regra vigente, agora explícita na UI, na API, no contrato e nos testes:

- **limite de candidatos** é o teto do retorno (padrão 25, máximo 50);
- **quantidade alvo** é a referência de trabalho do operador (padrão 10) e dimensiona a amostra consultada, **não** o teto;
- portanto `quantidade alvo 5` + `limite 25` pode devolver **até 25** empresas — a resposta traz `query.quantidade_alvo`, `query.limite_candidatos` e `regra` com esse texto.

Provas em `test/discovery.test.js`: 30 elementos na fonte com alvo 5 e limite 25 devolvem 25; alvo 30 com limite 4 devolve 4.

## 3. Verificação executada

```text
node --experimental-strip-types --test     # 183 testes, 0 falhas
node node_modules/typescript/bin/tsc --noEmit   # exit 0
node node_modules/next/dist/bin/next build      # exit 0
node scripts/secret-scan.mjs               # 0 credenciais
node scripts/discovery-smoke.mjs "restaurante" "Orlando, FL" 5
node scripts/enrichment-smoke.mjs "Empire Szechuan" "Orlando, FL" "https://empireszechuanfltogo.com/"
node scripts/diagnosis-smoke.mjs "https://empireszechuanfltogo.com/"
node scripts/discovery-e2e-local.mjs
```
