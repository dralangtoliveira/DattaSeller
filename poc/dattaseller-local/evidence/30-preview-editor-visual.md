# E2E visual — preview factual e editor

Data: 2026-09-13. Dashboard local, sem rede externa.

Fluxo executado para `http-demo-lead`:

1. abriu-se **Comparador** e a seção Preview local assistido;
2. gerou-se um preview factual local;
3. o preview persistido apareceu na lista com ações **editar** e **abrir**;
4. o editor visual exibiu título, corpo, CTA e contato público;
5. foram gravados `Preview DEMO revisado`, corpo factual revisado, CTA e
   contato público;
6. o `GET /api/previews/preview_ed2a9a8c0455` retornou o HTML atualizado com
   esses quatro valores e o aviso de revisão humana.

O fluxo não gerou publicação externa nem alegações de serviço não revisadas.
As tabelas `ds_previews` e `ds_timeline` receberam os eventos locais.
