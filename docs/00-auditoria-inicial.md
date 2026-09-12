# Auditoria inicial — DattaSeller

**Data:** 2026-09-11  
**Escopo:** estado local do repositório e superfícies de integração disponíveis em DattaVPS e DattaSeg.

## DattaSeller

O repositório local foi criado sem commits e sem arquivos além de `.git`. Portanto, não há código, stack, frontend, backend, banco, autenticação, migrations, CI, testes, checkout, webhooks, armazenamento de leads ou instalação do DeskcommCRM para validar neste momento.

## DattaVPS

O projeto local contém um serviço Node.js chamado `datta-provisioner`, com `GET /health`, `GET /metrics` e `POST /v1/abuse-reports`. Há módulos internos e testes para estados de serviço, idempotência, fila/retry e recebimento de webhook Paymenter.

Não existe endpoint exposto para o DattaSeller criar pedido, consultar disponibilidade de plano ou receber callback de pedido. O webhook Paymenter é uma interface interna do DattaVPS, não um contrato Seller → DattaVPS.

O board DattaVPS confirma que o provisionamento real depende das POCs DVPS-003/DVPS-067, do Paymenter (DVPS-005), do adapter OVHcloud (DVPS-014), do fluxo ponta a ponta (DVPS-016), do catálogo/preços (DVPS-034) e do checkout (DVPS-035). Essas entregas estão em backlog ou bloqueadas por conta e credenciais OVHcloud.

## DattaSeg

Não há repositório local DattaSeg no workspace. O board DattaSeg mostra todos os cards em backlog, incluindo checkout/billing direto (DS-024) e onboarding direto (DS-026). Não há API, webhook, planos ou estados de onboarding verificáveis disponíveis para integração.

## Decisão de fronteira

O DattaSeller pode preparar seu contrato e seu modelo comercial, mas não pode declarar oferta, checkout ou integração produtiva de DattaVPS/DattaSeg até que os produtos publiquem as respectivas interfaces e condições comerciais verificáveis.
