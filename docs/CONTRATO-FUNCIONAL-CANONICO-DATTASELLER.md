# Contrato Funcional Canônico — DattaSeller

**Versão:** 2026-09-19  
**Escopo:** produto comercial DattaSeller / Datta360°  
**Regra:** este arquivo define o que significa "entregue". Código, rota, tabela, botão, build, migration, CI verde ou deploy não substituem a prova funcional descrita aqui.

## 1. Fonte de verdade

A ordem de autoridade para o estado funcional é:

1. este contrato funcional versionado no Git;
2. evidência executável ou reproduzível ligada ao gate;
3. código/commit que produz a evidência;
4. Notion como espelho operacional.

O Notion não pode elevar uma capacidade para `Pronto` quando este contrato ainda a classifica como não comprovada. Se houver divergência, prevalece a evidência executável.

## 2. Definição do produto

O DattaSeller só cumpre sua função central quando consegue executar a jornada:

```text
nicho/localização
→ descobrir empresas reais em fontes públicas
→ enriquecer e registrar proveniência
→ qualificar oportunidade
→ analisar presença digital real
→ produzir demonstração de melhoria de site e social
→ montar proposta pública sem login
→ gerar e-mail comercial conforme Prospector
→ revisão humana
→ envio controlado
→ follow-up e rastreabilidade no CRM
```

Cadastro manual continua permitido como entrada alternativa, mas não substitui descoberta/prospecção.

## 3. Gates de valor obrigatórios

| Gate | Capacidade | Prova mínima para status PROVEN_REAL |
| --- | --- | --- |
| DS-VALUE-01 | Descoberta de leads | Dado `nicho + cidade + quantidade`, o sistema encontra empresas reais e devolve fonte pública rastreável sem digitação prévia de cada empresa. |
| DS-VALUE-02 | Enriquecimento | Um lead incompleto é completado com dados públicos disponíveis, cada campo com fonte, data e confiança, sem sobrescrever silenciosamente dado confirmado. |
| DS-VALUE-03 | Diagnóstico de site | O sistema abre/analisa o site real e registra observações verificáveis, separando fato de hipótese. |
| DS-VALUE-04 | Redesign real | O preview usa conteúdo, identidade, logo/fotos e contatos reais quando disponíveis e produz versão individualizada; template genérico não conta. |
| DS-VALUE-05 | Diagnóstico social | Instagram/TikTok público é analisado com URL, identidade confirmada, bio/CTA, consistência, frequência aparente, evidências e oportunidades. |
| DS-VALUE-06 | Demonstração social | A proposta contém direção visual e peças demonstrativas coerentes com a marca real, sem publicação automática. |
| DS-VALUE-07 | Proposta pública | O cliente abre a proposta sem login e vê diagnóstico + antes/depois + preview + social + escopo/preço aprovados. |
| DS-VALUE-08 | E-mail Prospector | O sistema gera rascunho personalizado, 120–180 palavras, assunto ≤60 caracteres, 1 link limpo, sem palavras-gatilho, sem imagens/anexos, revisão humana obrigatória. |
| DS-VALUE-09 | Envio real controlado | Após aprovação humana, o e-mail é enviado pelo provider real, com destinatário/remetente válidos e rastreabilidade do provider. |
| DS-VALUE-10 | Follow-up | No máximo 1 follow-up por lead após 3+ dias sem resposta, usando o mesmo link da proposta e passando pela mesma revisão. |
| DS-VALUE-11 | E2E comercial | Uma consulta real percorre DS-VALUE-01 → DS-VALUE-10 sem fixture sintética substituir a entrada ou a transformação principal. |

## 4. Regras de paridade

Uma capacidade migrada de local para web só pode receber `PROVEN_REAL` quando a mesma entrada do fluxo antigo produz uma saída equivalente ou melhor no ambiente web.

Exemplos:

- `POST /api/prospects = 200` não prova descoberta de leads.
- tabela `ds_social_audits` não prova demonstração social.
- função `renderProspectorRedesign` não prova redesign real se não usar os ativos reais do cliente.
- integração Resend não prova e-mail comercial se o texto não obedecer ao procedimento Prospector.
- rota de proposta autenticada não prova proposta pública para cliente.

## 5. Regras de mudança

Antes de trocar arquitetura, runtime, banco, framework, provider ou modo local/web:

1. listar os gates afetados;
2. identificar quem executa cada função no estado anterior;
3. identificar quem executará a mesma função no novo estado;
4. manter o gate como não comprovado até executar a prova mínima;
5. não remover o executor antigo antes de existir substituto testado;
6. não converter capacidade ausente em formulário manual para chamar de migrada.

## 6. Definição de pronto

`PRODUCT_READY=true` somente quando **todos** os gates DS-VALUE-01 a DS-VALUE-11 estiverem `PROVEN_REAL`.

Enquanto qualquer gate estiver `MISSING`, `PARTIAL`, `BLOCKED` ou `PROVEN_DEMO`, o DattaSeller pode ter infraestrutura pronta, mas o produto comercial não está concluído.

## 7. Estado de referência em 2026-09-19

O estado machine-readable está em `product-contract/dattaseller-value-gates.json` e é validado pela suíte de testes. Alterar um status exige atualizar a evidência correspondente no mesmo commit.
