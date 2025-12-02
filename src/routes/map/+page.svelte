<script lang="ts">
	import { onMount } from "svelte";
	import { supabase } from "$lib/supabaseClient";

	let user: any = null;
	let reisen: any[] = [];
	let loading = true;

	let mapContainer: HTMLDivElement;
	let map: any;
	let L: any;

	onMount(async () => {
		// User check
		const { data } = await supabase.auth.getUser();
		user = data?.user;

		if (!user) {
			window.location.href = "/login";
			return;
		}

		// Reisen laden
		const { data: trips, error } = await supabase
			.from("reisen")
			.select("*")
			.eq("user_id", user.id);

		if (!error && trips) {
			reisen = trips;
		}

		loading = false;

		// Leaflet nur im Browser laden (kein SSR-Problem)
		const leaflet = await import("leaflet");
		L = leaflet.default;

		// Karte initialisieren (Mittelpunkt Deutschland)
		map = L.map(mapContainer).setView([51.1657, 10.4515], 5);

		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution: "&copy; OpenStreetMap-Mitwirkende"
		}).addTo(map);

		// Marker für Reisen setzen, falls lat/lng vorhanden
		reisen.forEach((r) => {
			if (r.lat && r.lng) {
				L.marker([r.lat, r.lng])
					.addTo(map)
					.bindPopup(`<b>${r.titel}</b><br>${r.beschreibung ?? ""}`);
			}
		});
	});
</script>

<svelte:head>
	<!-- Leaflet CSS von CDN -->
	<link
		rel="stylesheet"
		href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
		integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
		crossorigin=""
	/>
</svelte:head>

<div class="w-full min-h-screen bg-black text-white flex flex-col">
	<div class="p-4 flex justify-between items-center">
		<h1 class="text-2xl font-bold">Deine Reisen auf der Karte</h1>
		<a
			href="/reisen"
			class="px-3 py-1 rounded-full bg-neutral-800 hover:bg-neutral-700 text-sm"
		>
			← Zur Liste
		</a>
	</div>

	{#if loading}
		<p class="p-4 opacity-70">Karte wird geladen…</p>
	{:else}
		{#if reisen.length === 0}
			<p class="p-4 opacity-70">
				Du hast noch keine Reisen. Lege zuerst eine Reise an, dann kannst du sie hier
				auf der Karte sehen.
			</p>
		{/if}

		<!-- Karten-Container -->
		<div
			bind:this={mapContainer}
			class="flex-1 m-4 rounded-xl overflow-hidden"
			style="min-height: 60vh; background: #111;"
		/>
	{/if}
</div>
