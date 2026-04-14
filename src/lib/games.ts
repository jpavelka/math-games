export interface Game {
	slug: string;
	title: string;
	description: string;
	category: 'Arithmetic' | 'Logic' | 'Number Theory' | 'Geometry';
	route: string;
}

export const games: Game[] = [
	{
		slug: 'number-guessing',
		title: 'Number Guessing',
		description: 'Guess the secret number between 1 and 100. Use higher/lower hints to zero in.',
		category: 'Logic',
		route: '/games/number-guessing'
	},
	{
		slug: 'times-tables',
		title: 'Times Tables Quiz',
		description: 'Race against the clock to answer multiplication questions and beat your high score.',
		category: 'Arithmetic',
		route: '/games/times-tables'
	},
	{
		slug: 'prime-finder',
		title: 'Prime Finder',
		description: 'Enter a number to discover whether it is prime and explore its prime factorization.',
		category: 'Number Theory',
		route: '/games/prime-finder'
	},
	{
		slug: 'snake',
		title: 'Snake Math',
		description: 'Follow the chain of operations and fill in every blank square to solve the puzzle.',
		category: 'Arithmetic',
		route: '/games/snake'
	}
];
