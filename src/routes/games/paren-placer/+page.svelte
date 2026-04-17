<script lang="ts">
	import { base } from '$app/paths';
	import { generatePuzzle, evaluateStandard, type Op } from '$lib/paren-placer';

	type Phase = 'idle' | 'playing' | 'done';

	let phase = $state<Phase>('idle');
	
	// Settings
	let minOperands = $state(3);
	let maxOperands = $state(5);
	const MIN_OPTIONS = [3, 4, 5, 6];
	const MAX_OPTIONS = [3, 4, 5, 6, 7, 8];

	let puzzle = $state(generatePuzzle(minOperands, maxOperands));
	let userParens = $state<[number, number][]>([]); // indices of numbers that are wrapped
	let history = $state<[number, number][][]>([]); 
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
		if (minOperands > maxOperands) minOperands = maxOperands;
		
		puzzle = generatePuzzle(minOperands, maxOperands);
		userParens = [];
		history = []; // <-- Reset history on new puzzle
		firstSelectedIndex = null;
	}

	function handleNumberClick(index: number) {
		if (firstSelectedIndex === null) {
			firstSelectedIndex = index;
		} else {
			const start = Math.min(firstSelectedIndex, index);
			const end = Math.max(firstSelectedIndex, index);
			if (start !== end) {
				// SAVE STATE TO HISTORY BEFORE MUTATING
				// We use [...userParens] to create a shallow copy of the array
				history.push([...userParens]);

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
		if (userParens.length > 0) {
			// Save state so the user can undo an accidental clear!
			history.push([...userParens]);
		}
		userParens = [];
		firstSelectedIndex = null;
	}

	function undo() {
		// If the user has selected one number but hasn't finished the pair,
		// undo should just cancel that selection.
		if (firstSelectedIndex !== null) {
			firstSelectedIndex = null;
			return;
		}

		// Otherwise, restore the previous state from history
		if (history.length > 0) {
			userParens = history.pop()!;
		}
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
		const tokens = puzzle.tokens;
		const numCount = tokens.filter(t => typeof t === 'number').length;
		
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

	function setMin(v: number) { 
		minOperands = v; 
		if (minOperands > maxOperands) maxOperands = minOperands;
	}
	function setMax(v: number) { 
		maxOperands = v; 
		if (maxOperands < minOperands) minOperands = maxOperands;
	}

	function restartToSetup() {
		if (confirm("Are you sure you want to restart? Your current progress will be lost.")) {
			phase = 'idle';
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

		<details class="learn-details">
			<summary>Learn more</summary>
			<div class="learn-body">
				<h3>Operator Precedence and Parenthesisation</h3>
				<p>
					Parentheses override
					<a href="https://en.wikipedia.org/wiki/Order_of_operations" target="_blank" rel="noopener">operator precedence</a>,
					letting you control the order of evaluation. Different parenthesisations of the
					same sequence of numbers and operators can produce wildly different results.
				</p>
				<h4>Catalan numbers</h4>
				<p>
					The number of distinct ways to fully parenthesise n + 1 numbers combined with n
					operators is the nth
					<a href="https://en.wikipedia.org/wiki/Catalan_number" target="_blank" rel="noopener">Catalan number</a>
					Cₙ = (2n choose n) / (n + 1).
					For 4 numbers there are C₃ = 5 bracketings; for 6 numbers, C₅ = 42.
					Catalan numbers count many combinatorial structures — polygon triangulations,
					valid bracket sequences, and binary trees.
				</p>
				<h4>Expression trees</h4>
				<p>
					Every parenthesisation corresponds to a binary tree where leaves are numbers
					and internal nodes are operators. Evaluating the expression means doing a
					post-order traversal of the tree.
				</p>
			</div>
		</details>

		<div class="settings">
			<div class="setting-row">
				<span class="setting-label">Min numbers</span>
				<div class="toggle-group">
					{#each MIN_OPTIONS as v}
						<button class="tog-btn" class:active={minOperands === v} onclick={() => setMin(v)}>{v}</button>
					{/each}
				</div>
			</div>
			<div class="setting-row">
				<span class="setting-label">Max numbers</span>
				<div class="toggle-group">
					{#each MAX_OPTIONS as v}
						<button class="tog-btn" class:active={maxOperands === v} onclick={() => setMax(v)}>{v}</button>
					{/each}
				</div>
			</div>
		</div>

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
				<button class="btn secondary" style="margin-right: auto;" onclick={restartToSetup}>Restart</button>
				<button 
					class="btn secondary" 
					onclick={undo} 
					disabled={history.length === 0 && firstSelectedIndex === null}
				>
					Undo
				</button>
				<button class="btn secondary" onclick={clearParens}>Clear</button>
				<button class="btn" disabled={currentUserValue !== puzzle.target} onclick={submit}>Submit</button>
			</div>
		</div>

	{:else}
		<div class="result-card">
			<h2>Game Over!</h2>
			<p class="final-score">You scored {score} / {TOTAL}</p>
			<div class="result-actions">
				<button class="btn large" onclick={startGame}>Play Again</button>
				<button class="btn large btn-secondary" onclick={() => (phase = 'idle')}>Settings</button>
			</div>
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

	/* Settings */
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
		min-width: 7rem;
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

	.result-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
	}

	.btn-secondary {
		background: var(--color-surface-2);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}
</style>
