<script lang="ts">
	import { base } from '$app/paths';
	import {
		generateGame,
		getConflictingEdgeKeys,
		selectionWeight,
		type ConflictLevel,
		type GameGraph,
	} from '$lib/food-cart-festival';

	// ── Settings ───────────────────────────────────────────────────────────────
	const CART_COUNT_OPTIONS = [6, 8, 10, 12];
	const CONFLICT_OPTIONS: { value: ConflictLevel; label: string }[] = [
		{ value: 'low',    label: 'Low'    },
		{ value: 'medium', label: 'Medium' },
		{ value: 'high',   label: 'High'   },
	];

	let cartCount     = $state(8);
	let conflictLevel = $state<ConflictLevel>('medium');

	// ── Game state ─────────────────────────────────────────────────────────────
	type Phase = 'idle' | 'playing';

	let phase          = $state<Phase>('idle');
	let graph          = $state<GameGraph | null>(null);
	let selected       = $state(new Set<number>());
	let shakingCarts   = $state(new Set<number>());
	let flashingEdges  = $state(new Set<string>());
	let generating     = $state(false);
	let showingOptimal = $state(false);

	// ── Derived ────────────────────────────────────────────────────────────────
	const conflictEdges = $derived(
		graph ? getConflictingEdgeKeys(selected, graph.edges) : new Set<string>()
	);

	const adjacentEdges = $derived(
		graph
			? new Set(
				graph.edges
					.filter(e => (selected.has(e.from) || selected.has(e.to)) && !conflictEdges.has(edgeKey(e.from, e.to)))
					.map(e => edgeKey(e.from, e.to))
			)
			: new Set<string>()
	);

	const adjacentNodes = $derived(
		graph
			? new Set(
				graph.edges.flatMap(e => {
					if (conflictEdges.has(edgeKey(e.from, e.to))) return [];
					if (selected.has(e.from) && !selected.has(e.to)) return [e.to];
					if (selected.has(e.to) && !selected.has(e.from)) return [e.from];
					return [];
				})
			)
			: new Set<number>()
	);

	const score = $derived(
		graph ? selectionWeight(selected, graph.carts) : 0
	);

	const isValid   = $derived(conflictEdges.size === 0);
	const isOptimal = $derived(isValid && graph !== null && score === graph.optimalWeight);

	const nodeRadius = $derived(
		cartCount <= 7 ? 30 : cartCount <= 10 ? 26 : 22
	);

	// ── Actions ────────────────────────────────────────────────────────────────
	function startGame() {
		generating = true;
		setTimeout(() => {
			graph          = generateGame(cartCount, conflictLevel);
			selected       = new Set();
			shakingCarts   = new Set();
			flashingEdges  = new Set();
			showingOptimal = false;
			phase          = 'playing';
			generating     = false;
		}, 20);
	}

	function reset() {
		selected       = new Set();
		shakingCarts   = new Set();
		flashingEdges  = new Set();
		showingOptimal = false;
	}

	function toggleCart(id: number) {
		showingOptimal = false;
		const next = new Set(selected);
		if (next.has(id)) {
			next.delete(id);
			selected = next;
			return;
		}

		next.add(id);
		selected = next;

		// Check for newly created conflicts involving this cart
		if (graph) {
			const conflicts = getConflictingEdgeKeys(next, graph.edges);
			const newConflictNeighbors: number[] = [];
			for (const key of conflicts) {
				const [a, b] = key.split('-').map(Number);
				if (a === id || b === id) newConflictNeighbors.push(a === id ? b : a);
			}
			if (newConflictNeighbors.length > 0) {
				triggerShake([id, ...newConflictNeighbors]);
				triggerEdgeFlash(
					[...conflicts].filter(k => {
						const [a, b] = k.split('-').map(Number);
						return a === id || b === id;
					})
				);
			}
		}
	}

	function revealOptimal() {
		if (!graph) return;
		selected       = new Set(graph.optimalSet);
		shakingCarts   = new Set();
		flashingEdges  = new Set();
		showingOptimal = true;
	}

	function triggerShake(ids: number[]) {
		shakingCarts = new Set([...shakingCarts, ...ids]);
		setTimeout(() => {
			shakingCarts = new Set([...shakingCarts].filter(id => !ids.includes(id)));
		}, 450);
	}

	function triggerEdgeFlash(keys: string[]) {
		flashingEdges = new Set([...flashingEdges, ...keys]);
		setTimeout(() => {
			flashingEdges = new Set([...flashingEdges].filter(k => !keys.includes(k)));
		}, 450);
	}

	function edgeKey(from: number, to: number): string {
		return `${from}-${to}`;
	}

	function shortName(name: string): string {
		return name.length > 15 ? name.slice(0, 14) + '…' : name;
	}
</script>

<svelte:head>
	<title>Food Cart Festival — Math Games</title>
</svelte:head>

<div class="page">
	<a href="{base}/" class="back">← Back to games</a>
	<h1>Food Cart Festival</h1>

	<p class="desc">
		You're curating the food cart lineup for a local festival. The vendors are very
		competitive and some refuse to attend the same event together. Conflicts are indicated
		by the lines drawn between vendors. Each cart has a popularity rating.
		Click carts to include them; build the highest-scoring conflict-free lineup!
	</p>

	<!-- ══ IDLE ═════════════════════════════════════════════════════════════════ -->
	{#if phase === 'idle'}
		<div class="settings">
			<div class="setting-row">
				<span class="setting-label">Carts</span>
				<div class="toggle-group">
					{#each CART_COUNT_OPTIONS as n}
						<button
							class="tog-btn"
							class:active={cartCount === n}
							onclick={() => (cartCount = n)}
						>{n}</button>
					{/each}
				</div>
			</div>
			<div class="setting-row">
				<span class="setting-label">Conflicts</span>
				<div class="toggle-group">
					{#each CONFLICT_OPTIONS as opt}
						<button
							class="tog-btn"
							class:active={conflictLevel === opt.value}
							onclick={() => (conflictLevel = opt.value)}
						>{opt.label}</button>
					{/each}
				</div>
			</div>
		</div>

		<div class="center">
			<button class="btn large" onclick={startGame} disabled={generating}>
				{generating ? 'Generating…' : 'Plan the Festival'}
			</button>
		</div>

	<!-- ══ PLAYING ══════════════════════════════════════════════════════════════ -->
	{:else if phase === 'playing' && graph}

		<!-- Unified status + feedback card -->
		<div class="game-status"
			class:gs-conflict={conflictEdges.size > 0}
			class:gs-valid={isValid && selected.size > 0 && !isOptimal}
			class:gs-optimal={isOptimal}
		>
			<div class="gs-stats">
				<span class="gs-item">
					<span class="gs-val">{selected.size}</span>
					<span class="gs-lbl">selected</span>
				</span>
				<span class="gs-sep">·</span>
				<span class="gs-item">
					<span class="gs-val" class:gs-score-valid={isValid && score > 0} class:gs-score-conflict={conflictEdges.size > 0}>{score}</span>
					<span class="gs-lbl">score</span>
				</span>
				{#if conflictEdges.size > 0}
					<span class="gs-sep">·</span>
					<span class="gs-item">
						<span class="gs-val gs-conflict-val">{conflictEdges.size}</span>
						<span class="gs-lbl">conflict{conflictEdges.size !== 1 ? 's' : ''}</span>
					</span>
				{/if}
			</div>
			{#if isOptimal}
				<div class="gs-msg">🏆 <strong>Perfect lineup!</strong> That's the maximum possible score.</div>
			{:else if showingOptimal}
				<div class="gs-msg">💡 One optimal lineup — score of {graph.optimalWeight}.</div>
			{:else if isValid}
				<div class="gs-msg">✓ No conflicts. Can you score higher? <button class="inline-link" onclick={revealOptimal}>Show optimal</button></div>
			{:else}
				<div class="gs-msg">Your lineup has conflicts!</div>
			{/if}
		</div>

		<!-- Graph -->
		<div class="graph-wrap">
			<svg viewBox="0 0 500 500" width="100%" aria-label="Food cart conflict graph">
				<!-- Edges -->
				{#each graph.edges as edge}
					{@const key = edgeKey(edge.from, edge.to)}
					<line
						x1={graph.carts[edge.from].x}
						y1={graph.carts[edge.from].y}
						x2={graph.carts[edge.to].x}
						y2={graph.carts[edge.to].y}
						class="edge"
						class:adjacent={adjacentEdges.has(key)}
						class:conflict={conflictEdges.has(key)}
						class:flash={flashingEdges.has(key)}
					/>
				{/each}

				<!-- Carts -->
				{#each graph.carts as cart}
					{@const isSelected  = selected.has(cart.id)}
					{@const isConflicting = isSelected && [...conflictEdges].some(k => {
						const [a, b] = k.split('-').map(Number);
						return a === cart.id || b === cart.id;
					})}
					{@const isAdjacent = !isSelected && adjacentNodes.has(cart.id)}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_interactive_supports_focus -->
					<g
						transform="translate({cart.x},{cart.y})"
						class="cart"
						class:selected={isSelected}
						class:conflicting={isConflicting}
						class:adjacent={isAdjacent}
						role="button"
						aria-label="{cart.name}, popularity {cart.popularity}{isSelected ? ', selected' : ''}"
						onclick={() => toggleCart(cart.id)}
					>
						<g class:shaking={shakingCarts.has(cart.id)}>
							<!-- Selection/adjacency glow -->
							{#if isSelected || isAdjacent}
								<circle r={nodeRadius + 7} class="glow-ring" />
							{/if}
							<!-- Main circle -->
							<circle r={nodeRadius} class="cart-circle" />
							<!-- Emoji -->
							<text
								y={1}
								class="cart-emoji"
								text-anchor="middle"
								dominant-baseline="central"
								font-size={nodeRadius * 1.0}
							>{cart.emoji}</text>
							<!-- Popularity badge -->
							<circle
								cx={nodeRadius * 0.68}
								cy={-nodeRadius * 0.68}
								r={nodeRadius * 0.42}
								class="badge-bg"
							/>
							<text
								x={nodeRadius * 0.68}
								y={-nodeRadius * 0.68}
								class="badge-text"
								text-anchor="middle"
								dominant-baseline="central"
								font-size={nodeRadius * 0.45}
							>{cart.popularity}</text>
							</g>
					</g>
				{/each}
			</svg>
		</div>

		<!-- Cart roster — names + ratings in readable form, also clickable -->
		<div class="roster">
			{#each graph.carts as cart}
				{@const isSelected = selected.has(cart.id)}
				{@const isConflicting = isSelected && [...conflictEdges].some(k => {
					const [a, b] = k.split('-').map(Number);
					return a === cart.id || b === cart.id;
				})}
				<button
					class="roster-item"
					class:selected={isSelected}
					class:conflicting={isConflicting}
						onclick={() => toggleCart(cart.id)}
					aria-label="{cart.name}, popularity {cart.popularity}{isSelected ? ', selected' : ''}"
				>
					<span class="roster-emoji">{cart.emoji}</span>
					<span class="roster-name">{cart.name}</span>
					<span class="roster-pop">★{cart.popularity}</span>
				</button>
			{/each}
		</div>

		<!-- Actions -->
		<div class="actions">
			<button class="btn btn-ghost" onclick={reset}>Reset</button>
			<button class="btn btn-ghost" onclick={() => (phase = 'idle')}>New Game</button>
		</div>
	{/if}
</div>

<style>
	.page {
		max-width: 520px;
		margin: 0 auto;
	}

	.back {
		display: inline-block;
		margin-bottom: 1.5rem;
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}

	h1 { font-size: 2rem; font-weight: 800; margin-bottom: 0.4rem; }

	.desc {
		color: var(--color-text-muted);
		line-height: 1.65;
		margin-bottom: 1.75rem;
	}

	/* ── Settings ── */
	.settings {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 1rem 1.25rem;
		margin-bottom: 1.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.setting-row { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }

	.setting-label {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--color-text-muted);
		min-width: 5rem;
	}

	.toggle-group { display: flex; gap: 0.35rem; flex-wrap: wrap; }

	.tog-btn {
		padding: 0.3rem 0.9rem;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text-muted);
		font-size: 0.9rem;
		font-weight: 700;
		transition: background 0.15s, border-color 0.15s, color 0.15s;
	}

	.tog-btn:hover:not(.active) { border-color: var(--color-accent); color: var(--color-text); }
	.tog-btn.active { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }

	.center { display: flex; justify-content: center; }

	/* ── Unified status + feedback card ── */
	.game-status {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 0.65rem 1rem;
		margin-bottom: 0.75rem;
		transition: border-color 0.2s;
	}

	.game-status.gs-conflict { border-color: #ef444466; }
	.game-status.gs-valid    { border-color: #4caf6f66; }
	.game-status.gs-optimal  { border-color: #d4b44a66; }

	.gs-stats {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		font-size: 0.85rem;
	}

	.gs-item { display: flex; align-items: baseline; gap: 0.3rem; }
	.gs-val  { font-weight: 700; font-variant-numeric: tabular-nums; }
	.gs-lbl  { color: var(--color-text-muted); }
	.gs-sep  { color: var(--color-border); }

	.gs-score-valid    { color: #4caf6f; }
	.gs-score-conflict { color: var(--color-text-muted); }
	.gs-conflict-val   { color: #ef4444; }

	.gs-msg {
		margin-top: 0.4rem;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.game-status.gs-valid .gs-msg   { color: #4caf6f; }
	.game-status.gs-optimal .gs-msg { color: #d4b44a; }

	.inline-link {
		background: none;
		border: none;
		padding: 0;
		margin-left: 0.2rem;
		color: inherit;
		text-decoration: underline;
		cursor: pointer;
		font-size: inherit;
		opacity: 0.85;
	}
	.inline-link:hover { opacity: 1; }

	/* ── Graph ── */
	.graph-wrap {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		overflow: hidden;
		margin-bottom: 1rem;
		user-select: none;
	}

	/* Edges */
	:global(.edge) {
		stroke: #3a3f56;
		stroke-width: 2;
		transition: stroke 0.2s, stroke-width 0.2s;
		pointer-events: none;
	}

	:global(.edge.adjacent) {
		stroke: #ef444444;
		stroke-width: 2.5;
	}

	:global(.edge.conflict) {
		stroke: #ef4444;
		stroke-width: 3;
	}

	:global(.edge.flash) {
		animation: edge-flash 0.45s ease-out;
	}

	/* Carts */
	:global(.cart) { cursor: pointer; }

	:global(.cart-circle) {
		fill: var(--color-surface-2);
		stroke: #3a3f56;
		stroke-width: 2;
		transition: fill 0.15s, stroke 0.15s;
	}

	:global(.cart.selected .cart-circle) {
		fill: #2a4a3a;
		stroke: #4caf6f;
		stroke-width: 2.5;
	}

	:global(.cart.conflicting .cart-circle) {
		fill: #4a2a2a;
		stroke: #ef4444;
		stroke-width: 2.5;
	}

	:global(.glow-ring) {
		fill: none;
		stroke: #4caf6f;
		stroke-width: 2;
		stroke-opacity: 0.3;
	}

	:global(.cart.conflicting .glow-ring) {
		stroke: #ef4444;
	}

	:global(.cart.adjacent .glow-ring) {
		stroke: #ef4444;
		stroke-opacity: 0.25;
	}

	:global(.cart-emoji) {
		pointer-events: none;
		font-family: 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif;
	}

	:global(.badge-bg) {
		fill: #1a1d27;
		stroke: #3a3f56;
		stroke-width: 1;
	}

	:global(.cart.selected .badge-bg) {
		fill: #1a3a2a;
		stroke: #4caf6f;
	}

	:global(.cart.conflicting .badge-bg) {
		fill: #3a1a1a;
		stroke: #ef4444;
	}

	:global(.badge-text) {
		fill: var(--color-text-muted);
		font-weight: 700;
		pointer-events: none;
	}

	:global(.cart.selected .badge-text)    { fill: #4caf6f; }
	:global(.cart.conflicting .badge-text) { fill: #ef4444; }

	/* ── Roster ── */
	.roster {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
		gap: 0.35rem;
		margin-bottom: 1rem;
	}

	.roster-item {
		display: flex;
		align-items: flex-start;
		gap: 0.45rem;
		padding: 0.5rem 0.6rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		cursor: pointer;
		text-align: left;
		transition: background 0.15s, border-color 0.15s;
	}

	.roster-item:hover:not(:disabled):not(.selected):not(.conflicting) {
		border-color: var(--color-accent);
	}

	.roster-item.selected    { background: #1a3a2a; border-color: #4caf6f; }
	.roster-item.conflicting { background: #3a1a1a; border-color: #ef4444; }
	.roster-item:disabled    { cursor: default; }

	.roster-emoji { font-size: 1.05rem; flex-shrink: 0; line-height: 1.3; }

	.roster-name {
		flex: 1;
		font-size: 0.78rem;
		color: var(--color-text-muted);
		line-height: 1.3;
	}

	.roster-item.selected .roster-name    { color: var(--color-text); }
	.roster-item.conflicting .roster-name { color: #ef4444; }

	.roster-pop {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--color-text-muted);
		flex-shrink: 0;
		line-height: 1.3;
	}

	.roster-item.selected .roster-pop    { color: #4caf6f; }
	.roster-item.conflicting .roster-pop { color: #ef4444; }

	/* Shake animation */
	@keyframes shake-anim {
		0%,  100% { transform: translate(0, 0); }
		20%        { transform: translate(-5px, 0); }
		40%        { transform: translate(5px, 0); }
		60%        { transform: translate(-4px, 0); }
		80%        { transform: translate(4px, 0); }
	}

	:global(.cart .shaking) {
		animation: shake-anim 0.45s ease;
	}

	@keyframes edge-flash {
		0%   { stroke: #ef4444; stroke-width: 6; }
		100% { stroke: #ef4444; stroke-width: 3; }
	}

	/* ── Actions ── */
	.actions { display: flex; gap: 0.5rem; margin-bottom: 1rem; }

	/* ── Buttons ── */
	.btn {
		padding: 0.7rem 1.4rem;
		background: var(--color-accent);
		color: #fff;
		border: none;
		border-radius: var(--radius);
		font-size: 1rem;
		font-weight: 600;
		transition: background 0.2s;
	}

	.btn:hover:not(:disabled) { background: var(--color-accent-hover); }
	.btn:disabled { opacity: 0.5; cursor: not-allowed; }

	.btn.large { padding: 0.9rem 2rem; font-size: 1.05rem; }

	.btn-ghost {
		background: var(--color-surface-2);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}

	.btn-ghost:hover:not(:disabled) { background: var(--color-surface); border-color: var(--color-accent); }
</style>
