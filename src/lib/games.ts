export type Category = 'Arithmetic' | 'Logic' | 'Number Theory' | 'Geometry' | 'Combinatorics' | 'Graph Theory' | 'Information Theory';

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
		categories: ['Logic', 'Information Theory'],
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
		categories: ['Logic', 'Combinatorics'],
		otherNames: ['knapsack'],
		route: '/games/trail-pack'
	},
	{
		slug: 'equato',
		title: 'Equato',
		description: 'Place each number from the bank exactly once so that every row and column forms a valid equation.',
		categories: ['Arithmetic', 'Logic'],
		route: '/games/equato'
	},
	{
		slug: 'road-trip',
		title: 'Road Trip',
		description: 'A set of US cities appears on the map. Visit every city exactly once and return home — in as few kilometres as possible. Can you find the shortest route?',
		categories: ['Graph Theory', 'Combinatorics'],
		otherNames: ['traveling salesman', 'TSP'],
		route: '/games/road-trip'
	},
	{
		slug: 'paren-placer',
		title: 'Paren Placer',
		description: 'Add parentheses to an arithmetic formula to make it correct. Navigate your way to the target value!',
		categories: ['Arithmetic'],
		route: '/games/paren-placer'
	},
	{
		slug: 'bulls-and-cows',
		title: 'Bulls & Cows',
		description: 'Crack a secret code of unique digits. Each guess scores bulls (right digit, right position) and cows (right digit, wrong position). The classic deduction game.',
		categories: ['Logic', 'Information Theory'],
		otherNames: ['mastermind', 'wordle'],
		route: '/games/bulls-and-cows'
	},
	{
		slug: 'wildlife-preserve',
		title: 'Wildlife Preserve',
		description: 'Sort feuding animals into separate habitats so no rivals share one. Use as few habitats as possible — a graph coloring puzzle.',
		categories: ['Graph Theory', 'Combinatorics'],
		otherNames: ['graph coloring', 'chromatic number'],
		route: '/games/wildlife-preserve'
	},
	{
		slug: 'food-cart-festival',
		title: 'Food Cart Festival',
		description: 'Curate the highest-scoring festival lineup. Some vendors refuse to share the event — pick a conflict-free set with the best total popularity.',
		categories: ['Graph Theory', 'Combinatorics'],
		otherNames: ['maximum weight independent set', 'MWIS', 'independent set'],
		route: '/games/food-cart-festival'
	},
	{
		slug: 'billiards',
		title: 'Billiard Bounce',
		description: 'A ball shoots from a corner of an M×N table at 45°. Predict which pocket it lands in. The answer hinges on GCDs and parity — a hidden link between geometry and number theory.',
		categories: ['Geometry', 'Number Theory'],
		otherNames: ['billiard ball', 'bouncing ball', 'GCD geometry'],
		route: '/games/billiards'
	},
	{
		slug: 'factor-chain',
		title: 'Factor Chain',
		description: 'Arrange a set of numbers into a chain where every adjacent pair shares a common prime factor. Prime bottlenecks make it trickier than it looks!',
		categories: ['Number Theory'],
		otherNames: ['factor path', 'common factor', 'prime factor chain'],
		route: '/games/factor-chain'
	},
	{
		slug: 'nim',
		title: 'Nim',
		description: 'Take turns removing objects from piles. Choose any pile and take as many as you like — the player who takes the last object wins.',
		categories: ['Combinatorics', 'Logic'],
		otherNames: ['nim game', 'matchsticks', 'stones'],
		route: '/games/nim'
	}
];
