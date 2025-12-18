<script lang="ts">
  import { supabase } from "$lib/supabaseClient";
  import { goto } from "$app/navigation";
  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";
  import LocationPicker from "$lib/components/LocationPicker.svelte";
  import { t } from "$lib/i18n";

  let ort = "";
  let ideen = "";
  let file: File | null = null;
  let lat: number | null = null;
  let lng: number | null = null;
  let year = "";

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
      ideen = "- ";
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
    const prefix = "- ";
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
    if (userError || !userData?.user) {
      errorMessage = $t("bucketForm.errorAuth");
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
        errorMessage = `${$t("bucketForm.errorUpload")} ${uploadError.message ?? ""}`.trim();
        loading = false;
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("bucketlist").getPublicUrl(uploadData.path);
      imageUrl = publicUrlData.publicUrl;
      imageUrls = imageUrl ? [imageUrl] : [];
    }

    if (lat == null || lng == null) {
      errorMessage = $t("bucketForm.errorLocation");
      loading = false;
      return;
    }

    const { data: insertData, error: insertError } = await supabase
      .from("bucketlist")
      .insert({
        user_id: user.id,
        title: ort,
        location: ort,
        description: ideen,
        year: year || null,
        cover_image_url: imageUrl,
        images: imageUrls,
        lat,
        lng
      })
      .select()
      .single();

    if (insertError) {
      console.error(insertError);
      errorMessage = insertError.message || $t("bucketForm.errorSave");
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
          images: imageUrls,
          year: year || null
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
  <title>{$t("bucketForm.title")}</title>
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
      <h1>{$t("bucketForm.title")}</h1>

      {#if errorMessage}
        <p class="error">{errorMessage}</p>
      {/if}

      <form on:submit|preventDefault={handleSubmit} class="form">
        <label for="bl-ort">
          {$t("bucketForm.name")}
          <input id="bl-ort" type="text" bind:value={ort} required placeholder={$t("bucketForm.placeholder.name")} />
        </label>

        <label for="bl-file">
          {$t("bucketForm.images")}
          <input id="bl-file" type="file" accept="image/*" on:change={handleFileChange} />
        </label>

        <LocationPicker
          bind:lat
          bind:lng
          color="#2563eb"
          label={$t("bucketForm.locationPicker")}
        />

        <label for="bl-ideen">
          {$t("bucketForm.ideas")}
          <textarea
            id="bl-ideen"
            rows="6"
            bind:value={ideen}
            placeholder={$t("bucketForm.placeholder.ideas")}
            on:focus={handleBulletsFocus}
            on:keydown={handleBulletsKeydown}
          ></textarea>
        </label>

        <div class="buttons">
          <button type="button" on:click={handleCancel} disabled={loading}>
            {$t("bucketForm.cancel")}
          </button>
          <button type="submit" disabled={loading}>
            {#if loading}
              …
            {:else}
              {$t("bucketForm.save")}
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
