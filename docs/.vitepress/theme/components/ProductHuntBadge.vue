<script setup lang="ts">
// Product Hunt Badge with automatic Dark / Light mode switching
</script>

<template>
  <div class="rw-ph-badge">
    <a
      href="https://www.producthunt.com/products/routewarden?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-routewarden"
      target="_blank"
      rel="noopener noreferrer"
      class="rw-ph-link"
    >
      <img
        class="ph-img ph-light"
        alt="Routewarden - Zero-dependency edge defense for Traefik, Caddy &amp; NGINX | Product Hunt"
        width="250"
        height="54"
        src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1279797&amp;theme=light&amp;t=1791955891872"
      />
      <img
        class="ph-img ph-dark"
        alt="Routewarden - Zero-dependency edge defense for Traefik, Caddy &amp; NGINX | Product Hunt"
        width="250"
        height="54"
        src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1279797&amp;theme=dark&amp;t=1791955923055"
      />
    </a>
  </div>
</template>

<style scoped>
.rw-ph-badge {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  margin-top: 18px;
}

.rw-ph-link {
  display: inline-block;
  line-height: 0;
  transition: transform 0.2s ease, opacity 0.2s ease, filter 0.2s ease;
  border-radius: 9px;
  overflow: hidden;
}

.rw-ph-link:hover {
  transform: translateY(-2px);
  opacity: 0.95;
  filter: drop-shadow(0 4px 12px rgba(255, 97, 84, 0.25));
}

.ph-img {
  display: block;
  width: 250px;
  height: 54px;
}

/* Light mode default */
.ph-light {
  display: block;
}
.ph-dark {
  display: none;
}

/* Dark mode when html.dark is present */
:global(.dark) .ph-light {
  display: none !important;
}
:global(.dark) .ph-dark {
  display: block !important;
}
</style>
