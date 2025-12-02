<script lang="ts">
  import { supabase } from "$lib/supabaseClient";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  type ReiseDetail = {
    images?: string[];
    title?: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    rating?: number | null;
    with_whom?: string;
    cost?: number | null;
    description?: string;
    [key: string]: any;
  };

  let reise: ReiseDetail | null = null;
  let loading: boolean = true;
  let errorMessage: string = "";
  let currentIndex: number = 0;

  onMount(async () => {
    const id = $page.params.id;

    const { data, error } = await supabase
      .from("reisen")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(error);
      errorMessage = "Reise konnte nicht geladen werden.";
    } else {
      reise = data;
    }

    loading = false;
  });

  function prevImage() {
    if (!reise?.images || !reise.images.length) return;
    currentIndex = (currentIndex - 1 + reise.images.length) % reise.images.length;
  }

  function nextImage() {
    if (!reise?.images || !reise.images.length) return;
    currentIndex = (currentIndex + 1) % reise.images.length;
  }

  function goBack() {
    goto("/reisen");
  }
</script>

<button class="back" on:click={goBack}>← Zurück</button>

{#if loading}
  <p style="margin-left:3rem;">Lädt...</p>
{:else if errorMessage}
  <p style="margin-left:3rem;">{errorMessage}</p>
{:else if !reise}
  <p style="margin-left:3rem;">Reise nicht gefunden.</p>
{:else}
  <div class="detail-card">
    <div class="image-area">
      {#if reise.images && reise.images.length > 0}
        <img src={reise.images[currentIndex]} alt={`Bild ${currentIndex + 1}`} />

        <button class="nav-btn left" on:click={prevImage}>‹</button>
        <button class="nav-btn right" on:click={nextImage}>›</button>

        <div class="thumbs">
          {#each reise.images as img, i}
            <button
              class:active={i === currentIndex}
              on:click={() => currentIndex = i}
            >
              Bild {i + 1}
            </button>
          {/each}
        </div>
      {:else}
        <div class="image-placeholder">Keine Bilder vorhanden</div>
      {/if}
    </div>

    <div class="info">
      <h1>{reise.title}</h1>

      <p><strong>Ort:</strong> {reise.location}</p>
      <p><strong>Zeitraum:</strong> {reise.start_date} – {reise.end_date}</p>
      {#if reise.rating != null}
        <p><strong>Bewertung:</strong> {reise.rating}</p>
      {/if}
      {#if reise.with_whom}
        <p><strong>Mit wem:</strong> {reise.with_whom}</p>
      {/if}
      {#if reise.cost != null}
        <p><strong>Kosten:</strong> {reise.cost}</p>
      {/if}

      <h3 style="margin-top:1.5rem;">Beschreibung</h3>
      <p>{reise.description}</p>
    </div>
  </div>
{/if}

<style>
  .back {
    margin: 2rem 3rem 1rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
  }

  .detail-card {
    margin: 0 3rem 3rem;
    padding: 2rem;
    background: #f3f4f6;
    border-radius: 30px;
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    gap: 2.5rem;
    align-items: center;
  }

  .image-area {
    position: relative;
    border-radius: 24px;
    overflow: hidden;
    background: #e5e7eb;
    min-height: 320px;
  }

  .image-area img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .image-placeholder {
    width: 100%;
    height: 100%;
    display:flex;
    align-items:center;
    justify-content:center;
    color:#6b7280;
  }

  .nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    border-radius: 999px;
    border: none;
    width: 40px;
    height: 40px;
    background: #111827;
    color: white;
    cursor: pointer;
  }
  .nav-btn.left { left: 12px; }
  .nav-btn.right { right: 12px; }

  .thumbs {
    position: absolute;
    left: 16px;
    bottom: 16px;
    display:flex;
    gap:0.5rem;
  }
  .thumbs button {
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    border: 1px solid #111827;
    background:white;
    cursor:pointer;
    font-size:0.8rem;
  }
  .thumbs button.active {
    background:#111827;
    color:white;
  }

  .info h1 {
    font-size: 2.4rem;
    margin-bottom: 1rem;
  }
</style>
