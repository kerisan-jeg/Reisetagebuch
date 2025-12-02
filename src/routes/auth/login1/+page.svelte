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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      errorMessage = "E-Mail oder Passwort ist falsch.";
      loading = false;
      return;
    }

    goto("/reisetagebuch");
  };
</script>

<div class="login-wrap">
  <div class="login-box">
    <h1>Login</h1>

    <label>E-Mail</label>
    <input type="email" bind:value={email} required />

    <label>Passwort</label>
    <input type="password" bind:value={password} required />

    {#if errorMessage}
      <div class="error">{errorMessage}</div>
    {/if}

    <button on:click={handleLogin} disabled={loading}>
      {loading ? "Wird geladen..." : "Login"}
    </button>

    <p class="register-text">
      Kein Konto? <a href="/register">Jetzt registrieren</a>
    </p>
  </div>
</div>

<style>
  /* Vollbild-Hintergrund */
  .login-wrap {
    width: 100%;
    height: 100vh;
    background-image: url("/img/dein-bild.jpg");
    background-size: cover;
    background-position: center;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  /* Box */
  .login-box {
    backdrop-filter: blur(25px);
    background: rgba(255, 255, 255, 0.25);
    border-radius: 22px;
    padding: 2.5rem;
    width: 420px;
    color: #111;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
  }

  h1 {
    text-align: center;
    margin-bottom: 1.5rem;
    font-size: 2rem;
    font-weight: 700;
  }

  label {
    font-weight: 500;
    margin-top: 1rem;
    display: block;
  }

  input {
    width: 100%;
    background: rgba(255,255,255,0.8);
    border: none;
    padding: 0.8rem;
    margin-top: 0.3rem;
    border-radius: 12px;
  }

  .error {
    margin-top: 1rem;
    color: #dc2626;
    font-weight: 600;
  }

  button {
    width: 100%;
    margin-top: 1.5rem;
    padding: 0.8rem;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 700;
    background: #1f2937;
    color: white;
    transition: background 0.2s;
  }

  button:hover {
    background: black;
  }

  .register-text {
    text-align: center;
    margin-top: 1rem;
  }

  .register-text a {
    font-weight: 600;
  }
</style>
