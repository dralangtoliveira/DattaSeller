# Prospecção e deduplicação — DS-MVP-08 e DS-MVP-09

Data: 2026-09-13.

O autoteste do MCP foi ampliado e executado com sucesso:

```powershell
python app/prospector-mcp.py --teste
```

Validações cobertas: lead com telefone (sem requisito de e-mail), telefone normalizado, domínio normalizado, e-mail normalizado, perfil Instagram e nome normalizado + cidade. Em cada colisão, o registro existente é atualizado, sem criar duplicata. A entrada do CRM preserva `source_url`, `source_checked_at`, `public_contact_type`, site, Instagram e justificativa de produto.

Resultado: `AUTOTESTE OK`, sem chamadas externas e sem dados pessoais reais.
