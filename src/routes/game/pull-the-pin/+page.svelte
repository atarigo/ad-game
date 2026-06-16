<script lang="ts">
	import { onMount } from 'svelte';
	import GameShell from '$lib/components/GameShell.svelte';
	import {
		initApp,
		initPhysics,
		W,
		H,
		COLORS,
		centeredText,
		drawRect,
		drawCircle,
		Graphics,
		Container,
		Matter
	} from '$lib/game-engine';

	let containerEl: HTMLDivElement;
	let cleanup: (() => void) | undefined;
	let state = $state<'playing' | 'won' | 'lost'>('playing');
	let currentLevel = $state(0);

	interface Level {
		walls: { x: number; y: number; w: number; h: number }[];
		pins: { x: number; y: number; w: number; h: number }[];
		waterSpawn: { x: number; y: number; count: number };
		lavaSpawn?: { x: number; y: number; count: number };
		cup: { x: number; y: number; w: number; h: number };
	}

	const levels: Level[] = [
		{
			walls: [
				{ x: 120, y: 200, w: 10, h: 200 },
				{ x: 280, y: 200, w: 10, h: 200 },
				{ x: 200, y: 550, w: 120, h: 10 },
				{ x: 145, y: 500, w: 10, h: 110 },
				{ x: 255, y: 500, w: 10, h: 110 },
			],
			pins: [{ x: 200, y: 305, w: 160, h: 12 }],
			waterSpawn: { x: 200, y: 150, count: 40 },
			cup: { x: 200, y: 530, w: 100, h: 50 },
		},
		{
			walls: [
				{ x: 100, y: 180, w: 10, h: 200 },
				{ x: 200, y: 180, w: 10, h: 200 },
				{ x: 200, y: 180, w: 10, h: 200 },
				{ x: 300, y: 180, w: 10, h: 200 },
				{ x: 200, y: 550, w: 120, h: 10 },
				{ x: 145, y: 500, w: 10, h: 110 },
				{ x: 255, y: 500, w: 10, h: 110 },
			],
			pins: [
				{ x: 150, y: 285, w: 100, h: 12 },
				{ x: 250, y: 285, w: 100, h: 12 },
			],
			waterSpawn: { x: 150, y: 140, count: 30 },
			lavaSpawn: { x: 250, y: 140, count: 25 },
			cup: { x: 200, y: 530, w: 100, h: 50 },
		},
		{
			walls: [
				{ x: 100, y: 140, w: 10, h: 160 },
				{ x: 300, y: 140, w: 10, h: 160 },
				{ x: 130, y: 360, w: 70, h: 10 },
				{ x: 270, y: 360, w: 70, h: 10 },
				{ x: 100, y: 360, w: 10, h: 200 },
				{ x: 300, y: 360, w: 10, h: 200 },
				{ x: 200, y: 600, w: 120, h: 10 },
				{ x: 145, y: 555, w: 10, h: 100 },
				{ x: 255, y: 555, w: 10, h: 100 },
			],
			pins: [
				{ x: 200, y: 225, w: 200, h: 12 },
				{ x: 200, y: 460, w: 200, h: 12 },
			],
			waterSpawn: { x: 200, y: 100, count: 50 },
			cup: { x: 200, y: 575, w: 100, h: 50 },
		},
	];

	async function startGame() {
		if (cleanup) cleanup();
		containerEl.innerHTML = '';
		state = 'playing';

		const { app, cleanup: appCleanup } = await initApp(containerEl);
		const physics = initPhysics(app, { x: 0, y: 1.2, scale: 0.001 });

		const level = levels[currentLevel];
		const waterBodies: Matter.Body[] = [];
		let waterInCup = 0;
		const requiredWater = Math.floor(level.waterSpawn.count * 0.6);

		const outerWalls = [
			Matter.Bodies.rectangle(W / 2, H + 25, W, 50, { isStatic: true }),
			Matter.Bodies.rectangle(-25, H / 2, 50, H, { isStatic: true }),
			Matter.Bodies.rectangle(W + 25, H / 2, 50, H, { isStatic: true }),
		];
		physics.addBody(...outerWalls);

		for (const w of level.walls) {
			const body = Matter.Bodies.rectangle(w.x, w.y, w.w, w.h, {
				isStatic: true,
				friction: 0.3
			});
			const gfx = drawRect(w.x, w.y, w.w, w.h, 0x445566);
			app.stage.addChild(gfx);
			physics.addBody(body);
		}

		const cupGfx = new Graphics();
		cupGfx.rect(
			level.cup.x - level.cup.w / 2,
			level.cup.y - level.cup.h / 2,
			level.cup.w,
			level.cup.h
		);
		cupGfx.fill({ color: COLORS.cyan, alpha: 0.15 });
		cupGfx.rect(
			level.cup.x - level.cup.w / 2,
			level.cup.y - level.cup.h / 2,
			level.cup.w,
			level.cup.h
		);
		cupGfx.stroke({ color: COLORS.cyan, width: 2 });
		app.stage.addChild(cupGfx);

		const cupLabel = centeredText('CUP', level.cup.x, level.cup.y, {
			size: 14,
			color: COLORS.cyan
		});
		app.stage.addChild(cupLabel);

		interface PinObj {
			body: Matter.Body;
			gfx: Graphics;
		}
		const pinObjects: PinObj[] = [];

		for (const p of level.pins) {
			const body = Matter.Bodies.rectangle(p.x, p.y, p.w, p.h, {
				isStatic: true,
				friction: 0.2
			});
			const gfx = drawRect(p.x, p.y, p.w, p.h, COLORS.gold, 4);
			gfx.eventMode = 'static';
			gfx.cursor = 'pointer';

			const knobLeft = drawCircle(p.x - p.w / 2, p.y, 10, COLORS.gold);
			const knobRight = drawCircle(p.x + p.w / 2, p.y, 10, COLORS.gold);
			knobLeft.eventMode = 'none';
			knobRight.eventMode = 'none';

			const pinContainer = new Container();
			pinContainer.addChild(gfx, knobLeft, knobRight);
			app.stage.addChild(pinContainer);

			const pinObj: PinObj = { body, gfx };
			pinObjects.push(pinObj);
			physics.addBody(body);

			const removePin = () => {
				Matter.Composite.remove(physics.world, body);
				pinContainer.destroy();
				const idx = pinObjects.indexOf(pinObj);
				if (idx >= 0) pinObjects.splice(idx, 1);
			};

			gfx.on('pointerdown', removePin);
			knobLeft.eventMode = 'static';
			knobLeft.cursor = 'pointer';
			knobLeft.on('pointerdown', removePin);
			knobRight.eventMode = 'static';
			knobRight.cursor = 'pointer';
			knobRight.on('pointerdown', removePin);
		}

		const waterContainer = new Container();
		app.stage.addChild(waterContainer);

		for (let i = 0; i < level.waterSpawn.count; i++) {
			const r = 5 + Math.random() * 3;
			const x = level.waterSpawn.x + (Math.random() - 0.5) * 80;
			const y = level.waterSpawn.y + (Math.random() - 0.5) * 60;
			const body = Matter.Bodies.circle(x, y, r, {
				restitution: 0.3,
				friction: 0.05,
				density: 0.001,
				label: 'water'
			});
			const gfx = drawCircle(x, y, r, COLORS.water);
			waterContainer.addChild(gfx);
			physics.add(body, gfx);
			waterBodies.push(body);
		}

		if (level.lavaSpawn) {
			const lavaContainer = new Container();
			app.stage.addChild(lavaContainer);
			for (let i = 0; i < level.lavaSpawn.count; i++) {
				const r = 5 + Math.random() * 3;
				const x = level.lavaSpawn.x + (Math.random() - 0.5) * 60;
				const y = level.lavaSpawn.y + (Math.random() - 0.5) * 50;
				const body = Matter.Bodies.circle(x, y, r, {
					restitution: 0.3,
					friction: 0.05,
					density: 0.001,
					label: 'lava'
				});
				const gfx = drawCircle(x, y, r, COLORS.lava);
				lavaContainer.addChild(gfx);
				physics.add(body, gfx);
			}
		}

		const scoreText = centeredText(`0 / ${requiredWater}`, W / 2, 40, {
			size: 20,
			color: COLORS.yellow
		});
		app.stage.addChild(scoreText);

		const levelText = centeredText(`Level ${currentLevel + 1}`, W / 2, 70, {
			size: 14,
			color: COLORS.muted
		});
		app.stage.addChild(levelText);

		const cupArea = level.cup;

		app.ticker.add(() => {
			if (state !== 'playing') return;

			waterInCup = 0;
			for (const wb of waterBodies) {
				const pos = wb.position;
				if (
					pos.x > cupArea.x - cupArea.w / 2 &&
					pos.x < cupArea.x + cupArea.w / 2 &&
					pos.y > cupArea.y - cupArea.h / 2 &&
					pos.y < cupArea.y + cupArea.h / 2
				) {
					waterInCup++;
				}
			}
			scoreText.text = `${waterInCup} / ${requiredWater}`;

			if (waterInCup >= requiredWater) {
				state = 'won';
			}

			let allSettled = true;
			for (const wb of waterBodies) {
				const v = wb.velocity;
				if (Math.abs(v.x) > 0.1 || Math.abs(v.y) > 0.1) {
					allSettled = false;
					break;
				}
			}
			if (allSettled && pinObjects.length === 0 && waterInCup < requiredWater) {
				let offscreen = 0;
				for (const wb of waterBodies) {
					if (wb.position.y > H + 10 || wb.position.x < -10 || wb.position.x > W + 10) {
						offscreen++;
					}
				}
				if (offscreen + waterInCup >= level.waterSpawn.count * 0.9) {
					if (waterInCup < requiredWater) state = 'lost';
				}
			}
		});

		cleanup = () => {
			physics.clear();
			appCleanup();
		};
	}

	function restart() {
		startGame();
	}

	function nextLevel() {
		if (currentLevel < levels.length - 1) {
			currentLevel++;
			startGame();
		}
	}

	onMount(() => {
		startGame();
		return () => cleanup?.();
	});
</script>

<GameShell title="拔釘子" onrestart={restart}>
	<div class="game-container" bind:this={containerEl}></div>

	{#if state === 'won'}
		<div class="overlay">
			<div class="overlay-box win">
				<p>過關！</p>
				{#if currentLevel < levels.length - 1}
					<button onclick={nextLevel}>下一關</button>
				{:else}
					<p class="sub">全部通關！</p>
					<button onclick={() => { currentLevel = 0; restart(); }}>重新開始</button>
				{/if}
			</div>
		</div>
	{/if}

	{#if state === 'lost'}
		<div class="overlay">
			<div class="overlay-box lose">
				<p>失敗！</p>
				<button onclick={restart}>再試一次</button>
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

	.win p {
		color: #00f0ff;
		text-shadow: 0 0 20px rgba(0, 240, 255, 0.5);
	}

	.lose p {
		color: #ff2d7b;
		text-shadow: 0 0 20px rgba(255, 45, 123, 0.5);
	}

	.sub {
		font-size: 1rem !important;
		color: #ffe156;
	}

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
