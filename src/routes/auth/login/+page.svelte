<script lang="ts">
  import { supabase } from "$lib/supabaseClient";
  import { goto } from "$app/navigation";

  let email = "";
  let password = "";
  let errorMessage = "";
  let loading = false;

  const handleLogin = async () => {
    loading = true;
    errorMessage = "";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      errorMessage = "E-Mail oder Passwort ist falsch.";
      loading = false;
      return;
    }
    await goto("/reisetagebuch");
  };
</script>

<svelte:head>
  <title>Login</title>
</svelte:head>

<div class="page">
  <div class="hero-bg">
    <div class="bg-img"></div>
    <div class="bg-overlay"></div>
    <div class="glow glow-1"></div>
    <div class="glow glow-2"></div>
  </div>

  <main class="shell">
    <section class="intro">
      <p class="eyebrow">Reisetagebuch</p>
      <h1>Willkommen zurück</h1>
      <p class="lede">
        Halte deine Reisen fest, pflege deine Bucketlist und entdecke die Welt auf einen Blick.
      </p>
    </section>

    <section class="card">
      <h2>Login</h2>
      <label for="email">E-Mail</label>
      <input id="email" type="email" placeholder="name@mail.com" bind:value={email} />

      <label for="pw">Passwort</label>
      <input id="pw" type="password" placeholder="••••••••" bind:value={password} />

      {#if errorMessage}
        <div class="error">{errorMessage}</div>
      {/if}

      <button on:click={handleLogin} disabled={loading}>
        {loading ? "Wird geladen..." : "Einloggen"}
      </button>

      <p class="helper">
        Noch kein Konto?
        <a href="/auth/register">Jetzt registrieren</a>
      </p>
    </section>
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: "Inter", system-ui, sans-serif;
    background: #020617;
  }

  .page {
    min-height: 100vh;
    position: relative;
    overflow: hidden;
    color: #e5e7eb;
  }

  .hero-bg {
    position: fixed;
    inset: 0;
    z-index: -2;
  }

  .bg-img {
    position: absolute;
    inset: 0;
    background-image: url("/landing/Berg.jpg");
    background-size: cover;
    background-position: center;
    filter: brightness(0.6);
    transform: scale(1.05);
  }

  .bg-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(120deg, rgba(2, 6, 23, 0.6), rgba(2, 6, 23, 0.92));
  }

  .glow {
    position: absolute;
    filter: blur(150px);
    opacity: 0.6;
    z-index: 0;
  }

  .glow-1 {
    width: 360px;
    height: 360px;
    background: #22d3ee;
    top: 10%;
    left: -6%;
  }

  .glow-2 {
    width: 340px;
    height: 340px;
    background: #a855f7;
    bottom: -4%;
    right: -6%;
  }

  .shell {
    position: relative;
    z-index: 1;
    max-width: 1200px;
    margin: 0 auto;
    padding: 4rem 1.6rem 3rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 1.4rem;
    align-items: center;
  }

  .intro {
    max-width: 520px;
  }

  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
    color: #bae6fd;
    margin: 0 0 0.3rem;
  }

  h1 {
    margin: 0 0 0.6rem;
    font-size: clamp(2.6rem, 3vw + 1rem, 3.4rem);
    color: #f8fafc;
  }

  .lede {
    margin: 0;
    color: #cbd5e1;
    font-size: 1.05rem;
    line-height: 1.6;
  }

  .card {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px;
    padding: 1.8rem 1.6rem;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(10px);
  }

  .card h2 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #f8fafc;
    letter-spacing: -0.01em;
  }

  label {
    display: block;
    margin: 1rem 0 0.3rem;
    font-weight: 600;
    color: #e2e8f0;
  }

  input {
    width: 100%;
    padding: 0.85rem 0.9rem;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(255, 255, 255, 0.08);
    color: #f8fafc;
  }

  input::placeholder {
    color: #94a3b8;
  }

  .error {
    margin-top: 0.8rem;
    color: #fecdd3;
    background: rgba(248, 113, 113, 0.12);
    border: 1px solid rgba(248, 113, 113, 0.4);
    padding: 0.75rem 0.9rem;
    border-radius: 12px;
  }

  button {
    width: 100%;
    margin-top: 1.4rem;
    padding: 0.95rem 1rem;
    border-radius: 12px;
    border: none;
    font-weight: 800;
    color: #0b1120;
    background: linear-gradient(135deg, #22d3ee, #a855f7);
    cursor: pointer;
    box-shadow: 0 14px 30px rgba(168, 85, 247, 0.35);
    transition: transform 0.08s ease, box-shadow 0.12s ease, opacity 0.12s ease;
  }

  button:hover {
    transform: translateY(-1px);
    box-shadow: 0 16px 34px rgba(168, 85, 247, 0.45);
  }

  button:disabled {
    opacity: 0.65;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }

  .helper {
    text-align: center;
    margin-top: 1rem;
    color: #cbd5e1;
  }

  .helper a {
    color: #a5b4fc;
    font-weight: 700;
    text-decoration: none;
  }
  .helper a:hover {
    text-decoration: underline;
  }

  @media (max-width: 700px) {
    .shell {
      padding: 3rem 1.2rem 2.5rem;
    }
  }
</style>
