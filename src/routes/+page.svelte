<script lang="ts">
  import { supabase } from "$lib/supabaseClient";
  import { goto } from "$app/navigation";
  import Slideshow from "$lib/components/Slideshow.svelte";

  let email = "";
  let password = "";
  let errorMessage = "";
  let loading = false;
  let socialLoading: "google" | "" = "";

  const redirectTo = import.meta.env?.DEV
    ? "http://localhost:5173/reisetagebuch"
    : "https://DEINE-PROD-DOMAIN.ch/reisetagebuch";

  const slideshowImages = [
    "/landing/Berg.jpg",
    "/landing/Staedtetrip.jpg",
    "/landing/Strand.jpg"
  ];

  const handleLogin = async () => {
    errorMessage = "";
    loading = true;

    if (!email || !password) {
      errorMessage = "Bitte alle Felder ausfuellen.";
      loading = false;
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error("Login-Fehler:", error);
      errorMessage = error.message || "E-Mail oder Passwort ist falsch.";
      loading = false;
      return;
    }

    // Profil nach erfolgreichem Login in Mongo ablegen (best effort)
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (user) {
        await fetch("/api/profile/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name ?? user.user_metadata?.name,
            first_name: user.user_metadata?.first_name,
            last_name: user.user_metadata?.last_name,
            metadata: user.user_metadata ?? {}
          })
        });
      }
    } catch (err) {
      console.warn("Profil Sync nach Login fehlgeschlagen:", err);
    }

    goto("/reisetagebuch");
  };

  const handleSocialLogin = async (provider: "google") => {
    errorMessage = "";
    if (typeof window === "undefined") return;

    socialLoading = provider;
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo }
      });

      if (error) {
        errorMessage = "Google-Login fehlgeschlagen. Bitte spaeter erneut versuchen.";
        socialLoading = "";
      }
      // Bei Erfolg uebernimmt Supabase die Weiterleitung.
    } catch (err) {
      console.error(`${provider} OAuth error:`, err);
      errorMessage = "Google-Login ist aktuell nicht verfuegbar.";
      socialLoading = "";
    }
  };
</script>

<div class="login-hero">
  <Slideshow images={slideshowImages} />
  <div class="login-overlay"></div>
  <div class="grain"></div>

  <div class="login-content">
    <div class="login-text">
      <p class="eyebrow">Reisetagebuch</p>
      <h1>Willkommen bei deinem Reisetagebuch</h1>
      <p class="lead">
        Halte deine schoensten Erinnerungen fest – privat, uebersichtlich und mit Karte. Teile nur,
        was du wirklich teilen moechtest.
      </p>
      <div class="feature-chips">
        <span class="chip">Sichere Speicherung</span>
        <span class="chip">Fotos & Karten</span>
        <span class="chip">Multi-Device</span>
      </div>
    </div>

    <div class="login-card">
      <div class="card-header">
        <h2>Einloggen</h2>
        <p>Mit E-Mail oder Google anmelden.</p>
      </div>

      <form on:submit|preventDefault={handleLogin}>
        <label for="email">E-Mail</label>
        <input
          id="email"
          type="email"
          placeholder="name@email.ch"
          bind:value={email}
          required
        />

        <label for="password">Passwort</label>
        <input
          id="password"
          type="password"
          placeholder="********"
          bind:value={password}
          required
        />

        {#if errorMessage}
          <div class="error">{errorMessage}</div>
        {/if}

        <button type="submit" class="primary" disabled={loading}>
          {loading ? "Melde an..." : "Login"}
        </button>
      </form>

      <div class="divider">
        <span>oder</span>
      </div>

      <div class="social-actions">
        <button
          class="social-btn"
          on:click={() => handleSocialLogin("google")}
          disabled={socialLoading === "google"}
        >
          <span class="icon google">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M24 9.5c3.35 0 6.36 1.15 8.73 3.39l6.52-6.52C35.9 2.6 30.47 0 24 0 14.62 0 6.51 5.36 2.56 13.13l7.59 5.9C12.11 12.21 17.49 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.5 24c0-1.52-.14-2.98-.39-4.4H24v8.32h12.65c-.55 2.97-2.22 5.49-4.74 7.19l7.19 5.6C43.87 36.29 46.5 30.6 46.5 24z"
              />
              <path
                fill="#FBBC05"
                d="M10.15 28.03c-.48-1.45-.75-2.99-.75-4.58s.27-3.13.75-4.58l-7.59-5.9C.93 15.3 0 19.53 0 23.45c0 3.92.93 8.15 2.56 11.48l7.59-5.9z"
              />
              <path
                fill="#34A853"
                d="M24 47c6.47 0 11.9-2.13 15.87-5.83l-7.19-5.6c-2 1.35-4.57 2.15-8.68 2.15-6.51 0-11.89-3.71-13.85-9.01l-7.59 5.9C6.51 42.64 14.62 47 24 47z"
              />
            </svg>
          </span>
          {socialLoading === "google" ? "Weiter zu Google..." : "Mit Google anmelden"}
        </button>
      </div>

      <p class="register-text">
        Noch kein Konto?
        <a href="/register">Jetzt registrieren</a>
      </p>
    </div>
  </div>
</div>

<style>
  :global(body) {
    background: #0b0f1a;
    color: #0f172a;
  }

  .login-hero {
    position: relative;
    width: 100%;
    min-height: 100vh;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3.5rem 6rem;
    box-sizing: border-box;
  }

  .login-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(120deg, rgba(4, 6, 15, 0.75) 0%, rgba(6, 9, 20, 0.6) 45%, rgba(8, 10, 18, 0.55) 100%),
      radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.08), transparent 32%),
      radial-gradient(circle at 78% 12%, rgba(255, 255, 255, 0.07), transparent 32%);
    z-index: 1;
    backdrop-filter: blur(1.5px);
  }

  .grain {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 0);
    background-size: 3px 3px;
    opacity: 0.22;
    z-index: 2;
    pointer-events: none;
  }

  .login-content {
    position: relative;
    z-index: 3;
    display: grid;
    grid-template-columns: 1.05fr 0.95fr;
    gap: 3.5rem;
    align-items: center;
    width: 100%;
    max-width: 1200px;
  }

  .login-text {
    max-width: 540px;
    color: white;
    text-shadow: 0 4px 24px rgba(0, 0, 0, 0.6);
  }

  .eyebrow {
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-size: 0.85rem;
    font-weight: 700;
    opacity: 0.85;
    margin-bottom: 0.6rem;
  }

  .login-text h1 {
    font-size: clamp(2.8rem, 4.3vw, 3.8rem);
    margin-bottom: 1.1rem;
    line-height: 1.08;
  }

  .lead {
    font-size: 1.05rem;
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 1.2rem;
  }

  .feature-chips {
    display: flex;
    gap: 0.8rem;
    flex-wrap: wrap;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    border-radius: 999px;
    padding: 0.45rem 0.9rem;
    font-size: 0.9rem;
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.16);
  }

  .login-card {
    width: 100%;
    padding: 2.8rem 2.6rem;
    border-radius: 24px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%);
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.32);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.8);
  }

  .card-header h2 {
    text-align: left;
    margin: 0;
    font-size: 1.6rem;
    color: #0f172a;
  }

  .card-header p {
    margin-top: 0.35rem;
    color: #475569;
  }

  .divider {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    margin: 1.2rem 0 1.4rem;
    color: #94a3b8;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.82rem;
  }

  .social-actions {
    display: grid;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .social-btn {
    width: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    color: #0f172a;
    padding: 0.85rem 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  }

  .social-btn:hover:enabled {
    transform: translateY(-1px);
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.15);
    border-color: #d8e0eb;
  }

  .social-btn:disabled {
    opacity: 0.7;
    cursor: default;
  }

  .icon {
    display: inline-flex;
  }

  .divider::before,
  .divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: #e2e8f0;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  label {
    font-weight: 700;
    color: #0f172a;
    font-size: 0.94rem;
    letter-spacing: 0.01em;
  }

  input {
    border-radius: 12px;
    border: 1px solid #d6deea;
    padding: 0.95rem 1rem;
    background: #f9fbff;
    font-size: 1rem;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  }

  input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
    background: #ffffff;
  }

  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus {
    box-shadow: 0 0 0px 1000px #ffffff inset;
    -webkit-text-fill-color: #0f172a;
    border-color: #d6deea;
  }

  .error {
    color: #dc2626;
    font-weight: 700;
    margin-top: 0.1rem;
    font-size: 0.95rem;
  }

  .primary {
    margin-top: 0.3rem;
    border-radius: 12px;
    border: none;
    padding: 0.98rem;
    font-weight: 800;
    cursor: pointer;
    background: linear-gradient(135deg, #0f172a 0%, #0b122a 50%, #0b122a 100%);
    color: white;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .primary:hover:enabled {
    transform: translateY(-1px);
    box-shadow: 0 14px 34px rgba(15, 23, 42, 0.26);
  }

  .primary:disabled {
    opacity: 0.72;
    cursor: default;
  }

  .register-text {
    margin-top: 1.6rem;
    text-align: center;
    font-size: 1rem;
    color: #4b5563;
  }

  .register-text a {
    font-weight: 800;
    color: #0f172a;
  }

  @media (max-width: 1100px) {
    .login-content {
      grid-template-columns: 1fr;
      gap: 2rem;
    }

    .login-text {
      text-align: center;
      margin: 0 auto;
    }

    .feature-chips {
      justify-content: center;
    }

    .login-card {
      max-width: 560px;
      margin: 0 auto;
    }
  }

  @media (max-width: 720px) {
    .login-hero {
      padding: 1.6rem;
    }

    .login-card {
      padding: 2.1rem 1.6rem;
    }

    .login-text h1 {
      font-size: clamp(2.1rem, 7vw, 2.6rem);
    }

  }
</style>
