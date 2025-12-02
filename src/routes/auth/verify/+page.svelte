<script lang="ts">
  import { page } from '$app/stores';
  import { auth } from '$lib/stores/auth';
  import { onMount } from 'svelte';

  let status: string = 'E-Mail wird bestätigt...';

  // Email aus URL lesen
  $: email = $page.url.searchParams.get('email') || '';

  import { goto } from '$app/navigation';

  onMount(() => {
    if (!email) {
      status = 'Keine E-Mail-Adresse im Bestätigungslink gefunden.';
      return;
    }

    try {
      const user = auth.verify(email);
      status = `Danke, ${user.name}! Deine E-Mail wurde bestätigt. Du bist jetzt angemeldet.`;
      // automatisch weiterleiten nach kurzer Pause
      setTimeout(() => goto('/reisen'), 1400);
    } catch (e) {
      status = e instanceof Error ? e.message : 'Die Bestätigung ist fehlgeschlagen.';
    }
  });
</script>

<main class="verify-container">
  <h1>E-Mail-Bestätigung</h1>
  <p class="status">{status}</p>

  <a class="link" href="/">Zur Startseite</a>
</main>

<style>
  .verify-container {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    max-width: 650px;
    margin: 4rem auto;
    padding: 2rem;
  }

  h1 {
    font-size: 2rem;
    font-weight: 700;
  }

  .status {
    margin-top: 1rem;
    font-size: 1.1rem;
    line-height: 1.5;
  }

  .link {
    display: inline-block;
    margin-top: 2rem;
    font-size: 1rem;
    color: #2563eb;
  }

  .link:hover {
    text-decoration: underline;
  }
</style>
