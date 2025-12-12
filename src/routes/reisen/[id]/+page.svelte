<script lang="ts">
  import { supabase } from "$lib/supabaseClient";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  type ReiseDetail = {
    id?: string;
    images?: string[];
    title?: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    rating?: number | null;
    with_whom?: string;
    cost?: number | null;
    description?: string;
    lat?: number | null;
    lng?: number | null;
    [key: string]: any;
  };

  let reise: ReiseDetail | null = null;
  let loading: boolean = true;
  let errorMessage: string = "";
  let currentIndex: number = 0;
  let autoSlide: ReturnType<typeof setInterval> | null = null;
  let userId: string | null = null;

  let cropMode = false;
  let cropZoom = 1;
  let cropOffset = { x: 0, y: 0 };
  let cropDragging = false;
  let dragStart = { x: 0, y: 0 };
  let offsetStart = { x: 0, y: 0 };
  let cropImageSrc = "";
  let cropWidth = 900;
  let cropHeight = 520;

  onMount(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;

    if (userError || !user) {
      errorMessage = "Bitte melde dich erneut an.";
      loading = false;
      return;
    }
    userId = user.id;

    const id = $page.params.id;

    try {
      const res = await fetch(`/api/reisen/${id}?user_id=${encodeURIComponent(user.id)}`);
      const payload = await res.json();

      if (!res.ok || !payload?.ok) {
        console.error(payload?.error || res.statusText);
        errorMessage = payload?.error || "Reise konnte nicht geladen werden.";
      } else {
        reise = payload.trip;
      }
    } catch (err) {
      console.error(err);
      errorMessage = "Reise konnte nicht geladen werden.";
    }

    loading = false;

    if (reise?.images && reise.images.length > 1) {
      startAutoSlide();
    }
  });

  function startAutoSlide() {
    if (autoSlide) clearInterval(autoSlide);
    autoSlide = setInterval(() => {
      if (reise?.images && reise.images.length > 1) {
        currentIndex = (currentIndex + 1) % reise.images.length;
      }
    }, 5000);
  }

  function prevImage() {
    if (!reise?.images || !reise.images.length) return;
    currentIndex = (currentIndex - 1 + reise.images.length) % reise.images.length;
    startAutoSlide();
  }

  function nextImage() {
    if (!reise?.images || !reise.images.length) return;
    currentIndex = (currentIndex + 1) % reise.images.length;
    startAutoSlide();
  }

  function formatDate(iso?: string | null) {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }

  function goBack() {
    goto("/reisen");
  }

  function startCrop() {
    if (!reise?.images?.length) return;
    cropImageSrc = reise.images[currentIndex];
    cropMode = true;
    cropZoom = 1;
    cropOffset = { x: 0, y: 0 };
    // Groesse dynamisch an Bild-/Viewport-Verhaeltnis anpassen
    const maxW = Math.min(window.innerWidth * 0.9, 900);
    const maxH = Math.min(window.innerHeight * 0.8, 700);
    cropWidth = maxW;
    cropHeight = Math.min(maxH, 520);
    const img = new Image();
    img.onload = () => {
      const aspect = img.height / img.width;
      cropHeight = Math.min(maxH, Math.max(320, maxW * aspect));
    };
    img.src = cropImageSrc;
    if (autoSlide) {
      clearInterval(autoSlide);
      autoSlide = null;
    }
  }

  function closeCrop() {
    cropMode = false;
    startAutoSlide();
  }

  function onDragStart(event: MouseEvent | TouchEvent) {
    cropDragging = true;
    const point = "touches" in event ? event.touches[0] : event;
    dragStart = { x: point.clientX, y: point.clientY };
    offsetStart = { ...cropOffset };
  }

  function onDragMove(event: MouseEvent | TouchEvent) {
    if (!cropDragging) return;
    const point = "touches" in event ? event.touches[0] : event;
    const dx = point.clientX - dragStart.x;
    const dy = point.clientY - dragStart.y;
    cropOffset = { x: offsetStart.x + dx, y: offsetStart.y + dy };
  }

  function onDragEnd() {
    cropDragging = false;
  }

  async function saveCrop() {
    if (!cropImageSrc || !reise?.id || !userId) {
      closeCrop();
      return;
    }
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      const loadPromise = new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(e);
      });
      img.src = cropImageSrc;
      await loadPromise;

      const targetW = 1600;
      const targetH = 1000;
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas Kontext fehlt");

      const scale = cropZoom;
      const cx = targetW / 2 + cropOffset.x;
      const cy = targetH / 2 + cropOffset.y;
      const drawW = img.width * scale;
      const drawH = img.height * scale;

      ctx.fillStyle = "#f3f4f6";
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) throw new Error("Konnte Bild nicht rendern.");

      const bucket = "uploads";
      const filePath = `reisen/${userId}/${reise.id}/crop-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, blob);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      const newUrl = urlData.publicUrl;

      const newImages = [...(reise.images ?? [])];
      newImages[currentIndex] = newUrl;

      await supabase.from("reisen").update({ images: newImages, cover_image_url: newImages[0] ?? null }).eq("id", reise.id);

      try {
        await fetch("/api/reisen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trip: {
              id: reise.id,
              user_id: userId,
              title: reise.title,
              location: reise.location,
              with_whom: reise.with_whom ?? null,
              cost: reise.cost ?? null,
              rating: reise.rating ?? null,
              description: reise.description ?? null,
              start_date: reise.start_date ?? null,
              end_date: reise.end_date ?? null,
              lat: reise.lat ?? null,
              lng: reise.lng ?? null,
              cover_image_url: newImages[0] ?? null,
              images: newImages
            },
            images: newImages
          })
        });
      } catch (e) {
        console.warn("Mongo-Sync nach Crop fehlgeschlagen:", e);
      }

      reise = { ...reise, images: newImages, cover_image_url: newImages[0] ?? null };
      cropMode = false;
      startAutoSlide();
    } catch (err) {
      console.error("Crop-Fehler:", err);
      errorMessage = "Bild konnte nicht zugeschnitten werden.";
    }
  }
</script>

<button class="back" type="button" on:click={goBack} aria-label="Zurueck zur Uebersicht">
  &larr; Zurueck
</button>

{#if loading}
  <p style="margin-left:3rem;">Lädt...</p>
{:else if errorMessage}
  <p style="margin-left:3rem;">{errorMessage}</p>
  {:else if !reise}
    <p style="margin-left:3rem;">Reise nicht gefunden.</p>
{:else}
  <div class="detail-card">
    <div class="image-area">
      {#if reise.images && reise.images.length > 0}
        <img src={reise.images[currentIndex]} alt={`Bild ${currentIndex + 1}`} />

        {#if reise.images.length > 1}
          <button class="nav-btn left" on:click={prevImage} aria-label="Vorheriges Bild">
            &lt;
          </button>
          <button class="nav-btn right" on:click={nextImage} aria-label="Naechstes Bild">
            &gt;
          </button>
        {/if}
      {:else}
        <div class="image-placeholder">Keine Bilder vorhanden</div>
      {/if}
      <button class="crop-btn" type="button" on:click={startCrop} aria-label="Bild zuschneiden">✂</button>
    </div>

    <div class="info">
      <h1>{reise.title}</h1>

      <p class="meta"><strong>Ort:</strong> {reise.location}</p>
      <p class="meta"><strong>Zeitraum:</strong> {formatDate(reise.start_date)} - {formatDate(reise.end_date)}</p>
      {#if reise.lat != null && reise.lng != null}
        <p class="meta">
          <a class="map-link" href={`/karte?lat=${reise.lat}&lng=${reise.lng}`} aria-label="Auf Karte anzeigen">
            Auf Karte ansehen
          </a>
        </p>
      {/if}
      {#if reise.rating != null}
        <p class="meta"><strong>Bewertung:</strong> {reise.rating}</p>
      {/if}
      {#if reise.with_whom}
        <p class="meta"><strong>Mit wem:</strong> {reise.with_whom}</p>
      {/if}
      {#if reise.cost != null}
        <p class="meta"><strong>Kosten:</strong> {reise.cost}</p>
      {/if}

      <h3>Beschreibung</h3>
      <p class="description">{reise.description}</p>
    </div>
  </div>

  {#if cropMode}
    <div class="crop-overlay">
      <div
        class="crop-area"
        bind:this={cropContainer}
        style={`width:${cropWidth}px; height:${cropHeight}px;`}
        on:mousedown|preventDefault={onDragStart}
        on:mousemove|preventDefault={onDragMove}
        on:mouseup={onDragEnd}
        on:mouseleave={onDragEnd}
        on:touchstart|preventDefault={onDragStart}
        on:touchmove|preventDefault={onDragMove}
        on:touchend={onDragEnd}
      >
        <div
          class="crop-image"
          style={`background-image:url('${cropImageSrc}'); transform: translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropZoom});`}
        ></div>
        <div class="crop-frame"></div>
      </div>
      <div class="crop-controls">
        <label for="zoom">Zoom</label>
        <input
          id="zoom"
          type="range"
          min="1"
          max="2.5"
          step="0.01"
          bind:value={cropZoom}
        />
        <div class="crop-actions">
          <button type="button" class="btn ghost" on:click={closeCrop}>Abbrechen</button>
          <button type="button" class="btn primary" on:click={saveCrop}>Zuschneiden &amp; speichern</button>
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .back {
    margin: 2rem 3rem 1rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
  }

  .detail-card {
    margin: 0 3rem 3rem;
    padding: 2.4rem;
    background: #f3f4f6;
    border-radius: 30px;
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
    gap: 2.5rem;
    align-items: stretch;
    max-width: 1400px;
    box-shadow: 0 30px 60px rgba(0,0,0,0.12);
  }

  .image-area {
    position: relative;
    border-radius: 24px;
    overflow: hidden;
    background: #e5e7eb;
    min-height: 520px;
    max-height: 520px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .crop-btn {
    position: absolute;
    top: 14px;
    right: 14px;
    border: none;
    background: rgba(17, 24, 39, 0.65);
    color: #fff;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    cursor: pointer;
    font-size: 1.1rem;
    display: grid;
    place-items: center;
  }

  .image-area img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .image-placeholder {
    width: 100%;
    height: 100%;
    display:flex;
    align-items:center;
    justify-content:center;
    color:#6b7280;
  }

  .nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    border-radius: 999px;
    border: none;
    width: 46px;
    height: 46px;
    background: rgba(17, 24, 39, 0.7);
    color: white;
    cursor: pointer;
    display: grid;
    place-items: center;
    font-size: 1.1rem;
  }
  .nav-btn.left { left: 12px; }
  .nav-btn.right { right: 12px; }

  .crop-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: grid;
    place-items: center;
    z-index: 50;
    padding: 1.5rem;
  }

  .crop-area {
    position: relative;
    width: min(90vw, 900px);
    height: min(70vh, 520px);
    background: #0f172a;
    border-radius: 16px;
    overflow: hidden;
  }

  .crop-image {
    position: absolute;
    inset: 0;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    will-change: transform;
    background-color: #0f172a;
  }

  .crop-frame {
    position: absolute;
    inset: 5%;
    border: 2px solid rgba(255, 255, 255, 0.8);
    border-radius: 12px;
    pointer-events: none;
    box-shadow: 0 0 0 9999px rgba(0,0,0,0.25);
  }

  .crop-controls {
    margin-top: 1rem;
    background: #f9fafb;
    padding: 1rem 1.2rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 0.8rem;
    width: min(90vw, 900px);
  }

  .crop-actions {
    margin-left: auto;
    display: flex;
    gap: 0.6rem;
  }

  .btn {
    border: none;
    border-radius: 10px;
    padding: 0.6rem 1rem;
    cursor: pointer;
    font-weight: 600;
  }
  .btn.ghost { background: #e5e7eb; color: #111827; }
  .btn.primary { background: #111827; color: white; }

  .info h1 {
    font-size: 2.6rem;
    margin-bottom: 1rem;
  }

  .info .meta {
    margin: 0.25rem 0;
    color: #1f2937;
  }

  .info h3 {
    margin-top: 1.5rem;
    margin-bottom: 0.4rem;
    font-size: 1.2rem;
  }

  .description {
    line-height: 1.6;
    color: #374151;
  }
</style>
