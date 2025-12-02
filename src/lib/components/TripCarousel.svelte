<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export type CarouselItem = {
    trip: {
      id?: string;
      title?: string;
      images?: string[] | null;
      start_date?: string | null;
      end_date?: string | null;
    } | null;
    pos: "left" | "center" | "right" | "duo" | string;
  };

  export let items: CarouselItem[] = [];
  export let showNav = false;

  const dispatch = createEventDispatcher();
  const handlePrev = () => dispatch("prev");
  const handleNext = () => dispatch("next");
</script>

<div class="slider">
  {#each items as item (item.trip?.id)}
    <section class={`card ${item.pos} ${item.pos !== "center" ? "ghost" : "active"}`}>
      <div class="card-image">
        {#if item.trip?.images && item.trip.images.length > 0}
          <img src={item.trip.images[0]} alt={item.trip.title} />
        {:else}
          <div class="no-image">Kein Bild</div>
        {/if}
      </div>

      <div class="card-body">
        <h2>{item.trip?.title}</h2>
        {#if item.trip?.start_date && item.trip.end_date}
          <p class="dates">{item.trip.start_date} – {item.trip.end_date}</p>
        {/if}
      </div>
    </section>
  {/each}
</div>

{#if showNav}
  <div class="nav">
    <button class="nav-btn" on:click={handlePrev} aria-label="Vorherige Reise">&lt;</button>
    <button class="nav-btn" on:click={handleNext} aria-label="Nächste Reise">&gt;</button>
  </div>
{/if}

<style>
  .slider {
    position: relative;
    width: 100%;
    max-width: 620px;
    min-height: 420px;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    margin-top: 1rem;
  }

  .card {
    width: 450px;
    max-width: 92vw;
    background: white;
    color: #0f172a;
    border-radius: 18px;
    box-shadow: 0 24px 50px rgba(0, 0, 0, 0.35);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 0;
    transition: transform 0.5s ease, opacity 0.5s ease;
  }

  .card.active {
    position: relative;
    z-index: 3;
    transform: translateY(0) scale(1);
  }

  .card.ghost {
    position: absolute;
    top: 0;
    left: 50%;
    width: 420px;
    max-width: 86vw;
    opacity: 0.25;
    z-index: 1;
    pointer-events: none;
  }

  .card.ghost.duo {
    transform: translate(-50%, 14px) translateX(-150px) scale(0.9);
    opacity: 0.32;
  }

  .card.ghost.left {
    transform: translate(-50%, 12px) translateX(-180px) scale(0.9);
  }

  .card.ghost.right {
    transform: translate(-50%, 12px) translateX(180px) scale(0.9);
  }

  .card-image {
    height: 240px;
    background: #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .no-image {
    color: #6b7280;
    font-weight: 600;
  }

  .card-body {
    padding: 1.4rem 1.6rem 1.6rem;
    display: grid;
    gap: 0.3rem;
  }

  .card-body h2 {
    margin: 0;
    font-size: 1.25rem;
    color: #0f172a;
  }

  .dates {
    margin: 0;
    color: #374151;
    font-weight: 600;
  }

  .nav {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: rgba(255, 255, 255, 0.9);
    padding: 0.75rem 1rem;
    border-radius: 999px;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.25);
    color: #0f172a;
    margin-top: 1.5rem;
  }

  .nav-btn {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: none;
    background: #0f172a;
    color: white;
    font-size: 1.1rem;
    cursor: pointer;
    box-shadow: 0 12px 25px rgba(0, 0, 0, 0.25);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .nav-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 14px 28px rgba(0, 0, 0, 0.3);
  }

  .nav-btn:active {
    transform: translateY(0);
  }

  @media (max-width: 600px) {
    .slider {
      min-height: 380px;
    }

    .card-image {
      height: 200px;
    }

    .card.ghost.left {
      transform: translate(-50%, 10px) translateX(-120px) scale(0.88);
    }

    .card.ghost.right {
      transform: translate(-50%, 10px) translateX(120px) scale(0.88);
    }
  }
</style>
