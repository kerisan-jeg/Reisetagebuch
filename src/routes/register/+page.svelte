<script lang="ts">
  import { supabase } from "$lib/supabaseClient";

  let firstName = "";
  let lastName = "";
  let birthday = "";
  let email = "";
  let password = "";

  let loading = false;
  let message = "";
  let errorMessage = "";

  async function registerUser() {
    message = "";
    errorMessage = "";

    if (!email.includes("@") || !email.includes(".")) {
      errorMessage = "Bitte gib eine gültige E-Mail-Adresse ein.";
      return;
    }

    if (password.length < 6) {
      errorMessage = "Das Passwort muss mindestens 6 Zeichen lang sein.";
      return;
    }

    loading = true;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          birthday
        },
        // Wohin der Benutzer kommt, nachdem er seine E-Mail bestätigt hat
        emailRedirectTo: "http://localhost:5173/login"
      }
    });

    loading = false;

    if (error) {
      errorMessage = error.message;
      return;
    }

    message =
      "Registrierung erfolgreich! Bitte bestätige deine E-Mail-Adresse. Überprüfe dein Postfach (und Spam-Ordner).";
  }
</script>

<div class="register-page">
  <div class="register-card">
    <h1>Registrieren</h1>

    {#if errorMessage}
      <p class="msg error">{errorMessage}</p>
    {/if}

    {#if message}
      <p class="msg success">{message}</p>
    {/if}

    <form class="form" on:submit|preventDefault={registerUser}>
      <label>
        <span>Vorname</span>
        <input type="text" bind:value={firstName} placeholder="Vorname" />
      </label>

      <label>
        <span>Nachname</span>
        <input type="text" bind:value={lastName} placeholder="Nachname" />
      </label>

      <label>
        <span>Geburtsdatum</span>
        <input type="date" bind:value={birthday} />
      </label>

      <label>
        <span>E-Mail</span>
        <input
          type="email"
          bind:value={email}
          class="highlight"
          placeholder="deine@mail.ch"
        />
      </label>

      <label>
        <span>Passwort</span>
        <input
          type="password"
          bind:value={password}
          class="highlight"
          placeholder="••••••••"
        />
      </label>

      <button type="submit" disabled={loading}>
        {loading ? "Registriere..." : "Registrieren"}
      </button>
    </form>

    <p class="bottom-link">
      Schon ein Konto?
      <a href="/login">Jetzt einloggen</a>
    </p>
  </div>
</div>

<style>
  .register-page {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    background: #ffffff;
    color: #000;
    padding: 40px 16px;
  }

  .register-card {
    width: 100%;
    max-width: 520px;
    margin-top: 40px;
  }

  .register-card h1 {
    font-size: 2.5rem;
    margin-bottom: 24px;
    font-weight: 700;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  label {
    display: flex;
    flex-direction: column;
    font-size: 0.95rem;
  }

  label span {
    margin-bottom: 4px;
  }

  input {
    padding: 8px 10px;
    border: 1px solid #ccc;
    border-radius: 3px;
    font-size: 0.95rem;
  }

  input.highlight {
    background-color: #fff8c6; /* leicht gelb */
  }

  button {
    margin-top: 16px;
    width: 100%;
    padding: 10px 0;
    border: none;
    border-radius: 4px;
    background: #020617;
    color: #fff;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.7;
    cursor: default;
  }

  .bottom-link {
    margin-top: 20px;
    font-size: 0.95rem;
  }

  .bottom-link a {
    color: #4b0082;
    text-decoration: underline;
  }

  .msg {
    margin-bottom: 12px;
    font-size: 0.9rem;
  }

  .msg.error {
    color: #b91c1c;
  }

  .msg.success {
    color: #15803d;
  }
</style>
