<script lang="ts">
  import { onMount } from "svelte";
  import { supabase } from "$lib/supabaseClient";
  import { page } from "$app/stores";
  import { get } from "svelte/store";

  type BucketItem = {
    id: string;
    title: string;
    location: string | null;
    description: string | null;
    cover_image_url: string | null;
    images: string[] | null;
  };

  let item: BucketItem | null = null;
  let loading = true;
  let errorMessage = "";
  let currentIndex = 0;

  onMount(async () => {
    const id = get(page).params.id;

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      errorMessage = "Bitte neu einloggen.";
      loading = false;
      return;
    }

    const { data, error } = await supabase
      .from("bucketlist")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      errorMessage = "Eintrag konnte nicht geladen werden.";
      loading = false;
      return;
    }

    item = data as BucketItem;
    loading = false;
  });

  const nextImage = () => {
    if (!item?.images?.length) return;
    currentIndex = (currentIndex + 1) % item.images.length;
  };

  const prevImage = () => {
    if (!item?.images?.length) return;
    currentIndex = (currentIndex - 1 + item.images.length) % item.images.length;
  };
</script>

<svelte:head>
  <title>{item ? item.title : "Bucketlist Eintrag"}</title>
</svelte:head>

{#if loading}
  <p class="status">Lädt...</p>
{:else if errorMessage}
  <p class="status error">{errorMessage}</p>
{:else if item}
  <div class="page">
    <div class="gallery">
      {#if item.images?.length}
        <button class="nav-btn" on:click={prevImage} aria-label="Vorheriges Bild">‹</button>
        <img src={item.images[currentIndex]} alt={item.title} />
        <button class="nav-btn" on:click={nextImage} aria-label="Nächstes Bild">›</button>
        <p class="counter">{currentIndex + 1} / {item.images.length}</p>
      {:else if item.cover_image_url}
        <img src={item.cover_image_url} alt={item.title} />
      {:else}
        <div class="placeholder">Kein Bild</div>
      {/if}
    </div>

    <div class="details">
      <h1>{item.title}</h1>
      {#if item.location}<p class="meta"><strong>Ort:</strong> {item.location}</p>{/if}
      {#if item.description}
        <div class="description">
          <strong>Beschreibung / Stichpunkte:</strong>
          <p>{item.description}</p>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .page {
    display: grid;
    gap: 1.5rem;
    padding: 2rem 1.5rem 3rem;
    max-width: 1100px;
    margin: 0 auto;
  }

  .status {
    padding: 2rem;
    text-align: center;
  }

  .status.error {
    color: #b91c1c;
  }

  .gallery {
    position: relative;
    border-radius: 20px;
    overflow: hidden;
    background: #f3f4f6;
    min-height: 320px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .gallery img {
    width: 100%;
    max-height: 520px;
    object-fit: cover;
    display: block;
  }

  .placeholder {
    padding: 2rem;
    color: #6b7280;
  }

  .nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    border: none;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    cursor: pointer;
  }

  .nav-btn:first-of-type {
    left: 12px;
  }

  .nav-btn:last-of-type {
    right: 12px;
  }

  .counter {
    position: absolute;
    bottom: 10px;
    right: 14px;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.9rem;
  }

  .details h1 {
    margin: 0 0 0.5rem;
  }

  .meta {
    margin: 0.3rem 0;
  }

  .description {
    margin-top: 1rem;
    line-height: 1.4;
  }
</style>
