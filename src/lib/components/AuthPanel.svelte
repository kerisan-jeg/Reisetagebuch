<script lang="ts">
  import { auth } from '$lib/stores/auth';
  import { profile } from '$lib/stores/profile';

  let mode: 'login' | 'register' = 'login';

  // Login
  let loginEmail = '';
  let loginPassword = '';

  // Register
  let firstName = '';
  let lastName = '';
  let birthDate = '';
  let email = '';
  let password = '';

  let error = '';

  async function onLogin() {
    error = '';
    if (!loginEmail || !loginPassword) { error = 'Bitte E-Mail und Passwort eingeben.'; return; }
    const u = auth.login(loginEmail, loginPassword);
    await profile.setName(u.name);
  }

  async function onRegister() {
    error = '';
    if (!firstName || !lastName || !birthDate || !email || !password) {
      error = 'Bitte alle Felder ausfüllen.'; return;
    }
    const result = auth.register({ firstName, lastName, birthDate, email, password });
    // register returns a verification link; do not assume a user object yet
    // Optionally display result.verificationLink to the user (handled by caller)
  }
</script>

<div class="w-full rounded-2xl border bg-white/85 p-6 shadow-md backdrop-blur md:w-[380px]">
  {#if mode === 'login'}
    <h2 class="mb-4 text-center text-2xl font-semibold">Reisetagebuch</h2>
    <div class="space-y-3">
      <input class="input" type="email" bind:value={loginEmail} placeholder="E-Mail" />
      <input class="input" type="password" bind:value={loginPassword} placeholder="Passwort" />
      {#if error}<p class="text-sm text-red-600">{error}</p>{/if}
      <button class="btn w-full" on:click={onLogin}>Anmelden</button>
    </div>
    <p class="mt-4 text-center text-sm">
      Du hast noch kein Konto?
      <button class="link" on:click={() => (mode = 'register')}>Registrieren</button>
    </p>
  {:else}
    <h2 class="mb-4 text-center text-2xl font-semibold">Konto erstellen</h2>
    <div class="grid grid-cols-1 gap-3">
      <input class="input" placeholder="Vorname" bind:value={firstName} />
      <input class="input" placeholder="Nachname" bind:value={lastName} />
      <input class="input" type="date" bind:value={birthDate} />
      <input class="input" type="email" placeholder="E-Mail" bind:value={email} />
      <input class="input" type="password" placeholder="Passwort" bind:value={password} />
      {#if error}<p class="text-sm text-red-600">{error}</p>{/if}
      <button class="btn w-full" on:click={onRegister}>Registrieren</button>
    </div>
    <p class="mt-4 text-center text-sm">
      Schon ein Konto?
      <button class="link" on:click={() => (mode = 'login')}>Anmelden</button>
    </p>
  {/if}
</div>

<style>
  .input { @apply w-full rounded-xl border px-3 py-2 bg-white/90; }
  .btn { @apply rounded-xl bg-black px-4 py-2 text-white hover:opacity-90; }
  .link { @apply underline underline-offset-2 hover:text-black; }
</style>
