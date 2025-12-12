<script lang="ts">
  import { supabase } from "$lib/supabaseClient";
  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";
  import { goto } from "$app/navigation";

  type UserProfile = {
    email: string;
    id: string;
    created_at: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    birthday?: string;
    deletion_requested_until?: string | null;
  };

  const heroImages = ["/landing/Berg.jpg", "/landing/Staedtetrip.jpg", "/landing/Strand.jpg"];
  let heroIndex = 0;
  let heroInterval: ReturnType<typeof setInterval> | null = null;

  let user: UserProfile | null = null;
  let loading = true;
  let errorMessage = "";
  let reisenCount = 0;
  let bucketCount = 0;
  let reisenCostSum = 0;
  let deleting = false;
  let deleteMessage = "";
  let confirmingDelete = false;
  let deletionUntil: string | null = null;

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
      birthday: u.user_metadata?.birthday,
      deletion_requested_until: u.user_metadata?.deletion_requested_until ?? null
    };

    deletionUntil = user.deletion_requested_until ?? null;

    const [reisenRes, bucketRes, kostenRes] = await Promise.all([
      supabase.from("reisen").select("id", { count: "exact", head: true }).eq("user_id", u.id),
      supabase.from("bucketlist").select("id", { count: "exact", head: true }).eq("user_id", u.id),
      supabase.from("reisen").select("cost").eq("user_id", u.id)
    ]);

    reisenCount = reisenRes.count ?? 0;
    bucketCount = bucketRes.count ?? 0;
    reisenCostSum = (kostenRes.data ?? [])
      .map((r: any) => Number(r.cost) || 0)
      .reduce((sum: number, v: number) => sum + v, 0);
    loading = false;
  }

  const formatDate = (value?: string) => {
    if (!value) return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
  };

  async function deleteProfile() {
    if (deleting || !user) return;
    if (!confirmingDelete) {
      confirmingDelete = true;
      return;
    }

    deleting = true;
    deleteMessage = "";
    try {
      const until = new Date();
      until.setDate(until.getDate() + 30);
      await supabase.auth.updateUser({ data: { deletion_requested_until: until.toISOString() } });
      deletionUntil = until.toISOString();
      await supabase.auth.signOut();
      deleteMessage = "Dein Account wurde zur Loeschung markiert. Du kannst ihn innerhalb von 30 Tagen reaktivieren.";
      try {
        await goto("/auth/login", { replaceState: true });
      } catch {
        window.location.href = "/auth/login";
      }
    } catch (err) {
      console.error(err);
      deleteMessage = "Loeschen fehlgeschlagen. Bitte versuche es spaeter erneut.";
    } finally {
      deleting = false;
      confirmingDelete = false;
    }
  }

  async function reactivateAccount() {
    if (!user) return;
    try {
      await supabase.auth.updateUser({ data: { deletion_requested_until: null } });
      deletionUntil = null;
      deleteMessage = "Account reaktiviert.";
    } catch (err) {
      console.error(err);
      deleteMessage = "Reaktivieren fehlgeschlagen. Bitte spaeter erneut versuchen.";
    }
  }
</script>

<svelte:head>
  <title>Profil</title>
</svelte:head>

<div class="page">
  <div class="bg-layer">
    {#key heroIndex}
      <div
        class="bg"
        style={`background-image: url('${heroImages[heroIndex]}')`}
        in:fade={{ duration: 700 }}
        out:fade={{ duration: 700 }}
      ></div>
    {/key}
    <div class="overlay"></div>
    <div class="glow glow-1"></div>
    <div class="glow glow-2"></div>
  </div>

  <main class="shell">
    <section class="hero">
      <div class="avatar">
        <span>{user?.first_name?.[0] ?? user?.email?.[0] ?? "?"}</span>
      </div>
      <div class="identity">
        <p class="eyebrow">Dein Profil</p>
        <h1>{user?.full_name || `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Profil"}</h1>
        <p class="email">{user?.email ?? "—"}</p>
        <div class="tags">
          <span class="chip">seit {user ? formatDate(user.created_at) : "—"}</span>
          <span class="chip subtle">ID {user?.id ?? "—"}</span>
        </div>
      </div>
    </section>

    {#if errorMessage}
      <div class="card error-card">{errorMessage}</div>
    {:else if loading}
      <div class="card status-card">Lade Profil...</div>
    {:else}
      {#if deletionUntil}
        <div class="card warning-card">
          <div>
            <p class="label">Zur Loeschung markiert</p>
            <p class="body">Dein Konto wird nach dem {formatDate(deletionUntil)} endgueltig entfernt.</p>
            <p class="hint">Melde dich einfach an oder klicke unten, um es sofort zu reaktivieren.</p>
          </div>
          <button class="primary-btn" on:click={reactivateAccount}>Konto reaktivieren</button>
        </div>
      {/if}

      <section class="grid two">
        <div class="card stat-card">
          <p class="label">Reisen</p>
          <p class="value">{reisenCount}</p>
          <p class="hint">bereits festgehaltene Trips</p>
        </div>
        <div class="card stat-card">
          <p class="label">Bucketlist</p>
          <p class="value">{bucketCount}</p>
          <p class="hint">Ziele, die noch warten</p>
        </div>
        <div class="card stat-card">
          <p class="label">Gesamtkosten Reisen</p>
          <p class="value">{reisenCostSum}</p>
          <p class="hint">CHF (Summe aller Trips)</p>
        </div>
      </section>

      <section class="grid three">
        <div class="card info">
          <p class="label">Vorname</p>
          <p class="body">{user?.first_name || "—"}</p>
        </div>
        <div class="card info">
          <p class="label">Nachname</p>
          <p class="body">{user?.last_name || "—"}</p>
        </div>
        <div class="card info">
          <p class="label">Geburtstag</p>
          <p class="body">{formatDate(user?.birthday)}</p>
        </div>
        <div class="card info span-2">
          <p class="label">E-Mail</p>
          <p class="body">{user?.email ?? "—"}</p>
        </div>
        <div class="card info">
          <p class="label">Registriert am</p>
          <p class="body">{user?.created_at ? new Date(user.created_at).toLocaleString() : "—"}</p>
        </div>
        <div class="card info span-3">
          <p class="label">User-ID</p>
          <p class="body mono">{user?.id ?? "—"}</p>
        </div>
      </section>

      <section class="danger">
        <div class="danger-card">
          <div>
            <p class="label">Profil loeschen</p>
            <p class="body">Entfernt deine Reisen und Bucketlist-Eintraege und meldet dich ab.</p>
            <p class="hint">
              Dein Konto wird 30 Tage lang zur Wiederherstellung vorgemerkt. In dieser Zeit kannst du es reaktivieren,
              sonst wird es endgueltig geloescht.
            </p>
            {#if deleteMessage}<p class="hint">{deleteMessage}</p>{/if}
            {#if confirmingDelete}
              <div class="confirm-box">
                <p class="label">Bist du sicher?</p>
                <p class="hint">Dieser Schritt markiert dein Konto zur Loeschung.</p>
                <div class="confirm-actions">
                  <button class="secondary-btn" on:click={() => (confirmingDelete = false)} disabled={deleting}>
                    Abbrechen
                  </button>
                  <button class="danger-btn" on:click={deleteProfile} disabled={deleting}>
                    {deleting ? "Loesche..." : "Endgueltig markieren"}
                  </button>
                </div>
              </div>
            {/if}
          </div>
          {#if !confirmingDelete}
            <button class="danger-btn" on:click={deleteProfile} disabled={deleting}>
              {deleting ? "Loesche..." : "Profil loeschen"}
            </button>
          {/if}
        </div>
      </section>
    {/if}
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: "Inter", system-ui, -apple-system, sans-serif;
    background: #030712;
    color: #e5e7eb;
  }

  .page {
    position: relative;
    min-height: 100vh;
    overflow: hidden;
    isolation: isolate;
  }

  .bg-layer {
    position: fixed;
    inset: 0;
    z-index: -2;
  }

  .bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    filter: brightness(0.55) blur(0.5px);
    transform: scale(1.05);
    transition: opacity 0.8s ease;
  }

  .overlay {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 20% 20%, rgba(14, 165, 233, 0.25), transparent 30%),
      radial-gradient(circle at 80% 60%, rgba(244, 114, 182, 0.2), transparent 35%),
      linear-gradient(180deg, rgba(3, 7, 18, 0.72), rgba(3, 7, 18, 0.9));
    z-index: 1;
  }

  .glow {
    position: absolute;
    filter: blur(120px);
    opacity: 0.5;
    z-index: 0;
  }

  .glow-1 {
    width: 360px;
    height: 360px;
    background: #22d3ee;
    top: 12%;
    left: -8%;
  }

  .glow-2 {
    width: 320px;
    height: 320px;
    background: #a855f7;
    bottom: 6%;
    right: -4%;
  }

  .shell {
    position: relative;
    z-index: 2;
    max-width: 1180px;
    margin: 0 auto;
    padding: 4.5rem 1.6rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }

  .hero {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1.2rem;
    align-items: center;
    padding: 1.6rem;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(10px);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
  }

  .avatar {
    width: 82px;
    height: 82px;
    border-radius: 24px;
    background: linear-gradient(135deg, #0ea5e9, #a855f7);
    display: grid;
    place-items: center;
    color: #0b1120;
    font-weight: 800;
    font-size: 1.8rem;
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.35);
  }

  .identity h1 {
    margin: 0.1rem 0;
    font-size: 2.2rem;
    letter-spacing: -0.01em;
    color: #f8fafc;
  }

  .identity .email {
    margin: 0.1rem 0 0.6rem;
    color: #cbd5e1;
  }

  .eyebrow {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.78rem;
    color: #94a3b8;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #e2e8f0;
    font-size: 0.9rem;
  }

  .chip.subtle {
    background: rgba(255, 255, 255, 0.04);
    color: #cbd5e1;
  }

  .grid {
    display: grid;
    gap: 1rem;
  }

  .grid.two {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }

  .grid.three {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .card {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    padding: 1.1rem 1.25rem;
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(8px);
  }

  .stat-card {
    position: relative;
    overflow: hidden;
  }

  .stat-card::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(168, 85, 247, 0.08));
    opacity: 0.7;
    pointer-events: none;
  }

  .label {
    margin: 0;
    color: #cbd5e1;
    font-size: 0.95rem;
  }

  .value {
    margin: 0.35rem 0 0;
    font-size: 2.4rem;
    font-weight: 800;
    color: #f8fafc;
  }

  .hint {
    margin: 0.1rem 0 0;
    color: #9ca3af;
    font-size: 0.92rem;
  }

  .info .body {
    margin: 0.15rem 0 0;
    font-size: 1.05rem;
    color: #e5e7eb;
  }

  .mono {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    word-break: break-all;
    color: #cbd5e1;
  }

  .span-2 {
    grid-column: span 2;
  }

  .span-3 {
    grid-column: span 3;
  }

  .error-card {
    color: #fecdd3;
    background: rgba(248, 113, 113, 0.12);
    border-color: rgba(248, 113, 113, 0.4);
  }

  .status-card {
    color: #cbd5e1;
  }

  .warning-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .primary-btn {
    border: none;
    padding: 0.7rem 1.1rem;
    border-radius: 12px;
    background: linear-gradient(135deg, #22d3ee, #a855f7);
    color: #0b1120;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 10px 20px rgba(168, 85, 247, 0.35);
    transition: transform 0.08s ease, box-shadow 0.12s ease, opacity 0.12s ease;
  }

  .primary-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 26px rgba(168, 85, 247, 0.45);
  }

  .danger {
    margin-top: 0.6rem;
  }

  .danger-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border-radius: 14px;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.35);
    color: #fecdd3;
  }

  .danger-btn {
    border: none;
    padding: 0.7rem 1.1rem;
    border-radius: 12px;
    background: #ef4444;
    color: #fff;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 10px 20px rgba(239, 68, 68, 0.35);
    transition: transform 0.08s ease, box-shadow 0.12s ease, opacity 0.12s ease;
  }

  .danger-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    box-shadow: none;
  }

  .danger-btn:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 26px rgba(239, 68, 68, 0.45);
  }

  .confirm-box {
    margin-top: 0.6rem;
    padding: 0.75rem;
    border-radius: 10px;
    border: 1px solid rgba(239, 68, 68, 0.35);
    background: rgba(239, 68, 68, 0.08);
  }

  .confirm-actions {
    display: flex;
    gap: 0.6rem;
    margin-top: 0.6rem;
  }

  .secondary-btn {
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: transparent;
    color: #e5e7eb;
    border-radius: 10px;
    padding: 0.55rem 0.95rem;
    cursor: pointer;
  }

  @media (max-width: 720px) {
    .hero {
      grid-template-columns: 1fr;
      text-align: center;
      justify-items: center;
    }

    .avatar {
      width: 72px;
      height: 72px;
      font-size: 1.6rem;
    }

    .identity h1 {
      font-size: 1.8rem;
    }

    .span-2,
    .span-3 {
      grid-column: span 1;
    }

    .danger-card,
    .warning-card {
      flex-direction: column;
      align-items: flex-start;
    }

    .danger-btn,
    .primary-btn {
      width: 100%;
      text-align: center;
    }
  }
</style>
