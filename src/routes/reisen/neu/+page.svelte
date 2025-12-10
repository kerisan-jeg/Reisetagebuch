<script lang="ts">
  import { supabase } from "$lib/supabaseClient";
  import { goto } from "$app/navigation";
  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";
  import LocationPicker from "$lib/components/LocationPicker.svelte";

  // ---------- Formular-Zustand ----------
  let location = "";
  let withWhom = "";
  let costString: string | number = "";
  let ratingString: string | number = "";
  let description = "";
  let startDate = "";
  let endDate = "";
  let imagesFiles: FileList | null = null;
  let lat: number | null = null;
  let lng: number | null = null;

  let loading = false;
  let errorMessage = "";

  // ---------- Hintergrund-Slideshow ----------
  const heroImages = [
    "/landing/Berg.jpg",
    "/landing/Staedtetrip.jpg",
    "/landing/Strand.jpg"
  ];

  let heroIndex = 0;
  let heroInterval: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    if (heroImages.length > 1) {
      heroInterval = setInterval(() => {
        heroIndex = (heroIndex + 1) % heroImages.length;
      }, 8000); // alle 8 Sekunden
    }
  });

  onDestroy(() => {
    if (heroInterval) clearInterval(heroInterval);
  });

  // ---------- Formular-Logik ----------
  function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    imagesFiles = target.files;
  }

  function handleCancel() {
    history.back();
  }

  async function handleSubmit() {
    loading = true;
    errorMessage = "";

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        throw new Error("Bitte melde dich erneut an.");
      }

      const user = userData.user;

      // Titel = Ort + " mit " + Mit wem
      const title =
        withWhom && withWhom.trim().length > 0
          ? `${location} mit ${withWhom}`
          : location;

      const cost =
        String(costString).trim() === "" ? null : Number(costString);
      const rating =
        String(ratingString).trim() === "" ? null : Number(ratingString);

      if (lat == null || lng == null) {
        throw new Error("Bitte setze einen Standort auf der Karte.");
      }

      // 1) Reise speichern (Tabelle: reisen)
      const { data: tripData, error: tripError } = await supabase
        .from("reisen")
        .insert({
          user_id: user.id,
          title,
          location,
          with_whom: withWhom || null,
          cost,
          rating,
          description: description || null,
          start_date: startDate || null,
          end_date: endDate || null,
          lat,
          lng
        })
        .select()
        .single();

      if (tripError || !tripData) {
        console.error(tripError);
        throw new Error("Reise konnte nicht gespeichert werden.");
      }

      const tripId: string = tripData.id;

      // 2) Bilder hochladen
      let imageUrls: string[] = [];

      if (imagesFiles && imagesFiles.length > 0) {
        const bucket = "uploads";
        for (const file of Array.from(imagesFiles)) {
          const filePath = `reisen/${user.id}/${tripId}/${crypto.randomUUID()}-${file.name}`;

          const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);

          if (uploadError) {
            console.error(uploadError);
            throw new Error(`Bild-Upload ist fehlgeschlagen: ${uploadError.message}`);
          }

          const {
            data: { publicUrl }
          } = supabase.storage.from(bucket).getPublicUrl(filePath);

          imageUrls.push(publicUrl);
        }

        // 3) Bild-URLs in der Reise speichern
        const { error: updateError } = await supabase.from("reisen").update({ images: imageUrls }).eq("id", tripId);

        if (updateError) {
          console.error(updateError);
          throw new Error("Bilder konnten der Reise nicht zugeordnet werden.");
        }
      }

      const mongoRes = await fetch("/api/reisen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip: {
            id: tripId,
            user_id: user.id,
            title,
            location,
            with_whom: withWhom || null,
            cost,
            rating,
            description: description || null,
            start_date: startDate || null,
            end_date: endDate || null,
            lat,
            lng,
            cover_image_url: imageUrls[0] ?? null
          },
          images: imageUrls
        })
      });

      const mongoPayload = await mongoRes.json();
      if (!mongoRes.ok || !mongoPayload?.ok) {
        console.error("Mongo Sync fehlgeschlagen:", mongoPayload?.error || mongoRes.statusText);
        throw new Error("Reise konnte nicht in MongoDB gespeichert werden.");
      }

      goto("/reisen");
    } catch (err: any) {
      console.error(err);
      errorMessage =
        err?.message || "Es ist ein Fehler beim Speichern aufgetreten.";
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Neue Reise hinzufuegen</title>
</svelte:head>

<div class="page">
  <div class="hero">
    {#if heroImages.length > 0}
      {#key heroIndex}
        <div
          class="hero-bg"
          style={`background-image: url('${heroImages[heroIndex]}')`}
          in:fade={{ duration: 800 }}
          out:fade={{ duration: 800 }}
        ></div>
      {/key}
    {/if}

    <div class="hero-overlay">
      <div class="form-card">
        <h1>Neue Reise hinzufuegen</h1>

        {#if errorMessage}
          <p class="error">{errorMessage}</p>
        {/if}

        <form
          on:submit|preventDefault={handleSubmit}
          class="trip-form"
        >
          <div class="row">
            <div class="field">
              <label for="trip-location">Ort</label>
              <input
                id="trip-location"
                type="text"
                bind:value={location}
                required
                placeholder="z.B. Paris"
              />
            </div>

            <div class="field">
              <label for="trip-withwhom">Mit wem</label>
              <input
                id="trip-withwhom"
                type="text"
                bind:value={withWhom}
                placeholder="z.B. Luis"
              />
            </div>
          </div>

          <div class="row">
            <div class="field">
              <label for="trip-cost">Kosten (CHF)</label>
              <input
                id="trip-cost"
                type="number"
                step="0.05"
                bind:value={costString}
                placeholder="z.B. 1200"
              />
            </div>

            <div class="field">
              <label for="trip-rating">Rating (1-5)</label>
              <input
                id="trip-rating"
                type="number"
                min="1"
                max="5"
                bind:value={ratingString}
                placeholder="z.B. 5"
              />
            </div>
          </div>

          <div class="row">
            <div class="field full">
              <label for="trip-images">Bilder hochladen</label>
              <input
                id="trip-images"
                type="file"
                multiple
                accept="image/*"
                on:change={handleFileChange}
              />
            </div>
          </div>

          <div class="row">
            <div class="field full">
              <label for="trip-description">Beschreibung</label>
              <textarea
                id="trip-description"
                rows="4"
                bind:value={description}
                placeholder="Besondere Momente, Highlights, Erinnerungen..."
              ></textarea>
            </div>
          </div>

          <div class="row">
            <div class="field full">
              <LocationPicker
                bind:lat
                bind:lng
                color="#e11d48"
                label="Standort setzen (Reise)"
              />
            </div>
          </div>

          <div class="row">
            <div class="field">
              <label for="trip-start">Startdatum</label>
              <input id="trip-start" type="date" bind:value={startDate} required />
            </div>

            <div class="field">
              <label for="trip-end">Enddatum</label>
              <input id="trip-end" type="date" bind:value={endDate} required />
            </div>
          </div>

          <div class="actions">
            <button
              type="button"
              class="btn-secondary"
              on:click={handleCancel}
              disabled={loading}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              class="btn-primary"
              disabled={loading}
            >
              {#if loading}
                Speichere...
              {:else}
                Reise speichern
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>

<style>
  .page {
    min-height: 100vh;
  }

  .hero {
    position: relative;
    min-height: 100vh;
    overflow: hidden;
  }

  .hero-bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    filter: brightness(0.7);
    z-index: -2;
  }

  .hero-overlay {
    position: relative;
    z-index: 1;
    padding: 3rem 1.5rem;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }

  .form-card {
    max-width: 1100px;
    width: 100%;
    background: rgba(255, 255, 255, 0.96);
    border-radius: 2rem;
    padding: 2.4rem 2.8rem 2.2rem;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  }

  h1 {
    margin: 0 0 1.5rem;
    font-size: 2.3rem;
  }

  .error {
    background: #fee2e2;
    color: #991b1b;
    padding: 0.8rem 1rem;
    border-radius: 0.75rem;
    margin-bottom: 1rem;
  }

  .trip-form {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }

  .row {
    display: flex;
    gap: 1.5rem;
  }

  .field {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .field.full {
    flex: 1 0 100%;
  }

  label {
    font-weight: 500;
  }

  input,
  textarea {
    border-radius: 999px;
    border: 1px solid #d1d5db;
    padding: 0.75rem 1rem;
    font-size: 0.95rem;
  }

  textarea {
    border-radius: 1.25rem;
    resize: vertical;
  }

  input:focus,
  textarea:focus {
    outline: none;
    border-color: #111827;
  }

  .actions {
    margin-top: 1.4rem;
    display: flex;
    justify-content: flex-end;
    gap: 0.8rem;
  }

  .btn-primary,
  .btn-secondary {
    border-radius: 999px;
    padding: 0.7rem 1.6rem;
    font-size: 0.95rem;
    border: none;
    cursor: pointer;
  }

  .btn-primary {
    background: #020617;
    color: white;
  }

  .btn-secondary {
    background: white;
    color: #020617;
    border: 1px solid #d1d5db;
  }

  .btn-primary:disabled,
  .btn-secondary:disabled {
    opacity: 0.6;
    cursor: default;
  }

  @media (max-width: 900px) {
    .row {
      flex-direction: column;
    }

    .form-card {
      padding: 2rem 1.4rem;
    }
  }
</style>
