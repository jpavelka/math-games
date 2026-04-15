export type Op = '+' | '-' | '×' | '÷' | '=';
export type EqStatus = 'valid' | 'invalid' | 'incomplete';

export interface EquatoPuzzle {
	/** 4×4 number grid; null = blank cell (player fills) */
	grid: (number | null)[][];
	/** Horizontal operators: hOps[row][colGap] connects grid[row][colGap] → grid[row][colGap+1] */
	hOps: Op[][];
	/** Vertical operators: vOps[rowGap][col] connects grid[rowGap][col] → grid[rowGap+1][col] */
	vOps: Op[][];
	/** Complete solution for reference */
	solution: number[][];
	/** Sorted list of numbers that go in blank cells */
	bank: number[];
}

// ─── helpers ─────────────────────────────────────────────────────────────────

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

function applyOp(a: number, op: Exclude<Op, '='>, b: number): number | null {
	if (op === '+') return a + b;
	if (op === '-') return a - b;
	if (op === '×') return a * b;
	if (op === '÷') {
		if (b === 0 || a % b !== 0) return null;
		const r = a / b;
		return r > 0 ? r : null;
	}
	return null;
}

/**
 * Evaluate [n0, n1, n2, n3] with [op0, op1, op2] strictly left-to-right.
 * Exactly one op must be '='; returns true if LHS === RHS.
 */
export function evalEquation(nums: number[], ops: Op[]): boolean {
	const eqIdx = ops.indexOf('=');
	if (eqIdx === -1) return false;

	let lhs: number | null = nums[0];
	for (let i = 0; i < eqIdx; i++) {
		lhs = applyOp(lhs!, ops[i] as Exclude<Op, '='>, nums[i + 1]);
		if (lhs === null) return false;
	}

	let rhs: number | null = nums[eqIdx + 1];
	for (let i = eqIdx + 1; i < ops.length; i++) {
		rhs = applyOp(rhs!, ops[i] as Exclude<Op, '='>, nums[i + 1]);
		if (rhs === null) return false;
	}

	return lhs !== null && rhs !== null && lhs === rhs;
}

export function getRowStatus(
	r: number,
	grid: (number | null)[][],
	hOps: Op[][]
): EqStatus {
	const nums = [0, 1, 2, 3].map((c) => grid[r][c]);
	if (nums.some((n) => n === null)) return 'incomplete';
	return evalEquation(nums as number[], hOps[r]) ? 'valid' : 'invalid';
}

export function getColStatus(
	c: number,
	grid: (number | null)[][],
	vOps: Op[][]
): EqStatus {
	const nums = [0, 1, 2, 3].map((r) => grid[r][c]);
	if (nums.some((n) => n === null)) return 'incomplete';
	const ops = [0, 1, 2].map((r) => vOps[r][c]);
	return evalEquation(nums as number[], ops) ? 'valid' : 'invalid';
}

// ─── generation ──────────────────────────────────────────────────────────────

function findOps(nums: number[]): Op[] | null {
	const nonEq: Op[] = ['+', '-', '×', '÷'];
	for (const eqPos of shuffle([0, 1, 2])) {
		const others = [0, 1, 2].filter((p) => p !== eqPos);
		for (const op1 of shuffle([...nonEq])) {
			for (const op2 of shuffle([...nonEq])) {
				const ops = new Array<Op>(3);
				ops[eqPos] = '=';
				ops[others[0]] = op1;
				ops[others[1]] = op2;
				if (evalEquation(nums, ops)) return ops;
			}
		}
	}
	return null;
}

function selectBlanks(grid: number[][]): [number, number][] | null {
	const byVal = new Map<number, [number, number][]>();
	for (let r = 0; r < 4; r++) {
		for (let c = 0; c < 4; c++) {
			const v = grid[r][c];
			if (!byVal.has(v)) byVal.set(v, []);
			byVal.get(v)!.push([r, c]);
		}
	}
	if (byVal.size < 8) return null;

	for (let attempt = 0; attempt < 50; attempt++) {
		const blanks = shuffle([...byVal.entries()])
			.slice(0, 8)
			.map(([, cells]) => cells[rand(0, cells.length - 1)]);
		const rows = new Set(blanks.map(([r]) => r));
		const cols = new Set(blanks.map(([, c]) => c));
		if (rows.size === 4 && cols.size === 4) return blanks;
	}
	return null;
}

export function generatePuzzle(): EquatoPuzzle {
	for (let attempt = 0; attempt < 2000; attempt++) {
		const solution: number[][] = Array.from({ length: 4 }, () =>
			Array.from({ length: 4 }, () => rand(1, 9))
		);

		const hOpsNullable = solution.map((row) => findOps(row));
		if (hOpsNullable.some((o) => o === null)) continue;
		const hOps = hOpsNullable as Op[][];

		// findOps per column, result indexed [col][rowGap]
		const vOpsPerCol = Array.from({ length: 4 }, (_, c) =>
			findOps(solution.map((row) => row[c]))
		);
		if (vOpsPerCol.some((o) => o === null)) continue;

		// Transpose to vOps[rowGap][col]
		const vOps: Op[][] = Array.from({ length: 3 }, (_, r) =>
			Array.from({ length: 4 }, (_, c) => vOpsPerCol[c]![r])
		);

		const blanks = selectBlanks(solution);
		if (!blanks) continue;

		const grid: (number | null)[][] = solution.map((row) => [...row]);
		const bank: number[] = [];
		for (const [r, c] of blanks) {
			bank.push(grid[r][c] as number);
			grid[r][c] = null;
		}
		bank.sort((a, b) => a - b);

		return { grid, hOps, vOps, solution, bank };
	}
	return generatePuzzle();
}
