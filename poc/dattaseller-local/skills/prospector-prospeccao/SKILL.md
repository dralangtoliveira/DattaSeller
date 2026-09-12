---
name: prospector-prospeccao
description: Pesquisa e qualifica leads públicos para Datta360 e DattaVPS, registrando evidências no CRM local.
---

# Prospecção DattaSeller

Use o Prospector original e o MCP local. Antes de pesquisar, obtenha quatro entradas: nicho; cidade, região ou raio; produto preferencial opcional (`datta360`, `dattavps` ou `ambos`); quantidade-alvo. Use 10 leads e no máximo 25 resultados quando o operador não definir os dois últimos valores.

## Fontes e coleta

Consulte somente páginas públicas: Google Maps/perfil público, site oficial, Instagram público, diretório empresarial ou página pública de contato. Não use área autenticada, não burle bloqueio e não compre base. Para todo registro, grave `source_url` e `source_checked_at` em formato ISO.

Antes de inserir, compare nome normalizado, domínio, telefone normalizado e URL do perfil. O MCP atualiza o registro existente quando encontra correspondência. Registre os descartes no CRM com `status=descartado` e motivo, para evitar pesquisa repetida.

## Qualificação Datta360

Nota mínima 4,7 e 40 avaliações são preferência, não barreira. O lead é elegível quando possui atividade/reputação observável, ao menos um canal público adequado e uma oportunidade fundamentada no site ou Instagram. O canal pode ser e-mail, telefone, WhatsApp, Instagram, formulário ou página de contato.

Registre somente fatos observados. Não declare lentidão, insegurança, baixa posição em busca ou problema técnico sem teste e evidência. Separe no `qualification_json`: fatos; hipótese comercial; pergunta de validação.

## Qualificação DattaVPS

Considere agência, software house, desenvolvedor/revenda, negócio com múltiplos sites ou aplicações e sinais públicos de necessidade de hospedagem, desempenho, isolamento, controle ou crescimento. Um site visualmente bom não elimina a aderência. Não infira consumo, custo, vulnerabilidade ou infraestrutura privada.

Preencha `product_suggested`, `product_reason` e `next_action`. A oferta só pode ser apresentada quando a configuração local contiver nome, descrição, preço positivo, disponibilidade ativa e URL oficial HTTPS.

## Conclusão

Grave qualificados e descartados no SQLite pelo MCP. Para cada qualificado, exija fonte, data, canal público, razão verificável e próxima ação. Pare ao atingir a quantidade-alvo ou o limite de resultados. Não envie e-mail, DM, WhatsApp, proposta nem publicação durante a pesquisa.

Ao terminar, informe quantos foram qualificados, quantos descartados e quantos resultados foram avaliados. Sugira selecionar os três melhores para auditoria e um para a demonstração completa.
