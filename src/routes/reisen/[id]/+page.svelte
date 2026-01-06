<script lang="ts">
  import { fade } from "svelte/transition";
  import { onMount, onDestroy } from "svelte";
  import { supabase } from "$lib/supabaseClient";
  import { goto } from "$app/navigation";
  import { t } from "$lib/i18n";

  export let params: { id: string };

  type Trip = {
    id: string;
    title: string;
    location: string | null;
    with_whom: string | null;
    cost: number | null;
    rating: number | null;
    description: string | null;
    start_date: string | null;
    end_date: string | null;
    images?: string[] | null;
    cover_image_url?: string | null;
    lat?: number | null;
    lng?: number | null;
  };

  let trip: Trip | null = null;
  let loading = true;
  let errorMessage = "";
  let heroImages: string[] = [];
  let heroIndex = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let lightboxOpen = false;
  let lightboxIndex = 0;

  const formatDate = (iso?: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
  };

  async function loadTrip() {
    loading = true;
    errorMessage = "";
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData?.user;
      if (userError || !user) {
        errorMessage = t("bucket.authRequired") ?? "Bitte melde dich neu an.";
        return;
      }

      const { data, error } = await supabase
        .from("reisen")
        .select("*")
        .eq("id", params.id)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        errorMessage = "Reise konnte nicht geladen werden.";
        return;
      }

      trip = data as Trip;
      const imgs: (string | null | undefined)[] = [];
      if (trip.cover_image_url) imgs.push(trip.cover_image_url);
      if (trip.images?.length) imgs.push(...trip.images);
      heroImages = Array.from(new Set(imgs.filter((x): x is string => !!x)));
      if (heroImages.length === 0) heroImages = ["/landing/Berg.jpg"];
    } catch (err) {
      console.error("Reise laden fehlgeschlagen:", err);
      errorMessage = "Reise konnte nicht geladen werden.";
    } finally {
      loading = false;
    }
  }

  function startHero() {
    if (intervalId) clearInterval(intervalId);
    if (heroImages.length <= 1) return;
    intervalId = setInterval(() => {
      heroIndex = (heroIndex + 1) % heroImages.length;
    }, 6000);
  }

  function goTo(index: number) {
    if (!heroImages.length) return;
    heroIndex = (index + heroImages.length) % heroImages.length;
    lightboxIndex = heroIndex;
    startHero();
  }

  function openLightbox(index: number) {
    lightboxIndex = index;
    lightboxOpen = true;
    if (intervalId) clearInterval(intervalId);
  }

  function closeLightbox() {
    lightboxOpen = false;
    startHero();
  }

  function prevLightbox() {
    lightboxIndex = (lightboxIndex - 1 + heroImages.length) % heroImages.length;
  }

  function nextLightbox() {
    lightboxIndex = (lightboxIndex + 1) % heroImages.length;
  }

  onMount(async () => {
    await loadTrip();
  });

  $: startHero();

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
  });
</script>

{#if loading}
  <div class="status" role="status">Reise wird geladen...</div>
{:else if errorMessage}
  <div class="status error" role="alert">
    {errorMessage}
    <div class="actions">
      <a class="back" href="/reisen">← Zurueck</a>
    </div>
  </div>
{:else if trip}
  <div class="page">
    <section class="hero">
      {#key heroIndex}
        <div
          class="hero-bg"
          style={`background-image:url('${heroImages[heroIndex]}')`}
          in:fade={{ duration: 700 }}
          out:fade={{ duration: 700 }}
          on:click={() => openLightbox(heroIndex)}
        ></div>
      {/key}
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <p class="eyebrow">Reise</p>
        <h1>{trip.title}</h1>
        {#if trip.location}<p class="lede">{trip.location}</p>{/if}
        <button class="back" on:click={() => goto("/reisen")}>← Zurueck</button>
      </div>
      {#if heroImages.length > 1}
        <div class="hero-controls">
          <button class="pill" on:click={() => goTo(heroIndex - 1)} aria-label="Vorheriges Bild">‹</button>
          <div class="dots">
            {#each heroImages as _, i}
              <button
                class:active={i === heroIndex}
                aria-label={`Bild ${i + 1}`}
                on:click={() => goTo(i)}
              ></button>
            {/each}
          </div>
          <button class="pill" on:click={() => goTo(heroIndex + 1)} aria-label="Nächstes Bild">›</button>
        </div>
      {/if}
    </section>

    <main class="content">
      <div class="info-grid">
        <div class="card">
          <h3>Zeitraum</h3>
          <p>{formatDate(trip.start_date)} – {formatDate(trip.end_date)}</p>
        </div>
        {#if trip.with_whom}
          <div class="card">
            <h3>Mit wem</h3>
            <p>{trip.with_whom}</p>
          </div>
        {/if}
        {#if trip.cost != null}
          <div class="card">
            <h3>Kosten</h3>
            <p>{trip.cost}</p>
          </div>
        {/if}
        {#if trip.rating != null}
          <div class="card">
            <h3>Bewertung</h3>
            <p>{(trip.rating / 10).toFixed(1)} / 10</p>
          </div>
        {/if}
      </div>

      {#if trip.description}
        <div class="card">
          <h3>Beschreibung</h3>
          <p class="text">{trip.description}</p>
        </div>
      {/if}

      {#if heroImages.length > 0}
        <div class="gallery">
          {#each heroImages as img, i}
            <button class="thumb-btn" on:click={() => openLightbox(i)}>
              <img src={img} alt={trip.title} loading="lazy" />
            </button>
          {/each}
        </div>
      {/if}
    </main>
  </div>
{/if}

{#if lightboxOpen}
  <div class="lightbox" on:click={closeLightbox}>
    <div class="lightbox-inner" on:click|stopPropagation>
      <button class="close" on:click={closeLightbox} aria-label="Schliessen">×</button>
      <button class="nav prev" on:click={prevLightbox} aria-label="Vorheriges">‹</button>
      <img src={heroImages[lightboxIndex]} alt="Bild" loading="lazy" />
      <button class="nav next" on:click={nextLightbox} aria-label="Nächstes">›</button>
    </div>
  </div>
{/if}

<style>
  .status {
    padding: 1.5rem;
  }
  .status.error {
    color: #b91c1c;
  }
  .actions {
    margin-top: 0.5rem;
  }
  .back {
    text-decoration: none;
    color: #0f172a;
    font-weight: 700;
    background: #e5e7eb;
    border-radius: 10px;
    padding: 0.5rem 0.8rem;
    border: 1px solid #cbd5e1;
  }

  .page {
    min-height: 100vh;
    background: #0b1224;
    color: #e5e7eb;
  }
  .hero {
    position: relative;
    min-height: 45vh;
    display: grid;
    place-items: center;
    overflow: hidden;
  }
  .hero-bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    filter: brightness(0.7);
    transform: scale(1.04);
  }
  .hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(7, 10, 18, 0.2), rgba(7, 10, 18, 0.75));
  }
  .hero-content {
    position: relative;
    text-align: center;
    padding: 2rem 1rem;
    text-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  }
  .hero-controls {
    margin-top: 1rem;
    display: inline-flex;
    align-items: center;
    gap: 0.8rem;
    background: rgba(0, 0, 0, 0.28);
    padding: 0.5rem 0.75rem;
    border-radius: 999px;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.3);
  }
  .pill {
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.08);
    color: #e2e8f0;
    border-radius: 999px;
    padding: 0.35rem 0.9rem;
    cursor: pointer;
  }
  .dots {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }
  .dots button {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    border: none;
    background: rgba(255, 255, 255, 0.35);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .dots button.active {
    width: 24px;
    background: #fff;
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
    margin: 0.3rem 0 0.8rem;
    color: #e2e8f0;
  }
  .content {
    max-width: 960px;
    margin: -30px auto 0;
    padding: 1.5rem;
  }
  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  .card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 1rem 1.2rem;
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.25);
  }
  .text {
    white-space: pre-wrap;
  }
  .gallery {
    margin-top: 1rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.6rem;
  }
  .thumb-btn {
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  .gallery img {
    width: 100%;
    height: 160px;
    object-fit: cover;
    display: block;
  }
  .lightbox {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: grid;
    place-items: center;
    z-index: 50;
    padding: 1rem;
  }
  .lightbox-inner {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
    display: grid;
    place-items: center;
  }
  .lightbox img {
    max-width: 90vw;
    max-height: 85vh;
    object-fit: contain;
    border-radius: 14px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  }
  .lightbox .close {
    position: absolute;
    top: 0.6rem;
    right: 0.6rem;
    border: none;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    font-size: 1.4rem;
    border-radius: 999px;
    width: 34px;
    height: 34px;
    cursor: pointer;
  }
  .lightbox .nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    border: none;
    background: rgba(0, 0, 0, 0.4);
    color: white;
    font-size: 1.8rem;
    border-radius: 999px;
    width: 42px;
    height: 42px;
    cursor: pointer;
  }
  .lightbox .nav.prev { left: -54px; }
  .lightbox .nav.next { right: -54px; }
</style>
