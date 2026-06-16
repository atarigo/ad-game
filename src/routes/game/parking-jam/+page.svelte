<script lang="ts">
	import { onMount } from 'svelte';
	import GameShell from '$lib/components/GameShell.svelte';
	import {
		initApp,
		W,
		H,
		COLORS,
		centeredText,
		Graphics,
		Container,
		Text
	} from '$lib/game-engine';

	let containerEl: HTMLDivElement;
	let cleanup: (() => void) | undefined;
	let state = $state<'playing' | 'won'>('playing');
	let moves = $state(0);

	interface Car {
		id: number;
		row: number;
		col: number;
		length: number;
		horizontal: boolean;
		color: number;
		isTarget: boolean;
	}

	interface Puzzle {
		cars: Car[];
		exitRow: number;
	}

	const puzzles: Puzzle[] = [
		{
			exitRow: 2,
			cars: [
				{ id: 0, row: 2, col: 0, length: 2, horizontal: true, color: COLORS.red, isTarget: true },
				{ id: 1, row: 0, col: 2, length: 3, horizontal: false, color: COLORS.blue, isTarget: false },
				{ id: 2, row: 0, col: 0, length: 2, horizontal: true, color: COLORS.green, isTarget: false },
				{ id: 3, row: 1, col: 3, length: 2, horizontal: false, color: COLORS.orange, isTarget: false },
				{ id: 4, row: 3, col: 0, length: 2, horizontal: false, color: COLORS.purple, isTarget: false },
				{ id: 5, row: 4, col: 1, length: 3, horizontal: true, color: COLORS.yellow, isTarget: false },
				{ id: 6, row: 5, col: 4, length: 2, horizontal: false, color: COLORS.cyan, isTarget: false },
			]
		},
		{
			exitRow: 2,
			cars: [
				{ id: 0, row: 2, col: 1, length: 2, horizontal: true, color: COLORS.red, isTarget: true },
				{ id: 1, row: 0, col: 0, length: 3, horizontal: false, color: COLORS.blue, isTarget: false },
				{ id: 2, row: 0, col: 3, length: 2, horizontal: true, color: COLORS.green, isTarget: false },
				{ id: 3, row: 1, col: 4, length: 3, horizontal: false, color: COLORS.orange, isTarget: false },
				{ id: 4, row: 3, col: 1, length: 2, horizontal: true, color: COLORS.purple, isTarget: false },
				{ id: 5, row: 4, col: 0, length: 2, horizontal: false, color: COLORS.yellow, isTarget: false },
				{ id: 6, row: 5, col: 2, length: 3, horizontal: true, color: COLORS.cyan, isTarget: false },
				{ id: 7, row: 0, col: 5, length: 3, horizontal: false, color: 0xcc88aa, isTarget: false },
			]
		}
	];

	let currentPuzzle = $state(0);

	async function startGame() {
		if (cleanup) cleanup();
		containerEl.innerHTML = '';
		state = 'playing';
		moves = 0;

		const { app, cleanup: appCleanup } = await initApp(containerEl);

		const GRID_SIZE = 6;
		const CELL = 55;
		const GRID_X = (W - GRID_SIZE * CELL) / 2;
		const GRID_Y = 160;
		const GAP = 3;

		const titleText = centeredText('停車場解謎', W / 2, 30, { size: 22, color: COLORS.pink });
		app.stage.addChild(titleText);

		const moveText = centeredText(`移動: ${moves}`, W / 2, 65, { size: 16, color: COLORS.yellow });
		app.stage.addChild(moveText);

		const hintText = centeredText('把紅色車移到右邊出口 →', W / 2, 95, {
			size: 13,
			color: COLORS.muted
		});
		app.stage.addChild(hintText);

		const puzzleText = centeredText(`第 ${currentPuzzle + 1} 關`, W / 2, 120, {
			size: 14,
			color: COLORS.cyan
		});
		app.stage.addChild(puzzleText);

		// Grid background
		const gridBg = new Graphics();
		gridBg.rect(GRID_X - 5, GRID_Y - 5, GRID_SIZE * CELL + 10, GRID_SIZE * CELL + 10);
		gridBg.fill({ color: 0x111122, alpha: 0.8 });
		gridBg.rect(GRID_X - 5, GRID_Y - 5, GRID_SIZE * CELL + 10, GRID_SIZE * CELL + 10);
		gridBg.stroke({ color: 0x334455, width: 2 });
		app.stage.addChild(gridBg);

		// Grid cells
		for (let r = 0; r < GRID_SIZE; r++) {
			for (let c = 0; c < GRID_SIZE; c++) {
				const cell = new Graphics();
				cell.rect(GRID_X + c * CELL + GAP, GRID_Y + r * CELL + GAP, CELL - GAP * 2, CELL - GAP * 2);
				cell.fill({ color: 0x1a1a2e, alpha: 0.5 });
				app.stage.addChild(cell);
			}
		}

		// Exit marker
		const puzzle = puzzles[currentPuzzle];
		const exitGfx = new Graphics();
		const exitY = GRID_Y + puzzle.exitRow * CELL + CELL / 2;
		exitGfx.moveTo(GRID_X + GRID_SIZE * CELL + 5, exitY - 15);
		exitGfx.lineTo(GRID_X + GRID_SIZE * CELL + 25, exitY);
		exitGfx.lineTo(GRID_X + GRID_SIZE * CELL + 5, exitY + 15);
		exitGfx.fill(COLORS.green);
		app.stage.addChild(exitGfx);

		// Deep copy cars for mutation
		const cars: Car[] = puzzle.cars.map((c) => ({ ...c }));

		function getOccupied(excludeId?: number): Set<string> {
			const set = new Set<string>();
			for (const car of cars) {
				if (car.id === excludeId) continue;
				for (let i = 0; i < car.length; i++) {
					const r = car.horizontal ? car.row : car.row + i;
					const c = car.horizontal ? car.col + i : car.col;
					set.add(`${r},${c}`);
				}
			}
			return set;
		}

		interface CarSprite {
			car: Car;
			gfx: Container;
		}
		const carSprites: CarSprite[] = [];

		function drawCar(car: Car): Container {
			const c = new Container();
			const w = car.horizontal ? car.length * CELL - GAP * 2 : CELL - GAP * 2;
			const h = car.horizontal ? CELL - GAP * 2 : car.length * CELL - GAP * 2;

			const body = new Graphics();
			body.roundRect(0, 0, w, h, 6);
			body.fill(car.color);
			if (car.isTarget) {
				body.roundRect(0, 0, w, h, 6);
				body.stroke({ color: COLORS.white, width: 2, alpha: 0.6 });
			}
			c.addChild(body);

			if (car.isTarget) {
				const arrow = centeredText('→', w / 2, h / 2, { size: 20, color: COLORS.white });
				c.addChild(arrow);
			}

			c.x = GRID_X + car.col * CELL + GAP;
			c.y = GRID_Y + car.row * CELL + GAP;

			c.eventMode = 'static';
			c.cursor = 'grab';

			return c;
		}

		for (const car of cars) {
			const gfx = drawCar(car);
			app.stage.addChild(gfx);
			carSprites.push({ car, gfx });
		}

		// Drag logic
		let dragging: CarSprite | null = null;
		let dragStartX = 0;
		let dragStartY = 0;
		let carStartCol = 0;
		let carStartRow = 0;

		for (const cs of carSprites) {
			cs.gfx.on('pointerdown', (e: { globalX: number; globalY: number }) => {
				if (state !== 'playing') return;
				dragging = cs;
				dragStartX = e.globalX;
				dragStartY = e.globalY;
				carStartCol = cs.car.col;
				carStartRow = cs.car.row;
				cs.gfx.cursor = 'grabbing';
				cs.gfx.alpha = 0.8;
			});
		}

		app.stage.eventMode = 'static';
		app.stage.hitArea = { x: 0, y: 0, width: W, height: H, contains: () => true };

		app.stage.on('pointermove', (e: { globalX: number; globalY: number }) => {
			if (!dragging || state !== 'playing') return;
			const car = dragging.car;
			const occupied = getOccupied(car.id);

			if (car.horizontal) {
				const dx = e.globalX - dragStartX;
				const scaleFactor = W / app.canvas.getBoundingClientRect().width;
				const cellDelta = Math.round((dx * scaleFactor) / CELL);
				let newCol = carStartCol + cellDelta;
				newCol = Math.max(0, Math.min(GRID_SIZE - car.length, newCol));

				let canMove = true;
				for (let i = 0; i < car.length; i++) {
					if (occupied.has(`${car.row},${newCol + i}`)) {
						canMove = false;
						break;
					}
				}
				if (canMove) {
					car.col = newCol;
					dragging.gfx.x = GRID_X + car.col * CELL + GAP;
				}
			} else {
				const dy = e.globalY - dragStartY;
				const scaleFactor = H / app.canvas.getBoundingClientRect().height;
				const cellDelta = Math.round((dy * scaleFactor) / CELL);
				let newRow = carStartRow + cellDelta;
				newRow = Math.max(0, Math.min(GRID_SIZE - car.length, newRow));

				let canMove = true;
				for (let i = 0; i < car.length; i++) {
					if (occupied.has(`${newRow + i},${car.col}`)) {
						canMove = false;
						break;
					}
				}
				if (canMove) {
					car.row = newRow;
					dragging.gfx.y = GRID_Y + car.row * CELL + GAP;
				}
			}
		});

		app.stage.on('pointerup', () => {
			if (dragging) {
				if (dragging.car.col !== carStartCol || dragging.car.row !== carStartRow) {
					moves++;
					moveText.text = `移動: ${moves}`;
				}
				dragging.gfx.cursor = 'grab';
				dragging.gfx.alpha = 1;
				dragging = null;

				// Check win: target car at rightmost
				const target = cars.find((c) => c.isTarget);
				if (target && target.col + target.length >= GRID_SIZE) {
					state = 'won';
				}
			}
		});

		cleanup = appCleanup;
	}

	function restart() {
		startGame();
	}

	function nextPuzzle() {
		if (currentPuzzle < puzzles.length - 1) {
			currentPuzzle++;
			startGame();
		}
	}

	onMount(() => {
		startGame();
		return () => cleanup?.();
	});
</script>

<GameShell title="停車場" onrestart={restart}>
	<div class="game-container" bind:this={containerEl}></div>

	{#if state === 'won'}
		<div class="overlay">
			<div class="overlay-box win">
				<p>過關！</p>
				<p class="sub">{moves} 步完成</p>
				{#if currentPuzzle < puzzles.length - 1}
					<button onclick={nextPuzzle}>下一關</button>
				{:else}
					<p class="sub2">全部通關！</p>
					<button onclick={() => { currentPuzzle = 0; restart(); }}>重新開始</button>
				{/if}
			</div>
		</div>
	{/if}
</GameShell>

<style>
	.game-container {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.overlay-box {
		text-align: center;
		padding: 2rem 3rem;
		border-radius: 12px;
		background: #1a0a2e;
	}

	.overlay-box p {
		font-family: 'Audiowide', sans-serif;
		font-size: 2rem;
		margin-bottom: 1rem;
	}

	.win p { color: #00f0ff; text-shadow: 0 0 20px rgba(0, 240, 255, 0.5); }
	.sub { font-size: 1rem !important; color: #ffe156; }
	.sub2 { font-size: 0.9rem !important; color: #8888aa; }

	.overlay-box button {
		font-family: 'Audiowide', sans-serif;
		font-size: 1rem;
		padding: 0.6rem 2rem;
		border: 2px solid #ffe156;
		background: none;
		color: #ffe156;
		border-radius: 8px;
		cursor: pointer;
		margin-top: 0.5rem;
	}

	.overlay-box button:hover {
		background: rgba(255, 225, 86, 0.15);
	}
</style>
