export type ConflictLevel = 'low' | 'medium' | 'high';

export interface Animal {
	id: number;
	name: string;
	emoji: string;
	x: number;
	y: number;
}

export interface Edge {
	from: number;
	to: number;
}

export interface GameGraph {
	animals: Animal[];
	edges: Edge[];
	chromaticNumber: number;
}

export const HABITATS = [
	{ id: 'red',    label: 'Red',    color: '#e05252' },
	{ id: 'blue',   label: 'Blue',   color: '#5278e0' },
	{ id: 'green',  label: 'Green',  color: '#4caf6f' },
	{ id: 'yellow', label: 'Yellow', color: '#d4b44a' },
	{ id: 'purple', label: 'Purple', color: '#9b59b6' },
	{ id: 'orange', label: 'Orange', color: '#e07832' },
	{ id: 'teal',   label: 'Teal',   color: '#2aa8a8' },
] as const;

export type HabitatId = typeof HABITATS[number]['id'];

const ANIMAL_POOL = [
	{ name: 'Lion',       emoji: '🦁' },
	{ name: 'Elephant',   emoji: '🐘' },
	{ name: 'Giraffe',    emoji: '🦒' },
	{ name: 'Zebra',      emoji: '🦓' },
	{ name: 'Rhino',      emoji: '🦏' },
	{ name: 'Leopard',    emoji: '🐆' },
	{ name: 'Crocodile',  emoji: '🐊' },
	{ name: 'Hippo',      emoji: '🦛' },
	{ name: 'Gorilla',    emoji: '🦍' },
	{ name: 'Tiger',      emoji: '🐅' },
	{ name: 'Bear',       emoji: '🐻' },
	{ name: 'Wolf',       emoji: '🐺' },
	{ name: 'Fox',        emoji: '🦊' },
	{ name: 'Deer',       emoji: '🦌' },
	{ name: 'Bison',      emoji: '🦬' },
	{ name: 'Kangaroo',   emoji: '🦘' },
	{ name: 'Panda',      emoji: '🐼' },
	{ name: 'Koala',      emoji: '🐨' },
	{ name: 'Camel',      emoji: '🐪' },
	{ name: 'Penguin',    emoji: '🐧' },
];

const EDGE_PROB: Record<ConflictLevel, number> = {
	low:    0.25,
	medium: 0.45,
	high:   0.65,
};

// ── Graph algorithms ───────────────────────────────────────────────────────────

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

// DSATUR greedy coloring — returns an upper bound for the chromatic number
function dsatur(adj: boolean[][]): number {
	const n = adj.length;
	const colors = new Array(n).fill(-1);
	const neighborColorSets: Set<number>[] = Array.from({ length: n }, () => new Set());

	for (let step = 0; step < n; step++) {
		let chosen = -1;
		let maxSat = -1;
		let maxDeg = -1;
		for (let v = 0; v < n; v++) {
			if (colors[v] !== -1) continue;
			const sat = neighborColorSets[v].size;
			const deg = adj[v].filter(Boolean).length;
			if (sat > maxSat || (sat === maxSat && deg > maxDeg)) {
				maxSat = sat;
				maxDeg = deg;
				chosen = v;
			}
		}

		let c = 0;
		while (neighborColorSets[chosen].has(c)) c++;
		colors[chosen] = c;

		for (let u = 0; u < n; u++) {
			if (adj[chosen][u] && colors[u] === -1) {
				neighborColorSets[u].add(c);
			}
		}
	}

	return Math.max(...colors) + 1;
}

// Exact backtracking k-coloring check
function isKColorable(adj: boolean[][], k: number): boolean {
	const n = adj.length;
	const colors = new Array(n).fill(-1);

	function canAssign(v: number, c: number): boolean {
		for (let u = 0; u < n; u++) {
			if (adj[v][u] && colors[u] === c) return false;
		}
		return true;
	}

	function backtrack(v: number): boolean {
		if (v === n) return true;
		for (let c = 0; c < k; c++) {
			if (canAssign(v, c)) {
				colors[v] = c;
				if (backtrack(v + 1)) return true;
				colors[v] = -1;
			}
		}
		return false;
	}

	return backtrack(0);
}

function computeChromaticNumber(adj: boolean[][]): number {
	const upper = dsatur(adj);
	for (let k = 1; k < upper; k++) {
		if (isKColorable(adj, k)) return k;
	}
	return upper;
}

// Returns a valid coloring using exactly chromaticNumber colors (0-indexed color ints).
function findOptimalColorAssignment(adj: boolean[][], k: number): number[] {
	const n = adj.length;
	const colors = new Array(n).fill(-1);

	function canAssign(v: number, c: number): boolean {
		for (let u = 0; u < n; u++) {
			if (adj[v][u] && colors[u] === c) return false;
		}
		return true;
	}

	function backtrack(v: number): boolean {
		if (v === n) return true;
		for (let c = 0; c < k; c++) {
			if (canAssign(v, c)) {
				colors[v] = c;
				if (backtrack(v + 1)) return true;
				colors[v] = -1;
			}
		}
		return false;
	}

	backtrack(0);
	return colors;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function generateGame(animalCount: number, conflictLevel: ConflictLevel): GameGraph {
	const prob = EDGE_PROB[conflictLevel];
	const cx = 240, cy = 240;
	const graphRadius = animalCount <= 7 ? 155 : animalCount <= 10 ? 175 : 185;

	for (let attempt = 0; attempt < 200; attempt++) {
		const shuffled = [...ANIMAL_POOL].sort(() => Math.random() - 0.5);
		const chosen = shuffled.slice(0, animalCount);

		const adj: boolean[][] = Array.from({ length: animalCount }, () =>
			new Array(animalCount).fill(false)
		);

		for (let i = 0; i < animalCount; i++) {
			for (let j = i + 1; j < animalCount; j++) {
				if (Math.random() < prob) {
					adj[i][j] = true;
					adj[j][i] = true;
				}
			}
		}

		if (!isConnected(adj)) makeConnected(adj);

		const chi = computeChromaticNumber(adj);
		if (chi < 2 || chi > 5) continue;

		const animals: Animal[] = chosen.map((a, i) => ({
			id: i,
			name: a.name,
			emoji: a.emoji,
			x: cx + graphRadius * Math.cos((2 * Math.PI * i) / animalCount - Math.PI / 2),
			y: cy + graphRadius * Math.sin((2 * Math.PI * i) / animalCount - Math.PI / 2),
		}));

		const edges: Edge[] = [];
		for (let i = 0; i < animalCount; i++) {
			for (let j = i + 1; j < animalCount; j++) {
				if (adj[i][j]) edges.push({ from: i, to: j });
			}
		}

		return { animals, edges, chromaticNumber: chi };
	}

	// Fallback: return the last graph generated regardless of chi
	const shuffled = [...ANIMAL_POOL].sort(() => Math.random() - 0.5);
	const chosen = shuffled.slice(0, animalCount);
	const adj: boolean[][] = Array.from({ length: animalCount }, () =>
		new Array(animalCount).fill(false)
	);
	for (let i = 0; i < animalCount; i++) {
		for (let j = i + 1; j < animalCount; j++) {
			if (Math.random() < prob) { adj[i][j] = true; adj[j][i] = true; }
		}
	}
	if (!isConnected(adj)) makeConnected(adj);
	const chi = computeChromaticNumber(adj);
	const animals: Animal[] = chosen.map((a, i) => ({
		id: i, name: a.name, emoji: a.emoji,
		x: cx + (animalCount <= 7 ? 155 : 175) * Math.cos((2 * Math.PI * i) / animalCount - Math.PI / 2),
		y: cy + (animalCount <= 7 ? 155 : 175) * Math.sin((2 * Math.PI * i) / animalCount - Math.PI / 2),
	}));
	const edges: Edge[] = [];
	for (let i = 0; i < animalCount; i++)
		for (let j = i + 1; j < animalCount; j++)
			if (adj[i][j]) edges.push({ from: i, to: j });
	return { animals, edges, chromaticNumber: chi };
}

export function getConflictingEdgeKeys(colors: (HabitatId | null)[], edges: Edge[]): Set<string> {
	const result = new Set<string>();
	for (const edge of edges) {
		const ca = colors[edge.from];
		const cb = colors[edge.to];
		if (ca !== null && cb !== null && ca === cb) {
			result.add(`${edge.from}-${edge.to}`);
		}
	}
	return result;
}

export function countUsedHabitats(colors: (HabitatId | null)[]): number {
	return new Set(colors.filter((c): c is HabitatId => c !== null)).size;
}

export function isValidColoring(colors: (HabitatId | null)[], edges: Edge[]): boolean {
	if (colors.some(c => c === null)) return false;
	return getConflictingEdgeKeys(colors, edges).size === 0;
}

// Returns a valid coloring using the minimum number of habitats.
export function computeOptimalColoring(graph: GameGraph): HabitatId[] {
	const n = graph.animals.length;
	const adj: boolean[][] = Array.from({ length: n }, () => new Array(n).fill(false));
	for (const edge of graph.edges) {
		adj[edge.from][edge.to] = true;
		adj[edge.to][edge.from] = true;
	}
	const colorIndices = findOptimalColorAssignment(adj, graph.chromaticNumber);
	return colorIndices.map(i => HABITATS[i].id);
}
