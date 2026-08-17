import adapter from '@sveltejs/adapter-netlify';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
				experimental: { async: true }
			},
			adapter: adapter(),
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					// 'unsafe-inline' covers SSR'd style attributes such as the chart's
					// `style:--chart-color`; SvelteKit hashes/nonces its own <style> tags.
					'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com'],
					'font-src': ['self', 'https://fonts.gstatic.com'],
					// blob: for the local photo preview, data: for the inlined favicon.
					'img-src': ['self', 'blob:', 'data:'],
					'connect-src': ['self'],
					'form-action': ['self'],
					'frame-ancestors': ['none'],
					'base-uri': ['self'],
					'object-src': ['none']
				}
			},
			experimental: {
				remoteFunctions: true,
				explicitEnvironmentVariables: true,
				handleRenderingErrors: true
			},
			typescript: {
				config: (config) => {
					config.include.push('../drizzle.config.ts');
				}
			}
		})
	]
});
