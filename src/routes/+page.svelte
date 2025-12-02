<script lang="ts">
  import { supabase } from "$lib/supabaseClient";
  import { goto } from "$app/navigation";
  import Slideshow from "$lib/components/Slideshow.svelte";

  let email = "";
  let password = "";
  let errorMessage = "";
  let loading = false;

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
      errorMessage = "E-Mail oder Passwort ist falsch.";
      loading = false;
      return;
    }

    // nach dem Login zur Startseite mit Slideshow
    goto("/reisetagebuch");
  };
</script>

<div class="login-hero">
  <Slideshow images={slideshowImages} />
  <div class="login-overlay"></div>

  <div class="login-content">
    <div class="login-text">
      <h1>Willkommen bei deinem Reisetagebuch</h1>
      <p>Halte deine schoensten Erinnerungen fest – privat, uebersichtlich und mit Karte.</p>
    </div>

    <div class="login-card">
      <h2>Login</h2>

      <form on:submit|preventDefault={handleLogin}>
        <label for="email">E-Mail</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          required
        />

        <label for="password">Passwort</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          required
        />

        {#if errorMessage}
          <div class="error">{errorMessage}</div>
        {/if}

        <button type="submit" disabled={loading}>
          {loading ? "Wird geladen..." : "Login"}
        </button>
      </form>

      <p class="register-text">
        Noch kein Konto?
        <a href="/register">Jetzt registrieren</a>
      </p>
    </div>
  </div>
</div>

<style>
  .login-hero {
    position: relative;
    width: 100%;
    min-height: 100vh;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3rem 6rem;
    box-sizing: border-box;
  }

  .login-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.55) 0%,
      rgba(0, 0, 0, 0.35) 45%,
      rgba(0, 0, 0, 0.2) 70%,
      rgba(0, 0, 0, 0.35) 100%
    );
    z-index: 1;
  }

  .login-content {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 4rem;
    align-items: center;
    width: 100%;
    max-width: 1200px;
  }

  .login-text {
    max-width: 520px;
    color: white;
    text-shadow: 0 3px 15px rgba(0, 0, 0, 0.8);
  }

  .login-text h1 {
    font-size: clamp(2.6rem, 4vw, 3.4rem);
    margin-bottom: 1rem;
  }

  .login-text p {
    font-size: 1.2rem;
    max-width: 500px;
  }

  .login-card {
    width: 100%;
    padding: 2.5rem;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.93);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(6px);
  }

  .login-card h2 {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  label {
    font-weight: 500;
  }

  input {
    border-radius: 999px;
    border: 1px solid #e5e7eb;
    padding: 0.75rem 1rem;
    background: #fefce8;
  }

  .error {
    color: #dc2626;
    font-weight: 600;
    margin-top: 0.2rem;
  }

  button {
    margin-top: 1rem;
    border-radius: 999px;
    border: none;
    padding: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    background: #020617;
    color: white;
  }

  button:disabled {
    opacity: 0.7;
    cursor: default;
  }

  .register-text {
    margin-top: 1rem;
    text-align: center;
    font-size: 0.95rem;
  }

  .register-text a {
    font-weight: 600;
  }

  @media (max-width: 960px) {
    .login-hero {
      padding: 2rem;
    }

    .login-content {
      grid-template-columns: 1fr;
      gap: 2rem;
    }

    .login-text {
      text-align: center;
      margin: 0 auto;
    }

    .login-card {
      max-width: 520px;
      margin: 0 auto;
    }
  }
</style>
