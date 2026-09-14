type SupabaseAuthClient = {
  auth: {
    signOut: () => Promise<{ error: unknown | null }>;
  };
};

export type LogoutResult =
  | { ok: true }
  | { ok: false; error: "logout_failed" };

export async function signOutSafely(client: SupabaseAuthClient): Promise<LogoutResult> {
  try {
    const { error } = await client.auth.signOut();
    return error ? { ok: false, error: "logout_failed" } : { ok: true };
  } catch {
    return { ok: false, error: "logout_failed" };
  }
}
