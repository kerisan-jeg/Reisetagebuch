<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  export let images: string[] = [];

  let current = 0;
  const intervalMs = 6000;
  let timer: ReturnType<typeof setInterval> | null = null;

  const next = () => {
    if (!images.length) return;
    current = (current + 1) % images.length;
  };

  onMount(() => {
    if (images.length > 1) {
      timer = setInterval(next, intervalMs);
    }
  });

  onDestroy(() => {
    if (timer) clearInterval(timer);
  });
</script>

<div class="slideshow">
  {#each images as img, i}
    <div
      class="slide {i === current ? 'active' : ''}"
      style={`background-image: url('${img}');`}
    ></div>
  {/each}
</div>

<style>
  .slideshow {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }

  .slide {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    opacity: 0;
    transition: opacity 1.4s ease-in-out;
    will-change: opacity;
  }

  .slide.active {
    opacity: 1;
  }
</style>
