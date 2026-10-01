# DattaSeller Agent Bridge (Hermes compartilhado)

Ponte server-side entre o DattaSeller HML e o executor agêntico compartilhado
(Hermes da DattaVPS). O navegador nunca recebe credencial do Hermes.

## Fronteira

```
DattaSeller HML
  -> lib/agent/job-interface.js (adapter server-side)
  -> HTTPS  POST /v1/dattaseller/jobs   (bearer próprio do DattaSeller)
  -> esta ponte
  -> Hermes /v1/chat/completions        (API_SERVER_KEY, só no servidor)
  -> skill DattaSeller carregada no Hermes
  -> AgentResult estruturado
```

Isolamento: a ponte aceita somente `tenant_id` da allowlist, exige `job_id`,
`job_type` conhecido, `input`/`context` estruturados, aplica idempotência por
`(tenant_id, job_id)`, impõe timeout e devolve erro estruturado. Dados
comerciais (leads, pipeline, propostas, timeline, contratos, financeiro,
auditoria) permanecem exclusivamente no Supabase do DattaSeller — nunca passam
pela ponte nem pelo Hermes.

## Contrato

`POST /v1/dattaseller/jobs`

- 401 sem bearer válido;
- 400 em `job_id`/`tenant_id`/`job_type`/`input`/`context` inválidos;
- 200 com `AgentResult` (`job_id`, `status`, `structured_output`, `evidence`,
  `artifacts`, `errors`, `timestamps`);
- replay do mesmo `(tenant_id, job_id)` devolve byte a byte o resultado
  persistido, sem segunda execução no executor.

`GET /health` e `GET /v1/dattaseller/health` devolvem apenas estado e presença de
configuração — nenhum valor de segredo.

## Configuração (somente no host)

| Variável | Papel |
| --- | --- |
| `DS_BIND_IP` / `DS_BIND_PORT` | interface/porta de escuta (host network) |
| `DS_AGENT_BEARER` | credencial **própria do DattaSeller** (não reutiliza segredo da DattaVPS) |
| `HERMES_URL` | `http://127.0.0.1:8642` |
| `HERMES_API_SERVER_KEY` | bearer do Hermes, somente server-side |
| `HERMES_MODEL` | `hermes-agent` |
| `DS_ALLOWED_TENANTS` | allowlist de tenant |
| `DS_JOB_TIMEOUT_MS` | timeout do job |
| `DS_DATA_DIR` | diretório do volume próprio da ponte |

O arquivo `.env` do host é `chmod 600` e não é versionado.

## Operação

```bash
cd /opt/dattaseller-agent-bridge
docker compose up -d --build
docker logs --tail 20 dattaseller-agent-bridge
```

Rota HTTPS dedicada no Traefik: `/data/coolify/proxy/dynamic/dattaseller-agent.yml`
(remover o arquivo desfaz a rota).

## Limites registrados

- O Hermes é compartilhado; a separação é lógica (allowlist de tenant + skill
  dedicada), não isolamento físico de máquina.
- A execução agêntica é escopada ao `context` fornecido pelo CRM; a ponte não
  autoriza navegação autônoma nem acesso a Production.
