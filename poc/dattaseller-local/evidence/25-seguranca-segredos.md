# Segurança de segredos — DS-MVP-38

Data: 2026-09-13.

Varredura executada no escopo versionado da POC (excluindo `vendor`, banco local e screenshots):

```powershell
rg -n -i "(api[_-]?key|secret|password|senha|token|bearer|cookie|authorization)\s*[:=]" poc/dattaseller-local
```

Resultado: nenhum valor atribuído encontrado.

Controles confirmados:

- `.env.example` contém somente placeholders vazios;
- `.gitignore` exclui `data/*.db`, WAL/SHM e `app/prospector-config.json`;
- configurações locais rejeitam campos cujo nome contenha `secret`, `key` ou `password`.
