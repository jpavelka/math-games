export type Operator = '+' | '×';
export type OperatorMode = 'add' | 'mul' | 'both';

export interface SubGrid {
	/** 8 numbers in reading order, index 4 is the center (operator) — stored separately */
	numbers: number[];
	operator: Operator;
	/** index into numbers[] (0–7) that is the answer */
	answerIndex: number;
	/** the two indices whose op-result equals the answer */
	sourceIndices: [number, number];
}

export interface Puzzle {
	subGrids: SubGrid[]; // length 8, for meta-positions 0–3, 5–8 (skip center)
	finalGrid: SubGrid;  // numbers are the 8 subgrid answers
}

// ─── helpers ────────────────────────────────────────────────────────────────

function rand(lo: number, hi: number) {
	return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function shuffle<T>(arr: T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = rand(0, i);
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

function apply(op: Operator, a: number, b: number): number {
	return op === '+' ? a + b : a * b;
}

/**
 * Returns true if `target` can be expressed as op(x, y) where x and y are
 * two distinct elements of `pool` (they may be equal in value but different indices).
 */
function isSolvable(target: number, pool: number[], op: Operator): boolean {
	for (let i = 0; i < pool.length; i++) {
		for (let j = i + 1; j < pool.length; j++) {
			if (apply(op, pool[i], pool[j]) === target) return true;
		}
	}
	return false;
}

/**
 * Count how many numbers in `nums` are expressible as op(x,y) for two other
 * elements in `nums`.
 */
function countValid(nums: number[], op: Operator): number {
	return nums.filter((n) => isSolvable(n, nums, op)).length;
}

// ─── number-range config ─────────────────────────────────────────────────────

const ADD_OPERANDS = { lo: 2, hi: 20 };  // B + C = A; B/C in this range
const MUL_OPERANDS = { lo: 2, hi: 6 };   // B × C = A; smaller range keeps products ≤ 36

// ─── single subgrid generation ───────────────────────────────────────────────

function generateSubGrid(op: Operator, forcedNumbers?: number[]): SubGrid {
	const { lo, hi } = op === '+' ? ADD_OPERANDS : MUL_OPERANDS;

	for (let attempt = 0; attempt < 400; attempt++) {
		let b: number, c: number, a: number;

		if (forcedNumbers) {
			// The answer must come from forcedNumbers; pick two that combine correctly
			const pairs: [number, number][] = [];
			for (let i = 0; i < forcedNumbers.length; i++) {
				for (let j = i + 1; j < forcedNumbers.length; j++) {
					const res = apply(op, forcedNumbers[i], forcedNumbers[j]);
					if (forcedNumbers.includes(res)) {
						pairs.push([i, j]);
					}
				}
			}
			if (pairs.length === 0) continue;
			const [pi, pj] = pairs[rand(0, pairs.length - 1)];
			b = forcedNumbers[pi];
			c = forcedNumbers[pj];
			a = apply(op, b, c);
		} else {
			b = rand(lo, hi);
			c = rand(lo, hi);
			a = apply(op, b, c);
			if (op === '+' && a > 40) continue;
			if (op === '×' && a > 36) continue;
		}

		// Build 5 filler numbers.
		// For ×: draw from a range that extends above A so the answer isn't
		// always the biggest number — that makes the puzzle trivially easy.
		const fillerHi = op === '+' ? 35 : a + 15;
		const used = new Set([a, b, c]);
		const fillers: number[] = [];

		for (let fi = 0; fi < 200 && fillers.length < 5; fi++) {
			const f = rand(lo, fillerHi);
			if (used.has(f)) continue;
			used.add(f);
			fillers.push(f);
		}
		if (fillers.length < 5) continue;

		// Compose all 8 numbers and verify uniqueness
		const allNums = shuffle([a, b, c, ...fillers]);
		if (countValid(allNums, op) !== 1) continue;

		const answerIndex = allNums.indexOf(a);
		const sourceIndices: [number, number] = [allNums.indexOf(b), allNums.indexOf(c)];
		return { numbers: allNums, operator: op, answerIndex, sourceIndices };
	}

	// Fallback: should be rare — recurse with the same operator
	return generateSubGrid(op, forcedNumbers);
}

// ─── full puzzle generation ──────────────────────────────────────────────────

export function generatePuzzle(mode: OperatorMode = 'both'): Puzzle {
	const ops: Operator[] = ['+', '×'];

	function pickOp(): Operator {
		if (mode === 'add') return '+';
		if (mode === 'mul') return '×';
		return ops[rand(0, 1)];
	}

	const finalOps: Operator[] =
		mode === 'add' ? ['+'] : mode === 'mul' ? ['×'] : ops;

	// Generate 8 independent subgrids
	const subGrids: SubGrid[] = [];
	for (let i = 0; i < 8; i++) {
		subGrids.push(generateSubGrid(pickOp()));
	}

	// Soft board-level cap: allow the answer to be the grid's max at most twice
	// across the whole board. Regenerate the worst offenders until we're under
	// the limit (× grids only — for + the answer being largest is expected).
	function isMulAnswerMax(g: SubGrid) {
		return g.operator === '×' && g.numbers[g.answerIndex] === Math.max(...g.numbers);
	}
	for (let cap = 0; cap < 30 && subGrids.filter(isMulAnswerMax).length > 2; cap++) {
		const idx = subGrids.findIndex(isMulAnswerMax);
		subGrids[idx] = generateSubGrid(pickOp());
	}

	// Collect answers and try to build a valid final grid from them
	// If the 8 answers don't form a solvable final grid, regenerate until they do
	for (let retry = 0; retry < 200; retry++) {
		const answers = subGrids.map((g) => g.numbers[g.answerIndex]);

		for (const finalOp of shuffle([...finalOps])) {
			// Check if any pair of answers produces another answer
			const pairs: [number, number, number][] = []; // [src_i, src_j, answer_idx]
			for (let i = 0; i < answers.length; i++) {
				for (let j = i + 1; j < answers.length; j++) {
					const res = apply(finalOp, answers[i], answers[j]);
					const idx = answers.indexOf(res);
					if (idx !== -1 && idx !== i && idx !== j) {
						pairs.push([i, j, idx]);
					}
				}
			}
			if (pairs.length === 0) continue;

			// Verify uniqueness: exactly one answer is a combination of two others
			if (countValid(answers, finalOp) !== 1) continue;

			const [si, sj, answerIndex] = pairs[rand(0, pairs.length - 1)];
			const finalGrid: SubGrid = {
				numbers: answers,
				operator: finalOp,
				answerIndex,
				sourceIndices: [si, sj],
			};
			return { subGrids, finalGrid };
		}

		// Answers don't work — regenerate one random subgrid and try again
		const i = rand(0, 7);
		subGrids[i] = generateSubGrid(pickOp());
	}

	// Last resort: fully restart
	return generatePuzzle(mode);
}

// ─── validation helpers ──────────────────────────────────────────────────────

/** Returns true if the chosen index is the correct answer for the grid. */
export function checkAnswer(grid: SubGrid, chosenIndex: number): boolean {
	return chosenIndex === grid.answerIndex;
}
