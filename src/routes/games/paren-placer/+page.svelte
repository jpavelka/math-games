<script lang="ts">
	import { base } from '$app/paths';
	import { generatePuzzle, evaluateStandard, type Op } from '$lib/paren-placer';

	type Phase = 'idle' | 'playing' | 'done';

	let phase = $state<Phase>('idle');
	let puzzle = $state(generatePuzzle());
	let userParens = $state<[number, number][]>([]); // indices of numbers that are wrapped
	let score = $state(0);
	let questionIndex = $state(0);
	const TOTAL = 10;

	let firstSelectedIndex = $state<number | null>(null);

	function startGame() {
		phase = 'playing';
		score = 0;
		questionIndex = 0;
		nextPuzzle();
	}

	function nextPuzzle() {
		puzzle = generatePuzzle();
		userParens = [];
		firstSelectedIndex = null;
	}

	function handleNumberClick(index: number) {
		if (firstSelectedIndex === null) {
			firstSelectedIndex = index;
		} else {
			const start = Math.min(firstSelectedIndex, index);
			const end = Math.max(firstSelectedIndex, index);
			if (start !== end) {
				// Toggle this paren pair
				const existingIndex = userParens.findIndex(p => p[0] === start && p[1] === end);
				if (existingIndex !== -1) {
					userParens.splice(existingIndex, 1);
				} else {
					userParens.push([start, end]);
				}
			}
			firstSelectedIndex = null;
		}
	}

	function clearParens() {
		userParens = [];
		firstSelectedIndex = null;
	}

	function getNumberIndex(tokenIndex: number): number {
		let numIndex = 0;
		for (let i = 0; i < tokenIndex; i++) {
			if (typeof puzzle.tokens[i] === 'number') numIndex++;
		}
		return numIndex;
	}

	const displayTokens = $derived.by(() => {
		const tokens = puzzle.tokens;
		let result: { type: 'num' | 'op' | 'paren', value: string, numIndex?: number }[] = [];
		
		const numCount = tokens.filter(t => typeof t === 'number').length;
		const openParens = new Array(numCount).fill(0);
		const closeParens = new Array(numCount).fill(0);

		for (const [start, end] of userParens) {
			openParens[start]++;
			closeParens[end]++;
		}

		let currentNumIndex = 0;
		for (let i = 0; i < tokens.length; i++) {
			const t = tokens[i];
			if (typeof t === 'number') {
				for (let p = 0; p < openParens[currentNumIndex]; p++) result.push({ type: 'paren', value: '(' });
				result.push({ type: 'num', value: t.toString(), numIndex: currentNumIndex });
				for (let p = 0; p < closeParens[currentNumIndex]; p++) result.push({ type: 'paren', value: ')' });
				currentNumIndex++;
			} else {
				result.push({ type: 'op', value: t as string });
			}
		}
		return result;
	});

	function evaluateUserExpression(): number {
		// This is tricky. We need to evaluate with the user's parentheses.
		// A simple way is to build a string and use a real parser, or just implement one.
		// Let's use a simple recursive approach.
		
		const tokens = puzzle.tokens;
		const numCount = tokens.filter(t => typeof t === 'number').length;
		
		// Build an array of tokens including parentheses
		let flat: (number | Op | '(' | ')')[] = [];
		const openParens = new Array(numCount).fill(0);
		const closeParens = new Array(numCount).fill(0);
		for (const [start, end] of userParens) {
			openParens[start]++;
			closeParens[end]++;
		}

		let currentNumIndex = 0;
		for (let i = 0; i < tokens.length; i++) {
			const t = tokens[i];
			if (typeof t === 'number') {
				for (let p = 0; p < openParens[currentNumIndex]; p++) flat.push('(');
				flat.push(t);
				for (let p = 0; p < closeParens[currentNumIndex]; p++) flat.push(')');
				currentNumIndex++;
			} else {
				flat.push(t as Op);
			}
		}

		try {
			return parseAndEval(flat);
		} catch (e) {
			return NaN;
		}
	}

	function parseAndEval(tokens: (number | Op | '(' | ')')[]): number {
		// Basic shunting-yard or recursive descent
		let i = 0;
		function parseExpr(): number {
			let ops: (number | Op)[] = [];
			while (i < tokens.length) {
				const t = tokens[i];
				if (t === '(') {
					i++;
					ops.push(parseExpr());
				} else if (t === ')') {
					i++;
					return evaluateStandard(ops);
				} else {
					ops.push(t as number | Op);
					i++;
				}
			}
			return evaluateStandard(ops);
		}
		return parseExpr();
	}

	const currentUserValue = $derived(evaluateUserExpression());

	function submit() {
		if (currentUserValue === puzzle.target) {
			score++;
			questionIndex++;
			if (questionIndex >= TOTAL) {
				phase = 'done';
			} else {
				nextPuzzle();
			}
		} else {
			// Wrong answer feedback?
		}
	}
</script>

<svelte:head>
	<title>Paren Placer — Math Games</title>
</svelte:head>

<div class="page">
	<a href="{base}/" class="back">← Back to games</a>
	<h1>Paren Placer</h1>

	{#if phase === 'idle'}
		<p class="desc">Add parentheses to make the equation true. Click two numbers to wrap them and everything in between in parentheses.</p>
		<div class="center">
			<button class="btn large" onclick={startGame}>Start Game</button>
		</div>

	{:else if phase === 'playing'}
		<div class="game-card">
			<div class="progress">Question {questionIndex + 1} / {TOTAL}</div>
			<div class="target">Target: <strong>{puzzle.target}</strong></div>
			
			<div class="expression-container">
				{#each displayTokens as token}
					{#if token.type === 'num'}
						<button 
							class="token num" 
							class:selected={firstSelectedIndex === token.numIndex}
							onclick={() => handleNumberClick(token.numIndex!)}
						>
							{token.value}
						</button>
					{:else if token.type === 'op'}
						<span class="token op">{token.value}</span>
					{:else}
						<span class="token paren">{token.value}</span>
					{/if}
				{/each}
				<span class="equals">=</span>
				<span class="current-val" class:correct={currentUserValue === puzzle.target}>
					{isNaN(currentUserValue) ? '?' : currentUserValue}
				</span>
			</div>

			<div class="actions">
				<button class="btn secondary" onclick={clearParens}>Clear</button>
				<button class="btn" disabled={currentUserValue !== puzzle.target} onclick={submit}>Submit</button>
			</div>
		</div>

	{:else}
		<div class="result-card">
			<h2>Game Over!</h2>
			<p class="final-score">You scored {score} / {TOTAL}</p>
			<button class="btn large" onclick={startGame}>Play Again</button>
			<a href="{base}/" class="btn large secondary">Exit</a>
		</div>
	{/if}
</div>

<style>
	.page {
		max-width: 600px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.back {
		color: var(--color-text-muted);
		text-decoration: none;
		font-size: 0.9rem;
		display: block;
		margin-bottom: 1rem;
	}

	h1 {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
	}

	.desc {
		color: var(--color-text-muted);
		margin-bottom: 2rem;
	}

	.center {
		display: flex;
		justify-content: center;
	}

	.game-card, .result-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 2rem;
		text-align: center;
	}

	.progress {
		font-size: 0.9rem;
		color: var(--color-text-muted);
		margin-bottom: 1rem;
	}

	.target {
		font-size: 1.5rem;
		margin-bottom: 2rem;
	}

	.target strong {
		font-size: 2.5rem;
		color: var(--color-accent);
	}

	.expression-container {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-size: 1.5rem;
		font-weight: 700;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}

	.token.num {
		background: var(--color-surface-2);
		border: 2px solid transparent;
		border-radius: var(--radius-sm);
		padding: 0.5rem 0.8rem;
		cursor: pointer;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text);
		transition: all 0.2s;
	}

	.token.num:hover {
		border-color: var(--color-accent);
	}

	.token.num.selected {
		background: var(--color-accent);
		color: white;
	}

	.token.op {
		color: var(--color-text-muted);
	}

	.token.paren {
		color: var(--color-accent);
		font-size: 1.8rem;
	}

	.equals {
		margin: 0 0.5rem;
	}

	.current-val {
		min-width: 3rem;
		text-align: left;
	}

	.current-val.correct {
		color: #10b981;
	}

	.actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.btn {
		background: var(--color-accent);
		color: white;
		border: none;
		border-radius: var(--radius);
		padding: 0.8rem 1.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn.secondary {
		background: var(--color-surface-2);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}

	.btn.large {
		font-size: 1.2rem;
		padding: 1rem 2rem;
	}

	.final-score {
		font-size: 2rem;
		margin: 2rem 0;
	}
</style>
