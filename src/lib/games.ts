export type Category = 'Arithmetic' | 'Logic' | 'Number Theory' | 'Geometry';

export interface Game {
	slug: string;
	title: string;
	description: string;
	categories: Category[];
	otherNames?: string[];
	route: string;
}

export const games: Game[] = [
	{
		slug: 'number-guessing',
		title: 'Number Guessing',
		description: 'Guess the secret number between 1 and 100. Use higher/lower hints to zero in.',
		categories: ['Logic'],
		route: '/games/number-guessing'
	},
	{
		slug: 'arithmetic-blitz',
		title: 'Arithmetic Blitz',
		description: 'Race against the clock answering +, −, ×, ÷ questions. Customise operators, number range, and allow negatives.',
		categories: ['Arithmetic'],
		route: '/games/arithmetic-blitz'
	},
	{
		slug: 'prime-finder',
		title: 'Prime Finder',
		description: 'Enter a number to discover whether it is prime and explore its prime factorization.',
		categories: ['Number Theory'],
		route: '/games/prime-finder'
	},
	{
		slug: 'snake',
		title: 'Snake Math',
		description: 'Follow the chain of operations and fill in every blank square to solve the puzzle.',
		categories: ['Arithmetic'],
		route: '/games/snake'
	},
	{
		slug: 'kakooma',
		title: 'Kakooma',
		description: 'Find the one number in each grid that is the sum or product of two others. Solve all 8 grids to unlock the final puzzle.',
		categories: ['Arithmetic'],
		route: '/games/kakooma'
	},
	{
		slug: 'trail-pack',
		title: 'Trail Pack',
		description: 'Each item has a fixed weight and a random value. Pack the highest-value combination that fits under the weight limit — then see how close you were to optimal.',
		categories: ['Logic'],
		otherNames: ['knapsack'],
		route: '/games/trail-pack'
	},
	{
		slug: 'equato',
		title: 'Equato',
		description: 'Place each number from the bank exactly once so that every row and column forms a valid equation.',
		categories: ['Arithmetic', 'Logic'],
		route: '/games/equato'
	}
];
