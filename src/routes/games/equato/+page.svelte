<script lang="ts">
	import { base } from '$app/paths';
	import {
		generatePuzzle,
		getRowStatus,
		getColStatus,
		type EquatoPuzzle,
		type EqStatus,
		type Op
	} from '$lib/equato';

	// ─── state ───────────────────────────────────────────────────────────────

	let puzzle = $state<EquatoPuzzle>(generatePuzzle());
	let placement = $state<(number | null)[][]>(
		Array.from({ length: 4 }, () => Array(4).fill(null))
	);
	let selectedBankNum = $state<number | null>(null);
	let selectedCell = $state<{ r: number; c: number } | null>(null);

	// ─── derived ─────────────────────────────────────────────────────────────

	// Numbers from the bank that have been placed somewhere
	const bankPlaced = $derived.by(() => {
		const s = new Set<number>();
		for (let r = 0; r < 4; r++)
			for (let c = 0; c < 4; c++)
				if (placement[r][c] !== null) s.add(placement[r][c]!);
		return s;
	});

	// Effective grid: given numbers + player placements
	const currentGrid = $derived.by(() =>
		Array.from({ length: 4 }, (_, r) =>
			Array.from({ length: 4 }, (_, c) => puzzle.grid[r][c] ?? placement[r][c])
		)
	);

	const rowStatuses = $derived(
		Array.from({ length: 4 }, (_, r) => getRowStatus(r, currentGrid, puzzle.hOps))
	);
	const colStatuses = $derived(
		Array.from({ length: 4 }, (_, c) => getColStatus(c, currentGrid, puzzle.vOps))
	);
	const won = $derived(
		rowStatuses.every((s) => s === 'valid') && colStatuses.every((s) => s === 'valid')
	);
	const solvedCount = $derived(
		rowStatuses.filter((s) => s === 'valid').length +
			colStatuses.filter((s) => s === 'valid').length
	);

	// Map from "pr,pc" → EqStatus for every '=' cell in the physical grid
	const eqCellStatus = $derived.by(() => {
		const map = new Map<string, EqStatus>();
		for (let r = 0; r < 4; r++) {
			const eqColGap = puzzle.hOps[r].indexOf('=' as Op);
			map.set(`${2 * r},${2 * eqColGap + 1}`, rowStatuses[r]);
		}
		for (let c = 0; c < 4; c++) {
			const colOps = [0, 1, 2].map((r) => puzzle.vOps[r][c]);
			const eqRowGap = colOps.indexOf('=' as Op);
			map.set(`${2 * eqRowGap + 1},${2 * c}`, colStatuses[c]);
		}
		return map;
	});

	// ─── interaction ─────────────────────────────────────────────────────────

	function clickBankNum(n: number) {
		if (bankPlaced.has(n)) return;
		if (selectedCell !== null) {
			// Cell already selected — place number directly into it
			placement[selectedCell.r][selectedCell.c] = n;
			selectedCell = null;
		} else {
			selectedBankNum = selectedBankNum === n ? null : n;
		}
	}

	function clickCell(r: number, c: number) {
		const isBlank = puzzle.grid[r][c] === null;
		if (!isBlank) return;

		if (selectedBankNum !== null) {
			// Bank number already selected — place it
			placement[r][c] = selectedBankNum;
			selectedBankNum = null;
			selectedCell = null;
		} else if (selectedCell?.r === r && selectedCell?.c === c) {
			// Tap same cell again — deselect
			selectedCell = null;
		} else if (placement[r][c] !== null) {
			// Filled cell, no selection — return number to bank
			placement[r][c] = null;
			selectedCell = null;
		} else {
			// Empty cell, no selection — select it, wait for bank number
			selectedCell = { r, c };
		}
	}

	function newPuzzle() {
		puzzle = generatePuzzle();
		placement = Array.from({ length: 4 }, () => Array(4).fill(null));
		selectedBankNum = null;
		selectedCell = null;
	}

	// ─── physical grid helpers ────────────────────────────────────────────────

	// Physical grid is 7×7:
	//   pr%2===0, pc%2===0 → number cell at (pr/2, pc/2)
	//   pr%2===0, pc%2===1 → horizontal op hOps[pr/2][(pc-1)/2]
	//   pr%2===1, pc%2===0 → vertical op vOps[(pr-1)/2][pc/2]
	//   pr%2===1, pc%2===1 → gray decorative cell
	function getCellInfo(pr: number, pc: number) {
		if (pr % 2 === 0 && pc % 2 === 0) {
			const r = pr / 2;
			const c = pc / 2;
			return { type: 'num' as const, r, c };
		}
		if (pr % 2 === 0 && pc % 2 === 1) {
			const r = pr / 2;
			const colGap = (pc - 1) / 2;
			return { type: 'hop' as const, op: puzzle.hOps[r][colGap], pr, pc };
		}
		if (pr % 2 === 1 && pc % 2 === 0) {
			const rowGap = (pr - 1) / 2;
			const c = pc / 2;
			return { type: 'vop' as const, op: puzzle.vOps[rowGap][c], pr, pc };
		}
		return { type: 'gray' as const };
	}
</script>

<svelte:head>
	<title>Equato — Math Games</title>
</svelte:head>

<div class="page">
	<a href="{base}/" class="back">← Back to games</a>

	<h1>Equato</h1>
	<p class="desc">
		Use each number from the bank exactly once to complete the equations.
		Read equations <strong>left to right</strong> and <strong>top to bottom</strong>,
		applying operations as you encounter them (ignoring usual "order of operations" rules).
	</p>

	<!-- ── bank ── -->
	<div class="bank-section">
		<p class="bank-label">Number Bank</p>
		<div class="bank">
			{#each puzzle.bank as n}
				{@const placed = bankPlaced.has(n)}
				{@const selected = selectedBankNum === n}
				<button
					class="bank-num"
					class:placed
					class:selected
					onclick={() => clickBankNum(n)}
					disabled={placed}
				>
					{n}
				</button>
			{/each}
		</div>
	</div>

	<!-- ── win banner ── -->
	{#if won}
		<div class="banner banner-win">
			<span>🎉</span>
			<p>All equations solved!</p>
			<button class="btn" onclick={newPuzzle}>New puzzle</button>
		</div>
	{/if}

	<!-- ── puzzle grid ── -->
	<div class="grid-wrapper">
		<div class="puzzle-grid">
			{#each Array(7) as _, pr}
				{#each Array(7) as _, pc}
					{@const info = getCellInfo(pr, pc)}

					{#if info.type === 'num'}
						{@const { r, c } = info}
						{@const given = puzzle.grid[r][c]}
						{@const placed = placement[r][c]}
						{@const isBlank = given === null}
						{@const isEmpty = isBlank && placed === null}
						{@const isTarget = isEmpty && selectedBankNum !== null}
						{@const isCellSelected = selectedCell?.r === r && selectedCell?.c === c}
						<button
							class="cell num-cell"
							class:given={!isBlank}
							class:blank={isEmpty}
							class:filled={isBlank && placed !== null}
							class:target={isTarget}
							class:cell-selected={isCellSelected}
							onclick={() => clickCell(r, c)}
							disabled={!isBlank}
						>
							{given ?? placed ?? ''}
						</button>

					{:else if info.type === 'hop' || info.type === 'vop'}
						{@const status = eqCellStatus.get(`${info.pr},${info.pc}`)}
						<div
							class="cell op-cell"
							class:eq-valid={info.op === '=' && status === 'valid'}
							class:eq-invalid={info.op === '=' && status === 'invalid'}
						>
							{info.op}
						</div>

					{:else}
						<div class="cell gray-cell"></div>
					{/if}
				{/each}
			{/each}
		</div>
	</div>

	<!-- ── status + actions ── -->
	<div class="footer">
		<p class="status-text">{solvedCount} / 8 equations solved</p>
		<div class="actions">
			{#if selectedBankNum !== null || selectedCell !== null}
				<button class="btn btn-secondary" onclick={() => { selectedBankNum = null; selectedCell = null; }}>
					Cancel selection
				</button>
			{/if}
			<button class="btn btn-secondary" onclick={newPuzzle}>New puzzle</button>
		</div>
	</div>
</div>

<style>
	.page {
		max-width: 520px;
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
		line-height: 1.6;
	}

	/* ── bank ── */
	.bank-section {
		margin-bottom: 1.5rem;
	}

	.bank-label {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-muted);
		margin-bottom: 0.5rem;
	}

	.bank {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.bank-num {
		width: 2.5rem;
		height: 2.5rem;
		background: var(--color-surface);
		border: 2px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text);
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s, opacity 0.15s;
	}

	.bank-num:hover:not(.placed):not(.selected) {
		border-color: var(--color-accent);
		background: rgba(108, 139, 239, 0.1);
	}

	.bank-num.selected {
		background: var(--color-accent);
		border-color: var(--color-accent);
		color: #fff;
	}

	.bank-num.placed {
		opacity: 0.25;
		cursor: default;
	}

	/* ── win banner ── */
	.banner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.9rem 1.1rem;
		border-radius: var(--radius);
		margin-bottom: 1.25rem;
		border: 1px solid;
		font-weight: 600;
	}

	.banner p { flex: 1; }

	.banner-win {
		background: rgba(74, 222, 128, 0.08);
		border-color: rgba(74, 222, 128, 0.4);
	}

	/* ── grid ── */
	.grid-wrapper {
		width: 100%;
		max-width: 420px;
		aspect-ratio: 1;
		margin: 0 auto 1.5rem;
	}

	.puzzle-grid {
		display: grid;
		width: 100%;
		height: 100%;
		grid-template-columns: 5fr 2fr 5fr 2fr 5fr 2fr 5fr;
		grid-template-rows: 5fr 2fr 5fr 2fr 5fr 2fr 5fr;
		gap: 3px;
	}

	/* ── cells ── */
	.cell {
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		font-weight: 700;
	}

	.num-cell {
		background: var(--color-surface);
		border: 2px solid var(--color-border);
		font-size: clamp(0.85rem, 2.5vw, 1.1rem);
		color: var(--color-text);
		transition: background 0.15s, border-color 0.15s;
	}

	.num-cell.given {
		background: var(--color-surface-2);
		cursor: default;
	}

	.num-cell.blank {
		border-style: dashed;
		border-color: var(--color-border);
		color: var(--color-text-muted);
		cursor: pointer;
	}

	.num-cell.blank:hover,
	.num-cell.target {
		border-color: var(--color-accent);
		background: rgba(108, 139, 239, 0.08);
	}

	.num-cell.cell-selected {
		border-color: var(--color-accent);
		background: rgba(108, 139, 239, 0.18);
		outline: 2px solid var(--color-accent);
		outline-offset: -2px;
	}

	.num-cell.filled {
		border-style: solid;
		border-color: var(--color-accent);
		background: rgba(108, 139, 239, 0.12);
		color: var(--color-accent);
		cursor: pointer;
	}

	.num-cell.filled:hover {
		background: rgba(108, 139, 239, 0.2);
	}

	.op-cell {
		background: transparent;
		font-size: clamp(0.9rem, 2.5vw, 1.1rem);
		color: var(--color-text-muted);
		transition: color 0.2s;
	}

	.op-cell.eq-valid {
		color: #4ade80;
		font-weight: 800;
	}

	.op-cell.eq-invalid {
		color: #f87171;
	}

	.gray-cell {
		background: var(--color-surface-2);
		opacity: 0.5;
		border-radius: 2px;
	}

	/* ── footer ── */
	.footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.status-text {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.actions {
		display: flex;
		gap: 0.5rem;
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
</style>
