<script lang="ts">
	import { base } from '$app/paths';

	type Phase      = 'idle' | 'playing' | 'won';
	type Variant    = 'normal' | 'misere';
	type Opponent   = 'human' | 'computer';
	type CompOrder  = 'first' | 'second';
	type Difficulty = 'easy' | 'medium' | 'hard';
	type NimSumMode = 'off' | 'sum' | 'full';

	// ── Settings (persist across games) ────────────────────────────────────────
	let customPiles = $state<number[]>([3, 4, 5]);
	let variant     = $state<Variant>('normal');
	let opponent    = $state<Opponent>('computer');
	let compOrder   = $state<CompOrder>('second');
	let difficulty  = $state<Difficulty>('medium');
	let nimSumMode  = $state<NimSumMode>('off');

	function randomizePiles() {
		const n = 2 + Math.floor(Math.random() * 4);
		customPiles = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 7));
	}

	function adjustPile(idx: number, delta: number) {
		customPiles = customPiles.map((p, i) =>
			i === idx ? Math.min(7, Math.max(1, p + delta)) : p
		);
	}

	function addPile() {
		if (customPiles.length < 5) customPiles = [...customPiles, 1];
	}

	function removePile(idx: number) {
		if (customPiles.length > 2) customPiles = customPiles.filter((_, i) => i !== idx);
	}

	// ── Game state ──────────────────────────────────────────────────────────────
	let phase         = $state<Phase>('idle');
	let piles         = $state<number[]>([]);
	let initialPiles  = $state<number[]>([]);
	let currentPlayer = $state<1 | 2>(1);
	let winner        = $state<1 | 2 | null>(null);
	let thinking        = $state(false);
	let compMovePreview = $state<{ pileIdx: number; newSize: number } | null>(null);
	let hoverPile     = $state(-1);
	let hoverIdx      = $state(-1);

	// ── Derived ─────────────────────────────────────────────────────────────────
	const computerPlayer    = $derived<1 | 2>(compOrder === 'first' ? 1 : 2);
	const isComputersTurn   = $derived(opponent === 'computer' && phase === 'playing' && currentPlayer === computerPlayer);
	const nimSum            = $derived(piles.reduce((xor, p) => xor ^ p, 0));
	const allPilesAtMostOne = $derived(piles.every(p => p <= 1));
	const isLosingPosition  = $derived(
		variant === 'normal'
			? nimSum === 0
			: (nimSum === 0 && !allPilesAtMostOne) || (nimSum !== 0 && allPilesAtMostOne)
	);

	// ── AI ──────────────────────────────────────────────────────────────────────
	function randomMove(ps: number[]): { pileIdx: number; newSize: number } {
		const nonEmpty = ps.flatMap((p, i) => p > 0 ? [i] : []);
		const pileIdx  = nonEmpty[Math.floor(Math.random() * nonEmpty.length)];
		const newSize  = Math.floor(Math.random() * ps[pileIdx]); // 0 .. ps[pileIdx]-1
		return { pileIdx, newSize };
	}

	function optimalMoveNormal(ps: number[]): { pileIdx: number; newSize: number } | null {
		const ns = ps.reduce((x, p) => x ^ p, 0);
		if (ns === 0) return null;
		for (let i = 0; i < ps.length; i++) {
			const target = ps[i] ^ ns;
			if (target < ps[i]) return { pileIdx: i, newSize: target };
		}
		return null;
	}

	function optimalMoveMisere(ps: number[]): { pileIdx: number; newSize: number } | null {
		const allSmall = ps.every(p => p <= 1);
		if (allSmall) {
			const nonEmpty = ps.filter(p => p === 1).length;
			if (nonEmpty % 2 === 0) {
				// N-position: take any one pile to leave odd count
				return { pileIdx: ps.findIndex(p => p === 1), newSize: 0 };
			}
			return null; // P-position
		}
		// Brute-force: find a move leaving a P-position for opponent
		for (let i = 0; i < ps.length; i++) {
			for (let ns = 0; ns < ps[i]; ns++) {
				const next       = ps.map((p, j) => j === i ? ns : p);
				const nextSmall  = next.every(p => p <= 1);
				const nextXor    = next.reduce((x, p) => x ^ p, 0);
				const leavesP    = nextSmall ? nextXor !== 0 : nextXor === 0;
				if (leavesP) return { pileIdx: i, newSize: ns };
			}
		}
		return null;
	}

	function getComputerMove(ps: number[]): { pileIdx: number; newSize: number } {
		const optFn   = variant === 'normal' ? optimalMoveNormal : optimalMoveMisere;
		const optimal = optFn(ps);

		if (difficulty === 'easy') return randomMove(ps);
		if (difficulty === 'hard') return optimal ?? randomMove(ps);

		// medium: winning position → 80% optimal, 20% random; losing → always random
		if (optimal !== null && Math.random() < 0.8) return optimal;
		return randomMove(ps);
	}

	// ── Actions ─────────────────────────────────────────────────────────────────
	function startGame() {
		initialPiles    = [...customPiles];
		piles           = [...initialPiles];
		currentPlayer   = 1;
		winner          = null;
		thinking        = false;
		compMovePreview = null;
		hoverPile       = -1;
		hoverIdx        = -1;
		phase           = 'playing';
	}

	function playAgain() {
		piles           = [...initialPiles];
		currentPlayer   = 1;
		winner          = null;
		thinking        = false;
		compMovePreview = null;
		hoverPile       = -1;
		hoverIdx        = -1;
		phase           = 'playing';
	}

	// Clicking object at oIdx keeps 0..oIdx-1, removes oIdx..end.
	function takeObjects(pileIdx: number, oIdx: number) {
		if (phase !== 'playing') return;
		piles     = piles.map((p, i) => i === pileIdx ? oIdx : p);
		hoverPile = -1;
		hoverIdx  = -1;
		if (piles.every(p => p === 0)) {
			winner = variant === 'normal' ? currentPlayer : (currentPlayer === 1 ? 2 : 1);
			phase  = 'won';
		} else {
			currentPlayer = currentPlayer === 1 ? 2 : 1;
		}
	}

	function clearHover() { hoverPile = -1; hoverIdx = -1; }

	// ── Computer turn trigger ───────────────────────────────────────────────────
	$effect(() => {
		if (!isComputersTurn) return;
		thinking = true;
		let t2: ReturnType<typeof setTimeout>;
		const t1 = setTimeout(() => {
			thinking        = false;
			const move      = getComputerMove(piles);
			compMovePreview = move;
			t2 = setTimeout(() => {
				compMovePreview = null;
				takeObjects(move.pileIdx, move.newSize);
			}, 700);
		}, 750);
		return () => { clearTimeout(t1); clearTimeout(t2); };
	});
</script>

<svelte:head>
	<title>Nim — Math Games</title>
</svelte:head>

<div class="page">
	<a href="{base}/" class="back">← Back to games</a>
	<h1>Nim</h1>

	<p class="desc">
		Take turns removing objects from piles. On your turn, pick one pile and
		remove as many objects as you like — at least one, up to the whole pile.
	</p>

	<details class="learn-details">
		<summary>Learn more</summary>
		<div class="learn-body">
			<h3>Nim and the Sprague–Grundy Theorem</h3>
			<p>
				<a href="https://en.wikipedia.org/wiki/Nim" target="_blank" rel="noopener">Nim</a>
				is one of the oldest combinatorial games, with a complete mathematical solution
				discovered by Charles Bouton in 1901.
			</p>
			<h4>Nim-sum</h4>
			<p>
				The key is the <em>nim-sum</em>: the bitwise XOR of all pile sizes.
				In normal play, nim-sum = 0 at the start of your turn means you are in a
				<em>losing position</em> against perfect play. If it is non-zero, a winning
				move always exists — reduce a pile so the nim-sum becomes 0.
			</p>
			<h4>Why XOR?</h4>
			<p>
				Think in binary. XOR cancels matching bits. A nim-sum of 0 means every bit
				position is balanced across all piles. Any move disturbs that balance, and
				the correct response always restores it.
			</p>
			<h4>Misère Nim</h4>
			<p>
				In <a href="https://en.wikipedia.org/wiki/Mis%C3%A8re" target="_blank" rel="noopener">misère</a>
				play the last player to move <em>loses</em>. The strategy matches normal play
				until every pile has size ≤ 1; at that point invert your goal — leave an odd
				number of single-object piles for your opponent.
			</p>
		</div>
	</details>

	<!-- ══ IDLE ══════════════════════════════════════════════════════════════════ -->
	{#if phase === 'idle'}
		<div class="settings">
			<div class="setting-row">
				<span class="setting-label">Starting piles</span>
				<button class="tog-btn" onclick={randomizePiles}>Randomize</button>
			</div>
			<div class="pile-editor">
				{#each customPiles as count, i}
					<div class="pile-edit-row">
						<div class="pile-dots-preview">
							{#each {length: count} as _}
								<span class="dot-preview"></span>
							{/each}
						</div>
						<button class="adj-btn" onclick={() => adjustPile(i, -1)} disabled={count <= 1}>−</button>
						<span class="pile-count-edit">{count}</span>
						<button class="adj-btn" onclick={() => adjustPile(i, +1)} disabled={count >= 7}>+</button>
						<button class="remove-pile-btn" onclick={() => removePile(i)} disabled={customPiles.length <= 2} aria-label="Remove pile">×</button>
					</div>
				{/each}
				{#if customPiles.length < 5}
					<button class="add-pile-btn" onclick={addPile}>+ Add pile</button>
				{/if}
			</div>
			<div class="setting-row">
				<span class="setting-label">Variant</span>
				<div class="toggle-group">
					<button class="tog-btn" class:active={variant === 'normal'} onclick={() => variant = 'normal'}>Normal — last to take wins</button>
					<button class="tog-btn" class:active={variant === 'misere'} onclick={() => variant = 'misere'}>Misère — last to take loses</button>
				</div>
			</div>
			<div class="setting-row">
				<span class="setting-label">Play against</span>
				<div class="toggle-group">
					<button class="tog-btn" class:active={opponent === 'computer'} onclick={() => opponent = 'computer'}>Computer</button>
					<button class="tog-btn" class:active={opponent === 'human'}    onclick={() => opponent = 'human'}>Human</button>
				</div>
			</div>
			{#if opponent === 'computer'}
				<div class="setting-row indent">
					<span class="setting-label">Computer goes</span>
					<div class="toggle-group">
						<button class="tog-btn" class:active={compOrder === 'first'}  onclick={() => compOrder = 'first'}>First</button>
						<button class="tog-btn" class:active={compOrder === 'second'} onclick={() => compOrder = 'second'}>Second</button>
					</div>
				</div>
				<div class="setting-row indent">
					<span class="setting-label">Difficulty</span>
					<div class="toggle-group">
						<button class="tog-btn" class:active={difficulty === 'easy'}   onclick={() => difficulty = 'easy'}>Easy</button>
						<button class="tog-btn" class:active={difficulty === 'medium'} onclick={() => difficulty = 'medium'}>Medium</button>
						<button class="tog-btn" class:active={difficulty === 'hard'}   onclick={() => difficulty = 'hard'}>Hard</button>
					</div>
				</div>
			{/if}
		</div>
		<div class="center">
			<button class="btn large" onclick={startGame}>Start Game</button>
		</div>

	<!-- ══ PLAYING / WON ═════════════════════════════════════════════════════════ -->
	{:else}

		<!-- Status -->
		<div class="status" class:st-won={phase === 'won'}>
			{#if phase === 'won'}
				<div class="won-row">
					{#if opponent === 'computer'}
						{#if winner === computerPlayer}
							<span class="comp-badge">Computer</span><strong> wins!</strong>
						{:else}
							<span class="you-badge">You</span><strong> win!</strong>
						{/if}
					{:else}
						<span class="player-badge p{winner}">Player {winner}</span><strong> wins!</strong>
					{/if}
				</div>
			{:else if thinking}
				<div class="turn-row">
					<span class="comp-badge">Computer</span>
					<span class="thinking-dots turn-hint">&nbsp;is thinking<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>
				</div>
			{:else}
				<div class="turn-row">
					{#if opponent === 'computer'}
						<span class="you-badge">Your</span>
						<span class="turn-hint">&nbsp;turn — click any object in a pile to take it and all to its right</span>
					{:else}
						<span class="player-badge p{currentPlayer}">Player {currentPlayer}</span>
						<span class="turn-hint">'s turn — click any object in a pile to take it and all to its right</span>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Variant reminder -->
		<div class="variant-note">
			{#if variant === 'normal'}
				Normal play — take the last object to win
			{:else}
				Misère — force your opponent to take the last object to win
			{/if}
		</div>

		<!-- Nim-sum strip -->
		<div class="nim-strip">
			<span class="nim-strip-lbl">Nim-sum</span>
			<div class="toggle-group">
				<button class="tog-btn sm" class:active={nimSumMode === 'off'}  onclick={() => nimSumMode = 'off'}>Off</button>
				<button class="tog-btn sm" class:active={nimSumMode === 'sum'}  onclick={() => nimSumMode = 'sum'}>Show</button>
				<button class="tog-btn sm" class:active={nimSumMode === 'full'} onclick={() => nimSumMode = 'full'}>+ hint</button>
			</div>
			{#if nimSumMode !== 'off'}
				<span class="nim-val" class:nim-zero={nimSum === 0 && phase !== 'won'}>{nimSum}</span>
				{#if nimSumMode === 'full' && phase !== 'won'}
					<span class="nim-hint">
						{isLosingPosition ? 'losing' : 'winning'} for {opponent === 'computer'
							? (currentPlayer === computerPlayer ? 'computer' : 'you')
							: `Player ${currentPlayer}`}
					</span>
				{/if}
			{/if}
		</div>

		<!-- Piles -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="piles-area" onmouseleave={clearHover}>
			{#each piles as pileSize, pIdx}
				<div class="pile-row">
					<span class="pile-label">Pile {pIdx + 1}</span>
					<div class="objects">
						{#if pileSize === 0}
							<span class="pile-empty">empty</span>
						{:else}
							{#each {length: pileSize} as _, oIdx}
								{@const removing    = hoverPile === pIdx && hoverIdx !== -1 && oIdx >= hoverIdx}
								{@const pulseRemove = compMovePreview !== null && compMovePreview.pileIdx === pIdx && oIdx >= compMovePreview.newSize}
								{@const disabled    = phase !== 'playing' || isComputersTurn || thinking}
								<button
									class="obj"
									class:removing
									class:pulse-remove={pulseRemove}
									class:disabled
									onmouseenter={() => { if (!disabled) { hoverPile = pIdx; hoverIdx = oIdx; } }}
									onclick={() => { if (!disabled) takeObjects(pIdx, oIdx); }}
									aria-label="Take {pileSize - oIdx} from pile {pIdx + 1}"
								></button>
							{/each}
						{/if}
					</div>
					<span class="pile-count">{pileSize}</span>
					{#if hoverPile === pIdx && hoverIdx !== -1 && pileSize > 0}
						<span class="take-preview">take {pileSize - hoverIdx}</span>
					{:else}
						<span class="take-preview-placeholder"></span>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Actions -->
		<div class="actions">
			<button class="btn btn-ghost" onclick={playAgain}>Play Again</button>
			<button class="btn btn-ghost" onclick={() => phase = 'idle'}>New Game</button>
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

	/* ── Settings ── */
	.settings {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 1rem 1.25rem;
		margin-bottom: 1.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.setting-row { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
	.setting-row.indent { padding-left: 1rem; border-left: 2px solid var(--color-border); }

	.setting-label {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--color-text-muted);
		min-width: 6.5rem;
	}

	.toggle-group { display: flex; gap: 0.35rem; flex-wrap: wrap; }

	.tog-btn {
		padding: 0.3rem 0.75rem;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text-muted);
		font-size: 0.85rem;
		font-weight: 600;
		transition: background 0.15s, border-color 0.15s, color 0.15s;
	}

	.tog-btn:hover:not(.active) { border-color: var(--color-accent); color: var(--color-text); }
	.tog-btn.active { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }
	.tog-btn.sm { padding: 0.2rem 0.55rem; font-size: 0.78rem; }

	/* ── Pile editor ── */
	.pile-editor {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding-left: 0.1rem;
	}

	.pile-edit-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.pile-dots-preview {
		display: flex;
		gap: 3px;
		align-items: center;
		width: 94px; /* 7 × 10px + 6 × 4px gap */
		flex-shrink: 0;
	}

	.dot-preview {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--color-accent);
		opacity: 0.6;
		flex-shrink: 0;
	}

	.adj-btn {
		width: 26px;
		height: 26px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-text);
		line-height: 1;
		padding: 0;
		transition: border-color 0.15s;
	}

	.adj-btn:hover:not(:disabled) { border-color: var(--color-accent); color: var(--color-accent); }
	.adj-btn:disabled { opacity: 0.3; cursor: default; }

	.pile-count-edit {
		font-size: 0.9rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		min-width: 1.2rem;
		text-align: center;
	}

	.remove-pile-btn {
		width: 22px;
		height: 22px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		color: var(--color-text-muted);
		padding: 0;
		transition: border-color 0.15s, color 0.15s;
	}

	.remove-pile-btn:hover:not(:disabled) { border-color: #f87171; color: #f87171; }
	.remove-pile-btn:disabled { opacity: 0.2; cursor: default; }

	.add-pile-btn {
		background: none;
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text-muted);
		font-size: 0.8rem;
		padding: 0.25rem 0.6rem;
		align-self: flex-start;
		transition: border-color 0.15s, color 0.15s;
	}

	.add-pile-btn:hover { border-color: var(--color-accent); color: var(--color-accent); }

	.center { display: flex; justify-content: center; }

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

	/* ── Status ── */
	.status {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 0.75rem 1rem;
		margin-bottom: 0.5rem;
		transition: border-color 0.2s;
	}

	.status.st-won { border-color: #d4b44a55; }

	.player-badge {
		display: inline-block;
		padding: 0.1rem 0.55rem;
		border-radius: 99px;
		font-size: 0.8rem;
		font-weight: 700;
	}

	.player-badge.p1 { background: #6c8bef22; color: #6c8bef; border: 1px solid #6c8bef44; }
	.player-badge.p2 { background: #fb923c22; color: #fb923c; border: 1px solid #fb923c44; }

	.you-badge {
		display: inline-block;
		padding: 0.1rem 0.55rem;
		border-radius: 99px;
		font-size: 0.8rem;
		font-weight: 700;
		background: #6c8bef22;
		color: #6c8bef;
		border: 1px solid #6c8bef44;
	}

	.comp-badge {
		display: inline-block;
		padding: 0.1rem 0.55rem;
		border-radius: 99px;
		font-size: 0.8rem;
		font-weight: 700;
		background: #a855f722;
		color: #a855f7;
		border: 1px solid #a855f744;
	}

	.won-row  { display: flex; align-items: center; gap: 0.25rem; flex-wrap: wrap; font-size: 0.95rem; }
	.turn-row { display: flex; align-items: center; flex-wrap: wrap; }
	.turn-hint { font-size: 0.82rem; color: var(--color-text-muted); }

	/* ── Thinking animation ── */
	@keyframes blink {
		0%, 100% { opacity: 0.2; }
		50%       { opacity: 1;   }
	}

	.thinking-dots .dot { animation: blink 1.2s infinite; }
	.thinking-dots .dot:nth-child(2) { animation-delay: 0.2s; }
	.thinking-dots .dot:nth-child(3) { animation-delay: 0.4s; }

	/* ── Variant reminder ── */
	.variant-note {
		font-size: 0.78rem;
		color: var(--color-text-muted);
		margin-bottom: 0.35rem;
		padding: 0 0.1rem;
	}

	/* ── Nim-sum strip ── */
	.nim-strip {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 0.75rem;
		padding: 0 0.1rem;
	}

	.nim-strip-lbl { font-size: 0.78rem; font-weight: 600; color: var(--color-text-muted); }

	.nim-val { font-size: 0.82rem; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--color-text); min-width: 1.5ch; }
	.nim-val.nim-zero { color: #f87171; }
	.nim-hint { font-size: 0.78rem; color: var(--color-text-muted); font-style: italic; }

	/* ── Piles ── */
	.piles-area {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 1rem 1.25rem;
		margin-bottom: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}

	.pile-row {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		min-height: 32px;
	}

	.pile-label { font-size: 0.72rem; font-weight: 600; color: var(--color-text-muted); min-width: 3.5rem; }

	.objects { display: flex; gap: 5px; flex: 1; align-items: center; flex-wrap: wrap; }

	.pile-empty { font-size: 0.78rem; color: var(--color-text-muted); font-style: italic; }

	.pile-count { font-size: 0.78rem; font-weight: 600; color: var(--color-text-muted); min-width: 1.5ch; text-align: right; font-variant-numeric: tabular-nums; }

	.take-preview { font-size: 0.75rem; font-weight: 600; color: #f87171; min-width: 4rem; font-style: italic; }
	.take-preview-placeholder { min-width: 4rem; }

	/* ── Object circles ── */
	.obj {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--color-surface-2);
		border: 1.5px solid var(--color-border);
		padding: 0;
		flex-shrink: 0;
		cursor: pointer;
		transition: background 0.1s, border-color 0.1s;
	}

	.obj:not(.disabled):hover { border-color: var(--color-accent); }

	.obj.removing { background: #3a1515; border-color: #f87171; }
	.obj.disabled { cursor: default; opacity: 0.55; }

	@keyframes pulse-remove {
		0%, 100% { transform: scale(1);    background: #3a1515; border-color: #f87171; box-shadow: none; }
		50%      { transform: scale(1.25); background: #5a2020; border-color: #ff9090; box-shadow: 0 0 8px #f8717188; }
	}

	.obj.pulse-remove {
		animation: pulse-remove 0.45s ease-in-out infinite;
	}

	/* ── Actions ── */
	.actions { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
</style>
