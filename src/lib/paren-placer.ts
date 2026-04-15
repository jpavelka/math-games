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

export function toString(node: ExpressionNode, includeAllParens = false): string {
    if (node.type === 'number') {
        return node.value!.toString();
    }
    const leftStr = toString(node.left!, includeAllParens);
    const rightStr = toString(node.right!, includeAllParens);
    const content = `${leftStr} ${node.op} ${rightStr}`;
    return node.parenthesized || includeAllParens ? `(${content})` : content;
}
