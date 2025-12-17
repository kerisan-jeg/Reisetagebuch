<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import MapGlobeCard from "$lib/components/MapGlobeCard.svelte";

  const fallbackSlides = ["/landing/Berg.jpg", "/landing/Staedtetrip.jpg", "/landing/Strand.jpg"];

  let currentBackground = 0;
  let bgInterval: ReturnType<typeof setInterval> | null = null;

  function nextBackground() {
    currentBackground = (currentBackground + 1) % fallbackSlides.length;
  }

  onMount(() => {
    bgInterval = setInterval(nextBackground, 6000);
  });

  onDestroy(() => {
    if (bgInterval) clearInterval(bgInterval);
  });
</script>

<svelte:head>
  <title>Karte</title>
</svelte:head>

<div class="background-container">
  {#each fallbackSlides as slide, i}
    <div
      class="bg-slide {i === currentBackground ? 'active' : ''}"
      style={`background-image: url('${slide}');`}
    ></div>
  {/each}
</div>
<div class="overlay"></div>

<div class="page-layer">
  <div class="header-row">
    <h1>Karte</h1>
  </div>

  <MapGlobeCard variant="page" title="Reisen und Bucketlist" />
</div>

<style>
  .background-container {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100vh;
    overflow: hidden;
    z-index: -2;
  }

  .bg-slide {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    opacity: 0;
    transition: opacity 2.5s ease-in-out;
  }

  .bg-slide.active {
    opacity: 1;
  }

  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(40, 44, 55, 0.62);
    z-index: -1;
    backdrop-filter: blur(2px);
  }

  .page-layer {
    position: relative;
    max-width: 1600px;
    margin: 0 auto;
    min-height: 100vh;
    padding: 160px 70px 120px;
    box-sizing: border-box;
    color: #fff;
  }

  .header-row {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    margin-bottom: 24px;
  }

  h1 {
    font-size: 2.6rem;
    margin: 0;
  }

  @media (max-width: 960px) {
    .page-layer {
      padding: 130px 24px 70px;
    }

    h1 {
      font-size: 2.1rem;
    }
  }
</style>
