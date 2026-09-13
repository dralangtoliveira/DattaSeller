# Qualificação, diagnóstico e redes sociais — DS-MVP-10, 14 e 15

Data: 2026-09-13.

Foram adicionados registros SQLite persistentes para:

- qualificação: fatos, hipóteses, recomendação, motivo, confiança, pergunta de validação, próxima ação e responsável;
- diagnóstico de site: critério, estado observado, evidência e recomendação;
- auditoria de Instagram/TikTok: URL, bio, CTA, link, observações factuais, consistência e direção criativa.

Guardrails: recomendação `insufficient` é aceita explicitamente; fatos e hipóteses exigem listas distintas; diagnósticos de SEO, velocidade, segurança, vulnerabilidade e penalidade Google são recusados sem teste técnico próprio. Não há OAuth, publicação ou rede externa.

Teste executado: `python app/test_dattaseller_local.py -v` — 9/9 aprovados.
