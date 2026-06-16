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
	let state = $state<'playing' | 'finished'>('playing');
	let scoreVal = $state(0);
	let timeLeft = $state(30);

	async function startGame() {
		if (cleanup) cleanup();
		containerEl.innerHTML = '';
		state = 'playing';
		scoreVal = 0;
		timeLeft = 30;

		const { app, cleanup: appCleanup } = await initApp(containerEl);

		const PLAY_TOP = 100;
		const PLAY_BOTTOM = H - 40;
		const PLAY_LEFT = 20;
		const PLAY_RIGHT = W - 20;

		const scoreText = centeredText('0', W / 2, 30, { size: 32, color: COLORS.yellow });
		app.stage.addChild(scoreText);

		const timerText = centeredText('30s', W / 2, 70, { size: 18, color: COLORS.cyan });
		app.stage.addChild(timerText);

		interface Bug {
			gfx: Container;
			x: number;
			y: number;
			vx: number;
			vy: number;
			alive: boolean;
			size: number;
			turnTimer: number;
		}

		const bugs: Bug[] = [];
		let spawnTimer = 0;
		let spawnInterval = 1200;
		let elapsed = 0;

		function drawBug(size: number, color: number): Container {
			const c = new Container();

			// Body (oval)
			const body = new Graphics();
			body.ellipse(0, 0, size, size * 0.7);
			body.fill(color);
			c.addChild(body);

			// Head
			const head = new Graphics();
			head.circle(size * 0.8, 0, size * 0.35);
			head.fill(color);
			c.addChild(head);

			// Eyes
			const eye1 = new Graphics();
			eye1.circle(size * 0.9, -size * 0.15, 2);
			eye1.fill(COLORS.white);
			c.addChild(eye1);

			const eye2 = new Graphics();
			eye2.circle(size * 0.9, size * 0.15, 2);
			eye2.fill(COLORS.white);
			c.addChild(eye2);

			// Legs
			const legs = new Graphics();
			for (let i = -1; i <= 1; i++) {
				const lx = i * size * 0.4;
				legs.moveTo(lx, -size * 0.7);
				legs.lineTo(lx - size * 0.3, -size * 1.1);
				legs.moveTo(lx, size * 0.7);
				legs.lineTo(lx - size * 0.3, size * 1.1);
			}
			legs.stroke({ color: color, width: 2 });
			c.addChild(legs);

			return c;
		}

		function spawnBug() {
			const size = 12 + Math.random() * 10;
			const edge = Math.floor(Math.random() * 4);
			let x: number, y: number;

			switch (edge) {
				case 0: x = -size; y = PLAY_TOP + Math.random() * (PLAY_BOTTOM - PLAY_TOP); break;
				case 1: x = W + size; y = PLAY_TOP + Math.random() * (PLAY_BOTTOM - PLAY_TOP); break;
				case 2: x = PLAY_LEFT + Math.random() * (PLAY_RIGHT - PLAY_LEFT); y = PLAY_TOP - size; break;
				default: x = PLAY_LEFT + Math.random() * (PLAY_RIGHT - PLAY_LEFT); y = PLAY_BOTTOM + size; break;
			}

			const speed = 1 + Math.random() * 2 + elapsed / 15000;
			const targetX = PLAY_LEFT + Math.random() * (PLAY_RIGHT - PLAY_LEFT);
			const targetY = PLAY_TOP + Math.random() * (PLAY_BOTTOM - PLAY_TOP);
			const angle = Math.atan2(targetY - y, targetX - x);

			const colors = [0x4a3520, 0x2d5a27, 0x1a1a1a, 0x6b3a2a, 0x3d6b3a];
			const color = colors[Math.floor(Math.random() * colors.length)];

			const gfx = drawBug(size, color);
			gfx.x = x;
			gfx.y = y;
			gfx.rotation = angle;
			gfx.eventMode = 'static';
			gfx.cursor = 'pointer';

			const bug: Bug = {
				gfx,
				x,
				y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				alive: true,
				size,
				turnTimer: 1000 + Math.random() * 2000
			};

			gfx.on('pointerdown', (e: Event) => {
				e.stopPropagation?.();
				if (!bug.alive || state !== 'playing') return;
				bug.alive = false;

				// Squash effect
				gfx.scale.set(1.5, 0.3);
				gfx.alpha = 0.5;

				// Splat
				const splat = new Graphics();
				splat.circle(bug.x, bug.y, size * 1.5);
				splat.fill({ color: 0x44aa33, alpha: 0.3 });
				app.stage.addChild(splat);

				// Score popup
				const popup = centeredText('+1', bug.x, bug.y - 20, {
					size: 18,
					color: COLORS.green
				});
				app.stage.addChild(popup);

				scoreVal++;
				scoreText.text = String(scoreVal);

				setTimeout(() => {
					gfx.destroy();
					splat.destroy();
					popup.destroy();
				}, 400);
			});

			app.stage.addChild(gfx);
			bugs.push(bug);
		}

		// Timer
		let timerInterval = setInterval(() => {
			if (state !== 'playing') return;
			timeLeft--;
			timerText.text = `${timeLeft}s`;
			if (timeLeft <= 5) {
				timerText.style.fill = COLORS.red;
			}
			if (timeLeft <= 0) {
				state = 'finished';
				clearInterval(timerInterval);
			}
		}, 1000);

		// Game loop
		app.ticker.add(() => {
			if (state !== 'playing') return;

			const dt = Math.min(app.ticker.deltaMS, 33);
			elapsed += dt;

			// Spawn
			spawnTimer += dt;
			spawnInterval = Math.max(300, 1200 - elapsed / 30);
			if (spawnTimer >= spawnInterval) {
				spawnTimer = 0;
				if (bugs.filter((b) => b.alive).length < 20) {
					spawnBug();
				}
			}

			// Move bugs
			for (const bug of bugs) {
				if (!bug.alive) continue;

				bug.turnTimer -= dt;
				if (bug.turnTimer <= 0) {
					bug.turnTimer = 800 + Math.random() * 1500;
					const angle = Math.random() * Math.PI * 2;
					const speed = Math.sqrt(bug.vx * bug.vx + bug.vy * bug.vy);
					bug.vx = Math.cos(angle) * speed;
					bug.vy = Math.sin(angle) * speed;
					bug.gfx.rotation = angle;
				}

				bug.x += bug.vx;
				bug.y += bug.vy;

				// Bounce off edges
				if (bug.x < PLAY_LEFT) { bug.vx = Math.abs(bug.vx); bug.gfx.rotation = Math.atan2(bug.vy, bug.vx); }
				if (bug.x > PLAY_RIGHT) { bug.vx = -Math.abs(bug.vx); bug.gfx.rotation = Math.atan2(bug.vy, bug.vx); }
				if (bug.y < PLAY_TOP) { bug.vy = Math.abs(bug.vy); bug.gfx.rotation = Math.atan2(bug.vy, bug.vx); }
				if (bug.y > PLAY_BOTTOM) { bug.vy = -Math.abs(bug.vy); bug.gfx.rotation = Math.atan2(bug.vy, bug.vx); }

				bug.gfx.x = bug.x;
				bug.gfx.y = bug.y;
			}
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

<GameShell title="打蟲蟲" onrestart={restart}>
	<div class="game-container" bind:this={containerEl}></div>

	{#if state === 'finished'}
		<div class="overlay">
			<div class="overlay-box win">
				<p>時間到！</p>
				<p class="sub">消滅了 {scoreVal} 隻蟲</p>
				<button onclick={restart}>再打一次</button>
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
