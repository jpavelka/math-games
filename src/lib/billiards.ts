export type Difficulty = 'easy' | 'medium' | 'hard';
export type Corner = 'BL' | 'BR' | 'TL' | 'TR';

export interface GameState {
	M: number;
	N: number;
	answer: Corner;
	path: [number, number][];
	bounces: number;
	gcdVal: number;
}

export function gcd(a: number, b: number): number {
	while (b) { [a, b] = [b, a % b]; }
	return a;
}

export function computePath(M: number, N: number): [number, number][] {
	const path: [number, number][] = [[0, 0]];
	let x = 0, y = 0, dx = 1, dy = 1;
	for (let i = 0; i < 2 * (M + N); i++) {
		const tx = dx > 0 ? M - x : x;
		const ty = dy > 0 ? N - y : y;
		const t = Math.min(tx, ty);
		x += dx * t;
		y += dy * t;
		path.push([x, y]);
		if ((x === 0 || x === M) && (y === 0 || y === N)) break;
		if (x === 0 || x === M) dx = -dx;
		if (y === 0 || y === N) dy = -dy;
	}
	return path;
}

function cornerOf(M: number, N: number, x: number, y: number): Corner {
	if (x === 0 && y === 0) return 'BL';
	if (x === M && y === 0) return 'BR';
	if (x === 0) return 'TL';
	return 'TR';
}

export function generateGame(difficulty: Difficulty): GameState {
	const ranges: Record<Difficulty, [number, number]> = {
		easy:   [2, 6],
		medium: [2, 10],
		hard:   [3, 16],
	};
	const [lo, hi] = ranges[difficulty];

	for (let attempt = 0; attempt < 300; attempt++) {
		const M = Math.floor(Math.random() * (hi - lo + 1)) + lo;
		const N = Math.floor(Math.random() * (hi - lo + 1)) + lo;
		const g = gcd(M, N);
		const bounces = (M + N) / g - 2;
		if (bounces < 1) continue;
		if (difficulty === 'easy'   && bounces > 7)  continue;
		if (difficulty === 'medium' && bounces > 13) continue;
		const path = computePath(M, N);
		const [ex, ey] = path[path.length - 1];
		return { M, N, answer: cornerOf(M, N, ex, ey), path, bounces, gcdVal: g };
	}
	// Fallback: 3×4 always has bounces=5
	const path = computePath(3, 4);
	const [ex, ey] = path[path.length - 1];
	return { M: 3, N: 4, answer: cornerOf(3, 4, ex, ey), path, bounces: 5, gcdVal: 1 };
}
