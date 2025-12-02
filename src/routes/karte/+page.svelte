<script lang="ts">
  import { supabase } from "$lib/supabaseClient";
  import { onMount } from "svelte";

  type TripPoint = {
    id: string;
    title: string;
    location: string | null;
    lat?: number | null;
    lng?: number | null;
    source: "reise" | "bucketlist";
  };

  const fallbackSlides = ["/landing/Berg.jpg", "/landing/Staedtetrip.jpg", "/landing/Strand.jpg"];

  let currentBackground = 0;
  let bgInterval: ReturnType<typeof setInterval> | null = null;

  let points: TripPoint[] = [];
  let loading = true;
  let errorMessage = "";
  let mapContainer: HTMLDivElement;
  let L: any;
  let map: any;

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
      errorMessage = "Bitte neu einloggen.";
      loading = false;
      return;
    }

    const [reisenRes, bucketRes] = await Promise.all([
      supabase.from("reisen").select("id,title,location,lat,lng").eq("user_id", user.id),
      supabase.from("bucketlist").select("id,title,location,lat,lng").eq("user_id", user.id)
    ]);

    const collected: TripPoint[] = [];

    if (reisenRes.data) {
      reisenRes.data.forEach((r) =>
        collected.push({
          id: r.id,
          title: r.title,
          location: r.location,
          lat: r.lat ?? null,
          lng: r.lng ?? null,
          source: "reise"
        })
      );
    }

    if (bucketRes.data) {
      bucketRes.data.forEach((b) =>
        collected.push({
          id: b.id,
          title: b.title,
          location: b.location,
          lat: b.lat ?? null,
          lng: b.lng ?? null,
          source: "bucketlist"
        })
      );
    }

    if (reisenRes.error) {
      console.error(reisenRes.error);
      errorMessage = "Reisen konnten nicht geladen werden.";
    } else if (bucketRes.error) {
      console.error(bucketRes.error);
      errorMessage = "Bucketlist konnte nicht geladen werden.";
    }

    points = collected;
    loading = false;

    // Leaflet nur im Browser
    const leaflet = await import("leaflet");
    L = leaflet.default;

    map = L.map(mapContainer).setView([51.1657, 10.4515], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap-Mitwirkende"
    }).addTo(map);

    const markerPoints = points.filter((p) => p.lat && p.lng);
    markerPoints.forEach((p) => {
      L.marker([p.lat as number, p.lng as number])
        .addTo(map)
        .bindPopup(`<b>${p.title}</b><br>${p.location ?? ""}`);
    });

    if (markerPoints.length > 0) {
      const bounds = L.latLngBounds(markerPoints.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  });
</script>

<svelte:head>
  <title>Karte</title>
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
    crossorigin=""
  />
</svelte:head>

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
    margin-bottom: 24px;
  }

  h1 {
    font-size: 2.6rem;
    margin: 0;
  }

  .status {
    font-size: 1rem;
    color: #e5e7eb;
    margin: 10px 0 20px;
  }

  .map-card {
    background: rgba(255, 255, 255, 0.96);
    border-radius: 26px;
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .map-header {
    padding: 16px 20px;
    color: #0f172a;
    border-bottom: 1px solid #e5e7eb;
    font-weight: 600;
  }

  .map-container {
    min-height: 420px;
  }

  .map-container :global(.leaflet-container) {
    width: 100%;
    height: 420px;
  }

  .info {
    font-size: 0.95rem;
    color: #1f2937;
    padding: 16px 20px;
  }

  @media (max-width: 960px) {
    .page-layer {
      padding: 100px 24px 40px;
    }
  }
</style>

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
    <h1>Karte</h1>
  </div>

  {#if loading}
    <p class="status">Karte wird geladen...</p>
  {:else if errorMessage}
    <p class="status">{errorMessage}</p>
  {:else}
    <div class="map-card">
      <div class="map-header">Reisen & Bucketlist</div>
      <div class="map-container" bind:this={mapContainer}></div>
      {#if points.filter((p) => p.lat && p.lng).length === 0}
        <div class="info">
          Noch keine Ziele mit Koordinaten vorhanden. Füge Lat/Lng zu Reisen oder Bucketlist hinzu, um sie auf
          der Karte zu sehen.
        </div>
      {/if}
    </div>
  {/if}
</div>
