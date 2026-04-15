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
            else stack.push(left / right);
        } else {
            stack.push(token);
        }
    }
    // Then handle + and -
    let result = stack[0] as number;
    for (let i = 1; i < stack.length; i += 2) {
        const op = stack[i] as Op;
        const right = stack[i + 1] as number;
        if (op === '+') result += right;
        else result -= right;
    }
    return result;
}

export function generatePuzzle(depth: number = 2): { tokens: (number | Op)[], target: number, solution: string } {
    while (true) {
        const tree = generateRandomTree(depth);
        const target = evaluate(tree);
        const tokens = flattenExpression(tree);
        const standardValue = evaluateStandard(tokens);

        if (target !== standardValue && Number.isInteger(target) && target > 0 && target < 200) {
            return {
                tokens,
                target,
                solution: toString(tree, true)
            };
        }
    }
}

function generateRandomTree(depth: number): ExpressionNode {
    if (depth <= 0) {
        return { type: 'number', value: Math.floor(Math.random() * 9) + 2 };
    }
    const ops: Op[] = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    const left = generateRandomTree(depth - 1);
    const right = generateRandomTree(depth - 1);
    
    // Randomly decide if this node is parenthesized in our "correct" version
    // But it only matters if it changes the result compared to standard precedence
    return {
        type: 'binary',
        op,
        left,
        right,
        parenthesized: Math.random() < 0.6
    };
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
