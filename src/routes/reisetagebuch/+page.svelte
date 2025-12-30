<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";
  import { cubicInOut } from "svelte/easing";
  import { supabase } from "$lib/supabaseClient";
  import MapGlobeCard from "$lib/components/MapGlobeCard.svelte";
  import { t } from "$lib/i18n";

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
    cover_image_url?: string | null;
    lat?: number | null;
    lng?: number | null;
  };

  type Bucket = {
    id: string;
    title: string;
    location: string | null;
    year: string | null;
    cover_image_url?: string | null;
    lat?: number | null;
    lng?: number | null;
  };

  const fallbackHeroImages = ["/landing/Berg.jpg", "/landing/Staedtetrip.jpg", "/landing/Strand.jpg"];
  const intervalMs = 8000;

  let userName = "";
  let trips: Trip[] = [];
  let loading = true;
  let errorMessage = "";
  let reisenError = "";
  let bucketError = "";
  let bucketItems: Bucket[] = [];

  let heroImages: string[] = fallbackHeroImages;
  let heroIndex = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let tripsChannel: ReturnType<typeof supabase.channel> | null = null;
  let bucketChannel: ReturnType<typeof supabase.channel> | null = null;
  let reloading = false;
  let refreshMessage = "";

  onMount(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;

    if (userError || !user) {
      errorMessage = "Benutzer konnte nicht geladen werden. Bitte neu einloggen.";
      loading = false;
      return;
    }

    // Profil in Mongo syncen (best effort, nicht blockierend)
    syncProfileToMongo(user);

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

    await loadTrips(user.id);
    await loadBucketlist(user.id);
    loading = false;

    startSlideshow();
    startRealtime(user.id);
  });

  function collectTripImages(allTrips: Trip[]) {
    const imgs = allTrips.flatMap((trip) => {
      const list: (string | null | undefined)[] = [];
      if (trip.cover_image_url) list.push(trip.cover_image_url);
      if (trip.images?.length) list.push(...trip.images);
      return list;
    });
    const unique = Array.from(new Set(imgs.filter((url): url is string => !!url)));
    return unique.length ? unique : fallbackHeroImages;
  }

  function startSlideshow() {
    if (intervalId) clearInterval(intervalId);
    if (!heroImages || heroImages.length <= 1) return;

    intervalId = setInterval(() => {
      heroIndex = (heroIndex + 1) % heroImages.length;
    }, intervalMs);
  }

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
    if (tripsChannel) supabase.removeChannel(tripsChannel);
    if (bucketChannel) supabase.removeChannel(bucketChannel);
  });

  async function syncProfileToMongo(user: any) {
    try {
      await fetch("/api/profile/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name ?? user.user_metadata?.name,
          first_name: user.user_metadata?.first_name,
          last_name: user.user_metadata?.last_name,
          metadata: user.user_metadata ?? {}
        })
      });
    } catch (err) {
      console.warn("Profil Sync fehlgeschlagen:", err);
    }
  }

  async function loadTrips(userId: string) {
    const wasLoaded = !loading;
    if (wasLoaded) {
      reloading = true;
      refreshMessage = "Aktualisiere Reisen...";
    }

    reisenError = "";

    const { data: tripsData, error: tripsError } = await supabase
      .from("reisen")
      .select("id,user_id,title,location,with_whom,cost,rating,description,start_date,end_date,images,cover_image_url,lat,lng")
      .eq("user_id", userId)
      .order("start_date", { ascending: true });

    if (!tripsError && tripsData) {
      trips = tripsData as Trip[];
    } else {
      console.error("Reisen konnten nicht geladen werden:", tripsError);
      trips = [];
      reisenError = "Reisen konnten nicht geladen werden.";
    }

    heroImages = collectTripImages(trips);
    heroIndex = 0;

    if (wasLoaded) {
      reloading = false;
      refreshMessage = tripsLoaded ? "Reisen aktualisiert." : "Aktualisierung fehlgeschlagen.";
      setTimeout(() => (refreshMessage = ""), 2500);
    }
  }

  async function loadBucketlist(userId: string) {
    const wasLoaded = !loading;
    if (wasLoaded) {
      reloading = true;
      refreshMessage = "Aktualisiere Bucketlist...";
    }

    bucketError = "";
    const { data: bucketData, error: bucketErrorRaw } = await supabase
      .from("bucketlist")
      .select("id,title,location,cover_image_url,lat,lng,images")
      .eq("user_id", userId)
      .order("title", { ascending: true });

    if (bucketErrorRaw) {
      // Nur bei echtem Fehler versuchen wir einen Fallback
      const fallbackBuckets = await fetchBucketlistFallback(userId, bucketErrorRaw);
      bucketItems = fallbackBuckets as Bucket[];
      bucketError = fallbackBuckets.length === 0 ? "Bucketlist konnte nicht geladen werden." : "";
    } else {
      // Kein Fehler: auch leere Ergebnisse sind okay (zeigen dann "keine Bucketlist")
      bucketItems = (bucketData ?? []) as Bucket[];
      bucketError = "";
    }

    if (wasLoaded) {
      reloading = false;
      refreshMessage = bucketError ? "Bucketlist-Update fehlgeschlagen." : "Bucketlist aktualisiert.";
      setTimeout(() => (refreshMessage = ""), 2500);
    }
  }

  async function fetchBucketlistFallback(userId: string, initialError?: any) {
    const needsUserIdFallback =
      initialError?.message?.toLowerCase().includes("user_id") ||
      initialError?.message?.toLowerCase().includes("column") ||
      initialError?.message?.toLowerCase().includes("permission");

    const items: Bucket[] = [];

    const supaFallback = needsUserIdFallback
      ? await supabase
          .from("bucketlist")
          .select("id,title,location,cover_image_url,lat,lng,images")
          .order("title", { ascending: true })
      : await supabase
          .from("bucketlist")
          .select("id,title,location,cover_image_url,lat,lng,images")
          .eq("user_id", userId)
          .order("title", { ascending: true });

    if (!supaFallback.error && (supaFallback.data?.length ?? 0) > 0) {
      items.push(...(supaFallback.data as Bucket[]));
      return items;
    }

    const altQuery = await supabase
      .from("bucketlist")
      .select("id,title,location,cover_image_url,lat,lng,images,userId")
      .eq("userId", userId)
      .order("title", { ascending: true });

    if (!altQuery.error && (altQuery.data?.length ?? 0) > 0) {
      items.push(
        ...(altQuery.data as any[])
          .filter((b) => !b.userId || b.userId === userId)
          .map((b) => ({
            id: b.id,
            title: b.title,
            location: b.location,
            cover_image_url: b.cover_image_url ?? null,
            lat: b.lat ?? null,
            lng: b.lng ?? null,
            images: b.images ?? null
          }))
      );
      return items;
    }

    const unfilt = await supabase
      .from("bucketlist")
      .select("id,title,location,cover_image_url,lat,lng,images,userId")
      .order("title", { ascending: true });

    if (!unfilt.error && (unfilt.data?.length ?? 0) > 0) {
      items.push(
        ...(unfilt.data as any[])
          .filter((b) => !b.userId || b.userId === userId)
          .map((b) => ({
            id: b.id,
            title: b.title,
            location: b.location,
            cover_image_url: b.cover_image_url ?? null,
            lat: b.lat ?? null,
            lng: b.lng ?? null,
            images: b.images ?? null
          }))
      );
      return items;
    }

    try {
      const res = await fetch(`/api/bucketlist?user_id=${encodeURIComponent(userId)}`);
      const payload = await res.json();
      if (res.ok && payload?.ok) {
        items.push(
          ...(payload.bucketlist ?? []).map((b: any) => ({
            id: b.id,
            title: b.title,
            location: b.location,
            cover_image_url: b.cover_image_url ?? null,
            lat: b.lat ?? null,
            lng: b.lng ?? null,
            images: b.images ?? null
          }))
        );
      }
    } catch (err) {
      console.error("Bucketlist API Fallback Fehler:", err);
    }

    return items;
  }

  function startRealtime(userId: string) {
    tripsChannel = supabase
      .channel(`reisen-changes-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reisen", filter: `user_id=eq.${userId}` },
        async () => {
          await loadTrips(userId);
        }
      )
      .subscribe();

    bucketChannel = supabase
      .channel(`bucket-changes-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bucketlist", filter: `user_id=eq.${userId}` },
        async () => {
          await loadBucketlist(userId);
        }
      )
      .subscribe();
  }
</script>

<svelte:head>
  <title>Reisetagebuch</title>
</svelte:head>

<div class="page">
  <section class="hero">
    {#key heroIndex}
      <div
        class="hero-bg"
        style={`background-image: url('${heroImages[heroIndex]}')`}
        in:fade={{ duration: 800, easing: cubicInOut }}
        out:fade={{ duration: 800, easing: cubicInOut }}
      ></div>
    {/key}
    {#key `contain-${heroIndex}`}
      <div
        class="hero-photo"
        style={`background-image: url('${heroImages[heroIndex]}')`}
        in:fade={{ duration: 800, easing: cubicInOut }}
        out:fade={{ duration: 800, easing: cubicInOut }}
      ></div>
    {/key}
    <div class="hero-overlay"></div>
    <div class="hero-content">
      <p class="eyebrow">Reisetagebuch</p>
      <h1>Reisetagebuch von {userName}</h1>
      <p class="lede">{$t("home.subtitle")}</p>
    </div>
  </section>

  <main class="content">
    {#if errorMessage}
      <div class="inline-error full">{errorMessage}</div>
    {/if}
    {#if refreshMessage}
      <div class="refresh-note">{refreshMessage}</div>
    {/if}
    {#if loading}
      <div class="info-box">Reisen werden geladen...</div>
    {:else}
      <section class="layout two-col">
        <div class="left-col">
          <div class="panel content-panel">
            <section class="travels">
              <div class="section-head">
                <p class="label">{$t("home.trips")}</p>
                <p class="hint">{$t("home.tripsHint")}</p>
              </div>
              {#if reisenError}
                <div class="inline-error">{reisenError}</div>
              {:else if trips.length === 0}
                <div class="info-box neutral">{$t("home.tripsEmpty")}</div>
              {:else}
                <div class="list-cards">
                  {#each trips as trip}
                    <button
                      type="button"
                      class="list-card"
                      on:click={() => (window.location.href = `/reisen/${trip.id}`)}
                    >
                      <div
                        class="thumb"
                        style={`background-image:url('${trip.cover_image_url ?? trip.images?.[0] ?? "/landing/Berg.jpg"}')`}
                        aria-hidden="true"
                      ></div>
                      <div class="body">
                        <h3>{trip.title}</h3>
                        <p class="meta">{trip.start_date ?? "?"} - {trip.end_date ?? "?"}</p>
                        <p class="meta">{trip.location}</p>
                      </div>
                    </button>
                  {/each}
                </div>
              {/if}
            </section>

            <section class="bucket">
              <div class="section-head">
                <p class="label">{$t("home.bucket")}</p>
                <p class="hint">{$t("home.bucketHint")}</p>
              </div>
              {#if bucketError}
                <div class="inline-error">{bucketError || $t("home.bucketError")}</div>
              {:else if bucketItems.length === 0}
                <div class="pill-wrap">
                  <div class="pill neutral-pill">{$t("home.bucketEmpty")}</div>
                </div>
              {:else}
                <div class="list-cards">
                  {#each bucketItems as item}
                    <button
                      type="button"
                      class="list-card"
                      on:click={() => (window.location.href = `/bucketlist/${item.id}`)}
                    >
                      <div
                        class="thumb"
                        style={`background-image:url('${item.cover_image_url ?? item.images?.[0] ?? "/landing/Strand.jpg"}')`}
                        aria-hidden="true"
                      ></div>
                      <div class="body">
                        <h3>{item.title}</h3>
                        <p class="meta">{item.location || $t("home.bucketNoLocation")}</p>
                      </div>
                    </button>
                  {/each}
                </div>
              {/if}
            </section>
          </div>
        </div>

        <div class="right-col">
          <MapGlobeCard title={$t("home.map")} />
        </div>
      </section>
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
    background: #f5f7fb;
  }

  .hero {
    position: relative;
    height: 82vh;
    min-height: 540px;
    overflow: hidden;
    display: grid;
    place-items: center;
  }

  .hero-bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    filter: brightness(0.9);
    transform: scale(1.02);
  }

  .hero-photo {
    position: absolute;
    inset: 0;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    background-color: rgba(8, 12, 20, 0.6);
    filter: brightness(0.95);
    box-shadow: inset 0 0 120px 60px rgba(8, 12, 20, 0.6);
    mask-image: radial-gradient(circle at center, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 70%, rgba(0, 0, 0, 0) 100%);
    -webkit-mask-image: radial-gradient(circle at center, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 70%, rgba(0, 0, 0, 0) 100%);
    animation: heroZoom 18s ease-in-out infinite alternate;
  }

  @keyframes heroZoom {
    0% {
      transform: scale(1);
    }
    100% {
      transform: scale(1.03);
    }
  }

  .hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(10, 13, 20, 0.05) 0%, rgba(10, 13, 20, 0.24) 55%, rgba(7, 10, 16, 0.42) 100%);
    backdrop-filter: blur(0.5px);
  }

  .hero-content {
    position: relative;
    z-index: 1;
    text-align: center;
    color: #f8fafc;
    text-shadow: 0 10px 30px rgba(0, 0, 0, 0.55), 0 1px 18px rgba(0, 0, 0, 0.35);
    max-width: 720px;
    padding: 1rem;
  }

  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #e2e8f0;
    margin: 0 auto 0.6rem;
  }

  .hero-content h1 {
    margin: 0 0 0.7rem;
    font-size: clamp(2.4rem, 3vw + 1rem, 3.5rem);
    font-weight: 750;
  }

  .lede {
    margin: 0;
    color: #e2e8f0;
    font-size: 1.05rem;
  }

  .content {
    position: relative;
    z-index: 1;
    min-height: 60vh;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    padding: 2.6rem 1.5rem 3.5rem;
    color: #e5e7eb;
    max-width: 1400px;
    margin: -110px auto 0;
    background: radial-gradient(circle at 15% 20%, rgba(46, 94, 255, 0.08), transparent 35%),
      radial-gradient(circle at 85% 10%, rgba(236, 72, 153, 0.06), transparent 32%),
      linear-gradient(180deg, #0f172a 0%, #0b1224 40%, #0b0f1c 100%);
    border-radius: 28px 28px 0 0;
    box-shadow: 0 -14px 40px rgba(0, 0, 0, 0.35);
  }

  .layout {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 1.25rem;
    align-items: start;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(15, 23, 42, 0.78));
    border-radius: 26px;
    padding: 1.6rem;
    box-shadow: 0 22px 46px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(14px);
  }

  .layout.two-col {
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
    align-items: start;
  }

  .left-col {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .right-col {
    position: sticky;
    top: 90px;
    align-self: start;
  }

  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 0.4rem;
  }

  .travels, .bucket {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
    border-radius: 16px;
    padding: 1rem;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 10px 30px rgba(0, 0, 0, 0.22);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .list-cards {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }

  .list-card {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 0.8rem;
    background: rgba(15, 23, 42, 0.4);
    border-radius: 14px;
    overflow: hidden;
    cursor: pointer;
    box-shadow: 0 12px 24px rgba(0,0,0,0.28);
    border: 1px solid rgba(255, 255, 255, 0.08);
    text-align: left;
    color: #e5e7eb;
  }
  .list-card .thumb {
    background-size: cover;
    background-position: center;
    min-height: 110px;
  }
  .list-card .body {
    padding: 0.7rem 0.8rem;
  }
  .list-card h3 {
    margin: 0 0 0.25rem;
    font-size: 1.05rem;
    color: #f8fafc;
  }
  .list-card .meta {
    margin: 0.05rem 0;
    color: #cbd5e1;
    font-size: 0.95rem;
  }

  .pill-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .panel {
    background: rgba(15, 23, 42, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 22px;
    padding: 1.4rem;
    backdrop-filter: blur(10px);
    box-shadow: 0 20px 44px rgba(0, 0, 0, 0.26);
  }

  .content-panel {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.28);
    padding: 1.25rem 1.4rem;
    width: 100%;
    max-width: 560px;
    align-self: flex-start;
    color: #e5e7eb;
  }

  .content-panel section + section {
    margin-top: 1rem;
  }

  .inline-error {
    margin-top: 0.6rem;
    color: #fecdd3;
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.35);
    padding: 0.65rem 0.8rem;
    border-radius: 10px;
    font-weight: 600;
  }
  .inline-error.full {
    margin-top: 0;
    margin-bottom: 0.6rem;
  }

  .info-box.neutral {
    background: rgba(255, 255, 255, 0.06);
    color: #e2e8f0;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .refresh-note {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: rgba(34, 197, 94, 0.12);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: #bbf7d0;
    padding: 0.5rem 0.8rem;
    border-radius: 10px;
    margin-bottom: 0.6rem;
    font-weight: 600;
  }

  @media (max-width: 600px) {
    .content {
      padding: 4.5rem 1rem 2.5rem;
      margin-top: -80px;
    }
    .layout {
      grid-template-columns: 1fr;
      padding: 1rem;
    }
    .hero {
      height: 70vh;
      min-height: 420px;
    }
  }
</style>
