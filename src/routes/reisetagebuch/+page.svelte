<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";
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

  const heroImages = ["/landing/Berg.jpg", "/landing/Staedtetrip.jpg", "/landing/Strand.jpg"];
  const intervalMs = 8000;

  let userName = "";
  let trips: Trip[] = [];
  let loading = true;
  let reisenError = "";
  let bucketError = "";
  let bucketItems: Bucket[] = [];

  let heroIndex = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;

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

    let tripsLoaded = false;
    let reisenErrorMsg = "";
    reisenError = "";
    bucketError = "";

    // Reisen: zuerst Supabase, sonst Mongo-Fallback
    const { data: tripsData, error: tripsError } = await supabase
      .from("reisen")
      .select("*")
      .eq("user_id", user.id)
      .order("start_date", { ascending: true });

    if (!tripsError && tripsData) {
      trips = tripsData as Trip[];
      tripsLoaded = true;
    } else {
      console.error("Supabase Reisen Fehler, versuche Fallback /api/reisen:", tripsError);
      try {
        const res = await fetch(`/api/reisen?user_id=${encodeURIComponent(user.id)}`);
        const payload = await res.json();

        if (res.ok && payload?.ok) {
          trips = (payload.trips ?? []) as Trip[];
          tripsLoaded = true;
        } else {
          reisenErrorMsg = payload?.error || res.statusText || "Unbekannter Fehler";
        }
      } catch (err) {
        reisenErrorMsg = err instanceof Error ? err.message : String(err);
      }

      if (reisenErrorMsg) {
        console.error("Reisen konnten nicht geladen werden:", reisenErrorMsg);
      }
    }

    // Bucketlist laden (Supabase; tolerant falls Spalten fehlen)
    const { data: bucketData, error: bucketErrorRaw } = await supabase
      .from("bucketlist")
      .select("id,title,location,year,cover_image_url,lat,lng")
      .eq("user_id", user.id)
      .order("year", { ascending: true });

    if (bucketErrorRaw) {
      const needsUserIdFallback =
        bucketErrorRaw?.message?.toLowerCase().includes("user_id") ||
        bucketErrorRaw?.message?.toLowerCase().includes("column") ||
        bucketErrorRaw?.message?.toLowerCase().includes("permission");

      // Supabase-Fallback (ohne Filter) oder API-Fallback (Mongo)
      const supaFallback = needsUserIdFallback
        ? await supabase
            .from("bucketlist")
            .select("id,title,location,year,cover_image_url,lat,lng")
            .order("year", { ascending: true })
        : await supabase
            .from("bucketlist")
            .select("id,title,location,year,cover_image_url,lat,lng")
            .eq("user_id", user.id)
            .order("year", { ascending: true });

      if (supaFallback.error) {
        // Mongo-Fallback
        try {
          const res = await fetch(`/api/bucketlist?user_id=${encodeURIComponent(user.id)}`);
          const payload = await res.json();
          if (res.ok && payload?.ok) {
            bucketItems = (payload.bucketlist ?? []) as Bucket[];
            bucketError = "";
          } else {
            bucketError = payload?.error || "Bucketlist konnte nicht geladen werden.";
          }
        } catch (err) {
          bucketError = err instanceof Error ? err.message : "Bucketlist konnte nicht geladen werden.";
        }
      } else {
        bucketItems = (supaFallback.data ?? []) as Bucket[];
        bucketError = "";
      }
    } else {
      bucketItems = (bucketData ?? []) as Bucket[];
    }

    if (!tripsLoaded && reisenErrorMsg) {
      reisenError = "Reisen konnten nicht geladen werden.";
    }

    loading = false;

    startSlideshow();
  });

  function startSlideshow() {
    if (intervalId) clearInterval(intervalId);
    if (heroImages.length <= 1) return;

    intervalId = setInterval(() => {
      heroIndex = (heroIndex + 1) % heroImages.length;
    }, intervalMs);
  }

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
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
    <!-- transparent overlay to let hero durchscheinen -->
  </div>

  <main class="content">
    <header class="header">
      <div class="hero-text">
        <p class="eyebrow">Reisetagebuch</p>
        <h1>{$t("home.title").replace("{name}", userName)}</h1>
        <p class="lede">{$t("home.subtitle")}</p>
      </div>
    </header>

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
                      style={`background-image:url('${trip.images?.[0] ?? "/landing/Berg.jpg"}')`}
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
              <div class="pill-wrap">
                {#if bucketError}
                  <div class="inline-error">{bucketError || $t("home.bucketError")}</div>
                {:else if bucketItems.length === 0}
                  <div class="pill neutral-pill">{$t("home.bucketEmpty")}</div>
                {:else}
                  {#each bucketItems as item}
                    <div class="pill">
                      <span class="icon">*</span>
                      <span>{item.title}{item.location ? ` in ${item.location}` : ""}</span>
                    </div>
                  {/each}
                {/if}
              </div>
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

  .content {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    padding: 3.2rem 1.5rem 3.5rem;
    color: #0b0b0b;
    max-width: 1400px;
    margin: 0 auto;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(8px);
  }

  .header {
    color: white;
    text-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    margin-bottom: 0.8rem;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 33vh;
  }

  .hero-text {
    max-width: 33vw;
    min-width: 320px;
    text-align: center;
  }

  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #cbd5e1;
    margin: 0 auto;
  }

  .header h1 {
    margin: 0.2rem 0 0.3rem;
    font-size: clamp(2.4rem, 2.6vw + 1rem, 3.4rem);
    font-weight: 850;
  }

  .lede {
    margin: 0;
    color: #e2e8f0;
    font-size: 1.05rem;
  }

  .layout {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 1.25rem;
    align-items: start;
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
    background: rgba(255, 255, 255, 0.9);
    border-radius: 14px;
    padding: 0.9rem;
    box-shadow: 0 12px 28px rgba(0,0,0,0.18);
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
    background: #f8fafc;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    box-shadow: 0 8px 16px rgba(0,0,0,0.12);
    border: none;
    text-align: left;
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
  }
  .list-card .meta {
    margin: 0.05rem 0;
    color: #475569;
    font-size: 0.95rem;
  }

  .pill-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .panel {
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 22px;
    padding: 1.4rem;
    backdrop-filter: blur(4px);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.2);
  }

  .content-panel {
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid #e5e7eb;
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.22);
    padding: 1.25rem 1.4rem;
    width: 100%;
    max-width: 560px;
    align-self: flex-start;
  }

  .content-panel section + section {
    margin-top: 1rem;
  }

  .inline-error {
    margin-top: 0.6rem;
    color: #b91c1c;
    background: #fee2e2;
    border: 1px solid #fecaca;
    padding: 0.65rem 0.8rem;
    border-radius: 10px;
    font-weight: 600;
  }

  .info-box.neutral {
    background: rgba(255, 255, 255, 0.92);
    color: #1f2937;
  }

  @media (max-width: 600px) {
    .content {
      padding: 4.5rem 1rem 2.5rem;
    }
    .layout {
      grid-template-columns: 1fr;
    }
  }
</style>
