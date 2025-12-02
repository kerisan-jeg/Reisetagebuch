<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";
  import { supabase } from "$lib/supabaseClient";
  import TripCarousel from "../../lib/components/TripCarousel.svelte";

  type Trip = {
    id: string;
    user_id: string;
    title: string;
    location: string;
    with_whom: string | null;
    cost: number | null;
    rating: number | null;
    description: string | null;
    start_date: string | null;
    end_date: string | null;
    images: string[] | null;
  };

  const heroImages = ["/landing/Berg.jpg", "/landing/Staedtetrip.jpg", "/landing/Strand.jpg"];
  const intervalMs = 8000;

  let userName = "";
  let trips: Trip[] = [];
  let loading = true;
  let errorMessage = "";

  let heroIndex = 0;
  let currentTripIndex = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  $: currentTrip = trips[currentTripIndex] ?? null;
  $: prevTrip = trips.length ? trips[(currentTripIndex - 1 + trips.length) % trips.length] : null;
  $: nextTrip = trips.length ? trips[(currentTripIndex + 1) % trips.length] : null;
  $: visibleCards = (() => {
    if (!trips.length) return [];
    if (trips.length === 1) return [{ trip: currentTrip, pos: "center" }];
    if (trips.length === 2) {
      const other = trips[(currentTripIndex + 1) % 2];
      return [
        { trip: currentTrip, pos: "center" },
        { trip: other, pos: "right" }
      ];
    }
    return [
      { trip: prevTrip, pos: "left" },
      { trip: currentTrip, pos: "center" },
      { trip: nextTrip, pos: "right" }
    ];
  })();

  onMount(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;

    if (userError || !user) {
      errorMessage = "Benutzer konnte nicht geladen werden. Bitte neu einloggen.";
      loading = false;
      return;
    }

    const first = user.user_metadata?.first_name?.trim() ?? "";
    const last = user.user_metadata?.last_name?.trim() ?? "";
    const fullMeta = user.user_metadata?.full_name?.trim();
    const nameMeta = user.user_metadata?.name?.trim();
    const emailName = user.email ? user.email.split("@")[0] : "Benutzer";

    userName =
      (first || last ? `${first} ${last}`.trim() : "") ||
      fullMeta ||
      nameMeta ||
      emailName;

    const { data, error } = await supabase
      .from("reisen")
      .select(
        "id,user_id,title,location,with_whom,cost,rating,description,start_date,end_date,images"
      )
      .eq("user_id", user.id)
      .order("start_date", { ascending: true });

    if (error) {
      errorMessage = "Reisen konnten nicht geladen werden.";
      loading = false;
      return;
    }

    trips = (data ?? []) as Trip[];
    loading = false;

    startSlideshow();
  });

  function startSlideshow() {
    if (intervalId) clearInterval(intervalId);
    if (heroImages.length <= 1 && trips.length <= 1) return;

    intervalId = setInterval(() => {
      if (heroImages.length > 1) {
        heroIndex = (heroIndex + 1) % heroImages.length;
      }
      if (trips.length > 1) {
        currentTripIndex = (currentTripIndex + 1) % trips.length;
      }
    }, intervalMs);
  }

  function prevTripSlide() {
    if (trips.length <= 1) return;
    currentTripIndex = (currentTripIndex - 1 + trips.length) % trips.length;
    heroIndex = (heroIndex - 1 + heroImages.length) % heroImages.length;
    restartInterval();
  }

  function nextTripSlide() {
    if (trips.length <= 1) return;
    currentTripIndex = (currentTripIndex + 1) % trips.length;
    heroIndex = (heroIndex + 1) % heroImages.length;
    restartInterval();
  }

  function restartInterval() {
    if (intervalId) clearInterval(intervalId);
    startSlideshow();
  }

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
  });
</script>

<svelte:head>
  <title>Reisetagebuch</title>
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

  <main class="content">
    <header class="header">
      <h1>Reisetagebuch von {userName}</h1>
    </header>

    {#if loading}
      <div class="info-box">Reisen werden geladen...</div>
    {:else if errorMessage}
      <div class="info-box error">{errorMessage}</div>
    {:else if trips.length === 0}
      <div class="info-box neutral">
        Du hast noch keine Reisen erfasst. Lege eine unter "Reisen" an.
      </div>
    {:else}
      <TripCarousel
        items={visibleCards}
        showNav={trips.length > 1}
        on:prev={prevTripSlide}
        on:next={nextTripSlide}
      />
    {/if}
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
      sans-serif;
  }

  .page {
    position: relative;
    min-height: 100vh;
    color: #0b0b0b;
    overflow: hidden;
  }

  .background {
    position: fixed;
    inset: 0;
    overflow: hidden;
    z-index: 0;
  }

  .bg-image {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    filter: brightness(0.6);
  }

  .bg-overlay {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 20% 20%, rgba(0, 0, 0, 0.25), transparent),
      radial-gradient(circle at 80% 30%, rgba(0, 0, 0, 0.25), transparent),
      linear-gradient(180deg, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.55));
  }

  .content {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 6.2rem 1.5rem 3.5rem;
    color: #0b0b0b;
  }

  .header {
    text-align: center;
    color: white;
    text-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    margin-bottom: 1.8rem;
  }

  .header h1 {
    margin: 0;
    font-size: clamp(2.6rem, 2.8vw + 1rem, 3.8rem);
    font-weight: 850;
  }

  .info-box {
    background: white;
    color: #0f172a;
    padding: 1.2rem 1.5rem;
    border-radius: 1rem;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.25);
    max-width: 420px;
    text-align: center;
  }

  .info-box.error {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fca5a5;
  }

  .info-box.neutral {
    background: rgba(255, 255, 255, 0.92);
    color: #1f2937;
  }

  @media (max-width: 600px) {
    .content {
      padding: 4.5rem 1rem 2.5rem;
    }
  }
</style>
