<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";
  import { supabase } from "$lib/supabaseClient";
  import TripCarousel from "../../lib/components/TripCarousel.svelte";

  type Trip = {
    id: string;
    user_id: string;
    title: string;
    location: string;
    with_whom: string | null;
    cost: number | null;
    rating: number | null;
    description: string | null;
    start_date: string | null;
    end_date: string | null;
    images: string[] | null;
    lat?: number | null;
    lng?: number | null;
  };

  type Bucket = {
    id: string;
    title: string;
    location: string | null;
    year: string | null;
    lat?: number | null;
    lng?: number | null;
  };

  const heroImages = ["/landing/Berg.jpg", "/landing/Staedtetrip.jpg", "/landing/Strand.jpg"];
  const intervalMs = 8000;

  let userName = "";
  let trips: Trip[] = [];
  let loading = true;
  let errorMessage = "";
  let bucketItems: Bucket[] = [];
  let rotation = 0;
  let rotationInterval: ReturnType<typeof setInterval> | null = null;

  let globeRotation = 0;
  let globeTimer: ReturnType<typeof setInterval> | null = null;
  let pinMode: "none" | "reise" | "bucket" = "none";
  let tempPin: { x: number; y: number; z: number; lat: number; lng: number } | null = null;
  let bucketModalOpen = false;
  let bucketModalTitle = "";

  let heroIndex = 0;
  let currentTripIndex = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  $: currentTrip = trips[currentTripIndex] ?? null;
  $: prevTrip = trips.length ? trips[(currentTripIndex - 1 + trips.length) % trips.length] : null;
  $: nextTrip = trips.length ? trips[(currentTripIndex + 1) % trips.length] : null;
  $: visibleCards = (() => {
    if (!trips.length) return [];
    if (trips.length === 1) return [{ trip: currentTrip, pos: "center" }];
    if (trips.length === 2) {
      const other = trips[(currentTripIndex + 1) % 2];
      return [
        { trip: currentTrip, pos: "center" },
        { trip: other, pos: "right" }
      ];
    }
    return [
      { trip: prevTrip, pos: "left" },
      { trip: currentTrip, pos: "center" },
      { trip: nextTrip, pos: "right" }
    ];
  })();

  $: tripPins = trips
    .filter((t) => t.lat != null && t.lng != null)
    .map((t) => ({ ...projectTo2D(t.lat as number, t.lng as number), title: t.title, type: "reise" as const }));

  $: bucketPins = bucketItems
    .filter((t) => t.lat != null && t.lng != null)
    .map((t) => ({ ...projectTo2D(t.lat as number, t.lng as number), title: t.title, type: "bucket" as const }));

  onMount(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;

    if (userError || !user) {
      errorMessage = "Benutzer konnte nicht geladen werden. Bitte neu einloggen.";
      loading = false;
      return;
    }

    // Profil in Mongo syncen (best effort, nicht blockierend)
    syncProfileToMongo(user);

    const first = user.user_metadata?.first_name?.trim() ?? "";
    const last = user.user_metadata?.last_name?.trim() ?? "";
    const fullMeta = user.user_metadata?.full_name?.trim();
    const nameMeta = user.user_metadata?.name?.trim();
    const emailName = user.email ? user.email.split("@")[0] : "Benutzer";

    userName =
      (first || last ? `${first} ${last}`.trim() : "") ||
      fullMeta ||
      nameMeta ||
      emailName;

    const { data, error } = await supabase
      .from("reisen")
      .select(
        "id,user_id,title,location,with_whom,cost,rating,description,start_date,end_date,images,lat,lng"
      )
      .eq("user_id", user.id)
      .order("start_date", { ascending: true });

    const { data: bucketData, error: bucketError } = await supabase
      .from("bucketlist")
      .select("id,title,location,year,lat,lng")
      .eq("user_id", user.id)
      .order("year", { ascending: true });

    if (error || bucketError) {
      errorMessage = "Reisen oder Bucketlist konnten nicht geladen werden.";
      loading = false;
      return;
    }

    trips = (data ?? []) as Trip[];
    bucketItems = (bucketData ?? []) as Bucket[];
    loading = false;

    startSlideshow();
    startRotation();
    startGlobeSpin();
  });

  function startSlideshow() {
    if (intervalId) clearInterval(intervalId);
    if (heroImages.length <= 1 && trips.length <= 1) return;

    intervalId = setInterval(() => {
      if (heroImages.length > 1) {
        heroIndex = (heroIndex + 1) % heroImages.length;
      }
      if (trips.length > 1) {
        currentTripIndex = (currentTripIndex + 1) % trips.length;
      }
    }, intervalMs);
  }

  function prevTripSlide() {
    if (trips.length <= 1) return;
    currentTripIndex = (currentTripIndex - 1 + trips.length) % trips.length;
    heroIndex = (heroIndex - 1 + heroImages.length) % heroImages.length;
    restartInterval();
  }

  function nextTripSlide() {
    if (trips.length <= 1) return;
    currentTripIndex = (currentTripIndex + 1) % trips.length;
    heroIndex = (heroIndex + 1) % heroImages.length;
    restartInterval();
  }

  function restartInterval() {
    if (intervalId) clearInterval(intervalId);
    startSlideshow();
  }

  function cardStyle(idx: number) {
    const angle = ((rotation + idx * 120) * Math.PI) / 180;
    const r = 140;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    return `top: calc(50% + ${y}px - 70px); left: calc(50% + ${x}px - 70px);`;
  }

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
    if (rotationInterval) clearInterval(rotationInterval);
    if (globeTimer) clearInterval(globeTimer);
  });

  function startRotation() {
    if (rotationInterval) clearInterval(rotationInterval);
    rotationInterval = setInterval(() => {
      rotation = (rotation + 40) % 360;
    }, 3000);
  }

  function startGlobeSpin() {
    if (globeTimer) clearInterval(globeTimer);
    globeTimer = setInterval(() => {
      globeRotation = (globeRotation + 0.5) % 360;
    }, 50);
  }

  async function syncProfileToMongo(user: any) {
    try {
      await fetch("/api/profile/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name ?? user.user_metadata?.name,
          first_name: user.user_metadata?.first_name,
          last_name: user.user_metadata?.last_name,
          metadata: user.user_metadata ?? {}
        })
      });
    } catch (err) {
      console.warn("Profil Sync fehlgeschlagen:", err);
    }
  }

  function latLngToXYZ(lat: number, lng: number, radius = 200) {
    const phi = ((90 - lat) * Math.PI) / 180;
    const theta = ((lng + globeRotation) * Math.PI) / 180;
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    return { x, y, z };
  }

  function projectTo2D(lat: number, lng: number, size = 420) {
    const { x, y, z } = latLngToXYZ(lat, lng);
    const visible = z >= 0;
    const scale = (z + 200) / 400;
    const px = size / 2 + x * 0.8;
    const py = size / 2 + y * 0.8;
    return { x: px, y: py, z, scale, visible };
  }

  function handleSphereClick(event: MouseEvent) {
    if (pinMode === "none") return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const x = event.clientX - rect.left - cx;
    const y = event.clientY - rect.top - cy;
    const r = Math.sqrt(x * x + y * y);
    const radius = Math.min(cx, cy) * 0.9;
    if (r > radius) return;
    const lat = 90 - (r / radius) * 180;
    const lng = (Math.atan2(y, x) * 180) / Math.PI - globeRotation;
    const { x: px, y: py, z, scale, visible } = projectTo2D(lat, lng, rect.width);
    tempPin = { x: px, y: py, z: z * scale, lat, lng };
    if (pinMode === "bucket") {
      bucketModalTitle = "";
      bucketModalOpen = true;
    }
  }

  function confirmReisePin() {
    if (!tempPin) return;
    sessionStorage.setItem("pendingReisePin", JSON.stringify({ lat: tempPin.lat, lng: tempPin.lng }));
    pinMode = "none";
    tempPin = null;
  }

  function confirmBucketPin() {
    if (!tempPin || !bucketModalTitle.trim()) return;
    const newItem: Bucket = {
      id: crypto.randomUUID(),
      title: bucketModalTitle.trim(),
      location: null,
      year: null,
      lat: tempPin.lat,
      lng: tempPin.lng
    };
    bucketItems = [newItem, ...bucketItems];
    pinMode = "none";
    tempPin = null;
    bucketModalOpen = false;
  }
</script>

<svelte:head>
  <title>Reisetagebuch</title>
</svelte:head>

<div class="page">
  <div class="background">
    {#key heroIndex}
      <div
        class="bg-image"
        style={`background-image: url('${heroImages[heroIndex]}')`}
        in:fade={{ duration: 700 }}
        out:fade={{ duration: 700 }}
      ></div>
    {/key}
    <!-- transparent overlay to let hero durchscheinen -->
  </div>

  <main class="content">
    <header class="header">
      <div>
        <p class="eyebrow">Reisetagebuch</p>
        <h1>Hallo {userName}</h1>
        <p class="lede">Deine Reisen, Bucketlist und Globe in einer Ansicht.</p>
      </div>
    </header>

    {#if loading}
      <div class="info-box">Reisen werden geladen...</div>
    {:else if errorMessage}
      <div class="info-box error">{errorMessage}</div>
    {:else}
      <section class="layout">
        <div class="panel trips">
          <div class="card-cluster">
            {#if trips.length === 0}
              <div class="info-box neutral">Du hast noch keine Reisen erfasst.</div>
            {:else}
              {#each trips.slice(0, 3) as trip, i}
                <div
                  class="trip-card pos-{i}"
                  style={cardStyle(i)}
                  role="button"
                  tabindex="0"
                  on:click={() => window.location.href = `/reisen/${trip.id}`}
                  on:keydown={(e) => (e.key === "Enter" || e.key === " ") && (window.location.href = `/reisen/${trip.id}`)}
                >
                  <div
                    class="trip-img"
                    style={`background-image:url('${trip.images?.[0] ?? "/landing/Berg.jpg"}')`}
                  ></div>
                  <div class="trip-meta">
                    <span>{trip.title}</span>
                    <small>{(trip.start_date ?? "").slice(0, 4) || "—"}</small>
                  </div>
                </div>
              {/each}
              <div class="center-pin">
                <div class="pin-icon">📍</div>
              </div>
            {/if}
          </div>

          <div class="bucket">
            <div class="bucket-head">Bucket List</div>
            <div class="bucket-grid">
              {#if bucketItems.length === 0}
                <div class="pill neutral-pill">Noch keine Ziele erfasst</div>
              {:else}
                {#each bucketItems as item}
                  <div class="pill">
                    <span class="icon">📍</span>
                    <span>{item.title}{item.location ? ` in ${item.location}` : ""}</span>
                  </div>
                {/each}
              {/if}
            </div>
          </div>
        </div>

        <div class="panel globe">
          <div class="globe-head">
            <div>
              <p class="label">Weltkarte</p>
            </div>
            <div class="globe-actions">
              <button class="chip-btn reise" on:click={() => { pinMode = pinMode === "reise" ? "none" : "reise"; tempPin = null; }}>
                Reise
              </button>
              <button class="chip-btn bucket" on:click={() => { pinMode = pinMode === "bucket" ? "none" : "bucket"; tempPin = null; }}>
                Bucket
              </button>
            </div>
          </div>

          <div
            class="sphere"
            style={`--cursor:${pinMode !== "none" ? "crosshair" : "default"};`}
            on:click={handleSphereClick}
          >
            <svg viewBox="-250 -250 500 500" class="globe-svg">
              <defs>
                <linearGradient id="globeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#3b82f6" />
                  <stop offset="100%" stop-color="#1d4ed8" />
                </linearGradient>
              </defs>
              <circle cx="0" cy="0" r="200" fill="url(#globeGradient)" />
              {#each Array(6) as _, i}
                <circle cx="0" cy="0" r={60 + i * 25} fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1" />
              {/each}
              {#each Array(6) as _, i}
                <line
                  x1="-220"
                  y1="0"
                  x2="220"
                  y2="0"
                  stroke="rgba(255,255,255,0.18)"
                  stroke-width="1"
                  transform={`rotate(${i * 30})`}
                />
              {/each}
              <ellipse cx="0" cy="0" rx="200" ry="25" fill="rgba(255,255,255,0.08)" />
            </svg>

            {#each tripPins as pin, idx}
              {#if pin.visible}
                <div
                  class="marker trip"
                  style={`transform: translate(${pin.x}px, ${pin.y}px) scale(${pin.scale});`}
                  title={pin.title}
                ></div>
              {/if}
            {/each}
            {#each bucketPins as pin, idx}
              {#if pin.visible}
                <div
                  class="marker bucket"
                  style={`transform: translate(${pin.x}px, ${pin.y}px) scale(${pin.scale});`}
                  title={pin.title}
                ></div>
              {/if}
            {/each}

            {#if tempPin}
              <div
                class="marker temp"
                style={`transform: translate(${tempPin.x}px, ${tempPin.y}px) scale(1);`}
              ></div>
            {/if}
          </div>

          <div class="legend">
            <span class="dot reise"></span> Bereiste Orte
            <span class="dot bucket"></span> Bucket List
          </div>

          {#if pinMode !== "none"}
            <div class="pin-actions">
              {#if tempPin}
                <div class="coords">Lat: {tempPin.lat.toFixed(2)}, Lng: {tempPin.lng.toFixed(2)}</div>
              {:else}
                <div class="coords">Klicke auf den Globus, um einen Pin zu setzen.</div>
              {/if}
              <div class="confirm-actions">
                <button class="secondary-btn" on:click={() => { pinMode = "none"; tempPin = null; }}>
                  Abbrechen
                </button>
                {#if pinMode === "reise"}
                  <button class="danger-btn" on:click={confirmReisePin} disabled={!tempPin}>Bestätigen</button>
                {:else}
                  <button class="primary-btn" on:click={() => (bucketModalOpen = true)} disabled={!tempPin}>
                    Bestätigen
                  </button>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      </section>
    {/if}
  </main>

  {#if bucketModalOpen}
    <div
      class="modal-backdrop"
      role="button"
      tabindex="0"
      aria-label="Schliessen"
      on:click={() => { bucketModalOpen = false; pinMode = "none"; }}
      on:keydown={(e) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") { bucketModalOpen = false; pinMode = "none"; } }}
    >
      <div class="modal" role="dialog" aria-modal="true" tabindex="-1" on:click|stopPropagation>
        <h3>Bucket-Ort speichern</h3>
        <input
          placeholder="z.B. Machu Picchu in Peru"
          bind:value={bucketModalTitle}
          on:keydown={(e) => e.key === "Enter" && confirmBucketPin()}
        />
        <div class="confirm-actions">
          <button class="secondary-btn" on:click={() => { bucketModalOpen = false; pinMode = "none"; tempPin = null; }}>
            Abbrechen
          </button>
          <button class="primary-btn" on:click={confirmBucketPin} disabled={!bucketModalTitle.trim() || !tempPin}>
            Speichern
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
      sans-serif;
  }

  .page {
    position: relative;
    min-height: 100vh;
    color: #0b0b0b;
    overflow: hidden;
  }

  .background {
    position: fixed;
    inset: 0;
    overflow: hidden;
    z-index: 0;
  }

  .bg-image {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    filter: brightness(0.6);
  }

  .bg-overlay {
    display: none;
  }

  .content {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 4rem 1.5rem 3.5rem;
    color: #0b0b0b;
    max-width: 1400px;
    margin: 0 auto;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(8px);
  }

  .header {
    color: white;
    text-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    margin-bottom: 0.8rem;
  }

  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #cbd5e1;
    margin: 0;
  }

  .header h1 {
    margin: 0.2rem 0 0.3rem;
    font-size: clamp(2.4rem, 2.6vw + 1rem, 3.4rem);
    font-weight: 850;
  }

  .lede {
    margin: 0;
    color: #e2e8f0;
    font-size: 1.05rem;
  }

  .layout {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 1.6rem;
    align-items: start;
  }

  .panel {
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 22px;
    padding: 1.4rem;
    backdrop-filter: blur(4px);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.2);
  }

  .trips {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }

  .globe-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.6rem;
  }

  .globe-actions {
    display: flex;
    gap: 0.5rem;
  }

  .chip-btn {
    border: none;
    padding: 0.55rem 0.9rem;
    border-radius: 12px;
    color: #fff;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.18);
  }
  .chip-btn.reise {
    background: #ef4444;
  }
  .chip-btn.bucket {
    background: #2563eb;
  }

  .card-cluster {
    position: relative;
    min-height: 380px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 18px;
    overflow: hidden;
  }

  .trip-card {
    position: absolute;
    width: 140px;
    height: 140px;
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 18px 35px rgba(0, 0, 0, 0.28);
    transition: transform 0.2s ease;
    transform-origin: center;
  }

  .trip-card:hover {
    transform: scale(1.06);
  }

  .trip-card .trip-img {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
  }

  .trip-meta {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 0.7rem;
    background: linear-gradient(180deg, transparent 40%, rgba(0, 0, 0, 0.55));
    color: #fff;
    font-weight: 700;
  }

  .trip-meta small {
    font-weight: 500;
    color: #e5e7eb;
  }

  .trip-card.pos-0 {
    top: calc(50% - 70px + 140px * sin(var(--rot0)));
    left: calc(50% - 70px + 140px * cos(var(--rot0)));
  }
  .trip-card.pos-1 {
    top: calc(50% - 70px + 140px * sin(var(--rot1)));
    left: calc(50% - 70px + 140px * cos(var(--rot1)));
  }
  .trip-card.pos-2 {
    top: calc(50% - 70px + 140px * sin(var(--rot2)));
    left: calc(50% - 70px + 140px * cos(var(--rot2)));
  }

  .center-pin {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 88px;
    height: 88px;
    border-radius: 50%;
    background: #2563eb;
    display: grid;
    place-items: center;
    color: #fff;
    font-size: 2rem;
    box-shadow: 0 20px 40px rgba(37, 99, 235, 0.35);
  }

  .bucket {
    margin-top: 0.2rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 1rem;
  }

  .bucket-head {
    text-align: center;
    font-weight: 700;
    color: #0b0b0b;
    margin-bottom: 0.8rem;
  }

  .bucket-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.6rem;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.65rem 0.85rem;
    border-radius: 999px;
    background: #dbeafe;
    color: #0f172a;
    font-weight: 600;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 8px 16px rgba(37, 99, 235, 0.15);
  }

  .pill .icon {
    font-size: 1rem;
  }

  .neutral-pill {
    background: rgba(255, 255, 255, 0.4);
    color: #1f2937;
  }

  .globe {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .sphere {
    position: relative;
    width: 420px;
    max-width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, #2f7bff, #0d47c2 60%, #0b378f 100%);
    box-shadow: 0 22px 46px rgba(0, 0, 0, 0.35);
    overflow: hidden;
    cursor: var(--cursor, default);
  }

  .sphere::after {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.18), transparent 50%);
  }

  .marker {
    position: absolute;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.08);
  }

  .marker.trip {
    background: #ef4444;
  }
  .marker.bucket {
    background: #2563eb;
  }
  .marker.temp {
    background: #10b981;
    box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.3);
  }

  /* simple preset positions for markers */
  .m-0 {
    top: 18%;
    left: 60%;
  }
  .m-1 {
    top: 42%;
    left: 30%;
  }
  .m-2 {
    top: 65%;
    left: 70%;
  }
  .m-3 {
    top: 32%;
    left: 78%;
  }
  .b-0 {
    top: 55%;
    left: 18%;
  }
  .b-1 {
    top: 22%;
    left: 38%;
  }
  .b-2 {
    top: 70%;
    left: 50%;
  }
  .b-3 {
    top: 48%;
    left: 82%;
  }

  .legend {
    display: flex;
    gap: 0.8rem;
    align-items: center;
    color: #0f172a;
    background: rgba(255, 255, 255, 0.85);
    padding: 0.6rem 0.9rem;
    border-radius: 12px;
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 6px;
  }

  .dot.reise {
    background: #ef4444;
  }
  .dot.bucket {
    background: #2563eb;
  }

  .pin-actions {
    margin-top: 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .coords {
    font-size: 0.95rem;
    color: #0f172a;
  }

  .confirm-actions {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: grid;
    place-items: center;
    z-index: 20;
  }

  .modal {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 16px;
    padding: 1.2rem 1.4rem;
    width: min(420px, 90vw);
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35);
  }

  .modal h3 {
    margin: 0 0 0.8rem;
    color: #0f172a;
  }

  .modal input {
    width: 100%;
    padding: 0.8rem;
    border-radius: 12px;
    border: 1px solid #d4d4d8;
    margin-bottom: 0.8rem;
  }

  .info-box {
    background: white;
    color: #0f172a;
    padding: 1.2rem 1.5rem;
    border-radius: 1rem;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.25);
    max-width: 420px;
    text-align: center;
  }

  .info-box.error {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fca5a5;
  }

  .info-box.neutral {
    background: rgba(255, 255, 255, 0.92);
    color: #1f2937;
  }

  @media (max-width: 600px) {
    .content {
      padding: 4.5rem 1rem 2.5rem;
    }
    .layout {
      grid-template-columns: 1fr;
    }
    .card-cluster {
      min-height: 300px;
    }
  }
</style>
