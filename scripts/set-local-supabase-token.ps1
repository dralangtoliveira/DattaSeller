# Atualiza exclusivamente SUPABASE_ACCESS_TOKEN no .env.local local.
# A chave é lida como SecureString, nunca é impressa e não é escrita em logs.
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$configPath = Join-Path $PSScriptRoot '..\.env.local'
if (-not (Test-Path -LiteralPath $configPath)) {
  throw '.env.local não encontrado no diretório do DattaSeller.'
}

$secureToken = Read-Host -Prompt 'Cole o novo SUPABASE_ACCESS_TOKEN Full Access (entrada oculta)' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
try {
  $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  if ([string]::IsNullOrWhiteSpace($token) -or $token.Contains("`r") -or $token.Contains("`n")) {
    throw 'Token vazio ou com quebra de linha; nenhuma alteração foi feita.'
  }

  $content = [IO.File]::ReadAllText($configPath)
  if ($content -notmatch '(?m)^SUPABASE_ACCESS_TOKEN=.*$') {
    throw 'SUPABASE_ACCESS_TOKEN não encontrado; nenhuma alteração foi feita.'
  }
  $updated = [regex]::Replace($content, '(?m)^SUPABASE_ACCESS_TOKEN=.*$', "SUPABASE_ACCESS_TOKEN=$token", 1)
  [IO.File]::WriteAllText($configPath, $updated, [Text.UTF8Encoding]::new($false))
  Write-Host 'Token salvo com segurança. Somente SUPABASE_ACCESS_TOKEN foi alterado.'
} finally {
  if ($bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  Remove-Variable token -ErrorAction SilentlyContinue
}
