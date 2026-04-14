import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			// We handle SW registration manually in app.html
			injectRegister: null,
			// We manage the manifest ourselves via static/manifest.json
			manifest: false,
			workbox: {
				// Match all prerendered HTML pages and compiled assets
				globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
			},
		}),
	]
});
