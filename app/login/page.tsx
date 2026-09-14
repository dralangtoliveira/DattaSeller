import { login } from "./actions";

const inputStyle = { boxSizing: "border-box" as const, width: "100%", marginTop: 6, padding: 12, borderRadius: 9, border: "1px solid #304866", background: "#081424", color: "white" };

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#07111f", color: "#e8eef7", fontFamily: "system-ui", padding: 24 }}>
    <form action={login} style={{ width: "min(100%, 390px)", background: "#0d1b2e", border: "1px solid #20334c", borderRadius: 18, padding: 28, display: "grid", gap: 14 }}>
      <small style={{ color: "#50a7ff", fontWeight: 800, letterSpacing: 1 }}>DATTASELLER</small>
      <h1 style={{ margin: 0, fontSize: 28 }}>Acesso administrativo</h1>
      <p style={{ margin: 0, color: "#9fb0c6" }}>Entre com o usuário criado no Supabase Auth.</p>
      {error && <p role="alert" style={{ color: "#ff9d9d", margin: 0 }}>{error}</p>}
      <label>E-mail<input name="email" type="email" required autoComplete="email" style={inputStyle}/></label>
      <label>Senha<input name="password" type="password" required autoComplete="current-password" style={inputStyle}/></label>
      <button type="submit" style={{ border: 0, borderRadius: 10, padding: 13, fontWeight: 800, background: "#1688ff", color: "white", cursor: "pointer" }}>Entrar</button>
    </form>
  </main>;
}
