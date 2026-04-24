<script lang="ts">
	import { base } from '$app/paths';

	type Phase      = 'idle' | 'playing' | 'won';
	type Opponent   = 'human' | 'computer';
	type CompOrder  = 'first' | 'second';
	type Difficulty = 'easy' | 'medium' | 'hard';
	type NimMode    = 'off' | 'sum' | 'full';
	type PositionKey = 'classic' | 'balanced' | 'trees' | 'puzzle' | 'random';
	type Variant    = 'green' | 'blue-red';
	type EdgeColor  = 'green' | 'blue' | 'red';

	interface HNode { id: number; x: number; y: number; ground: boolean; }
	interface HEdge { id: number; u: number; v: number; color: EdgeColor; }

	// ── Settings ────────────────────────────────────────────────────────────────
	let opponent    = $state<Opponent>('computer');
	let compOrder   = $state<CompOrder>('second');
	let difficulty  = $state<Difficulty>('medium');
	let posKey      = $state<PositionKey>('classic');
	let nimMode     = $state<NimMode>('off');
	let variant     = $state<Variant>('green');

	// ── Game state ───────────────────────────────────────────────────────────────
	let phase         = $state<Phase>('idle');
	let nodes         = $state<HNode[]>([]);
	let edges         = $state<HEdge[]>([]);
	let initNodes: HNode[] = [];
	let initEdges: HEdge[] = [];
	let currentPlayer = $state<1 | 2>(1);
	let winner        = $state<1 | 2 | null>(null);
	let thinking      = $state(false);
	let previewEdge   = $state<number | null>(null);
	let hoveredEdge   = $state<number | null>(null);
	let playerTimer: ReturnType<typeof setTimeout> | null = null;

	// ── Derived ──────────────────────────────────────────────────────────────────
	const computerPlayer  = $derived<1 | 2>(compOrder === 'first' ? 1 : 2);
	const isComputersTurn = $derived(opponent === 'computer' && phase === 'playing' && currentPlayer === computerPlayer);
	const nimSum          = $derived(computeGameNim(nodes, edges));

	// ── SVG layout ───────────────────────────────────────────────────────────────
	const SVG_W    = 420;
	const SVG_H    = 280;
	const GROUND_Y = 252;
	const UNIT     = 50;

	// ── Graph helpers ────────────────────────────────────────────────────────────

	function buildAdj(ns: HNode[], es: HEdge[]): Map<number, number[]> {
		const adj = new Map<number, number[]>();
		for (const n of ns) adj.set(n.id, []);
		for (const e of es) {
			adj.get(e.u)!.push(e.v);
			adj.get(e.v)!.push(e.u);
		}
		return adj;
	}

	function groundReach(ns: HNode[], es: HEdge[]): Set<number> {
		const adj     = buildAdj(ns, es);
		const visited = new Set<number>();
		const stack   = ns.filter(n => n.ground).map(n => n.id);
		for (const id of stack) visited.add(id);
		while (stack.length) {
			const cur = stack.pop()!;
			for (const nb of adj.get(cur) ?? []) {
				if (!visited.has(nb)) { visited.add(nb); stack.push(nb); }
			}
		}
		return visited;
	}

	function afterRemove(es: HEdge[], removeId: number, ns: HNode[]): HEdge[] {
		const remaining = es.filter(e => e.id !== removeId);
		const reach     = groundReach(ns, remaining);
		return remaining.filter(e => reach.has(e.u) && reach.has(e.v));
	}

	// Nim-value: nim(edge from parent→node) = 1 + XOR of child edge nim-values (Colon Principle)
	function computeGameNim(ns: HNode[], es: HEdge[]): number {
		if (!es.length) return 0;
		const adj   = buildAdj(ns, es);
		const reach = groundReach(ns, es);
		const gids  = new Set(ns.filter(n => n.ground).map(n => n.id));

		function edgeNim(parent: number, node: number): number {
			const children = (adj.get(node) ?? []).filter(nb => nb !== parent && reach.has(nb));
			return 1 + children.reduce((xor, c) => xor ^ edgeNim(node, c), 0);
		}

		let total = 0;
		for (const g of gids) {
			for (const nb of adj.get(g) ?? []) {
				if (!gids.has(nb) && reach.has(nb)) total ^= edgeNim(g, nb);
			}
		}
		return total;
	}

	// ── AI ───────────────────────────────────────────────────────────────────────

	function optimalEdge(ns: HNode[], es: HEdge[]): HEdge | null {
		for (const e of es) {
			if (computeGameNim(ns, afterRemove(es, e.id, ns)) === 0) return e;
		}
		return null;
	}

	// Returns true if the given player can force a win from this position.
	function canWinBR(ns: HNode[], es: HEdge[], player: 1 | 2): boolean {
		const myColor = player === 1 ? 'blue' : 'red';
		const mine    = es.filter(e => e.color === myColor);
		if (!mine.length) return false;
		const opp = player === 1 ? 2 : 1;
		return mine.some(e => !canWinBR(ns, afterRemove(es, e.id, ns), opp));
	}

	function getComputerMove(ns: HNode[], es: HEdge[]): HEdge {
		const myColor = computerPlayer === 1 ? 'blue' : 'red';
		const valid   = variant === 'blue-red' ? es.filter(e => e.color === myColor) : es;
		const rand    = () => valid[Math.floor(Math.random() * valid.length)];
		if (difficulty === 'easy') return rand();
		if (variant === 'blue-red') {
			const opp     = computerPlayer === 1 ? 2 : 1;
			const winning = valid.filter(e => !canWinBR(ns, afterRemove(es, e.id, ns), opp));
			const opt     = winning.length ? winning[Math.floor(Math.random() * winning.length)] : null;
			if (difficulty === 'hard') return opt ?? rand();
			return (opt && Math.random() < 0.8) ? opt : rand();
		}
		const opt = optimalEdge(ns, es);
		if (difficulty === 'hard') return opt ?? rand();
		return (opt && Math.random() < 0.8) ? opt : rand();
	}

	// ── Position builder ─────────────────────────────────────────────────────────

	let _id = 0;
	const nid = () => _id++;

	function stalk(cx: number, h: number, ns: HNode[], es: HEdge[]) {
		const g: HNode = { id: nid(), x: cx, y: GROUND_Y, ground: true };
		ns.push(g);
		let prev = g;
		for (let i = 0; i < h; i++) {
			const n: HNode = { id: nid(), x: cx, y: GROUND_Y - (i + 1) * UNIT, ground: false };
			ns.push(n);
			es.push({ id: nid(), u: prev.id, v: n.id, color: 'green' });
			prev = n;
		}
	}

	// trunk edges straight up, then two branches diverging at ±spread
	function yTree(cx: number, trunkH: number, lh: number, rh: number, ns: HNode[], es: HEdge[], spread = 48) {
		const g: HNode = { id: nid(), x: cx, y: GROUND_Y, ground: true };
		ns.push(g);
		let prev = g;
		for (let i = 0; i < trunkH; i++) {
			const n: HNode = { id: nid(), x: cx, y: GROUND_Y - (i + 1) * UNIT, ground: false };
			ns.push(n); es.push({ id: nid(), u: prev.id, v: n.id, color: 'green' }); prev = n;
		}
		const fork = prev;
		let lp = fork;
		for (let i = 0; i < lh; i++) {
			const n: HNode = { id: nid(), x: cx - spread, y: fork.y - (i + 1) * UNIT, ground: false };
			ns.push(n); es.push({ id: nid(), u: lp.id, v: n.id, color: 'green' }); lp = n;
		}
		let rp = fork;
		for (let i = 0; i < rh; i++) {
			const n: HNode = { id: nid(), x: cx + spread, y: fork.y - (i + 1) * UNIT, ground: false };
			ns.push(n); es.push({ id: nid(), u: rp.id, v: n.id, color: 'green' }); rp = n;
		}
	}

	const POSITIONS: { key: PositionKey; label: string }[] = [
		{ key: 'classic', label: 'Classic' },
		{ key: 'balanced', label: 'Balanced' },
		{ key: 'trees',   label: 'Trees' },
		{ key: 'puzzle',  label: 'Puzzle' },
		{ key: 'random',  label: 'Random' },
	];

	function buildPosition(key: PositionKey): { nodes: HNode[]; edges: HEdge[] } {
		_id = 0;
		const ns: HNode[] = [], es: HEdge[] = [];
		switch (key) {
			case 'classic':
				// Stalks 3-2-4. Nim = 3^2^4 = 5. First player wins.
				stalk(85,  3, ns, es);
				stalk(210, 2, ns, es);
				stalk(335, 4, ns, es);
				break;
			case 'balanced':
				// Stalks 1-2-3. Nim = 0. Second player wins.
				stalk(85,  1, ns, es);
				stalk(210, 2, ns, es);
				stalk(335, 3, ns, es);
				break;
			case 'trees':
				// Y(trunk=1, l=1, r=1) + stalk(3). Nim = 1^3 = 2. First player wins.
				yTree(130, 1, 1, 1, ns, es);
				stalk(315, 3, ns, es);
				break;
			case 'puzzle':
				// Y(trunk=1, l=2, r=2) + stalk(1). Nim = 1^1 = 0. Second player wins.
				yTree(145, 1, 2, 2, ns, es);
				stalk(330, 1, ns, es);
				break;
			case 'random':
			default: {
				const n      = 2 + Math.floor(Math.random() * 3);  // 2, 3, or 4
				const margin = 20;
				const gap    = (SVG_W - 2 * margin) / (n + 1);
				const spread = Math.min(42, Math.floor(gap / 2) - 10);
				for (let i = 1; i <= n; i++) {
					const x = Math.round(margin + i * gap);
					if (Math.random() < 0.55) {
						stalk(x, 1 + Math.floor(Math.random() * 4), ns, es);
					} else {
						yTree(x, 1, 1 + Math.floor(Math.random() * 2), 1 + Math.floor(Math.random() * 2), ns, es, spread);
					}
				}
				break;
			}
		}
		if (variant === 'blue-red') {
			for (const e of es) e.color = Math.random() < 0.5 ? 'blue' : 'red';
			// guarantee both colors are present
			if (es.length >= 2) {
				if (!es.some(e => e.color === 'blue')) es[0].color = 'blue';
				if (!es.some(e => e.color === 'red'))  es[es.length > 1 ? 1 : 0].color = 'red';
			}
		}
		return { nodes: ns, edges: es };
	}

	// ── Actions ───────────────────────────────────────────────────────────────────

	function doRemove(edgeId: number) {
		edges = afterRemove(edges, edgeId, nodes);
		const next      = currentPlayer === 1 ? 2 : 1;
		const nextColor = next === 1 ? 'blue' : 'red';
		const nextHasMove = variant === 'blue-red'
			? edges.some(e => e.color === nextColor)
			: edges.length > 0;
		if (!nextHasMove) { winner = currentPlayer; phase = 'won'; }
		else currentPlayer = next;
	}

	function handleEdgeClick(edgeId: number) {
		if (phase !== 'playing' || isComputersTurn || thinking || previewEdge !== null) return;
		if (variant === 'blue-red') {
			const e = edges.find(e => e.id === edgeId);
			if (!e || e.color !== (currentPlayer === 1 ? 'blue' : 'red')) return;
		}
		previewEdge = edgeId;
		playerTimer = setTimeout(() => {
			previewEdge = null;
			playerTimer = null;
			doRemove(edgeId);
		}, 500);
	}

	function clearPlayerTimer() {
		if (playerTimer) { clearTimeout(playerTimer); playerTimer = null; }
		previewEdge = null;
	}

	function startGame() {
		clearPlayerTimer();
		const pos = buildPosition(posKey);
		initNodes = pos.nodes.map(n => ({ ...n }));
		initEdges = pos.edges.map(e => ({ ...e }));
		nodes = [...pos.nodes]; edges = [...pos.edges];
		currentPlayer = 1; winner = null; thinking = false;
		hoveredEdge = null; phase = 'playing';
	}

	function playAgain() {
		clearPlayerTimer();
		nodes = initNodes.map(n => ({ ...n }));
		edges = initEdges.map(e => ({ ...e }));
		currentPlayer = 1; winner = null; thinking = false;
		hoveredEdge = null; phase = 'playing';
	}

	// ── Computer turn ─────────────────────────────────────────────────────────────

	$effect(() => {
		if (!isComputersTurn) return;
		thinking = true;
		let t2: ReturnType<typeof setTimeout>;
		const t1 = setTimeout(() => {
			thinking     = false;
			const move   = getComputerMove(nodes, edges);
			previewEdge  = move.id;
			t2 = setTimeout(() => {
				previewEdge = null;
				doRemove(move.id);
			}, 700);
		}, 750);
		return () => { clearTimeout(t1); clearTimeout(t2); };
	});
</script>

<svelte:head>
	<title>Hackenbush — Math Games</title>
</svelte:head>

<div class="page">
	<a href="{base}/" class="back">← Back to games</a>
	<h1>Hackenbush</h1>
	<p class="desc">
		{#if variant === 'blue-red'}
			Blue removes blue edges, Red removes red edges. Edges that lose their connection
			to the ground vanish too. The player with no legal move loses.
		{:else}
			Take turns removing any edge from the graph. Edges that lose their connection
			to the ground vanish too. The player who makes the last move wins.
		{/if}
	</p>

	<details class="learn-details">
		<summary>Learn more</summary>
		<div class="learn-body">
			<h3>Hackenbush</h3>
			<p>
				<a href="https://en.wikipedia.org/wiki/Hackenbush" target="_blank" rel="noopener">Hackenbush</a>
				is a combinatorial game invented by John Conway. In the <em>Green</em> variant
				both players may remove any edge. In <em>Blue-Red</em>, Blue can only remove blue
				edges and Red can only remove red edges — the player with no legal move loses.
			</p>
			<h4>Nim-values and the Colon Principle</h4>
			<p>
				Each connected tree has a <em>nim-value</em>. A single edge (stalk) has nim-value 1;
				a stalk of <em>n</em> edges has nim-value <em>n</em>. For branching trees,
				the <strong>Colon Principle</strong> says: at any node, replace the branches above it
				with a single stalk whose length equals the XOR of the branches' nim-values.
				Repeat from the leaves downward to reduce the whole tree to a single nim-value.
			</p>
			<p>
				The game's overall nim-sum is the XOR of all components' nim-values.
				If it is 0 at the start of your turn you are in a losing position against perfect play.
			</p>
		</div>
	</details>

	<!-- ══ IDLE ══════════════════════════════════════════════════════════════════ -->
	{#if phase === 'idle'}
		<div class="settings">
			<div class="setting-row">
				<span class="setting-label">Variant</span>
				<div class="toggle-group">
					<button class="tog-btn" class:active={variant === 'green'} onclick={() => variant = 'green'}>Green</button>
					<button class="tog-btn" class:active={variant === 'blue-red'} onclick={() => variant = 'blue-red'}>Blue-Red</button>
				</div>
			</div>
			<div class="setting-row">
				<span class="setting-label">Position</span>
				<div class="toggle-group">
					{#each POSITIONS as p}
						<button class="tog-btn" class:active={posKey === p.key} onclick={() => posKey = p.key}>{p.label}</button>
					{/each}
				</div>
			</div>
			<div class="setting-row">
				<span class="setting-label">Play against</span>
				<div class="toggle-group">
					<button class="tog-btn" class:active={opponent === 'computer'} onclick={() => opponent = 'computer'}>Computer</button>
					<button class="tog-btn" class:active={opponent === 'human'}    onclick={() => opponent = 'human'}>Human</button>
				</div>
			</div>
			{#if opponent === 'computer'}
				<div class="setting-row indent">
					<span class="setting-label">Computer goes</span>
					<div class="toggle-group">
						<button class="tog-btn" class:active={compOrder === 'first'}  onclick={() => compOrder = 'first'}>First</button>
						<button class="tog-btn" class:active={compOrder === 'second'} onclick={() => compOrder = 'second'}>Second</button>
					</div>
				</div>
				<div class="setting-row indent">
					<span class="setting-label">Difficulty</span>
					<div class="toggle-group">
						<button class="tog-btn" class:active={difficulty === 'easy'}   onclick={() => difficulty = 'easy'}>Easy</button>
						<button class="tog-btn" class:active={difficulty === 'medium'} onclick={() => difficulty = 'medium'}>Medium</button>
						<button class="tog-btn" class:active={difficulty === 'hard'}   onclick={() => difficulty = 'hard'}>Hard</button>
					</div>
				</div>
			{/if}
		</div>
		<div class="center">
			<button class="btn large" onclick={startGame}>Start Game</button>
		</div>

	<!-- ══ PLAYING / WON ═════════════════════════════════════════════════════════ -->
	{:else}
		<!-- Status -->
		<div class="status" class:st-won={phase === 'won'}>
			{#if phase === 'won'}
				<div class="won-row">
					{#if opponent === 'computer'}
						{#if winner === computerPlayer}
							<span class="comp-badge">Computer</span><strong> wins!</strong>
						{:else}
							<span class="you-badge">You</span><strong> win!</strong>
						{/if}
					{:else}
						{#if variant === 'blue-red'}
							<span class="player-badge {winner === 1 ? 'br-p1' : 'br-p2'}">{winner === 1 ? 'Blue' : 'Red'}</span><strong> wins!</strong>
						{:else}
							<span class="player-badge p{winner}">Player {winner}</span><strong> wins!</strong>
						{/if}
					{/if}
				</div>
			{:else if thinking}
				<div class="turn-row">
					<span class="comp-badge">Computer</span>
					<span class="thinking-dots turn-hint">&nbsp;is thinking<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>
				</div>
			{:else}
				<div class="turn-row">
					{#if opponent === 'computer'}
						<span class="you-badge">Your</span>
						{#if variant === 'blue-red'}
							&nbsp;<span class="player-badge {currentPlayer === 1 ? 'br-p1' : 'br-p2'}">{currentPlayer === 1 ? 'Blue' : 'Red'}</span>
						{/if}
						<span class="turn-hint">&nbsp;turn — click {variant === 'blue-red' ? (currentPlayer === 1 ? 'a blue' : 'a red') : 'an'} edge to remove it</span>
					{:else}
						{#if variant === 'blue-red'}
							<span class="player-badge {currentPlayer === 1 ? 'br-p1' : 'br-p2'}">{currentPlayer === 1 ? 'Blue' : 'Red'}</span>
						{:else}
							<span class="player-badge p{currentPlayer}">Player {currentPlayer}</span>
						{/if}
						<span class="turn-hint">'s turn — click {variant === 'blue-red' ? (currentPlayer === 1 ? 'a blue' : 'a red') : 'an'} edge to remove it</span>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Nim-sum strip -->
		{#if variant === 'green'}
		<div class="nim-strip">
			<span class="nim-strip-lbl">Nim-sum</span>
			<div class="toggle-group">
				<button class="tog-btn sm" class:active={nimMode === 'off'}  onclick={() => nimMode = 'off'}>Off</button>
				<button class="tog-btn sm" class:active={nimMode === 'sum'}  onclick={() => nimMode = 'sum'}>Show</button>
				<button class="tog-btn sm" class:active={nimMode === 'full'} onclick={() => nimMode = 'full'}>+ hint</button>
			</div>
			{#if nimMode !== 'off'}
				<span class="nim-val" class:nim-zero={nimSum === 0 && phase !== 'won'}>{nimSum}</span>
				{#if nimMode === 'full' && phase !== 'won'}
					<span class="nim-hint">
						{nimSum === 0 ? 'losing' : 'winning'} for {opponent === 'computer'
							? (currentPlayer === computerPlayer ? 'computer' : 'you')
							: `Player ${currentPlayer}`}
					</span>
				{/if}
			{/if}
		</div>
		{/if}

		<!-- Board -->
		<div class="board-wrap">
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<svg
				viewBox="0 0 {SVG_W} {SVG_H}"
				class="board"
				role="img"
				aria-label="Hackenbush graph"
				onmouseleave={() => { hoveredEdge = null; }}
			>
				<defs>
					<pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
						<line x1="0" y1="0" x2="0" y2="8" stroke="#374151" stroke-width="2"/>
					</pattern>
				</defs>
				<!-- Ground -->
				<rect x="10" y={GROUND_Y} width={SVG_W - 20} height={SVG_H - GROUND_Y} fill="url(#hatch)" opacity="0.35"/>
				<line x1="10" y1={GROUND_Y} x2={SVG_W - 10} y2={GROUND_Y} stroke="#6b7280" stroke-width="3" stroke-linecap="round"/>

				<!-- Edges -->
				{#each edges as e (e.id)}
					{@const nu = nodes.find(n => n.id === e.u)!}
					{@const nv = nodes.find(n => n.id === e.v)!}
					{@const isPreviewing = previewEdge === e.id}
					{@const isHovered    = hoveredEdge === e.id && !isPreviewing && previewEdge === null}
					{@const myColor      = currentPlayer === 1 ? 'blue' : 'red'}
					{@const canClick     = phase === 'playing' && !isComputersTurn && !thinking && previewEdge === null
						&& (variant === 'green' || e.color === myColor)}
					<!-- Wide invisible hit area -->
					<line
						x1={nu.x} y1={nu.y} x2={nv.x} y2={nv.y}
						stroke="transparent" stroke-width="18"
						style="cursor:{canClick ? 'pointer' : 'default'}"
						onclick={() => handleEdgeClick(e.id)}
						onmouseenter={() => { if (canClick) hoveredEdge = e.id; }}
						onmouseleave={() => { hoveredEdge = null; }}
					/>
					<!-- Visible edge -->
					<line
						x1={nu.x} y1={nu.y} x2={nv.x} y2={nv.y}
						class="hedge"
						class:hedge-blue={e.color === 'blue'}
						class:hedge-red={e.color === 'red'}
						class:hedge-dim={variant === 'blue-red' && !canClick && !isPreviewing && phase === 'playing' && !thinking}
						class:hedge-hover={isHovered}
						class:hedge-preview={isPreviewing}
						style="pointer-events:none"
					/>
				{/each}

				<!-- Non-ground nodes still attached to an edge -->
				{#each nodes.filter(n => !n.ground && edges.some(e => e.u === n.id || e.v === n.id)) as n (n.id)}
					<circle cx={n.x} cy={n.y} r="5" class="hnode"/>
				{/each}
			</svg>
		</div>

		<!-- Actions -->
		<div class="actions">
			<button class="btn btn-ghost" onclick={playAgain}>Play Again</button>
			<button class="btn btn-ghost" onclick={() => { clearPlayerTimer(); phase = 'idle'; }}>New Game</button>
		</div>
	{/if}
</div>

<style>
	.page { max-width: 520px; margin: 0 auto; }

	.back { display: inline-block; margin-bottom: 1.5rem; color: var(--color-text-muted); font-size: 0.9rem; }

	h1 { font-size: 2rem; font-weight: 800; margin-bottom: 0.4rem; }

	.desc { color: var(--color-text-muted); font-size: 0.9rem; margin-bottom: 1rem; line-height: 1.55; }

	/* ── Settings ── */
	.settings {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 1rem 1.25rem;
		margin-bottom: 1.75rem;
		display: flex; flex-direction: column; gap: 0.75rem;
	}
	.setting-row { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
	.setting-row.indent { padding-left: 1rem; border-left: 2px solid var(--color-border); }
	.setting-label { font-size: 0.82rem; font-weight: 600; color: var(--color-text-muted); min-width: 6.5rem; }
	.toggle-group { display: flex; gap: 0.35rem; flex-wrap: wrap; }

	.tog-btn {
		padding: 0.3rem 0.75rem;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text-muted);
		font-size: 0.85rem; font-weight: 600;
		transition: background 0.15s, border-color 0.15s, color 0.15s;
	}
	.tog-btn:hover:not(.active) { border-color: var(--color-accent); color: var(--color-text); }
	.tog-btn.active { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }
	.tog-btn.sm { padding: 0.2rem 0.55rem; font-size: 0.78rem; }

	.center { display: flex; justify-content: center; }

	/* ── Buttons ── */
	.btn {
		padding: 0.7rem 1.4rem; background: var(--color-accent); color: #fff;
		border: none; border-radius: var(--radius); font-size: 1rem; font-weight: 600;
		transition: background 0.2s;
	}
	.btn:hover { background: var(--color-accent-hover); }
	.btn.large { padding: 0.9rem 2rem; font-size: 1.05rem; }
	.btn-ghost { background: var(--color-surface-2); color: var(--color-text); border: 1px solid var(--color-border); }
	.btn-ghost:hover { background: var(--color-surface); border-color: var(--color-accent); }

	/* ── Status ── */
	.status {
		background: var(--color-surface); border: 1px solid var(--color-border);
		border-radius: var(--radius); padding: 0.75rem 1rem; margin-bottom: 0.5rem;
		transition: border-color 0.2s;
	}
	.status.st-won { border-color: #d4b44a55; }

	.player-badge { display: inline-block; padding: 0.1rem 0.55rem; border-radius: 99px; font-size: 0.8rem; font-weight: 700; }
	.player-badge.p1    { background: #6c8bef22; color: #6c8bef; border: 1px solid #6c8bef44; }
	.player-badge.p2    { background: #fb923c22; color: #fb923c; border: 1px solid #fb923c44; }
	.player-badge.br-p1 { background: #3b82f622; color: #3b82f6; border: 1px solid #3b82f644; }
	.player-badge.br-p2 { background: #ef444422; color: #ef4444; border: 1px solid #ef444444; }
	.you-badge  { display: inline-block; padding: 0.1rem 0.55rem; border-radius: 99px; font-size: 0.8rem; font-weight: 700; background: #6c8bef22; color: #6c8bef; border: 1px solid #6c8bef44; }
	.comp-badge { display: inline-block; padding: 0.1rem 0.55rem; border-radius: 99px; font-size: 0.8rem; font-weight: 700; background: #a855f722; color: #a855f7; border: 1px solid #a855f744; }

	.won-row  { display: flex; align-items: center; gap: 0.25rem; flex-wrap: wrap; font-size: 0.95rem; }
	.turn-row { display: flex; align-items: center; flex-wrap: wrap; }
	.turn-hint { font-size: 0.82rem; color: var(--color-text-muted); }

	@keyframes blink {
		0%, 100% { opacity: 0.2; }
		50%       { opacity: 1;   }
	}
	.thinking-dots .dot { animation: blink 1.2s infinite; }
	.thinking-dots .dot:nth-child(2) { animation-delay: 0.2s; }
	.thinking-dots .dot:nth-child(3) { animation-delay: 0.4s; }

	/* ── Nim-sum strip ── */
	.nim-strip { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem; padding: 0 0.1rem; }
	.nim-strip-lbl { font-size: 0.78rem; font-weight: 600; color: var(--color-text-muted); }
	.nim-val { font-size: 0.82rem; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--color-text); min-width: 1.5ch; }
	.nim-val.nim-zero { color: #f87171; }
	.nim-hint { font-size: 0.78rem; color: var(--color-text-muted); font-style: italic; }

	/* ── Board ── */
	.board-wrap {
		background: var(--color-surface); border: 1px solid var(--color-border);
		border-radius: var(--radius); padding: 0.4rem; margin-bottom: 1rem;
	}
	.board { width: 100%; height: auto; display: block; }

	/* ── SVG elements ── */
	.hedge {
		stroke: #4ade80; stroke-width: 3; stroke-linecap: round;
	}
	.hedge.hedge-blue { stroke: #60a5fa; }
	.hedge.hedge-red  { stroke: #f87171; }
	.hedge.hedge-dim  { opacity: 0.3; }
	.hedge.hedge-hover    { stroke: #fbbf24; stroke-width: 4; }

	@keyframes pulse-hedge {
		0%, 100% { stroke: #f87171; stroke-width: 3.5; }
		50%       { stroke: #fca5a5; stroke-width: 5.5; }
	}
	.hedge.hedge-preview { animation: pulse-hedge 0.4s ease-in-out infinite; }

	.hnode { fill: #4ade80; stroke: #14532d; stroke-width: 1.5; }

	/* ── Actions ── */
	.actions { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
</style>
