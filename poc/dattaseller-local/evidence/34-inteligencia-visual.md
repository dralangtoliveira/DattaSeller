# Verificação visual local — qualificação e diagnóstico

Data: 2026-09-13. Ambiente: dashboard local sem conexões externas.

No painel **Diagnóstico**, para o lead DEMO `http-demo-lead`, foram usados os
formulários visuais para:

1. salvar uma qualificação Datta360 com o fato `CTA ausente em página pública`,
   a hipótese `validar escopo comercial`, confiança `medium`, motivo, pergunta
   de validação e próxima ação;
2. registrar diagnóstico de CTA com estado `ausente`, evidência de página
   pública e recomendação `inserir CTA`;
3. registrar auditoria de Instagram com a nota factual `perfil público
   observado`.

Após cada ação, a tabela exibiu a recomendação, a confiança e os indicadores
de diagnóstico e rede social. As APIs locais retornaram os três registros
persistidos (`qual_4d7c8c888a98`, `diag_640d0ee18f69` e
`social_11bece9301e2`). A suíte Python do núcleo passou com 10 testes.
