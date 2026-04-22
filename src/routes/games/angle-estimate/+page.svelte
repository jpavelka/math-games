<script lang="ts">
	import { base } from '$app/paths';

	type Difficulty = 'easy' | 'medium' | 'hard';

	const DIFF: { value: Difficulty; label: string; hint: string }[] = [
		{ value: 'easy',   label: 'Easy',   hint: 'multiples of 15°' },
		{ value: 'medium', label: 'Medium', hint: 'multiples of 5°'  },
		{ value: 'hard',   label: 'Hard',   hint: 'any whole degree' },
	];

	let difficulty   = $state<Difficulty>('medium');
	type Phase = 'idle' | 'guessing' | 'revealed';
	let phase        = $state<Phase>('idle');
	let targetAngle  = $state(0);
	let rotation     = $state(0);
	let guess        = $state('');
	let streak       = $state(0);
	let roundsPlayed = $state(0);
	let inputEl      = $state<HTMLInputElement | null>(null);

	// ── SVG layout ───────────────────────────────────────────────────────────────
	const SVG_W = 400, SVG_H = 280;
	const CX = SVG_W / 2, CY = SVG_H / 2 + 10;
	const RAY_LEN = 130;
	const ARC_R   = 52;

	const toRad = (d: number) => d * Math.PI / 180;

	const ray1x = $derived(CX + RAY_LEN * Math.cos(toRad(rotation)));
	const ray1y = $derived(CY - RAY_LEN * Math.sin(toRad(rotation)));
	const ray2x = $derived(CX + RAY_LEN * Math.cos(toRad(rotation + targetAngle)));
	const ray2y = $derived(CY - RAY_LEN * Math.sin(toRad(rotation + targetAngle)));

	function arcPolyline(startDeg: number, spanDeg: number, r: number): string {
		const n = Math.max(20, Math.round(spanDeg));
		const pts: string[] = [];
		for (let i = 0; i <= n; i++) {
			const a = toRad(startDeg + (i / n) * spanDeg);
			pts.push(`${(CX + r * Math.cos(a)).toFixed(2)},${(CY - r * Math.sin(a)).toFixed(2)}`);
		}
		return pts.join(' ');
	}

	const arcPts = $derived(arcPolyline(rotation, targetAngle, ARC_R));

	// ── Post-reveal derived values ───────────────────────────────────────────────
	const guessNum = $derived(parseInt(guess) || 0);
	const error    = $derived(phase === 'revealed' ? Math.abs(guessNum - targetAngle) : 0);
	const points   = $derived(phase === 'revealed' ? Math.max(0, 100 - 2 * error)    : 0);

	const arcColor = $derived(
		phase !== 'revealed' ? 'var(--color-accent)' :
		error <= 3  ? '#4ade80' :
		error <= 10 ? '#d4b44a' :
		error <= 20 ? '#f97316' :
		'#e05555'
	);

	// ── Game logic ───────────────────────────────────────────────────────────────
	function generateAngle(): number {
		if (difficulty === 'easy') {
			const opts = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165];
			return opts[Math.floor(Math.random() * opts.length)];
		}
		if (difficulty === 'medium') {
			return (Math.floor(Math.random() * 33) + 2) * 5; // 10–170 step 5
		}
		return Math.floor(Math.random() * 161) + 10; // 10–170
	}

	function newAngle() {
		targetAngle = generateAngle();
		rotation    = Math.floor(Math.random() * 360);
		guess       = '';
		phase       = 'guessing';
		setTimeout(() => inputEl?.focus(), 50);
	}

	function submit() {
		if (phase !== 'guessing') return;
		const g = parseInt(guess);
		if (isNaN(g) || g < 1 || g > 179) return;

		const err = Math.abs(g - targetAngle);
		roundsPlayed += 1;
		streak = err <= 5 ? streak + 1 : 0;
		phase = 'revealed';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') submit();
	}
</script>

<svelte:head>
	<title>Angle Estimation — Math Games</title>
</svelte:head>

<div class="page">
	<a href="{base}/" class="back">← Back to games</a>
	<h1>Angle Estimation</h1>
	<p class="desc">
		How many degrees is the angle? No protractor — just your eyes.
	</p>

	<details class="learn-details">
		<summary>Learn more</summary>
		<div class="learn-body">
			<h3>Estimating angles</h3>
			<p>
				Developing intuition for angle sizes is a core geometry skill.
				A few anchors help: 90° is a right angle, 60° is an equilateral triangle's corner,
				45° is exactly halfway between horizontal and vertical.
			</p>
			<h4>Strategies</h4>
			<p>
				Start by anchoring to 90°: is the angle larger or smaller? Then halve again
				toward 45° or 135°. With practice you'll recognise common angles (30°, 60°, 120°)
				on sight, just like a musician recognises intervals by ear.
			</p>
		</div>
	</details>

	{#if phase === 'idle'}
		<!-- ── Settings ── -->
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
			<p class="diff-hint">
				{DIFF.find(d => d.value === difficulty)?.hint}
			</p>
		</div>
		<div class="center">
			<button class="btn large" onclick={newAngle}>Start</button>
		</div>

	{:else}
		<!-- ── Status bar ── -->
		<div class="status">
			<div class="st-left">
				{#if roundsPlayed > 0}
					<span class="st-dim">Round</span>
					<span class="st-val">{roundsPlayed + (phase === 'guessing' ? 1 : 0)}</span>
				{/if}
				{#if streak >= 2}
					<span class="st-streak">{streak} in a row</span>
				{/if}
			</div>
			<div class="st-right">
				{#if phase === 'guessing'}
					<span class="st-hint">Enter your guess below</span>
				{/if}
			</div>
		</div>

		<!-- ── Angle diagram ── -->
		<div class="canvas-wrap">
			<svg viewBox="0 0 {SVG_W} {SVG_H}" width="100%" aria-label="Angle diagram">
				<!-- Background -->
				<rect width={SVG_W} height={SVG_H} fill="#11131e" />

				<!-- Rays -->
				<line x1={CX} y1={CY} x2={ray1x} y2={ray1y}
					stroke="#e8eaf0" stroke-width="2" stroke-linecap="round" />
				<line x1={CX} y1={CY} x2={ray2x} y2={ray2y}
					stroke="#e8eaf0" stroke-width="2" stroke-linecap="round" />

				<!-- Arc -->
				<polyline points={arcPts}
					fill="none" stroke={arcColor} stroke-width="2.5"
					stroke-linecap="round" stroke-linejoin="round"
					pointer-events="none"
				/>

				<!-- Vertex dot -->
				<circle cx={CX} cy={CY} r="4" fill="#e8eaf0" />

				<!-- Revealed: angle label near arc midpoint -->
				{#if phase === 'revealed'}
					{@const midRad = toRad(rotation + targetAngle / 2)}
					{@const lx = CX + (ARC_R + 18) * Math.cos(midRad)}
					{@const ly = CY - (ARC_R + 18) * Math.sin(midRad)}
					<text x={lx} y={ly} text-anchor="middle" dominant-baseline="central"
						class="angle-label" style="fill:{arcColor}">{targetAngle}°</text>
				{/if}
			</svg>
		</div>

		<!-- ── Input ── -->
		{#if phase === 'guessing'}
			<div class="guess-row">
				<input
					bind:this={inputEl}
					class="guess-input"
					type="number"
					min="1"
					max="179"
					step="1"
					placeholder="degrees"
					bind:value={guess}
					onkeydown={handleKeydown}
				/>
				<span class="degree-sym">°</span>
				<button class="btn" onclick={submit} disabled={!guess}>Check</button>
			</div>

		<!-- ── Result ── -->
		{:else}
			<div class="result-panel" style="--rc: {arcColor}">
				<div class="result-main">
					<span class="result-answer">{targetAngle}°</span>
					<span class="result-sep">·</span>
					<span class="result-guess">you said {guessNum}°</span>
				</div>
				<div class="result-detail">
					{#if error === 0}
						<span class="result-perfect">Perfect!</span>
					{:else}
						<span class="result-error">off by {error}°</span>
					{/if}
					<span class="result-points">{points} pts</span>
				</div>
			</div>
		{/if}

		<!-- ── Actions ── -->
		<div class="actions">
			<button class="btn btn-ghost" onclick={() => phase = 'idle'}>Settings</button>
			{#if phase === 'revealed'}
				<button class="btn" onclick={newAngle}>Next Angle</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.page { max-width: 480px; margin: 0 auto; }

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

	.diff-hint {
		font-size: 0.78rem;
		color: var(--color-text-muted);
		margin-top: 0.6rem;
		margin-bottom: 0;
	}

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
		min-height: 2.5rem;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.st-left  { display: flex; align-items: baseline; gap: 0.5rem; }
	.st-dim   { font-size: 0.78rem; color: var(--color-text-muted); }
	.st-val   { font-weight: 700; }
	.st-hint  { font-size: 0.85rem; color: var(--color-text-muted); }

	.st-streak {
		font-size: 0.75rem;
		background: #d4b44a22;
		border: 1px solid #d4b44a55;
		border-radius: 12px;
		padding: 1px 7px;
		color: #d4b44a;
	}

	/* ── Canvas ── */
	.canvas-wrap {
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		overflow: hidden;
		margin-bottom: 1rem;
		user-select: none;
	}

	:global(.angle-label) {
		font-size: 15px;
		font-weight: 700;
		font-family: inherit;
	}

	/* ── Guess input ── */
	.guess-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.guess-input {
		width: 7rem;
		padding: 0.65rem 0.85rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		color: var(--color-text);
		font-size: 1.2rem;
		font-weight: 700;
		font-family: inherit;
		text-align: center;
		transition: border-color 0.15s;
	}
	.guess-input:focus { outline: none; border-color: var(--color-accent); }
	.guess-input::-webkit-inner-spin-button,
	.guess-input::-webkit-outer-spin-button { -webkit-appearance: none; }

	.degree-sym {
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--color-text-muted);
		margin-left: -0.25rem;
	}

	/* ── Result panel ── */
	.result-panel {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-left: 3px solid var(--rc, var(--color-accent));
		border-radius: var(--radius);
		padding: 0.85rem 1.1rem;
		margin-bottom: 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.result-main {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.result-answer {
		font-size: 1.6rem;
		font-weight: 800;
		color: var(--rc, var(--color-text));
	}

	.result-sep { color: var(--color-text-muted); font-size: 1.2rem; }

	.result-guess {
		font-size: 0.95rem;
		color: var(--color-text-muted);
	}

	.result-detail {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
	}

	.result-perfect {
		font-weight: 700;
		color: #4ade80;
	}

	.result-error {
		font-size: 0.9rem;
		color: var(--color-text-muted);
	}

	.result-points {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--rc, var(--color-text));
		background: color-mix(in srgb, var(--rc, var(--color-accent)) 15%, transparent);
		border: 1px solid color-mix(in srgb, var(--rc, var(--color-accent)) 40%, transparent);
		border-radius: 12px;
		padding: 1px 8px;
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
	.btn:disabled { opacity: 0.4; cursor: not-allowed; }
	.btn.large { padding: 0.9rem 2rem; font-size: 1.05rem; }

	.btn-ghost {
		background: var(--color-surface-2);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}
	.btn-ghost:hover { background: var(--color-surface); border-color: var(--color-accent); }
</style>
