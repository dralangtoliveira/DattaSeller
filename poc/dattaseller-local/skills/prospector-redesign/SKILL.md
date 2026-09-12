---
name: prospector-redesign
description: Redesenha o site de um cliente prospectado — cria versão nova, premium e de alta conversão da página existente, mantendo conteúdo, fotos, logo e paleta REAIS do cliente. Use quando o usuário pedir "redesenhar site", "refazer o site do cliente", "melhorar a página" ou após uma prospecção. Gera página + editor visual + comparador antes/depois.
---

# Redesign premium (ChatGPT Work/Codex)

Criar uma NOVA VERSÃO da página do cliente — não uma página nova. O cliente precisa se reconhecer, elevado ao padrão que o faturamento dele merece. Trabalhe em lote (5+ clientes de uma vez, os melhores do leads.md).

## Regras invioláveis

1. **Nenhum FATO inventado — mas o texto é REESCRITO com técnica.** Serviços, credenciais, endereço e contato vêm do site original/perfil do Google. Headline de benefício (não rótulo), estrutura PAS suave, blocos escaneáveis, 1 CTA por dobra apontando pro WhatsApp real com mensagem pré-preenchida (wa.me/55DDD...). Proibido: clichês vazios, superlativos inventados.
2. **Fotos e logo originais OBRIGATÓRIOS.** Extraia pelo navegador (extensão Chrome): colete `img.currentSrc` de todas as imagens rolando a página inteira (lazy-load). Sem logo real = composição tipográfica, nunca logo inventado.
3. **Identidade preservada**: paleta do cliente (refine tons fracos, nunca troque a família de cores).
4. **Mais completo que o original**: crie seções que faltam SÓ com informação real — prova social (nota + avaliações do Google), como funciona, localização/mapa, horários, FAQ respondível pelo conteúdo real.
5. **Arquivo único autocontido**: `sites/[slug]/[slug].html`, CSS inline, só Google Fonts.
6. **Responsividade TOTAL (inegociável)**: perfeita em 360, 375, 768, 1024, 1280 e 1440px — zero rolagem horizontal, zero quebra. Tipografia com clamp(), grid/flex fluidos.
7. **Editor sempre**: gere `sites/[slug]/[slug]-editor.html` injetando a camada de edição de `references/editor-visual.md` antes de `</body>`.
8. **Comparador sempre**: gere/atualize `comparar.html` na raiz com `references/comparador-template.html` (substitua `__CLIENTES__` pelo array JSON, mesclando com clientes existentes).

## Padrão estético

Serifada elegante em títulos (Playfair/Fraunces/Lora) + sans limpa no corpo (Inter/Sora), h1 ≥ 40px desktop; seções com 80-120px de respiro; 1 cor da marca + neutros quentes + 1 acento pra CTA (contraste AA); botão WhatsApp flutuante; bordas 12-16px, sombras suaves; zero bibliotecas JS.

## Requisito do Criador de Sites (PRIORIDADE MAXIMA)

1. Use obrigatoriamente o plugin/skill `Sites` para construir cada lote de redesign. O projeto deve conter `.openai/hosting.json`. HTML estatico autonomo nao pode ser a entrega principal.
2. A entrega no Sites deve ter o comparador na rota inicial, a pagina em `/{slug}` e o editor visual conectado em `/{slug}/editor` para cada cliente.
3. Cada cliente recebe direcao de arte propria, definida a partir de marca, publico e conteudo reais. E proibido repetir hierarquia de secoes, composicao do hero, grade, ordem dos blocos, fluxo de conversao ou componente-base entre clientes.
4. Alterar somente paleta, fotos ou textos nao constitui uma estrutura nova. Cada pagina deve divergir visivelmente no hero, na arquitetura de conteudo, no bloco de credibilidade e no caminho ate o CTA.
5. Antes da entrega, compare as tres ou mais paginas lado a lado nas larguras obrigatorias. Se uma parecer variacao de outra, redesenhe antes de concluir.

Estas regras prevalecem sobre qualquer instrucao anterior desta skill que mencione arquivos HTML individuais, editor generico ou comparador estatico.

## Checklist final (bloqueante)

- [ ] Zero placeholder; CTAs pro contato REAL; wa.me correto (55+DDD+número)
- [ ] Responsivo verificado nas 6 larguras
- [ ] Todo conteúdo importante do original presente + fotos/logo originais
- [ ] `[slug]-editor.html` gerado e `comparar.html` atualizado
- [ ] Status do lead atualizado (leads.md + CRM)

A entrega ao usuário DEVE apresentar: comparador primeiro, depois página + editor de cada cliente, resumo de 1 linha por cliente e a confirmação "CRM atualizado: N leads redesenhados". Próximo passo: publicar.


## Regra de execução (NÃO NEGOCIÁVEL)

Esta skill é um PROCEDIMENTO, não uma referência: siga TODOS os passos na ordem, sem improvisar nem pular etapas "para simplificar". É PROIBIDO encerrar a resposta com qualquer entrega listada acima pendente — se faltar, gere agora. Toda mudança de status de lead DEVE ser gravada no leads.md E no CRM local antes de encerrar, terminando com a confirmação "CRM atualizado: [N] leads".
