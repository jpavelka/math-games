<script lang="ts">
	import { base } from '$app/paths';
	import * as topojson from 'topojson-client';
	// @ts-ignore — us-atlas has no bundled TS types
	import usAtlasRaw from 'us-atlas/states-10m.json';

	// ── projection (equirectangular, same formula used for city dots) ──────────
	const LAT_MIN = 24.4, LAT_MAX = 49.4;
	const LON_MIN = -124.9, LON_MAX = -66.9;
	const VW = 860, VH = 463, PAD = 20;
	const SVG_W = 900, SVG_H = 503; // viewBox dimensions
	const MIN_W = 150;               // minimum viewBox width (max zoom ≈ 6×)

	function project(lat: number, lon: number): [number, number] {
		const x = PAD + ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * VW;
		const y = PAD + ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * VH;
		return [x, y];
	}

	// ── topojson → SVG path helpers ───────────────────────────────────────────
	function meshToPath(mesh: any): string {
		return (mesh.coordinates as number[][][]).map(line =>
			'M' + line.map(([lon, lat]) => {
				const [x, y] = project(lat, lon);
				return `${x.toFixed(1)},${y.toFixed(1)}`;
			}).join('L')
		).join('');
	}

	function geomToPath(geom: any): string {
		const rings: number[][][] = geom.type === 'MultiPolygon'
			? (geom.coordinates as number[][][][]).flat(1)
			: (geom.coordinates as number[][][]);
		return rings.map(ring =>
			'M' + ring.map(([lon, lat]) => {
				const [x, y] = project(lat, lon);
				return `${x.toFixed(1)},${y.toFixed(1)}`;
			}).join('L') + 'Z'
		).join('');
	}

	// ── build static map paths once ───────────────────────────────────────────
	const atlas = usAtlasRaw as any;
	const NATION_PATH  = geomToPath((topojson.feature(atlas, atlas.objects.nation) as any).features[0].geometry);
	const BORDERS_PATH = meshToPath(topojson.mesh(atlas, atlas.objects.states, (a: any, b: any) => a !== b));
	const COAST_PATH   = meshToPath(topojson.mesh(atlas, atlas.objects.nation));

	// ── city data ──────────────────────────────────────────────────────────────
	interface City { name: string; state: string; lat: number; lon: number; isCapital: boolean; }

	const CITIES: City[] = [
		// Lower 48 state capitals
		{ name: 'Montgomery',     state: 'AL', lat: 32.361, lon:  -86.279, isCapital: true },
		{ name: 'Phoenix',        state: 'AZ', lat: 33.448, lon: -112.074, isCapital: true },
		{ name: 'Little Rock',    state: 'AR', lat: 34.746, lon:  -92.290, isCapital: true },
		{ name: 'Sacramento',     state: 'CA', lat: 38.582, lon: -121.494, isCapital: true },
		{ name: 'Denver',         state: 'CO', lat: 39.739, lon: -104.990, isCapital: true },
		{ name: 'Hartford',       state: 'CT', lat: 41.766, lon:  -72.685, isCapital: true },
		{ name: 'Dover',          state: 'DE', lat: 39.158, lon:  -75.524, isCapital: true },
		{ name: 'Tallahassee',    state: 'FL', lat: 30.438, lon:  -84.281, isCapital: true },
		{ name: 'Atlanta',        state: 'GA', lat: 33.749, lon:  -84.388, isCapital: true },
		{ name: 'Boise',          state: 'ID', lat: 43.615, lon: -116.202, isCapital: true },
		{ name: 'Springfield',    state: 'IL', lat: 39.782, lon:  -89.650, isCapital: true },
		{ name: 'Indianapolis',   state: 'IN', lat: 39.768, lon:  -86.158, isCapital: true },
		{ name: 'Des Moines',     state: 'IA', lat: 41.587, lon:  -93.625, isCapital: true },
		{ name: 'Topeka',         state: 'KS', lat: 39.047, lon:  -95.675, isCapital: true },
		{ name: 'Frankfort',      state: 'KY', lat: 38.201, lon:  -84.873, isCapital: true },
		{ name: 'Baton Rouge',    state: 'LA', lat: 30.452, lon:  -91.187, isCapital: true },
		{ name: 'Augusta',        state: 'ME', lat: 44.311, lon:  -69.780, isCapital: true },
		{ name: 'Annapolis',      state: 'MD', lat: 38.978, lon:  -76.492, isCapital: true },
		{ name: 'Boston',         state: 'MA', lat: 42.360, lon:  -71.059, isCapital: true },
		{ name: 'Lansing',        state: 'MI', lat: 42.733, lon:  -84.556, isCapital: true },
		{ name: 'Saint Paul',     state: 'MN', lat: 44.954, lon:  -93.090, isCapital: true },
		{ name: 'Jackson',        state: 'MS', lat: 32.299, lon:  -90.185, isCapital: true },
		{ name: 'Jefferson City', state: 'MO', lat: 38.577, lon:  -92.174, isCapital: true },
		{ name: 'Helena',         state: 'MT', lat: 46.596, lon: -112.027, isCapital: true },
		{ name: 'Lincoln',        state: 'NE', lat: 40.814, lon:  -96.703, isCapital: true },
		{ name: 'Carson City',    state: 'NV', lat: 39.164, lon: -119.767, isCapital: true },
		{ name: 'Concord',        state: 'NH', lat: 43.208, lon:  -71.538, isCapital: true },
		{ name: 'Trenton',        state: 'NJ', lat: 40.217, lon:  -74.743, isCapital: true },
		{ name: 'Santa Fe',       state: 'NM', lat: 35.687, lon: -105.938, isCapital: true },
		{ name: 'Albany',         state: 'NY', lat: 42.653, lon:  -73.756, isCapital: true },
		{ name: 'Raleigh',        state: 'NC', lat: 35.780, lon:  -78.638, isCapital: true },
		{ name: 'Bismarck',       state: 'ND', lat: 46.808, lon: -100.784, isCapital: true },
		{ name: 'Columbus',       state: 'OH', lat: 39.961, lon:  -82.999, isCapital: true },
		{ name: 'Oklahoma City',  state: 'OK', lat: 35.468, lon:  -97.516, isCapital: true },
		{ name: 'Salem',          state: 'OR', lat: 44.943, lon: -123.035, isCapital: true },
		{ name: 'Harrisburg',     state: 'PA', lat: 40.273, lon:  -76.887, isCapital: true },
		{ name: 'Providence',     state: 'RI', lat: 41.824, lon:  -71.413, isCapital: true },
		{ name: 'Columbia',       state: 'SC', lat: 34.001, lon:  -81.035, isCapital: true },
		{ name: 'Pierre',         state: 'SD', lat: 44.368, lon: -100.351, isCapital: true },
		{ name: 'Nashville',      state: 'TN', lat: 36.163, lon:  -86.782, isCapital: true },
		{ name: 'Austin',         state: 'TX', lat: 30.267, lon:  -97.743, isCapital: true },
		{ name: 'Salt Lake City', state: 'UT', lat: 40.761, lon: -111.891, isCapital: true },
		{ name: 'Montpelier',     state: 'VT', lat: 44.260, lon:  -72.575, isCapital: true },
		{ name: 'Richmond',       state: 'VA', lat: 37.541, lon:  -77.436, isCapital: true },
		{ name: 'Olympia',        state: 'WA', lat: 47.038, lon: -122.901, isCapital: true },
		{ name: 'Charleston',     state: 'WV', lat: 38.350, lon:  -81.633, isCapital: true },
		{ name: 'Madison',        state: 'WI', lat: 43.073, lon:  -89.401, isCapital: true },
		{ name: 'Cheyenne',       state: 'WY', lat: 41.140, lon: -104.820, isCapital: true },
		// Additional populous cities
		{ name: 'New York',        state: 'NY', lat: 40.713, lon:  -74.006, isCapital: false },
		{ name: 'Los Angeles',     state: 'CA', lat: 34.052, lon: -118.244, isCapital: false },
		{ name: 'Chicago',         state: 'IL', lat: 41.878, lon:  -87.630, isCapital: false },
		{ name: 'Houston',         state: 'TX', lat: 29.760, lon:  -95.370, isCapital: false },
		{ name: 'Philadelphia',    state: 'PA', lat: 39.953, lon:  -75.165, isCapital: false },
		{ name: 'San Antonio',     state: 'TX', lat: 29.424, lon:  -98.494, isCapital: false },
		{ name: 'San Diego',       state: 'CA', lat: 32.716, lon: -117.161, isCapital: false },
		{ name: 'Dallas',          state: 'TX', lat: 32.777, lon:  -96.797, isCapital: false },
		{ name: 'San Jose',        state: 'CA', lat: 37.338, lon: -121.886, isCapital: false },
		{ name: 'Jacksonville',    state: 'FL', lat: 30.332, lon:  -81.656, isCapital: false },
		{ name: 'Fort Worth',      state: 'TX', lat: 32.756, lon:  -97.331, isCapital: false },
		{ name: 'Charlotte',       state: 'NC', lat: 35.227, lon:  -80.843, isCapital: false },
		{ name: 'San Francisco',   state: 'CA', lat: 37.775, lon: -122.419, isCapital: false },
		{ name: 'Seattle',         state: 'WA', lat: 47.606, lon: -122.332, isCapital: false },
		{ name: 'El Paso',         state: 'TX', lat: 31.762, lon: -106.485, isCapital: false },
		{ name: 'Washington',      state: 'DC', lat: 38.907, lon:  -77.037, isCapital: false },
		{ name: 'Las Vegas',       state: 'NV', lat: 36.170, lon: -115.140, isCapital: false },
		{ name: 'Louisville',      state: 'KY', lat: 38.253, lon:  -85.759, isCapital: false },
		{ name: 'Memphis',         state: 'TN', lat: 35.150, lon:  -90.049, isCapital: false },
		{ name: 'Portland',        state: 'OR', lat: 45.505, lon: -122.675, isCapital: false },
		{ name: 'Baltimore',       state: 'MD', lat: 39.290, lon:  -76.612, isCapital: false },
		{ name: 'Milwaukee',       state: 'WI', lat: 43.039, lon:  -87.907, isCapital: false },
		{ name: 'Albuquerque',     state: 'NM', lat: 35.084, lon: -106.650, isCapital: false },
		{ name: 'Tucson',          state: 'AZ', lat: 32.223, lon: -110.975, isCapital: false },
		{ name: 'Fresno',          state: 'CA', lat: 36.738, lon: -119.787, isCapital: false },
		{ name: 'Mesa',            state: 'AZ', lat: 33.415, lon: -111.832, isCapital: false },
		{ name: 'Kansas City',     state: 'MO', lat: 39.100, lon:  -94.579, isCapital: false },
		{ name: 'Omaha',           state: 'NE', lat: 41.257, lon:  -95.935, isCapital: false },
		{ name: 'Colorado Springs',state: 'CO', lat: 38.834, lon: -104.821, isCapital: false },
		{ name: 'Long Beach',      state: 'CA', lat: 33.770, lon: -118.194, isCapital: false },
		{ name: 'Virginia Beach',  state: 'VA', lat: 36.853, lon:  -75.978, isCapital: false },
		{ name: 'Minneapolis',     state: 'MN', lat: 44.978, lon:  -93.265, isCapital: false },
		{ name: 'Tampa',           state: 'FL', lat: 27.951, lon:  -82.457, isCapital: false },
		{ name: 'New Orleans',     state: 'LA', lat: 29.951, lon:  -90.072, isCapital: false },
		{ name: 'Arlington',       state: 'TX', lat: 32.736, lon:  -97.108, isCapital: false },
		{ name: 'Bakersfield',     state: 'CA', lat: 35.373, lon: -119.019, isCapital: false },
		{ name: 'Wichita',         state: 'KS', lat: 37.687, lon:  -97.330, isCapital: false },
		{ name: 'Aurora',          state: 'CO', lat: 39.729, lon: -104.832, isCapital: false },
		{ name: 'Anaheim',         state: 'CA', lat: 33.837, lon: -117.914, isCapital: false },
		{ name: 'Corpus Christi',  state: 'TX', lat: 27.801, lon:  -97.396, isCapital: false },
		{ name: 'Riverside',       state: 'CA', lat: 33.981, lon: -117.376, isCapital: false },
		{ name: 'Lexington',       state: 'KY', lat: 38.041, lon:  -84.504, isCapital: false },
		{ name: 'St. Louis',       state: 'MO', lat: 38.627, lon:  -90.199, isCapital: false },
		{ name: 'Pittsburgh',      state: 'PA', lat: 40.441, lon:  -79.996, isCapital: false },
		{ name: 'Stockton',        state: 'CA', lat: 37.958, lon: -121.291, isCapital: false },
		{ name: 'Cincinnati',      state: 'OH', lat: 39.103, lon:  -84.512, isCapital: false },
		{ name: 'Greensboro',      state: 'NC', lat: 36.073, lon:  -79.792, isCapital: false },
		{ name: 'Newark',          state: 'NJ', lat: 40.736, lon:  -74.172, isCapital: false },
		{ name: 'Buffalo',         state: 'NY', lat: 42.886, lon:  -78.878, isCapital: false },
		{ name: 'St. Petersburg',  state: 'FL', lat: 27.768, lon:  -82.640, isCapital: false },
		{ name: 'Plano',           state: 'TX', lat: 33.020, lon:  -96.699, isCapital: false },
	];

	// ── distance ───────────────────────────────────────────────────────────────
	function haversineKm(a: City, b: City): number {
		const R = 6371;
		const dLat = (b.lat - a.lat) * Math.PI / 180;
		const dLon = (b.lon - a.lon) * Math.PI / 180;
		const h = Math.sin(dLat / 2) ** 2 +
			Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
			Math.sin(dLon / 2) ** 2;
		return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
	}

	function fmtKm(km: number): string {
		return Math.round(km).toLocaleString('en-US') + ' km';
	}

	// ── Held-Karp exact TSP solver ────────────────────────────────────────────
	function solveHeldKarp(dist: number[][]): { tour: number[]; distance: number; timeMs: number } {
		const t0 = performance.now();
		const n = dist.length;
		if (n <= 1) return { tour: n ? [0] : [], distance: 0, timeMs: 0 };
		if (n === 2) return { tour: [0, 1], distance: dist[0][1] + dist[1][0], timeMs: performance.now() - t0 };

		const STATES = 1 << n;
		const INF    = 1e9;
		// Flat typed arrays indexed by mask * n + city
		const dp     = new Float32Array(STATES * n).fill(INF);
		const parent = new Int8Array(STATES * n).fill(-1);

		dp[1 * n + 0] = 0; // at city 0, visited = {0}

		for (let mask = 1; mask < STATES; mask++) {
			if (!(mask & 1)) continue; // city 0 must always be in the visited set
			for (let u = 0; u < n; u++) {
				if (!(mask & (1 << u))) continue;
				const dpU = dp[mask * n + u];
				if (dpU >= INF) continue;
				for (let v = 0; v < n; v++) {
					if (mask & (1 << v)) continue;
					const newMask = mask | (1 << v);
					const cost    = dpU + dist[u][v];
					if (cost < dp[newMask * n + v]) {
						dp[newMask * n + v]     = cost;
						parent[newMask * n + v] = u;
					}
				}
			}
		}

		// Find cheapest final leg back to city 0
		const fullMask = STATES - 1;
		let bestDist = INF, lastCity = 1;
		for (let u = 1; u < n; u++) {
			const d = dp[fullMask * n + u] + dist[u][0];
			if (d < bestDist) { bestDist = d; lastCity = u; }
		}

		// Reconstruct tour (ends up starting at city 0)
		const tour: number[] = [];
		let mask = fullMask, city: number = lastCity;
		while (city >= 0) {
			tour.push(city);
			const prev = parent[mask * n + city];
			mask ^= (1 << city);
			city = prev;
		}
		tour.reverse();

		return { tour, distance: bestDist, timeMs: performance.now() - t0 };
	}

	// ── game state ─────────────────────────────────────────────────────────────
	const DIFFICULTY = [
		{ label: 'Easy',   count: 8  },
		{ label: 'Medium', count: 12 },
		{ label: 'Hard',   count: 16 },
		{ label: 'Expert', count: 20 },
	] as const;

	type Phase = 'idle' | 'playing' | 'done';

	let difficulty  = $state(12);
	let phase       = $state<Phase>('idle');
	let gameCities  = $state<City[]>([]);
	let path        = $state<number[]>([]);
	let hovered     = $state<number | null>(null);
	let showMatrix      = $state(false);
	let optimalTour     = $state<number[] | null>(null);
	let optimalDistance = $state<number | null>(null);
	let solverMs        = $state<number | null>(null);
	let solverRunning   = $state(false);
	let showOptimal     = $state(false);

	function shuffle<T>(arr: T[]): T[] {
		const a = [...arr];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	function startGame() {
		gameCities      = shuffle([...CITIES]).slice(0, difficulty);
		path            = [];
		hovered         = null;
		phase           = 'playing';
		optimalTour     = null;
		optimalDistance = null;
		solverMs        = null;
		solverRunning   = true;
		showOptimal     = false;

		const snapshot = [...gameCities];
		setTimeout(() => {
			const mat = snapshot.map((a, i) =>
				snapshot.map((b, j) => i === j ? 0 : haversineKm(a, b))
			);
			try {
				const result = solveHeldKarp(mat);
				optimalTour     = result.tour;
				optimalDistance = result.distance;
				solverMs        = result.timeMs;
				if (phase === 'done') {
					showOptimal = Math.round(totalDistance) > Math.round(result.distance);
				}
			} catch {
				// allocation or compute failure (e.g. OOM on very large n)
			}
			solverRunning = false;
		}, 0);
	}

	function clickCity(i: number) {
		if (isDrag || phase !== 'playing' || path.includes(i)) return;
		path = [...path, i];
	}

	function undoLast() { path = path.slice(0, -1); }

	function closeRoute() {
		if (path.length === gameCities.length) {
			phase = 'done';
			if (optimalDistance !== null) {
				showOptimal = Math.round(totalDistance) > Math.round(optimalDistance);
			}
		}
	}

	// ── zoom / pan ────────────────────────────────────────────────────────────
	let vb        = $state({ x: 0, y: 0, w: SVG_W, h: SVG_H });
	let svgEl     = $state<SVGSVGElement | null>(null);
	let isPanning = $state(false);
	let mapWidth  = $state(SVG_W); // actual rendered pixel width of the SVG element

	// Non-reactive pointer tracking (no need to re-render on these)
	let _ptrs  = new Map<number, { x: number; y: number }>();
	let _panSt: { cx: number; cy: number; vbx: number; vby: number } | null = null;
	let _pinSt: { mx: number; my: number; d: number; vb: typeof vb } | null = null;
	let _dnX = 0, _dnY = 0;
	let isDrag = false;

	function clampVb(v: { x: number; y: number; w: number; h: number }) {
		const w = Math.max(MIN_W, Math.min(SVG_W, v.w));
		const h = w * SVG_H / SVG_W;
		return { w, h, x: Math.max(0, Math.min(SVG_W - w, v.x)), y: Math.max(0, Math.min(SVG_H - h, v.y)) };
	}

	function zoomAt(factor: number, cx: number, cy: number) {
		if (!svgEl) return;
		const r  = svgEl.getBoundingClientRect();
		const rx = (cx - r.left) / r.width;
		const ry = (cy - r.top)  / r.height;
		const nw = Math.max(MIN_W, Math.min(SVG_W, vb.w / factor));
		const nh = nw * SVG_H / SVG_W;
		const px = vb.x + rx * vb.w;
		const py = vb.y + ry * vb.h;
		vb = clampVb({ x: px - rx * nw, y: py - ry * nh, w: nw, h: nh });
	}

	$effect(() => {
		const el = svgEl;
		if (!el) return;
		const onWheel = (e: WheelEvent) => {
			e.preventDefault();
			zoomAt(e.deltaY < 0 ? 1.25 : 1 / 1.25, e.clientX, e.clientY);
		};
		el.addEventListener('wheel', onWheel, { passive: false });
		return () => el.removeEventListener('wheel', onWheel);
	});

	function onPD(e: PointerEvent) {
		// Do NOT call setPointerCapture here — doing so retargets pointerup to the
		// SVG which prevents click events firing on city <g> elements.
		// Capture is deferred to onPM once a drag is confirmed.
		_ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
		_dnX = e.clientX; _dnY = e.clientY;
		isDrag = false;
		if (_ptrs.size === 1) {
			_panSt = { cx: e.clientX, cy: e.clientY, vbx: vb.x, vby: vb.y };
			_pinSt = null;
		} else if (_ptrs.size === 2) {
			// Capture both pointers immediately for pinch — no click conflict here
			for (const id of _ptrs.keys()) svgEl?.setPointerCapture(id);
			const pts = [..._ptrs.values()];
			_pinSt = {
				mx: (pts[0].x + pts[1].x) / 2, my: (pts[0].y + pts[1].y) / 2,
				d: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y),
				vb: { ...vb },
			};
			_panSt = null;
		}
	}

	function onPM(e: PointerEvent) {
		if (!_ptrs.has(e.pointerId)) return;
		_ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });

		if (!isDrag && Math.hypot(e.clientX - _dnX, e.clientY - _dnY) > 4) {
			isDrag = true;
			// Capture now that we're sure it's a drag, not a tap
			if (_ptrs.size === 1) { svgEl?.setPointerCapture(e.pointerId); isPanning = true; }
		}

		if (_ptrs.size === 1 && _panSt && isDrag) {
			const r  = svgEl!.getBoundingClientRect();
			const dx = (e.clientX - _panSt.cx) / r.width  * vb.w;
			const dy = (e.clientY - _panSt.cy) / r.height * vb.h;
			vb = clampVb({ ...vb, x: _panSt.vbx - dx, y: _panSt.vby - dy });
		} else if (_ptrs.size === 2 && _pinSt) {
			const pts  = [..._ptrs.values()];
			const d    = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
			const mx   = (pts[0].x + pts[1].x) / 2;
			const my   = (pts[0].y + pts[1].y) / 2;
			const r    = svgEl!.getBoundingClientRect();
			const f    = d / _pinSt.d;
			const nw   = Math.max(MIN_W, Math.min(SVG_W, _pinSt.vb.w / f));
			const nh   = nw * SVG_H / SVG_W;
			// grip = where the initial midpoint was in viewBox space; keep it at (mx,my) on screen
			const grip = {
				x: _pinSt.vb.x + (_pinSt.mx - r.left) / r.width  * _pinSt.vb.w,
				y: _pinSt.vb.y + (_pinSt.my - r.top)  / r.height * _pinSt.vb.h,
			};
			const rx = (mx - r.left) / r.width;
			const ry = (my - r.top)  / r.height;
			vb = clampVb({ x: grip.x - rx * nw, y: grip.y - ry * nh, w: nw, h: nh });
		}
	}

	function onPU(e: PointerEvent) {
		_ptrs.delete(e.pointerId);
		if (_ptrs.size < 2) _pinSt = null;
		if (_ptrs.size === 0) { _panSt = null; isPanning = false; }
	}

	// ── derived ───────────────────────────────────────────────────────────────
	const pts        = $derived(gameCities.map(c => project(c.lat, c.lon)));
	const allVisited = $derived(path.length === gameCities.length && gameCities.length > 0);

	const openDistance = $derived.by(() => {
		let d = 0;
		for (let i = 1; i < path.length; i++)
			d += haversineKm(gameCities[path[i - 1]], gameCities[path[i]]);
		return d;
	});

	const totalDistance = $derived.by(() => {
		if (!allVisited || path.length < 2) return openDistance;
		return openDistance + haversineKm(gameCities[path[path.length - 1]], gameCities[path[0]]);
	});

	const polylinePoints = $derived(path.map(i => pts[i].join(',')).join(' '));

	const closingSeg = $derived.by(() => {
		if (!allVisited || path.length < 2) return null;
		const [x1, y1] = pts[path[path.length - 1]];
		const [x2, y2] = pts[path[0]];
		return { x1, y1, x2, y2 };
	});

	const previewSeg = $derived.by(() => {
		if (phase !== 'playing' || path.length === 0 || hovered === null) return null;
		if (path.includes(hovered)) return null;
		const [x1, y1] = pts[path[path.length - 1]];
		const [x2, y2] = pts[hovered];
		return { x1, y1, x2, y2 };
	});

	const visitOrder = $derived(new Map(path.map((ci, idx) => [ci, idx + 1])));
	// PX: one screen-pixel expressed in SVG viewBox units.
	// Accounts for both zoom level (vb.w) and actual display width (mapWidth),
	// so all symbols stay at consistent screen-pixel sizes on any screen size.
	const PX = $derived(vb.w / Math.max(1, mapWidth));

	const optimalPolylinePoints = $derived(
		optimalTour && optimalTour.length >= 2
			? [...optimalTour, optimalTour[0]].map(i => pts[i].join(',')).join(' ')
			: ''
	);

	// ── distance matrix ───────────────────────────────────────────────────────
	const distMatrix = $derived(
		gameCities.map((a, i) => gameCities.map((b, j) => i === j ? 0 : haversineKm(a, b)))
	);

	const distStats = $derived.by(() => {
		let min = Infinity, max = -Infinity;
		for (const row of distMatrix)
			for (const d of row)
				if (d > 0) { min = Math.min(min, d); max = Math.max(max, d); }
		return { min, max };
	});

	const pathEdges = $derived.by(() => {
		const s = new Set<string>();
		for (let k = 0; k < path.length - 1; k++) {
			s.add(`${path[k]},${path[k + 1]}`);
			s.add(`${path[k + 1]},${path[k]}`);
		}
		if (phase === 'done' && path.length >= 2) {
			const a = path[path.length - 1], b = path[0];
			s.add(`${a},${b}`); s.add(`${b},${a}`);
		}
		return s;
	});

	function cellBg(d: number): string {
		const { min, max } = distStats;
		const t = (d - min) / (max - min); // 0 = shortest, 1 = longest
		const hue = Math.round((1 - t) * 110); // 110=green, 0=red
		return `hsla(${hue},55%,38%,0.55)`;
	}

	// ── drag-and-drop list ────────────────────────────────────────────────────
	type DragSrc = { kind: 'available'; cityIdx: number } | { kind: 'route'; pathPos: number };
	let drag       = $state<DragSrc | null>(null);
	let dropTarget = $state<number | null>(null); // insert position in path

	function onDragStart(e: DragEvent, src: DragSrc) {
		drag = src;
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	function onDragEnd() { drag = null; dropTarget = null; }

	function onZoneOver(e: DragEvent, pos: number) {
		e.preventDefault();
		e.stopPropagation(); // prevent container from overriding dropTarget
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		if (dropTarget !== pos) dropTarget = pos;
	}

	function onDrop(e: DragEvent, pos: number) {
		e.preventDefault();
		e.stopPropagation(); // prevent container from firing a second drop at path.length
		if (!drag) return;
		if (drag.kind === 'available') {
			// Insert city at position
			const p = [...path];
			p.splice(pos, 0, drag.cityIdx);
			path = p;
		} else {
			// Reorder within route
			const from = drag.pathPos;
			if (from === pos || from + 1 === pos) { drag = null; dropTarget = null; return; }
			const p = [...path];
			const [item] = p.splice(from, 1);
			p.splice(from < pos ? pos - 1 : pos, 0, item);
			path = p;
		}
		drag = null; dropTarget = null;
	}

	function onDropAvailable(e: DragEvent) {
		e.preventDefault();
		if (!drag || drag.kind !== 'route') return;
		path = path.filter((_, i) => i !== (drag as { kind: 'route'; pathPos: number }).pathPos);
		drag = null; dropTarget = null;
	}

	const availableCities = $derived(
		gameCities.map((c, i) => ({ c, i })).filter(({ i }) => !path.includes(i))
	);

	// ── position dialog ───────────────────────────────────────────────────────
	let dialogCity  = $state<number | null>(null); // index into gameCities
	let dialogInput = $state('');
	let dialogEl    = $state<HTMLDialogElement | null>(null);

	function openPositionDialog(cityIdx: number) {
		if (isDrag || phase === 'idle') return;
		dialogCity  = cityIdx;
		const pos   = path.indexOf(cityIdx);
		dialogInput = pos >= 0 ? String(pos + 1) : String(path.length + 1);
		dialogEl?.showModal();
	}

	function closeDialog() {
		dialogEl?.close();
		dialogCity  = null;
		dialogInput = '';
	}

	function confirmDialog() {
		if (dialogCity === null) return;
		const n = parseInt(dialogInput, 10);
		if (!isNaN(n)) {
			const currentPos = path.indexOf(dialogCity);
			if (currentPos === -1) {
				// Not in route — insert at position
				const p = [...path];
				p.splice(Math.max(0, Math.min(n - 1, path.length)), 0, dialogCity);
				path = p;
			} else {
				// Already in route — move to new position
				const p = [...path];
				p.splice(currentPos, 1);
				p.splice(Math.max(0, Math.min(n - 1, p.length)), 0, dialogCity);
				path = p;
			}
		}
		closeDialog();
	}
</script>

<svelte:head>
	<title>Road Trip — Math Games</title>
</svelte:head>

<div class="page">
	<a href="{base}/" class="back">← Back to games</a>
	<h1>Road Trip</h1>

	<p class="desc">
		A set of US cities appears on the map. Visit every city exactly once
		and return to your starting point — in as few kilometres as possible.
		Click cities in the order you want to visit them, then close the loop.
	</p>

	<!-- ══ IDLE ══════════════════════════════════════════════════════════════ -->
	{#if phase === 'idle'}
		<div class="settings">
			<div class="setting-row">
				<span class="setting-label">Cities</span>
				<div class="toggle-group">
					{#each DIFFICULTY as d}
						<button class="tog-btn" class:active={difficulty === d.count}
							onclick={() => (difficulty = d.count)}
						>{d.label} ({d.count})</button>
					{/each}
				</div>
			</div>
		</div>
		<div class="center">
			<button class="btn large" onclick={startGame}>Start Road Trip</button>
		</div>

	<!-- ══ PLAYING / DONE ════════════════════════════════════════════════════ -->
	{:else}
		<div class="hud">
			<div class="hud-stats">
				<span class="hud-cities">
					{path.length} <span class="hud-of">of</span> {gameCities.length} cities
				</span>
				<span class="hud-dist">
					{#if phase === 'done'}
						Total: <strong>{fmtKm(totalDistance)}</strong>
					{:else if allVisited}
						Route: <strong>{fmtKm(totalDistance)}</strong> (inc. closing leg)
					{:else if path.length >= 2}
						So far: <strong>{fmtKm(openDistance)}</strong>
					{:else}
						Click a city to begin
					{/if}
				</span>
				{#if solverRunning && phase === 'done'}
					<span class="hud-dist hud-computing">Computing optimal…</span>
				{:else if phase === 'done' && optimalDistance !== null}
					{#if Math.round(totalDistance) <= Math.round(optimalDistance)}
						<span class="hud-optimal-found">Optimal route!</span>
					{:else}
						<span class="hud-dist">
							Optimal: <strong>{fmtKm(optimalDistance)}</strong>
							<span class="solver-meta">+{((totalDistance / optimalDistance - 1) * 100).toFixed(1)}% over optimal</span>
						</span>
					{/if}
				{/if}
			</div>
			<div class="hud-actions">
				{#if vb.w < SVG_W - 1}
					<button class="btn sm btn-ghost" onclick={() => vb = { x: 0, y: 0, w: SVG_W, h: SVG_H }}>
						Reset zoom
					</button>
				{/if}
				{#if phase === 'playing'}
					<button class="btn sm btn-ghost" onclick={() => (phase = 'idle')}>New Game</button>
					<button class="btn sm btn-ghost" onclick={undoLast} disabled={path.length === 0}>Undo</button>
					<button class="btn sm btn-ghost" onclick={() => { path = []; }} disabled={path.length === 0}>Clear</button>
					{#if allVisited}
						<button class="btn sm" onclick={closeRoute}>Submit Route</button>
					{/if}
				{:else}
					<button class="btn sm btn-ghost" onclick={() => (phase = 'idle')}>Settings</button>
					<button class="btn sm" onclick={startGame}>Play Again</button>
				{/if}
			</div>
		</div>

		<!-- ── Map ─────────────────────────────────────────────────────────── -->
		<div class="map-wrap" bind:clientWidth={mapWidth}>
			<svg viewBox="{vb.x} {vb.y} {vb.w} {vb.h}"
				class="map-svg" class:map-panning={isPanning} class:map-zoomed={vb.w < SVG_W - 1}
				bind:this={svgEl}
				onpointerdown={onPD} onpointermove={onPM} onpointerup={onPU} onpointercancel={onPU}
				style="touch-action:none"
				role="img" aria-label="US city map"
			>
				<defs>
					<clipPath id="map-clip"><rect width="900" height="503"/></clipPath>
				</defs>

				<!-- water background -->
				<rect width="900" height="503" fill="#16233a" rx="6"/>

				<g clip-path="url(#map-clip)">
					<!-- land fill -->
					<path d={NATION_PATH} fill="#1d2e42"/>
					<!-- state interior borders -->
					<path d={BORDERS_PATH} fill="none" stroke="#2a4060" stroke-width="0.6"/>
					<!-- coastline -->
					<path d={COAST_PATH} fill="none" stroke="#2e4d6e" stroke-width="1"/>

					<!-- optimal route (Held-Karp) -->
					{#if showOptimal && optimalPolylinePoints}
						<polyline points={optimalPolylinePoints} fill="none"
							stroke="#4ade80" stroke-width={2 * PX}
							stroke-opacity="0.55" stroke-linejoin="round" stroke-linecap="round"
							stroke-dasharray="{6 * PX} {3 * PX}"/>
					{/if}

					<!-- route drawn so far -->
					{#if path.length >= 2}
						<polyline points={polylinePoints} fill="none"
							stroke="var(--color-accent)" stroke-width={2 * PX}
							stroke-opacity="0.8" stroke-linejoin="round" stroke-linecap="round"/>
					{/if}

					<!-- closing segment -->
					{#if closingSeg}
						<line x1={closingSeg.x1} y1={closingSeg.y1}
							x2={closingSeg.x2} y2={closingSeg.y2}
							stroke="var(--color-accent)" stroke-width={2 * PX} stroke-opacity="0.7"
							stroke-dasharray={phase === 'done' ? undefined : `${7 * PX} ${4 * PX}`}
							stroke-linecap="round"/>
					{/if}

					<!-- preview segment -->
					{#if previewSeg}
						<line x1={previewSeg.x1} y1={previewSeg.y1}
							x2={previewSeg.x2} y2={previewSeg.y2}
							stroke="#fff" stroke-width={1.5 * PX} stroke-opacity="0.3"
							stroke-dasharray="{4 * PX} {3 * PX}" stroke-linecap="round"/>
					{/if}

					<!-- cities -->
					{#each gameCities as city, i}
						{@const [cx, cy] = pts[i]}
						{@const order    = visitOrder.get(i)}
						{@const isStart  = path[0] === i}
						{@const isIn     = order !== undefined}
						{@const isHov    = hovered === i}
						{@const canClick = phase === 'playing' && !isIn}

						<g class:city-btn={canClick}
							onmouseenter={() => { hovered = i; }}
							onmouseleave={() => { hovered = null; }}
							onclick={() => clickCity(i)}
							role={canClick ? 'button' : undefined}
							tabindex={canClick ? 0 : undefined}
							onkeydown={canClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') clickCity(i); } : undefined}
							aria-label={canClick ? `Add ${city.name}, ${city.state}` : undefined}
							ondblclick={(e) => { e.stopPropagation(); openPositionDialog(i); }}
						>
							<circle cx={cx} cy={cy} r={18 * PX} fill="transparent"/>
							<circle cx={cx} cy={cy}
								r={(isIn ? 7 : isHov ? 6 : 4) * PX}
								fill={isStart ? '#4ade80' : isIn ? 'var(--color-accent)' : isHov ? '#fff' : '#a8c8e8'}
								stroke={isHov && canClick ? '#fff' : 'none'}
								stroke-width={2 * PX}
							/>
							{#if isIn}
								<text x={cx} y={cy} text-anchor="middle" dominant-baseline="central"
									font-size={8 * PX} font-weight="800" fill={isStart ? '#14532d' : '#fff'}
									pointer-events="none">{order}</text>
							{/if}
							<text x={cx} y={cy + 14 * PX} text-anchor="middle"
								font-size={10 * PX} font-weight={isIn ? '700' : '500'}
								fill={isIn || isHov ? '#fff' : '#c8dff0'}
								pointer-events="none">{city.name}, {city.state}</text>
						</g>
					{/each}
				</g>
			</svg>
		</div>

		<!-- ── City lists ───────────────────────────────────────────────────── -->
		<div class="lists-area">
			<!-- Available -->
			<div class="list-panel">
				<div class="list-header">
					<span class="list-title">Available</span>
					<span class="list-count">{availableCities.length} cities</span>
				</div>
				<div class="city-list"
					ondragover={(e) => { if (drag?.kind === 'route') e.preventDefault(); }}
					ondrop={onDropAvailable}
				>
					{#each availableCities as { c, i }}
						<div class="city-item"
							class:is-dragging={drag?.kind === 'available' && drag.cityIdx === i}
							draggable="true"
							ondragstart={(e) => onDragStart(e, { kind: 'available', cityIdx: i })}
							ondragend={onDragEnd}
							role="button" tabindex="0"
						>
							<span class="drag-handle" aria-hidden="true">⠿</span>
							<span class="city-lbl">{c.name}<span class="city-st">, {c.state}</span></span>
						</div>
					{/each}
					{#if availableCities.length === 0}
						<p class="list-empty">All cities are in your route</p>
					{/if}
				</div>
			</div>

			<!-- Route order -->
			<div class="list-panel">
				<div class="list-header">
					<span class="list-title">Your Route</span>
					{#if path.length >= 2}
						<span class="list-count">{fmtKm(allVisited ? totalDistance : openDistance)}</span>
					{/if}
				</div>
				<div class="city-list route-list"
					ondragover={(e) => { if (drag) { e.preventDefault(); if (dropTarget !== path.length) dropTarget = path.length; }}}
					ondrop={(e) => onDrop(e, path.length)}
				>
					<div class="drop-zone" class:dz-active={dropTarget === 0}
						ondragover={(e) => onZoneOver(e, 0)}
						ondrop={(e) => onDrop(e, 0)}
					></div>

					{#each path as cityIdx, pos}
						<div class="city-item route-item"
							class:is-dragging={drag?.kind === 'route' && drag.pathPos === pos}
							draggable="true"
							ondragstart={(e) => onDragStart(e, { kind: 'route', pathPos: pos })}
							ondragend={onDragEnd}
							role="button" tabindex="0"
						>
							<span class="drag-handle" aria-hidden="true">⠿</span>
							<span class="route-pos" class:pos-start={pos === 0}>{pos + 1}</span>
							<span class="city-lbl">{gameCities[cityIdx].name}<span class="city-st">, {gameCities[cityIdx].state}</span></span>
							<div class="reorder-btns">
								<button class="reorder-btn" aria-label="Move up" disabled={pos === 0}
									onclick={(e) => { e.stopPropagation(); const p = [...path]; [p[pos-1], p[pos]] = [p[pos], p[pos-1]]; path = p; }}
								>▲</button>
								<button class="reorder-btn" aria-label="Move down" disabled={pos === path.length - 1}
									onclick={(e) => { e.stopPropagation(); const p = [...path]; [p[pos], p[pos+1]] = [p[pos+1], p[pos]]; path = p; }}
								>▼</button>
							</div>
							<button class="remove-btn" aria-label="Remove"
								onclick={(e) => { e.stopPropagation(); path = path.filter((_, k) => k !== pos); }}
							>×</button>
						</div>
						<div class="drop-zone" class:dz-active={dropTarget === pos + 1}
							ondragover={(e) => onZoneOver(e, pos + 1)}
							ondrop={(e) => onDrop(e, pos + 1)}
						></div>
					{/each}

					{#if path.length === 0}
						<p class="list-empty">Drag cities here or click them on the map</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- ── Distance matrix ─────────────────────────────────────────────── -->
		<div class="matrix-section">
			<button class="btn sm btn-ghost matrix-toggle"
				onclick={() => (showMatrix = !showMatrix)}
			>{showMatrix ? 'Hide' : 'Show'} Distance Matrix</button>

			{#if showMatrix}
				<div class="matrix-wrap">
					<table class="matrix">
						<thead>
							<tr>
								<th class="mth-corner"></th>
								{#each gameCities as c}
									<th class="mth">{c.name}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each gameCities as rowCity, i}
								<tr>
									<th class="mth mth-row">{rowCity.name}</th>
									{#each gameCities as _, j}
										{#if i === j}
											<td class="mcell mcell-diag">—</td>
										{:else}
											<td class="mcell"
												class:mcell-path={pathEdges.has(`${i},${j}`)}
												style="background:{cellBg(distMatrix[i][j])}"
											>{Math.round(distMatrix[i][j])}</td>
										{/if}
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- ── Position dialog ───────────────────────────────────────────────────── -->
<dialog bind:this={dialogEl} class="pos-dialog"
	onclose={() => { dialogCity = null; dialogInput = ''; }}
	onclick={(e) => { if (e.target === dialogEl) closeDialog(); }}
>
	{#if dialogCity !== null}
		{@const city    = gameCities[dialogCity]}
		{@const inRoute = path.includes(dialogCity)}
		{@const maxPos  = inRoute ? path.length : path.length + 1}
		<h2 class="dlg-title">{city.name}, {city.state}</h2>
		<p class="dlg-sub">
			{#if inRoute}
				Currently stop {path.indexOf(dialogCity) + 1} of {path.length}
			{:else}
				Not yet in route
			{/if}
		</p>
		<label class="dlg-label" for="pos-input">
			{inRoute ? 'Move to position' : 'Insert at position'} (1–{maxPos})
		</label>
		<input
			id="pos-input"
			class="dlg-input"
			type="number"
			min="1"
			max={maxPos}
			bind:value={dialogInput}
			autofocus
			onkeydown={(e) => { if (e.key === 'Enter') confirmDialog(); if (e.key === 'Escape') closeDialog(); }}
		/>
		<div class="dlg-actions">
			<button class="btn sm btn-ghost" onclick={closeDialog}>Cancel</button>
			<button class="btn sm" onclick={confirmDialog}>Confirm</button>
		</div>
	{/if}
</dialog>

<style>
	.page {
		max-width: 960px;
		margin: 0 auto;
	}

	.back {
		display: inline-block;
		margin-bottom: 1.5rem;
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}

	h1 { font-size: 2rem; font-weight: 800; margin-bottom: 0.4rem; }

	.desc {
		color: var(--color-text-muted);
		line-height: 1.65;
		margin-bottom: 1.75rem;
	}

	/* ── settings ── */
	.settings {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 1rem 1.25rem;
		margin-bottom: 1.75rem;
	}

	.setting-row { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }

	.setting-label {
		font-size: 0.82rem; font-weight: 600;
		color: var(--color-text-muted); min-width: 3rem;
	}

	.toggle-group { display: flex; gap: 0.35rem; flex-wrap: wrap; }

	.tog-btn {
		padding: 0.3rem 0.8rem;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text-muted);
		font-size: 0.9rem; font-weight: 700;
		transition: background 0.15s, border-color 0.15s, color 0.15s;
	}

	.tog-btn:hover:not(.active) { border-color: var(--color-accent); color: var(--color-text); }
	.tog-btn.active { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }

	.center { display: flex; justify-content: center; }

	/* ── HUD ── */
	.hud {
		display: flex; align-items: center;
		justify-content: space-between; flex-wrap: wrap;
		gap: 0.75rem; padding: 0.75rem 1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		margin-bottom: 0.75rem;
	}

	.hud-stats { display: flex; align-items: baseline; gap: 1.5rem; flex-wrap: wrap; }

	.hud-cities { font-size: 1rem; font-weight: 700; font-variant-numeric: tabular-nums; }

	.hud-of { font-weight: 400; color: var(--color-text-muted); font-size: 0.85rem; }

	.hud-dist { font-size: 0.9rem; color: var(--color-text-muted); }
	.hud-dist strong { color: var(--color-text); font-variant-numeric: tabular-nums; }
	.hud-computing { font-style: italic; opacity: 0.6; }
	.solver-meta { font-size: 0.75rem; color: var(--color-text-muted); margin-left: 0.3rem; }
	.hud-optimal-found {
		font-size: 0.9rem;
		font-weight: 700;
		color: #4ade80;
	}

	.hud-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }

	/* ── map ── */
	.map-wrap {
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		overflow: hidden;
		margin-bottom: 1rem;
	}

	.map-svg { display: block; width: 100%; height: auto; }
	.map-svg.map-zoomed  { cursor: grab; }
	.map-svg.map-panning { cursor: grabbing; }

	:global(.city-btn) { cursor: pointer; }

	/* ── distance matrix ── */
	.matrix-section { margin-bottom: 1.5rem; }

	.matrix-toggle { margin-bottom: 0.75rem; }

	.matrix-wrap {
		overflow: auto;
		max-height: 420px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
	}

	.matrix {
		border-collapse: collapse;
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.mth-corner { position: sticky; top: 0; left: 0; z-index: 3; background: var(--color-surface-2); }

	.mth {
		padding: 0.35rem 0.5rem;
		font-weight: 600;
		color: var(--color-text-muted);
		text-align: center;
		background: var(--color-surface-2);
		border-bottom: 1px solid var(--color-border);
		position: sticky;
		top: 0;
		z-index: 2;
	}

	.mth-row {
		position: sticky;
		left: 0;
		z-index: 1;
		text-align: right;
		border-right: 1px solid var(--color-border);
		border-bottom: none;
	}

	.mcell {
		padding: 0.3rem 0.45rem;
		text-align: center;
		color: var(--color-text);
		border: 1px solid transparent;
	}

	.mcell-diag {
		color: var(--color-text-muted);
		background: var(--color-surface) !important;
	}

	.mcell-path {
		outline: 2px solid var(--color-accent);
		outline-offset: -2px;
		font-weight: 700;
		color: #fff;
	}

	/* ── buttons ── */
	.btn {
		padding: 0.7rem 1.4rem;
		background: var(--color-accent);
		color: #fff; border: none;
		border-radius: var(--radius);
		font-size: 1rem; font-weight: 600;
		transition: background 0.2s;
	}

	.btn:hover:not(:disabled) { background: var(--color-accent-hover); }

	.btn:disabled { opacity: 0.4; cursor: default; }

	.btn.large { padding: 0.9rem 2rem; font-size: 1.05rem; }

	.btn.sm { padding: 0.45rem 1rem; font-size: 0.9rem; }

	.btn-ghost {
		background: var(--color-surface-2);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}

	.btn-ghost:hover:not(:disabled) {
		background: var(--color-surface);
		border-color: var(--color-accent);
	}

	/* ── city lists ── */
	.lists-area {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	@media (max-width: 560px) {
		.lists-area { grid-template-columns: 1fr; }
	}

	.list-panel { display: flex; flex-direction: column; gap: 0.4rem; }

	.list-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding: 0 0.2rem;
	}

	.list-title {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--color-text-muted);
	}

	.list-count {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		font-variant-numeric: tabular-nums;
	}

	.city-list {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 0.35rem;
		min-height: 80px;
		max-height: 280px;
		overflow-y: auto;
	}

	.city-item {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.32rem 0.5rem;
		border-radius: var(--radius-sm);
		cursor: grab;
		user-select: none;
		font-size: 0.85rem;
		transition: background 0.1s;
	}

	.city-item:hover { background: var(--color-surface-2); }
	.city-item:active { cursor: grabbing; }
	.city-item.is-dragging { opacity: 0.3; }

	.drag-handle {
		color: var(--color-text-muted);
		opacity: 0.45;
		font-size: 0.8rem;
		flex-shrink: 0;
	}

	.route-pos {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
		background: var(--color-accent);
		color: #fff;
		border-radius: 50%;
		font-size: 0.6rem;
		font-weight: 800;
	}

	.route-pos.pos-start { background: #4ade80; color: #14532d; }

	.city-lbl {
		flex: 1;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.city-st { color: var(--color-text-muted); font-weight: 400; }

	.reorder-btns {
		display: flex;
		flex-direction: column;
		gap: 0;
		flex-shrink: 0;
	}

	.reorder-btn {
		background: none;
		border: none;
		color: var(--color-text-muted);
		font-size: 0.7rem;
		line-height: 1;
		padding: 0.15rem 0.35rem;
		min-width: 1.6rem;
		min-height: 1.4rem;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: color 0.15s, background 0.15s;
		border-radius: var(--radius-sm);
	}

	.reorder-btn:hover:not(:disabled) { color: var(--color-accent); background: var(--color-surface-2); }
	.reorder-btn:disabled { opacity: 0.2; cursor: default; }

	.remove-btn {
		background: none;
		border: none;
		color: var(--color-text-muted);
		font-size: 1rem;
		line-height: 1;
		padding: 0.15rem 0.3rem;
		min-width: 1.6rem;
		min-height: 1.6rem;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		flex-shrink: 0;
		opacity: 0.35;
		border-radius: var(--radius-sm);
		transition: opacity 0.15s, color 0.15s, background 0.15s;
	}

	.city-item:hover .remove-btn { opacity: 1; }
	.remove-btn:hover { color: #f87171; background: rgba(248,113,113,0.1); }

	.drop-zone {
		height: 3px;
		border-radius: 2px;
		transition: height 0.12s, background 0.12s;
		pointer-events: all;
	}

	.drop-zone.dz-active {
		height: 2rem;
		background: rgba(108, 139, 239, 0.1);
		border: 1px dashed var(--color-accent);
		border-radius: var(--radius-sm);
	}

	.list-empty {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		text-align: center;
		padding: 0.85rem 0.5rem;
		opacity: 0.6;
	}

	/* ── position dialog ── */
	.pos-dialog {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 1.5rem;
		color: var(--color-text);
		min-width: 280px;
		box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	.pos-dialog::backdrop {
		background: rgba(0, 0, 0, 0.55);
	}

	.dlg-title {
		font-size: 1.1rem;
		font-weight: 700;
		margin-bottom: 0.2rem;
	}

	.dlg-sub {
		font-size: 0.82rem;
		color: var(--color-text-muted);
		margin-bottom: 1.1rem;
	}

	.dlg-label {
		display: block;
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--color-text-muted);
		margin-bottom: 0.4rem;
	}

	.dlg-input {
		width: 100%;
		padding: 0.55rem 0.75rem;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text);
		font-size: 1rem;
		margin-bottom: 1.1rem;
		box-sizing: border-box;
		outline: none;
		transition: border-color 0.15s;
	}

	.dlg-input:focus { border-color: var(--color-accent); }

	.dlg-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}
</style>
