<script lang="ts">
	import { supabase } from "$lib/supabaseClient";
	import { onMount } from "svelte";

	let firstName = "";
	let lastName = "";
	let birthday = ""; // Format: yyyy-mm-dd aus <input type="date">
	let email = "";
	let password = "";

	let loading = false;
	let message = "";
	let errorMessage = "";
	const redirectBase =
		typeof window !== "undefined" ? window.location.origin : "https://reisetagebuch1234.netlify.app";

	onMount(async () => {
		// Falls schon eingeloggt → direkt weiter
		const { data } = await supabase.auth.getUser();
		if (data?.user) {
			window.location.href = "/reisen";
		}
	});

	async function registerUser() {
		message = "";
		errorMessage = "";

		if (!email.includes("@") || !email.includes(".")) {
			errorMessage = "Bitte gib eine gültige E-Mail-Adresse ein.";
			return;
		}

		if (password.length < 6) {
			errorMessage = "Das Passwort muss mindestens 6 Zeichen lang sein.";
			return;
		}

		loading = true;

		const { error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				// zusätzliche Daten im Profil (user_metadata)
				data: {
					first_name: firstName,
					last_name: lastName,
					birthday
				},
				// Wohin der Bestätigungslink nach dem Klick weiterleitet:
				emailRedirectTo: `${redirectBase}/login`
			}
		});

		loading = false;

		if (error) {
			errorMessage = error.message;
			return;
		}

		message =
			"Registrierung erfolgreich! Bitte bestätige deine E-Mail-Adresse. Schau in dein Postfach (und Spam-Ordner).";
	}
</script>

<div class="min-h-screen flex justify-center px-4 py-10 bg-white text-black">
	<div class="w-full max-w-2xl mt-10 px-3 sm:px-0">
		<h1 class="text-4xl font-bold mb-8">Registrieren</h1>

		{#if errorMessage}
			<p class="text-red-600 mb-4">{errorMessage}</p>
		{/if}

		{#if message}
			<p class="text-green-600 mb-4">{message}</p>
		{/if}

		<div class="space-y-4">
			<div>
				<label class="block mb-1 font-medium" for="reg-first">Vorname</label>
				<input
					id="reg-first"
					type="text"
					bind:value={firstName}
					class="w-full border border-gray-300 rounded px-3 py-2"
					placeholder="Vorname"
				/>
			</div>

			<div>
				<label class="block mb-1 font-medium" for="reg-last">Nachname</label>
				<input
					id="reg-last"
					type="text"
					bind:value={lastName}
					class="w-full border border-gray-300 rounded px-3 py-2"
					placeholder="Nachname"
				/>
			</div>

			<div>
				<label class="block mb-1 font-medium" for="reg-birthday">Geburtsdatum</label>
				<input
					id="reg-birthday"
					type="date"
					bind:value={birthday}
					class="border border-gray-300 rounded px-3 py-2"
				/>
			</div>

			<div>
				<label class="block mb-1 font-medium" for="reg-email">E-Mail</label>
				<input
					id="reg-email"
					type="email"
					bind:value={email}
					class="w-full border border-gray-300 rounded px-3 py-2 bg-yellow-100"
					placeholder="deine@email.ch"
				/>
			</div>

			<div>
				<label class="block mb-1 font-medium" for="reg-password">Passwort</label>
				<input
					id="reg-password"
					type="password"
					bind:value={password}
					class="w-full border border-gray-300 rounded px-3 py-2 bg-yellow-100"
					placeholder="••••••"
				/>
			</div>

			<button
				on:click={registerUser}
				class="mt-4 px-6 py-2 bg-black text-white rounded hover:bg-gray-900"
				disabled={loading}
			>
				{loading ? "Registriere..." : "Registrieren"}
			</button>
		</div>

		<p class="mt-6">
			Schon ein Konto?
			<a href="/login" class="text-purple-700 underline">Jetzt einloggen</a>
		</p>
	</div>
</div>
