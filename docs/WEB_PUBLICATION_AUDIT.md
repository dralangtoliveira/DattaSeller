# DattaSeller — auditoria pré-publicação web

Data: 2026-09-13. Esta matriz preserva o MVP local e define somente a camada adicional web.

| Componente | Funcionamento local atual | Necessidade para web | Alteração planejada | Risco | Teste |
|---|---|---|---|---|---|
| Dashboard | `dashboard.html` servido por `http.server` em 127.0.0.1 | ativo estático protegido | hospedar como asset e adicionar guarda de sessão | rota exposta sem login | navegação anônima retorna login; autenticada retorna CRM |
| API | `dashboard-server.py` com rotas HTTP locais | função Node/Vercel autenticada | preservar contratos `/api/*`; delegar a repositório web | regressão de contrato | suíte de rotas e E2E web |
| Persistência | SQLite em `data/dattaseller-local.db` | PostgreSQL durável | migrations `supabase/`; SQLite continua em desenvolvimento/teste | mapeamento de tipos/semântica | migração vazia, CRUD e restart |
| Núcleo comercial | SQL direto em `dattaseller_local.py` | repository Supabase | adaptar por interface, sem remover provider/mock | acoplamento SQLite | regressão 11 testes + E2E |
| Arquivos temporários | DOCX gerado em `TemporaryDirectory` | filesystem efêmero Vercel | gerar e devolver no request; Storage se passar a persistir | timeout/tamanho | download de contrato |
| Caminhos Windows / `.bat` | `iniciar-dashboard.bat`, paths locais | nenhum em produção | manter somente como dev local; não referenciar no build | falha de build | `vercel build` |
| Estado em memória | não é fonte durável | sem estado de processo | Supabase é fonte de verdade | perda em cold start | logout/login |
| MCP/auxiliares | processo Python local | não expor publicamente | manter como ferramenta local; web só usa API segura | acesso externo indevido | endpoint inexistente em produção |
| Autenticação | inexistente | Supabase Auth admin privado | login, logout e guarda de sessão | exposição de CRM | testes anon/auth/admin |
| E-mail | `MockEmailProvider` e transições locais | Resend server-side | provider selecionável por ambiente, idempotência e webhook | envio duplicado/segredo | mock, Resend sandbox e falha |
| Formulário Datta360° | hoje abre WhatsApp; repo `datta360-8v` separado | fonte adicional de lead | POST assinado ao endpoint web, sem alterar CTA público além do submit | quebra do formulário/abuso | novo, duplicado, inválido, rate limit |
| Checkout/pagamento/handoff | mocks locais | continuar mock protegido | nenhum adapter real nesta fase | regressão | E2E multi-produto |

## Pré-requisitos externos ainda não configurados

1. **Supabase**: criar/indicar projeto e fornecer URL + publishable key para o cliente e secret key apenas como variável de servidor. O primeiro usuário deve receber uma linha `ds_users.role = 'admin'` após criar a conta Auth.
2. **Vercel**: autenticar a CLI ou conectar o repositório `dralangtoliveira/DattaSeller` a um projeto Vercel. Ainda não há `.vercel/`, token ou CLI autenticada neste workspace.
3. **DNS**: após existir o deployment, criar o registro indicado pelo painel Vercel para `crm.datta360.com.br` (normalmente CNAME para `cname.vercel-dns.com`; usar exatamente o alvo mostrado pelo painel, pois pode variar).
4. **Resend**: verificar domínio/remetente e cadastrar `RESEND_API_KEY` somente nas variáveis server-side da Vercel. Sem isso não há teste real de envio.
5. **Datta360°**: a cópia local está em outro Git (`dralangtoliveira/datta360-8v`), em `main`, e seu formulário ainda só abre WhatsApp. A integração deve ser commitada nesse repositório depois que a URL protegida e o segredo de ingestão existirem.
