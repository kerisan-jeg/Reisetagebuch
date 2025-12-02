<script context="module" lang="ts">
  export type Slide = { url: string; title?: string };
</script>

<script lang="ts">
  export let slides: Slide[] = [];
  export let interval = 4000;

  let i = 0, timer: any;
  const next = () => { if (slides.length) i = (i + 1) % slides.length; };

  import { onMount, onDestroy } from 'svelte';
  onMount(() => { timer = setInterval(next, interval); });
  onDestroy(() => clearInterval(timer));
</script>

<div class="relative h-full w-full overflow-hidden">
  {#if slides.length}
    <img class="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
         src={slides[i].url} alt="Slide" />
  {:else}
    <div class="grid h-full place-items-center text-gray-500">Noch keine Bilder…</div>
  {/if}
</div>
