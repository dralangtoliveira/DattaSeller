# Catálogo comercial da linha Datta

**Card:** CCD-10  
**Fonte única versionada:** `catalog/products.json`  
**Reconciliação Datta360°:** 2026-09-19

## Regra canônica

O catálogo do Datta360° deve refletir a oferta pública vigente e usar **BRL** como moeda comercial canônica. O preço público funciona como teto da proposta. O CRM pode negociar abaixo desse teto apenas dentro do desconto autorizado para o produto e com revisão humana antes do envio.

Nenhum `checkout_url` é inventado. Os itens com preço publicado permanecem `awaiting_checkout` até existir checkout Asaas real e homologado. Custo interno e comissão também não são inferidos a partir dos registros DEMO.

## Datta360° — catálogo reconciliado

| SKU | Serviço | Preço público | Situação |
| --- | --- | ---: | --- |
| `datta360_diagnostico` | Diagnóstico digital | sem preço independente publicado | componente de escopo |
| `datta360_site` | Site profissional | a partir de **R$ 2.510** | aguarda checkout |
| `datta360_instagram` | Instagram | a partir de **R$ 615** | aguarda checkout |
| `datta360_tiktok` | TikTok | a partir de **R$ 554** | aguarda checkout |
| `datta360_google_business` | Google Business Profile | a partir de **R$ 615** | aguarda checkout |
| `datta360_facebook` | Facebook Business | a partir de **R$ 410** | aguarda checkout |
| `datta360_whatsapp` | WhatsApp Business | a partir de **R$ 410** | aguarda checkout |
| `datta360_crm` | CRM | sem preço independente publicado | componente de escopo |
| `datta360_integracoes` | Integrações | a partir de **R$ 770** | aguarda checkout |
| `datta360` | Pacote completo | **R$ 4.045** | promoção pública atual **R$ 2.427 (-40%)**; aguarda checkout |

## Regras comerciais de Production

1. Moeda do Datta360°: **BRL**.
2. O `public_price` é o teto. O preço negociado não pode ultrapassá-lo.
3. O pacote completo preserva preço público de R$ 4.045 e a promoção pública atual de R$ 2.427, que corresponde a 40% de desconto.
4. Os registros DEMO atuais de `ds_products` não são fonte de verdade para preço, custo ou comissão.
5. `checkout_url` será preenchido somente com URL real do Asaas criada/homologada.
6. Diagnóstico e CRM não recebem preço separado por inferência enquanto não houver decisão comercial explícita.
7. A proposta precisa ser revisada por uma pessoa antes do envio ao cliente.

## Pendências que não podem ser inventadas

Para retirar Production do modo DEMO ainda faltam valores operacionais reais que não estão publicados no site: **custo por SKU**, **comissão por SKU**, o **checkout Asaas real** e a confirmação do identificador do vendedor/remetente de Production. Esses dados devem ser aprovados antes da escrita em `ds_products`/`ds_settings`.

As demais linhas Datta permanecem regidas por seus próprios gates e não são liberadas por esta reconciliação do Datta360°.
