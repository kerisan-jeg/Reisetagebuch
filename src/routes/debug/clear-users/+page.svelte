<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  let done = false;
  let removedCount = 0;
  let emailParam: string | null = null;
  let error: string | null = null;

  onMount(() => {
    try {
      emailParam = $page.url.searchParams.get('email');

      if (typeof localStorage === 'undefined') {
        error = 'localStorage is not available in this environment.';
        return;
      }

      const raw = localStorage.getItem('users') || '[]';
      let users = JSON.parse(raw || '[]');

      if (emailParam) {
        const emailLower = emailParam.toLowerCase();
        const before = users.length;
        users = users.filter((u: any) => (u.email || '').toLowerCase() !== emailLower);
        removedCount = before - users.length;
      } else {
        removedCount = users.length;
        users = [];
      }

      localStorage.setItem('users', JSON.stringify(users));
      localStorage.removeItem('currentUser');
      done = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  });

  function goHome() {
    goto('/');
  }
</script>

<main style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; padding: 2rem;">
  <h1>Debug: Registrations löschen</h1>
  {#if error}
    <p style="color: #b91c1c">Fehler: {error}</p>
  {:else}
    {#if !done}
      <p>Arbeite…</p>
    {:else}
      {#if emailParam}
        <p>Gelöschte Einträge für <strong>{emailParam}</strong>: {removedCount}</p>
      {:else}
        <p>Alle registrierten Nutzer wurden entfernt. Entfernte Einträge: {removedCount}</p>
      {/if}
      <p style="margin-top:1rem">Hinweis: Diese Aktion löscht nur die Daten im aktuellen Browser (localStorage).</p>
      <div style="margin-top:1.25rem">
        <button on:click={goHome} style="padding:0.6rem 1rem; border-radius:8px; background:#0b1220; color:#fff; border:none;">Zur Startseite</button>
      </div>
    {/if}
  {/if}
</main>
