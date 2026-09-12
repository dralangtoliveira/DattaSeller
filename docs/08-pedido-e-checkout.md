# Pedido e checkout externo

**Card:** CCD-18  
**Domínio:** `src/orders/checkout.js`

O Seller cria um pedido pendente somente para um plano comercialmente disponível. O adaptador de checkout recebe valor, moeda, cliente e referência do pedido, mas nunca expõe credenciais ao vendedor. A resposta deve conter URL e identificador externo; sem ambos, o pedido não é considerado pronto para envio.

Um provider real ainda não foi configurado. O adaptador será ligado apenas a um checkout aprovado pelo produto responsável ou por um gateway comercial do Seller.
