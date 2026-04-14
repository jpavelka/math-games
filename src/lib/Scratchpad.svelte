<script lang="ts">
	let { onclose, width = $bindable(320) }: { onclose: () => void; width?: number } = $props();

	// ── resize handle ─────────────────────────────────────────────────────────
	let resizing = $state(false);

	function onResizeStart(e: PointerEvent) {
		e.preventDefault();
		resizing = true;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onResizeMove(e: PointerEvent) {
		if (!resizing) return;
		width = Math.max(200, Math.min(window.innerWidth - 200, window.innerWidth - e.clientX));
	}

	function onResizeEnd() {
		resizing = false;
	}

	// ── mode ─────────────────────────────────────────────────────────────────
	let mode = $state<'text' | 'draw'>('text');

	// ── text ─────────────────────────────────────────────────────────────────
	let text = $state('');

	// ── draw ─────────────────────────────────────────────────────────────────
	type Point = { x: number; y: number };
	type Stroke = { points: Point[]; color: string; width: number };

	const COLORS = ['#e8eaf0', '#6c8bef', '#4ade80', '#f59e0b', '#f87171'];
	const WIDTHS = [2, 4, 8];
	const BG = '#1a1d27';

	let strokes = $state<Stroke[]>([]);
	let activeStroke: Stroke | null = null; // plain var – mutated directly, redrawn manually
	let penColor = $state(COLORS[0]);
	let penWidth = $state(WIDTHS[1]);
	let tool = $state<'draw' | 'pan'>('draw');

	// ── pan / viewport ───────────────────────────────────────────────────────
	let offsetX = 0; // world-space scroll offset in CSS px
	let offsetY = 0;
	let panning = $state(false);
	let panOrigin: { px: number; py: number; ox: number; oy: number } | null = null;

	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let wrapperEl = $state<HTMLDivElement | null>(null);
	let dpr = 1;

	// Re-initialize canvas whenever the element becomes available (mode switch recreates it)
	$effect(() => {
		if (!canvasEl || !wrapperEl) return;
		dpr = window.devicePixelRatio || 1;
		resize();
		const ro = new ResizeObserver(resize);
		ro.observe(wrapperEl);
		return () => ro.disconnect();
	});

	function resize() {
		if (!canvasEl || !wrapperEl) return;
		dpr = window.devicePixelRatio || 1;
		const rect = wrapperEl.getBoundingClientRect();
		canvasEl.width = rect.width * dpr;
		canvasEl.height = rect.height * dpr;
		canvasEl.style.width = rect.width + 'px';
		canvasEl.style.height = rect.height + 'px';
		redraw();
	}

	function redraw() {
		if (!canvasEl) return;
		const ctx = canvasEl.getContext('2d')!;
		// Clear in physical pixels (bypass any transform)
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.fillStyle = BG;
		ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
		ctx.restore();
		// Apply pan offset so strokes render in world space
		ctx.save();
		ctx.translate(-offsetX * dpr, -offsetY * dpr);
		const all = activeStroke ? [...strokes, activeStroke] : strokes;
		for (const s of all) drawStroke(ctx, s);
		ctx.restore();
	}

	function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
		const pts = stroke.points;
		if (pts.length === 0) return;
		ctx.beginPath();
		ctx.strokeStyle = stroke.color;
		ctx.lineWidth = stroke.width * dpr;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		if (pts.length === 1) {
			// dot
			ctx.arc(pts[0].x * dpr, pts[0].y * dpr, (stroke.width * dpr) / 2, 0, Math.PI * 2);
			ctx.fillStyle = stroke.color;
			ctx.fill();
			return;
		}
		ctx.moveTo(pts[0].x * dpr, pts[0].y * dpr);
		for (let i = 1; i < pts.length - 1; i++) {
			const mx = ((pts[i].x + pts[i + 1].x) / 2) * dpr;
			const my = ((pts[i].y + pts[i + 1].y) / 2) * dpr;
			ctx.quadraticCurveTo(pts[i].x * dpr, pts[i].y * dpr, mx, my);
		}
		ctx.lineTo(pts[pts.length - 1].x * dpr, pts[pts.length - 1].y * dpr);
		ctx.stroke();
	}

	// Returns pointer position in world coordinates (accounts for pan offset)
	function getPos(e: PointerEvent): Point {
		const rect = canvasEl!.getBoundingClientRect();
		return { x: e.clientX - rect.left + offsetX, y: e.clientY - rect.top + offsetY };
	}

	function onPointerDown(e: PointerEvent) {
		e.preventDefault();
		canvasEl!.setPointerCapture(e.pointerId);
		if (tool === 'pan') {
			panning = true;
			panOrigin = { px: e.clientX, py: e.clientY, ox: offsetX, oy: offsetY };
		} else {
			activeStroke = { points: [getPos(e)], color: penColor, width: penWidth };
			redraw();
		}
	}

	function onPointerMove(e: PointerEvent) {
		e.preventDefault();
		if (tool === 'pan' && panOrigin) {
			offsetX = panOrigin.ox - (e.clientX - panOrigin.px);
			offsetY = panOrigin.oy - (e.clientY - panOrigin.py);
			redraw();
		} else if (activeStroke) {
			activeStroke.points.push(getPos(e));
			redraw();
		}
	}

	function onPointerUp() {
		if (tool === 'pan') {
			panning = false;
			panOrigin = null;
		} else if (activeStroke) {
			strokes = [...strokes, activeStroke];
			activeStroke = null;
		}
	}

	function undo() {
		strokes = strokes.slice(0, -1);
		redraw();
	}

	function clear() {
		strokes = [];
		activeStroke = null;
		redraw();
	}
</script>

<div class="panel" style="width:{width}px" class:resizing>
	<!-- resize handle -->
	<div
		class="resize-handle"
		onpointerdown={onResizeStart}
		onpointermove={onResizeMove}
		onpointerup={onResizeEnd}
		aria-hidden="true"
	></div>
	<!-- header -->
	<div class="panel-header">
		<div class="tabs">
			<button class="tab" class:active={mode === 'text'} onclick={() => (mode = 'text')}>
				Text
			</button>
			<button class="tab" class:active={mode === 'draw'} onclick={() => (mode = 'draw')}>
				Draw
			</button>
		</div>
		<button class="close-btn" onclick={onclose} aria-label="Close scratchpad">✕</button>
	</div>

	<!-- text mode -->
	{#if mode === 'text'}
		<textarea
			class="text-area"
			bind:value={text}
			placeholder="Jot notes here…"
			spellcheck="false"
		></textarea>

	<!-- draw mode -->
	{:else}
		<div class="draw-toolbar">
			<!-- colors -->
			<div class="color-row">
				{#each COLORS as c}
					<button
						class="swatch"
						class:active={penColor === c}
						style="background:{c}"
						onclick={() => (penColor = c)}
						aria-label="Color {c}"
					></button>
				{/each}
			</div>

			<div class="toolbar-sep"></div>

			<!-- widths -->
			<div class="width-row">
				{#each WIDTHS as w}
					<button
						class="width-btn"
						class:active={penWidth === w}
						onclick={() => (penWidth = w)}
						aria-label="Stroke width {w}"
					>
						<span class="dot" style="width:{w * 2.5}px;height:{w * 2.5}px;background:{penColor}"></span>
					</button>
				{/each}
			</div>

			<div class="toolbar-sep"></div>

			<!-- tool toggle -->
			<button
				class="tool-btn"
				class:active={tool === 'draw'}
				onclick={() => (tool = 'draw')}
				title="Draw"
			>✎</button>
			<button
				class="tool-btn"
				class:active={tool === 'pan'}
				onclick={() => (tool = 'pan')}
				title="Pan"
			>⊹</button>

			<div class="toolbar-sep"></div>

			<!-- actions -->
			<button class="tool-btn" onclick={undo} disabled={strokes.length === 0} title="Undo">
				↩
			</button>
			<button class="tool-btn" onclick={clear} disabled={strokes.length === 0} title="Clear">
				⌫
			</button>
		</div>

		<div class="canvas-wrapper" bind:this={wrapperEl}>
			<canvas
				bind:this={canvasEl}
				style="display:block;touch-action:none;cursor:{tool === 'pan' ? (panning ? 'grabbing' : 'grab') : 'crosshair'}"
				onpointerdown={onPointerDown}
				onpointermove={onPointerMove}
				onpointerup={onPointerUp}
			></canvas>
		</div>
	{/if}
</div>

<style>
	.panel {
		position: fixed;
		top: 61px;
		right: 0;
		bottom: 0;
		width: 320px; /* overridden by inline style */
		background: var(--color-surface);
		border-left: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		z-index: 15;
	}

	/* ── resize handle ── */
	.resize-handle {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 5px;
		cursor: col-resize;
		z-index: 1;
		transition: background 0.15s;
	}

	.resize-handle:hover,
	.panel.resizing .resize-handle {
		background: var(--color-accent);
		opacity: 0.5;
	}

	/* Prevent text selection and cursor flicker while dragging */
	.panel.resizing {
		user-select: none;
		cursor: col-resize;
	}

	@media (max-width: 400px) {
		.panel {
			width: 100%;
			left: 0;
		}
	}

	/* ── panel header ── */
	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.tabs {
		display: flex;
		gap: 0.25rem;
		background: var(--color-surface-2);
		border-radius: var(--radius-sm);
		padding: 2px;
	}

	.tab {
		padding: 0.3rem 0.75rem;
		border-radius: 4px;
		background: transparent;
		border: none;
		color: var(--color-text-muted);
		font-size: 0.8rem;
		font-weight: 600;
		transition: background 0.15s, color 0.15s;
	}

	.tab.active {
		background: var(--color-accent);
		color: #fff;
	}

	.close-btn {
		background: none;
		border: none;
		color: var(--color-text-muted);
		font-size: 0.9rem;
		padding: 0.25rem 0.4rem;
		border-radius: var(--radius-sm);
		transition: color 0.15s, background 0.15s;
	}

	.close-btn:hover {
		color: var(--color-text);
		background: var(--color-surface-2);
	}

	/* ── text mode ── */
	.text-area {
		flex: 1;
		resize: none;
		background: var(--color-surface-2);
		color: var(--color-text);
		border: none;
		padding: 0.85rem;
		font-family: 'Menlo', 'Consolas', monospace;
		font-size: 0.85rem;
		line-height: 1.6;
		outline: none;
	}

	.text-area::placeholder {
		color: var(--color-text-muted);
	}

	/* ── draw toolbar ── */
	.draw-toolbar {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.65rem;
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
		flex-wrap: wrap;
	}

	.color-row,
	.width-row {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.swatch {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 2px solid transparent;
		padding: 0;
		transition: transform 0.1s, border-color 0.1s;
	}

	.swatch.active {
		border-color: #fff;
		transform: scale(1.2);
	}

	.width-btn {
		width: 26px;
		height: 26px;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: border-color 0.1s;
	}

	.width-btn.active {
		border-color: var(--color-accent);
	}

	.dot {
		display: block;
		border-radius: 50%;
	}

	.toolbar-sep {
		width: 1px;
		height: 20px;
		background: var(--color-border);
		margin: 0 0.1rem;
	}

	.tool-btn {
		width: 28px;
		height: 28px;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text);
		font-size: 0.9rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.15s, border-color 0.15s;
	}

	.tool-btn:hover:not(:disabled):not(.active) {
		border-color: var(--color-accent);
		background: rgba(108, 139, 239, 0.1);
	}

	.tool-btn.active {
		border-color: var(--color-accent);
		background: rgba(108, 139, 239, 0.2);
		color: var(--color-accent);
	}

	.tool-btn:disabled {
		opacity: 0.3;
		cursor: default;
	}

	/* ── canvas ── */
	.canvas-wrapper {
		flex: 1;
		position: relative;
		overflow: hidden;
	}

	.canvas-wrapper canvas {
		position: absolute;
		inset: 0;
	}
</style>
