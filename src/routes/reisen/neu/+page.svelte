<script lang="ts">
  import { supabase } from "$lib/supabaseClient";
  import { goto } from "$app/navigation";
  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";
  import LocationPicker from "$lib/components/LocationPicker.svelte";
  import { t } from "$lib/i18n";

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

  const todayIso = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const parseDate = (val: string) => {
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? null : d;
  };

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
        throw new Error($t("tripForm.errorAuth"));
      }

      const user = userData.user;

      // Titel = Ort + " mit " + Mit wem
      const title =
        withWhom && withWhom.trim().length > 0
          ? `${location} mit ${withWhom}`
          : location;

      const cost =
        String(costString).trim() === "" ? null : Number(costString);
      const ratingInput = String(ratingString).trim();
      const ratingRaw = ratingInput === "" ? null : parseFloat(ratingInput);
      const rating =
        ratingRaw === null || Number.isNaN(ratingRaw) ? null : Math.round(ratingRaw * 10);

      const start = parseDate(startDate);
      const end = parseDate(endDate);
      const today = todayIso();

      if (!start || !end) {
        throw new Error("Bitte Start- und Enddatum setzen.");
      }
      if (start > today || end > today) {
        throw new Error("Reisedaten dürfen nicht in der Zukunft liegen.");
      }
      if (start > end) {
        throw new Error("Startdatum darf nicht nach dem Enddatum liegen.");
      }

      if (lat == null || lng == null) {
        throw new Error($t("tripForm.errorLocation"));
      }

      const tripId = crypto.randomUUID();

      // Falls Bilder vorhanden: zuerst hochladen, damit wir cover_image_url schon beim Insert mitgeben können
      let imageUrls: string[] = [];
      if (imagesFiles && imagesFiles.length > 0) {
        const bucket = "uploads";
        for (const file of Array.from(imagesFiles)) {
          const filePath = `reisen/${user.id}/${tripId}/${crypto.randomUUID()}-${file.name}`;

          const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);

          if (uploadError) {
            console.error(uploadError);
            throw new Error(`${$t("tripForm.errorUpload")} ${uploadError.message ?? ""}`.trim());
          }

          const {
            data: { publicUrl }
          } = supabase.storage.from(bucket).getPublicUrl(filePath);

          imageUrls.push(publicUrl);
        }
      }

      // Reise speichern (Tabelle: reisen)
      const { error: tripError } = await supabase
        .from("reisen")
        .insert({
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
          images: imageUrls,
          cover_image_url: imageUrls[0] ?? null
        });

      if (tripError) {
        console.error(tripError);
        throw new Error(tripError.message || $t("tripForm.errorSave"));
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
        throw new Error($t("tripForm.errorMongo"));
      }

      goto("/reisen");
    } catch (err: any) {
      console.error(err);
      errorMessage =
        err?.message || $t("tripForm.errorSave");
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>{$t("tripForm.title")}</title>
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
        <h1>{$t("tripForm.title")}</h1>

        {#if errorMessage}
          <p class="error">{errorMessage}</p>
        {/if}

        <form
          on:submit|preventDefault={handleSubmit}
          class="trip-form"
        >
          <div class="row">
            <div class="field">
              <label for="trip-location">{$t("tripForm.location")}</label>
              <input
                id="trip-location"
                type="text"
                bind:value={location}
                required
                placeholder={$t("tripForm.placeholder.location")}
              />
            </div>

            <div class="field">
              <label for="trip-withwhom">{$t("tripForm.withWhom")}</label>
              <input
                id="trip-withwhom"
                type="text"
                bind:value={withWhom}
                placeholder={$t("tripForm.placeholder.withWhom")}
              />
            </div>
          </div>

          <div class="row">
            <div class="field">
              <label for="trip-cost">{$t("tripForm.cost")}</label>
              <input
                id="trip-cost"
                type="number"
                step="5"
                bind:value={costString}
                placeholder={$t("tripForm.placeholder.cost")}
              />
            </div>

            <div class="field">
              <label for="trip-rating">{$t("tripForm.rating")}</label>
              <input
                id="trip-rating"
                type="number"
                min="1"
                max="10"
                step="0.1"
                bind:value={ratingString}
                placeholder={$t("tripForm.placeholder.rating")}
              />
            </div>
          </div>

          <div class="row">
            <div class="field full">
              <label for="trip-images">{$t("tripForm.images")}</label>
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
              <label for="trip-description">{$t("tripForm.description")}</label>
              <textarea
                id="trip-description"
                rows="4"
                bind:value={description}
                placeholder={$t("tripForm.placeholder.description")}
              ></textarea>
            </div>
          </div>

          <div class="row">
            <div class="field full">
              <LocationPicker
                bind:lat
                bind:lng
                color="#e11d48"
                label={$t("tripForm.locationPicker")}
              />
            </div>
          </div>

          <div class="row">
            <div class="field">
              <label for="trip-start">{$t("tripForm.start")}</label>
              <input id="trip-start" type="date" bind:value={startDate} required />
            </div>

            <div class="field">
              <label for="trip-end">{$t("tripForm.end")}</label>
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
              {$t("tripForm.cancel")}
            </button>
            <button
              type="submit"
              class="btn-primary"
              disabled={loading}
            >
              {#if loading}
                …
              {:else}
                {$t("tripForm.save")}
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
