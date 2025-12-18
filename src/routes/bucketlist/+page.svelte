<script lang="ts">
  import { supabase } from "$lib/supabaseClient";
  import { onMount, onDestroy } from "svelte";
  import { t } from "$lib/i18n";

  type BucketItem = {
    id: string;
    title: string;
    location: string | null;
    start_date: string | null;
    end_date: string | null;
    cover_image_url: string | null;
    year?: string | null;
  };

  const fallbackSlides = [
    "/landing/Berg.jpg",
    "/landing/Staedtetrip.jpg",
    "/landing/Strand.jpg"
  ];

  let currentBackground = 0;
  let bgInterval: ReturnType<typeof setInterval> | null = null;

  let items: BucketItem[] = [];
  let loading = true;
  let errorMessage = "";

  function nextBackground() {
    currentBackground = (currentBackground + 1) % fallbackSlides.length;
  }

  onMount(() => {
    bgInterval = setInterval(nextBackground, 6000);
    loadBucketlist();
  });

  async function loadBucketlist() {
    loading = true;
    errorMessage = "";

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      errorMessage = "Bitte melde dich neu an.";
      loading = false;
      return;
    }

    const { data, error } = await supabase
      .from("bucketlist")
      .select("*")
      .eq("user_id", user.id)
      .order("title", { ascending: true });

    if (error) {
      errorMessage = $t("bucket.error");
    } else if (data) {
      items = data as BucketItem[];
    }

    loading = false;
  }

  onDestroy(() => {
    if (bgInterval) clearInterval(bgInterval);
  });
</script>

<div class="background-container">
  {#each fallbackSlides as slide, i}
    <div
      class="bg-slide {i === currentBackground ? 'active' : ''}"
      style={`background-image: url('${slide}');`}
    ></div>
  {/each}
</div>
<div class="overlay"></div>

<div class="page-layer">
  <div class="header-row">
    <h1>{$t("bucket.title")}</h1>

    <a class="new-item-button" href="/bucketlist/neu">
      {$t("bucket.cta")}
    </a>
  </div>

  {#if errorMessage}
    <p class="error">{errorMessage}</p>
  {/if}

  {#if loading}
    <p class="loading">{$t("bucket.loading")}</p>
  {:else if items.length > 0}
    <div class="items-list">
      {#each items as item}
        <article class="item-card">
          <a class="card-action" href={`/bucketlist/${item.id}`} aria-label="Details öffnen">
            <span>→</span>
          </a>
          <div class="item-image">
            {#if item.cover_image_url}
              <img src={item.cover_image_url} alt={item.title} />
            {:else}
              <div class="item-image-placeholder">Kein Bild</div>
            {/if}
          </div>
          <div class="item-body">
            <h2 class="item-title">{item.title}</h2>
            <p class="item-dates">
              {$t("bucket.itemYear").replace("{year}", item.year ?? "-")}
            </p>
            <p class="item-location">{item.location}</p>

            <div class="item-actions">
              <a class="details-button" href={`/bucketlist/${item.id}`}>
                Mehr anzeigen
              </a>
            </div>
          </div>
        </article>
      {/each}
    </div>
  {:else}
    <p class="no-items">
      {$t("bucket.empty")}
    </p>
  {/if}
</div>

<style>
  .background-container {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100vh;
    overflow: hidden;
    z-index: -2;
  }

  .bg-slide {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    opacity: 0;
    transition: opacity 2.5s ease-in-out;
  }

  .bg-slide.active {
    opacity: 1;
  }

  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 30, 0.5);
    z-index: -1;
  }

  .page-layer {
    position: relative;
    max-width: 1600px;
    margin: 0 auto;
    min-height: 100vh;
    padding: 110px 80px 80px;
    box-sizing: border-box;
    color: #fff;
  }

  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 40px;
  }

  h1 {
    font-size: 2.6rem;
    margin: 0;
  }

  .new-item-button {
    background: #020b1f;
    color: #fff;
    border-radius: 999px;
    padding: 12px 24px;
    font-size: 0.95rem;
    font-weight: 500;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  }

  .new-item-button::before {
    content: "+";
    font-size: 1.4rem;
  }

  .items-list {
    display: flex;
    flex-direction: column;
    gap: 28px;
    max-width: 920px;
  }

  .item-card {
    width: 100%;
    border-radius: 26px;
    background: #ffffff;
    color: #111827;
    box-shadow: 0 14px 32px rgba(0, 0, 0, 0.4);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .card-action {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.65);
    color: #fff;
    display: grid;
    place-items: center;
    text-decoration: none;
    font-size: 1.1rem;
    z-index: 2;
  }

  .item-image {
    height: 200px;
    background: #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .item-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .item-image-placeholder {
    color: #6b7280;
  }

  .item-body {
    padding: 20px 22px 22px;
  }

  .item-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0 0 6px;
  }

  .item-dates,
  .item-location {
    font-size: 0.95rem;
    color: #4b5563;
  }

  .item-location {
    margin-top: 2px;
  }

  .item-actions {
    margin-top: 16px;
    display: flex;
    justify-content: flex-start;
  }

  .details-button {
    padding: 8px 18px;
    border-radius: 999px;
    border: 1px solid #111827;
    background: transparent;
    font-size: 0.9rem;
    cursor: pointer;
    text-decoration: none;
    color: #111827;
  }

  .no-items,
  .loading {
    font-size: 1rem;
    color: #e5e7eb;
    margin-top: 30px;
  }

  .error {
    font-size: 1rem;
    color: #fecdd3;
    margin-top: 20px;
  }

  @media (max-width: 960px) {
    .page-layer {
      padding: 100px 24px 40px;
    }
  }
</style>
