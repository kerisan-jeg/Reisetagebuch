<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from "svelte";

  export let lat: number | null = null;
  export let lng: number | null = null;
  export let color = "#e11d48";
  export let label = "Position waehlen";
  type Suggestion = { name: string; country?: string; lat: number; lng: number; subtitle?: string };

  export let suggested: Suggestion[] = [
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
    { name: "Bruessel", country: "Belgien", lat: 50.8503, lng: 4.3517 },
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

  const dispatch = createEventDispatcher<{ change: { lat: number; lng: number } }>();

  let container: HTMLDivElement;
  let map: any;
  let marker: any;
  let L: any;
  let search = "";
  let suggestionsOpen = false;
  let remoteSuggestions: Suggestion[] = [];
  let fetchTimer: ReturnType<typeof setTimeout> | null = null;

  $: filtered = [
    ...remoteSuggestions,
    ...suggested
      .filter((p) => (p.name + " " + (p.country ?? "")).toLowerCase().includes(search.toLowerCase()))
      .slice(0, 12)
  ].slice(0, 12);

  $: triggerFetch(search);

  function triggerFetch(term: string) {
    const query = term.trim();
    if (fetchTimer) clearTimeout(fetchTimer);

    if (query.length < 3) {
      remoteSuggestions = [];
      return;
    }

    fetchTimer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1`
        );
        if (!res.ok) throw new Error("Geocoder-Anfrage fehlgeschlagen");
        const data = (await res.json()) as any[];
        remoteSuggestions = data.map((item) => {
          const name = item.display_name?.split(",")?.[0]?.trim() ?? item.display_name ?? query;
          const country = item.address?.country ?? item.display_name?.split(",").slice(-1)[0]?.trim();
          return {
            name,
            country,
            subtitle: item.display_name,
            lat: Number(item.lat),
            lng: Number(item.lon)
          } as Suggestion;
        });
      } catch (err) {
        console.warn("Geocoder Fehler:", err);
        remoteSuggestions = [];
      }
    }, 400);
  }

  async function init() {
    const leaflet = await import("leaflet");
    L = leaflet.default;

    map = L.map(container, {
      worldCopyJump: true,
      scrollWheelZoom: true,
      zoomControl: true,
      minZoom: 2,
      maxZoom: 18
    }).setView([lat ?? 47.3769, lng ?? 8.5417], lat && lng ? 7 : 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap-Mitwirkende"
    }).addTo(map);

    if (lat && lng) {
      marker = L.circleMarker([lat, lng], {
        radius: 8,
        color,
        fillColor: color,
        fillOpacity: 0.95,
        weight: 2
      }).addTo(map);
    }

    map.on("click", (e: any) => {
      const { lat: newLat, lng: newLng } = e.latlng;
      lat = newLat;
      lng = newLng;

      if (!marker) {
        marker = L.circleMarker([newLat, newLng], {
          radius: 8,
          color,
          fillColor: color,
          fillOpacity: 0.95,
          weight: 2
        }).addTo(map);
      } else {
        marker.setLatLng([newLat, newLng]);
      }

      dispatch("change", { lat: newLat, lng: newLng });
    });
  }

  function selectSuggestion(place: Suggestion) {
    lat = place.lat;
    lng = place.lng;
    search = [place.name, place.country].filter(Boolean).join(", ");
    suggestionsOpen = false;
    remoteSuggestions = [];
    if (map) {
      map.flyTo([lat, lng], 7, { animate: true });
      if (!marker) {
        marker = L.circleMarker([lat, lng], {
          radius: 8,
          color,
          fillColor: color,
          fillOpacity: 0.95,
          weight: 2
        }).addTo(map);
      } else {
        marker.setLatLng([lat, lng]);
      }
    }
    dispatch("change", { lat, lng });
  }

  onMount(init);

  onDestroy(() => {
    map?.remove();
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

<div class="picker">
  <div class="picker-header">
    <span>{label}</span>
    {#if lat && lng}
      <span class="coords">Lat: {lat.toFixed(5)}, Lng: {lng.toFixed(5)}</span>
    {:else}
      <span class="coords muted">Noch kein Punkt gesetzt</span>
    {/if}
  </div>
  <div class="search-row">
    <input
      type="text"
      placeholder="Ort oder Land suchen..."
      bind:value={search}
      on:input={() => (suggestionsOpen = search.trim().length > 0)}
      on:focus={() => (suggestionsOpen = search.trim().length > 0)}
    />
    {#if suggestionsOpen && filtered.length > 0 && search.trim().length > 0}
      <ul class="suggestions" role="listbox">
        {#each filtered as place, idx}
          <li>
            <button
              type="button"
              role="option"
              aria-selected="false"
              on:click={() => selectSuggestion(place)}
            >
              <strong>{place.name}</strong>
              <span>{place.subtitle ?? place.country}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
  <div class="map" bind:this={container}></div>
</div>

<style>
  .picker {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .picker-header {
    display: flex;
    justify-content: space-between;
    font-weight: 600;
    color: #0f172a;
  }

  .search-row {
    position: relative;
    z-index: 40;
  }

  .search-row input {
    width: 100%;
    border: 1px solid #d1d5db;
    border-radius: 10px;
    padding: 10px;
    outline: none;
  }

  .suggestions {
    position: absolute;
    left: 0;
    right: 0;
    top: 110%;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
    max-height: 220px;
    overflow: auto;
    z-index: 80;
    list-style: none;
    margin: 0;
    padding: 6px;
  }

  .suggestions li button {
    width: 100%;
    text-align: left;
    padding: 8px 10px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    border: none;
    background: transparent;
    font: inherit;
  }

  .suggestions li button:hover,
  .suggestions li button:focus-visible {
    background: #f1f5f9;
    outline: none;
  }

  .suggestions strong {
    color: #0f172a;
  }

  .suggestions span {
    color: #475569;
  }

  .coords {
    font-size: 0.9rem;
    color: #0f172a;
  }

  .coords.muted {
    color: #6b7280;
  }

  .map {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 260px;
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid #e5e7eb;
  }
</style>
