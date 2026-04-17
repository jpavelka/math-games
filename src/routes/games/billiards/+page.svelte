<script lang="ts">
	import { base } from '$app/paths';
	import {
		generateGame,
		type Corner, type Difficulty, type GameState,
	} from '$lib/billiards';

	const DIFF: { value: Difficulty; label: string }[] = [
		{ value: 'easy',   label: 'Easy'   },
		{ value: 'medium', label: 'Medium' },
		{ value: 'hard',   label: 'Hard'   },
	];

	let difficulty = $state<Difficulty>('medium');

	type Phase = 'idle' | 'predicting' | 'revealed';
	let phase  = $state<Phase>('idle');
	let game   = $state<GameState | null>(null);
	let guess  = $state<Corner | null>(null);
	let streak    = $state(0);
	let learnOpen = $state(false);

	// Animation state
	let animating = $state(false);
	let ballX     = $state(0);
	let ballY     = $state(0);
	let trailStr  = $state('');
	let animRafId: number | null = null;

	// SVG layout
	const SVG_W = 460, SVG_H = 340;
	const MAX_TW = 360, MAX_TH = 250;
	const POCKET_R = 13;

	// Table rect — aspect-preserving
	const tw = $derived(!game ? MAX_TW : Math.min(MAX_TW, MAX_TH * game.M / game.N));
	const th = $derived(!game ? MAX_TH : Math.min(MAX_TH, MAX_TW * game.N / game.M));
	const tx = $derived((SVG_W - tw) / 2);
	const ty = $derived((SVG_H - th) / 2);

	// Precomputed SVG polyline string
	const pathStr = $derived(!game ? '' :
		game.path.map(([x, y]) =>
			`${tx + (x / game!.M) * tw},${ty + (1 - y / game!.N) * th}`
		).join(' ')
	);

	const CORNERS: Corner[] = ['BL', 'BR', 'TL', 'TR'];
	const PLAYABLE = new Set<Corner>(['BR', 'TL', 'TR']);

	const ARROW: Record<Corner, string> = { BL: '●', BR: '↘', TL: '↖', TR: '↗' };
	const LABEL: Record<Corner, string> = {
		BL: 'Start', BR: 'Bottom-right', TL: 'Top-left', TR: 'Top-right',
	};

	function cornerPos(c: Corner): [number, number] {
		if (c === 'BL') return [tx,      ty + th];
		if (c === 'BR') return [tx + tw, ty + th];
		if (c === 'TL') return [tx,      ty     ];
		return                 [tx + tw, ty     ];
	}

	const isCorrect = $derived(guess !== null && game !== null && guess === game.answer);

	// Math explanation
	const nx = $derived(game ? game.N / game.gcdVal : 0); // N/GCD
	const ny = $derived(game ? game.M / game.gcdVal : 0); // M/GCD

	function stopAnim() {
		if (animRafId !== null) { cancelAnimationFrame(animRafId); animRafId = null; }
		animating = false;
	}

	function startAnim() {
		if (!game) return;
		stopAnim();

		// Snapshot SVG points (tx/ty/tw/th are stable — game hasn't changed)
		const pts = game.path.map(([x, y]): [number, number] => [
			tx + (x / game!.M) * tw,
			ty + (1 - y / game!.N) * th,
		]);

		const segCount = pts.length - 1;
		// ~160ms per segment, capped at 2s total so long paths stay snappy
		const segMs = Math.min(160, 2000 / segCount);
		const total = segCount * segMs;

		animating = true;
		ballX = pts[0][0];
		ballY = pts[0][1];
		trailStr = `${pts[0][0]},${pts[0][1]}`;
		let t0: number | null = null;

		function tick(now: number) {
			if (t0 === null) t0 = now;
			const elapsed = Math.min(now - t0, total);
			const progress = elapsed / segMs;          // fractional segment index
			const segI = Math.min(Math.floor(progress), segCount - 1);
			const segT = progress - segI;

			const from = pts[segI];
			const to   = pts[Math.min(segI + 1, segCount)];
			ballX = from[0] + (to[0] - from[0]) * segT;
			ballY = from[1] + (to[1] - from[1]) * segT;
			trailStr = pts.slice(0, segI + 1).map(p => `${p[0]},${p[1]}`).join(' ') + ` ${ballX},${ballY}`;

			if (elapsed < total) {
				animRafId = requestAnimationFrame(tick);
			} else {
				const last = pts[pts.length - 1];
				ballX = last[0]; ballY = last[1];
				trailStr = pts.map(p => `${p[0]},${p[1]}`).join(' ');
				animating = false;
				animRafId = null;
			}
		}
		animRafId = requestAnimationFrame(tick);
	}

	function startGame() {
		stopAnim();
		game   = generateGame(difficulty);
		guess  = null;
		phase  = 'predicting';
	}

	function makeGuess(c: Corner) {
		if (phase !== 'predicting' || !game) return;
		guess = c;
		streak = c === game.answer ? streak + 1 : 0;
		phase = 'revealed';
		startAnim();
	}

	function nextGame() {
		stopAnim();
		game  = generateGame(difficulty);
		guess = null;
		phase = 'predicting';
	}
</script>

<svelte:head>
	<title>Billiard Bounce — Math Games</title>
</svelte:head>

<div class="page">
	<a href="{base}/" class="back">← Back to games</a>
	<h1>Billiard Bounce</h1>
	<p class="desc">
		A ball shoots from the bottom-left pocket at 45°. Click the pocket where it
		ends up. The answer depends on the table's GCD — a hidden connection between
		geometry and number theory.
	</p>

	<button class="learn-btn" onclick={() => learnOpen = !learnOpen} aria-expanded={learnOpen}>
		{learnOpen ? '▲ Hide' : '▼ Learn more'}
	</button>

	{#if learnOpen}
		<div class="learn-panel">
			<h3>The mathematics of billiard paths</h3>

			<p>
				Billiard ball trajectories on rectangular tables connect geometry to
				number theory through the
				<a href="https://en.wikipedia.org/wiki/Greatest_common_divisor" target="_blank" rel="noopener">greatest common divisor</a>.
			</p>

			<h4>The unfolding trick</h4>
			<p>
				Instead of reflecting the ball off walls, imagine <em>unfolding</em>
				the table: tile the plane with mirror-image copies and draw a straight
				diagonal line through them. The ball reaches a corner of the original
				table exactly when this line hits a lattice point of the form
				(k·M, l·N). The first such point is (LCM(M,N), LCM(M,N)), because
				LCM is the smallest number divisible by both M and N.
				See: <a href="https://en.wikipedia.org/wiki/Dynamical_billiards" target="_blank" rel="noopener">Dynamical billiards</a>.
			</p>

			<h4>Why GCD determines the destination</h4>
			<p>
				The ball traverses N/GCD column-widths and M/GCD row-heights.
				Because N/GCD and M/GCD are always
				<a href="https://en.wikipedia.org/wiki/Coprime_integers" target="_blank" rel="noopener">coprime</a>
				(they share no common factor), they can never both be even — so the
				ball can never return to its starting corner. The parity of each ratio
				tells you which side the ball lands on:
				odd → far side, even → same side it started.
			</p>

			<h4>Bounce count</h4>
			<p>
				Total bounces = (M + N) / GCD − 2. This counts every wall reflection,
				subtracting the two "touches" that are actually corner pockets. The
				<a href="https://en.wikipedia.org/wiki/Euclidean_algorithm" target="_blank" rel="noopener">Euclidean algorithm</a>
				computes GCD in O(log min(M, N)) steps using the same remainder
				structure that governs the ball's path.
			</p>
		</div>
	{/if}

	<!-- ══ IDLE ══════════════════════════════════════════════════════════════════ -->
	{#if phase === 'idle'}
		<div class="settings">
			<div class="setting-row">
				<span class="setting-label">Difficulty</span>
				<div class="toggle-group">
					{#each DIFF as opt}
						<button
							class="tog-btn"
							class:active={difficulty === opt.value}
							onclick={() => difficulty = opt.value}
						>{opt.label}</button>
					{/each}
				</div>
			</div>
		</div>
		<div class="center">
			<button class="btn large" onclick={startGame}>Break!</button>
		</div>

	<!-- ══ PLAYING ════════════════════════════════════════════════════════════════ -->
	{:else if game}
		<!-- Status bar -->
		<div class="status"
			class:st-correct={phase === 'revealed' && isCorrect}
			class:st-wrong={phase === 'revealed' && !isCorrect}
		>
			<div class="st-left">
				<span class="st-dim">Table</span>
				<span class="st-val">{game.M} × {game.N}</span>
				{#if streak > 1}<span class="st-streak">{streak} in a row</span>{/if}
			</div>
			<div class="st-right">
				{#if phase === 'predicting'}
					<span class="st-hint">Click a pocket to predict</span>
				{:else if isCorrect}
					<span class="st-result st-ok">✓ {game.bounces} bounce{game.bounces !== 1 ? 's' : ''}</span>
				{:else}
					<span class="st-result st-err">✗ It was {LABEL[game.answer]}</span>
				{/if}
			</div>
		</div>

		<!-- SVG billiard table -->
		<div class="canvas-wrap">
			<svg viewBox="0 0 {SVG_W} {SVG_H}" width="100%" aria-label="Billiard table {game.M} by {game.N}">
				<!-- Cushion -->
				<rect x={tx - 10} y={ty - 10} width={tw + 20} height={th + 20} rx="5" class="cushion" />
				<!-- Felt -->
				<rect x={tx} y={ty} width={tw} height={th} class="felt" />

				<!-- Progressive trail during animation -->
				{#if animating}
					<polyline points={trailStr} class="ball-path" />
					<circle cx={ballX} cy={ballY} r={6} class="ball-anim" />
				{:else if phase === 'revealed'}
					<!-- Full static path once animation completes -->
					<polyline points={pathStr} class="ball-path" />
				{/if}

				<!-- Ball at start (predicting phase only) -->
				{#if phase === 'predicting'}
					<circle cx={tx} cy={ty + th} r={5} class="ball-dot" />
				{/if}

				<!-- Dimension labels -->
				<text x={tx + tw / 2} y={ty + th + 28} text-anchor="middle" class="dim-lbl">{game.M}</text>
				<text x={tx - 24} y={ty + th / 2} text-anchor="middle" dominant-baseline="central" class="dim-lbl">{game.N}</text>

				<!-- Pockets -->
				{#each CORNERS as c}
					{@const [cx, cy] = cornerPos(c)}
					{@const playable = PLAYABLE.has(c) && phase === 'predicting'}
					{@const isAns   = game.answer === c}
					{@const isGuess = guess === c}

					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_interactive_supports_focus -->
					<g
						transform="translate({cx},{cy})"
						class="pocket"
						class:pocket-play={playable}
						class:pocket-correct={phase === 'revealed' && isAns}
						class:pocket-wrong={phase === 'revealed' && isGuess && !isAns}
						class:pocket-start={c === 'BL'}
						role={playable ? 'button' : undefined}
						aria-label={LABEL[c]}
						onclick={() => playable && makeGuess(c)}
					>
						<circle r={24} fill="transparent" />
						<circle r={POCKET_R} class="pocket-hole" />
						<text text-anchor="middle" dominant-baseline="central" class="pocket-icon">
							{#if phase === 'revealed' && isAns}✓{:else if phase === 'revealed' && isGuess && !isAns}✗{:else}{ARROW[c]}{/if}
						</text>
					</g>
				{/each}
			</svg>
		</div>

		<!-- Math explanation (shown after animation) -->
		{#if phase === 'revealed' && !animating}
			<div class="math-panel">
				<div class="math-row">
					<span class="mkey">GCD({game.M}, {game.N})</span>
					<span class="meq">= {game.gcdVal}</span>
				</div>
				<div class="math-row">
					<span class="mkey">N / GCD = {game.N} / {game.gcdVal} = {nx}</span>
					<span class="meq">{nx % 2 === 1 ? 'odd → right side' : 'even → left side'}</span>
				</div>
				<div class="math-row">
					<span class="mkey">M / GCD = {game.M} / {game.gcdVal} = {ny}</span>
					<span class="meq">{ny % 2 === 1 ? 'odd → top' : 'even → bottom'}</span>
				</div>
				<div class="math-row math-row-bounces">
					<span class="mkey">Bounces = (M+N) / GCD − 2</span>
					<span class="meq">= ({game.M}+{game.N}) / {game.gcdVal} − 2 = <strong>{game.bounces}</strong></span>
				</div>
			</div>
		{/if}

		<!-- Actions -->
		<div class="actions">
			<button class="btn btn-ghost" onclick={() => { stopAnim(); phase = 'idle'; }}>Settings</button>
			{#if animating}
				<button class="btn btn-ghost" onclick={stopAnim}>Skip</button>
			{:else if phase === 'revealed'}
				<button class="btn" onclick={nextGame}>Next Table</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.page { max-width: 520px; margin: 0 auto; }

	.back {
		display: inline-block;
		margin-bottom: 1.5rem;
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}

	h1 { font-size: 2rem; font-weight: 800; margin-bottom: 0.4rem; }

	/* ── Learn more ── */
	.learn-btn {
		background: none;
		border: none;
		padding: 0;
		margin-bottom: 1rem;
		color: var(--color-text-muted);
		font-size: 0.82rem;
		cursor: pointer;
		transition: color 0.15s;
	}
	.learn-btn:hover { color: var(--color-text); }

	.learn-panel {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-left: 3px solid var(--color-accent);
		border-radius: var(--radius);
		padding: 1rem 1.25rem;
		margin-bottom: 1.5rem;
		font-size: 0.88rem;
		line-height: 1.65;
		color: var(--color-text-muted);
	}

	.learn-panel h3 {
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--color-text);
		margin: 0 0 0.6rem;
	}

	.learn-panel h4 {
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--color-text);
		margin: 0.9rem 0 0.25rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.learn-panel p { margin: 0 0 0.4rem; }

	.learn-panel a {
		color: var(--color-accent);
		text-decoration: underline;
	}
	.learn-panel a:hover { opacity: 0.8; }

	/* ── Settings ── */
	.settings {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 1rem 1.25rem;
		margin-bottom: 1.75rem;
	}

	.setting-row { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }

	.setting-label {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--color-text-muted);
		min-width: 5rem;
	}

	.toggle-group { display: flex; gap: 0.35rem; }

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

	/* ── Status ── */
	.status {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 0.6rem 1rem;
		margin-bottom: 0.75rem;
		transition: border-color 0.2s;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.status.st-correct { border-color: #d4b44a66; }
	.status.st-wrong   { border-color: #e05555aa; }

	.st-left  { display: flex; align-items: baseline; gap: 0.4rem; }
	.st-right { font-size: 0.85rem; }

	.st-dim  { font-size: 0.78rem; color: var(--color-text-muted); }
	.st-val  { font-weight: 700; font-size: 1rem; }

	.st-streak {
		font-size: 0.75rem;
		background: #d4b44a22;
		border: 1px solid #d4b44a55;
		border-radius: 12px;
		padding: 1px 7px;
		color: #d4b44a;
	}

	.st-hint   { color: var(--color-text-muted); }
	.st-result { font-weight: 600; }
	.st-ok     { color: #d4b44a; }
	.st-err    { color: #e05555; }

	/* ── Canvas ── */
	.canvas-wrap {
		background: #0c1a0e;
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		overflow: hidden;
		margin-bottom: 1rem;
		user-select: none;
	}

	/* SVG elements */
	:global(.cushion) {
		fill: #3a2a18;
	}

	:global(.felt) {
		fill: #0f3018;
	}

	:global(.ball-path) {
		fill: none;
		stroke: #f0e06a;
		stroke-width: 1.5;
		stroke-linejoin: round;
		pointer-events: none;
	}

	:global(.ball-dot) {
		fill: #f0e06a;
		pointer-events: none;
	}

	:global(.ball-anim) {
		fill: #f5f2e0;
		stroke: #f0e06a;
		stroke-width: 1.5;
		pointer-events: none;
	}

	:global(.dim-lbl) {
		font-size: 13px;
		font-weight: 700;
		fill: #5a7a60;
		font-family: inherit;
	}

	/* Pockets */
	:global(.pocket) { cursor: default; }

	:global(.pocket-hole) {
		fill: #060e07;
		transition: fill 0.15s;
	}

	:global(.pocket-icon) {
		font-size: 10px;
		font-weight: 700;
		fill: #3a5040;
		pointer-events: none;
		font-family: inherit;
	}

	:global(.pocket-start .pocket-icon) {
		fill: #f0e06a99;
		font-size: 8px;
	}

	/* Playable pocket */
	:global(.pocket-play) { cursor: pointer; }

	:global(.pocket-play .pocket-hole) {
		fill: #0c2018;
		stroke: #3a6a48;
		stroke-width: 1.5;
	}

	:global(.pocket-play .pocket-icon) {
		fill: #4a9060;
		font-size: 11px;
	}

	:global(.pocket-play:hover .pocket-hole) {
		fill: #122a1e;
		stroke: #6aaa88;
	}

	:global(.pocket-play:hover .pocket-icon) {
		fill: #8adaaa;
	}

	/* Correct pocket */
	:global(.pocket-correct .pocket-hole) {
		fill: #2a1e00;
		stroke: #d4b44a;
		stroke-width: 2;
	}

	:global(.pocket-correct .pocket-icon) {
		fill: #d4b44a;
		font-size: 12px;
	}

	/* Wrong guess */
	:global(.pocket-wrong .pocket-hole) {
		fill: #1a0808;
		stroke: #e05555;
		stroke-width: 2;
	}

	:global(.pocket-wrong .pocket-icon) {
		fill: #e05555;
		font-size: 12px;
	}

	/* ── Math panel ── */
	.math-panel {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 0.85rem 1.1rem;
		margin-bottom: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.math-row {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		font-size: 0.82rem;
		flex-wrap: wrap;
	}

	.mkey {
		color: var(--color-text-muted);
		font-variant-numeric: tabular-nums;
	}

	.meq {
		color: var(--color-text);
		font-variant-numeric: tabular-nums;
	}

	.math-row-bounces {
		border-top: 1px solid var(--color-border);
		padding-top: 0.35rem;
		margin-top: 0.1rem;
	}

	.math-row-bounces .meq { color: #d4b44a; }

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

	.btn:hover { background: var(--color-accent-hover); }
	.btn.large { padding: 0.9rem 2rem; font-size: 1.05rem; }

	.btn-ghost {
		background: var(--color-surface-2);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}

	.btn-ghost:hover { background: var(--color-surface); border-color: var(--color-accent); }
</style>
