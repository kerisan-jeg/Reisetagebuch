<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { supabase } from "$lib/supabaseClient";

  type BucketItem = {
    id: string;
    title: string;
    location: string | null;
    description?: string | null;
    year?: string | null;
    cover_image_url?: string | null;
    images?: string[] | null;
    lat?: number | null;
    lng?: number | null;
  };

  export let params: { id: string };

  let item: BucketItem | null = null;
  let loading = true;
  let errorMessage = "";
  let deleting = false;
  let heroImages: string[] = [];
  let heroIndex = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  onMount(async () => {
    await loadItem();
    startHero();
  });

  async function loadItem() {
    loading = true;
    errorMessage = "";

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userError || !user) {
      errorMessage = "Bitte neu einloggen.";
      loading = false;
      return;
    }

    // Erst normal über user_id versuchen
    let { data, error } = await supabase
      .from("bucketlist")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    // Fallback mit userId-Spalte
    if (error || !data) {
      const alt = await supabase
        .from("bucketlist")
        .select("*")
        .eq("id", params.id)
        .eq("userId", user.id)
        .maybeSingle();
      data = alt.data ?? null;
      error = alt.error ?? error;
    }

    // Letzter Versuch: ungefiltert und selbst filtern
    if ((!data || error) && !loading) {
      const unfilt = await supabase.from("bucketlist").select("*").eq("id", params.id).maybeSingle();
      if (unfilt.data && (!unfilt.data.user_id || unfilt.data.user_id === user.id || unfilt.data.userId === user.id)) {
        data = unfilt.data;
        error = null;
      }
    }

    if (!data || error) {
      errorMessage = "Bucketlist-Eintrag konnte nicht geladen werden.";
      loading = false;
      return;
    }

    item = data as BucketItem;
    heroImages = (item.images ?? []).filter(Boolean) as string[];
    if (item.cover_image_url) {
      heroImages = [item.cover_image_url, ...heroImages];
    }
    if (heroImages.length === 0) {
      heroImages = ["/landing/Strand.jpg"];
    }
    loading = false;
  }

  function startHero() {
    if (intervalId) clearInterval(intervalId);
    if (heroImages.length <= 1) return;
    intervalId = setInterval(() => {
      heroIndex = (heroIndex + 1) % heroImages.length;
    }, 6000);
  }

  async function deleteItem() {
    if (!item || deleting) return;
    if (!confirm("Eintrag wirklich löschen?")) return;
    deleting = true;
    const { error } = await supabase.from("bucketlist").delete().eq("id", item.id);
    deleting = false;
    if (error) {
      errorMessage = "Löschen fehlgeschlagen.";
    } else {
      await goto("/bucketlist", { replaceState: true });
    }
  }
</script>

<svelte:head>
  <title>{item?.title ?? "Bucketlist"}</title>
</svelte:head>

{#if loading}
  <div class="status">Lade Bucketlist...</div>
{:else if errorMessage}
  <div class="status error">{errorMessage}</div>
{:else if item}
  <div class="page">
    <section class="hero">
      {#key heroIndex}
        <div
          class="hero-bg"
          style={`background-image:url('${heroImages[heroIndex]}')`}
        ></div>
      {/key}
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <p class="eyebrow">Bucketlist</p>
        <h1>{item.title}</h1>
        {#if item.location}<p class="lede">{item.location}</p>{/if}
      </div>
    </section>

    <main class="content">
      <div class="meta">
        {#if item.year}<p><strong>Jahr:</strong> {item.year}</p>{/if}
        {#if item.lat && item.lng}<p><strong>Koordinaten:</strong> {item.lat}, {item.lng}</p>{/if}
      </div>

      {#if item.description}
        <div class="card">
          <h3>Beschreibung / Stichpunkte</h3>
          <pre>{item.description}</pre>
        </div>
      {/if}

      <div class="actions">
        <button class="secondary" on:click={() => goto("/bucketlist")}>Zurück</button>
        <button class="danger" on:click={deleteItem} disabled={deleting}>
          {deleting ? "Lösche..." : "Löschen"}
        </button>
      </div>
    </main>
  </div>
{:else}
  <div class="status error">Kein Eintrag gefunden.</div>
{/if}

<style>
  .status {
    padding: 1rem;
    text-align: center;
  }
  .status.error {
    color: #b91c1c;
  }

  .page {
    min-height: 100vh;
    background: #0b1224;
    color: #e5e7eb;
  }

  .hero {
    position: relative;
    min-height: 40vh;
    display: grid;
    place-items: center;
    overflow: hidden;
  }
  .hero-bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    filter: brightness(0.75);
    transform: scale(1.04);
  }
  .hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(7, 10, 18, 0.3), rgba(7, 10, 18, 0.7));
  }
  .hero-content {
    position: relative;
    text-align: center;
    padding: 2rem 1rem;
    text-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  }
  .eyebrow {
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin: 0 0 0.4rem;
    color: #cbd5e1;
  }
  h1 {
    margin: 0;
    font-size: clamp(2rem, 4vw, 3rem);
    color: #fff;
  }
  .lede {
    margin: 0.3rem 0 0;
    color: #e2e8f0;
  }

  .content {
    max-width: 900px;
    margin: -40px auto 0;
    padding: 1.5rem;
  }
  .card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 1.2rem 1.4rem;
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.25);
  }
  pre {
    white-space: pre-wrap;
    font-family: inherit;
    margin: 0.6rem 0 0;
    color: #e5e7eb;
  }
  .meta {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
    color: #cbd5e1;
  }
  .meta strong {
    color: #f8fafc;
  }
  .actions {
    display: flex;
    gap: 0.8rem;
    margin-top: 1rem;
    justify-content: flex-end;
  }
  .secondary,
  .danger {
    border: none;
    border-radius: 12px;
    padding: 0.75rem 1.2rem;
    font-weight: 700;
    cursor: pointer;
  }
  .secondary {
    background: rgba(255, 255, 255, 0.08);
    color: #e5e7eb;
    border: 1px solid rgba(255, 255, 255, 0.12);
  }
  .danger {
    background: #ef4444;
    color: #fff;
  }
  .danger:disabled {
    opacity: 0.6;
    cursor: default;
  }
</style>
