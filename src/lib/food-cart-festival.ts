export type ConflictLevel = 'low' | 'medium' | 'high';

export interface FoodCart {
	id: number;
	name: string;
	emoji: string;
	popularity: number; // 1–10
	x: number;
	y: number;
}

export interface Edge {
	from: number;
	to: number;
}

export interface GameGraph {
	carts: FoodCart[];
	edges: Edge[];
	optimalWeight: number;
	optimalSet: number[]; // cart ids in one optimal solution
}

const CART_POOL = [
	{ name: 'Wok This Way',          emoji: '🥢' },
	{ name: 'The Codfather',         emoji: '🐟' },
	{ name: 'Pita Pan',              emoji: '🫓' },
	{ name: 'Lord of the Wings',     emoji: '🍗' },
	{ name: 'Holy Crepe',            emoji: '🥞' },
	{ name: 'Bun Intended',          emoji: '🍔' },
	{ name: 'Nacho Average Cart',    emoji: '🌮' },
	{ name: 'Fry Hard',              emoji: '🍟' },
	{ name: 'The Rolling Scones',    emoji: '🥐' },
	{ name: 'Wurst Case Scenario',   emoji: '🌭' },
	{ name: 'Bread Zeppelin',        emoji: '🥖' },
	{ name: 'Cluck Norris',          emoji: '🐔' },
	{ name: 'Curry On',              emoji: '🍛' },
	{ name: 'Pho Real',              emoji: '🍜' },
	{ name: 'Pizza My Heart',        emoji: '🍕' },
	{ name: 'Fried and Prejudice',   emoji: '🍳' },
	{ name: 'Lettuce Turnip the Beet', emoji: '🥗' },
	{ name: 'Eggs-istential Crisis', emoji: '🥚' },
	{ name: 'The Empanada Republic', emoji: '🥟' },
	{ name: 'Phyllo Sophy',          emoji: '🥧' },
	{ name: 'Brewed Awakening',      emoji: '☕' },
];

const EDGE_PROB: Record<ConflictLevel, number> = {
	low:    0.25,
	medium: 0.45,
	high:   0.65,
};

// ── Graph helpers ──────────────────────────────────────────────────────────────

function isConnected(adj: boolean[][]): boolean {
	const n = adj.length;
	if (n === 0) return true;
	const visited = new Array(n).fill(false);
	const queue = [0];
	visited[0] = true;
	let count = 1;
	while (queue.length > 0) {
		const v = queue.shift()!;
		for (let u = 0; u < n; u++) {
			if (adj[v][u] && !visited[u]) {
				visited[u] = true;
				queue.push(u);
				count++;
			}
		}
	}
	return count === n;
}

function makeConnected(adj: boolean[][]): void {
	const n = adj.length;
	const visited = new Array(n).fill(false);
	const components: number[][] = [];
	for (let start = 0; start < n; start++) {
		if (visited[start]) continue;
		const comp: number[] = [];
		const queue = [start];
		visited[start] = true;
		while (queue.length > 0) {
			const v = queue.shift()!;
			comp.push(v);
			for (let u = 0; u < n; u++) {
				if (adj[v][u] && !visited[u]) {
					visited[u] = true;
					queue.push(u);
				}
			}
		}
		components.push(comp);
	}
	for (let i = 1; i < components.length; i++) {
		const u = components[i - 1][Math.floor(Math.random() * components[i - 1].length)];
		const v = components[i][Math.floor(Math.random() * components[i].length)];
		adj[u][v] = true;
		adj[v][u] = true;
	}
}

// ── MWIS solver (exact backtracking with branch-and-bound) ─────────────────────

function solveMWIS(adj: boolean[][], weights: number[]): { weight: number; set: number[] } {
	const n = weights.length;
	let bestWeight = 0;
	let bestSet: number[] = [];

	// Suffix weight sums for upper-bound pruning
	const suffix = new Array(n + 1).fill(0);
	for (let i = n - 1; i >= 0; i--) suffix[i] = suffix[i + 1] + weights[i];

	const selected = new Set<number>();

	function backtrack(v: number, currentWeight: number): void {
		if (currentWeight + suffix[v] <= bestWeight) return; // prune

		if (v === n) {
			if (currentWeight > bestWeight) {
				bestWeight = currentWeight;
				bestSet = [...selected];
			}
			return;
		}

		// Skip v
		backtrack(v + 1, currentWeight);

		// Include v if no selected neighbor
		let ok = true;
		for (const u of selected) {
			if (adj[v][u]) { ok = false; break; }
		}
		if (ok) {
			selected.add(v);
			backtrack(v + 1, currentWeight + weights[v]);
			selected.delete(v);
		}
	}

	backtrack(0, 0);
	return { weight: bestWeight, set: bestSet };
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function generateGame(cartCount: number, conflictLevel: ConflictLevel): GameGraph {
	const prob = EDGE_PROB[conflictLevel];
	const cx = 250, cy = 250;
	const graphRadius = cartCount <= 7 ? 158 : cartCount <= 10 ? 176 : 185;

	for (let attempt = 0; attempt < 200; attempt++) {
		const shuffled = [...CART_POOL].sort(() => Math.random() - 0.5);
		const chosen = shuffled.slice(0, cartCount);

		const adj: boolean[][] = Array.from({ length: cartCount }, () =>
			new Array(cartCount).fill(false)
		);
		for (let i = 0; i < cartCount; i++) {
			for (let j = i + 1; j < cartCount; j++) {
				if (Math.random() < prob) {
					adj[i][j] = true;
					adj[j][i] = true;
				}
			}
		}
		if (!isConnected(adj)) makeConnected(adj);

		const weights = Array.from({ length: cartCount }, () =>
			Math.floor(Math.random() * 10) + 1
		);

		const { weight, set } = solveMWIS(adj, weights);

		// Reject if optimal is trivially the single highest cart or all carts
		if (set.length < 2 || set.length === cartCount) continue;

		const carts: FoodCart[] = chosen.map((c, i) => ({
			id: i,
			name: c.name,
			emoji: c.emoji,
			popularity: weights[i],
			x: cx + graphRadius * Math.cos((2 * Math.PI * i) / cartCount - Math.PI / 2),
			y: cy + graphRadius * Math.sin((2 * Math.PI * i) / cartCount - Math.PI / 2),
		}));

		const edges: Edge[] = [];
		for (let i = 0; i < cartCount; i++)
			for (let j = i + 1; j < cartCount; j++)
				if (adj[i][j]) edges.push({ from: i, to: j });

		return { carts, edges, optimalWeight: weight, optimalSet: set };
	}

	// Fallback — last attempt, no quality filter
	const shuffled = [...CART_POOL].sort(() => Math.random() - 0.5);
	const chosen = shuffled.slice(0, cartCount);
	const adj: boolean[][] = Array.from({ length: cartCount }, () =>
		new Array(cartCount).fill(false)
	);
	for (let i = 0; i < cartCount; i++)
		for (let j = i + 1; j < cartCount; j++)
			if (Math.random() < prob) { adj[i][j] = true; adj[j][i] = true; }
	if (!isConnected(adj)) makeConnected(adj);
	const weights = Array.from({ length: cartCount }, () => Math.floor(Math.random() * 10) + 1);
	const { weight, set } = solveMWIS(adj, weights);
	const carts: FoodCart[] = chosen.map((c, i) => ({
		id: i, name: c.name, emoji: c.emoji, popularity: weights[i],
		x: cx + graphRadius * Math.cos((2 * Math.PI * i) / cartCount - Math.PI / 2),
		y: cy + graphRadius * Math.sin((2 * Math.PI * i) / cartCount - Math.PI / 2),
	}));
	const edges: Edge[] = [];
	for (let i = 0; i < cartCount; i++)
		for (let j = i + 1; j < cartCount; j++)
			if (adj[i][j]) edges.push({ from: i, to: j });
	return { carts, edges, optimalWeight: weight, optimalSet: set };
}

export function getConflictingEdgeKeys(selected: Set<number>, edges: Edge[]): Set<string> {
	const result = new Set<string>();
	for (const edge of edges) {
		if (selected.has(edge.from) && selected.has(edge.to)) {
			result.add(`${edge.from}-${edge.to}`);
		}
	}
	return result;
}

export function selectionWeight(selected: Set<number>, carts: FoodCart[]): number {
	let total = 0;
	for (const id of selected) total += carts[id].popularity;
	return total;
}
