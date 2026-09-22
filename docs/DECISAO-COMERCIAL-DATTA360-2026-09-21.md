# Decisão Comercial — Datta360°

**Data:** 2026-09-21  
**Status:** APROVADO  
**Aplicação:** propostas comerciais Datta360° no DattaSeller

## Prazo padrão

O prazo comercial padrão de execução é de **7 dias**.

A contagem operacional exata (dias corridos ou úteis, marco inicial e exceções de escopo) deve ser explicitada na proposta quando necessário. O sistema não deve inventar regra adicional além da decisão aprovada.

## Condição padrão de pagamento

A condição padrão é:

- **50% de sinal** na aprovação/contratação;
- **50% restante na entrega**.

## Negociação excepcional

Outras condições podem ser discutidas **caso a caso**, mediante revisão humana.

O sistema não pode:
- alterar automaticamente a condição padrão;
- conceder condição especial sem registro;
- inventar desconto, parcelamento, prazo ou condição;
- transformar negociação excepcional em nova regra global.

Qualquer exceção deve ser registrada na proposta específica e prevalece somente para aquela proposta.

## Relação com preço

Os preços continuam vindo da fonte comercial canônica existente, especialmente `catalog/products.json` e `docs/06-catalogo-comercial.md`.

Esta decisão não altera preços aprovados. Ela fecha apenas:
- prazo comercial padrão;
- condição padrão de pagamento;
- possibilidade de negociação individual mediante revisão humana.

## Requisito para DS-VALUE-07

A proposta pública deve exibir, a partir do snapshot persistido da proposta:

- escopo aprovado;
- preço efetivo;
- moeda;
- prazo;
- condição de pagamento;
- validade;
- eventuais condições específicas negociadas.

O renderer público não deve hardcodar preços ou exceções. A proposta persistida é o snapshot comercial que deve ser mostrado ao cliente.
