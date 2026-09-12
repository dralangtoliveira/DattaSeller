# MVP local DattaSeller usando o Prospector — plano fechado de 24 horas

**Status:** plano canônico de execução  
**Data-base:** 12/09/2026  
**Prazo:** 24 horas efetivas de trabalho  
**Objetivo:** colocar em funcionamento local um fluxo comercial completo que encontre leads públicos na internet, qualifique oportunidades, produza demonstração de site e Instagram, gere proposta Datta360° e ofereça DattaVPS com checkout no site oficial do VPS.

## 1. Decisão executiva

O material do Prospector existente no Google Drive **é código e processo de partida do MVP**. Ele deve ser copiado, instalado, executado e adaptado. Não é material de inspiração e não deve ser reescrito do zero.

Regra principal para o Codex:

> Antes de criar qualquer dashboard, Kanban, servidor local, banco SQLite, ferramenta MCP, comparador, proposta, contrato, follow-up ou rotina de publicação, procure o componente equivalente no pacote Prospector. Se existir, use o arquivo pronto e aplique somente a menor alteração necessária para o MVP DattaSeller.

O produto superior e definitivo do DattaSeller continua como destino arquitetural. Entretanto, PostgreSQL/Supabase, autenticação multiusuário, RBAC, orquestração distribuída, automação completa de pagamento/provisionamento, DeskcommCRM e demais componentes robustos entram após a validação comercial. Eles não justificam atrasar o MVP local.

## 2. Resultado esperado ao final das 24 horas

O MVP é considerado pronto somente quando for possível demonstrar, na mesma máquina, estes dois caminhos:

### Caminho A — Datta360°

1. Informar nicho e cidade/região.
2. Encontrar pelo menos 10 empresas usando fontes públicas na internet.
3. Registrar cada lead no CRM local com fonte e data de verificação.
4. Qualificar o lead com evidências, sem inventar dados.
5. Selecionar pelo menos 3 leads para diagnóstico de site e Instagram.
6. Para pelo menos 1 lead, produzir:
   - redesign de site profissional;
   - comparador antes/depois;
   - diagnóstico do Instagram;
   - pacote visual de 3 publicações para proposta;
   - proposta comercial Datta360° pronta para apresentação.
7. Atualizar o lead no Kanban e registrar a próxima ação.

### Caminho B — DattaVPS

1. Identificar um lead com aderência à oferta de VPS.
2. Registrar a justificativa da recomendação.
3. Apresentar a oferta dentro do fluxo do DattaSeller.
4. Direcionar o botão de contratação para a URL oficial de checkout do site DattaVPS.
5. Registrar que o checkout foi apresentado e, quando possível, clicado.
6. Confirmar pagamento e entrega manualmente no MVP, mantendo evidência no CRM.

O DattaSeller **não deve recriar checkout**, capturar cartão ou simular pagamento. O sistema vende e acompanha; o site DattaVPS cobra.

## 3. Fontes obrigatórias do Google Drive

Pasta raiz: `1pJYT5yVgU1fi-xAhVHeSYaRxFId6TQJa`

| Arquivo | ID no Drive | Uso obrigatório no MVP |
|---|---|---|
| `prospector-crm.zip` | `1htD0LuO77K7awWH5ki1lHwknQWWkVwyA` | Usar o dashboard, Kanban, servidor local, persistência SQLite e inicializador existentes. |
| `prospector-mcp.py` | `1WaXQHQbhlNic-NzK749ktrUsnsyaL9f5` | Usar como camada operacional do banco e das ações de leads. Estender sem reescrever. |
| `instalar-mcp.bat` | `1x2cM_7BJ1_-6DDcMRsoAVc-rGpnVoCu3` | Usar como base da instalação em Windows. |
| `instalar-mcp.command` | `1jvVOuB9paYgRQfBiAxDIiHbSCSxJVu2m` | Usar como base da instalação em macOS. |
| `LEIA-ME-MCP.md` | `1dq8_dHszUSza1uX3UASMwif5cgh16Pov` | Incorporar instruções válidas ao README do MVP. Corrigir conflitos encontrados. |
| `prospector-prospeccao.zip` | `1AsOitE5LUI99Ykh2vigR86OSf4_P4Yu-` | Usar o processo existente de pesquisa e qualificação, adaptando os critérios. |
| `prospector-redesign.zip` | `1FyRwCN6k9mo3Y2yLZzA9ejOHobqjf_lp` | Usar fluxo de redesign, comparador e editor visual. |
| `prospector-publicacao.zip` | `1koptDtYvWnN3s76xj4FGuXk0GGziZY3N` | Usar o processo pronto de publicação/preview. |
| `prospector-proposta.zip` | `1Xj1y_PhelkDWJMXoPC2cgiVXBxmcjjKH` | Usar o fluxo de proposta e a capa HTML existentes. |
| `prospector-contrato.zip` | `1LjbTant37dABOCti3Jpte4wW8L_NlTNy` | Usar o contrato HTML e o gerador DOCX no fechamento assistido. |
| `LEIA-ME.md` | `1yKnmsGVf_-PJsNOmfYUHIQZrQFg7l9hn` | Usar como inventário funcional do pacote. |
| `PROMPTS-PRONTOS.md.pdf` | `1-zqjMavfK22oFAcTygxA0cZlb_X8b107` | Reaproveitar prompts operacionais compatíveis. |
| `Os-5-Prompts-Servicos-com-IA.pdf` | pasta `1XCryM_mboz7ACojfRUY6pnFfOaB2sIRE` | Usar o prompt de conteúdo mensal como base do pacote Instagram. |

## 4. Política de importação: preservar original e adaptar uma cópia

Para não perder o material pronto nem misturar customização com fonte, usar esta estrutura:

```text
poc/dattaseller-local/
├── vendor/prospector-original/       # cópia integral, sem alterações
├── app/
│   ├── dashboard.html
│   ├── dashboard-template.html
│   ├── dashboard-server.py
│   ├── iniciar-dashboard.bat
│   ├── prospector-mcp.py
│   └── prospector-config.example.json
├── skills/
│   ├── prospector-prospeccao/
│   ├── prospector-redesign/
│   ├── prospector-publicacao/
│   ├── prospector-proposta/
│   ├── prospector-crm/
│   ├── prospector-contrato/
│   ├── dattaseller-instagram/
│   └── dattaseller-vps/
├── data/                             # banco e artefatos locais; não versionar
├── evidence/                         # evidências sem dados sensíveis
├── .env.example
└── README.md
```

Regras:

- A pasta `vendor/prospector-original` é somente leitura durante a adaptação.
- O código executável vem de uma cópia dos arquivos originais para `app` e `skills`.
- Cada alteração deve ser pequena, rastreável e associada a um critério de aceite.
- `data/`, banco SQLite, credenciais, dados pessoais, propostas reais e contratos assinados entram no `.gitignore`.
- Nunca colocar senha do cPanel, token, chave de API, cookie ou segredo em HTML, JSON versionado, evidência ou commit.
- Se houver dúvida sobre como um recurso deve funcionar, executar primeiro o original e observar o comportamento existente.

## 5. O que usar sem reconstruir

| Capacidade | Componente pronto | Ação permitida nas 24h |
|---|---|---|
| Dashboard local | `dashboard-server.py` e `dashboard-template.html` | Copiar, renomear a marca e acrescentar campos mínimos. |
| Pipeline Kanban | View Pipeline do CRM | Manter colunas e movimentação existentes. Não criar outro Kanban. |
| SQLite | Migração e acesso presentes no MCP/servidor | Estender de forma idempotente com `ALTER TABLE`; não trocar o banco. |
| Operações de lead | `prospector-mcp.py` | Acrescentar parâmetros e validações; preservar as ferramentas atuais. |
| Prospecção | `prospector-prospeccao/SKILL.md` | Adaptar critérios de contato e produto. |
| Redesign | `prospector-redesign/SKILL.md` | Executar com logo, fotos e informações reais do lead. |
| Comparador | `comparador-template.html` | Reusar e trocar somente marca/textos necessários. |
| Editor visual | `editor-visual.md` | Usar no fluxo de ajustes; não criar editor novo. |
| Publicação/preview | `prospector-publicacao/SKILL.md` | Manter o fluxo pronto e gerar URL acessível para proposta. |
| Proposta | `prospector-proposta/SKILL.md` e `capa-proposta-template.html` | Reusar estrutura, política anti-spam e follow-up. |
| Contrato | `contrato-template.html` e `gerar-docx.py` | Reusar no fechamento assistido; revisão jurídica fica fora do MVP. |
| Indicadores | Overview e Financeiro do dashboard | Manter cálculos existentes e acrescentar somente o necessário. |

## 6. Mudanças mínimas obrigatórias

### 6.1 Marca e linguagem

- Trocar referências operacionais de “Prospector” por “DattaSeller — POC local” na cópia executável.
- Trocar instruções específicas de Claude por GPT/Codex quando isso for necessário para execução.
- Preservar nomes internos quando renomeá-los causar risco ou retrabalho sem valor comercial.
- Remover do dashboard qualquer campo que peça ou exponha senha de hospedagem.

### 6.2 Banco de dados

Manter a tabela e os campos existentes. Adicionar apenas estas colunas, com migração idempotente tanto no MCP quanto no servidor:

| Campo | Tipo sugerido | Finalidade |
|---|---|---|
| `instagram_url` | TEXT | Perfil público analisado. |
| `source_url` | TEXT | Página pública que originou o lead. |
| `source_checked_at` | TEXT | Data/hora ISO da última verificação. |
| `public_contact_type` | TEXT | `email`, `telefone`, `whatsapp`, `instagram`, `formulario` ou combinação. |
| `product_suggested` | TEXT | `datta360`, `dattavps` ou `ambos`. |
| `product_reason` | TEXT | Justificativa objetiva da recomendação. |
| `next_action` | TEXT | Próxima ação comercial. |
| `delivery_status` | TEXT | Estado mínimo de checkout/entrega. |
| `checkout_url` | TEXT | URL oficial apresentada ao lead. |
| `checkout_presented_at` | TEXT | Data/hora da apresentação. |
| `checkout_clicked_at` | TEXT | Data/hora do clique, se mensurável. |
| `qualification_json` | TEXT | Evidências estruturadas da qualificação. |
| `site_audit_json` | TEXT | Diagnóstico do site. |
| `instagram_audit_json` | TEXT | Diagnóstico do Instagram. |

Não normalizar empresa, oportunidade, pedido e entrega em tabelas completas agora. A modelagem definitiva entra depois da validação.

### 6.3 Pipeline

Preservar os estados existentes para não reescrever dashboard e automações:

`novo → redesenhado → publicado → proposta → respondeu → fechado`

`descartado` continua como saída lateral.

Usar `next_action`, observações e `delivery_status` para os detalhes que ainda não merecem uma nova coluna. Valores aceitos para `delivery_status`:

- `nao_iniciado`
- `checkout_apresentado`
- `checkout_acessado`
- `pagamento_confirmado_manual`
- `handoff_manual`
- `entregue`
- `falha`

Correção obrigatória: um lead não pode mudar para `fechado` sem `valor_fechado > 0` e confirmação explícita. Essa validação deve existir na interface e no backend/MCP.

## 7. Prospecção de leads na internet

### 7.1 Entrada

- nicho;
- cidade, região ou raio;
- produto preferencial opcional (`datta360`, `dattavps`, `ambos`);
- quantidade-alvo;
- limite de páginas/resultados para evitar pesquisa infinita.

### 7.2 Fontes públicas aceitáveis

- Google Maps e perfil público da empresa;
- site oficial;
- Instagram público;
- diretórios empresariais públicos;
- página pública de contato.

Toda informação deve guardar `source_url` e `source_checked_at`. Não usar área autenticada, burlar bloqueio, comprar base obscura nem coletar dado privado.

### 7.3 Critério Datta360°

O filtro original do Prospector — nota mínima 4,7, pelo menos 40 avaliações, site fraco e e-mail público — vira uma preferência de qualidade, não uma barreira rígida.

Lead elegível quando:

- tem sinais reais de atividade e reputação;
- possui site ausente, antigo, lento, pouco claro ou com conversão fraca, **ou** Instagram que possa sustentar a proposta;
- possui pelo menos um canal público de contato: e-mail, telefone, WhatsApp, Instagram, formulário ou página de contato;
- há evidência suficiente para explicar por que Datta360° ajudaria.

Não exigir e-mail se houver outro canal público e adequado. Não afirmar que um site é lento, inseguro ou mal ranqueado sem teste/evidência.

### 7.4 Critério DattaVPS

O lead pode ter site bom. Aderência é determinada por sinais como:

- agência, software house, desenvolvedor ou revenda;
- negócio com múltiplos sites ou aplicações;
- necessidade pública de hospedagem, desempenho, isolamento, controle ou crescimento;
- infraestrutura compatível com a oferta aprovada.

Não inferir consumo, custo, vulnerabilidade ou problema técnico sem fonte. A recomendação deve registrar fato observado, hipótese comercial e pergunta de validação separadamente.

### 7.5 Deduplicação e descarte

Antes de inserir, comparar nome normalizado, domínio, telefone normalizado e URL do perfil. Se houver duplicidade, atualizar evidências no registro existente. Leads sem contato público, sem aderência ou sem fonte verificável devem ser registrados como descartados com motivo, evitando pesquisar a mesma empresa de novo.

## 8. Diagnóstico Datta360°: site + Instagram

### 8.1 Auditoria de site

Registrar, quando observável:

- presença e clareza da proposta de valor;
- chamada para ação e contato;
- funcionamento em celular;
- hierarquia, legibilidade e confiança visual;
- serviços, localização e prova social;
- links quebrados e problemas visíveis;
- oportunidade de melhoria e evidência correspondente.

O redesign deve usar nome, logotipo, fotos, endereço, telefone, serviços e avaliações reais do lead. Se um dado não existir, usar placeholder claramente marcado no ambiente privado; nunca publicar uma afirmação inventada.

### 8.2 Auditoria de Instagram

Registrar:

- URL e @ do perfil;
- bio: clareza, localização, oferta e CTA;
- link da bio e destino;
- consistência visual recente;
- frequência aparente das publicações;
- presença de serviços/produtos, prova social e contato;
- destaques e categorias visíveis;
- três oportunidades priorizadas;
- evidências e data da captura.

Não automatizar login, mensagem direta ou publicação no Instagram no MVP.

### 8.3 Pacote Instagram para a proposta

Para o lead selecionado, produzir uma demonstração com:

- mini-direção visual: cores, tipografia, tom e uso do logo;
- calendário inicial de 7 dias;
- 3 peças estáticas demonstrativas (feed), com legenda e CTA;
- 3 sugestões de stories;
- observação explícita de que são peças de demonstração sujeitas à aprovação.

O prompt de serviço mensal existente no PDF deve ser usado como ponto de partida e adaptado aos dados reais da empresa. O MVP entrega a proposta criativa; não publica na conta do cliente.

## 9. Proposta comercial

Usar o componente pronto do `prospector-proposta.zip`. A proposta deve conter:

1. identificação correta da empresa;
2. diagnóstico curto e fundamentado;
3. visual do site atual, quando existir;
4. preview do novo site;
5. comparador antes/depois;
6. diagnóstico e preview do Instagram;
7. escopo Datta360° claramente separado entre site e Instagram;
8. preço, prazo e condições aprovados;
9. CTA para conversar/aprovar;
10. se houver aderência a VPS, bloco opcional com benefício e link oficial de checkout.

Manter a política anti-spam do Prospector: revisão humana antes de enviar, personalização, um único follow-up depois de três dias e registro da tentativa. Nenhuma mensagem externa é enviada automaticamente sem autorização do usuário.

## 10. DattaVPS: venda com checkout externo

Configuração mínima:

```text
DATTA_VPS_CHECKOUT_URL=https://URL-OFICIAL-DO-SITE-DATTAVPS
DATTA_VPS_OFFER_NAME=Nome aprovado do plano
DATTA_VPS_OFFER_PRICE=Preço aprovado
```

Regras:

- A URL fica em variável de ambiente/configuração local, nunca espalhada em templates.
- Se a URL não estiver configurada, mostrar “Oferta aguardando configuração” e desabilitar o CTA.
- O botão deve abrir o site oficial em nova aba com `noopener,noreferrer`.
- Se parâmetros UTM forem aceitos pelo checkout, usar `utm_source=dattaseller`, `utm_medium=proposal` e identificador não sensível da campanha.
- O MVP pode registrar o clique localmente; não pode declarar pagamento somente por clique.
- Confirmação de pagamento, provisionamento e entrega são manuais até existir integração oficial.

## 11. Execução por cards do Notion

Ordem obrigatória: **CCD-48 → CCD-49 → CCD-26 → CCD-27 + CCD-50 → CCD-28 → CCD-41 → CCD-18 → CCD-45**.

### CCD-48 — Adaptar CRM local do Prospector para a POC DattaSeller (3h)

Usar diretamente `prospector-crm.zip` e `prospector-mcp.py`.

Entregas:

- material original preservado;
- dashboard e MCP executando a partir da cópia;
- marca mínima ajustada;
- novos campos migrados sem apagar base existente;
- remoção de senha de hospedagem da UI;
- validação de fechamento com valor;
- Kanban original funcionando.

Aceite: servidor inicia, dashboard abre, lead é criado/editado/movido e persiste após reinício.

### CCD-49 — Encontrar e qualificar leads na internet na POC local (3h)

Usar diretamente `prospector-prospeccao.zip` e as operações do MCP.

Entregas:

- comando guiado por nicho/cidade;
- critérios Datta360° e DattaVPS implementados no procedimento;
- 10 leads reais com fonte, contato público e data;
- deduplicação;
- descartes com motivo.

Aceite: amostra manual confirma que nenhum dado crítico foi inventado e que cada recomendação possui evidência.

### CCD-26 — ProspectOS no MVP-1 (2h)

Neste ciclo, ProspectOS significa a experiência local montada sobre o Prospector pronto. Não criar um novo produto web.

Entregas:

- fluxo único de operar a fila;
- busca, qualificação, seleção de produto e próxima ação conectadas ao CRM;
- README operacional curto.

Aceite: outro operador consegue seguir o README sem precisar conhecer a estrutura interna dos ZIPs.

### CCD-27 — Usar JCodesMore no primeiro cenário comercial (4h)

Usar diretamente `prospector-redesign.zip`, seus templates e o fluxo de publicação pronto.

Entregas:

- 3 auditorias de site;
- 1 redesign completo;
- 1 comparador antes/depois;
- 1 preview publicado ou acessível localmente por URL estável durante a demonstração.

Aceite: conteúdo real, responsivo e sem links quebrados nas larguras definidas nos testes.

### CCD-50 — Gerar diagnóstico e preview de Instagram para proposta Datta360° (4h, paralela conceitualmente à CCD-27)

Usar o prompt pronto do material de IA e os dados públicos do lead.

Entregas:

- auditoria estruturada;
- direção visual;
- calendário de 7 dias;
- 3 posts com legendas;
- 3 stories;
- bloco pronto para incorporar à proposta.

Aceite: material coerente com a marca real, sem prometer publicação automática ou resultados garantidos.

### CCD-28 — Gerar proposta Datta360° com site e Instagram (3h)

Usar diretamente `prospector-proposta.zip` e `capa-proposta-template.html`.

Entregas:

- proposta única com site + Instagram;
- diagnóstico, previews, escopo, preço, prazo e CTA;
- follow-up programado no CRM, não enviado automaticamente.

Aceite: proposta abre sem autenticação para apresentação, não expõe segredo e contém somente informação aprovada.

### CCD-41 — Cadastrar e aprovar a oferta DattaVPS (1h)

Entregas:

- nome, descrição curta, preço, disponibilidade e URL oficial de checkout configuráveis;
- estado “aguardando configuração” quando faltar informação;
- regra de aderência registrada.

Aceite: nenhuma URL, preço ou disponibilidade fictícia aparece ao lead.

### CCD-18 — Checkout externo DattaVPS (1h)

Entregas:

- CTA para o checkout oficial;
- parâmetros de campanha quando suportados;
- registro de apresentação/clique;
- aviso de confirmação manual.

Aceite: o botão leva exatamente ao domínio oficial configurado e nenhum dado de pagamento passa pelo MVP.

### CCD-45 — Validar E2E DattaVPS e Datta360° (3h)

Entregas:

- execução integral dos dois caminhos;
- evidências dos testes;
- lista de defeitos separada entre bloqueador e pós-MVP;
- decisão objetiva de “vendável assistido” ou “não vendável”.

Aceite: todos os critérios da seção de definição de pronto estão comprovados.

## 12. Cronograma fechado de 24 horas

| Janela | Trabalho | Saída obrigatória |
|---|---|---|
| H0–H2 | Importar os pacotes, preservar originais, gerar manifesto e executar testes atuais | Baseline executável e inventário de arquivos. |
| H2–H5 | CCD-48: CRM/MCP, marca, migração mínima e segurança | Dashboard local adaptado e persistente. |
| H5–H8 | CCD-49: prospecção e critérios | 10 leads qualificados/descartados com evidência. |
| H8–H10 | CCD-26: integrar operação local | Fluxo operacional e README. |
| H10–H14 | CCD-27 e início da CCD-50 | Auditorias, redesign, comparador e Instagram. |
| H14–H17 | Concluir CCD-50 e CCD-28 | Pacote Instagram e proposta Datta360°. |
| H17–H19 | CCD-41 e CCD-18 | Oferta VPS configurável e clickout. |
| H19–H22 | CCD-45: E2E dos dois caminhos | Evidências e correções bloqueadoras. |
| H22–H24 | Regressão, documentação e empacotamento | MVP demonstrável e lista pós-MVP. |

Regra de tempo: ao atingir o fim de uma janela, funcionalidade cosmética incompleta vai para pós-MVP. Não substituir um componente pronto por uma implementação nova para “melhorar arquitetura”.

## 13. Divisão de trabalho

| Responsável | Faz no MVP |
|---|---|
| Codex | Importa arquivos, adapta código, migra SQLite, conecta UI, testa, corrige defeitos e documenta execução. |
| GPT/operador | Executa pesquisa guiada, interpreta evidências, gera auditorias, textos, propostas e materiais criativos. |
| Usuário | Aprova nicho/cidade, oferta/preço, checkout oficial, conteúdo comercial e qualquer contato externo. |

Nenhum agente deve enviar e-mail, DM, WhatsApp, proposta ou publicar conteúdo sem a aprovação humana correspondente.

## 14. Testes obrigatórios

### 14.1 Código e banco

- `python prospector-mcp.py --teste` deve concluir sem erro.
- `py_compile` deve passar em MCP, servidor e gerador DOCX.
- Migração deve rodar duas vezes sem falhar nem duplicar coluna.
- Criar, obter, listar e atualizar lead deve funcionar.
- Reiniciar o servidor não pode perder dados.
- Duplicidade por domínio/telefone deve ser tratada.
- `fechado` sem valor deve ser rejeitado no backend e na UI.

### 14.2 Dashboard

- Views Overview, Pipeline, Clientes, Sites, Comparador, Follow-ups, Contratos, Financeiro e Configurações abrem.
- Drag/drop ou mudança de status existente continua funcionando.
- Campos novos aparecem sem quebrar registros antigos.
- Nenhuma senha ou segredo aparece no HTML/JSON.
- Verificar larguras 360, 375, 768, 1024, 1280 e 1440 px.

### 14.3 Prospecção

- Pelo menos 10 registros reais.
- Cada registro contém fonte e data.
- Pelo menos um contato público ou motivo de descarte.
- Recomendações Datta360°/DattaVPS possuem razão verificável.
- Nenhuma alegação técnica é apresentada como fato sem evidência.

### 14.4 Datta360°

- Três auditorias e uma entrega completa.
- Site responsivo, links funcionando, contato correto e conteúdo real.
- Comparador abre e diferencia claramente antes/depois.
- Instagram contém auditoria, três posts, três stories e calendário.
- Proposta agrega site e Instagram com preço/escopo aprovados.

### 14.5 DattaVPS

- Sem configuração, CTA fica desabilitado.
- Com configuração, CTA abre a URL oficial.
- O DattaSeller não coleta pagamento.
- Apresentação e clique têm registro distinto de pagamento.
- Pagamento e entrega podem ser confirmados manualmente com evidência.

## 15. Evidências de aceite

Salvar em `poc/dattaseller-local/evidence/`, sem dados sensíveis:

- `01-baseline-prospector.md`
- `02-migracao-sqlite.md`
- `03-dashboard-crud.png`
- `04-pipeline-kanban.png`
- `05-leads-amostra-redigida.csv`
- `06-auditoria-site.md`
- `07-auditoria-instagram.md`
- `08-comparador-url.md`
- `09-proposta-datta360-url.md`
- `10-checkout-dattavps.md`
- `11-e2e-datta360.md`
- `12-e2e-dattavps.md`
- `13-testes-regressao.md`
- `14-pendencias-pos-mvp.md`

Prints e CSV devem ocultar telefone, e-mail pessoal, tokens, senhas e dados contratuais.

## 16. Fora do escopo das 24 horas

- reconstruir dashboard em React/Next.js;
- migrar SQLite para PostgreSQL/Supabase;
- autenticação, organizações, RBAC e multiusuário;
- disponibilizar o CRM local publicamente;
- integração completa com DeskcommCRM/OpenOutreach;
- automação de DM, e-mail ou WhatsApp em massa;
- publicação automática no Instagram;
- checkout próprio, captura de cartão ou conciliação automática;
- provisionamento automático do VPS;
- comissão, afiliados e contabilidade completos;
- enriquecimento pago ou scraping que contorne bloqueios;
- observabilidade e alta disponibilidade de produção;
- modelagem definitiva de catálogo/pedido/entrega;
- revisão jurídica final do contrato;
- expansão DattaSeg além do que já estiver estritamente pronto.

Esses itens formam o backlog de evolução, não bloqueios do MVP assistido.

## 17. Bloqueios reais e como não parar o desenvolvimento

Existem apenas duas informações comerciais que dependem do usuário:

1. URL oficial, plano, preço e disponibilidade do DattaVPS.
2. Escopo, preço e prazo aprovados do Datta360°.

Enquanto faltarem, desenvolver com variáveis vazias e estado visual “aguardando configuração”. Não inventar valores. Todo o restante do fluxo deve continuar testável.

## 18. Definição de pronto

O MVP está pronto quando:

- os componentes do Prospector foram efetivamente importados e usados;
- não existe segundo dashboard/Kanban/CRM construído em paralelo;
- o baseline e os testes de regressão passam;
- 10 leads públicos foram pesquisados com rastreabilidade;
- três leads foram analisados;
- um caso Datta360° completo contém site, Instagram e proposta;
- um caso DattaVPS apresenta a oferta e abre o checkout oficial;
- fechamento sem valor é impossível;
- nenhum segredo foi versionado;
- nenhuma comunicação externa foi enviada sem aprovação;
- as evidências permitem repetir a demonstração;
- as pendências de arquitetura superior estão registradas para depois, sem contaminar o prazo atual.

## 19. Instrução inicial para o Codex

Usar este texto como comando de abertura da implementação:

> Implemente o MVP descrito neste documento em ordem de cards. O código do Prospector no Google Drive é a base obrigatória: baixe, preserve uma cópia original, execute o baseline e adapte a cópia. Não recrie dashboard, Kanban, MCP, SQLite, comparador, proposta, contrato, follow-up ou publicação se o pacote já trouxer o componente. Faça somente mudanças mínimas, registre evidências por etapa e respeite rigorosamente a lista fora de escopo. Se faltar preço ou checkout, use estado aguardando configuração; não invente dados e não pare o restante do trabalho.

## 20. Próximo passo após o MVP

Depois da primeira venda assistida, medir: tempo por lead, taxa de qualificação, taxa de resposta, motivos de perda, conversão por produto e esforço de entrega. Só então priorizar a migração das partes validadas para a arquitetura superior do DattaSeller. O que não gerar aprendizado ou venda não deve ser reconstruído apenas por elegância técnica.
