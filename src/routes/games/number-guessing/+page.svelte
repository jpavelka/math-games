<script lang="ts">
	import { base } from '$app/paths';

	type Status = 'playing' | 'won';

	let secret = $state(randomInt(1, 100));
	let input = $state('');
	let guesses = $state<number[]>([]);
	let status = $state<Status>('playing');
	let shake = $state(false);

	function randomInt(min: number, max: number) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	function hint(guess: number): string {
		if (guess < secret) return '↑ Too low';
		if (guess > secret) return '↓ Too high';
		return '✓ Correct!';
	}

	function hintClass(guess: number): string {
		if (guess < secret) return 'low';
		if (guess > secret) return 'high';
		return 'correct';
	}

	function submit() {
		const n = parseInt(input, 10);
		if (isNaN(n) || n < 1 || n > 100) {
			triggerShake();
			return;
		}
		guesses = [n, ...guesses];
		input = '';
		if (n === secret) status = 'won';
	}

	function triggerShake() {
		shake = true;
		setTimeout(() => (shake = false), 400);
	}

	function restart() {
		secret = randomInt(1, 100);
		guesses = [];
		input = '';
		status = 'playing';
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Enter') submit();
	}
</script>

<svelte:head>
	<title>Number Guessing — Math Games</title>
</svelte:head>

<div class="page">
	<a href="{base}/" class="back">← Back to games</a>

	<h1>Number Guessing</h1>
	<p class="desc">I'm thinking of a number between <strong>1</strong> and <strong>100</strong>. Can you guess it?</p>

	{#if status === 'won'}
		<div class="won-banner">
			<p>You got it in <strong>{guesses.length}</strong> {guesses.length === 1 ? 'guess' : 'guesses'}!</p>
			<button class="btn" onclick={restart}>Play again</button>
		</div>
	{:else}
		<div class="input-row" class:shake>
			<input
				type="number"
				min="1"
				max="100"
				placeholder="Enter a number…"
				bind:value={input}
				onkeydown={handleKey}
				autofocus
			/>
			<button class="btn" onclick={submit}>Guess</button>
		</div>
		<p class="attempts">Guesses so far: <strong>{guesses.length}</strong></p>
	{/if}

	{#if guesses.length > 0}
		<ul class="history">
			{#each guesses as g, i (i)}
				<li class={hintClass(g)}>
					<span class="guess-num">{g}</span>
					<span class="guess-hint">{hint(g)}</span>
				</li>
			{/each}
		</ul>
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

	.input-row {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	input[type='number'] {
		flex: 1;
		padding: 0.7rem 1rem;
		background: var(--color-surface);
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

	.attempts {
		color: var(--color-text-muted);
		font-size: 0.9rem;
		margin-bottom: 1.5rem;
	}

	.won-banner {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 1.5rem;
		text-align: center;
		margin-bottom: 1.5rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.won-banner p {
		font-size: 1.2rem;
	}

	.history {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.history li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.6rem 1rem;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
	}

	.history li.low {
		background: rgba(56, 189, 248, 0.08);
		border-color: rgba(56, 189, 248, 0.2);
	}

	.history li.high {
		background: rgba(245, 158, 11, 0.08);
		border-color: rgba(245, 158, 11, 0.2);
	}

	.history li.correct {
		background: rgba(74, 222, 128, 0.1);
		border-color: rgba(74, 222, 128, 0.3);
	}

	.guess-num {
		font-weight: 700;
		font-size: 1.1rem;
	}

	.guess-hint {
		font-size: 0.9rem;
		color: var(--color-text-muted);
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
