# Decisão Canônica — Marca visual Datta360° e DattaSeller como plataforma interna

**Data:** 2026-09-21  
**Status:** APROVADO  
**Escopo:** DattaSeller + primeiro tenant/operação Datta360°

## 1. Arquitetura de marca

O **DattaSeller** é o nome interno do projeto/plataforma.

O **Datta360°** é o primeiro cliente/tenant/operação comercial da plataforma.

A plataforma deve ser preparada para que futuramente outro vendedor/operação possa usar o mesmo DattaSeller com outra marca.

## 2. Regra visual obrigatória

Na experiência do tenant Datta360°, o usuário/cliente NÃO deve ver a marca **DattaSeller**.

Tudo que for visível ao cliente ou ao operador do tenant deve aparecer como **Datta360°**, incluindo:

- site público;
- proposta pública;
- e-mails;
- assunto/assinatura quando configurados para a operação;
- CRM/painel visual;
- login;
- título da aba do navegador;
- metadata/title/description;
- cabeçalhos;
- rodapés;
- links e páginas públicas;
- PDF/DOCX e demais documentos visíveis;
- mensagens operacionais apresentadas ao cliente;
- remetente/nome amigável quando aplicável.

O nome DattaSeller pode continuar livremente em:

- repositório;
- código;
- nomes internos;
- tabelas;
- rotas internas;
- logs técnicos;
- nomes de serviços;
- documentação de engenharia;
- agentes/worker internos;
- variáveis de ambiente;
- infraestrutura.

## 3. Regra multi-tenant

Não substituir globalmente strings internas de forma destrutiva.

Implementar uma camada de identidade/tenant/brand, por exemplo:

- tenant_id / operation_id;
- brand_name;
- brand_short_name;
- public_domain;
- sender_name;
- support_email;
- logo/branding;
- locale/currency.

Para o tenant atual:

- brand_name: **Datta360°**
- project/internal platform: **DattaSeller**

No futuro, outro vendedor pode usar a mesma plataforma com outro brand_name sem fork estrutural.

## 4. Moeda visual/comercial do Datta360°

Toda apresentação comercial do tenant Datta360° usa **BRL (R$)**.

Não exibir USD em:

- site Datta360°;
- propostas;
- e-mails;
- cards comerciais;
- checkout apresentado ao cliente;
- documentos comerciais.

Outros produtos internos do DattaSeller só podem usar outra moeda se pertencerem a outro tenant/oferta explicitamente aprovada e não forem exibidos como Datta360°.

## 5. Catálogo Datta360° aprovado

### Serviços pontuais — R$ 770,00 cada

- Diagnóstico Digital
- Site Profissional
- Instagram
- TikTok
- Google Business Profile
- Facebook Business
- Integrações

### Serviço recorrente

**CRM + WhatsApp + Automação — R$ 770,00/mês**

Ênfase comercial:

**CRM / Conteúdo**
- produção automática de conteúdo-base;
- organização do calendário;
- agendamento automático de postagens;
- organização de contatos e oportunidades.

**WhatsApp / Atendimento**
- WhatsApp conectado aos canais da presença digital;
- centralização dos contatos;
- atendimento automático inicial;
- direcionamento e continuidade da jornada comercial.

### Pacote completo

**R$ 3.770,00**

Parcelamento comercial aprovado:

**até 12x de R$ 377,00**

Não inventar outra promoção, desconto ou parcelamento.

## 6. Prazo e pagamento

Prazo padrão:

**7 dias**

Condição padrão:

- 50% de sinal;
- 50% restante na entrega.

Outras negociações podem ser discutidas caso a caso, sempre com revisão humana e registro na proposta específica.

## 7. Reflexo obrigatório

Esta decisão deve refletir de forma coerente em:

1. `catalog/products.json`;
2. site público Datta360°;
3. CRM visual;
4. proposta pública;
5. gerador de e-mail;
6. documentos comerciais;
7. metadata/título da aba;
8. configuração de remetente;
9. testes de regressão de branding e moeda.

Nenhum componente visual do tenant Datta360° pode voltar a exibir DattaSeller ou USD por hardcode acidental.
