<script lang="ts">
  import { supabase } from "$lib/supabaseClient";
  import { goto } from "$app/navigation";
  import Slideshow from "$lib/components/Slideshow.svelte";
  import { t } from "$lib/i18n";

  const slideshowImages = [
    "/landing/Berg.jpg",
    "/landing/Staedtetrip.jpg",
    "/landing/Strand.jpg"
  ];

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
      errorMessage = "Bitte gib eine gueltige E-Mail-Adresse ein.";
      return;
    }

    if (password.length < 6) {
      errorMessage = "Das Passwort muss mindestens 6 Zeichen lang sein.";
      return;
    }

    loading = true;

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          birthday
        },
        emailRedirectTo: "http://localhost:5173"
      }
    });

    loading = false;

    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      const duplicate =
        error.code === "user_already_exists" ||
        msg.includes("already registered") ||
        msg.includes("already exists") ||
        msg.includes("duplicate");

      if (duplicate) {
        errorMessage = $t("register.duplicate");
      } else {
        errorMessage = error.message || "Registrierung fehlgeschlagen.";
      }
      return;
    }

    // Supabase kann bei bestehenden Konten ein "erfolgreiches" Signup mit leerem identities liefern
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      errorMessage = $t("register.duplicate");
      return;
    }

    message = $t("register.success");

    // Direkt zum Login mit Hinweis zur E-Mail-Bestaetigung
    goto(`/?verify=1&email=${encodeURIComponent(email)}`);
  }
</script>

<div class="register-hero">
  <Slideshow images={slideshowImages} />
  <div class="register-overlay"></div>

  <div class="register-content">
    <div class="register-text">
      <h1>{$t("register.title")}</h1>
      <p>{$t("register.subtitle")}</p>
    </div>

    <div class="register-card">
      {#if errorMessage}
        <p class="msg error">{errorMessage}</p>
      {/if}

      {#if message}
        <p class="msg success">{message}</p>
      {/if}

      <form class="form" on:submit|preventDefault={registerUser}>
        <label>
          <span>{$t("register.firstname")}</span>
          <input type="text" bind:value={firstName} placeholder={$t("register.firstname")} />
        </label>

        <label>
          <span>{$t("register.lastname")}</span>
          <input type="text" bind:value={lastName} placeholder={$t("register.lastname")} />
        </label>

        <label>
          <span>{$t("register.birthday")}</span>
          <input type="date" bind:value={birthday} />
        </label>

        <label>
          <span>{$t("register.email")}</span>
          <input
            type="email"
            bind:value={email}
            class="highlight"
            placeholder="deine@mail.ch"
          />
        </label>

        <label>
          <span>{$t("register.password")}</span>
          <input
            type="password"
            bind:value={password}
            class="highlight"
            placeholder="********"
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? $t("register.loading") : $t("register.submit")}
        </button>
      </form>

      <p class="bottom-link">
        {$t("register.noAccount")}
        <a href="/">{$t("register.loginNow")}</a>
      </p>
    </div>
  </div>
</div>

<style>
  .register-hero {
    position: relative;
    min-height: 100vh;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3rem 2rem;
    box-sizing: border-box;
  }

  .register-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      120deg,
      rgba(0, 0, 0, 0.65) 0%,
      rgba(0, 0, 0, 0.4) 45%,
      rgba(0, 0, 0, 0.25) 70%,
      rgba(0, 0, 0, 0.45) 100%
    );
    z-index: 1;
  }

  .register-content {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
    align-items: start;
    width: 100%;
    max-width: 1200px;
  }

  .register-text {
    color: #f8fafc;
    text-shadow: 0 8px 25px rgba(0, 0, 0, 0.55);
    max-width: 520px;
  }

  .register-text h1 {
    font-size: clamp(2.4rem, 4vw, 3.2rem);
    margin-bottom: 1rem;
  }

  .register-text p {
    font-size: 1.1rem;
    line-height: 1.5;
  }

  .register-card {
    width: 100%;
    padding: 2.4rem;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(6px);
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 8px;
  }

  label {
    display: flex;
    flex-direction: column;
    font-size: 0.95rem;
    font-weight: 600;
    color: #0f172a;
  }

  label span {
    margin-bottom: 4px;
  }

  input {
    padding: 10px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    font-size: 0.95rem;
    background: #f8fafc;
  }

  input.highlight {
    background-color: #fef9c3;
  }

  button {
    margin-top: 12px;
    width: 100%;
    padding: 12px 0;
    border: none;
    border-radius: 12px;
    background: #020617;
    color: #fff;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.1s ease, box-shadow 0.1s ease;
  }

  button:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.18);
  }

  button:disabled {
    opacity: 0.7;
    cursor: default;
    box-shadow: none;
    transform: none;
  }

  .bottom-link {
    margin-top: 16px;
    font-size: 0.95rem;
    text-align: center;
  }

  .bottom-link a {
    color: #1e3a8a;
    font-weight: 700;
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

  @media (max-width: 960px) {
    .register-content {
      grid-template-columns: 1fr;
      gap: 1.8rem;
    }

    .register-text {
      text-align: center;
      margin: 0 auto;
    }

    .register-card {
      max-width: 540px;
      margin: 0 auto;
    }
  }
</style>
