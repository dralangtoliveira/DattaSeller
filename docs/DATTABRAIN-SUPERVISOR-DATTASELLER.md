# DattaSeller — Cérebro Supervisor Canônico

**Data-base:** 2026-09-19  
**Projeto:** DattaSeller  
**Branch web canônica:** `hardening/phase-a-containment-clean`  
**Vault supervisor:** `C:\Users\dr_al\OneDrive\Documentos\ChatGPT\DattaBrain`  
**Pasta do projeto no vault:** `01-PROJECTS\DattaSeller`  
**Grafo do código:** `C:\Users\dr_al\OneDrive\Documentos\ChatGPT\DattaSeller\graphify-out`

## 1. Regra de leitura obrigatória

Antes de planejar, alterar código, criar card, declarar bloqueio ou declarar entrega do DattaSeller, o supervisor deve reconciliar, nesta ordem:

1. governança global em `~/.codex/AGENTS.md` e `DattaBrain/00-GOVERNANCE`;
2. cérebro operacional em `DattaBrain/01-PROJECTS/DattaSeller`;
3. `AGENTS.md` do repositório DattaSeller;
4. contrato funcional `docs/CONTRATO-FUNCIONAL-CANONICO-DATTASELLER.md`;
5. gates machine-readable `product-contract/dattaseller-value-gates.json`;
6. grafo Graphify do repositório: `graphify-out/graph.json`, `GRAPH_REPORT.md` e artefatos relacionados;
7. código, testes, migrations, CI, banco e evidências reais;
8. material original Prospector preservado no repositório/Google Drive;
9. Notion somente como espelho visual/operacional.

Se houver conflito, registrar `CONFLITO_DE_EVIDÊNCIA`. Não resolver divergência escolhendo silenciosamente a fonte mais conveniente.

## 2. Papéis das fontes

### DattaBrain
É o **cérebro supervisor operacional**: objetivo, estado, decisões vigentes, bloqueios, próxima entrega, critérios de aceite e contexto que não pode se perder entre sessões.

### Graphify
É o **mapa do código e das relações técnicas**. Serve para o Codex localizar implementação, dependências e impacto antes de editar. Não substitui requisitos comerciais nem critérios de aceite.

### Git
É a **prova técnica versionada**: código, contrato funcional, testes, commits, migrations e evidências reproduzíveis.

### Notion
É a **visão humana/board**. Não é autoridade para promover uma função a "Pronto" se o gate funcional no Git/DattaBrain não estiver comprovado.

### Google Drive / Prospector
É a **fonte histórica do comportamento funcional original** que deve ser preservado durante a migração. As skills e prompts são procedimentos, não material decorativo.

## 3. Produto que não pode ser reduzido a CRM

O DattaSeller é uma máquina comercial. O fluxo obrigatório é:

```text
nicho/localização
→ buscar empresas reais
→ enriquecer com proveniência
→ qualificar
→ analisar site real
→ criar redesign real
→ analisar Instagram/TikTok real
→ gerar demonstração social
→ montar proposta pública sem login
→ gerar e-mail Prospector
→ revisão humana
→ envio real controlado
→ follow-up
→ negociação/CRM/timeline
```

Cadastro manual é entrada alternativa. Nunca substitui busca real.

## 4. Entregas de valor e critérios

### ETAPA 1 — Descoberta real de leads
Entrada humana: nicho, cidade/região/raio e quantidade.

Saída obrigatória:
- empresas reais encontradas em fontes públicas;
- nome;
- fonte pública;
- data da verificação;
- site, telefone/WhatsApp, endereço e perfis públicos quando encontrados;
- nenhum dado inventado.

Não conta como entrega:
- formulário para o operador digitar empresa;
- endpoint que apenas recebe `candidates`;
- fixture sintética.

### ETAPA 2 — Enriquecimento
Um lead incompleto deve poder ser enriquecido com fontes permitidas.

Campos possíveis:
- nome/empresa;
- segmento;
- localização;
- domínio/site;
- e-mail público;
- telefone/WhatsApp;
- Instagram/TikTok;
- contatos adicionais.

Cada dado enriquecido deve registrar:
- valor;
- fonte;
- data;
- confiança;
- classificação como confirmado, provável ou inferência quando aplicável.

Nunca sobrescrever silenciosamente dado confirmado manualmente. Falha de enriquecimento não apaga o lead.

### ETAPA 3 — Qualificação
Separar:
- fatos observados;
- hipóteses;
- recomendação;
- motivo;
- confiança;
- pergunta de validação;
- próxima ação.

A recomendação de Datta360/DattaVPS deve ser explicável.

### ETAPA 4 — Diagnóstico do site real
O sistema deve realmente inspecionar o site do lead e registrar observações verificáveis:
- proposta de valor;
- CTA;
- mobile;
- hierarquia/legibilidade;
- serviços/localização;
- prova social;
- links/problemas visíveis;
- oportunidades.

Não afirmar lentidão, insegurança, SEO ruim ou outro problema técnico sem evidência.

### ETAPA 5 — Redesign real
Fonte histórica: `prospector-redesign/SKILL.md`.

O redesign deve usar, quando disponíveis:
- logo real;
- fotos reais;
- textos/serviços reais;
- endereço;
- telefone/WhatsApp;
- identidade/paleta;
- avaliações e prova social verificáveis.

Deve gerar:
- versão melhorada individualizada;
- editor;
- comparador antes/depois;
- responsividade.

Não conta:
- template genérico recebendo somente nome+nicho+URL;
- mudar apenas cor/texto;
- conteúdo inventado.

### ETAPA 6 — Diagnóstico social
Instagram/TikTok público deve ser analisado com identidade confirmada.

Registrar:
- URL/@;
- bio;
- CTA;
- link;
- consistência visual;
- frequência aparente;
- serviços/produtos;
- prova social;
- contato;
- oportunidades;
- evidências/data.

Perfil encontrado não é automaticamente perfil oficial.

### ETAPA 7 — Demonstração social
Para proposta Datta360, produzir material demonstrativo coerente com a marca real.

Escopo recuperado:
- direção visual;
- calendário inicial de 7 dias;
- 3 peças de feed demonstrativas com legenda/CTA;
- 3 sugestões de stories;
- demonstração sujeita à aprovação.

O prompt de conteúdo do material original deve ser reutilizado. Não publicar automaticamente.

### ETAPA 8 — Proposta pública
A página que o cliente recebe deve abrir **sem login**.

Deve reunir:
- identificação correta;
- diagnóstico factual;
- site atual;
- site melhorado;
- comparador;
- diagnóstico social;
- demonstração social;
- escopo;
- preço/prazo/condições aprovados;
- CTA.

Rota admin-only não satisfaz este gate.

### ETAPA 9 — E-mail Prospector
Fonte obrigatória: `prospector-proposta/SKILL.md` + `PROMPTS-PRONTOS.md.pdf`.

O e-mail é rascunho para revisão humana e deve respeitar:
- 120–180 palavras;
- assunto em forma de pergunta pessoal, até 60 caracteres, com nome do negócio quando adequado;
- primeira linha 100% personalizada usando fato verificável;
- 1–2 oportunidades objetivas do site/presença atual, sem ofensa;
- mencionar a nova versão/demonstração preparada;
- exatamente **1 link**, apontando para a página pública da proposta;
- sem encurtador;
- domínio limpo;
- sem palavras-gatilho: grátis, promoção, imperdível, desconto, clique aqui, urgente;
- sem caixa alta/!!/emoji no assunto;
- corpo minimalista;
- zero imagens;
- zero botões;
- zero anexos;
- zero preço no corpo;
- assinatura configurada;
- envio individual;
- revisão humana obrigatória.

O Resend é apenas o transporte. Resend funcionando não significa e-mail Prospector entregue.

### ETAPA 10 — Envio controlado e follow-up
Depois da aprovação humana:
- provider real envia;
- registrar recipient, sender, provider_message_id e timeline;
- não enviar automaticamente ao importar lead.

Follow-up:
- somente 3+ dias sem resposta;
- checar resposta antes;
- máximo 4 linhas;
- reutilizar o mesmo link da proposta;
- no máximo 1 follow-up por lead para sempre;
- mesma revisão humana.

### ETAPA 11 — E2E comercial real
Teste de produto começa na entrada humana real e termina na entrega comercial real.

Exemplo de aceite:
```text
"clínicas de estética em Franca, 5 leads"
→ sistema encontra 5 empresas reais
→ enriquece
→ operador escolhe 1
→ analisa site e social
→ gera redesign
→ gera demonstração social
→ gera proposta pública
→ gera e-mail Prospector
→ humano aprova
→ envio controlado
→ CRM/timeline registram
```

E2E que começa com candidato sintético já montado não prova o coração do produto.

## 5. Estado atual que o supervisor deve assumir até nova evidência

- CRM/Supabase/autenticação/persistência: existentes.
- deduplicação: existente.
- qualificação/persistência: existente.
- proposta/artifacts: infraestrutura existente, entrega pública ainda não comprovada.
- Resend: fluxo real já provado em ambiente controlado; Production ainda não deve ser tratada como totalmente liberada.
- busca real automática/operacional: não comprovada na linha web atual.
- enriquecimento real: não comprovado.
- redesign real usando ativos do cliente: não comprovado; implementação web atual é insuficiente para o gate.
- diagnóstico social real: parcial.
- demonstração social visual: não comprovada.
- proposta pública sem login: não comprovada.
- gerador de e-mail Prospector com checklist bloqueante: não comprovado.
- follow-up completo no procedimento original: parcial.
- E2E comercial real desde nicho/cidade: não comprovado.

Nunca elevar estes estados sem evidência reproduzível.

## 6. História que não pode ser esquecida

- O pacote Prospector do Google Drive é base obrigatória, não inspiração.
- Pasta histórica Drive: `1pJYT5yVgU1fi-xAhVHeSYaRxFId6TQJa`.
- `prospector-prospeccao.zip`: descoberta/qualificação.
- `prospector-redesign.zip`: redesign/editor/comparador.
- `prospector-publicacao.zip`: publicação pública.
- `prospector-proposta.zip`: proposta/e-mail/follow-up.
- `prospector-contrato.zip`: contrato.
- `PROMPTS-PRONTOS.md.pdf`: prompts operacionais; inclui procedimento explícito de e-mail.
- `Os-5-Prompts-Servicos-com-IA.pdf`: base para conteúdo social.
- commit histórico `b23a3aa`: enriquecimento declarado núcleo do MVP rápido.
- registros locais históricos `f74fb72`, `320207c`, `3c1da75` aparecem no Notion; não presumir que estejam no remoto. Procurar localmente antes de reimplementar.
- a linha web atual e a antiga `main` não devem ser tratadas como história linear sem reconciliação.
- branch operacional atual: `hardening/phase-a-containment-clean`.

## 7. Anti-trabalho-falso

Não criar trabalho para simular progresso.

Não considerar entrega de valor:
- criar coluna;
- criar tabela;
- criar endpoint vazio;
- criar formulário;
- criar card;
- documentar sem implementar;
- CI verde;
- build verde;
- Preview verde;
- mock que substitui a transformação principal.

Esses itens podem ser subtarefas, mas nunca encerram um gate sozinhos.

A prioridade é sempre a próxima saída que um operador ou cliente consegue usar.

## 8. Regra para migração/refatoração

Antes de qualquer migração:
1. listar capacidades afetadas;
2. identificar executor anterior;
3. identificar executor novo;
4. definir prova de paridade;
5. manter executor anterior até o novo passar;
6. marcar `CONFLITO_DE_EVIDÊNCIA` se a prova não puder ser reconciliada.

Uma função só está migrada quando **a mesma entrada produz saída equivalente ou melhor**.

## 9. Próxima sequência permitida

Não abrir nova frente periférica enquanto os gates de valor estiverem ausentes.

Ordem:
1. DS-VALUE-01 descoberta real;
2. DS-VALUE-02 enriquecimento;
3. DS-VALUE-03/04 diagnóstico + redesign real;
4. DS-VALUE-05/06 social real + demonstração;
5. DS-VALUE-07 proposta pública;
6. DS-VALUE-08 e-mail Prospector;
7. DS-VALUE-09/10 envio + follow-up;
8. DS-VALUE-11 E2E comercial real.

Infraestrutura comercial como checkout/comissão pode continuar quando for dependência direta do fluxo, mas não deve deslocar a recuperação do coração do DattaSeller.

## 10. Protocolo de resposta do supervisor

Antes de executar, o supervisor deve conseguir responder:
- qual etapa de valor está sendo trabalhada;
- qual entrada real recebe;
- qual saída utilizável entrega;
- qual componente histórico está sendo reutilizado;
- qual código atual participa;
- qual prova encerra o gate;
- o que ainda não está comprovado.

Se não consegue responder, não deve começar a implementação.
