<script lang="ts">
	import { onMount } from "svelte";
	import { supabase } from "$lib/supabaseClient";
	import { page } from "$app/stores";

	let user: any = null;
	let reiseId = "";
	$page.subscribe((p) => (reiseId = p.params.id));

	let titel = "";
	let beschreibung = "";
	let cover_url: string | null = null;
	let coverFile: File | null = null;

	let loading = true;
	let saving = false;
	let errorMessage = "";
	let successMessage = "";

	onMount(async () => {
		const { data } = await supabase.auth.getUser();
		user = data?.user;

		if (!user) {
			window.location.href = "/login";
			return;
		}

		await loadReise();
	});

	async function loadReise() {
		loading = true;
		errorMessage = "";

		const { data, error } = await supabase
			.from("reisen")
			.select("*")
			.eq("id", reiseId)
			.eq("user_id", user.id)
			.single();

		if (error || !data) {
			console.error(error);
			errorMessage = "Reise konnte nicht geladen werden.";
			loading = false;
			return;
		}

		titel = data.titel ?? "";
		beschreibung = data.beschreibung ?? "";
		cover_url = data.cover_url ?? null;

		loading = false;
	}

	async function saveReise() {
		errorMessage = "";
		successMessage = "";

		if (!titel) {
			errorMessage = "Bitte gib einen Titel ein.";
			return;
		}

		saving = true;

		let new_cover_url = cover_url;

		// Wenn ein neues Bild hochgeladen wurde → hochladen
		if (coverFile) {
			const fileExt = coverFile.name.split(".").pop();
			const fileName = `${crypto.randomUUID()}.${fileExt}`;
			const filePath = `reisen/${user.id}/${fileName}`;

			const { error: uploadError } = await supabase.storage
				.from("uploads")
				.upload(filePath, coverFile);

			if (uploadError) {
				console.error(uploadError);
				errorMessage = "Fehler beim Hochladen des neuen Bildes.";
				saving = false;
				return;
			}

			const { data: publicUrl } = supabase.storage
				.from("uploads")
				.getPublicUrl(filePath);

			new_cover_url = publicUrl.publicUrl;
		}

		const { error } = await supabase
			.from("reisen")
			.update({
				titel,
				beschreibung,
				cover_url: new_cover_url
			})
			.eq("id", reiseId)
			.eq("user_id", user.id);

		saving = false;

		if (error) {
			console.error(error);
			errorMessage = "Fehler beim Speichern der Änderungen.";
			return;
		}

		successMessage = "Änderungen gespeichert!";
		// optional: direkt zurück zur Detail-Seite
		// window.location.href = `/reisen/${reiseId}`;
	}
</script>

<div class="w-full min-h-screen bg-black text-white p-6 flex justify-center">
	<div class="w-full max-w-xl bg-neutral-900 p-6 rounded-xl shadow-xl mt-10">

		<h1 class="text-3xl font-bold mb-6 text-center">Reise bearbeiten</h1>

		{#if loading}
			<p class="text-center opacity-70">Lade Reise…</p>
		{:else}
			{#if errorMessage}
				<p class="text-center text-red-400 mb-4">{errorMessage}</p>
			{/if}

			{#if successMessage}
				<p class="text-center text-green-400 mb-4">{successMessage}</p>
			{/if}

			<label class="block mb-4">
				<span class="opacity-80">Titel</span>
				<input
					bind:value={titel}
					type="text"
					class="w-full mt-1 p-2 rounded bg-neutral-800"
					placeholder="Titel deiner Reise"
				/>
			</label>

			<label class="block mb-4">
				<span class="opacity-80">Beschreibung</span>
				<textarea
					bind:value={beschreibung}
					rows="4"
					class="w-full mt-1 p-2 rounded bg-neutral-800"
					placeholder="Beschreibe deine Reise..."
				></textarea>
			</label>

			{#if cover_url}
				<div class="mb-4">
					<span class="opacity-80 block mb-2">Aktuelles Titelbild</span>
					<img src={cover_url} alt="Cover" class="w-full max-h-60 object-cover rounded-lg" />
				</div>
			{/if}

			<label class="block mb-6">
				<span class="opacity-80">Neues Titelbild (optional)</span>
				<input
					type="file"
					accept="image/*"
					on:change={(e) => (coverFile = e.target.files[0])}
					class="w-full mt-2"
				/>
				<p class="text-xs opacity-60 mt-1">
					Wenn du hier ein Bild auswählst, ersetzt es das aktuelle Titelbild.
				</p>
			</label>

			<button
				on:click={saveReise}
				class="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-lg text-lg font-semibold"
				disabled={saving}
			>
				{saving ? "Speichere..." : "Änderungen speichern"}
			</button>

			<a
				href={`/reisen/${reiseId}`}
				class="block text-center opacity-80 hover:opacity-100 mt-4"
			>
				← Zurück zur Reise
			</a>
		{/if}
	</div>
</div>

<style>
	a {
		color: inherit;
		text-decoration: none;
	}
</style>
