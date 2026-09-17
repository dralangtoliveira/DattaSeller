# OPS-360-CHANNELS-001 — Classificação dos canais do Datta360°

Data: 2026-09-17. Escopo registrado do Datta360°: Site, Instagram, Google
Business, WhatsApp, CRM, automações e TikTok.

Classificação: **(1)** funcionalidade real e demonstrável já disponível;
**(2)** integração externa ainda pendente/evolução. Nenhum canal sai do
roadmap, e nada é anunciado como integração externa ativa sem homologação.

| Canal | Classe | O que existe comprovado | O que falta | Evidência |
| --- | --- | --- | --- | --- |
| Site | **1** | prospecção com `source_url` público e deduplicação por domínio; diagnóstico factual de site por critério (`POST /api/diagnoses`); redesign em preview persistido; editor visual; comparador antes/depois | nenhuma integração externa necessária no MVP | `app/api/[...path]/route.ts` (`prospects`, `diagnoses`, `previews`, `comparators`), `lib/prospector-*.js` |
| Instagram | **1** (registro e direção) | auditoria social com `platform`, `url`, `username`, `bio`, `cta`, `link`, `visual_identity`, `consistency_note`, `frequency_note`, `factual_notes`, `recommendation`, `creative_direction`; perfil no lead (`instagram_url`, `instagram_normalized`) e na deduplicação | nenhuma integração com a API da Meta; coleta é assistida por operador | `POST /api/social-audits`, `lib/hardening/guards.ts` (`SOCIAL_AUDIT_INPUT_KEYS`), `lib/prospector.js` |
| Google Business | **2** | o escopo registrado usa "Google Maps e perfil público da empresa" como **fonte** de prospecção; a busca assistida aceita `region`, `search_radius_km`, `target_quantity`, `search_limit` | integração com a API do Google Business e coleta automática de perfil/avaliações | `docs/04-mvp-local-prospector-dattaseller-24h.md`, `POST /api/prospects` |
| WhatsApp | **1** (link e registro) | contato público registrado como tipo (`public_contact_type` inclui `whatsapp`), telefone normalizado para deduplicação e CTA de WhatsApp gerado na capa da proposta (`https://wa.me/<numero>`) | nenhum envio automático nem API oficial do WhatsApp | `lib/prospector-proposal-cover.js`, `lib/prospector.js`, `docs/04-...md` |
| CRM | **1** | o próprio DattaSeller: dashboard autenticado, API protegida por perfil admin, persistência Supabase, timeline, financeiro e comissão | — | `public/dashboard.html`, `app/api/...`, `proxy.ts`, `supabase/migrations/*` |
| automações | **2** | o escopo registrado proíbe reescrever "dashboard e automações" existentes; no MVP cada passo é assistido por operador e registrado no CRM | orquestrador real de automações no DattaSeller (o n8n pertence ao escopo do DattaVPS, não deste repositório) | `docs/04-mvp-local-prospector-dattaseller-24h.md` |
| TikTok | **1** (captura) + **2** (publicação) | `tiktok_url` é coluna do lead e campo permitido na entrada, com schema aplicado e validado; a auditoria social aceita qualquer `platform` | OAuth e publicação automática — **não precisam ser inventados no MVP** | `lib/hardening/guards.ts` (`LEAD_INPUT_KEYS`), `docs/MIGRATION-PROSPECTOR-PRODUCTION-RUNBOOK.md` |

## Regras aplicadas

- Nenhum canal foi removido do roadmap.
- Nenhuma regra de preço foi tocada neste card.
- Nenhuma integração externa foi marcada como ativa: Google Business,
  automações e a publicação no TikTok seguem como **evolução pendente**, com
  homologação obrigatória antes de qualquer anúncio.

## Pendência de decisão (não inventada aqui)

O que exatamente compõe "automações" no escopo do Datta360° não está definido em
nenhum documento acessível desta linha. Enquanto isso, o canal fica registrado
como evolução, sem escopo inventado.
