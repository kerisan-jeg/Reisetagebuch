<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { supabase } from "$lib/supabaseClient";

  // aktueller Pfad
  $: currentPath = $page.url.pathname;

  // Navbar auf Login/Registrieren nicht anzeigen
  $: hideNav =
    currentPath === "/" ||
    currentPath.startsWith("/login") ||
    currentPath.startsWith("/auth/login") ||
    currentPath.startsWith("/register") ||
    currentPath.startsWith("/auth/register");

  // Slideshow-Seiten → kein zusätzliches Padding oben
  $: isSlideshowPage = currentPath.startsWith("/reisetagebuch");

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Logout Fehler:", err);
    } finally {
      goto("/", { replaceState: true });
    }
  };
</script>

{#if !hideNav}
  <nav class="top-nav">
    <div class="nav-left">
      <a href="/reisetagebuch" class="brand">Reisetagebuch</a>
    </div>

    <div class="nav-links">
      <a href="/reisen" class:selected={currentPath.startsWith("/reisen")}>Reisen</a>
      <a href="/bucketlist" class:selected={currentPath.startsWith("/bucketlist")}>Bucketlist</a>
      <a href="/karte" class:selected={currentPath.startsWith("/karte")}>Karte</a>
      <a href="/profil" class:selected={currentPath.startsWith("/profil")}>Profil</a>
      <button on:click={handleLogout} class="logout">Logout</button>
    </div>
  </nav>
{/if}

<main
  class:has-nav={!hideNav}
  class:no-padding={isSlideshowPage}
>
  <slot />
</main>

<style>
  /* ---------- NAVBAR ---------- */
  .top-nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.9rem 3rem;
    background: #1f2933;
    color: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  }

  .nav-left {
    display: flex;
    align-items: center;
  }

  .brand {
    font-size: 1.4rem;
    font-weight: 800;
    text-decoration: none;
    color: white;
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 1.8rem;
  }

  .nav-links a {
    text-decoration: none;
    color: #e5e7eb;
    font-weight: 500;
    position: relative;
  }

  .nav-links a.selected {
    color: white;
  }

  .nav-links a.selected::after {
    content: "";
    position: absolute;
    bottom: -0.2rem;
    left: 0;
    width: 100%;
    height: 2px;
    background: white;
  }

  .logout {
    border: none;
    border-radius: 999px;
    padding: 0.4rem 1.4rem;
    font-weight: 600;
    cursor: pointer;
    background: #ef4444;
    color: white;
  }

  .logout:hover {
    background: #dc2626;
  }

  /* ---------- MAIN ---------- */

  main {
    min-height: 100vh;
    margin: 0;
    padding: 0;
  }

  /* normale Seiten → Abstand wegen Navbar */
  main.has-nav {
    padding-top: 70px;
  }

  /* Reisetagebuch (Slideshow) → kein zusätzlicher Rand oben */
  main.no-padding {
    padding-top: 0 !important;
  }
</style>
