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
		Container
	} from '$lib/game-engine';

	let containerEl: HTMLDivElement;
	let cleanup: (() => void) | undefined;
	let state = $state<'idle' | 'lowering' | 'reeling' | 'finished'>('idle');
	let scoreVal = $state(0);
	let timeLeft = $state(60);
	let catches = $state(0);

	async function startGame() {
		if (cleanup) cleanup();
		containerEl.innerHTML = '';
		state = 'idle';
		scoreVal = 0;
		timeLeft = 60;
		catches = 0;

		const { app, cleanup: appCleanup } = await initApp(containerEl, 0x0a1628);

		const WATER_TOP = 160;
		const WATER_BOTTOM = H - 30;
		const HOOK_X = W / 2;
		const HOOK_SPEED_DOWN = 4;
		const HOOK_SPEED_UP = 6;
		const HOOK_SIZE = 12;

		// Background: sky + water
		const sky = new Graphics();
		sky.rect(0, 0, W, WATER_TOP);
		sky.fill(0x0a1628);
		app.stage.addChild(sky);

		const water = new Graphics();
		water.rect(0, WATER_TOP, W, WATER_BOTTOM - WATER_TOP);
		water.fill({ color: 0x0a2040, alpha: 0.9 });
		app.stage.addChild(water);

		// Water surface line
		const surface = new Graphics();
		surface.moveTo(0, WATER_TOP).lineTo(W, WATER_TOP);
		surface.stroke({ color: COLORS.cyan, width: 2, alpha: 0.4 });
		app.stage.addChild(surface);

		// Depth markers
		for (let d = 1; d <= 4; d++) {
			const y = WATER_TOP + ((WATER_BOTTOM - WATER_TOP) / 5) * d;
			const marker = new Graphics();
			marker.moveTo(0, y).lineTo(W, y);
			marker.stroke({ color: 0x0a3060, width: 1, alpha: 0.3 });
			app.stage.addChild(marker);
		}

		const scoreText = centeredText('0', W / 2, 30, { size: 28, color: COLORS.yellow });
		app.stage.addChild(scoreText);

		const timerText = centeredText('60s', W / 2, 65, { size: 16, color: COLORS.cyan });
		app.stage.addChild(timerText);

		const hintText = centeredText('點擊放下魚鉤', W / 2, 100, {
			size: 13,
			color: COLORS.muted
		});
		app.stage.addChild(hintText);

		const catchText = centeredText('', W / 2, 130, { size: 14, color: COLORS.green });
		app.stage.addChild(catchText);

		// Hook
		let hookY = WATER_TOP;
		let hookTargetY = WATER_TOP;
		let caughtFish: FishObj | null = null;

		const hookLine = new Graphics();
		app.stage.addChild(hookLine);

		const hook = new Container();
		const hookGfx = new Graphics();
		hookGfx.moveTo(0, -HOOK_SIZE);
		hookGfx.lineTo(0, 0);
		hookGfx.lineTo(HOOK_SIZE / 2, HOOK_SIZE * 0.6);
		hookGfx.lineTo(0, HOOK_SIZE * 0.3);
		hookGfx.stroke({ color: COLORS.gold, width: 3 });
		hook.addChild(hookGfx);
		hook.x = HOOK_X;
		hook.y = hookY;
		app.stage.addChild(hook);

		function drawHookLine() {
			hookLine.clear();
			hookLine.moveTo(HOOK_X, 0);
			hookLine.lineTo(HOOK_X, hookY - HOOK_SIZE);
			hookLine.stroke({ color: 0x888888, width: 1 });
		}

		// Fish
		interface FishObj {
			gfx: Container;
			x: number;
			y: number;
			speed: number;
			dir: number;
			size: number;
			points: number;
			color: number;
			caught: boolean;
		}

		const fishes: FishObj[] = [];

		const fishTypes = [
			{ size: 15, points: 1, color: 0x66aaff, depthMin: 0.1, depthMax: 0.3 },
			{ size: 20, points: 2, color: 0x44dd88, depthMin: 0.2, depthMax: 0.5 },
			{ size: 25, points: 3, color: 0xffaa44, depthMin: 0.3, depthMax: 0.6 },
			{ size: 30, points: 5, color: COLORS.gold, depthMin: 0.5, depthMax: 0.8 },
			{ size: 35, points: 10, color: COLORS.pink, depthMin: 0.7, depthMax: 1.0 },
		];

		function drawFish(size: number, color: number, dir: number): Container {
			const c = new Container();
			const body = new Graphics();
			body.ellipse(0, 0, size, size * 0.45);
			body.fill(color);
			c.addChild(body);

			const tail = new Graphics();
			tail.moveTo(-size * dir, 0);
			tail.lineTo(-size * 1.4 * dir, -size * 0.4);
			tail.lineTo(-size * 1.4 * dir, size * 0.4);
			tail.closePath();
			tail.fill(color);
			c.addChild(tail);

			const eye = new Graphics();
			eye.circle(size * 0.4 * dir, -size * 0.1, 3);
			eye.fill(COLORS.white);
			eye.circle(size * 0.4 * dir, -size * 0.1, 1.5);
			eye.fill(0x111111);
			c.addChild(eye);

			return c;
		}

		function spawnFish() {
			const type = fishTypes[Math.floor(Math.random() * fishTypes.length)];
			const waterDepth = WATER_BOTTOM - WATER_TOP;
			const y = WATER_TOP + waterDepth * (type.depthMin + Math.random() * (type.depthMax - type.depthMin));
			const dir = Math.random() < 0.5 ? 1 : -1;
			const x = dir === 1 ? -type.size * 2 : W + type.size * 2;
			const speed = (0.8 + Math.random() * 1.5) * dir;

			const gfx = drawFish(type.size, type.color, dir);
			gfx.x = x;
			gfx.y = y;
			app.stage.addChild(gfx);
			app.stage.setChildIndex(gfx, app.stage.getChildIndex(hookLine));

			fishes.push({
				gfx,
				x,
				y,
				speed,
				dir,
				size: type.size,
				points: type.points,
				color: type.color,
				caught: false
			});
		}

		// Initial fish
		for (let i = 0; i < 8; i++) {
			spawnFish();
			// Spread initial fish across screen
			const fish = fishes[fishes.length - 1];
			fish.x = Math.random() * W;
			fish.gfx.x = fish.x;
		}

		// Obstacles (junk)
		interface Junk {
			gfx: Graphics;
			x: number;
			y: number;
			size: number;
		}
		const junks: Junk[] = [];

		for (let i = 0; i < 4; i++) {
			const x = 40 + Math.random() * (W - 80);
			const y = WATER_TOP + 100 + Math.random() * (WATER_BOTTOM - WATER_TOP - 150);
			const size = 10 + Math.random() * 15;
			const g = new Graphics();
			g.rect(-size / 2, -size / 2, size, size);
			g.fill({ color: 0x555555, alpha: 0.6 });
			g.moveTo(-size / 2, -size / 2);
			g.lineTo(size / 2, size / 2);
			g.moveTo(size / 2, -size / 2);
			g.lineTo(-size / 2, size / 2);
			g.stroke({ color: 0x888888, width: 1 });
			g.x = x;
			g.y = y;
			app.stage.addChild(g);
			junks.push({ gfx: g, x, y, size });
		}

		// Move hook and fish to top
		app.stage.setChildIndex(hookLine, app.stage.children.length - 1);
		app.stage.setChildIndex(hook, app.stage.children.length - 1);

		// Controls
		app.stage.eventMode = 'static';
		app.stage.hitArea = { x: 0, y: 0, width: W, height: H, contains: () => true };

		app.stage.on('pointerdown', () => {
			if (state === 'idle') {
				state = 'lowering';
				hintText.visible = false;
			}
		});

		// Timer
		let timerInterval = setInterval(() => {
			if (state === 'finished') return;
			timeLeft--;
			timerText.text = `${timeLeft}s`;
			if (timeLeft <= 10) timerText.style.fill = COLORS.red;
			if (timeLeft <= 0) {
				state = 'finished';
				clearInterval(timerInterval);
			}
		}, 1000);

		let spawnTimer = 0;

		app.ticker.add(() => {
			if (state === 'finished') return;

			const dt = Math.min(app.ticker.deltaMS, 33);

			// Spawn new fish
			spawnTimer += dt;
			if (spawnTimer > 2000) {
				spawnTimer = 0;
				if (fishes.filter((f) => !f.caught).length < 10) {
					spawnFish();
				}
			}

			// Move fish
			for (const fish of fishes) {
				if (fish.caught) continue;
				fish.x += fish.speed;
				fish.gfx.x = fish.x;

				// Slight Y wobble
				fish.gfx.y = fish.y + Math.sin(Date.now() / 500 + fish.x) * 3;

				// Remove off-screen fish
				if (
					(fish.dir === 1 && fish.x > W + fish.size * 3) ||
					(fish.dir === -1 && fish.x < -fish.size * 3)
				) {
					fish.gfx.destroy();
					fish.caught = true;
				}
			}

			// Hook logic
			if (state === 'lowering') {
				hookY += HOOK_SPEED_DOWN;
				if (hookY >= WATER_BOTTOM - 20) {
					state = 'reeling';
				}

				// Check fish collision
				for (const fish of fishes) {
					if (fish.caught) continue;
					const dx = fish.gfx.x - HOOK_X;
					const dy = fish.gfx.y - hookY;
					if (Math.abs(dx) < fish.size + HOOK_SIZE && Math.abs(dy) < fish.size * 0.6 + HOOK_SIZE) {
						fish.caught = true;
						caughtFish = fish;
						state = 'reeling';
						break;
					}
				}

				// Check junk collision
				for (const junk of junks) {
					const dx = junk.x - HOOK_X;
					const dy = junk.y - hookY;
					if (Math.abs(dx) < junk.size && Math.abs(dy) < junk.size) {
						state = 'reeling';
						break;
					}
				}
			}

			if (state === 'reeling') {
				hookY -= HOOK_SPEED_UP;

				if (caughtFish) {
					caughtFish.gfx.x = HOOK_X;
					caughtFish.gfx.y = hookY + 15;
				}

				if (hookY <= WATER_TOP) {
					hookY = WATER_TOP;
					if (caughtFish) {
						scoreVal += caughtFish.points;
						catches++;
						scoreText.text = String(scoreVal);
						catchText.text = `+${caughtFish.points}!`;
						setTimeout(() => { catchText.text = ''; }, 800);
						caughtFish.gfx.destroy();
						caughtFish = null;
					}
					state = 'idle';
				}
			}

			hook.y = hookY;
			drawHookLine();
		});

		cleanup = () => {
			clearInterval(timerInterval);
			appCleanup();
		};
	}

	function restart() {
		startGame();
	}

	onMount(() => {
		startGame();
		return () => cleanup?.();
	});
</script>

<GameShell title="釣魚大師" onrestart={restart}>
	<div class="game-container" bind:this={containerEl}></div>

	{#if state === 'finished'}
		<div class="overlay">
			<div class="overlay-box win">
				<p>收竿！</p>
				<p class="sub">釣了 {catches} 條魚</p>
				<p class="sub">總分: {scoreVal}</p>
				<button onclick={restart}>再釣一次</button>
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
