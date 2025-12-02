<script lang="ts">
  import { supabase } from "$lib/supabaseClient";
  import { goto } from "$app/navigation";
  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";

  let ort = "";
  let ideen = "";
  let file: File | null = null;

  let loading = false;
  let errorMessage = "";

  const heroImages = ["/landing/Berg.jpg", "/landing/Staedtetrip.jpg", "/landing/Strand.jpg"];
  let heroIndex = 0;
  let heroInterval: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    if (heroImages.length > 1) {
      heroInterval = setInterval(() => {
        heroIndex = (heroIndex + 1) % heroImages.length;
      }, 8000);
    }
  });

  onDestroy(() => {
    if (heroInterval) clearInterval(heroInterval);
  });

  function handleFileChange(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    const files = target.files;
    file = files && files.length > 0 ? files[0] : null;
  }

  function handleBulletsFocus(event: FocusEvent) {
    const target = event.target as HTMLTextAreaElement;
    if (!ideen || ideen.trim() === "") {
      ideen = "• ";
      queueMicrotask(() => {
        const pos = ideen.length;
        target.selectionStart = target.selectionEnd = pos;
      });
    }
  }

  function handleBulletsKeydown(event: KeyboardEvent) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const target = event.target as HTMLTextAreaElement;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const prefix = "• ";
    const value = ideen ?? "";
    const before = value.slice(0, start);
    const after = value.slice(end);
    const insert = (start === 0 ? prefix : "\n" + prefix);
    ideen = before + insert + after;
    const cursor = before.length + insert.length;
    queueMicrotask(() => {
      target.selectionStart = target.selectionEnd = cursor;
    });
  }

  function handleCancel() {
    history.back();
  }

  const handleSubmit = async () => {
    errorMessage = "";
    loading = true;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error(userError);
    }
    if (!userData?.user) {
      errorMessage = "Bitte melde dich erneut an (kein Benutzer gefunden).";
      loading = false;
      return;
    }
    const user = userData.user;

    let imageUrl: string | null = null;
    let imageUrls: string[] = [];

    if (file) {
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("bucketlist")
        .upload(filePath, file);

      if (uploadError) {
        console.error(uploadError);
        errorMessage = "Bild-Upload fehlgeschlagen: " + uploadError.message;
        loading = false;
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("bucketlist").getPublicUrl(uploadData.path);
      imageUrl = publicUrlData.publicUrl;
      imageUrls = imageUrl ? [imageUrl] : [];
    }

    const { data: insertData, error: insertError } = await supabase
      .from("bucketlist")
      .insert({
        user_id: user.id,
        title: ort,
        location: ort,
        description: ideen,
        cover_image_url: imageUrl,
        images: imageUrls
      })
      .select()
      .single();

    if (insertError) {
      console.error(insertError);
      errorMessage = insertError.message || "Traumdestination konnte nicht gespeichert werden.";
      loading = false;
      return;
    }

    const itemId: string = insertData!.id;

    try {
      await fetch("/api/bucketlist/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          item_id: itemId,
          title: ort,
          location: ort,
          images: imageUrls
        })
      });
    } catch (logErr) {
      console.warn("Mongo-Log schlug fehl (ignoriert):", logErr);
    }

    loading = false;
    goto("/bucketlist");
  };
</script>

<svelte:head>
  <title>Traumdestination hinzufügen</title>
</svelte:head>

<div class="page">
  <div class="background">
    {#key heroIndex}
      <div
        class="bg-image"
        style={`background-image: url('${heroImages[heroIndex]}')`}
        in:fade={{ duration: 700 }}
        out:fade={{ duration: 700 }}
      ></div>
    {/key}
    <div class="bg-overlay"></div>
  </div>

  <div class="hero-overlay">
    <div class="card">
      <h1>Traumdestination hinzufügen</h1>

      {#if errorMessage}
        <p class="error">{errorMessage}</p>
      {/if}

      <form on:submit|preventDefault={handleSubmit} class="form">
        <label>
          Ort
          <input type="text" bind:value={ort} required placeholder="z.B. Bora Bora" />
        </label>

        <label>
          Bilder hochladen
          <input type="file" accept="image/*" on:change={handleFileChange} />
        </label>

        <label>
          Stichpunkte / Ideen
          <textarea
            rows="6"
            bind:value={ideen}
            placeholder="• Must-See Spots&#10;• Restaurants ausprobieren&#10;• Aktivitäten im/am Wasser"
            on:focus={handleBulletsFocus}
            on:keydown={handleBulletsKeydown}
          ></textarea>
        </label>

        <div class="buttons">
          <button type="button" on:click={handleCancel} disabled={loading}>
            Abbrechen
          </button>
          <button type="submit" disabled={loading}>
            {#if loading}
              Speichern...
            {:else}
              Traumdestination speichern
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
</div>

<style>
  .page {
    position: relative;
    min-height: 100vh;
    overflow: hidden;
  }

  .background {
    position: fixed;
    inset: 0;
    overflow: hidden;
    z-index: -1;
  }

  .bg-image {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    filter: brightness(0.65);
  }

  .bg-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.4));
  }

  .hero-overlay {
    position: relative;
    padding: 4rem 1.5rem 3rem;
    display: flex;
    justify-content: center;
  }

  .card {
    background: rgba(255, 255, 255, 0.92);
    border-radius: 32px;
    padding: 3rem;
    max-width: 980px;
    width: 100%;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.25);
  }

  h1 {
    font-size: 2.2rem;
    margin-bottom: 1.5rem;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-weight: 500;
  }

  input[type="text"],
  input[type="file"],
  textarea {
    border-radius: 999px;
    border: 1px solid #ddd;
    padding: 0.85rem 1.2rem;
    font-size: 1rem;
    background: white;
  }

  textarea {
    border-radius: 24px;
    resize: vertical;
    line-height: 1.4;
    min-height: 140px;
  }

  .buttons {
    margin-top: 1rem;
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
  }

  button {
    border-radius: 999px;
    border: none;
    padding: 0.8rem 1.8rem;
    font-size: 1rem;
    cursor: pointer;
  }

  button[type="button"] {
    background: white;
    border: 1px solid #ccc;
  }

  button[type="submit"] {
    background: #020617;
    color: white;
  }

  button:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .error {
    background: #fee2e2;
    border-radius: 12px;
    padding: 0.8rem 1.2rem;
    margin-bottom: 1.2rem;
    color: #b91c1c;
    font-weight: 600;
  }
</style>
