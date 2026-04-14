<script lang="ts">
	import { base } from '$app/paths';

	type Phase = 'idle' | 'playing' | 'done';

	const TOTAL = 10;
	const TIME_PER_Q = 10; // seconds

	let phase = $state<Phase>('idle');
	let a = $state(0);
	let b = $state(0);
	let input = $state('');
	let questionIndex = $state(0);
	let score = $state(0);
	let timeLeft = $state(TIME_PER_Q);
	let shake = $state(false);
	let flash = $state<'correct' | 'wrong' | null>(null);
	let interval: ReturnType<typeof setInterval> | null = null;
	let highScore = $state(0);

	function randomInt(min: number, max: number) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	function nextQuestion() {
		a = randomInt(2, 12);
		b = randomInt(2, 12);
		input = '';
		timeLeft = TIME_PER_Q;
	}

	function startGame() {
		score = 0;
		questionIndex = 0;
		phase = 'playing';
		nextQuestion();
		startTimer();
	}

	function startTimer() {
		if (interval) clearInterval(interval);
		interval = setInterval(() => {
			timeLeft--;
			if (timeLeft <= 0) {
				handleTimeout();
			}
		}, 1000);
	}

	function stopTimer() {
		if (interval) {
			clearInterval(interval);
			interval = null;
		}
	}

	function handleTimeout() {
		showFlash('wrong');
		advance();
	}

	function submit() {
		const n = parseInt(input, 10);
		if (isNaN(n)) {
			triggerShake();
			return;
		}
		if (n === a * b) {
			score++;
			showFlash('correct');
		} else {
			showFlash('wrong');
		}
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
			nextQuestion();
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
	<title>Times Tables Quiz — Math Games</title>
</svelte:head>

<div class="page">
	<a href="{base}/" class="back">← Back to games</a>

	<h1>Times Tables Quiz</h1>
	<p class="desc">Answer <strong>{TOTAL}</strong> multiplication questions. You have <strong>{TIME_PER_Q}s</strong> per question.</p>

	{#if phase === 'idle'}
		<div class="center">
			{#if highScore > 0}
				<p class="high-score">Best: {highScore} / {TOTAL}</p>
			{/if}
			<button class="btn large" onclick={startGame}>Start Quiz</button>
		</div>
	{:else if phase === 'playing'}
		<div class="quiz-card" class:flash-correct={flash === 'correct'} class:flash-wrong={flash === 'wrong'}>
			<div class="progress-bar">
				<div class="progress-fill" style="width: {(questionIndex / TOTAL) * 100}%"></div>
			</div>
			<div class="meta">
				<span>Question {questionIndex + 1} / {TOTAL}</span>
				<span class="timer" class:urgent={timeLeft <= 3}>{timeLeft}s</span>
			</div>
			<p class="question">{a} × {b} = ?</p>
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
			{#if score > highScore - (score === highScore ? 0 : 1)}
				<p class="new-best">New best!</p>
			{/if}
			<button class="btn large" onclick={startGame}>Play again</button>
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
		margin-bottom: 2rem;
	}

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

	.quiz-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		overflow: hidden;
		transition: border-color 0.15s;
	}

	.quiz-card.flash-correct {
		border-color: var(--color-tag-arithmetic);
	}

	.quiz-card.flash-wrong {
		border-color: #ef4444;
	}

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

	.timer.urgent {
		color: #ef4444;
	}

	.question {
		font-size: 2.5rem;
		font-weight: 800;
		text-align: center;
		padding: 1.5rem;
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

	input[type='number']:focus {
		border-color: var(--color-accent);
	}

	.score-live {
		text-align: center;
		padding: 0 1.25rem 1rem;
		font-size: 0.9rem;
		color: var(--color-text-muted);
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

	.btn:hover {
		background: var(--color-accent-hover);
	}

	.btn.large {
		padding: 0.9rem 2rem;
		font-size: 1.1rem;
	}

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
		margin-bottom: 0.5rem;
	}

	.new-best {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--color-tag-arithmetic);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		20% { transform: translateX(-8px); }
		40% { transform: translateX(8px); }
		60% { transform: translateX(-5px); }
		80% { transform: translateX(5px); }
	}

	.shake {
		animation: shake 0.4s ease;
	}
</style>
