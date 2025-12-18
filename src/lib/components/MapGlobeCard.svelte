<script lang="ts">
  import { supabase } from "$lib/supabaseClient";
  import { onDestroy, onMount, tick } from "svelte";

  type MapSource = "reise" | "bucketlist";
  type TripPoint = {
    id: string;
    title: string;
    location: string | null;
    lat?: number | null;
    lng?: number | null;
    cover_image_url?: string | null;
    images?: string[] | null;
    source: MapSource;
  };

  export let variant: "card" | "page" = "card";
  export let title = variant === "page" ? "Reisen & Bucketlist" : "Weltkarte";

  let loading = true;
  let errorMessage = "";
  let bucketError = "";

  let mapContainer: HTMLDivElement;
  let globeMapContainer: HTMLDivElement;

  let L: any;
  let map: any;
  let globeMap: any;
  let markerById: Record<string, any> = {};
  let searchMarkerMap: any = null;
  let searchMarkerGlobe: any = null;
  let userInteracting = false;

  let points: TripPoint[] = [];
  let globeReisen: { lat: number; lng: number; label: string; id: string; location?: string | null; img?: string | null }[] = [];
  let globeBucket: { lat: number; lng: number; label: string; id: string; location?: string | null; img?: string | null }[] = [];

  let activeView: "globe" | "map" = "globe";
  let spinTimer: ReturnType<typeof setInterval> | null = null;
  let spinPausedTimer: ReturnType<typeof setTimeout> | null = null;
  let globeCenter = { lat: 15, lng: 0 };
  let lastSearchCoords: [number, number] | null = null;
  let searchTerm = "";
  let remoteSuggestions: { name: string; display: string; lat: number; lng: number }[] = [];
  let isFetchingRemote = false;
  let fetchDebounce: ReturnType<typeof setTimeout> | null = null;
  let fetchController: AbortController | null = null;

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
    if (activeView !== "globe") return;
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
    const mapDefaultCoords: [number, number] = [51.1657, 10.4515];
    const globeDefaultCoords: [number, number] = [15, 0];
    clearSearchMarkers();

    setTimeout(() => {
      if (target === "globe") {
        globeCenter = { lat: globeDefaultCoords[0], lng: globeDefaultCoords[1] };
        if (globeMap) {
          globeMap.invalidateSize();
          globeMap.setView(globeDefaultCoords, 3, { animate: false });
          refreshTiles(globeMap);
          requestAnimationFrame(() => {
            globeMap.invalidateSize();
            globeMap.setView(globeDefaultCoords, 3, { animate: false });
            refreshTiles(globeMap);
            globeMap.fire("resize");
            requestAnimationFrame(() => {
              globeMap.invalidateSize();
              refreshTiles(globeMap);
            });
          });
        }
        startSpin();
      } else {
        if (map) {
          map.invalidateSize();
          map.setView(mapDefaultCoords, 5, { animate: false });
          refreshTiles(map);
          requestAnimationFrame(() => {
            map.invalidateSize();
            map.setView(mapDefaultCoords, 5, { animate: false });
            refreshTiles(map);
          });
        }
      }
    }, 80);
  }

  async function focusFirstMatch() {
    const termRaw = searchTerm.trim();
    const term = termRaw.toLowerCase();
    if (!term) return;
    pauseSpinWithResume();

    const combined = [...remoteSuggestions, ...points.filter((p) => p.lat && p.lng)];
    const match = combined.find((p: any) =>
      ((p.name ?? p.title ?? "") + " " + (p.country ?? p.location ?? "")).toLowerCase().includes(term)
    );

    if (match && match.lat && match.lng) {
      flyToCoords([match.lat as number, match.lng as number]);
      if ("id" in match) markerById[(match as any).id]?.marker?.openTooltip();
      return;
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(termRaw)}`,
        { headers: { "Accept-Language": "de" } }
      );
      if (!res.ok) throw new Error("Geocoding fehlgeschlagen");
      const data = await res.json();
      if (!data || data.length === 0) return;
      const first = data[0];
      const lat = parseFloat(first.lat);
      const lng = parseFloat(first.lon);
      flyToCoords([lat, lng]);
    } catch (err) {
      console.error("Geocoding Fehler:", err);
    }
  }

  function flyToCoords(coords: [number, number], zoom = 14) {
    lastSearchCoords = coords;
    globeCenter = { lat: coords[0], lng: coords[1] };
    placeSearchMarkers(coords);
    if (map) {
      map.flyTo(coords, Math.max(map.getZoom(), zoom), { animate: true });
    }
    if (globeMap) {
      globeMap.flyTo(coords, Math.max(globeMap.getZoom(), zoom), { animate: true });
    }
  }

  function placeSearchMarkers(coords: [number, number]) {
    if (!L) return;
    if (map) {
      if (searchMarkerMap) map.removeLayer(searchMarkerMap);
      searchMarkerMap = L.marker(coords).addTo(map);
    }
    if (globeMap) {
      if (searchMarkerGlobe) globeMap.removeLayer(searchMarkerGlobe);
      searchMarkerGlobe = L.marker(coords).addTo(globeMap);
    }
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
      if (err?.name !== "AbortError") {
        console.error("Suche fehlgeschlagen:", err);
      }
    } finally {
      isFetchingRemote = false;
    }
  }

  function handleSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    searchTerm = value;
    queueRemoteSuggestions(value);
  }

  async function loadData() {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      errorMessage = "Bitte neu einloggen.";
      return { collected: [], userAvailable: false };
    }

    const [reisenRes, bucketRes] = await Promise.all([
      supabase.from("reisen").select("id,title,location,lat,lng,images,cover_image_url").eq("user_id", user.id),
      supabase.from("bucketlist").select("id,title,location,lat,lng,images,cover_image_url,year").eq("user_id", user.id)
    ]);

    const collected: TripPoint[] = [];
    let bucketFailed = false;

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

    if (bucketRes.error) {
      const needsUserIdFallback =
        bucketRes.error?.message?.toLowerCase().includes("user_id") ||
        bucketRes.error?.message?.toLowerCase().includes("column") ||
        bucketRes.error?.message?.toLowerCase().includes("permission");

      // Supabase-Fallback
      const supaFallback = needsUserIdFallback
        ? await supabase.from("bucketlist").select("id,title,location,year,cover_image_url,lat,lng,images")
        : await supabase
            .from("bucketlist")
            .select("id,title,location,year,cover_image_url,lat,lng,images")
            .eq("user_id", user.id);

      if (supaFallback.error) {
        // Mongo-API-Fallback
        try {
          const res = await fetch(`/api/bucketlist?user_id=${encodeURIComponent(user.id)}`);
          const payload = await res.json();
          if (res.ok && payload?.ok) {
            (payload.bucketlist ?? []).forEach((b: any) =>
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
            bucketError = "";
          } else {
            bucketFailed = true;
            bucketError = payload?.error || "Bucketlist konnte nicht geladen werden.";
          }
        } catch (err) {
          bucketFailed = true;
          bucketError = err instanceof Error ? err.message : "Bucketlist konnte nicht geladen werden.";
        }
      } else {
        bucketError = "";
        (supaFallback.data ?? []).forEach((b: any) =>
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
      }
    } else {
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
    }

    if (reisenRes.error && bucketFailed) {
      errorMessage = "Reisen und Bucketlist konnten nicht geladen werden.";
    } else if (reisenRes.error) {
      errorMessage = "Reisen konnten nicht geladen werden.";
    } else {
      // Bucketlist-Fehler sperren die Karte nicht; wir zeigen einfach keine Bucket-Pins
      errorMessage = "";
    }

    points = collected;
    globeReisen = collected
      .filter((p) => p.source === "reise" && p.lat && p.lng)
      .map((p) => ({
        id: p.id,
        lat: p.lat as number,
        lng: p.lng as number,
        label: p.title,
        location: p.location,
        img: p.images?.[0] ?? p.cover_image_url ?? null
      }));
    globeBucket = collected
      .filter((p) => p.source === "bucketlist" && p.lat && p.lng)
      .map((p) => ({
        id: p.id,
        lat: p.lat as number,
        lng: p.lng as number,
        label: p.title,
        location: p.location,
        img: p.images?.[0] ?? p.cover_image_url ?? null
      }));

    return { collected, userAvailable: true };
  }

  async function buildMaps(collected: TripPoint[]) {
    const leaflet = await import("leaflet");
    L = leaflet.default;

    map = L.map(mapContainer, {
      minZoom: 2,
      maxZoom: 18,
      inertia: true,
      maxBounds: L.latLngBounds([-85, -540], [85, 540]),
      maxBoundsViscosity: 1.0,
      worldCopyJump: true
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
      const clampedLat = clampLat(c.lat);
      const lng = normalizeLng(c.lng);
      globeCenter = { lat: clampedLat, lng };
      if (clampedLat !== c.lat || lng !== c.lng) {
        map.setView([clampedLat, lng], map.getZoom(), { animate: false });
      }
    });

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

    globeReisen.forEach((p) => {
      const html = `
        <div style="display:flex; gap:8px; align-items:center; min-width:180px;">
          ${p.img ? `<img src="${p.img}" alt="${p.label}" style="width:68px; height:68px; object-fit:cover; border-radius:10px;">` : ""}
          <div>
            <strong>${p.label}</strong><br>
            <span style="color:#94a3b8; font-size:0.9rem;">${p.location ?? ""}</span>
          </div>
        </div>`;
      L.circleMarker([p.lat, p.lng], {
        radius: 7,
        color: "#e11d48",
        fillColor: "#e11d48",
        fillOpacity: 0.95,
        weight: 2
      })
        .addTo(globeMap)
        .bindTooltip(html, { direction: "top", opacity: 0.95, className: "custom-tooltip" })
        .on("click", () => (window.location.href = `/reisen/${p.id}`));
    });

    globeBucket.forEach((p) => {
      const html = `
        <div style="display:flex; gap:8px; align-items:center; min-width:180px;">
          ${p.img ? `<img src="${p.img}" alt="${p.label}" style="width:68px; height:68px; object-fit:cover; border-radius:10px;">` : ""}
          <div>
            <strong>${p.label}</strong><br>
            <span style="color:#94a3b8; font-size:0.9rem;">${p.location ?? ""}</span>
          </div>
        </div>`;
      L.circleMarker([p.lat, p.lng], {
        radius: 7,
        color: "#2563eb",
        fillColor: "#2563eb",
        fillOpacity: 0.95,
        weight: 2
      })
        .addTo(globeMap)
        .bindTooltip(html, { direction: "top", opacity: 0.95, className: "custom-tooltip" })
        .on("click", () => (window.location.href = `/bucketlist/${p.id}`));
    });

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

    startSpin();
  }

  onMount(async () => {
    try {
      loading = true;
      const { collected, userAvailable } = await loadData();

      // Falls kein User: sofort anzeigen und abbrechen
      if (!userAvailable) {
        loading = false;
        return;
      }

      // Container rendern lassen, bevor Leaflet initialisiert wird
      loading = false;
      await tick();
      if (!mapContainer || !globeMapContainer) {
        errorMessage = "Karte konnte nicht geladen werden.";
        return;
      }

      await buildMaps(collected);
    } catch (err) {
      console.error("Karte/Globus Fehler:", err);
      errorMessage = "Karte konnte nicht geladen werden.";
    } finally {
      loading = false;
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

<div class={`map-card ${variant === "page" ? "page" : "card"}`}>
  <div class="card-header">{title}</div>
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
        <button class="search-btn" on:click={focusFirstMatch}>Suche</button>
      </div>
      <span class="legend">
        <span><span class="dot reise"></span>Reisen</span>
        <span><span class="dot bucket"></span>Bucketlist</span>
      </span>
    </div>
    {#if !errorMessage && points.length === 0}
      <div class="status muted">Noch keine Reisen oder Bucketlist-Eintraege mit Koordinaten vorhanden.</div>
    {/if}
  {/if}
</div>

<style>
  .map-card {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(245, 248, 252, 0.94) 100%);
    border: 1px solid #e6ecf3;
    box-shadow: 0 26px 50px rgba(0, 0, 0, 0.14);
    border-radius: 22px;
    padding: 1.1rem 1.2rem 1.4rem;
    width: 100%;
    max-width: 560px;
    box-sizing: border-box;
  }

  .map-card.page {
    max-width: none;
    background: linear-gradient(180deg, rgba(18, 25, 39, 0.9) 0%, rgba(13, 20, 34, 0.92) 100%);
    color: #e5e7eb;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.32);
    padding: 1rem 1rem 1.2rem;
  }

  .card-header {
    font-weight: 700;
    text-align: center;
    margin-bottom: 0.6rem;
    color: #0b1021;
  }

  .map-card.page .card-header {
    color: #e5e7eb;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding-bottom: 0.4rem;
  }

  .status {
    text-align: center;
    padding: 1rem;
    color: #1f2937;
  }

  .status.error {
    color: #b91c1c;
  }

  .status.muted {
    color: #6b7280;
    padding-top: 0.4rem;
  }

  .map-card.page .status {
    color: #e5e7eb;
  }

  .map-card.page .status.error {
    color: #fecdd3;
  }

  .card-body {
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 18px;
    overflow: hidden;
    background: radial-gradient(circle at 50% 45%, rgba(238, 244, 251, 0.9), rgba(224, 233, 245, 0.92) 60%, rgba(215, 226, 241, 0.95));
    box-shadow: inset 0 0 28px rgba(0, 0, 0, 0.18);
  }

  .map-card.page .card-body {
    aspect-ratio: auto;
    min-height: 460px;
    border-radius: 20px;
    background: radial-gradient(circle at 50% 45%, rgba(12, 18, 30, 0.9), rgba(7, 12, 24, 0.94));
    box-shadow: inset 0 0 38px rgba(0, 0, 0, 0.35);
  }

  .globe-shell,
  .map-container {
    position: absolute;
    inset: 0;
  }

  .globe-mask {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    overflow: hidden;
    background: linear-gradient(180deg, #eaf1fb 0%, #dbe7f6 100%);
  }

  .map-card.page .globe-mask {
    border-radius: 18px;
  }

  .hidden {
    display: none;
  }

  .globe-mask :global(.leaflet-container),
  .map-container :global(.leaflet-container) {
    width: 100%;
    height: 100%;
    border-radius: 18px;
    background: linear-gradient(180deg, #eaf1fb 0%, #dbe7f6 100%);
  }

  .info-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    background: rgba(244, 247, 252, 0.92);
    color: #1f2937;
    padding: 10px 12px;
    font-size: 0.95rem;
    border: 1px solid #e4e9f1;
    border-radius: 14px;
    margin-top: 0.75rem;
    box-shadow: inset 0 0 1px rgba(255, 255, 255, 0.6);
  }

  .map-card.page .info-bar {
    background: rgba(13, 17, 27, 0.9);
    color: #e5e7eb;
    border: 1px solid rgba(255, 255, 255, 0.08);
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

  .map-card.page .view-toggle button.active {
    background: linear-gradient(135deg, #0f172a, #111827);
    color: #f8fafc;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
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

  .map-card.page .search-box input {
    color: #f8fafc;
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

  :global(.custom-tooltip) {
    background: #0b1021;
    color: #f8fafc;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
  }

  :global(.custom-tooltip .leaflet-tooltip-tip) {
    background: #0b1021;
  }

  @media (max-width: 640px) {
    .map-card {
      max-width: 100%;
    }
    .card-body {
      aspect-ratio: 4 / 5;
    }
    .map-card.page .card-body {
      min-height: 340px;
    }
    .search-box input {
      min-width: 150px;
    }
  }
</style>
