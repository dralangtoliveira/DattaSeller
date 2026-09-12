# Checkout Datta VPS

O painel permite configurar nome, descrição curta, preço, disponibilidade e URL oficial HTTPS. Enquanto qualquer item obrigatório estiver ausente, exibe **Oferta aguardando configuração** e não mostra CTA nos leads.

O teste automatizado usou configuração efêmera e confirmou: URL HTTP rejeitada; URL HTTPS aceita; CTA restrita a lead indicado para DattaVPS; apresentação e clique gravados em instantes distintos; `delivery_status` atualizado para `checkout_acessado`; URL aberta idêntica à configuração. A configuração e o lead de teste foram removidos ao final. Resultado: `dattavps-results.json`.

No estado operacional entregue, os valores oficiais continuam vazios. O MVP não cria checkout, não recebe cartão e não confirma pagamento, provisionamento ou entrega.
