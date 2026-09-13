# Preview local assistido — DS-MVP-11 a DS-MVP-15

Data: 2026-09-13.

Implementado `POST /api/previews`: gera e persiste um preview HTML local com estado `published_mock`, servido por `GET /api/previews/:id`. O preview é baseado somente no nome e no canal de contato já existentes no CRM e proíbe explicitamente invenção de serviços, provas sociais e métricas.

Teste: `test_local_preview_is_factual_and_persisted` aprovado dentro de `python app/test_dattaseller_local.py -v` (7/7).

O comparador e editor originais do Prospector permanecem preservados nas skills e são acessíveis pelo dashboard quando há material real. A criação de conteúdo visual real exige dados públicos ou autorização humana; não houve dados reais nem publicação externa nesta evidência.
