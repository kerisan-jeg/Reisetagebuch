<script lang="ts">
  import { supabase } from "$lib/supabaseClient";
  import { tick } from "svelte";
  import { onDestroy, onMount } from "svelte";

  type TripPoint = {
    id: string;
    title: string;
    location: string | null;
    lat?: number | null;
    lng?: number | null;
    cover_image_url?: string | null;
    images?: string[] | null;
    source: "reise" | "bucketlist";
  };

  let loading = true;
  let errorMessage = "";

  let mapContainer: HTMLDivElement;
  let globeMapContainer: HTMLDivElement;

  let L: any;
  let map: any;
  let globeMap: any;
  let markerById: Record<string, any> = {};
  let searchMarkerMap: any = null;
  let searchMarkerGlobe: any = null;
  let userInteracting = false;

  let globeCenter = { lat: 15, lng: 0 };
  let activeView: "globe" | "map" = "globe";
  let spinTimer: ReturnType<typeof setInterval> | null = null;
  let spinPausedTimer: ReturnType<typeof setTimeout> | null = null;

  let searchTerm = "";
  let remoteSuggestions: { name: string; display: string; lat: number; lng: number }[] = [];
  let isFetchingRemote = false;
  let fetchDebounce: ReturnType<typeof setTimeout> | null = null;
  let fetchController: AbortController | null = null;
  let lastSearchCoords: [number, number] | null = null;

  const suggestedPlaces = [
    { name: "Zuerich", country: "Schweiz", lat: 47.3769, lng: 8.5417 },
    { name: "Bern", country: "Schweiz", lat: 46.948, lng: 7.4474 },
    { name: "Genf", country: "Schweiz", lat: 46.2044, lng: 6.1432 },
    { name: "Basel", country: "Schweiz", lat: 47.5596, lng: 7.5886 },
    { name: "Luzern", country: "Schweiz", lat: 47.0502, lng: 8.3093 },
    { name: "St. Gallen", country: "Schweiz", lat: 47.4245, lng: 9.3767 },
    { name: "Berlin", country: "Deutschland", lat: 52.52, lng: 13.405 },
    { name: "Hamburg", country: "Deutschland", lat: 53.5511, lng: 9.9937 },
    { name: "Paris", country: "Frankreich", lat: 48.8566, lng: 2.3522 },
    { name: "London", country: "UK", lat: 51.5072, lng: -0.1276 },
    { name: "Madrid", country: "Spanien", lat: 40.4168, lng: -3.7038 },
    { name: "Rom", country: "Italien", lat: 41.9028, lng: 12.4964 },
    { name: "New York", country: "USA", lat: 40.7128, lng: -74.006 }
  ];

  const clampLat = (lat: number) => Math.min(Math.max(lat, -85), 85);
  const normalizeLng = (lng: number) => ((lng + 180) % 360) - 180;

  function startSpin() {
    stopSpin();
    spinTimer = setInterval(() => {
      if (!globeMap || userInteracting || activeView !== "globe") return;
      const current = globeMap.getCenter();
      const lat = clampLat(current.lat);
      globeCenter = { lat, lng: normalizeLng(current.lng + 0.6) };
      globeMap.setView([globeCenter.lat, globeCenter.lng], globeMap.getZoom(), { animate: false });
    }, 120);
  }

  function stopSpin() {
    if (spinTimer) clearInterval(spinTimer);
    spinTimer = null;
  }

  function pauseSpinWithResume() {
    stopSpin();
    if (spinPausedTimer) clearTimeout(spinPausedTimer);
    spinPausedTimer = setTimeout(startSpin, 10000);
  }

  function refreshTiles(targetMap: any) {
    if (!L || !targetMap?.eachLayer) return;
    targetMap.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer && typeof layer.redraw === "function") {
        layer.redraw();
      }
    });
  }

  function clearSearchMarkers() {
    if (map && searchMarkerMap) {
      map.removeLayer(searchMarkerMap);
      searchMarkerMap = null;
    }
    if (globeMap && searchMarkerGlobe) {
      globeMap.removeLayer(searchMarkerGlobe);
      searchMarkerGlobe = null;
    }
    lastSearchCoords = null;
  }

  function setView(target: "globe" | "map") {
    activeView = target;
    stopSpin();
    const mapDefault: [number, number] = [51.1657, 10.4515];
    const globeDefault: [number, number] = [15, 0];
    clearSearchMarkers();

    setTimeout(() => {
      if (target === "globe") {
        globeCenter = { lat: globeDefault[0], lng: globeDefault[1] };
        if (globeMap) {
          globeMap.invalidateSize();
          globeMap.setView(globeDefault, 3, { animate: false });
          refreshTiles(globeMap);
        }
        startSpin();
      } else if (map) {
        map.invalidateSize();
        map.setView(mapDefault, 5, { animate: false });
        refreshTiles(map);
      }
    }, 30);
  }

  function focusFirstMatch() {
    const target =
      (remoteSuggestions.length && [remoteSuggestions[0].lat, remoteSuggestions[0].lng]) ||
      (lastSearchCoords as [number, number] | null) ||
      [suggestedPlaces[0].lat, suggestedPlaces[0].lng];

    flyToCoords(target, 6);
  }

  function flyToCoords(coords: [number, number], zoom = 6) {
    if (map) {
      map.flyTo(coords, Math.max(map.getZoom(), zoom), { animate: true });
      if (searchMarkerMap) map.removeLayer(searchMarkerMap);
      searchMarkerMap = L.marker(coords).addTo(map);
    }
    if (globeMap) {
      globeMap.flyTo(coords, Math.max(globeMap.getZoom(), zoom), { animate: true });
      if (searchMarkerGlobe) globeMap.removeLayer(searchMarkerGlobe);
      searchMarkerGlobe = L.marker(coords).addTo(globeMap);
    }
    lastSearchCoords = coords;
  }

  function queueRemoteSuggestions(term: string) {
    if (fetchDebounce) clearTimeout(fetchDebounce);
    if (!term.trim()) {
      remoteSuggestions = [];
      fetchController?.abort();
      return;
    }
    fetchDebounce = setTimeout(() => fetchRemoteSuggestions(term.trim()), 180);
  }

  async function fetchRemoteSuggestions(term: string) {
    try {
      fetchController?.abort();
      fetchController = new AbortController();
      isFetchingRemote = true;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&q=${encodeURIComponent(term)}`,
        { signal: fetchController.signal, headers: { "Accept-Language": "de" } }
      );
      if (!res.ok) throw new Error("Suche fehlgeschlagen");
      const data = await res.json();
      remoteSuggestions = data.map((item: any) => ({
        name: item.display_name?.split(",")[0] ?? item.display_name,
        display: item.display_name ?? "",
        country: item.address?.country ?? "",
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      }));
    } catch (err: any) {
      if (err?.name !== "AbortError") console.error("Suche fehlgeschlagen:", err);
    } finally {
      isFetchingRemote = false;
    }
  }

  function handleSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    searchTerm = value;
    queueRemoteSuggestions(value);
  }

  onMount(async () => {
    try {
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
        supabase.from("reisen").select("id,title,location,lat,lng,images,cover_image_url").eq("user_id", user.id),
        supabase.from("bucketlist").select("id,title,location,lat,lng,images,cover_image_url").eq("user_id", user.id)
      ]);

      const collected: TripPoint[] = [];

      reisenRes.data?.forEach((r) =>
        collected.push({
          id: r.id,
          title: r.title,
          location: r.location,
          lat: r.lat ?? null,
          lng: r.lng ?? null,
          cover_image_url: r.cover_image_url ?? null,
          images: r.images ?? null,
          source: "reise"
        })
      );

      bucketRes.data?.forEach((b) =>
        collected.push({
          id: b.id,
          title: b.title,
          location: b.location,
          lat: b.lat ?? null,
          lng: b.lng ?? null,
          cover_image_url: b.cover_image_url ?? null,
          images: b.images ?? null,
          source: "bucketlist"
        })
      );

      if (reisenRes.error) {
        errorMessage = "Reisen konnten nicht geladen werden.";
      } else if (bucketRes.error) {
        errorMessage = "Bucketlist konnte nicht geladen werden.";
      }

      // Karte sichtbar machen, Container binden, dann Maps aufbauen
      loading = false;
      await tick();
      if (!mapContainer || !globeMapContainer) {
        errorMessage = "Karte konnte nicht initialisiert werden.";
        return;
      }

      const leaflet = await import("leaflet");
      L = leaflet.default;

      // Karte (Standard)
      map = L.map(mapContainer, {
        minZoom: 2,
        maxZoom: 18,
        inertia: true
      }).setView([51.1657, 10.4515], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap-Mitwirkende"
      }).addTo(map);

      const markerPoints = collected.filter((p) => p.lat && p.lng);
      markerPoints.forEach((p) => {
        const marker = L.circleMarker([p.lat as number, p.lng as number], {
          radius: 8,
          color: p.source === "reise" ? "#e11d48" : "#2563eb",
          fillColor: p.source === "reise" ? "#e11d48" : "#2563eb",
          fillOpacity: 0.95,
          weight: 2
        }).addTo(map);

        const img = (p.images?.[0] ?? p.cover_image_url) || "";
        const html = `
          <div style="display:flex; gap:8px; align-items:center; min-width: 200px;">
            ${img ? `<img src="${img}" alt="${p.title}" style="width:72px; height:72px; object-fit:cover; border-radius:10px;">` : ""}
            <div style="display:flex; flex-direction:column; gap:4px;">
              <strong>${p.title}</strong>
              <span style="color:#4b5563; font-size: 0.9rem;">${p.location ?? ""}</span>
              <span style="color:${p.source === "reise" ? "#e11d48" : "#2563eb"}; font-weight:600;">${p.source === "reise" ? "Reise" : "Bucketlist"}</span>
            </div>
          </div>
        `;

        marker
          .bindTooltip(html, { direction: "top", offset: [0, -8], opacity: 0.95, className: "custom-tooltip" })
          .bindPopup(html, { className: "custom-popup" })
          .on("click", () => {
            const target = p.source === "reise" ? `/reisen/${p.id}` : `/bucketlist/${p.id}`;
            window.location.href = target;
          });

        markerById[p.id] = { marker, coords: [p.lat, p.lng] };
      });

      if (markerPoints.length > 0) {
        const bounds = L.latLngBounds(markerPoints.map((p) => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [30, 30] });
      }

      map.on("moveend", () => {
        const c = map.getCenter();
        globeCenter = { lat: c.lat, lng: c.lng };
      });

      // Globus (Leaflet)
      globeMap = L.map(globeMapContainer, {
        worldCopyJump: true,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        inertia: true,
        minZoom: 2,
        maxZoom: 18,
        scrollWheelZoom: true,
        maxBounds: L.latLngBounds([-85, -540], [85, 540]),
        maxBoundsViscosity: 0
      }).setView([globeCenter.lat, globeCenter.lng], 3);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "",
        continuousWorld: true,
        noWrap: false,
        keepBuffer: 5,
        updateWhenIdle: false,
        updateWhenZooming: false
      }).addTo(globeMap);

      globeMap.createPane("shadow").style.zIndex = "200";

      globeMap.on("dragstart zoomstart", () => {
        userInteracting = true;
        stopSpin();
      });
      globeMap.on("dragend zoomend", () => {
        userInteracting = false;
        pauseSpinWithResume();
      });
      globeMap.on("moveend", () => {
        const center = globeMap.getCenter();
        const clampedLat = clampLat(center.lat);
        const lng = normalizeLng(center.lng);
        globeCenter = { lat: clampedLat, lng };
        if (clampedLat !== center.lat || lng !== center.lng) {
          globeMap.setView([clampedLat, lng], globeMap.getZoom(), { animate: false });
        }
      });

      globeMap.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        flyToCoords([lat, lng], globeMap.getZoom());
      });

      globeMap.on("dblclick", (e: any) => {
        const { lat, lng } = e.latlng;
        flyToCoords([lat, lng], globeMap.getZoom() + 1);
      });

      globeMap.on("zoomend", () => refreshTiles(globeMap));
      startSpin();

      // Pins auf Globus
      const globedPins = collected.filter((p) => p.lat && p.lng);
      globedPins.forEach((p) => {
        const color = p.source === "reise" ? "#e11d48" : "#2563eb";
        const html = `
          <div style="display:flex; gap:8px; align-items:center; min-width: 180px;">
            <div style="width:10px; height:10px; border-radius:50%; background:${color}; margin-right:6px;"></div>
            <div style="display:flex; flex-direction:column; gap:2px;">
              <strong>${p.title}</strong>
              <span style="color:#4b5563; font-size: 0.9rem;">${p.location ?? ""}</span>
            </div>
          </div>
        `;
        L.circleMarker([p.lat as number, p.lng as number], {
          radius: 6,
          color,
          fillColor: color,
          fillOpacity: 0.95,
          weight: 2
        })
          .addTo(globeMap)
          .bindTooltip(html, { direction: "top", opacity: 0.95, className: "custom-tooltip" })
          .on("click", () => (window.location.href = p.source === "reise" ? `/reisen/${p.id}` : `/bucketlist/${p.id}`));
      });

      loading = false;
    } catch (err) {
      console.error("Karte/Globus Fehler:", err);
      errorMessage = "Karte konnte nicht geladen werden.";
      loading = false;
      return;
    }
  });

  onDestroy(() => {
    stopSpin();
    if (spinPausedTimer) clearTimeout(spinPausedTimer);
    if (fetchDebounce) clearTimeout(fetchDebounce);
    fetchController?.abort();
  });
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
    crossorigin=""
  />
</svelte:head>

<div class="map-card">
  <div class="card-header">Weltkarte</div>
  {#if loading}
    <div class="status">Karte wird geladen...</div>
  {:else if errorMessage}
    <div class="status error">{errorMessage}</div>
  {:else}
    <div class="card-body">
      <div class="globe-shell" class:hidden={activeView !== "globe"}>
        <div class="globe-mask" bind:this={globeMapContainer}></div>
      </div>
      <div class="map-container" class:hidden={activeView !== "map"} bind:this={mapContainer}></div>
    </div>
    <div class="info-bar">
      <div class="view-toggle">
        <button class:active={activeView === "globe"} on:click={() => setView("globe")}>Globus</button>
        <button class:active={activeView === "map"} on:click={() => setView("map")}>Karte</button>
      </div>
      <div class="search-box">
        <input
          type="text"
          placeholder="Ort oder Name suchen..."
          bind:value={searchTerm}
          on:input={handleSearchInput}
          on:keydown={(e) => e.key === "Enter" && focusFirstMatch()}
        />
        {#if searchTerm.trim().length > 0}
          <div class="search-suggestions">
            {#if isFetchingRemote}
              <div class="suggestion loading">Suche...</div>
            {/if}
            {#each remoteSuggestions as place}
              <button
                type="button"
                class="suggestion"
                on:click={() => {
                  searchTerm = place.display || place.name;
                  flyToCoords([place.lat, place.lng]);
                }}
              >
                <span>{place.name}</span>
                {#if place.display}<small>{place.display}</small>{/if}
              </button>
            {/each}
          </div>
        {/if}
        <button class="search-btn" on:click={focusFirstMatch}>🔍</button>
      </div>
      <span class="legend">
        <span><span class="dot reise"></span>Reisen</span>
        <span><span class="dot bucket"></span>Bucketlist</span>
      </span>
    </div>
  {/if}
</div>

<style>
  .map-card {
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid #e5e7eb;
    box-shadow: 0 26px 50px rgba(0, 0, 0, 0.18);
    border-radius: 22px;
    padding: 1.1rem 1.2rem 1.4rem;
    width: 100%;
    max-width: 560px;
    box-sizing: border-box;
  }

  .card-header {
    font-weight: 700;
    text-align: center;
    margin-bottom: 0.6rem;
    color: #0b1021;
  }

  .status {
    text-align: center;
    padding: 1rem;
    color: #1f2937;
  }

  .status.error {
    color: #b91c1c;
  }

  .card-body {
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 18px;
    overflow: hidden;
    background: #060912;
    box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.4);
  }

  .globe-shell,
  .map-container {
    position: absolute;
    inset: 0;
  }

  .hidden {
    display: none;
  }

  .globe-mask :global(.leaflet-container),
  .map-container :global(.leaflet-container) {
    width: 100%;
    height: 100%;
    border-radius: 18px;
    background: #0b1021;
  }

  .info-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    background: rgba(22, 25, 32, 0.86);
    color: #e5e7eb;
    padding: 10px 12px;
    font-size: 0.95rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    margin-top: 0.75rem;
  }

  .view-toggle {
    display: inline-flex;
    gap: 8px;
    background: rgba(9, 11, 20, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 6px;
  }

  .view-toggle button {
    border: none;
    border-radius: 10px;
    padding: 8px 12px;
    font-weight: 600;
    color: #e5e7eb;
    background: transparent;
    cursor: pointer;
  }

  .view-toggle button.active {
    background: linear-gradient(135deg, #0ea5e9, #2563eb);
    color: #0b1120;
  }

  .search-box {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(15, 23, 42, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 6px 8px;
    border-radius: 12px;
    position: relative;
    overflow: visible;
    z-index: 200;
  }

  .search-box input {
    background: transparent;
    border: none;
    color: #e5e7eb;
    min-width: 200px;
    outline: none;
  }

  .search-btn {
    border: none;
    background: #0ea5e9;
    color: #0b1120;
    border-radius: 8px;
    padding: 6px 8px;
    cursor: pointer;
  }

  .search-suggestions {
    position: absolute;
    left: 0;
    right: 0;
    top: 110%;
    background: rgba(15, 23, 42, 0.98);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.35);
    max-height: 260px;
    overflow: auto;
    z-index: 250;
  }

  .suggestion {
    padding: 8px 12px;
    cursor: pointer;
    color: #e5e7eb;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .suggestion:last-child {
    border-bottom: none;
  }

  .suggestion:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .suggestion small {
    display: block;
    color: #9ca3af;
    margin-top: 2px;
    line-height: 1.3;
  }

  .suggestion.loading {
    cursor: default;
    text-align: center;
    color: #9ca3af;
  }

  .legend {
    display: inline-flex;
    align-items: center;
    gap: 12px;
  }

  .dot {
    width: 11px;
    height: 11px;
    border-radius: 999px;
    display: inline-block;
    margin-right: 6px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  }

  .dot.reise {
    background: #e11d48;
  }

  .dot.bucket {
    background: #2563eb;
  }

  @media (max-width: 640px) {
    .map-card {
      max-width: 100%;
    }
    .card-body {
      aspect-ratio: 4 / 5;
    }
    .search-box input {
      min-width: 150px;
    }
  }
</style>

