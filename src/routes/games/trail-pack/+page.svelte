<script lang="ts">
	import { base } from '$app/paths';

	// ── catalog ───────────────────────────────────────────────────────────────
	const CATALOG = [
		{ name: 'Tent',           weight: 2.4 },
		{ name: 'Sleeping Bag',   weight: 1.2 },
		{ name: 'Sleeping Pad',   weight: 0.5 },
		{ name: 'Water Filter',   weight: 0.2 },
		{ name: 'Water Bottle',   weight: 0.3 },
		{ name: 'Camp Stove',     weight: 0.4 },
		{ name: 'Fuel Canister',  weight: 0.3 },
		{ name: 'Cookpot',        weight: 0.4 },
		{ name: 'First Aid Kit',  weight: 0.3 },
		{ name: 'Headlamp',       weight: 0.1 },
		{ name: 'Rain Jacket',    weight: 0.5 },
		{ name: 'Warm Fleece',    weight: 0.4 },
		{ name: 'Map & Compass',  weight: 0.2 },
		{ name: 'Multi-tool',     weight: 0.2 },
		{ name: 'Paracord',       weight: 0.3 },
		{ name: 'Bear Canister',  weight: 1.0 },
		{ name: 'Trekking Poles', weight: 0.5 },
		{ name: 'Camera',         weight: 0.8 },
		{ name: 'Solar Charger',  weight: 0.4 },
		{ name: 'Extra Food',     weight: 0.8 },
	] as const;

	const COUNT_OPTIONS = [8, 10, 12, 16, 20] as const;

	// ── item icons (SVG strings, keyed by catalog name) ───────────────────────
	const SVG_ATTR = `width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"
		stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;

	const ICONS: Record<string, string> = {
		'Tent':
			`<svg ${SVG_ATTR}>
				<path d="M3 20L12 4L21 20H3Z"/>
				<path d="M11 20v-5h2v5"/>
			</svg>`,

		'Water Bottle':
			`<svg ${SVG_ATTR}>
				<rect x="9.5" y="3" width="5" height="2" rx=".5"/>
				<path d="M9.5 5L8 8V20Q8 21.5 9.5 21.5H14.5Q16 21.5 16 20V8L14.5 5Z"/>
				<line x1="8" y1="14" x2="16" y2="14"/>
			</svg>`,

		'Headlamp':
			`<svg ${SVG_ATTR}>
				<path d="M4 12Q12 5 20 12"/>
				<rect x="7" y="12" width="10" height="8" rx="1.5"/>
				<circle cx="12" cy="16" r="2.5"/>
			</svg>`,

		'First Aid Kit':
			`<svg ${SVG_ATTR}>
				<rect x="3" y="4" width="18" height="16" rx="2"/>
				<path d="M12 9v6M9 12h6"/>
			</svg>`,

		'Map & Compass':
			`<svg ${SVG_ATTR}>
				<circle cx="12" cy="12" r="9"/>
				<path d="M12 7L14 12L12 17L10 12Z"/>
				<circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>
			</svg>`,

		'Camera':
			`<svg ${SVG_ATTR}>
				<rect x="2" y="7" width="20" height="14" rx="2"/>
				<circle cx="12" cy="14" r="4"/>
				<circle cx="12" cy="14" r="1.5" fill="currentColor" stroke="none"/>
				<rect x="7" y="4" width="4" height="3" rx=".5"/>
			</svg>`,

		'Cookpot':
			`<svg ${SVG_ATTR}>
				<path d="M7 10h10v8a2 2 0 01-2 2H9a2 2 0 01-2-2v-8z"/>
				<line x1="5.5" y1="10" x2="18.5" y2="10"/>
				<rect x="10" y="7" width="4" height="3" rx=".5"/>
				<line x1="3" y1="13" x2="7" y2="13"/>
				<line x1="17" y1="13" x2="21" y2="13"/>
			</svg>`,

		'Trekking Poles':
			`<svg ${SVG_ATTR}>
				<line x1="7" y1="3" x2="3" y2="21"/>
				<line x1="17" y1="3" x2="21" y2="21"/>
				<line x1="5.5" y1="9" x2="18.5" y2="9"/>
			</svg>`,

		'Solar Charger':
			`<svg ${SVG_ATTR}>
				<rect x="2" y="7" width="16" height="10" rx="1"/>
				<line x1="7.3" y1="7" x2="7.3" y2="17"/>
				<line x1="12.7" y1="7" x2="12.7" y2="17"/>
				<line x1="2" y1="12" x2="18" y2="12"/>
				<line x1="18" y1="12" x2="22" y2="12"/>
			</svg>`,

		'Sleeping Bag':
			`<svg ${SVG_ATTR}>
				<path d="M9 4h6Q17 4 17 6V18Q17 21 12 21Q7 21 7 18V6Q7 4 9 4Z"/>
				<path d="M9.5 7Q12 5.5 14.5 7"/>
				<line x1="12" y1="8" x2="12" y2="20"/>
			</svg>`,

		'Camp Stove':
			`<svg ${SVG_ATTR}>
				<circle cx="12" cy="7" r="5"/>
				<line x1="9" y1="12" x2="5" y2="21"/>
				<line x1="12" y1="12" x2="12" y2="21"/>
				<line x1="15" y1="12" x2="19" y2="21"/>
			</svg>`,

		'Rain Jacket':
			`<svg ${SVG_ATTR}>
				<path d="M12 3L7 6H2V14H7V22H17V14H22V6H17Z"/>
				<line x1="12" y1="4" x2="12" y2="22"/>
			</svg>`,

		'Bear Canister':
			`<svg ${SVG_ATTR}>
				<rect x="5" y="9" width="14" height="12" rx="1.5"/>
				<rect x="6" y="6" width="12" height="3" rx="1"/>
				<line x1="5" y1="9" x2="19" y2="9"/>
			</svg>`,

		'Multi-tool':
			`<svg ${SVG_ATTR}>
				<rect x="3" y="10" width="11" height="4" rx="1.5"/>
				<path d="M14 10L21 12L14 14Z"/>
			</svg>`,

		'Paracord':
			`<svg ${SVG_ATTR}>
				<circle cx="12" cy="12" r="7.5"/>
				<circle cx="12" cy="12" r="4"/>
				<path d="M12 4.5Q15 3 17 5"/>
			</svg>`,

		'Sleeping Pad':
			`<svg ${SVG_ATTR}>
				<line x1="4" y1="8" x2="20" y2="8"/>
				<line x1="4" y1="16" x2="20" y2="16"/>
				<path d="M4 8Q1 12 4 16"/>
				<path d="M20 8Q23 12 20 16"/>
				<line x1="9.5" y1="8" x2="9.5" y2="16"/>
				<line x1="14.5" y1="8" x2="14.5" y2="16"/>
			</svg>`,

		'Water Filter':
			`<svg ${SVG_ATTR}>
				<rect x="7" y="8" width="10" height="8" rx="2"/>
				<line x1="2" y1="12" x2="7" y2="12"/>
				<line x1="17" y1="12" x2="22" y2="12"/>
				<line x1="11" y1="8" x2="11" y2="16"/>
				<line x1="14" y1="8" x2="14" y2="16"/>
			</svg>`,

		'Fuel Canister':
			`<svg ${SVG_ATTR}>
				<rect x="7" y="10" width="10" height="11" rx="2"/>
				<path d="M7 10Q7 7 10 6H14Q17 7 17 10"/>
				<rect x="10" y="3" width="4" height="3" rx=".5"/>
				<line x1="7" y1="14" x2="17" y2="14"/>
				<line x1="7" y1="17" x2="17" y2="17"/>
			</svg>`,

		'Warm Fleece':
			`<svg ${SVG_ATTR}>
				<path d="M6 8V22H18V8Q18 4 12 4Q6 4 6 8Z"/>
				<line x1="12" y1="5" x2="12" y2="14"/>
				<line x1="6" y1="12" x2="3" y2="12"/>
				<line x1="18" y1="12" x2="21" y2="12"/>
			</svg>`,

		'Extra Food':
			`<svg ${SVG_ATTR}>
				<rect x="7" y="7" width="10" height="12" rx="1.5"/>
				<path d="M7 7Q7 5 12 5Q17 5 17 7"/>
				<path d="M7 19Q7 21 12 21Q17 21 17 19"/>
				<line x1="7" y1="11" x2="17" y2="11"/>
				<line x1="7" y1="16" x2="17" y2="16"/>
			</svg>`,
	};

	// ── types ─────────────────────────────────────────────────────────────────
	interface GameItem { name: string; weight: number; value: number; }
	type Phase = 'idle' | 'playing' | 'done';
	type ItemResult = 'hit' | 'miss' | 'extra' | 'skip';

	// ── settings ──────────────────────────────────────────────────────────────
	let itemCount = $state<number>(12);

	// ── game state ────────────────────────────────────────────────────────────
	let phase    = $state<Phase>('idle');
	let items    = $state<GameItem[]>([]);
	let selected = $state<boolean[]>([]);
	let limit    = $state(0);
	let optimal  = $state<{ value: number; mask: boolean[] } | null>(null);

	// ── sort state ────────────────────────────────────────────────────────────
	type SortCol = 'name' | 'weight' | 'value' | 'ratio';
	let sortCol = $state<SortCol | null>(null);
	let sortDir = $state<'asc' | 'desc'>('asc');

	function setSort(col: SortCol) {
		if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		else { sortCol = col; sortDir = col === 'name' ? 'asc' : 'desc'; }
	}

	// ── derived ───────────────────────────────────────────────────────────────
	const selWeight  = $derived(items.reduce((s, it, i) => s + (selected[i] ? it.weight : 0), 0));
	const selValue   = $derived(items.reduce((s, it, i) => s + (selected[i] ? it.value  : 0), 0));
	const overLimit  = $derived(Math.round(selWeight * 10) > Math.round(limit * 10));
	const weightFill = $derived(Math.min(100, (selWeight / limit) * 100));

	const minValue  = $derived(items.length ? Math.min(...items.map(i => i.value))  : 0);
	const maxValue  = $derived(items.length ? Math.max(...items.map(i => i.value))  : 10);
	const minWeight = $derived(items.length ? Math.min(...items.map(i => i.weight)) : 0);
	const maxWeight = $derived(items.length ? Math.max(...items.map(i => i.weight)) : 1);
	const minRatio  = $derived(items.length ? Math.min(...items.map(i => i.value / i.weight)) : 0);
	const maxRatio  = $derived(items.length ? Math.max(...items.map(i => i.value / i.weight)) : 1);

	function statColor(t: number): string {
		// t=0 → red (hue 0), t=1 → green (hue 120)
		return `hsl(${Math.round(t * 120)}, 70%, 58%)`;
	}
	function valueColor(v: number): string {
		const range = maxValue - minValue;
		return statColor(range === 0 ? 0.5 : (v - minValue) / range);
	}
	function weightColor(w: number): string {
		const range = maxWeight - minWeight;
		return statColor(range === 0 ? 0.5 : 1 - (w - minWeight) / range);
	}
	function ratioColor(v: number, w: number): string {
		const ratio = v / w;
		const range = maxRatio - minRatio;
		return statColor(range === 0 ? 0.5 : (ratio - minRatio) / range);
	}

	const sortedIndices = $derived.by(() => {
		const idx = items.map((_, i) => i);
		if (!sortCol) return idx;
		return [...idx].sort((a, b) => {
			if (sortCol === 'name') {
				const c = items[a].name.localeCompare(items[b].name);
				return sortDir === 'asc' ? c : -c;
			}
			const va = sortCol === 'weight' ? items[a].weight
			         : sortCol === 'ratio'  ? items[a].value / items[a].weight
			         : items[a].value;
			const vb = sortCol === 'weight' ? items[b].weight
			         : sortCol === 'ratio'  ? items[b].value / items[b].weight
			         : items[b].value;
			return sortDir === 'asc' ? va - vb : vb - va;
		});
	});

	// ── DP solver ─────────────────────────────────────────────────────────────
	function knapsack(its: GameItem[], capKg: number): { value: number; mask: boolean[] } {
		const n   = its.length;
		const cap = Math.round(capKg * 10);
		const wt  = its.map(i => Math.round(i.weight * 10));
		const vl  = its.map(i => i.value);

		const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(cap + 1).fill(0));
		for (let i = 1; i <= n; i++) {
			for (let c = 0; c <= cap; c++) {
				dp[i][c] = dp[i - 1][c];
				if (wt[i - 1] <= c)
					dp[i][c] = Math.max(dp[i][c], dp[i - 1][c - wt[i - 1]] + vl[i - 1]);
			}
		}

		const mask = new Array(n).fill(false);
		let c = cap;
		for (let i = n; i >= 1; i--) {
			if (dp[i][c] !== dp[i - 1][c]) { mask[i - 1] = true; c -= wt[i - 1]; }
		}
		return { value: dp[n][cap], mask };
	}

	// ── helpers ───────────────────────────────────────────────────────────────
	function ri(lo: number, hi: number) {
		return Math.floor(Math.random() * (hi - lo + 1)) + lo;
	}

	function shuffle<T>(arr: T[]): T[] {
		const a = [...arr];
		for (let i = a.length - 1; i > 0; i--) {
			const j = ri(0, i);
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	function pct(): number {
		if (!optimal) return 0;
		if (optimal.value === 0) return 100;
		return Math.round((selValue / optimal.value) * 100);
	}

	function stars(p: number): number {
		if (p === 100) return 3;
		if (p >= 80)   return 2;
		if (p >= 50)   return 1;
		return 0;
	}

	function itemResult(i: number): ItemResult {
		// If the user reached the optimal value (possibly via a different selection),
		// don't penalise their choices — any solution that achieves the max is correct.
		if (selValue === optimal!.value) {
			return selected[i] ? 'hit' : 'skip';
		}
		const opt = optimal!.mask[i];
		const sel = selected[i];
		if (opt && sel)  return 'hit';
		if (opt && !sel) return 'miss';
		if (!opt && sel) return 'extra';
		return 'skip';
	}

	// ── game flow ─────────────────────────────────────────────────────────────
	function startGame() {
		const pool = shuffle([...CATALOG]).slice(0, itemCount);

		// Assign values via scaled ratio (value/weight).
		// Each item gets a uniform [0,1] ratio sample; multiply by weight to get
		// raw values, then linearly scale so the min raw value → 1 pt and the
		// max raw value → 10 pts.
		const rawRatios = pool.map(() => Math.random());
		const rawValues = pool.map((it, idx) => rawRatios[idx] * it.weight);
		const minV = Math.min(...rawValues);
		const maxV = Math.max(...rawValues);
		const span = maxV - minV;
		items = pool.map((it, idx) => {
			const scaled = span > 0 ? 1 + (rawValues[idx] - minV) / span * 9 : 5.5;
			return { name: it.name, weight: it.weight, value: Math.round(scaled) };
		});
		selected = new Array(itemCount).fill(false);
		const total = items.reduce((s, it) => s + it.weight, 0);
		// 55% of total weight, rounded to nearest 0.5 kg
		limit   = Math.round(total * 0.55 * 2) / 2;
		optimal = null;
		phase   = 'playing';
	}

	function submit() {
		if (overLimit) return;
		optimal = knapsack(items, limit);
		phase   = 'done';
	}
</script>

<svelte:head>
	<title>Trail Pack — Math Games</title>
</svelte:head>

<div class="page">
	<a href="{base}/" class="back">← Back to games</a>
	<h1>Trail Pack</h1>

	<p class="desc">
		You're heading into the backcountry with a weight-limited pack.
		Every item has a fixed weight and a randomly assigned value.
		Choose the combination that maximizes your total value without
		exceeding the limit — then see how close you were to optimal.
	</p>

	<!-- ══ IDLE ══════════════════════════════════════════════════════════════ -->
	{#if phase === 'idle'}
		<div class="settings">
			<div class="setting-row">
				<span class="setting-label">Items</span>
				<div class="toggle-group">
					{#each COUNT_OPTIONS as n}
						<button
							class="tog-btn"
							class:active={itemCount === n}
							onclick={() => (itemCount = n)}
						>{n}</button>
					{/each}
				</div>
			</div>
		</div>

		<div class="center">
			<button class="btn large" onclick={startGame}>Start Packing</button>
		</div>

	<!-- ══ PLAYING ═══════════════════════════════════════════════════════════ -->
	{:else if phase === 'playing'}
		<div class="weight-section">
			<div class="weight-header">
				<span class="weight-title">Pack weight</span>
				<span class="weight-reading" class:reading-over={overLimit}>
					{selWeight.toFixed(1)} / {limit.toFixed(1)} kg
					{#if overLimit}
						<span class="over-tag">over limit</span>
					{:else}
						({(limit - selWeight).toFixed(1)} kg left)
					{/if}
				</span>
			</div>
			<div class="weight-track">
				<div
					class="weight-fill"
					class:fill-warn={!overLimit && weightFill > 75}
					class:fill-over={overLimit}
					style="width:{weightFill}%"
				></div>
			</div>
			<div class="weight-footer">
				<span class="sel-count">{items.filter((_, i) => selected[i]).length} items</span>
				<span class="sel-value">Value: <strong>{selValue} pts</strong></span>
			</div>
		</div>

		{@render itemTable()}

		<div class="submit-row">
			<button class="btn large btn-secondary" onclick={() => (phase = 'idle')}>New Game</button>
			<button
				class="btn large btn-secondary"
				onclick={() => { selected = new Array(itemCount).fill(false); }}
				disabled={selected.every(s => !s)}
			>Empty Pack</button>
			<button class="btn large" onclick={submit} disabled={overLimit}>
				Submit Pack
			</button>
			{#if overLimit}
				<p class="over-hint">Remove items to stay within {limit.toFixed(1)} kg</p>
			{/if}
		</div>

	<!-- ══ DONE ══════════════════════════════════════════════════════════════ -->
	{:else}
		{@const p = pct()}
		{@const s = stars(p)}

		<div class="result-card">
			<div class="star-row">
				{#each { length: 3 } as _, si}
					<span class="star" class:star-on={si < s}>★</span>
				{/each}
			</div>
			<div class="score-row">
				<span class="score-you">{selValue}</span>
				<span class="score-denom">/ {optimal!.value} pts</span>
			</div>
			<div class="pct-bar-wrap">
				<div class="pct-bar" style="width:{p}%"></div>
			</div>
			<p class="pct-label">{p}% of optimal</p>
			<p class="result-msg">
				{#if p === 100}Perfect pack!
				{:else if p >= 80}Great packing!
				{:else if p >= 50}Good effort!
				{:else}Room to improve!
				{/if}
			</p>
		</div>

		<div class="legend">
			<span class="leg leg-hit">Correct</span>
			<span class="leg leg-miss">Should have packed</span>
			<span class="leg leg-extra">Wasted weight</span>
			<span class="leg leg-skip">Smart skip</span>
		</div>

		{@render itemTable()}

		<div class="submit-row">
			<button class="btn large" onclick={startGame}>Play Again</button>
			<button class="btn large btn-secondary" onclick={() => (phase = 'idle')}>Settings</button>
		</div>
	{/if}
</div>

<!-- ── shared item table ──────────────────────────────────────────────────── -->
{#snippet itemTable()}
	{@const playing = phase === 'playing'}
	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th class="th-status"></th>
					{#each (['name', 'weight', 'value', 'ratio'] as SortCol[]) as col}
						<th
							class="th-sort"
							class:th-active={sortCol === col}
							class:th-num={col !== 'name'}
							onclick={() => setSort(col)}
						>
							{col === 'name' ? 'Item' : col === 'weight' ? 'Weight' : col === 'value' ? 'Value' : 'Ratio'}
							<span class="sort-arrow">
								{#if sortCol === col}{sortDir === 'asc' ? '↑' : '↓'}{:else}⇅{/if}
							</span>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each sortedIndices as i}
					{@const r = playing ? null : itemResult(i)}
					{@const cantFit = playing && !selected[i] && Math.round((selWeight + items[i].weight) * 10) > Math.round(limit * 10)}
					<tr
						class="item-row"
						class:row-clickable={playing}
						class:row-selected={playing && selected[i]}
						class:row-cant-fit={cantFit}
						class:row-hit={r === 'hit'}
						class:row-miss={r === 'miss'}
						class:row-extra={r === 'extra'}
						class:row-skip={r === 'skip'}
						onclick={playing && !cantFit ? () => { selected[i] = !selected[i]; } : undefined}
					>
						<td class="td-status">
							{#if playing}
								<span class="check-box" class:check-on={selected[i]}>
									{selected[i] ? '✓' : ''}
								</span>
							{:else if r === 'hit'}
								<span class="res-icon icon-hit">✓</span>
							{:else if r === 'miss'}
								<span class="res-icon icon-miss">+</span>
							{:else if r === 'extra'}
								<span class="res-icon icon-extra">✗</span>
							{:else}
								<span class="res-icon icon-skip">−</span>
							{/if}
						</td>
						<td class="td-name">
						<span class="name-inner">
							{#if ICONS[items[i].name]}
								<span class="item-icon">{@html ICONS[items[i].name]}</span>
							{/if}
							{items[i].name}
						</span>
					</td>
						<td class="td-num" style="color:{weightColor(items[i].weight)}">{items[i].weight.toFixed(1)} kg</td>
						<td class="td-num" style="color:{valueColor(items[i].value)}">{items[i].value} pts</td>
						<td class="td-num" style="color:{ratioColor(items[i].value, items[i].weight)}">{(items[i].value / items[i].weight).toFixed(1)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/snippet}

<style>
	.page {
		max-width: 600px;
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
		line-height: 1.65;
		margin-bottom: 1.75rem;
	}

	/* ── settings ── */
	.settings {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 1rem 1.25rem;
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
		font-weight: 600;
		color: var(--color-text-muted);
		min-width: 3rem;
	}

	.toggle-group { display: flex; gap: 0.35rem; }

	.tog-btn {
		padding: 0.3rem 0.8rem;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text-muted);
		font-size: 0.9rem;
		font-weight: 700;
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

	.center {
		display: flex;
		justify-content: center;
	}

	/* ── weight bar ── */
	.weight-section {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 1rem 1.25rem 0.85rem;
		margin-bottom: 1.25rem;
	}

	.weight-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 0.5rem;
	}

	.weight-title {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.weight-reading {
		font-size: 0.95rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		transition: color 0.2s;
	}

	.weight-reading.reading-over { color: #f87171; }

	.over-tag {
		margin-left: 0.5rem;
		font-size: 0.75rem;
		background: rgba(248, 113, 113, 0.15);
		color: #f87171;
		border-radius: 99px;
		padding: 0.1rem 0.45rem;
		font-weight: 600;
	}

	.weight-track {
		height: 8px;
		background: var(--color-surface-2);
		border-radius: 99px;
		overflow: hidden;
		margin-bottom: 0.6rem;
	}

	.weight-fill {
		height: 100%;
		background: var(--color-tag-arithmetic);
		border-radius: 99px;
		transition: width 0.25s ease, background 0.25s;
	}

	.weight-fill.fill-warn { background: var(--color-tag-logic); }
	.weight-fill.fill-over { background: #f87171; }

	.weight-footer {
		display: flex;
		justify-content: space-between;
		font-size: 0.82rem;
		color: var(--color-text-muted);
	}

	.sel-value strong { color: var(--color-text); }

	/* ── item table ── */
	.table-wrap {
		overflow-x: auto;
		overflow-y: auto;
		max-height: 420px;
		margin-bottom: 1.5rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	thead {
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface-2);
		position: sticky;
		top: 0;
		z-index: 1;
	}

	th {
		padding: 0.55rem 0.9rem;
		text-align: left;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--color-text-muted);
		white-space: nowrap;
		user-select: none;
	}

	th.th-sort {
		cursor: pointer;
	}

	th.th-sort:hover {
		color: var(--color-text);
	}

	th.th-active {
		color: var(--color-accent);
	}

	th.th-num,
	td.td-num {
		text-align: right;
	}

	th.th-status,
	td.td-status {
		width: 2rem;
		padding-left: 0.85rem;
		padding-right: 0;
	}

	.sort-arrow {
		margin-left: 0.25rem;
		font-size: 0.65rem;
		opacity: 0.5;
	}

	th.th-active .sort-arrow {
		opacity: 1;
	}

	td {
		padding: 0.6rem 0.9rem;
		font-size: 0.9rem;
		border-bottom: 1px solid var(--color-border);
		vertical-align: middle;
	}

	tr:last-child td { border-bottom: none; }

	td.td-name { font-weight: 600; }

	.name-inner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.item-icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		color: var(--color-text-muted);
		opacity: 0.75;
	}

	.row-selected .item-icon,
	.row-hit     .item-icon { opacity: 1; }

	td.td-num {
		font-variant-numeric: tabular-nums;
		color: var(--color-text-muted);
	}

	.item-row.row-clickable { cursor: pointer; }

	.item-row.row-clickable:hover {
		background: rgba(108, 139, 239, 0.06);
	}

	.item-row.row-selected {
		background: rgba(108, 139, 239, 0.1);
	}

	.item-row.row-selected td.td-name { color: var(--color-accent); }

	.item-row.row-cant-fit {
		opacity: 0.8;
		cursor: not-allowed !important;
	}

	.item-row.row-cant-fit td {
		color: var(--color-text-muted);
	}

	/* check box */
	.check-box {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.1rem;
		height: 1.1rem;
		box-sizing: border-box;
		border: 2px solid var(--color-border);
		border-radius: 3px;
		font-size: 0.65rem;
		font-weight: 800;
		color: #fff;
		transition: background 0.15s, border-color 0.15s;
	}

	.check-box.check-on {
		background: var(--color-accent);
		border-color: var(--color-accent);
	}

	/* result row states */
	.row-hit  { background: rgba(74,  222, 128, 0.07); }
	.row-miss { background: rgba(245, 158,  11, 0.07); }
	.row-extra{ background: rgba(248, 113, 113, 0.07); }
	.row-skip { opacity: 0.45; }

	.res-icon {
		font-size: 0.8rem;
		font-weight: 800;
		display: inline-block;
		width: 1.1rem;
		text-align: center;
	}

	.icon-hit   { color: #4ade80; }
	.icon-miss  { color: var(--color-tag-logic); }
	.icon-extra { color: #f87171; }
	.icon-skip  { color: var(--color-text-muted); }

	/* ── legend ── */
	.legend {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
		font-size: 0.72rem;
		font-weight: 600;
	}

	.leg {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.leg::before {
		content: '';
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.leg-hit::before   { background: #4ade80; }
	.leg-miss::before  { background: var(--color-tag-logic); }
	.leg-extra::before { background: #f87171; }
	.leg-skip::before  { background: var(--color-border); }

	.leg-hit   { color: #4ade80; }
	.leg-miss  { color: var(--color-tag-logic); }
	.leg-extra { color: #f87171; }
	.leg-skip  { color: var(--color-text-muted); }

	/* ── result card ── */
	.result-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 1.75rem 2rem;
		text-align: center;
		margin-bottom: 1.25rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
	}

	.star-row { display: flex; gap: 0.25rem; margin-bottom: 0.25rem; }

	.star {
		font-size: 2rem;
		color: var(--color-border);
		transition: color 0.2s;
	}

	.star.star-on { color: var(--color-tag-logic); }

	.score-row {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
	}

	.score-you {
		font-size: 3.5rem;
		font-weight: 800;
		line-height: 1;
	}

	.score-denom {
		font-size: 1.4rem;
		color: var(--color-text-muted);
		font-weight: 400;
	}

	.pct-bar-wrap {
		width: 100%;
		max-width: 240px;
		height: 6px;
		background: var(--color-surface-2);
		border-radius: 99px;
		overflow: hidden;
	}

	.pct-bar {
		height: 100%;
		background: var(--color-accent);
		border-radius: 99px;
		transition: width 0.6s ease;
	}

	.pct-label {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.result-msg {
		font-weight: 600;
		font-size: 1rem;
	}

	/* ── submit row ── */
	.submit-row {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 2rem;
	}

	.submit-row .btn + .btn { margin: 0; }

	.submit-row > button { flex-shrink: 0; }

	.submit-row {
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
	}

	.over-hint {
		width: 100%;
		text-align: center;
		font-size: 0.85rem;
		color: #f87171;
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

	.btn:hover:not(:disabled) { background: var(--color-accent-hover); }

	.btn:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.btn.large {
		padding: 0.9rem 2rem;
		font-size: 1.05rem;
	}

	.btn-secondary {
		background: var(--color-surface-2);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}

	.btn-secondary:hover:not(:disabled) { background: var(--color-border); }
</style>
