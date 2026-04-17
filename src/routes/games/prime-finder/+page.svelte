<script lang="ts">
	import { base } from '$app/paths';

	let input = $state('');
	let result = $state<{ n: number; isPrime: boolean; factors: number[] } | null>(null);
	let shake = $state(false);

	function primeFactors(n: number): number[] {
		if (n < 2) return [];
		const factors: number[] = [];
		let d = 2;
		while (d * d <= n) {
			while (n % d === 0) {
				factors.push(d);
				n = Math.floor(n / d);
			}
			d++;
		}
		if (n > 1) factors.push(n);
		return factors;
	}

	function analyse() {
		const n = parseInt(input, 10);
		if (isNaN(n) || n < 2 || n > 1_000_000) {
			triggerShake();
			return;
		}
		const factors = primeFactors(n);
		result = { n, isPrime: factors.length === 1, factors };
	}

	function triggerShake() {
		shake = true;
		setTimeout(() => (shake = false), 400);
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Enter') analyse();
	}

	// Group repeated factors: [2,2,3] → [{base:2,exp:2},{base:3,exp:1}]
	function groupFactors(factors: number[]) {
		const map = new Map<number, number>();
		for (const f of factors) map.set(f, (map.get(f) ?? 0) + 1);
		return [...map.entries()].map(([base, exp]) => ({ base, exp }));
	}
</script>

<svelte:head>
	<title>Prime Finder — Math Games</title>
</svelte:head>

<div class="page">
	<a href="{base}/" class="back">← Back to games</a>

	<h1>Prime Finder</h1>
	<p class="desc">Enter any integer between 2 and 1,000,000 to check if it's prime and see its prime factorization.</p>

	<details class="learn-details">
		<summary>Learn more</summary>
		<div class="learn-body">
			<h3>Prime Numbers and Factorisation</h3>
			<p>
				The <a href="https://en.wikipedia.org/wiki/Fundamental_theorem_of_arithmetic" target="_blank" rel="noopener">Fundamental Theorem of Arithmetic</a>
				states that every integer greater than 1 has a unique prime factorisation —
				primes are the "atoms" of the integers.
			</p>
			<h4>Primality testing</h4>
			<p>
				This tool uses trial division: test every integer up to √n.
				Only √n divisors need checking because if n = a × b with a ≤ b, then a ≤ √n.
				For very large numbers, probabilistic tests like
				<a href="https://en.wikipedia.org/wiki/Miller%E2%80%93Rabin_primality_test" target="_blank" rel="noopener">Miller–Rabin</a>
				are far faster and underpin modern cryptography.
			</p>
			<h4>How many primes are there?</h4>
			<p>
				Infinitely many — Euclid proved this around 300 BCE.
				The <a href="https://en.wikipedia.org/wiki/Prime_number_theorem" target="_blank" rel="noopener">Prime Number Theorem</a>
				(1896) quantifies their density: roughly 1 in ln(n) integers near n are prime.
				The <a href="https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes" target="_blank" rel="noopener">Sieve of Eratosthenes</a>
				efficiently finds all primes up to a limit by crossing out multiples.
			</p>
		</div>
	</details>

	<div class="input-row" class:shake>
		<input
			type="number"
			min="2"
			max="1000000"
			placeholder="Enter a number…"
			bind:value={input}
			onkeydown={handleKey}
			autofocus
		/>
		<button class="btn" onclick={analyse}>Analyse</button>
	</div>

	{#if result}
		<div class="result-card" class:prime={result.isPrime} class:composite={!result.isPrime}>
			<div class="verdict">
				{#if result.isPrime}
					<span class="badge prime-badge">Prime</span>
					<p class="verdict-text"><strong>{result.n}</strong> is a prime number.</p>
					<p class="verdict-sub">It has no divisors other than 1 and itself.</p>
				{:else}
					<span class="badge composite-badge">Composite</span>
					<p class="verdict-text"><strong>{result.n}</strong> is not prime.</p>
				{/if}
			</div>

			{#if !result.isPrime}
				<div class="factorization">
					<p class="factor-label">Prime factorization</p>
					<p class="factor-expr">
						{result.n} =
						{#each groupFactors(result.factors) as { base, exp }, i}
							{#if i > 0}<span class="op"> × </span>{/if}
							<span class="factor">{base}{#if exp > 1}<sup>{exp}</sup>{/if}</span>
						{/each}
					</p>
				</div>

				<div class="divisors">
					<p class="factor-label">All divisors</p>
					<div class="divisor-list">
						{#each Array.from({ length: result.n }, (_, i) => i + 1).filter((d) => result!.n % d === 0) as d}
							<span class="divisor">{d}</span>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.page {
		max-width: 560px;
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


	.input-row {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
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
		white-space: nowrap;
	}

	.btn:hover {
		background: var(--color-accent-hover);
	}

	.result-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		transition: border-color 0.2s;
	}

	.result-card.prime {
		border-color: rgba(74, 222, 128, 0.4);
	}

	.result-card.composite {
		border-color: rgba(167, 139, 250, 0.4);
	}

	.verdict {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.badge {
		display: inline-block;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 0.2rem 0.55rem;
		border-radius: var(--radius-sm);
		width: fit-content;
		margin-bottom: 0.25rem;
	}

	.prime-badge {
		background: rgba(74, 222, 128, 0.15);
		color: var(--color-tag-arithmetic);
	}

	.composite-badge {
		background: rgba(167, 139, 250, 0.15);
		color: var(--color-tag-number-theory);
	}

	.verdict-text {
		font-size: 1.1rem;
	}

	.verdict-sub {
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}

	.factorization {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.factor-label {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-muted);
	}

	.factor-expr {
		font-size: 1.3rem;
		font-weight: 600;
		display: flex;
		align-items: baseline;
		gap: 0.1rem;
		flex-wrap: wrap;
	}

	.factor {
		color: var(--color-accent-hover);
	}

	.op {
		color: var(--color-text-muted);
	}

	.divisors {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.divisor-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.divisor {
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		padding: 0.25rem 0.6rem;
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
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
