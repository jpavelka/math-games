<script lang="ts">
	import '../app.css';
	import { base } from '$app/paths';

	let { children } = $props();
</script>

<svelte:head>
	<title>Math Games</title>
</svelte:head>

<header>
	<div class="header-inner">
		<a href="{base}/" class="logo">
			<span class="logo-icon">∑</span>
			<span class="logo-text">Math Games</span>
		</a>
	</div>
</header>

<main>
	{@render children()}
</main>

<footer>
	<p>A collection of mathematical puzzles and games</p>
</footer>

<style>
	header {
		border-bottom: 1px solid var(--color-border);
		padding: 0 1.5rem;
	}

	.header-inner {
		max-width: 1000px;
		margin: 0 auto;
		height: 60px;
		display: flex;
		align-items: center;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		color: var(--color-text);
		font-weight: 700;
		font-size: 1.2rem;
	}

	.logo:hover {
		color: var(--color-accent-hover);
	}

	.logo-icon {
		font-size: 1.5rem;
		color: var(--color-accent);
	}

	main {
		max-width: 1000px;
		margin: 0 auto;
		padding: 2rem 1.5rem 4rem;
	}

	footer {
		text-align: center;
		padding: 2rem;
		color: var(--color-text-muted);
		font-size: 0.85rem;
		border-top: 1px solid var(--color-border);
	}
</style>
