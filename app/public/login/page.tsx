"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Validación local antes de hacer el fetch
  const validate = (): string | null => {
    if (!email.trim())    return "El email es requerido";
    if (!password.trim()) return "La contraseña es requerida";
    if (!/\S+@\S+\.\S+/.test(email)) return "El email no tiene un formato válido";
    return null;
  };

  const handleLogin = async () => {
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ✅ tenantId eliminado — el server lo resuelve desde el header/dominio
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
        return;
      }

      // ✅ Cookie httpOnly seteada desde el server es lo ideal.
      // Como fallback mientras se implementa: sessionStorage en vez de localStorage
      // para no persistir el token entre sesiones del browser.
      // TODO: mover a cookie httpOnly desde el API route.
      sessionStorage.setItem("token", data.token);

      router.push("/protected/dashboard");

    } catch {
      setError("No se pudo conectar. Revisá tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  // Submit con Enter desde cualquier campo
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  // Limpiar error cuando el usuario empieza a escribir
  const handleChange = (
    setter: (v: string) => void
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    if (error) setError(null);
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen px-4"
      style={{ background: "var(--color-bg)" }}
    >
      <div
        className="w-full max-w-sm p-8 rounded-xl"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* Logo / título */}
        <div className="flex flex-col items-center gap-2 mb-7">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{
              width: 44,
              height: 44,
              background: "var(--color-primary)",
            }}
          >
            {/* Reemplazá esto con tu componente <AlnextLogo /> */}
           <Image
              src="/image/logo/logo1.jpeg"
              alt="ALNEXT"
              width={40}
              height={60}
              style={{
                borderRadius: "8px",
                objectFit: "cover",
              }}
            />
          </div>
          <h1
            style={{
              fontSize: "var(--text-lg)",
              fontWeight: 500,
              color: "var(--color-text-primary)",
              letterSpacing: "0.12em",
            }}
          >
            ALNEXT
          </h1>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
            Ingresá a tu cuenta
          </p>
        </div>

        {/* Error global */}
        {error && (
          <div
            className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg"
            style={{
              background: "var(--color-error-bg)",
              border: "1px solid var(--color-error)",
              fontSize: "var(--text-xs)",
              color: "var(--color-error)",
            }}
            role="alert"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M7 4v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            {error}
          </div>
        )}

        {/* Campos */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="email"
              style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--color-text-primary)" }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="usuario@empresa.com"
              value={email}
              onChange={handleChange(setEmail)}
              onKeyDown={handleKeyDown}
              autoComplete="email"
              autoFocus
              style={{
                background: "var(--color-surface)",
                border: `1px solid ${error ? "var(--color-error)" : "var(--color-border)"}`,
                borderRadius: "var(--radius-md)",
                padding: "8px 12px",
                fontSize: "var(--text-sm)",
                color: "var(--color-text-primary)",
                outline: "none",
                width: "100%",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
              onFocus={e => {
                e.target.style.borderColor = "var(--color-accent)";
                e.target.style.boxShadow   = "0 0 0 3px rgba(30,155,184,0.12)";
              }}
              onBlur={e => {
                e.target.style.borderColor = error ? "var(--color-error)" : "var(--color-border)";
                e.target.style.boxShadow   = "none";
              }}
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="password"
              style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--color-text-primary)" }}
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={handleChange(setPassword)}
              onKeyDown={handleKeyDown}
              autoComplete="current-password"
              style={{
                background: "var(--color-surface)",
                border: `1px solid ${error ? "var(--color-error)" : "var(--color-border)"}`,
                borderRadius: "var(--radius-md)",
                padding: "8px 12px",
                fontSize: "var(--text-sm)",
                color: "var(--color-text-primary)",
                outline: "none",
                width: "100%",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
              onFocus={e => {
                e.target.style.borderColor = "var(--color-accent)";
                e.target.style.boxShadow   = "0 0 0 3px rgba(30,155,184,0.12)";
              }}
              onBlur={e => {
                e.target.style.borderColor = error ? "var(--color-error)" : "var(--color-border)";
                e.target.style.boxShadow   = "none";
              }}
              aria-invalid={!!error}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              marginTop: 4,
              padding: "10px",
              borderRadius: "var(--radius-lg)",
              border: "none",
              background: loading ? "var(--color-primary-hover)" : "var(--color-primary)",
              color: "white",
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "background 0.15s, opacity 0.15s",
              width: "100%",
            }}
            aria-busy={loading}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </div>

        {/* Link olvidé contraseña */}
        <div className="text-center mt-5">
          <a
            href="/auth/forgot-password"
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--color-accent)",
              textDecoration: "none",
            }}
          >
            ¿Olvidaste tu contraseña?
          </a>
        </div>
      </div>
    </div>
  );
}
