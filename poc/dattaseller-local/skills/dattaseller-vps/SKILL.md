---
name: dattaseller-vps
description: Orienta a sugestão assistida do Datta VPS no CRM local, usando exclusivamente checkout oficial configurado.
---

# DattaSeller VPS

Sugira DattaVPS apenas quando houver fato observado, hipótese comercial e pergunta de validação registrados no lead. Leia a configuração local antes de exibir qualquer CTA. Se nome, descrição, preço positivo, `checkout_url` HTTPS ou `enabled=true` estiverem ausentes, mostre “Oferta aguardando configuração” e mantenha o CTA desabilitado.

O primeiro acionamento registra `checkout_presented_at` e `delivery_status=checkout_apresentado`. O acesso ao link registra `checkout_clicked_at` e `delivery_status=checkout_acessado`, abre exatamente a URL oficial em nova aba com `noopener,noreferrer` e não declara venda ou pagamento. Somente acrescente UTM quando o checkout oficial tiver suporte aprovado.

Nunca crie checkout, simule pagamento, capture cartão, envie link, confirme pagamento, provisione ou confirme entrega automaticamente. Pagamento, handoff e entrega permanecem confirmações manuais no CRM.
