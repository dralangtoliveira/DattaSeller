export function resendConfigurationError(provider: unknown, hasApiKey: boolean): "provider_not_configured" | null {
  return provider === "resend" && !hasApiKey ? "provider_not_configured" : null;
}
