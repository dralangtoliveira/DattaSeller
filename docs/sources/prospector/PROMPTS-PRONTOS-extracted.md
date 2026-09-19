# Transcrição textual — PROMPTS-PRONTOS.md.pdf

**Origem:** Google Drive — pasta Prospector `1pJYT5yVgU1fi-xAhVHeSYaRxFId6TQJa`  
**Arquivo original:** `PROMPTS-PRONTOS.md.pdf`  
**Drive ID:** `1-zqjMavfK22oFAcTygxA0cZlb_X8b107`

> Transcrição textual preservada para leitura por agentes sem dependência de PDF/OCR. O PDF original permanece a fonte histórica primária.

## Prompts prontos — Prospector no ChatGPT Work

Antes de começar: crie sua pasta de trabalho (ex.: Clientes na Área de Trabalho), configure o MCP apontando pra ela (veja o LEIA-ME) e troque `C:\Users\seunome\Desktop\Clientes` pelo caminho da SUA pasta em todos os prompts.

### 0 · Testar o MCP (primeira coisa, em tarefa nova)

```text
usando o prospector-crm, me dá o resumo financeiro do meu CRM
```

(Primeira vez vem zerado — e o prospector.db nasce sozinho na pasta. Isso é o sinal de que conectou.)

### 1 · Setup (uma vez só)

```text
Minha pasta de trabalho é C:\Users\seunome\Desktop\Clientes — use ela para TODOS os
arquivos deste projeto, sempre. Seguindo a skill prospector-prospeccao à risca: salve nela o
prospector-config.json com meus dados (assinatura: [seu nome], [como se apresenta, ex.:
Designer de páginas de alta conversão], WhatsApp [55DDDnúmero]; nichos: [ex.:
nutricionistas, psicólogos, advogados, psiquiatras]; cidade: [sua cidade - UF]) e confirme o CRM
conectado via prospector-crm respondendo "CRM atualizado".
```

### 2 · Prospectar

```text
Seguindo a skill prospector-prospeccao à risca, prospecte [3] [nicho] em [cidade] usando a
extensão do Chrome. Regras inegociáveis: só leads com site próprio ATIVO porém fraco E
e-mail público — sem e-mail, descarta e busca outro. Não encerre sem os 5 critérios: leads.md
na minha pasta, planilha no Google Drive, leads salvos no CRM via prospector-crm e a frase
"CRM atualizado: N leads".
```

### 3 · Redesenhar

```text
Seguindo a skill prospector-redesign à risca, redesenhe o melhor lead mantendo fotos, logo e
conteúdo REAIS dele (nada inventado). Entrega travada: comparador antes/depois primeiro,
página + editor visual salvos na minha pasta, status atualizado via prospector-crm e "CRM
atualizado".
```

### 4 · Publicar (ChatGPT Sites)

```text
Seguindo a skill prospector-publicacao, publique o site no ChatGPT Sites como "qualquer
pessoa na internet" e me devolva a URL pública testada em aba anônima — depois marque
publicado com a URL no prospector-crm.
```

### 5 · Proposta por e-mail

```text
Seguindo a skill prospector-proposta, crie o rascunho do e-mail no Gmail para o lead publicado
— checklist anti-spam completa (1 link só, sem palavras de vendedor, assunto-pergunta com o
nome do negócio, primeira linha personalizada com a avaliação real do Google) — e registre
proposta enviada no prospector-crm.
```

### 6 · Follow-up (3+ dias sem resposta)

```text
Consulte followups_pendentes no prospector-crm e, seguindo a skill prospector-proposta, crie o
rascunho de follow-up gentil ("conseguiu ver a página?") para cada um — máximo 4 linhas, 1
por lead, nunca repetir — e registre o follow-up no prospector-crm.
```

### 7 · Fechou!

```text
O cliente [nome do lead] fechou por R$ [valor] com manutenção de R$ [valor]/mês. Registre o
fechamento no prospector-crm com esses valores.
```

### 8 · Contrato

```text
Seguindo a skill prospector-contrato, gere o contrato do [nome do lead] que fechou: a folha A4
imprimível e o Word travado (cliente só preenche CPF, data e assinatura), salve na minha pasta
e deixe o rascunho do e-mail pronto no Gmail.
```

### 9 · Painel visual + financeiro

```text
Regenere o dashboard pelo prospector-crm e me dê o resumo financeiro.
```

(Abra o dashboard.html da pasta pra ver kanban, funil, contratos e financeiro.)

## Utilitários

- Ver o funil: "listar meus leads por status no prospector-crm"
- Corrigir um dado: "no prospector-crm, atualize o e-mail do [lead] para [novo]"
- Desfazer teste/demo: "no prospector-crm, volte o [lead] para status proposta e remova o valor"
