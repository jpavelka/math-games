export type Op = '+' | '-' | '*' | '/';

export interface ExpressionNode {
    type: 'number' | 'binary';
    value?: number;
    left?: ExpressionNode;
    right?: ExpressionNode;
    op?: Op;
    parenthesized?: boolean;
}

export function evaluate(node: ExpressionNode): number {
    if (node.type === 'number') {
        return node.value!;
    }
    const leftVal = evaluate(node.left!);
    const rightVal = evaluate(node.right!);
    switch (node.op) {
        case '+': return leftVal + rightVal;
        case '-': return leftVal - rightVal;
        case '*': return leftVal * rightVal;
        case '/': return leftVal / rightVal;
        default: return 0;
    }
}

export function flattenExpression(node: ExpressionNode): (number | Op)[] {
    if (node.type === 'number') {
        return [node.value!];
    }
    return [...flattenExpression(node.left!), node.op!, ...flattenExpression(node.right!)];
}

export function evaluateStandard(tokens: (number | Op)[]): number {
    // Basic PEMDAS (only +,-,*,/ here)
    // First handle * and /
    let stack: (number | Op)[] = [];
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token === '*' || token === '/') {
            const left = stack.pop() as number;
            const right = tokens[++i] as number;
            if (token === '*') stack.push(left * right);
            else {
                if (right === 0) stack.push(NaN); // Avoid division by zero
                else stack.push(left / right);
            }
        } else {
            stack.push(token);
        }
    }
    // Then handle + and -
    if (stack.some(t => typeof t === 'number' && isNaN(t))) return NaN;
    
    let result = stack[0] as number;
    for (let i = 1; i < stack.length; i += 2) {
        const op = stack[i] as Op;
        const right = stack[i + 1] as number;
        if (op === '+') result += right;
        else result -= right;
    }
    return result;
}

export function generatePuzzle(minOperands: number = 3, maxOperands: number = 5): { tokens: (number | Op)[], target: number, solution: string } {
    let attempts = 0;
    while (attempts < 2000) {
        attempts++;
        // Vary the number of operands between min and max
        const operandCount = Math.floor(Math.random() * (maxOperands - minOperands + 1)) + minOperands;
        const tree = generateRandomTree(operandCount);
        const target = evaluate(tree);
        const tokens = flattenExpression(tree);
        const standardValue = evaluateStandard(tokens);

        // Filter for interesting puzzles:
        // 1. Standard precedence gives a different result
        // 2. Result is a positive integer
        // 3. Intermediate divisions (if any) are also integers (optional, but cleaner)
        if (target !== standardValue && 
            Number.isInteger(target) && 
            target > 0 && 
            target < 1000 &&
            !isNaN(target)) {
            return {
                tokens,
                target,
                solution: toString(tree, true)
            };
        }
    }
    // Fallback if somehow no puzzle is found
    return { tokens: [10, '+', 5, '*', 2], target: 30, solution: '(10 + 5) * 2' };
}

function generateRandomTree(operands: number): ExpressionNode {
    if (operands <= 1) {
        // Range 2-12 for slightly more variety
        return { type: 'number', value: Math.floor(Math.random() * 11) + 2 };
    }

    const leftCount = Math.floor(Math.random() * (operands - 1)) + 1;
    const rightCount = operands - leftCount;

    // Include division more often now that we handle it
    const ops: Op[] = ['+', '-', '*', '/'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    
    return {
        type: 'binary',
        op,
        left: generateRandomTree(leftCount),
        right: generateRandomTree(rightCount),
        parenthesized: Math.random() < 0.5
    };
}

export type FlatToken = number | Op | '(' | ')';

function formatNumber(n: number): string {
    if (!Number.isFinite(n)) return '?';
    if (Number.isInteger(n)) return n.toString();
    return parseFloat(n.toFixed(4)).toString();
}

export interface TokenView {
    text: string;
    kind: 'num' | 'op' | 'paren';
    spaceBefore: boolean;
}

// Tokens prepared for rendering one per element: "2 * (6 + 2)" keeps its spacing
// but each piece stays individually addressable so connectors can point at it.
export function tokenViews(tokens: FlatToken[]): TokenView[] {
    return tokens.map((t, i) => {
        const kind = t === '(' || t === ')' ? 'paren' : typeof t === 'number' ? 'num' : 'op';
        const spaceBefore = i > 0 && t !== ')' && tokens[i - 1] !== '(';
        return { text: typeof t === 'number' ? formatNumber(t) : t, kind, spaceBefore };
    });
}

export function tokensToString(tokens: FlatToken[]): string {
    return tokenViews(tokens)
        .map((v) => (v.spaceBefore ? ' ' : '') + v.text)
        .join('');
}

function applyOp(left: number, op: Op, right: number): number {
    switch (op) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': return right === 0 ? NaN : left / right;
    }
}

export interface ReductionStep {
    /** The expression after this operation was applied. */
    tokens: FlatToken[];
    /** Indices of the operands consumed, in the *previous* row's token list. */
    left: number;
    right: number;
    /** Index of the value produced, in this step's `tokens`. */
    result: number;
}

// Drop parens that wrap a lone number, e.g. "2 + (3) + 4" -> "2 + 3 + 4".
// Overlapping user selections can produce these, and they add nothing to a step.
// `map` sends each surviving token back to its index in the input.
function stripRedundantParens(tokens: FlatToken[]): { tokens: FlatToken[]; map: number[] } {
    let out = tokens;
    let map = tokens.map((_, i) => i);
    let changed = true;
    while (changed) {
        changed = false;
        for (let i = 0; i + 2 < out.length; i++) {
            if (out[i] === '(' && typeof out[i + 1] === 'number' && out[i + 2] === ')') {
                out = [...out.slice(0, i), out[i + 1], ...out.slice(i + 3)];
                map = [...map.slice(0, i), map[i + 1], ...map.slice(i + 3)];
                changed = true;
                break;
            }
        }
    }
    return { tokens: out, map };
}

// Perform a single evaluation step: the innermost parenthesised group first,
// and within it the leftmost operator of highest precedence.
// Returns null when nothing more can be reduced (or the expression is invalid).
function reduceOnce(tokens: FlatToken[]): ReductionStep | null {
    const { tokens: cur, map } = stripRedundantParens(tokens);

    // Innermost group = last '(' before the first ')'
    let open = -1;
    let close = -1;
    for (let i = 0; i < cur.length; i++) {
        if (cur[i] === '(') open = i;
        else if (cur[i] === ')') { close = i; break; }
    }

    // Range of the segment we evaluate within
    const lo = close === -1 ? 0 : open + 1;
    const hi = close === -1 ? cur.length : close;

    let opIndex = -1;
    for (let i = lo; i < hi; i++) {
        if (cur[i] === '*' || cur[i] === '/') { opIndex = i; break; }
    }
    if (opIndex === -1) {
        for (let i = lo; i < hi; i++) {
            if (cur[i] === '+' || cur[i] === '-') { opIndex = i; break; }
        }
    }
    if (opIndex === -1) return null;

    const left = cur[opIndex - 1];
    const right = cur[opIndex + 1];
    if (typeof left !== 'number' || typeof right !== 'number') return null;

    const value = applyOp(left, cur[opIndex] as Op, right);
    if (!Number.isFinite(value)) return null;

    const operands = { left: map[opIndex - 1], right: map[opIndex + 1] };

    // If this collapses the group to a single number, shed its parens too
    if (close !== -1 && hi - lo === 3) {
        return {
            tokens: [...cur.slice(0, open), value, ...cur.slice(close + 1)],
            result: open,
            ...operands
        };
    }
    return {
        tokens: [...cur.slice(0, opIndex - 1), value, ...cur.slice(opIndex + 2)],
        result: opIndex - 1,
        ...operands
    };
}

// The intermediate forms of an expression, one per evaluation step.
// The final bare number is omitted since it is shown as the expression's value.
export function reductionSteps(tokens: FlatToken[], maxSteps = 64): ReductionStep[] {
    const steps: ReductionStep[] = [];
    let cur = tokens;
    for (let i = 0; i < maxSteps; i++) {
        const next = reduceOnce(cur);
        if (!next) break;
        cur = next.tokens;
        if (cur.length > 1) steps.push(next);
    }
    return steps;
}

export function toString(node: ExpressionNode, includeAllParens = false): string {
    if (node.type === 'number') {
        return node.value!.toString();
    }
    const leftStr = toString(node.left!, includeAllParens);
    const rightStr = toString(node.right!, includeAllParens);
    const content = `${leftStr} ${node.op} ${rightStr}`;
    return node.parenthesized || includeAllParens ? `(${content})` : content;
}
