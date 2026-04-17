<script lang="ts">
	import { base } from '$app/paths';

	const LENGTH_OPTIONS = [4, 5, 6];

	// ── settings ──────────────────────────────────────────────────────────────
	let codeLength  = $state(4);
	let bestGuesses = $state(0); // 0 = no record

	function setCodeLength(n: number) { codeLength = n; bestGuesses = 0; }

	// ── game state ─────────────────────────────────────────────────────────────
	type Phase = 'idle' | 'playing' | 'done';

	interface Guess { digits: string; bulls: number; cows: number; }

	let phase      = $state<Phase>('idle');
	let secret     = $state('');
	let guesses    = $state<Guess[]>([]);
	let input      = $state('');
	let errorMsg   = $state('');
	let shake      = $state(false);
	let gaveUp     = $state(false);
	let historyEl  = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (guesses.length > 0 && historyEl) historyEl.scrollTop = historyEl.scrollHeight;
	});

	// ── logic ──────────────────────────────────────────────────────────────────
	function generateSecret(): string {
		const pool = '0123456789'.split('');
		for (let i = pool.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[pool[i], pool[j]] = [pool[j], pool[i]];
		}
		return pool.slice(0, codeLength).join('');
	}

	function calcScore(guess: string): { bulls: number; cows: number } {
		let bulls = 0, cows = 0;
		for (let i = 0; i < codeLength; i++) {
			if (guess[i] === secret[i]) bulls++;
			else if (secret.includes(guess[i])) cows++;
		}
		return { bulls, cows };
	}

	// ── game flow ──────────────────────────────────────────────────────────────
	function startGame() {
		secret   = generateSecret();
		guesses  = [];
		input    = '';
		errorMsg = '';
		gaveUp   = false;
		phase    = 'playing';
	}

	function submit() {
		const g = input.trim();
		if (g.length !== codeLength) {
			errorMsg = `Enter exactly ${codeLength} digits`;
			triggerShake(); return;
		}
		if (new Set(g).size !== codeLength) {
			errorMsg = 'No repeated digits allowed';
			triggerShake(); return;
		}
		errorMsg = '';

		const { bulls, cows } = calcScore(g);
		guesses = [...guesses, { digits: g, bulls, cows }];
		input   = '';

		if (bulls === codeLength) {
			if (bestGuesses === 0 || guesses.length < bestGuesses) bestGuesses = guesses.length;
			phase = 'done';
		}
	}

	function giveUp() {
		gaveUp = true;
		phase  = 'done';
	}

	function triggerShake() {
		shake = true;
		setTimeout(() => (shake = false), 400);
	}

	function handleKey(e: KeyboardEvent) { if (e.key === 'Enter') submit(); }

	// Strip non-digits and enforce max length directly on the input element
	function handleInput(e: Event) {
		const el = e.target as HTMLInputElement;
		const clean = el.value.replace(/\D/g, '').slice(0, codeLength);
		el.value = clean;
		input = clean;
		if (errorMsg) errorMsg = '';
	}
</script>

<svelte:head>
	<title>Bulls &amp; Cows — Math Games</title>
</svelte:head>

<div class="page">
	<a href="{base}/" class="back">← Back to games</a>
	<h1>Bulls &amp; Cows</h1>

	<p class="desc">
		Crack the secret code — {codeLength} unique digits chosen from 0–9.
		Each guess tells you how many digits are exactly right (<strong>bulls</strong>)
		and how many are right but in the wrong position (<strong>cows</strong>).
	</p>

	<details class="learn-details">
		<summary>Learn more</summary>
		<div class="learn-body">
			<h3>Bulls &amp; Cows and Information Theory</h3>
			<p>
				<a href="https://en.wikipedia.org/wiki/Bulls_and_cows" target="_blank" rel="noopener">Bulls and Cows</a>
				is a pencil-and-paper code-breaking game that predates computing.
				The 1970 board game <a href="https://en.wikipedia.org/wiki/Mastermind_(board_game)" target="_blank" rel="noopener">Mastermind</a>
				popularised a colored-peg version.
			</p>
			<h4>Information-theoretic strategy</h4>
			<p>
				Each response eliminates some fraction of remaining candidate codes.
				An optimal strategy maximises the minimum information gained per guess,
				shrinking the candidate pool as fast as possible.
				<a href="https://en.wikipedia.org/wiki/Information_theory" target="_blank" rel="noopener">Information theory</a>
				frames this as maximising the entropy of the response distribution.
			</p>
			<h4>Knuth's minimax algorithm</h4>
			<p>
				Donald Knuth proved in 1977 that Mastermind (4 pegs, 6 colors) can always be solved
				in at most 5 guesses using a minimax strategy: choose the guess that minimises the
				worst-case number of remaining possibilities.
				See: <a href="https://en.wikipedia.org/wiki/Mastermind_(board_game)#Algorithms" target="_blank" rel="noopener">Mastermind algorithms</a>.
			</p>
		</div>
	</details>

	<!-- ══ IDLE ══════════════════════════════════════════════════════════════ -->
	{#if phase === 'idle'}
		<div class="settings">
			<div class="setting-row">
				<span class="setting-label">Code length</span>
				<div class="toggle-group">
					{#each LENGTH_OPTIONS as n}
						<button class="tog-btn" class:active={codeLength === n}
							onclick={() => setCodeLength(n)}>{n} digits</button>
					{/each}
				</div>
			</div>
		</div>

		<div class="center">
			{#if bestGuesses > 0}
				<p class="best-score">Best: {bestGuesses} guess{bestGuesses !== 1 ? 'es' : ''}</p>
			{/if}
			<button class="btn large" onclick={startGame}>Start</button>
		</div>

	<!-- ══ PLAYING ════════════════════════════════════════════════════════════ -->
	{:else if phase === 'playing'}
		<div class="game-card">
			<div class="game-meta">
				<span>{codeLength} unique digits · 0–9</span>
				<span>Guess {guesses.length + 1}</span>
			</div>

			<div class="history" class:history-empty={guesses.length === 0} bind:this={historyEl}>
				{#if guesses.length === 0}
					<p class="empty-hint">Make your first guess below</p>
				{/if}
				{#each guesses as g, i}
					<div class="guess-row">
						<span class="guess-n">{i + 1}</span>
						<div class="guess-digits">
							{#each g.digits.split('') as d}
								<span class="dbox">{d}</span>
							{/each}
						</div>
						<div class="guess-score">
							<span class="score-bulls">{g.bulls}<span class="score-lbl">B<span class="bovinemoji">🐂</span></span></span>
							<span class="score-cows">{g.cows}<span class="score-lbl">C<span class="bovinemoji">🐄</span></span></span>
						</div>
					</div>
				{/each}
			</div>

			<div class="input-area">
				<div class="input-row" class:shake>
					<input
						type="text"
						inputmode="numeric"
						placeholder={'—'.repeat(codeLength)}
						autocomplete="off"
						autofocus
						bind:value={input}
						oninput={handleInput}
						onkeydown={handleKey}
					/>
					<button class="btn" onclick={submit}>Guess</button>
				</div>
				{#if errorMsg}
					<p class="error-msg">{errorMsg}</p>
				{:else}
					<p class="input-hint">{codeLength} unique digits, no repeats</p>
				{/if}
			</div>

			<div class="card-actions">
				<button class="btn btn-ghost" onclick={() => (phase = 'idle')}>New Game</button>
				<button class="btn btn-ghost" onclick={giveUp}>Give Up</button>
			</div>
		</div>

	<!-- ══ DONE ══════════════════════════════════════════════════════════════ -->
	{:else}
		<div class="result-card">
			{#if gaveUp}
				<p class="result-label">The code was</p>
				<div class="secret-reveal">
					{#each secret.split('') as d}
						<span class="dbox dbox-lg">{d}</span>
					{/each}
				</div>
				<p class="result-msg">Better luck next time!</p>
			{:else}
				<p class="result-label">Cracked it!</p>
				<p class="result-score">
					{guesses.length} <span>guess{guesses.length !== 1 ? 'es' : ''}</span>
				</p>
				{#if guesses.length === bestGuesses}
					<p class="new-best">New best!</p>
				{/if}
			{/if}
			<div class="result-actions">
				<button class="btn large" onclick={startGame}>Play again</button>
				<button class="btn large btn-ghost" onclick={() => (phase = 'idle')}>Settings</button>
			</div>
		</div>

		{#if guesses.length > 0}
			<div class="review">
				<p class="review-title">Guess history</p>
				<div class="history">
					{#each guesses as g, i}
						<div class="guess-row">
							<span class="guess-n">{i + 1}</span>
							<div class="guess-digits">
								{#each g.digits.split('') as d}
									<span class="dbox">{d}</span>
								{/each}
							</div>
							<div class="guess-score">
								<span class="score-bulls">{g.bulls}<span class="score-lbl">B<span class="bovinemoji">🐂</span></span></span>
								<span class="score-cows">{g.cows}<span class="score-lbl">C<span class="bovinemoji">🐄</span></span></span>
							</div>
						</div>
					{/each}
				</div>
			</div>
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

	h1 { font-size: 2rem; font-weight: 800; margin-bottom: 0.4rem; }


	/* ── settings ── */
	.settings {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 1rem 1.25rem;
		margin-bottom: 1.75rem;
	}

	.setting-row { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }

	.setting-label {
		font-size: 0.82rem; font-weight: 600;
		color: var(--color-text-muted); min-width: 5.5rem;
	}

	.toggle-group { display: flex; gap: 0.35rem; flex-wrap: wrap; }

	.tog-btn {
		padding: 0.3rem 0.8rem;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text-muted);
		font-size: 0.9rem; font-weight: 700;
		transition: background 0.15s, border-color 0.15s, color 0.15s;
	}

	.tog-btn:hover:not(.active) { border-color: var(--color-accent); color: var(--color-text); }
	.tog-btn.active { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }

	.center { display: flex; flex-direction: column; align-items: center; gap: 1rem; }

	.best-score { font-size: 0.9rem; color: var(--color-text-muted); }

	/* ── game card ── */
	.game-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		overflow: hidden;
	}

	.game-meta {
		display: flex;
		justify-content: space-between;
		padding: 0.75rem 1.25rem;
		font-size: 0.82rem;
		color: var(--color-text-muted);
		border-bottom: 1px solid var(--color-border);
	}

	/* ── history ── */
	.history {
		padding: 0.5rem 1rem;
		min-height: 80px;
		max-height: 340px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.history-empty { align-items: center; justify-content: center; }

	.empty-hint {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		text-align: center;
		opacity: 0.6;
		padding: 1rem 0;
	}

	.guess-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.3rem 0;
	}

	.guess-n {
		font-size: 0.72rem;
		color: var(--color-text-muted);
		min-width: 1.1rem;
		text-align: right;
		flex-shrink: 0;
	}

	.guess-digits { display: flex; gap: 0.3rem; flex-shrink: 0; }

	.dbox {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.1rem;
		height: 2.1rem;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-size: 1rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.dbox-lg {
		width: 2.8rem;
		height: 2.8rem;
		font-size: 1.4rem;
	}

	.guess-score {
		display: flex;
		gap: 0.6rem;
		margin-left: auto;
		flex-shrink: 0;
	}

	.score-bulls, .score-cows {
		font-size: 0.95rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.score-bulls { color: #4ade80; }
	.score-cows  { color: #f59e0b; }

	.score-lbl {
		font-size: 0.65rem;
		font-weight: 600;
		opacity: 0.8;
		margin-left: 1px;
	}

	/* ── input ── */
	.input-area {
		padding: 0.85rem 1.25rem 0.5rem;
		border-top: 1px solid var(--color-border);
	}

	.input-row {
		display: flex;
		gap: 0.65rem;
	}

	input[type='text'] {
		flex: 1;
		padding: 0.65rem 0.9rem;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		color: var(--color-text);
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		font-variant-numeric: tabular-nums;
		outline: none;
		transition: border-color 0.2s;
	}

	input[type='text']:focus { border-color: var(--color-accent); }

	.input-hint, .error-msg {
		font-size: 0.78rem;
		margin-top: 0.4rem;
		min-height: 1.1em;
	}

	.input-hint { color: var(--color-text-muted); }
	.error-msg  { color: #f87171; }

	.card-actions {
		display: flex;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem 1rem;
	}

	/* ── result ── */
	.result-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 2.5rem 1.5rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.result-label {
		color: var(--color-text-muted);
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.result-score {
		font-size: 3.5rem;
		font-weight: 800;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.result-score span { font-size: 1.5rem; color: var(--color-text-muted); font-weight: 400; }

	.result-msg { color: var(--color-text-muted); }

	.new-best {
		font-size: 0.85rem;
		font-weight: 700;
		color: #4ade80;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.secret-reveal {
		display: flex;
		gap: 0.4rem;
		margin: 0.25rem 0;
	}

	.result-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		justify-content: center;
		margin-top: 0.5rem;
	}

	/* ── review ── */
	.review-title {
		font-size: 0.78rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--color-text-muted);
		margin-bottom: 0.5rem;
	}

	.review .history {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		max-height: none;
		padding: 0.5rem 1rem;
	}

	/* ── buttons ── */
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

	/* ── shake ── */
	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		20%       { transform: translateX(-6px); }
		40%       { transform: translateX(6px); }
		60%       { transform: translateX(-4px); }
		80%       { transform: translateX(4px); }
	}

	.shake { animation: shake 0.4s ease; }

	.bovinemoji {
		/* display: inline-block;
		vertical-align: middle; */
		font-size: 1.75em;
	}
</style>
