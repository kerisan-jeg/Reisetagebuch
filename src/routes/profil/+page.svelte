<script lang="ts">
  import { supabase } from "$lib/supabaseClient";
  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";
  import { goto } from "$app/navigation";
  import { t } from "$lib/i18n";

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
      errorMessage = $t("profile.error.auth");
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

  const formatDate = (value?: string | null) => {
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
      deleteMessage = $t("profile.delete.marked");
      try {
        await goto("/auth/login", { replaceState: true });
      } catch {
        window.location.href = "/auth/login";
      }
    } catch (err) {
      console.error(err);
      deleteMessage = $t("profile.error.delete");
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
      deleteMessage = $t("profile.warning.reactivate");
    } catch (err) {
      console.error(err);
      deleteMessage = $t("profile.error.delete");
    }
  }
</script>

<svelte:head>
  <title>{$t("profile.title")}</title>
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
        <p class="eyebrow">{$t("profile.hero.eyebrow")}</p>
        <h1>{user?.full_name || `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || $t("profile.title")}</h1>
        <p class="email">{user?.email ?? "—"}</p>
        <div class="tags">
          <span class="chip">{$t("profile.hero.since")} {user ? formatDate(user.created_at) : "—"}</span>
          <span class="chip subtle">ID {user?.id ?? "—"}</span>
        </div>
      </div>
    </section>

    {#if errorMessage}
      <div class="card error-card">{errorMessage}</div>
    {:else if loading}
      <div class="card status-card">{$t("profile.title")}...</div>
    {:else}
      {#if deletionUntil}
        <div class="card warning-card">
          <div>
            <p class="label">{$t("profile.warning.title")}</p>
            <p class="body">{$t("profile.warning.body").replace("{date}", formatDate(deletionUntil))}</p>
            <p class="hint">{$t("profile.warning.hint")}</p>
          </div>
          <button class="primary-btn" on:click={reactivateAccount}>{$t("profile.warning.reactivate")}</button>
        </div>
      {/if}

      <section class="grid two">
        <div class="card stat-card">
          <p class="label">{$t("profile.cards.reisen")}</p>
          <p class="value">{reisenCount}</p>
          <p class="hint">{$t("profile.cards.tripsLabel")}</p>
        </div>
        <div class="card stat-card">
          <p class="label">{$t("profile.cards.bucket")}</p>
          <p class="value">{bucketCount}</p>
          <p class="hint">{$t("profile.cards.bucketLabel")}</p>
        </div>
        <div class="card stat-card">
          <p class="label">{$t("profile.cards.costs")}</p>
          <p class="value">{reisenCostSum}</p>
          <p class="hint">{$t("profile.cards.costsLabel")}</p>
        </div>
      </section>

      <section class="grid three">
        <div class="card info">
          <p class="label">{$t("profile.fields.firstname")}</p>
          <p class="body">{user?.first_name || "—"}</p>
        </div>
        <div class="card info">
          <p class="label">{$t("profile.fields.lastname")}</p>
          <p class="body">{user?.last_name || "—"}</p>
        </div>
        <div class="card info">
          <p class="label">{$t("profile.fields.birthday")}</p>
          <p class="body">{formatDate(user?.birthday)}</p>
        </div>
        <div class="card info span-2">
          <p class="label">{$t("profile.fields.email")}</p>
          <p class="body">{user?.email ?? "—"}</p>
        </div>
        <div class="card info">
          <p class="label">{$t("profile.fields.created")}</p>
          <p class="body">{user?.created_at ? new Date(user.created_at).toLocaleString() : "—"}</p>
        </div>
        <div class="card info span-3">
          <p class="label">{$t("profile.fields.userId")}</p>
          <p class="body mono">{user?.id ?? "—"}</p>
        </div>
      </section>

      <section class="danger">
        <div class="danger-card">
          <div>
            <p class="label">{$t("profile.delete.title")}</p>
            <p class="body">{$t("profile.delete.body")}</p>
            <p class="hint">
              {$t("profile.delete.hint")}
            </p>
            {#if deleteMessage}<p class="hint">{deleteMessage}</p>{/if}
            {#if confirmingDelete}
              <div class="confirm-box">
                <p class="label">{$t("profile.delete.confirmTitle")}</p>
                <p class="hint">{$t("profile.delete.confirmHint")}</p>
                <div class="confirm-actions">
                  <button class="secondary-btn" on:click={() => (confirmingDelete = false)} disabled={deleting}>
                    {$t("tripForm.cancel")}
                  </button>
                  <button class="danger-btn" on:click={deleteProfile} disabled={deleting}>
                    {deleting ? $t("profile.delete.loading") : $t("profile.delete.markAction")}
                  </button>
                </div>
              </div>
            {/if}
          </div>
          {#if !confirmingDelete}
            <button class="danger-btn" on:click={deleteProfile} disabled={deleting}>
              {deleting ? $t("profile.delete.loading") : $t("profile.delete.button")}
            </button>
          {/if}
        </div>
      </section>
    {/if}
  </main>
</div>

<style>
  .page {
    position: relative;
    min-height: 100vh;
    color: #e5e7eb;
  }

  .bg-layer {
    position: fixed;
    inset: 0;
    overflow: hidden;
    z-index: -2;
  }

  .bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    filter: brightness(0.45);
  }

  .overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.6), rgba(9, 11, 20, 0.9));
  }

  .glow {
    position: absolute;
    width: 360px;
    height: 360px;
    border-radius: 50%;
    filter: blur(90px);
    opacity: 0.25;
  }

  .glow-1 {
    top: 10%;
    left: 6%;
    background: #38bdf8;
  }

  .glow-2 {
    bottom: 12%;
    right: 8%;
    background: #f472b6;
  }

  .shell {
    position: relative;
    z-index: 1;
    max-width: 1400px;
    margin: 0 auto;
    padding: 120px 28px 80px;
  }

  .hero {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 20px;
  }

  .avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.14);
    display: grid;
    place-items: center;
    font-weight: 800;
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.18);
  }

  .identity {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .eyebrow {
    margin: 0;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #cbd5e1;
    font-size: 0.9rem;
  }

  h1 {
    margin: 0;
    font-size: 2rem;
    color: #fff;
  }

  .email {
    margin: 0;
    color: #e2e8f0;
  }

  .tags {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .chip {
    background: rgba(255, 255, 255, 0.1);
    padding: 6px 10px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    font-size: 0.92rem;
  }

  .chip.subtle {
    background: rgba(255, 255, 255, 0.06);
  }

  .card {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    padding: 16px;
    color: #e5e7eb;
  }

  .error-card {
    background: rgba(248, 113, 113, 0.14);
    border-color: rgba(248, 113, 113, 0.45);
  }

  .status-card {
    text-align: center;
    font-weight: 600;
  }

  .warning-card {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    background: rgba(251, 191, 36, 0.12);
    border-color: rgba(251, 191, 36, 0.4);
  }

  .primary-btn {
    border: none;
    border-radius: 12px;
    padding: 10px 14px;
    background: #0ea5e9;
    color: #0b1120;
    font-weight: 700;
    cursor: pointer;
  }

  .grid {
    display: grid;
    gap: 14px;
    margin-top: 16px;
  }

  .grid.two {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }

  .grid.three {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }

  .stat-card {
    padding: 18px;
  }

  .label {
    margin: 0 0 6px;
    color: #cbd5e1;
    font-size: 0.95rem;
  }

  .value {
    margin: 0;
    font-size: 1.8rem;
    font-weight: 800;
    color: #fff;
  }

  .hint {
    margin: 4px 0 0;
    color: #cbd5e1;
    font-size: 0.95rem;
  }

  .info .body {
    margin: 6px 0 0;
    color: #fff;
  }

  .mono {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
  }

  .span-2 {
    grid-column: span 2;
  }
  .span-3 {
    grid-column: span 3;
  }

  .danger {
    margin-top: 18px;
  }

  .danger-card {
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.4);
    padding: 18px;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .confirm-box {
    margin-top: 10px;
    padding: 12px;
    background: rgba(248, 113, 113, 0.12);
    border-radius: 12px;
    border: 1px solid rgba(248, 113, 113, 0.5);
  }

  .confirm-actions {
    display: flex;
    gap: 10px;
    margin-top: 8px;
  }

  .secondary-btn,
  .danger-btn {
    border: none;
    border-radius: 10px;
    padding: 8px 12px;
    cursor: pointer;
    font-weight: 700;
  }

  .secondary-btn {
    background: rgba(255, 255, 255, 0.12);
    color: #e5e7eb;
    border: 1px solid rgba(255, 255, 255, 0.14);
  }

  .danger-btn {
    background: #ef4444;
    color: #fff;
  }

  @media (max-width: 720px) {
    .hero {
      flex-direction: column;
      align-items: flex-start;
    }

    .span-2 {
      grid-column: span 1;
    }
    .span-3 {
      grid-column: span 1;
    }
  }
</style>
