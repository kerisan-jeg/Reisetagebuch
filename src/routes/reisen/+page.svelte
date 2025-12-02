<script lang="ts">
  import { supabase } from "$lib/supabaseClient";
  import { onMount } from "svelte";

  type Trip = {
    id: string;
    title: string;
    location: string | null;
    start_date: string | null;
    end_date: string | null;
    cover_image_url: string | null;
  };

  const fallbackSlides = [
    "/landing/Berg.jpg",
    "/landing/Staedtetrip.jpg",
    "/landing/Strand.jpg"
  ];

  let currentBackground = 0;
  let bgInterval: ReturnType<typeof setInterval> | null = null;

  let trips: Trip[] = [];
  let loading = true;

  function nextBackground() {
    currentBackground = (currentBackground + 1) % fallbackSlides.length;
  }

  onMount(async () => {
    bgInterval = setInterval(nextBackground, 6000);

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Kein Benutzer:", userError);
      loading = false;
      return;
    }

    const { data, error } = await supabase
      .from("reisen")
      .select("*")
      .eq("user_id", user.id)
      .order("start_date", { ascending: true });

    if (error) {
      console.error("Fehler beim Laden der Reisen:", error);
    } else if (data) {
      trips = data as Trip[];
    }

    loading = false;

    return () => {
      if (bgInterval) clearInterval(bgInterval);
    };
  });
</script>

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

  .new-trip-button {
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

  .new-trip-button::before {
    content: "+";
    font-size: 1.4rem;
  }

  /* Liste statt Grid */

  .trips-list {
    display: flex;
    flex-direction: column;
    gap: 28px;
    max-width: 920px;
  }

  .trip-card {
    width: 100%;
    border-radius: 26px;
    background: #ffffff;
    color: #111827;
    box-shadow: 0 14px 32px rgba(0, 0, 0, 0.4);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .trip-image {
    height: 200px;
    background: #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .trip-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .trip-image-placeholder {
    color: #6b7280;
  }

  .trip-body {
    padding: 20px 22px 22px;
  }

  .trip-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0 0 6px;
  }

  .trip-dates,
  .trip-location {
    font-size: 0.95rem;
    color: #4b5563;
  }

  .trip-location {
    margin-top: 2px;
  }

  .trip-actions {
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

  .no-trips,
  .loading {
    font-size: 1rem;
    color: #e5e7eb;
    margin-top: 30px;
  }

  @media (max-width: 960px) {
    .page-layer {
      padding: 100px 24px 40px;
    }
  }
</style>

<!-- Hintergrund -->
<div class="background-container">
  {#each fallbackSlides as slide, i}
    <div
      class="bg-slide {i === currentBackground ? 'active' : ''}"
      style={`background-image: url('${slide}');`}
    ></div>
  {/each}
</div>
<div class="overlay"></div>

<!-- Inhalt -->
<div class="page-layer">
  <div class="header-row">
    <h1>Meine Reisen</h1>

    <a class="new-trip-button" href="/reisen/neu">
      Neue Reise hinzufuegen
    </a>
  </div>

  {#if loading}
    <p class="loading">Reisen werden geladen…</p>
  {:else if trips.length > 0}
    <div class="trips-list">
      {#each trips as trip}
        <article class="trip-card">
          <div class="trip-image">
            {#if trip.cover_image_url}
              <img src={trip.cover_image_url} alt={trip.title} />
            {:else}
              <div class="trip-image-placeholder">Kein Bild</div>
            {/if}
          </div>
          <div class="trip-body">
            <h2 class="trip-title">{trip.title}</h2>
            <p class="trip-dates">
              {trip.start_date} – {trip.end_date}
            </p>
            <p class="trip-location">{trip.location}</p>

            <div class="trip-actions">
              <a class="details-button" href={`/reisen/${trip.id}`}>
                Mehr anzeigen
              </a>
            </div>
          </div>
        </article>
      {/each}
    </div>
  {:else}
    <p class="no-trips">
      Du hast noch keine Reisen angelegt. Klicke oben auf „Neue Reise hinzufuegen“.
    </p>
  {/if}
</div>
