<script lang="ts">
  import { supabase } from "$lib/supabaseClient";
  import { onMount, onDestroy } from "svelte";
  import Globe from "$lib/components/Globe.svelte";

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

  const fallbackSlides = ["/landing/Berg.jpg", "/landing/Staedtetrip.jpg", "/landing/Strand.jpg"];

  let currentBackground = 0;
  let bgInterval: ReturnType<typeof setInterval> | null = null;

  let points: TripPoint[] = [];
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

  let globeReisen: { lat: number; lng: number; label: string; id: string; location?: string | null; img?: string | null }[] = [];
  let globeBucket: { lat: number; lng: number; label: string; id: string; location?: string | null; img?: string | null }[] = [];

  let activeView: "globe" | "map" = "globe";
  let spinTimer: ReturnType<typeof setInterval> | null = null;
  let spinPausedTimer: ReturnType<typeof setTimeout> | null = null;
  let globeCenter = { lat: 15, lng: 0 };
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
    { name: "Chur", country: "Schweiz", lat: 46.8508, lng: 9.5326 },
    { name: "Berlin", country: "Deutschland", lat: 52.52, lng: 13.405 },
    { name: "Hamburg", country: "Deutschland", lat: 53.5511, lng: 9.9937 },
    { name: "Muenchen", country: "Deutschland", lat: 48.1351, lng: 11.582 },
    { name: "Koeln", country: "Deutschland", lat: 50.9375, lng: 6.9603 },
    { name: "Frankfurt", country: "Deutschland", lat: 50.1109, lng: 8.6821 },
    { name: "Stuttgart", country: "Deutschland", lat: 48.7758, lng: 9.1829 },
    { name: "Paris", country: "Frankreich", lat: 48.8566, lng: 2.3522 },
    { name: "Lyon", country: "Frankreich", lat: 45.764, lng: 4.8357 },
    { name: "Marseille", country: "Frankreich", lat: 43.2965, lng: 5.3698 },
    { name: "London", country: "UK", lat: 51.5072, lng: -0.1276 },
    { name: "Manchester", country: "UK", lat: 53.4808, lng: -2.2426 },
    { name: "Edinburgh", country: "UK", lat: 55.9533, lng: -3.1883 },
    { name: "Madrid", country: "Spanien", lat: 40.4168, lng: -3.7038 },
    { name: "Barcelona", country: "Spanien", lat: 41.3874, lng: 2.1686 },
    { name: "Rom", country: "Italien", lat: 41.9028, lng: 12.4964 },
    { name: "Mailand", country: "Italien", lat: 45.4642, lng: 9.19 },
    { name: "Neapel", country: "Italien", lat: 40.8518, lng: 14.2681 },
    { name: "Amsterdam", country: "Niederlande", lat: 52.3676, lng: 4.9041 },
    { name: "Brüssel", country: "Belgien", lat: 50.8503, lng: 4.3517 },
    { name: "Kopenhagen", country: "Daenemark", lat: 55.6761, lng: 12.5683 },
    { name: "Stockholm", country: "Schweden", lat: 59.3293, lng: 18.0686 },
    { name: "Oslo", country: "Norwegen", lat: 59.9139, lng: 10.7522 },
    { name: "Helsinki", country: "Finnland", lat: 60.1699, lng: 24.9384 },
    { name: "Wien", country: "Oesterreich", lat: 48.2082, lng: 16.3738 },
    { name: "Prag", country: "Tschechien", lat: 50.0755, lng: 14.4378 },
    { name: "Budapest", country: "Ungarn", lat: 47.4979, lng: 19.0402 },
    { name: "Warszawa", country: "Polen", lat: 52.2297, lng: 21.0122 },
    { name: "Athen", country: "Griechenland", lat: 37.9838, lng: 23.7275 },
    { name: "Istanbul", country: "Tuerkei", lat: 41.0082, lng: 28.9784 },
    { name: "Dubai", country: "VAE", lat: 25.2048, lng: 55.2708 },
    { name: "New York", country: "USA", lat: 40.7128, lng: -74.006 },
    { name: "Los Angeles", country: "USA", lat: 34.0522, lng: -118.2437 },
    { name: "San Francisco", country: "USA", lat: 37.7749, lng: -122.4194 },
    { name: "Miami", country: "USA", lat: 25.7617, lng: -80.1918 },
    { name: "Toronto", country: "Kanada", lat: 43.6532, lng: -79.3832 },
    { name: "Vancouver", country: "Kanada", lat: 49.2827, lng: -123.1207 },
    { name: "Mexiko-Stadt", country: "Mexiko", lat: 19.4326, lng: -99.1332 },
    { name: "Buenos Aires", country: "Argentinien", lat: -34.6037, lng: -58.3816 },
    { name: "Rio de Janeiro", country: "Brasilien", lat: -22.9068, lng: -43.1729 },
    { name: "Kapstadt", country: "Suedafrika", lat: -33.9249, lng: 18.4241 },
    { name: "Kairo", country: "Aegypten", lat: 30.0444, lng: 31.2357 },
    { name: "Tokio", country: "Japan", lat: 35.6895, lng: 139.6917 },
    { name: "Seoul", country: "Suedkorea", lat: 37.5665, lng: 126.978 },
    { name: "Bangkok", country: "Thailand", lat: 13.7563, lng: 100.5018 },
    { name: "Singapur", country: "Singapur", lat: 1.3521, lng: 103.8198 },
    { name: "Sydney", country: "Australien", lat: -33.8688, lng: 151.2093 },
    { name: "Auckland", country: "Neuseeland", lat: -36.8485, lng: 174.7633 }
  ];

  function nextBackground() {
    currentBackground = (currentBackground + 1) % fallbackSlides.length;
  }

  function startSpin() {
    if (activeView !== "globe") return;
    stopSpin();
    spinTimer = setInterval(() => {
      if (!globeMap) return;
      globeCenter.lng = ((globeCenter.lng + 0.6 + 180) % 360) - 180;
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

  function setView(target: "globe" | "map") {
    activeView = target;
    setTimeout(() => {
      if (target === "globe") {
        globeMap?.invalidateSize();
        if (globeMap) {
          const currentZoom = globeMap.getZoom() ?? 3;
          globeMap.setView([globeCenter.lat, globeCenter.lng], currentZoom, { animate: true });
        }
        startSpin();
      } else {
        map?.invalidateSize();
        stopSpin();
      }
    }, 120);
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

  function flyToCoords(coords: [number, number]) {
    globeCenter = { lat: coords[0], lng: coords[1] };
    const stayOnMap = activeView === "map";
    if (!stayOnMap) {
      setView("globe");
    }
    placeSearchMarkers(coords);
    if (map) {
      map.flyTo(coords, Math.max(map.getZoom(), 14), { animate: true });
    }
    if (globeMap) {
      globeMap.flyTo(coords, 14, { animate: true });
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
      console.error(reisenRes.error);
      errorMessage = "Reisen konnten nicht geladen werden.";
    } else if (bucketRes.error) {
      console.error(bucketRes.error);
      errorMessage = "Bucketlist konnte nicht geladen werden.";
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
    loading = false;

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

    const markerPoints = points.filter((p) => p.lat && p.lng);
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

    // Globus (Leaflet mit Rund-Maske und Auto-Spin)
    globeMap = L.map(globeMapContainer, {
      worldCopyJump: false,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      inertia: true,
      minZoom: 2,
      maxZoom: 18,
      maxBounds: L.latLngBounds([-85, -180], [85, 180]),
      maxBoundsViscosity: 1,
      scrollWheelZoom: true
    }).setView([globeCenter.lat, globeCenter.lng], 3);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: ""
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

    // Zentrierung begrenzen, damit keine grauen Bereiche sichtbar werden
    globeMap.on("moveend", () => {
      const bounds = L.latLngBounds([-85, -180], [85, 180]);
      const center = globeMap.getCenter();
      const clamped = {
        lat: Math.min(Math.max(center.lat, bounds.getSouth()), bounds.getNorth()),
        lng: center.lng
      };
      if (clamped.lat !== center.lat) {
        globeMap.setView([clamped.lat, clamped.lng], globeMap.getZoom(), { animate: false });
      }
      globeCenter = { lat: clamped.lat, lng: center.lng };
    });

    startSpin();
  });

  onDestroy(() => {
    if (bgInterval) clearInterval(bgInterval);
    stopSpin();
    if (spinPausedTimer) clearTimeout(spinPausedTimer);
    if (fetchDebounce) clearTimeout(fetchDebounce);
    fetchController?.abort();
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
    background: rgba(40, 44, 55, 0.62);
    z-index: -1;
    backdrop-filter: blur(2px);
  }

  .page-layer {
    position: relative;
    max-width: 1600px;
    margin: 0 auto;
    min-height: 100vh;
    padding: 160px 70px 120px;
    box-sizing: border-box;
    color: #fff;
  }

  .header-row {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    margin-bottom: 24px;
  }

  h1 {
    font-size: 2.6rem;
    margin: 0;
  }

  .view-toggle {
    display: inline-flex;
    gap: 10px;
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
    background: linear-gradient(135deg, #0f172a, #111827);
    color: #f8fafc;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
  }

  .card {
    background: rgba(24, 26, 33, 0.82);
    border-radius: 26px;
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
    overflow: visible;
    border: 1px solid rgba(255, 255, 255, 0.08);
    margin-bottom: 20px;
    position: relative;
    z-index: 2;
  }

  .card-header {
    padding: 16px 20px;
    color: #e5e7eb;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    font-weight: 700;
  }

  .card-body {
    position: relative;
    overflow: visible;
  }

  .map-container {
    min-height: 460px;
  }

  .map-container :global(.leaflet-container) {
    width: 100%;
    height: 460px;
    background: #030712;
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

  .globe-shell {
    position: relative;
    width: 100%;
    display: flex;
    justify-content: center;
    padding: 30px;
    box-sizing: border-box;
  }

  .globe-mask {
    width: min(78vw, 660px);
    max-height: 68vh;
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    overflow: hidden;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .globe-mask :global(.leaflet-container) {
    width: 100%;
    height: 100%;
    background: #020617;
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
    min-width: 220px;
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

  .info-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    background: rgba(22, 25, 32, 0.86);
    color: #e5e7eb;
    padding: 12px 16px;
    font-size: 0.95rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .legend {
    display: inline-flex;
    align-items: center;
    gap: 14px;
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

  .hidden {
    display: none;
  }

  @media (max-width: 960px) {
    .page-layer {
      padding: 130px 24px 70px;
    }

    h1 {
      font-size: 2.1rem;
    }

    .map-container :global(.leaflet-container) {
      height: 340px;
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
    <div class="card">
      <div class="card-header">{activeView === "globe" ? "Drehbarer Globus" : "Reisen & Bucketlist"}</div>
      <div class="card-body">
        <div class="globe-shell" class:hidden={activeView !== "globe"}>
          <div class="globe-mask" bind:this={globeMapContainer}></div>
        </div>
        <div class="map-container" class:hidden={activeView !== "map"} bind:this={mapContainer}></div>
      </div>
      <div class="info-bar">
        <div class="view-toggle">
          <button class:active={activeView === "globe"} on:click={() => setView("globe")}>🧭 Globus</button>
          <button class:active={activeView === "map"} on:click={() => setView("map")}>🗺️ Karte</button>
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
                <div
                  class="suggestion"
                  on:click={() => {
                    searchTerm = place.display || place.name;
                    flyToCoords([place.lat, place.lng]);
                  }}
                >
                  <span>{place.name}</span>
                  {#if place.display}<small>{place.display}</small>{/if}
                </div>
              {/each}
              <!-- Benutzer-Einträge nicht mehr im Dropdown anzeigen -->
            </div>
          {/if}
          <button class="search-btn" on:click={focusFirstMatch}>🔍</button>
        </div>
        <span class="legend">
          <span><span class="dot reise"></span>Reisen</span>
          <span><span class="dot bucket"></span>Bucketlist</span>
        </span>
      </div>
    </div>
  {/if}
</div>
