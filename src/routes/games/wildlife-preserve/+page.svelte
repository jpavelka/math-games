<script lang="ts">
	import { base } from '$app/paths';
	import {
		generateGame,
		getConflictingEdgeKeys,
		countUsedHabitats,
		isValidColoring,
		computeOptimalColoring,
		HABITATS,
		type ConflictLevel,
		type HabitatId,
		type GameGraph,
	} from '$lib/wildlife-preserve';

	// ── Settings ───────────────────────────────────────────────────────────────
	const ANIMAL_COUNT_OPTIONS = [5, 7, 9, 11];
	const CONFLICT_OPTIONS: { value: ConflictLevel; label: string }[] = [
		{ value: 'low',    label: 'Low'    },
		{ value: 'medium', label: 'Medium' },
		{ value: 'high',   label: 'High'   },
	];

	let animalCount    = $state(7);
	let conflictLevel  = $state<ConflictLevel>('medium');

	// ── Game state ─────────────────────────────────────────────────────────────
	type Phase = 'idle' | 'playing';

	let phase          = $state<Phase>('idle');
	let graph          = $state<GameGraph | null>(null);
	let colors         = $state<(HabitatId | null)[]>([]);
	let selectedAnimal = $state<number | null>(null);
	let shakingAnimals    = $state(new Set<number>());
	let flashingEdges     = $state(new Set<string>());
	let generating        = $state(false);
	let showingOptimal    = $state(false);

	// ── Derived ────────────────────────────────────────────────────────────────
	const conflictEdges = $derived(
		graph ? getConflictingEdgeKeys(colors, graph.edges) : new Set<string>()
	);

	const usedHabitats = $derived(countUsedHabitats(colors));

	const unassigned = $derived(colors.filter(c => c === null).length);

	const solved = $derived(
		graph !== null && isValidColoring(colors, graph.edges)
	);

	const isOptimal = $derived(
		solved && graph !== null && usedHabitats === graph.chromaticNumber
	);

	// Node visual sizing based on animal count
	const nodeRadius = $derived(
		animalCount <= 7 ? 30 : animalCount <= 10 ? 26 : 22
	);

	// ── Actions ────────────────────────────────────────────────────────────────
	function startGame() {
		generating = true;
		// Defer to next tick so the UI can update to show the loading state
		setTimeout(() => {
			graph          = generateGame(animalCount, conflictLevel);
			colors         = new Array(animalCount).fill(null);
			selectedAnimal = null;
			shakingAnimals = new Set();
			flashingEdges  = new Set();
			showingOptimal = false;
			phase          = 'playing';
			generating     = false;
		}, 20);
	}

	function resetColors() {
		colors         = new Array(graph!.animals.length).fill(null);
		selectedAnimal = null;
		shakingAnimals = new Set();
		flashingEdges  = new Set();
		showingOptimal = false;
	}

	function showOptimal() {
		if (!graph) return;
		colors         = computeOptimalColoring(graph);
		selectedAnimal = null;
		shakingAnimals = new Set();
		flashingEdges  = new Set();
		showingOptimal = true;
	}

	function selectAnimal(id: number) {
		selectedAnimal = selectedAnimal === id ? null : id;
	}

	function assignColor(habitatId: HabitatId | null) {
		if (selectedAnimal === null) return;

		const next = [...colors];
		next[selectedAnimal] = habitatId;
		colors = next;

		// Check for new conflicts involving this animal
		if (habitatId !== null && graph) {
			const newConflicts = getConflictingEdgeKeys(colors, graph.edges);
			const conflictingNeighbors: number[] = [];

			for (const key of newConflicts) {
				const [a, b] = key.split('-').map(Number);
				if (a === selectedAnimal || b === selectedAnimal) {
					conflictingNeighbors.push(a === selectedAnimal ? b : a);
				}
			}

			if (conflictingNeighbors.length > 0) {
				triggerShake([selectedAnimal, ...conflictingNeighbors]);
				triggerEdgeFlash([...newConflicts].filter(k => {
					const [a, b] = k.split('-').map(Number);
					return a === selectedAnimal || b === selectedAnimal;
				}));
			}
		}
	}

	function triggerShake(ids: number[]) {
		shakingAnimals = new Set([...shakingAnimals, ...ids]);
		setTimeout(() => {
			shakingAnimals = new Set([...shakingAnimals].filter(id => !ids.includes(id)));
		}, 450);
	}

	function triggerEdgeFlash(keys: string[]) {
		flashingEdges = new Set([...flashingEdges, ...keys]);
		setTimeout(() => {
			flashingEdges = new Set([...flashingEdges].filter(k => !keys.includes(k)));
		}, 450);
	}

	function habitatColor(id: HabitatId | null): string {
		if (!id) return 'var(--color-surface-2)';
		return HABITATS.find(h => h.id === id)!.color;
	}

	function edgeKey(from: number, to: number): string {
		return `${from}-${to}`;
	}
</script>

<svelte:head>
	<title>Wildlife Preserve — Math Games</title>
</svelte:head>

<div class="page">
	<a href="{base}/" class="back">← Back to games</a>
	<h1>Wildlife Preserve</h1>

	<p class="desc">
		Animals that don't get along have been placed in a shared preserve. Your job is to sort them
		into separate habitats so no two rivals share one. Use as few habitats as possible — each one
		is expensive to build and maintain!
	</p>

	<details class="learn-details">
		<summary>Learn more</summary>
		<div class="learn-body">
			<h3>Graph Coloring</h3>
			<p>
				Sorting animals so no rivals share a habitat is the
				<a href="https://en.wikipedia.org/wiki/Graph_coloring" target="_blank" rel="noopener">graph coloring problem</a>.
				The minimum number of colors needed is the
				<a href="https://en.wikipedia.org/wiki/Chromatic_number" target="_blank" rel="noopener">chromatic number</a> χ(G),
				and computing it is <a href="https://en.wikipedia.org/wiki/NP-hardness" target="_blank" rel="noopener">NP-hard</a> in general.
			</p>
			<h4>The Four Color Theorem</h4>
			<p>
				For planar graphs (those drawable without edge crossings), the
				<a href="https://en.wikipedia.org/wiki/Four_color_theorem" target="_blank" rel="noopener">Four Color Theorem</a>
				guarantees χ(G) ≤ 4. Conjectured in 1852, it was finally proved in 1976 by
				Appel and Haken — one of the first major proofs to rely on a computer,
				verifying 1,936 unavoidable configurations.
			</p>
			<h4>Greedy coloring</h4>
			<p>
				A greedy approach assigns each vertex the smallest color not yet used by any neighbour.
				It uses at most Δ(G) + 1 colors (Δ = maximum degree) but doesn't always reach χ(G).
				The game solves the puzzle optimally using backtracking.
			</p>
		</div>
	</details>

	<!-- ══ IDLE ═════════════════════════════════════════════════════════════════ -->
	{#if phase === 'idle'}
		<div class="settings">
			<div class="setting-row">
				<span class="setting-label">Animals</span>
				<div class="toggle-group">
					{#each ANIMAL_COUNT_OPTIONS as n}
						<button
							class="tog-btn"
							class:active={animalCount === n}
							onclick={() => (animalCount = n)}
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
				{generating ? 'Generating…' : 'Generate Preserve'}
			</button>
		</div>

	<!-- ══ PLAYING ══════════════════════════════════════════════════════════════ -->
	{:else if phase === 'playing' && graph}
		<!-- Unified status + feedback card -->
		<div class="game-status"
			class:gs-conflict={conflictEdges.size > 0}
			class:gs-solved={solved && !isOptimal}
			class:gs-optimal={isOptimal}
		>
			<div class="gs-stats">
				<span class="gs-item">
					<span class="gs-val">{usedHabitats}</span>
					<span class="gs-lbl">habitat{usedHabitats !== 1 ? 's' : ''} used</span>
				</span>
				<span class="gs-sep">·</span>
				<span class="gs-item">
					<span class="gs-val" class:gs-unassigned={unassigned > 0}>{unassigned}</span>
					<span class="gs-lbl">unassigned</span>
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
				<div class="gs-msg">🏆 <strong>Perfect!</strong> {usedHabitats} habitat{usedHabitats !== 1 ? 's' : ''} — the minimum possible.</div>
			{:else if showingOptimal}
				<div class="gs-msg">💡 One optimal solution using {graph.chromaticNumber} habitat{graph.chromaticNumber !== 1 ? 's' : ''}.</div>
			{:else if solved}
				<div class="gs-msg">✓ Solved with {usedHabitats} habitats, but a better solution exists. <button class="inline-link" onclick={showOptimal}>Show me</button></div>
			{:else if conflictEdges.size > 0}
				<div class="gs-msg">You have unresolved conflicts.</div>
			{:else}
				<div class="gs-msg">Assignment not complete.</div>
			{/if}
		</div>

		<!-- Graph -->
		<div class="graph-wrap">
			<svg viewBox="0 0 480 480" width="100%" aria-label="Animal conflict graph">
				<!-- Edges -->
				{#each graph.edges as edge}
					{@const key = edgeKey(edge.from, edge.to)}
					{@const isConflict = conflictEdges.has(key)}
					{@const isFlashing = flashingEdges.has(key)}
					<line
						x1={graph.animals[edge.from].x}
						y1={graph.animals[edge.from].y}
						x2={graph.animals[edge.to].x}
						y2={graph.animals[edge.to].y}
						class="edge"
						class:conflict={isConflict}
						class:flash={isFlashing}
					/>
				{/each}

				<!-- Animals -->
				{#each graph.animals as animal}
					{@const isSelected = selectedAnimal === animal.id}
					{@const isShaking = shakingAnimals.has(animal.id)}
					{@const hasColor = colors[animal.id] !== null}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_interactive_supports_focus -->
					<!-- Outer g: positions the node. Inner g: handles shake so CSS transform
					     doesn't override the SVG translate and fling nodes off-screen. -->
					<g
						transform="translate({animal.x},{animal.y})"
						class="animal"
						class:selected={isSelected}
						class:uncolored={!hasColor}
						role="button"
						aria-label="{animal.name}{colors[animal.id] ? `, ${colors[animal.id]} habitat` : ', unassigned'}"
						onclick={() => selectAnimal(animal.id)}
					>
					<g class:shaking={isShaking}>
						<!-- Selection ring -->
						{#if isSelected}
							<circle r={nodeRadius + 6} class="selection-ring" />
						{/if}
						<!-- Main circle -->
						<circle
							r={nodeRadius}
							class="animal-circle"
							fill={habitatColor(colors[animal.id])}
						/>
						<!-- Emoji -->
						<text
							y={1}
							class="animal-emoji"
							text-anchor="middle"
							dominant-baseline="central"
							font-size={nodeRadius * 1.05}
						>{animal.emoji}</text>
						<!-- Name label -->
						<text
							y={nodeRadius + 16}
							class="animal-name"
							text-anchor="middle"
							dominant-baseline="hanging"
						>{animal.name}</text>
					</g>
					</g>
				{/each}
			</svg>
		</div>

		<!-- Color palette -->
		<div class="palette-wrap">
			{#if selectedAnimal !== null}
				<p class="palette-hint">Assign a habitat to <strong>{graph.animals[selectedAnimal].name}</strong></p>
			{:else}
				<p class="palette-hint muted">Click an animal to select it</p>
			{/if}

			<div class="palette">
				{#each HABITATS as habitat}
					{@const isActive = selectedAnimal !== null && colors[selectedAnimal] === habitat.id}
					<button
						class="swatch"
						class:active={isActive}
						class:disabled={selectedAnimal === null}
						style="--swatch-color: {habitat.color}"
						onclick={() => assignColor(habitat.id)}
						title={habitat.label}
						aria-label="Assign {habitat.label} habitat"
					>
						<span class="swatch-dot"></span>
						<span class="swatch-label">{habitat.label}</span>
					</button>
				{/each}
				<!-- Eraser -->
				<button
					class="swatch swatch-erase"
					class:disabled={selectedAnimal === null}
					onclick={() => assignColor(null)}
					title="Clear habitat"
					aria-label="Clear habitat assignment"
				>
					<span class="swatch-dot erase-dot">✕</span>
					<span class="swatch-label">Clear</span>
				</button>
			</div>
		</div>

		<!-- Actions -->
		<div class="actions">
			<button class="btn btn-ghost" onclick={resetColors}>Reset</button>
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
	.game-status.gs-solved   { border-color: #4caf6f66; }
	.game-status.gs-optimal  { border-color: #d4b44a66; }

	.gs-stats {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		font-size: 0.85rem;
	}

	.gs-item  { display: flex; align-items: baseline; gap: 0.3rem; }
	.gs-val   { font-weight: 700; font-variant-numeric: tabular-nums; }
	.gs-lbl   { color: var(--color-text-muted); }
	.gs-sep   { color: var(--color-border); }

	.gs-unassigned  { color: var(--color-text-muted); }
	.gs-conflict-val { color: #ef4444; }

	.gs-msg {
		margin-top: 0.4rem;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.game-status.gs-solved .gs-msg  { color: #4caf6f; }
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

	:global(.edge.conflict) {
		stroke: #ef4444;
		stroke-width: 3;
	}

	:global(.edge.flash) {
		animation: edge-flash 0.45s ease-out;
	}

	/* Animals */
	:global(.animal) {
		cursor: pointer;
	}

	:global(.animal-circle) {
		stroke: #3a3f56;
		stroke-width: 2;
		transition: fill 0.15s;
	}

	:global(.animal.uncolored .animal-circle) {
		stroke: #3a3f56;
		stroke-dasharray: 5 3;
	}

	:global(.animal.selected .animal-circle) {
		stroke: var(--color-accent);
		stroke-width: 2.5;
	}

	:global(.selection-ring) {
		fill: none;
		stroke: var(--color-accent);
		stroke-width: 2;
		stroke-opacity: 0.35;
	}

	:global(.animal-emoji) {
		pointer-events: none;
		font-family: 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif;
	}

	:global(.animal-name) {
		fill: var(--color-text-muted);
		font-size: 11px;
		pointer-events: none;
	}

	:global(.animal.selected .animal-name) {
		fill: var(--color-text);
	}

	/* Shake animation */
	@keyframes shake-anim {
		0%,  100% { transform: translate(0, 0); }
		20%        { transform: translate(-5px, 0); }
		40%        { transform: translate(5px, 0); }
		60%        { transform: translate(-4px, 0); }
		80%        { transform: translate(4px, 0); }
	}

	:global(.animal .shaking) {
		animation: shake-anim 0.45s ease;
	}

	/* Edge flash animation */
	@keyframes edge-flash {
		0%   { stroke: #ef4444; stroke-width: 6; }
		100% { stroke: #ef4444; stroke-width: 3; }
	}

	/* ── Palette ── */
	.palette-wrap {
		margin-bottom: 1rem;
	}

	.palette-hint {
		font-size: 0.82rem;
		color: var(--color-text);
		margin-bottom: 0.6rem;
	}

	.palette-hint.muted { color: var(--color-text-muted); }

	.palette {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.swatch {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding: 0.5rem 0.45rem 0.4rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		transition: border-color 0.15s, background 0.15s;
		min-width: 3rem;
	}

	.swatch:hover:not(.disabled) {
		border-color: var(--swatch-color, var(--color-accent));
		background: var(--color-surface-2);
	}

	.swatch.active {
		border-color: var(--swatch-color, var(--color-accent));
		background: var(--color-surface-2);
		outline: 2px solid var(--swatch-color, var(--color-accent));
		outline-offset: -1px;
	}

	.swatch.disabled { opacity: 0.4; cursor: not-allowed; }

	.swatch-dot {
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		background: var(--swatch-color, transparent);
		border: 1px solid color-mix(in srgb, var(--swatch-color, #fff) 60%, transparent);
	}

	.swatch-label {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.swatch-erase { --swatch-color: var(--color-text-muted); }

	.erase-dot {
		background: transparent !important;
		border-color: var(--color-border) !important;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.7rem;
		color: var(--color-text-muted);
	}

	/* ── Actions ── */
	.actions {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

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
	.btn:disabled { opacity: 0.6; cursor: not-allowed; }

	.btn.large { padding: 0.9rem 2rem; font-size: 1.05rem; }

	.btn-ghost {
		background: var(--color-surface-2);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}

	.btn-ghost:hover { background: var(--color-surface); border-color: var(--color-accent); }
</style>
