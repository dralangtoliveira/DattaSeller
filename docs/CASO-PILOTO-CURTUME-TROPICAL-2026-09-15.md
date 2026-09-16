# Caso-piloto público — Curtume Tropical

## Escopo e proteção

Este é um registro de pesquisa pública controlada para validar a trilha do
Prospector no DattaSeller. Em 16/09/2026, o lead público foi importado em
Production com fontes públicas e sem dados de contato. Não houve contato,
envio de mensagem, coleta de área autenticada nem publicação de preview.

- Data da conferência: 15/09/2026.
- Fonte inicial indicada pelo operador: <https://www.instagram.com/curtume_tropical/>.
- Fonte institucional confirmada: <https://www.curtumetropical.com.br/>.
- Fonte local de contexto indicada pelo operador: <https://francasite.com/>.

O domínio institucional é a fonte de referência para qualquer comparador. O
Instagram é uma segunda evidência de presença social, não uma fonte para
inferir métricas, frequência ou resultados comerciais.

## Lead público importado

```json
{
  "slug": "curtume-tropical-franca",
  "nome": "Curtume Tropical",
  "nicho": "curtimento e preparação de couro",
  "cidade": "Franca",
  "region": "SP",
  "site_antigo": "https://www.curtumetropical.com.br/",
  "instagram_url": "https://www.instagram.com/curtume_tropical/",
  "source": "operator_supplied_public_sources",
  "source_url": "https://www.curtumetropical.com.br/",
  "source_checked_at": "2026-09-15T00:00:00.000Z",
  "public_contact_type": "site_and_social"
}
```

O registro é deliberadamente isento de telefone, e-mail, pessoas, CNPJ e outros
dados de contato. Ele foi importado como `curtume-tropical-franca`, sem
sobrescrever outro slug, domínio ou Instagram. A qualificação, diagnóstico e
auditoria social factuais receberam, respectivamente, os IDs
`qual_curtume_tropical_20260916`, `diag_curtume_tropical_20260916` e
`social_curtume_tropical_20260916`.

## Qualificação estruturada

### Fatos observados

- O site institucional identifica a empresa como **Curtume Tropical Ltda**.
- A navegação pública apresenta as áreas Produtos, Tendências, Meio Ambiente,
  Empresa, Notícias e Contato.
- O perfil público de Instagram foi indicado pelo operador como fonte associada.
- A pesquisa pública localiza a empresa em Franca/SP e a descreve no setor de
  curtimento e preparação de couro; essa informação serve apenas como contexto
  de segmento, não como alegação comercial do preview.

### Hipóteses a validar

- Uma página institucional com catálogo, proposta de valor segmentada e CTA de
  contato/solicitação pode tornar a próxima ação comercial mais clara.
- A integração entre conteúdo institucional e presença social pode reduzir a
  fragmentação da jornada de descoberta.

### Recomendação assistida

```json
{
  "facts": [
    "O domínio institucional apresenta Produtos, Tendências, Meio Ambiente, Empresa, Notícias e Contato.",
    "Existe uma fonte pública de Instagram indicada pelo operador.",
    "A empresa é identificada publicamente como Curtume Tropical Ltda."
  ],
  "hypotheses": [
    "Validar se uma jornada focada em catálogo e solicitação comercial é prioridade.",
    "Validar se o conteúdo do site e Instagram deve ter uma chamada comercial comum."
  ],
  "recommendation": "datta360",
  "reason": "Há presença institucional e social pública suficiente para uma proposta de experiência web orientada a catálogo, sujeita a validação humana.",
  "confidence": "medium",
  "validation_question": "A prioridade é ampliar solicitações comerciais para produtos de couro por meio do site?",
  "next_action": "revisar fontes, marca e objetivos com o operador antes de importar em ambiente não produtivo"
}
```

## Brief de redesign local (não publicado)

O preview real, quando houver ambiente não produtivo, deve ser uma composição
nova — não uma cópia do site atual — com: cabeçalho institucional, narrativa de
matéria-prima/processo/acabamento, cartões de linhas de produto, bloco ambiental
somente com texto aprovado, prova institucional verificável e CTA de solicitação
de contato. A direção visual deve usar tons de couro, superfícies táteis e
fotografia/ativos que tenham licença ou aprovação explícita; não reutilizar
imagens do site ou Instagram sem autorização.

Não afirmar sustentabilidade, capacidade de produção, certificações, preços,
prazos ou resultados que não estejam aprovados por fonte primária e pela
empresa. A versão permanece `PREVIEW / DEMO` e exige revisão humana antes de
qualquer publicação ou comunicação.

## Próximo teste controlado

1. No preview autenticado da PR, confirmar que os três artefatos aparecem para
   `curtume-tropical-franca`.
2. Criar o redesign visual com conteúdo e ativos aprovados; não usar imagens do
   site ou Instagram sem licença/autorização.
3. Criar preview, comparador e capa de proposta, validando o vínculo ao mesmo
   slug.
4. Revisar visualmente o preview e exportar evidência local, sem deploy nem
   envio de mensagem.
