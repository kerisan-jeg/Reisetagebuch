<script lang="ts">
    import { page } from '$app/stores';

    // Seiten, auf denen KEINE Navbar angezeigt werden soll
    const hiddenRoutes = ['/login', '/register'];
</script>

{#if !hiddenRoutes.includes($page.url.pathname)}
<nav class="navbar">
    <div class="logo">Reisetagebuch</div>

    <ul class="nav-links">
        <li><a href="/reisen">Reisen</a></li>
        <li><a href="/karte">Karte</a></li>
        <li><a href="/profil">Profil</a></li>
        <li><a href="/logout">Logout</a></li>
    </ul>
</nav>
{/if}

<style>
    .navbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 2rem;
        background-color: rgba(0,0,0,0.85);
        color: white;
    }

    .nav-links {
        display: flex;
        gap: 20px;
    }

    a {
        color: white;
        text-decoration: none;
        font-size: 1.1rem;
    }
</style>
