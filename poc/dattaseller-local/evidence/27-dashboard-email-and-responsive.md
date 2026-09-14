# Verificação visual local — central de e-mail e responsividade

Data: 2026-09-13. Ambiente: `http://127.0.0.1:8765`, sem conexão externa.

## Central comercial

Fluxo visual executado no dashboard:

1. foi criada a proposta DEMO `prop_685ec4c52b86` para `ui-evidence-demo`;
2. o dashboard exibiu produto, preço-base, preço negociado e margem;
3. foi criado o rascunho `email_79a6d4a49baa`;
4. o botão **editar** abriu o formulário com assunto, preview/corpo e ações de
   revisão, aprovação e envio simulado;
5. foi gravado `Evidência revisada` / `Corpo revisado no dashboard local.`;
6. `GET /api/emails` depois da ação retornou exatamente os valores editados.

O primeiro ensaio com R$ 100,00 recebeu `Preço inválido ou desconto acima do
máximo`; o ensaio válido com R$ 1.500,00 foi persistido. Isso confirma a regra
de negociação visual e a persistência do editor. Os registros são DEMO e podem
ser removidos por Reset DEMO.

## Breakpoints

Auditoria automatizada com o viewport do navegador local. Em cada largura, a
página foi recarregada e foram verificados largura de documento, overflow,
botões de navegação ocultos e superfície de erro.

| Largura | `documentWidth` | Overflow horizontal | Navegação crítica oculta | Erro visível |
|---:|---:|---|---|---|
| 360 | 345 | não | não | não |
| 375 | 360 | não | não | não |
| 768 | 753 | não | não | não |
| 1024 | 1024 | não | não | não |
| 1280 | 1280 | não | não | não |
| 1440 | 1440 | não | não | não |

O viewport foi restaurado ao tamanho padrão ao fim do teste. Esta é evidência
de base para DS-MVP-46; a inspeção de todas as telas e modais continua pendente
antes de classificá-lo como pronto.
