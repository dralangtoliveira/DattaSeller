---
name: prospector-prospeccao
description: Prospecta clientes no Google Maps para venda de redesign de sites. Use quando o usuário pedir para "prospectar", "buscar clientes", "achar leads", "encontrar negócios com site ruim" ou similar. Busca negócios bem avaliados (nota ≥ 4.7, 40+ avaliações) com site próprio ATIVO porém fraco e e-mail público, qualifica os leads e monta a planilha/base local.
---

# Prospecção no Google Maps (ChatGPT Work)

Encontrar negócios com boa reputação mas presença digital fraca. O contraste entre a nota alta e o site ruim É o argumento de venda.

## Pré-requisitos

- Extensão do ChatGPT para Chrome instalada e conectada (é ela que navega no Maps e nos sites dos leads).
- Pasta de trabalho do projeto definida (ex.: "Clientes") — `prospector-config.json` com nichos, cidade e assinatura fica nela. Se não existir, colete: nome/apresentação/WhatsApp do usuário, nichos padrão (sugira nutricionistas, psicólogos, advogados, psiquiatras), cidade e leads por busca (padrão 10), e salve o config.

## Os 3 filtros eliminatórios (nesta ordem)

1. **Sem site próprio → PULA.** O serviço é REDESIGN: precisa existir página para redesenhar. Não conta: Instagram, Linktree, diretório de terceiros (Doctoralia etc.), site fora do ar. Registre o descarte com motivo e siga.
2. **Site BOM → PULA.** Página moderna e responsiva não tem dor pra resolver.
3. **Sem e-mail público → PULA.** Procure no perfil do Maps e no site (contato, rodapé, política de privacidade). Não achou? Descarta e busca outro — a meta de qualificados não diminui.

## Fluxo

1. Pelo navegador (extensão Chrome), abra o Google Maps e busque "[nicho] em [cidade]".
2. Avalie até 25 estabelecimentos ou até bater a meta de leads qualificados.
3. Corte: nota ≥ 4.7 e ≥ 40 avaliações. Depois aplique os 3 filtros.
4. Abra o site de cada candidato em nova aba e avalie: não responsivo, design datado, sem hierarquia, sem CTA na primeira dobra, lento, conteúdo abandonado, template mal preenchido — 2+ sinais = site ruim (qualifica). Registre o motivo ESPECÍFICO (vira o argumento da proposta).
5. Colete por lead: nome, nota, nº de avaliações, telefone/WhatsApp, e-mail, URL do site, motivo, e 2-3 trechos de avaliações reais.

## Critérios de conclusão (BLOQUEANTES — é PROIBIDO encerrar a tarefa sem TODOS)

Esta skill NÃO é referência opcional: os passos abaixo são parte da tarefa. Não improvise o fluxo. Antes de responder ao usuário pela última vez, verifique um a um:

1. [ ] **Pasta do projeto criada/identificada** com `prospector-config.json`.
2. [ ] **`leads.md` escrito** na pasta, com TODOS os avaliados (qualificados E descartados com motivo) e status `novo` nos qualificados.
3. [ ] **Planilha criada** no Google Drive (Sheets) com as colunas: #, Nome, Nota, Avaliações, E-mail, Telefone, Site atual, Motivo, Situação, Status, URL nova — link entregue ao usuário.
4. [ ] **CRM inicializado e populado**: se `dashboard.html`/`prospector.db` não existem na pasta, CRIE agora usando os arquivos da skill prospector-crm (template + servidor + bat) e insira os leads. Pasta nova NUNCA é desculpa — inicializar o CRM faz parte DESTA tarefa.
5. [ ] **Frase final obrigatória na resposta**: "CRM atualizado: [N] leads" + o próximo passo (redesenhar os 5 melhores).

Se qualquer item estiver incompleto, complete-o ANTES de responder. Nunca reavalie estabelecimento que já está em leads.md; rodadas novas somam na MESMA planilha.
