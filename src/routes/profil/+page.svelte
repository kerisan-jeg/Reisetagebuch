<script lang="ts">
  import { supabase } from "$lib/supabaseClient";
  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";

  type UserProfile = {
    email: string;
    id: string;
    created_at: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    birthday?: string;
  };

  const heroImages = ["/landing/Berg.jpg", "/landing/Staedtetrip.jpg", "/landing/Strand.jpg"];
  let heroIndex = 0;
  let heroInterval: ReturnType<typeof setInterval> | null = null;

  let user: UserProfile | null = null;
  let loading = true;
  let errorMessage = "";
  let reisenCount = 0;
  let bucketCount = 0;

  onMount(() => {
    if (heroImages.length > 1) {
      heroInterval = setInterval(() => {
        heroIndex = (heroIndex + 1) % heroImages.length;
      }, 7000);
    }
    loadProfile();
  });

  onDestroy(() => {
    if (heroInterval) clearInterval(heroInterval);
  });

  async function loadProfile() {
    loading = true;
    errorMessage = "";

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      errorMessage = "Bitte melde dich neu an.";
      loading = false;
      return;
    }

    const u = userData.user;
    user = {
      email: u.email,
      id: u.id,
      created_at: u.created_at,
      full_name: u.user_metadata?.full_name,
      first_name: u.user_metadata?.first_name,
      last_name: u.user_metadata?.last_name,
      birthday: u.user_metadata?.birthday
    };

    // Zähler laden
    const [reisenRes, bucketRes] = await Promise.all([
      supabase.from("reisen").select("id", { count: "exact", head: true }).eq("user_id", u.id),
      supabase.from("bucketlist").select("id", { count: "exact", head: true }).eq("user_id", u.id)
    ]);

    reisenCount = reisenRes.count ?? 0;
    bucketCount = bucketRes.count ?? 0;

    loading = false;
  }
</script>

<svelte:head>
  <title>Profil</title>
</svelte:head>

<div class="page">
  <div class="background">
    {#key heroIndex}
      <div
        class="bg"
        style={`background-image: url('${heroImages[heroIndex]}')`}
        in:fade={{ duration: 700 }}
        out:fade={{ duration: 700 }}
      ></div>
    {/key}
    <div class="bg-overlay"></div>
  </div>

  <main class="content">
    <div class="card">
      <header class="header">
        <div class="avatar">{user?.first_name?.[0] ?? user?.email?.[0] ?? "?"}</div>
        <div>
          <h1>{user?.full_name || `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Profil"}</h1>
          <p class="email">{user?.email}</p>
        </div>
      </header>

      {#if errorMessage}
        <p class="error">{errorMessage}</p>
      {:else if loading}
        <p class="status">Lade Profil...</p>
      {:else}
        <div class="stats">
          <div class="stat-box">
            <p class="label">Reisen</p>
            <p class="value">{reisenCount}</p>
          </div>
          <div class="stat-box">
            <p class="label">Bucketlist</p>
            <p class="value">{bucketCount}</p>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-box">
            <p class="label">Vorname</p>
            <p>{user?.first_name || "—"}</p>
          </div>
          <div class="meta-box">
            <p class="label">Nachname</p>
            <p>{user?.last_name || "—"}</p>
          </div>
          <div class="meta-box">
            <p class="label">E-Mail</p>
            <p>{user?.email}</p>
          </div>
          <div class="meta-box">
            <p class="label">Geburtstag</p>
            <p>{user?.birthday || "—"}</p>
          </div>
          <div class="meta-box wide">
            <p class="label">User-ID</p>
            <p class="mono">{user?.id}</p>
          </div>
          <div class="meta-box">
            <p class="label">Registriert am</p>
            <p>{new Date(user?.created_at ?? "").toLocaleString()}</p>
          </div>
        </div>
      {/if}
    </div>
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
  }

  .page {
    position: relative;
    min-height: 100vh;
    overflow: hidden;
    color: #0f172a;
  }

  .background {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
  }

  .bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    filter: brightness(0.65);
  }

  .bg-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.5));
  }

  .content {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    padding: 5rem 1.5rem 3rem;
  }

  .card {
    width: 100%;
    max-width: 980px;
    background: rgba(255, 255, 255, 0.85);
    border-radius: 28px;
    padding: 2.4rem 2.6rem;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  }

  .header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: #020617;
    color: white;
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 1.4rem;
  }

  h1 {
    margin: 0;
    font-size: 1.8rem;
  }

  .email {
    margin: 0.2rem 0 0;
    color: #475569;
  }

  .error {
    background: #fee2e2;
    color: #991b1b;
    padding: 0.8rem 1rem;
    border-radius: 12px;
  }

  .status {
    color: #475569;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
    margin: 1.5rem 0;
  }

  .stat-box {
    background: white;
    border-radius: 18px;
    padding: 1rem 1.2rem;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  }

  .label {
    margin: 0;
    color: #64748b;
    font-size: 0.95rem;
  }

  .value {
    margin: 0.2rem 0 0;
    font-size: 2rem;
    font-weight: 800;
    color: #0f172a;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .meta-box {
    background: rgba(255, 255, 255, 0.9);
    padding: 1rem 1.2rem;
    border-radius: 16px;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.1);
  }

  .meta-box.wide {
    grid-column: span 2;
    word-break: break-all;
  }

  .mono {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    word-break: break-all;
  }

  @media (max-width: 640px) {
    .card {
      padding: 1.8rem 1.6rem;
    }
  }
</style>
