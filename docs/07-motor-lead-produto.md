# Motor Lead × Produto v1

**Card:** CCD-12  
**Regras:** `src/match/lead-product.js`

O motor é determinístico e usa apenas os campos comerciais de um lead. Ele retorna `dattavps`, `dattaseg`, `both` ou `none`, além da pontuação e dos sinais que formaram cada recomendação. Não consulta nem replica dados técnicos dos produtos.

O vendedor pode substituir o resultado, mas precisa registrar motivo e autor. O feedback sobre utilidade é um registro separado para aperfeiçoar regras futuras sem ocultar a regra vigente. A migration `db/migrations/003_recommendation_feedback.sql` persiste esse feedback junto ao vendedor responsável.
