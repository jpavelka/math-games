export type Difficulty = 'easy' | 'medium' | 'hard';

export interface ChainNum {
	value: number;
	factors: number[]; // unique prime factors, sorted ascending
}

export interface GameState {
	pool: ChainNum[];   // shuffled — all numbers
	solution: number[]; // one valid ordering of values
	count: number;
}

// ── Math ───────────────────────────────────────────────────────────────────────

export function primeFactors(n: number): number[] {
	const factors: number[] = [];
	let m = n;
	for (let p = 2; p * p <= m; p++) {
		if (m % p === 0) {
			factors.push(p);
			while (m % p === 0) m = Math.floor(m / p);
		}
	}
	if (m > 1) factors.push(m);
	return factors;
}

export function sharedFactors(a: number, b: number): number[] {
	const fa = new Set(primeFactors(a));
	return primeFactors(b).filter(p => fa.has(p));
}

export function sharesFactor(a: number, b: number): boolean {
	const fa = new Set(primeFactors(a));
	return primeFactors(b).some(p => fa.has(p));
}

// ── Number pools ───────────────────────────────────────────────────────────────
// Easy:   all composites, dense connections — good for learning the mechanic
// Medium: adds small primes (2, 3, 5, 7) as bottleneck nodes
// Hard:   adds 11 and 13; sparser graph requires careful planning

const EASY_POOL = [
	4, 6, 8, 9, 10, 12, 14, 15, 18, 20, 21, 22, 24, 25, 26, 27, 28,
	30, 33, 34, 35, 36, 38, 39, 40, 42, 44, 45, 48, 50, 51, 55, 57, 63,
];

const MEDIUM_POOL = [
	2, 3, 4, 5, 6, 7, 9, 10, 12, 14, 15, 18, 20, 21, 22, 24, 25, 26,
	27, 28, 33, 34, 35, 38, 39, 42, 44, 45, 50, 51, 55, 57, 63,
];

const HARD_POOL = [
	2, 3, 5, 7, 11, 13, 6, 10, 14, 15, 21, 22, 26, 33, 34, 35,
	38, 39, 42, 44, 55, 65, 77, 91,
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

// Backtracking Hamiltonian path finder; returns values in path order or null.
function findHamiltonianPath(numbers: number[]): number[] | null {
	const n = numbers.length;
	const adj: boolean[][] = Array.from({ length: n }, (_, i) =>
		Array.from({ length: n }, (_, j) => i !== j && sharesFactor(numbers[i], numbers[j]))
	);

	const path: number[] = [];
	const used = new Array(n).fill(false);
	let calls = 0;

	function bt(): boolean {
		if (++calls > 200_000) return false;
		if (path.length === n) return true;
		const last = path.length > 0 ? path[path.length - 1] : -1;
		for (let i = 0; i < n; i++) {
			if (!used[i] && (last === -1 || adj[last][i])) {
				path.push(i); used[i] = true;
				if (bt()) return true;
				path.pop(); used[i] = false;
			}
		}
		return false;
	}

	for (let s = 0; s < n; s++) {
		calls = 0; path.length = 0; used.fill(false);
		path.push(s); used[s] = true;
		if (bt()) return path.map(i => numbers[i]);
	}
	return null;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function generateGame(count: number, difficulty: Difficulty): GameState {
	const pools: Record<Difficulty, number[]> = {
		easy:   EASY_POOL,
		medium: MEDIUM_POOL,
		hard:   HARD_POOL,
	};

	const basePool = pools[difficulty];

	for (let attempt = 0; attempt < 100; attempt++) {
		const numbers = shuffle(basePool).slice(0, count);
		const solution = findHamiltonianPath([...numbers]);
		if (solution) {
			return {
				pool: shuffle(numbers).map(v => ({ value: v, factors: primeFactors(v) })),
				solution,
				count,
			};
		}
	}

	// Fallback: easy pool always has dense connectivity
	const numbers = shuffle(EASY_POOL).slice(0, count);
	const solution = findHamiltonianPath([...numbers]) ?? numbers;
	return {
		pool: shuffle(numbers).map(v => ({ value: v, factors: primeFactors(v) })),
		solution,
		count,
	};
}
