<script lang="ts">
	import '../app.css';
	import { base } from '$app/paths';
	import Scratchpad from '$lib/Scratchpad.svelte';

	let { children } = $props();
	let padOpen = $state(false);
	let padWidth = $state(320);
</script>

<svelte:head>
	<title>Math Games</title>
</svelte:head>

<div class="shell" class:pad-open={padOpen} style="--pad-width:{padWidth}px">
	<header>
		<div class="header-inner">
			<a href="{base}/" class="logo">
				<span class="logo-icon">∑</span>
				<span class="logo-text">Math Games</span>
			</a>
			<button
				class="pad-toggle"
				class:active={padOpen}
				onclick={() => (padOpen = !padOpen)}
				aria-label="Toggle scratchpad"
			>
				<span class="pad-icon">✏</span>
				<span class="pad-label">Scratchpad</span>
			</button>
		</div>
	</header>

	<main>
		{@render children()}
	</main>

	<footer>
		<p>A collection of mathematical puzzles and games</p>
	</footer>
</div>

{#if padOpen}
	<Scratchpad onclose={() => (padOpen = false)} bind:width={padWidth} />
{/if}

<style>
	header {
		border-bottom: 1px solid var(--color-border);
		padding: 0 1.5rem;
		position: sticky;
		top: 0;
		z-index: 20;
		background: var(--color-bg);
	}

	.header-inner {
		max-width: 1000px;
		margin: 0 auto;
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: space-between;
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

	/* ── scratchpad toggle ── */
	.pad-toggle {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		color: var(--color-text-muted);
		border-radius: var(--radius-sm);
		padding: 0.4rem 0.8rem;
		font-size: 0.85rem;
		font-weight: 600;
		transition: background 0.15s, border-color 0.15s, color 0.15s;
	}

	.pad-toggle:hover {
		border-color: var(--color-accent);
		color: var(--color-text);
	}

	.pad-toggle.active {
		background: var(--color-accent);
		border-color: var(--color-accent);
		color: #fff;
	}

	.pad-icon {
		font-style: normal;
		font-size: 0.95rem;
	}

	/* ── main content ── */
	main {
		max-width: 1000px;
		margin: 0 auto;
		padding: 1rem 1.5rem 1.5rem;
		transition: padding-right 0.25s ease;
	}

	/* On wide screens, shift content left when scratchpad is open */
	@media (min-width: 900px) {
		.pad-open main {
			padding-right: calc(var(--pad-width) + 20px);
		}
	}

	footer {
		text-align: center;
		padding: 1rem;
		color: var(--color-text-muted);
		font-size: 0.85rem;
		border-top: 1px solid var(--color-border);
	}
</style>
