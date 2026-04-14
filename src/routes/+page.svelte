<script lang="ts">
	import { games, type Game } from '$lib/games';
	import { base } from '$app/paths';

	let query = $state('');

	const categoryColors: Record<Game['category'], string> = {
		Arithmetic: 'tag-arithmetic',
		Logic: 'tag-logic',
		'Number Theory': 'tag-number-theory',
		Geometry: 'tag-geometry'
	};

	const filtered = $derived(
		query.trim() === ''
			? games
			: games.filter(
					(g) =>
						g.title.toLowerCase().includes(query.toLowerCase()) ||
						g.description.toLowerCase().includes(query.toLowerCase()) ||
						g.category.toLowerCase().includes(query.toLowerCase())
				)
	);
</script>

<svelte:head>
	<title>Math Games — Home</title>
</svelte:head>

<section class="hero">
	<h1>Mathematical Games &amp; Puzzles</h1>
	<p class="subtitle">Sharpen your mind with interactive math challenges</p>
</section>

<div class="search-wrapper">
	<span class="search-icon">⌕</span>
	<input
		type="search"
		placeholder="Search games by name, category…"
		bind:value={query}
		aria-label="Search games"
	/>
</div>

{#if filtered.length === 0}
	<p class="empty">No games matched <strong>"{query}"</strong>.</p>
{:else}
	<ul class="game-grid">
		{#each filtered as game (game.slug)}
			<li>
				<a href="{base}{game.route}" class="card">
					<span class="card-tag {categoryColors[game.category]}">{game.category}</span>
					<h2>{game.title}</h2>
					<p>{game.description}</p>
					<span class="card-cta">Play →</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.hero {
		text-align: center;
		padding: 3rem 0 2rem;
	}

	.hero h1 {
		font-size: clamp(1.8rem, 4vw, 2.8rem);
		font-weight: 800;
		letter-spacing: -0.5px;
		margin-bottom: 0.5rem;
	}

	.subtitle {
		color: var(--color-text-muted);
		font-size: 1.05rem;
	}

	.search-wrapper {
		position: relative;
		max-width: 480px;
		margin: 2rem auto 3rem;
	}

	.search-icon {
		position: absolute;
		left: 1rem;
		top: 50%;
		transform: translateY(-50%);
		font-size: 1.3rem;
		color: var(--color-text-muted);
		pointer-events: none;
	}

	input[type='search'] {
		width: 100%;
		padding: 0.75rem 1rem 0.75rem 2.8rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		color: var(--color-text);
		font-size: 1rem;
		outline: none;
		transition: border-color 0.2s;
	}

	input[type='search']:focus {
		border-color: var(--color-accent);
	}

	input[type='search']::placeholder {
		color: var(--color-text-muted);
	}

	.game-grid {
		list-style: none;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.25rem;
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1.5rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		color: var(--color-text);
		text-decoration: none;
		transition:
			border-color 0.2s,
			transform 0.15s,
			box-shadow 0.2s;
		height: 100%;
	}

	.card:hover {
		border-color: var(--color-accent);
		transform: translateY(-3px);
		box-shadow: 0 8px 24px rgba(108, 139, 239, 0.12);
	}

	.card h2 {
		font-size: 1.15rem;
		font-weight: 700;
	}

	.card p {
		color: var(--color-text-muted);
		font-size: 0.9rem;
		flex: 1;
		line-height: 1.55;
	}

	.card-cta {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-accent);
		margin-top: 0.5rem;
	}

	.card-tag {
		display: inline-block;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 0.2rem 0.55rem;
		border-radius: var(--radius-sm);
		width: fit-content;
	}

	.tag-arithmetic {
		background: rgba(74, 222, 128, 0.15);
		color: var(--color-tag-arithmetic);
	}

	.tag-logic {
		background: rgba(245, 158, 11, 0.15);
		color: var(--color-tag-logic);
	}

	.tag-number-theory {
		background: rgba(167, 139, 250, 0.15);
		color: var(--color-tag-number-theory);
	}

	.tag-geometry {
		background: rgba(56, 189, 248, 0.15);
		color: var(--color-tag-geometry);
	}

	.empty {
		text-align: center;
		color: var(--color-text-muted);
		margin-top: 4rem;
		font-size: 1.05rem;
	}
</style>
