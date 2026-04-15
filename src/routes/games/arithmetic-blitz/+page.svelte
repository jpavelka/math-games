<script lang="ts">
	import { base } from '$app/paths';

	type Op = '+' | '−' | '×' | '÷';

	const TOTAL = 10;
	const TIME_PER_Q = 10;
	const MAX_VAL_OPTIONS = [5, 10, 12, 20, 50];

	// ── settings (persist across games) ──────────────────────────────────────
	let opAdd = $state(false);
	let opSub = $state(false);
	let opMul = $state(true);
	let opDiv = $state(false);
	let maxVal = $state(12);
	let allowNeg = $state(false);

	const enabledOps = $derived<Op[]>([
		...(opAdd ? (['+'] as Op[]) : []),
		...(opSub ? (['−'] as Op[]) : []),
		...(opMul ? (['×'] as Op[]) : []),
		...(opDiv ? (['÷'] as Op[]) : []),
	]);

	function toggleOp(op: Op, active: boolean) {
		if (active && enabledOps.length === 1) return; // keep at least one
		if (op === '+') opAdd = !opAdd;
		else if (op === '−') opSub = !opSub;
		else if (op === '×') opMul = !opMul;
		else opDiv = !opDiv;
		highScore = 0;
	}

	function setMaxVal(v: number) { maxVal = v; highScore = 0; }
	function setAllowNeg(v: boolean) { allowNeg = v; highScore = 0; }

	// ── game state ───────────────────────────────────────────────────────────
	type Phase = 'idle' | 'playing' | 'done';

	let phase = $state<Phase>('idle');
	let questionIndex = $state(0);
	let score = $state(0);
	let highScore = $state(0);
	let timeLeft = $state(TIME_PER_Q);
	let input = $state('');
	let shake = $state(false);
	let flash = $state<'correct' | 'wrong' | null>(null);
	let interval: ReturnType<typeof setInterval> | null = null;

	let qA = $state(0);
	let qB = $state(0);
	let qOp = $state<Op>('×');
	let qAnswer = $state(0);

	// ── question generation ──────────────────────────────────────────────────
	function ri(lo: number, hi: number) {
		return Math.floor(Math.random() * (hi - lo + 1)) + lo;
	}

	function generateQuestion() {
		const ops = enabledOps;
		const op: Op = ops[ri(0, ops.length - 1)];
		const lo = allowNeg ? -maxVal : 1;
		let a: number, b: number, answer: number;

		if (op === '÷') {
			const divisor = ri(2, Math.min(maxVal, 12));
			const quotient = allowNeg
				? (Math.random() < 0.5 ? -1 : 1) * ri(1, maxVal)
				: ri(1, maxVal);
			a = divisor * quotient;
			b = divisor;
			answer = quotient;
		} else if (op === '−') {
			a = ri(lo, maxVal);
			b = ri(lo, maxVal);
			if (!allowNeg && a < b) { const t = a; a = b; b = t; }
			answer = a - b;
		} else if (op === '×') {
			a = ri(lo, maxVal);
			b = ri(lo, maxVal);
			answer = a * b;
		} else {
			a = ri(lo, maxVal);
			b = ri(lo, maxVal);
			answer = a + b;
		}

		qA = a; qB = b; qOp = op; qAnswer = answer;
	}

	// Wrap negative operands in parens when they follow an operator symbol
	function fmt(n: number, parens = false): string {
		return parens && n < 0 ? `(${n})` : `${n}`;
	}

	// ── game flow ────────────────────────────────────────────────────────────
	function startGame() {
		score = 0;
		questionIndex = 0;
		input = '';
		phase = 'playing';
		generateQuestion();
		startTimer();
	}

	function startTimer() {
		timeLeft = TIME_PER_Q;
		if (interval) clearInterval(interval);
		interval = setInterval(() => {
			timeLeft--;
			if (timeLeft <= 0) { showFlash('wrong'); advance(); }
		}, 1000);
	}

	function stopTimer() {
		if (interval) { clearInterval(interval); interval = null; }
	}

	function submit() {
		const n = parseInt(input, 10);
		if (isNaN(n)) { triggerShake(); return; }
		if (n === qAnswer) { score++; showFlash('correct'); }
		else { showFlash('wrong'); }
		advance();
	}

	function advance() {
		stopTimer();
		input = '';
		questionIndex++;
		if (questionIndex >= TOTAL) {
			phase = 'done';
			if (score > highScore) highScore = score;
		} else {
			generateQuestion();
			startTimer();
		}
	}

	function triggerShake() {
		shake = true;
		setTimeout(() => (shake = false), 400);
	}

	function showFlash(type: 'correct' | 'wrong') {
		flash = type;
		setTimeout(() => (flash = null), 300);
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Enter') submit();
	}
</script>

<svelte:head>
	<title>Arithmetic Blitz — Math Games</title>
</svelte:head>

<div class="page">
	<a href="{base}/" class="back">← Back to games</a>
	<h1>Arithmetic Blitz</h1>

	{#if phase === 'idle'}
		<p class="desc">Answer <strong>{TOTAL}</strong> questions against the clock. Configure your challenge below.</p>

		<div class="settings">
			<div class="setting-row">
				<span class="setting-label">Operators</span>
				<div class="toggle-group">
					{#each (['+', '−', '×', '÷'] as Op[]) as op}
						{@const active = enabledOps.includes(op)}
						<button
							class="tog-btn"
							class:active
							onclick={() => toggleOp(op, active)}
						>{op}</button>
					{/each}
				</div>
			</div>

			<div class="setting-row">
				<span class="setting-label">Max value</span>
				<div class="toggle-group">
					{#each MAX_VAL_OPTIONS as v}
						<button
							class="tog-btn"
							class:active={maxVal === v}
							onclick={() => setMaxVal(v)}
						>{v}</button>
					{/each}
				</div>
			</div>

			<div class="setting-row">
				<span class="setting-label">Negatives</span>
				<div class="toggle-group">
					<button class="tog-btn" class:active={!allowNeg} onclick={() => setAllowNeg(false)}>Off</button>
					<button class="tog-btn" class:active={allowNeg}  onclick={() => setAllowNeg(true)}>On</button>
				</div>
			</div>
		</div>

		<div class="center">
			{#if highScore > 0}
				<p class="high-score">Best: {highScore} / {TOTAL}</p>
			{/if}
			<button class="btn large" onclick={startGame}>Start</button>
		</div>

	{:else if phase === 'playing'}
		<div class="quiz-card" class:flash-correct={flash === 'correct'} class:flash-wrong={flash === 'wrong'}>
			<div class="progress-bar">
				<div class="progress-fill" style="width:{(questionIndex / TOTAL) * 100}%"></div>
			</div>
			<div class="meta">
				<span>Question {questionIndex + 1} / {TOTAL}</span>
				<span class="timer" class:urgent={timeLeft <= 3}>{timeLeft}s</span>
			</div>
			<p class="question">
				{fmt(qA, qOp !== '+' && qOp !== '−')} {qOp} {fmt(qB, true)} = ?
			</p>
			<div class="input-row" class:shake>
				<input
					type="number"
					placeholder="Answer…"
					bind:value={input}
					onkeydown={handleKey}
					autofocus
				/>
				<button class="btn" onclick={submit}>Submit</button>
			</div>
			<p class="score-live">Score: <strong>{score}</strong></p>
		</div>

	{:else}
		<div class="result-card">
			<p class="result-label">Final Score</p>
			<p class="result-score">{score} <span>/ {TOTAL}</span></p>
			{#if score === TOTAL}
				<p class="result-msg">Perfect score!</p>
			{:else if score >= TOTAL * 0.7}
				<p class="result-msg">Great job!</p>
			{:else}
				<p class="result-msg">Keep practising!</p>
			{/if}
			{#if score >= highScore && score > 0}
				<p class="new-best">New best!</p>
			{/if}
			<div class="result-actions">
				<button class="btn large" onclick={startGame}>Play again</button>
				<button class="btn large btn-secondary" onclick={() => (phase = 'idle')}>Settings</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.page {
		max-width: 480px;
		margin: 0 auto;
	}

	.back {
		display: inline-block;
		margin-bottom: 1.5rem;
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}

	h1 {
		font-size: 2rem;
		font-weight: 800;
		margin-bottom: 0.4rem;
	}

	.desc {
		color: var(--color-text-muted);
		margin-bottom: 1.5rem;
	}

	/* ── settings ── */
	.settings {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 1.1rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		margin-bottom: 1.75rem;
	}

	.setting-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.setting-label {
		font-size: 0.82rem;
		color: var(--color-text-muted);
		font-weight: 600;
		min-width: 5.5rem;
	}

	.toggle-group {
		display: flex;
		gap: 0.35rem;
		flex-wrap: wrap;
	}

	.tog-btn {
		padding: 0.3rem 0.75rem;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text-muted);
		font-size: 0.9rem;
		font-weight: 700;
		min-width: 2.4rem;
		text-align: center;
		transition: background 0.15s, border-color 0.15s, color 0.15s;
	}

	.tog-btn:hover:not(.active) {
		border-color: var(--color-accent);
		color: var(--color-text);
	}

	.tog-btn.active {
		background: var(--color-accent);
		border-color: var(--color-accent);
		color: #fff;
	}

	/* ── idle ── */
	.center {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.high-score {
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}

	/* ── quiz card ── */
	.quiz-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		overflow: hidden;
		transition: border-color 0.15s;
	}

	.quiz-card.flash-correct { border-color: var(--color-tag-arithmetic); }
	.quiz-card.flash-wrong   { border-color: #ef4444; }

	.progress-bar {
		height: 4px;
		background: var(--color-surface-2);
	}

	.progress-fill {
		height: 100%;
		background: var(--color-accent);
		transition: width 0.3s;
	}

	.meta {
		display: flex;
		justify-content: space-between;
		padding: 1rem 1.25rem 0;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.timer {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.timer.urgent { color: #ef4444; }

	.question {
		font-size: 2.5rem;
		font-weight: 800;
		text-align: center;
		padding: 1.5rem;
		font-variant-numeric: tabular-nums;
	}

	.input-row {
		display: flex;
		gap: 0.75rem;
		padding: 0 1.25rem 1rem;
	}

	input[type='number'] {
		flex: 1;
		padding: 0.7rem 1rem;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		color: var(--color-text);
		font-size: 1rem;
		outline: none;
		transition: border-color 0.2s;
	}

	input[type='number']:focus { border-color: var(--color-accent); }

	.score-live {
		text-align: center;
		padding: 0 1.25rem 1rem;
		font-size: 0.9rem;
		color: var(--color-text-muted);
	}

	/* ── result card ── */
	.result-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 2.5rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.result-label {
		color: var(--color-text-muted);
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.result-score {
		font-size: 4rem;
		font-weight: 800;
		line-height: 1;
	}

	.result-score span {
		font-size: 2rem;
		color: var(--color-text-muted);
		font-weight: 400;
	}

	.result-msg {
		color: var(--color-text-muted);
		margin-bottom: 0.25rem;
	}

	.new-best {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--color-tag-arithmetic);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.result-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		justify-content: center;
	}

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

	.btn.large {
		padding: 0.9rem 2rem;
		font-size: 1.1rem;
	}

	.btn-secondary {
		background: var(--color-surface-2);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}

	.btn-secondary:hover { background: var(--color-border); }

	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		20%       { transform: translateX(-8px); }
		40%       { transform: translateX(8px); }
		60%       { transform: translateX(-5px); }
		80%       { transform: translateX(5px); }
	}

	.shake { animation: shake 0.4s ease; }
</style>
