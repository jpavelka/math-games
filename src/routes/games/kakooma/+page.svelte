<script lang="ts">
	import { base } from '$app/paths';
	import { generatePuzzle, checkAnswer, type SubGrid, type OperatorMode } from '$lib/kakooma';

	// ─── settings ────────────────────────────────────────────────────────────

	let operatorMode = $state<OperatorMode>('both');
	// null = unlimited
	let maxWrong = $state<number | null>(5);

	// ─── state ───────────────────────────────────────────────────────────────

	let puzzle = $state(generatePuzzle(operatorMode));

	// selections[i] = chosen index into subGrid.numbers, or null
	let selections = $state<(number | null)[]>(Array(8).fill(null));
	// per-subgrid result: null = unanswered, true = correct, false = wrong
	let results = $state<(boolean | null)[]>(Array(8).fill(null));

	let finalSelection = $state<number | null>(null);
	let finalResult = $state<boolean | null>(null);

	let wrongCount = $state(0);

	type Phase = 'subgrids' | 'final' | 'complete' | 'failed';
	let phase = $state<Phase>('subgrids');

	// ─── derived ─────────────────────────────────────────────────────────────

	const solvedCount = $derived(results.filter((r) => r === true).length);
	const allSubgridsSolved = $derived(solvedCount === 8);
	const finalAnswers = $derived(
		puzzle.subGrids.map((g) => g.numbers[g.answerIndex])
	);
	const mistakesLeft = $derived(maxWrong === null ? null : maxWrong - wrongCount);

	const opLabel = $derived(
		operatorMode === 'add' ? 'sum' : operatorMode === 'mul' ? 'product' : 'sum or product'
	);

	// ─── settings handlers ────────────────────────────────────────────────────

	function setOperatorMode(m: OperatorMode) {
		operatorMode = m;
		newPuzzle();
	}

	function setMaxWrong(n: number | null) {
		maxWrong = n;
		newPuzzle();
	}

	// ─── interaction ─────────────────────────────────────────────────────────

	function pickSubgrid(gridIndex: number, cellIndex: number) {
		if (results[gridIndex] === true) return; // already solved
		if (phase !== 'subgrids') return;
		if (selections[gridIndex] === cellIndex) return; // don't recount same cell

		selections[gridIndex] = cellIndex;
		const correct = checkAnswer(puzzle.subGrids[gridIndex], cellIndex);
		results[gridIndex] = correct;

		if (!correct) {
			wrongCount++;
			if (maxWrong !== null && wrongCount >= maxWrong) {
				phase = 'failed';
				return;
			}
		}

		if (correct && allSubgridsSolved) {
			setTimeout(() => { phase = 'final'; }, 400);
		}
	}

	function pickFinal(cellIndex: number) {
		if (finalResult === true) return;
		if (phase !== 'final') return;
		if (finalSelection === cellIndex) return;

		finalSelection = cellIndex;
		const correct = checkAnswer(puzzle.finalGrid, cellIndex);
		finalResult = correct;

		if (!correct) {
			wrongCount++;
			if (maxWrong !== null && wrongCount >= maxWrong) {
				phase = 'failed';
				return;
			}
		}

		if (correct) {
			setTimeout(() => { phase = 'complete'; }, 500);
		}
	}

	function newPuzzle() {
		puzzle = generatePuzzle(operatorMode);
		selections = Array(8).fill(null);
		results = Array(8).fill(null);
		finalSelection = null;
		finalResult = null;
		wrongCount = 0;
		phase = 'subgrids';
	}

	// ─── layout helpers ──────────────────────────────────────────────────────

	// Meta-grid positions 0–8, skip 4 (center). Maps slot → subGrid index.
	// positions: 0 1 2 / 3 _ 4 / 5 6 7  (meta index, skipping center=4)
	// We map meta-cell index to subgrid index:
	//   meta 0→sg0, 1→sg1, 2→sg2, 3→sg3, 4=center, 5→sg4, 6→sg5, 7→sg6, 8→sg7
	function subgridForMeta(metaIndex: number): number {
		return metaIndex < 4 ? metaIndex : metaIndex - 1;
	}
</script>

<svelte:head>
	<title>Kakooma — Math Games</title>
</svelte:head>

<div class="page">
	<a href="{base}/" class="back">← Back to games</a>

	<h1>Kakooma</h1>
	<p class="desc">
		In each grid, find the one number that is the <strong>{opLabel}</strong> of two other
		numbers in the same grid. Your answers feed into the final puzzle.
	</p>

	<details class="learn-details">
		<summary>Learn more</summary>
		<div class="learn-body">
			<h3>Kakooma</h3>
			<p>
				Kakooma was created by Greg Tang and is available at
				<a href="https://tangmath.com/" target="_blank" rel="noopener">Tang Math</a>.
				The puzzle sharpens mental arithmetic by requiring you to identify one number
				in a grid as the sum (or product) of two others.
			</p>
			<h4>The search problem</h4>
			<p>
				In a grid of n numbers there are n(n−1)/2 pairs to check — 10 pairs for 5 numbers,
				45 for 10. Scanning efficiently requires pattern recognition and arithmetic fluency
				at the same time. The structure is a restricted
				<a href="https://en.wikipedia.org/wiki/Subset_sum_problem" target="_blank" rel="noopener">subset sum problem</a>,
				limited to pairs rather than arbitrary subsets.
			</p>
		</div>
	</details>

	<!-- ── controls ── -->
	<div class="controls">
		<div class="control-row">
			<span class="control-label">Operator</span>
			<div class="seg-group">
				<button class="seg-btn" class:active={operatorMode === 'add'} onclick={() => setOperatorMode('add')}>+ Addition</button>
				<button class="seg-btn" class:active={operatorMode === 'mul'} onclick={() => setOperatorMode('mul')}>× Multiplication</button>
				<button class="seg-btn" class:active={operatorMode === 'both'} onclick={() => setOperatorMode('both')}>Both</button>
			</div>
		</div>
		<div class="control-row">
			<span class="control-label">Max mistakes</span>
			<div class="seg-group">
				<button class="seg-btn" class:active={maxWrong === 3} onclick={() => setMaxWrong(3)}>3</button>
				<button class="seg-btn" class:active={maxWrong === 5} onclick={() => setMaxWrong(5)}>5</button>
				<button class="seg-btn" class:active={maxWrong === 10} onclick={() => setMaxWrong(10)}>10</button>
				<button class="seg-btn" class:active={maxWrong === null} onclick={() => setMaxWrong(null)}>∞</button>
			</div>
			{#if maxWrong === null}
				{#if wrongCount > 0}
					<span class="status-label">{wrongCount} mistake{wrongCount === 1 ? '' : 's'}</span>
				{/if}
			{:else}
				<div class="pips">
					{#each Array(maxWrong) as _, i}
						<span class="pip" class:pip-used={i < wrongCount}></span>
					{/each}
				</div>
				<span class="status-label mistakes-label" class:danger={mistakesLeft !== null && mistakesLeft <= 2}>
					{mistakesLeft} left
				</span>
			{/if}
		</div>
	</div>

	<!-- ── banners ── -->
	{#if phase === 'complete'}
		<div class="banner banner-win">
			<span class="banner-emoji">🎉</span>
			<p>Puzzle complete!</p>
			<button class="btn" onclick={newPuzzle}>New puzzle</button>
		</div>
	{:else if phase === 'failed'}
		<div class="banner banner-fail">
			<span class="banner-emoji">💀</span>
			<p>Out of mistakes — better luck next time!</p>
			<button class="btn" onclick={newPuzzle}>Try again</button>
		</div>
	{/if}

	<!-- ── progress bar ── -->
	<div class="progress-section">
		<span class="status-label">{solvedCount}/8 grids</span>
		<div class="progress-track">
			<div class="progress-fill" style="width:{(solvedCount / 8) * 100}%"></div>
		</div>
	</div>

	<!-- ── meta grid ── -->
	<div class="meta-grid">
		{#each Array(9) as _, metaIdx}
			{#if metaIdx === 4}
				<!-- center = final puzzle -->
				<div
					class="meta-cell final-cell"
					class:locked={phase === 'subgrids'}
					class:active={phase === 'final'}
					class:solved={phase === 'complete'}
				>
					{#if phase === 'subgrids'}
						<div class="final-placeholder">
							<span class="final-lock">🔒</span>
							<span class="final-hint">Solve all 8 grids to unlock</span>
						</div>
					{:else}
						<!-- final puzzle grid -->
						{@render subGridView(puzzle.finalGrid, finalAnswers, finalSelection, finalResult, (ci) => pickFinal(ci))}
					{/if}
				</div>
			{:else}
				{@const sgIdx = subgridForMeta(metaIdx)}
				{@const grid = puzzle.subGrids[sgIdx]}
				{@const sel = selections[sgIdx]}
				{@const res = results[sgIdx]}
				<div class="meta-cell" class:solved={res === true}>
					{@render subGridView(grid, null, sel, res, (ci) => pickSubgrid(sgIdx, ci))}
				</div>
			{/if}
		{/each}
	</div>

	{#if phase !== 'complete'}
		<div class="actions">
			<button class="btn btn-secondary" onclick={newPuzzle}>New puzzle</button>
		</div>
	{/if}
</div>

<!-- ── subgrid snippet ── -->
{#snippet subGridView(
	grid: SubGrid,
	overrideNumbers: number[] | null,
	sel: number | null,
	res: boolean | null,
	onPick: (cellIndex: number) => void
)}
	{@const nums = overrideNumbers ?? grid.numbers}
	<div class="subgrid" class:grid-solved={res === true}>
		{#each Array(9) as _, ci}
			{#if ci === 4}
				<div class="cell cell-op">{grid.operator}</div>
			{:else}
				{@const numIdx = ci < 4 ? ci : ci - 1}
				{@const n = nums[numIdx]}
				{@const isSel = sel === numIdx}
				{@const isCorrect = isSel && res === true}
				{@const isWrong = isSel && res === false}
				{@const isSource = res === true && !isSel && grid.sourceIndices.includes(numIdx)}
				<button
					class="cell cell-num"
					class:selected={isSel}
					class:correct={isCorrect}
					class:wrong={isWrong}
					class:source={isSource}
					class:locked={res === true && !isSel && !isSource}
					onclick={() => onPick(numIdx)}
					disabled={res === true}
				>
					{n}
				</button>
			{/if}
		{/each}
	</div>
{/snippet}

<style>
	.page {
		max-width: 700px;
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


	/* ── controls ── */
	.controls {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		margin-bottom: 1.25rem;
	}

	.control-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.control-label {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		white-space: nowrap;
		min-width: 6rem;
	}

	.seg-group {
		display: flex;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.seg-btn {
		padding: 0.35rem 0.75rem;
		background: transparent;
		border: none;
		border-right: 1px solid var(--color-border);
		color: var(--color-text-muted);
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
		white-space: nowrap;
	}

	.seg-btn:last-child {
		border-right: none;
	}

	.seg-btn:hover:not(.active) {
		background: var(--color-surface-2);
		color: var(--color-text);
	}

	.seg-btn.active {
		background: var(--color-accent);
		color: #fff;
	}

	/* ── progress bar ── */
	.progress-section {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-bottom: 1.25rem;
	}

	.status-label {
		font-size: 0.82rem;
		color: var(--color-text-muted);
		white-space: nowrap;
	}

	.mistakes-label {
		min-width: 3.5rem;
	}

	.mistakes-label.danger {
		color: #f87171;
		font-weight: 700;
	}

	.progress-track {
		flex: 1;
		height: 6px;
		background: var(--color-surface-2);
		border-radius: 99px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--color-accent);
		border-radius: 99px;
		transition: width 0.3s ease;
	}

	.pips {
		display: flex;
		gap: 4px;
	}

	.pip {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--color-surface-2);
		border: 1.5px solid var(--color-border);
		transition: background 0.2s, border-color 0.2s;
	}

	.pip.pip-used {
		background: #f87171;
		border-color: #f87171;
	}

	/* ── meta grid ── */
	.meta-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}

	.meta-cell {
		background: var(--color-surface);
		border: 2px solid var(--color-border);
		border-radius: var(--radius);
		padding: 6px;
		transition: border-color 0.2s;
		aspect-ratio: 1;
		overflow: hidden;
	}

	.meta-cell.solved {
		border-color: rgba(74, 222, 128, 0.5);
	}

	.meta-cell.final-cell {
		background: var(--color-surface-2);
	}

	.meta-cell.final-cell.active {
		border-color: var(--color-accent);
		box-shadow: 0 0 0 3px rgba(108, 139, 239, 0.15);
	}

	.meta-cell.final-cell.solved {
		border-color: #4ade80;
		box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.12);
	}

	/* ── final placeholder ── */
	.final-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 0.5rem;
		padding: 0.5rem;
	}

	.final-lock {
		font-size: 1.8rem;
		opacity: 0.4;
	}

	.final-hint {
		font-size: clamp(0.6rem, 1.5vw, 0.75rem);
		color: var(--color-text-muted);
		text-align: center;
		line-height: 1.4;
	}

	/* ── subgrid ── */
	.subgrid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 4px;
	}

	.subgrid.grid-solved .cell-num:not(.correct) {
		opacity: 0.45;
	}

	/* ── cells ── */
	.cell {
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		font-size: clamp(0.75rem, 1.8vw, 1rem);
		font-weight: 700;
		line-height: 1;
	}

	.cell-op {
		background: rgba(167, 139, 250, 0.22);
		color: var(--color-tag-number-theory);
		font-size: clamp(0.9rem, 2vw, 1.1rem);
		border: 2px solid rgba(167, 139, 250, 0.55);
		box-shadow: inset 0 0 0 1px rgba(167, 139, 250, 0.1);
	}

	.cell-num {
		background: var(--color-surface-2);
		border: 2px solid transparent;
		color: var(--color-text);
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s,
			transform 0.1s;
	}

	.cell-num:hover:not(:disabled) {
		background: rgba(108, 139, 239, 0.15);
		border-color: var(--color-accent);
		transform: scale(1.06);
	}

	.cell-num.selected {
		border-color: var(--color-accent);
		background: rgba(108, 139, 239, 0.18);
	}

	.cell-num.correct {
		border-color: #4ade80;
		background: rgba(74, 222, 128, 0.18);
		color: #4ade80;
	}

	.cell-num.wrong {
		border-color: #f87171;
		background: rgba(248, 113, 113, 0.18);
		color: #f87171;
		animation: shake 0.3s ease;
	}

	.cell-num.source {
		border-color: rgba(245, 158, 11, 0.5);
		background: rgba(245, 158, 11, 0.1);
		color: var(--color-tag-logic);
	}

	.cell-num.locked {
		cursor: default;
	}

	@keyframes shake {
		0%   { transform: translateX(0); }
		25%  { transform: translateX(-4px); }
		75%  { transform: translateX(4px); }
		100% { transform: translateX(0); }
	}

	/* ── win banner ── */
	.banner {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.25rem;
		border-radius: var(--radius);
		margin-bottom: 1.5rem;
		border: 1px solid var(--color-border);
	}

	.banner-win {
		background: rgba(74, 222, 128, 0.08);
		border-color: rgba(74, 222, 128, 0.4);
	}

	.banner-fail {
		background: rgba(248, 113, 113, 0.08);
		border-color: rgba(248, 113, 113, 0.4);
	}

	.banner-emoji {
		font-size: 1.5rem;
	}

	.banner p {
		flex: 1;
		font-weight: 600;
	}

	/* ── actions ── */
	.actions {
		margin-top: 1.5rem;
	}

	.btn {
		padding: 0.65rem 1.3rem;
		background: var(--color-accent);
		color: #fff;
		border: none;
		border-radius: var(--radius);
		font-size: 0.95rem;
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

	/* ── responsive ── */
	@media (max-width: 520px) {
		.meta-grid {
			gap: 6px;
		}

		.meta-cell {
			padding: 4px;
		}

		.subgrid {
			gap: 3px;
		}
	}
</style>
