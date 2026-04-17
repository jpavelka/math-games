<script lang="ts">
	import { base } from '$app/paths';

	type SqType = 'start' | 'op' | 'blank' | 'end';

	interface Sq {
		type: SqType;
		value?: number;
		op?: string;
		operand?: number;
		answer?: number;
		inputIdx?: number;
	}

	const COLS = 5;
	const STEPS = 14; // 1 start + 14×(op,result) = 29 squares; last result is 'end' (given)

	type VisualRow =
		| { kind: 'main'; squares: Sq[]; dir: 'ltr' | 'rtl' }
		| { kind: 'turn'; square: Sq; side: 'right' | 'left' };

	let maxVal = $state(50);
	let useMulDiv = $state(true);

	function onMaxInput(e: Event) {
		const input = e.target as HTMLInputElement;
		// Strip anything that isn't a digit
		const digits = input.value.replace(/\D/g, '');
		// Cap at 99 (two digits max)
		const n = parseInt(digits, 10);
		const capped = !isNaN(n) && n > 99 ? '99' : digits;
		input.value = capped;
		// Regenerate immediately only when the value is in range
		const val = parseInt(capped, 10);
		if (!isNaN(val) && val >= 20 && val <= 99) {
			maxVal = val;
			generate();
		}
	}

	function onMaxBlur(e: Event) {
		const input = e.target as HTMLInputElement;
		const n = parseInt(input.value, 10);
		const clamped = isNaN(n) || n < 20 ? 20 : Math.min(n, 99);
		input.value = String(clamped);
		if (clamped !== maxVal) {
			maxVal = clamped;
			generate();
		}
	}

	let squares = $state<Sq[]>([]);
	let inputs = $state<string[]>([]);
	let status = $state<'playing' | 'won'>('playing');
	let checked = $state(false);
	let wrong = $state<Set<number>>(new Set());

	function rand(lo: number, hi: number) {
		return Math.floor(Math.random() * (hi - lo + 1)) + lo;
	}

	function pickStep(cur: number): { op: string; n: number; out: number } {
		const OPS = useMulDiv ? ['+', '-', '×', '÷'] : ['+', '-'];
		for (let t = 0; t < 40; t++) {
			const op = OPS[rand(0, OPS.length - 1)];
			let n: number, out: number;
			if (op === '+') {
				if (cur >= maxVal) continue;
				n = rand(1, Math.min(20, maxVal - cur));
				out = cur + n;
			} else if (op === '-') {
				if (cur < 3) continue;
				n = rand(1, Math.min(20, cur - 1));
				out = cur - n;
			} else if (op === '×') {
				const mx = Math.floor(maxVal / cur);
				if (mx < 2) continue;
				n = rand(2, Math.min(9, mx));
				out = cur * n;
			} else {
				const divs: number[] = [];
				for (let d = 2; d <= Math.min(12, cur); d++) if (cur % d === 0) divs.push(d);
				if (!divs.length) continue;
				n = divs[rand(0, divs.length - 1)];
				out = cur / n;
			}
			if (out >= 1 && out <= maxVal) return { op, n, out };
		}
		// fallback
		const n = rand(1, Math.min(10, maxVal - cur));
		return { op: '+', n, out: cur + n };
	}

	function generate() {
		let val = rand(2, Math.min(20, maxVal));
		const sq: Sq[] = [{ type: 'start', value: val }];
		let idx = 0;
		for (let i = 0; i < STEPS; i++) {
			const { op, n, out } = pickStep(val);
			sq.push({ type: 'op', op, operand: n });
			sq.push(
				i === STEPS - 1
					? { type: 'end', value: out }
					: { type: 'blank', answer: out, inputIdx: idx++ }
			);
			val = out;
		}
		squares = sq;
		inputs = Array(idx).fill('');
		status = 'playing';
		checked = false;
		wrong = new Set();
	}

	function check() {
		const bad = new Set<number>();
		for (const sq of squares) {
			if (sq.type === 'blank') {
				if (parseInt(inputs[sq.inputIdx!], 10) !== sq.answer) bad.add(sq.inputIdx!);
			}
		}
		wrong = bad;
		checked = true;
		if (!bad.size) status = 'won';
	}

	function getVisualRows(): VisualRow[] {
		const rows: VisualRow[] = [];
		let i = 0;
		let dir: 'ltr' | 'rtl' = 'ltr';
		while (i < squares.length) {
			const chunk = squares.slice(i, i + COLS);
			rows.push({ kind: 'main', squares: chunk, dir });
			i += chunk.length;
			if (i < squares.length) {
				rows.push({ kind: 'turn', square: squares[i], side: dir === 'ltr' ? 'right' : 'left' });
				i++;
				dir = dir === 'ltr' ? 'rtl' : 'ltr';
			}
		}
		return rows;
	}

	generate();
</script>

<svelte:head>
	<title>Snake Math — Math Games</title>
</svelte:head>

<div class="page">
	<a href="{base}/" class="back">← Back to games</a>

	<h1>Snake Math</h1>
	<p class="desc">
		Follow the chain from start to end. Fill in every blank square with the running result.
	</p>

	<details class="learn-details">
		<summary>Learn more</summary>
		<div class="learn-body">
			<h3>Order of Operations</h3>
			<p>
				Snake Math applies operations strictly left-to-right, ignoring the usual
				precedence rules. The standard conventions —
				<a href="https://en.wikipedia.org/wiki/Order_of_operations" target="_blank" rel="noopener">PEMDAS / BODMAS</a>
				— were formalised in the 19th century to avoid ambiguity in written expressions,
				but are a convention, not a mathematical law.
			</p>
			<h4>Why left-to-right here?</h4>
			<p>
				Reading equations left-to-right without hierarchy keeps each step a single
				mental arithmetic problem. This mirrors how calculators evaluated expressions
				before algebraic logic (AOS) became standard — older calculators simply
				applied each operation immediately as entered.
			</p>
			<h4>Mental arithmetic</h4>
			<p>
				Chaining operations is a core skill in
				<a href="https://en.wikipedia.org/wiki/Mental_calculation" target="_blank" rel="noopener">mental calculation</a>.
				Techniques like keeping a running total and decomposing numbers
				(e.g. ×12 = ×10 + ×2) make longer chains tractable.
			</p>
		</div>
	</details>

	<div class="controls">
		<label class="control-row">
			<span class="control-label">Max number</span>
			<input
				type="range"
				min="20"
				max="99"
				step="1"
				bind:value={maxVal}
				onchange={generate}
			/>
			<input
					type="text"
					inputmode="numeric"
					class="control-number"
					value={maxVal}
					oninput={onMaxInput}
					onblur={onMaxBlur}
				/>
		</label>
		<label class="control-row">
			<input type="checkbox" bind:checked={useMulDiv} onchange={generate} />
			<span class="control-label">Include × and ÷</span>
		</label>
	</div>

	{#if status === 'won'}
		<div class="won-banner">
			<p>You solved it! 🎉</p>
			<button class="btn" onclick={generate}>New puzzle</button>
		</div>
	{/if}

	{#snippet sqBlock(sq: Sq)}
		<div
			class="sq sq-{sq.type}"
			class:correct={checked && sq.type === 'blank' && !wrong.has(sq.inputIdx!)}
			class:wrong={checked && sq.type === 'blank' && wrong.has(sq.inputIdx!)}
		>
			{#if sq.type === 'start' || sq.type === 'end'}
				<span class="num">{sq.value}</span>
			{:else if sq.type === 'op'}
				<span class="op-sym">{sq.op}</span>
				<span class="op-num">{sq.operand}</span>
			{:else}
				<input
					type="number"
					class="blank-input"
					bind:value={inputs[sq.inputIdx!]}
					placeholder="?"
					min="1"
					max="99"
					disabled={status === 'won'}
					aria-label="Answer for blank {sq.inputIdx! + 1}"
				/>
			{/if}
		</div>
	{/snippet}

	<div class="board">
		{#each getVisualRows() as vrow}
			{#if vrow.kind === 'main'}
				<div class="row" class:rtl={vrow.dir === 'rtl'}>
					{#each vrow.squares as sq}
						{@render sqBlock(sq)}
					{/each}
				</div>
			{:else}
				<div class="turn-row {vrow.side}">
					{@render sqBlock(vrow.square)}
				</div>
			{/if}
		{/each}
	</div>

	{#if status === 'playing'}
		<div class="actions">
			<button class="btn" onclick={check}>Check answers</button>
			<button class="btn btn-secondary" onclick={generate}>New puzzle</button>
		</div>
		{#if checked && wrong.size > 0}
			<p class="hint-msg">
				{wrong.size}
				{wrong.size === 1 ? 'answer needs' : 'answers need'} fixing — highlighted in red.
			</p>
		{/if}
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


	/* ── Controls ── */
	.controls {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		margin-bottom: 1.5rem;
	}

	.control-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
	}

	.control-label {
		font-size: 0.9rem;
		color: var(--color-text-muted);
		white-space: nowrap;
	}

	.control-number {
		width: 3.5rem;
		padding: 0.25rem 0.4rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text);
		font-size: 0.9rem;
		font-weight: 700;
		text-align: center;
		-moz-appearance: textfield;
	}

	.control-number::-webkit-outer-spin-button,
	.control-number::-webkit-inner-spin-button {
		-webkit-appearance: none;
	}

	.control-number:focus {
		outline: none;
		border-color: var(--color-accent);
	}

	input[type='range'] {
		flex: 1;
		accent-color: var(--color-accent);
		cursor: pointer;
	}

	input[type='checkbox'] {
		width: 1rem;
		height: 1rem;
		accent-color: var(--color-accent);
		cursor: pointer;
		flex-shrink: 0;
	}

	/* ── Board ── */
	.board {
		display: flex;
		flex-direction: column;
		width: 364px; /* 5 × 68px + 4 × 6px gap */
	}

	.row {
		display: flex;
		flex-direction: row;
		gap: 6px;
	}

	.row.rtl {
		flex-direction: row-reverse;
	}

	/* ── Turn rows (single square at edge) ── */
	.turn-row {
		display: flex;
		width: 100%;
	}

	.turn-row.right {
		justify-content: flex-end;
	}

	.turn-row.left {
		justify-content: flex-start;
	}

	/* ── Squares ── */
	.sq {
		width: 68px;
		height: 68px;
		border-radius: var(--radius-sm);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		border: 2px solid var(--color-border);
		background: var(--color-surface);
		flex-shrink: 0;
	}

	/* Start square */
	.sq-start {
		background: rgba(108, 139, 239, 0.15);
		border-color: var(--color-accent);
	}

	.sq-start .num {
		font-size: 1.5rem;
		color: var(--color-accent);
	}

	/* End square */
	.sq-end {
		background: rgba(74, 222, 128, 0.12);
		border-color: #4ade80;
	}

	.sq-end .num {
		font-size: 1.5rem;
		color: #4ade80;
	}

	/* Operator square */
	.sq-op {
		background: rgba(167, 139, 250, 0.08);
		border-color: rgba(167, 139, 250, 0.35);
		gap: 2px;
	}

	.op-sym {
		font-size: 1.05rem;
		color: var(--color-tag-number-theory);
		line-height: 1;
	}

	.op-num {
		font-size: 1.3rem;
		color: var(--color-text);
		line-height: 1;
	}

	/* Blank square */
	.sq-blank {
		background: var(--color-surface-2);
		border-style: dashed;
	}

	.sq-blank.correct {
		border-style: solid;
		border-color: #4ade80;
		background: rgba(74, 222, 128, 0.08);
	}

	.sq-blank.wrong {
		border-style: solid;
		border-color: #f87171;
		background: rgba(248, 113, 113, 0.08);
	}

	.blank-input {
		width: 58px;
		height: 56px;
		background: transparent;
		border: none;
		text-align: center;
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--color-text);
		outline: none;
		-moz-appearance: textfield;
	}

	.blank-input::-webkit-outer-spin-button,
	.blank-input::-webkit-inner-spin-button {
		-webkit-appearance: none;
	}

	.blank-input::placeholder {
		color: var(--color-text-muted);
		font-weight: 400;
	}

	.blank-input:disabled {
		opacity: 0.6;
	}

	/* ── Actions ── */
	.actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 1.5rem;
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

	.btn-secondary {
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}

	.btn-secondary:hover {
		background: var(--color-surface-2);
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

	.hint-msg {
		margin-top: 0.75rem;
		color: #f87171;
		font-size: 0.9rem;
	}

	/* ── Mobile ── */
	@media (max-width: 400px) {
		.board {
			width: 304px; /* 5 × 56px + 4 × 6px */
		}

		.sq {
			width: 56px;
			height: 56px;
		}

		.sq-start .num,
		.sq-end .num {
			font-size: 1.2rem;
		}

		.op-num {
			font-size: 1.1rem;
		}

		.blank-input {
			width: 48px;
			height: 48px;
			font-size: 1.1rem;
		}
	}
</style>
