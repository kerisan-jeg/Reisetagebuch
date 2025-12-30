<script lang="ts">
  import { supabase } from "$lib/supabaseClient";
  import { onMount, onDestroy, tick } from "svelte";
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
  let deletingId: string | null = null;
  let openMenuId: string | null = null;
  let firstMenuItem: HTMLAnchorElement | null = null;
  let currentUserId: string | null = null;

  function nextBackground() {
    currentBackground = (currentBackground + 1) % fallbackSlides.length;
  }

  function handleGlobalKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      openMenuId = null;
    }
  }

  function handleGlobalClick(event: MouseEvent) {
    if (!openMenuId) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.closest(".card-menu") || target.closest(".card-action"))) return;
    openMenuId = null;
  }

  function handleMenuBlur(event: FocusEvent) {
    const related = event.relatedTarget as HTMLElement | null;
    if (!related || related.closest(".card-menu") || related.closest(".card-action")) return;
    openMenuId = null;
  }

  onMount(() => {
    bgInterval = setInterval(nextBackground, 6000);
    loadBucketlist();
    window.addEventListener("keydown", handleGlobalKeydown);
    window.addEventListener("click", handleGlobalClick);
  });

  async function loadBucketlist() {
    loading = true;
    errorMessage = "";

    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        errorMessage = $t("bucket.authRequired");
        return;
      }
      currentUserId = user.id;

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
    } catch (err) {
      console.error("Bucketlist load failed:", err);
      errorMessage = $t("bucket.error");
    } finally {
      loading = false;
    }
  }

  $: if (openMenuId) {
    tick().then(() => {
      firstMenuItem?.focus();
    });
  }

  async function deleteItem(id: string) {
    if (deletingId) return;
    if (!confirm($t("bucket.delete.confirm"))) return;
    deletingId = id;
    errorMessage = "";
    const { error } = await supabase.from("bucketlist").delete().eq("id", id);
    if (error) {
      errorMessage = $t("bucket.delete.error");
    } else {
      // best effort: auch Mongo-Cache loeschen
      if (currentUserId) {
        fetch(`/api/bucketlist/${id}?user_id=${encodeURIComponent(currentUserId)}`, { method: "DELETE" }).catch(
          (err) => console.warn("Mongo Delete ignoriert:", err)
        );
      }
      items = items.filter((i) => i.id !== id);
    }
    deletingId = null;
    openMenuId = null;
  }

  onDestroy(() => {
    if (bgInterval) clearInterval(bgInterval);
    window.removeEventListener("keydown", handleGlobalKeydown);
    window.removeEventListener("click", handleGlobalClick);
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
    <p class="error" role="alert">{errorMessage}</p>
  {/if}

  {#if loading}
    <p class="loading" role="status" aria-live="polite">{$t("bucket.loading")}</p>
  {:else if items.length > 0}
    <div class="items-list">
      {#each items as item}
        <article class="item-card">
          <button
            class="card-action"
            type="button"
            aria-label="Menue oeffnen"
            aria-haspopup="true"
            aria-expanded={openMenuId === item.id}
            on:click={() => (openMenuId = openMenuId === item.id ? null : item.id)}
            on:blur={handleMenuBlur}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <circle cx="12" cy="5" r="2" fill="currentColor" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
              <circle cx="12" cy="19" r="2" fill="currentColor" />
            </svg>
          </button>
          {#if openMenuId === item.id}
            <div class="card-menu" role="menu" aria-label="Aktionen Bucketlist-Eintrag" on:blur={handleMenuBlur}>
              <a
                href={`/bucketlist/${item.id}`}
                role="menuitem"
                bind:this={firstMenuItem}
              >
                {$t("bucket.menu.more")}
              </a>
              <button
                class="menu-danger"
                on:click={() => deleteItem(item.id)}
                disabled={deletingId === item.id}
                role="menuitem"
              >
                {deletingId === item.id ? $t("bucket.delete.loading") : $t("bucket.menu.delete")}
              </button>
            </div>
          {/if}
          <div class="item-image">
            {#if item.cover_image_url}
              <img src={item.cover_image_url} alt={item.title} />
            {:else}
              <div class="item-image-placeholder">Kein Bild</div>
            {/if}
          </div>
          <div class="item-body">
            <h2 class="item-title">{item.title}</h2>
            {#if item.year}
              <p class="item-dates">{item.year}</p>
            {/if}
            {#if item.location}
              <p class="item-location">{item.location}</p>
            {/if}

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
    width: 38px;
    height: 38px;
    border-radius: 14px;
    background: rgba(5, 9, 20, 0.8);
    color: #fff;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, 0.12);
    cursor: pointer;
    font-size: 1.1rem;
    z-index: 3;
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

  .card-menu {
    position: absolute;
    top: 56px;
    right: 12px;
    background: rgba(6, 10, 20, 0.95);
    color: #fff;
    border-radius: 14px;
    padding: 10px 12px;
    display: grid;
    gap: 8px;
    min-width: 160px;
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.12);
    z-index: 4;
  }

  .card-menu a,
  .card-menu button {
    text-align: left;
    background: transparent;
    border: none;
    color: #e2e8f0;
    font-weight: 600;
    cursor: pointer;
    padding: 6px 4px;
    text-decoration: none;
  }

  .card-menu a:hover,
  .card-menu button:hover {
    color: #fff;
  }

  .card-menu .menu-danger {
    color: #fca5a5;
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
