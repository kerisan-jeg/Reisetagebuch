<script lang="ts">
  import { page } from "$app/stores";
  import { availableLanguages, lang, t } from "$lib/i18n";

  const hiddenRoutes = ["/login", "/register"];

  let selectedLang = "de";

  $: lang.subscribe((val) => (selectedLang = val));

  function changeLang(code: string) {
    if (availableLanguages.some((l) => l.code === code)) {
      lang.set(code as any);
    }
  }
</script>

{#if !hiddenRoutes.includes($page.url.pathname)}
  <nav class="navbar">
    <div class="logo">Reisetagebuch</div>

    <ul class="nav-links">
      <li><a href="/reisen">{$t("nav.reisen")}</a></li>
      <li><a href="/bucketlist">{$t("nav.bucketlist")}</a></li>
      <li><a href="/karte">{$t("nav.karte")}</a></li>
      <li><a href="/profil">{$t("nav.profil")}</a></li>
      <li><a href="/logout" class="btn">{$t("nav.logout")}</a></li>
      <li>
        <select
          class="lang-select"
          bind:value={selectedLang}
          on:change={(e) => changeLang((e.target as HTMLSelectElement).value)}
          aria-label={$t("nav.language")}
        >
          {#each availableLanguages as l}
            <option value={l.code}>{l.label}</option>
          {/each}
        </select>
      </li>
    </ul>
  </nav>
{/if}

<style>
  .navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background-color: rgba(0, 0, 0, 0.85);
    color: white;
  }

  .nav-links {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  a {
    color: white;
    text-decoration: none;
    font-size: 1.02rem;
  }

  .btn {
    padding: 0.4rem 0.85rem;
    background: #e11d48;
    border-radius: 12px;
    font-weight: 700;
  }

  .lang-select {
    min-width: 115px;
    padding: 0.35rem 0.6rem;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.92);
    color: #0f172a;
    cursor: pointer;
    font-size: 0.95rem;
    outline: none;
  }

  .lang-select option {
    color: #0f172a;
  }
</style>
