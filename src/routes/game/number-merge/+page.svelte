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
		Graphics,
		Container,
		Text,
		Matter
	} from '$lib/game-engine';

	let containerEl: HTMLDivElement;
	let cleanup: (() => void) | undefined;
	let state = $state<'playing' | 'won' | 'lost'>('playing');
	let scoreVal = $state(0);

	const NUM_COLORS: Record<number, number> = {
		2: 0xff6b6b,
		4: 0xffa94d,
		8: 0xffd43b,
		16: 0x69db7c,
		32: 0x4dabf7,
		64: 0xb197fc,
		128: 0xff8787,
		256: 0xe599f7,
		512: 0x63e6be,
		1024: 0xffc078,
		2048: COLORS.gold
	};

	function getColor(n: number): number {
		return NUM_COLORS[n] ?? COLORS.pink;
	}

	const BALL_SIZES: Record<number, number> = {
		2: 18,
		4: 22,
		8: 26,
		16: 30,
		32: 34,
		64: 38,
		128: 42,
		256: 46,
		512: 50,
		1024: 54,
		2048: 58
	};

	function getRadius(n: number): number {
		return BALL_SIZES[n] ?? 20;
	}

	async function startGame() {
		if (cleanup) cleanup();
		containerEl.innerHTML = '';
		state = 'playing';
		scoreVal = 0;

		const { app, cleanup: appCleanup } = await initApp(containerEl);
		const physics = initPhysics(app, { x: 0, y: 1, scale: 0.001 });

		const PLAY_TOP = 120;
		const PLAY_LEFT = 30;
		const PLAY_RIGHT = W - 30;
		const PLAY_BOTTOM = H - 30;
		const PLAY_W = PLAY_RIGHT - PLAY_LEFT;

		const wallOpts = { isStatic: true, friction: 0.3, restitution: 0.2 };
		physics.addBody(
			Matter.Bodies.rectangle((PLAY_LEFT + PLAY_RIGHT) / 2, PLAY_BOTTOM + 15, PLAY_W + 20, 30, wallOpts),
			Matter.Bodies.rectangle(PLAY_LEFT - 15, (PLAY_TOP + PLAY_BOTTOM) / 2, 30, PLAY_BOTTOM - PLAY_TOP + 30, wallOpts),
			Matter.Bodies.rectangle(PLAY_RIGHT + 15, (PLAY_TOP + PLAY_BOTTOM) / 2, 30, PLAY_BOTTOM - PLAY_TOP + 30, wallOpts)
		);

		const borderGfx = new Graphics();
		borderGfx.rect(PLAY_LEFT, PLAY_TOP, PLAY_W, PLAY_BOTTOM - PLAY_TOP);
		borderGfx.stroke({ color: 0x334455, width: 2 });
		app.stage.addChild(borderGfx);

		const dangerLine = new Graphics();
		dangerLine.moveTo(PLAY_LEFT, PLAY_TOP + 40);
		dangerLine.lineTo(PLAY_RIGHT, PLAY_TOP + 40);
		dangerLine.stroke({ color: COLORS.red, width: 1, alpha: 0.4 });
		app.stage.addChild(dangerLine);

		const dangerLabel = centeredText('DANGER', W / 2, PLAY_TOP + 30, {
			size: 10,
			color: COLORS.red
		});
		dangerLabel.alpha = 0.5;
		app.stage.addChild(dangerLabel);

		const scoreText = centeredText('0', W / 2, 30, { size: 28, color: COLORS.yellow });
		app.stage.addChild(scoreText);

		const nextLabel = centeredText('NEXT', W / 2, 70, { size: 12, color: COLORS.muted });
		app.stage.addChild(nextLabel);

		interface Ball {
			body: Matter.Body;
			gfx: Container;
			value: number;
			merging: boolean;
		}

		const balls: Ball[] = [];
		let dropping = false;
		let nextValue = pickValue();
		let cooldown = false;

		const previewGfx = new Container();
		app.stage.addChild(previewGfx);
		updatePreview(W / 2);

		function pickValue(): number {
			const choices = [2, 2, 2, 4, 4, 8];
			return choices[Math.floor(Math.random() * choices.length)];
		}

		function updatePreview(x: number) {
			previewGfx.removeChildren();
			const r = getRadius(nextValue);
			const circle = new Graphics();
			circle.circle(0, 0, r);
			circle.fill({ color: getColor(nextValue), alpha: 0.5 });
			previewGfx.addChild(circle);

			const label = centeredText(String(nextValue), 0, 0, {
				size: r * 0.7,
				color: COLORS.white
			});
			previewGfx.addChild(label);

			const clampedX = Math.max(PLAY_LEFT + r, Math.min(PLAY_RIGHT - r, x));
			previewGfx.x = clampedX;
			previewGfx.y = PLAY_TOP + 10;
		}

		function createBall(x: number, y: number, value: number): Ball {
			const r = getRadius(value);
			const body = Matter.Bodies.circle(x, y, r, {
				restitution: 0.2,
				friction: 0.3,
				density: 0.002,
				label: `ball-${value}`
			});

			const gfx = new Container();
			const circle = new Graphics();
			circle.circle(0, 0, r);
			circle.fill(getColor(value));
			gfx.addChild(circle);

			const text = centeredText(String(value), 0, 0, {
				size: r * 0.65,
				color: 0x111111,
				family: 'Arial'
			});
			gfx.addChild(text);

			app.stage.addChild(gfx);
			physics.add(body, gfx);

			const ball: Ball = { body, gfx, value, merging: false };
			balls.push(ball);
			return ball;
		}

		function dropBall(x: number) {
			if (dropping || cooldown || state !== 'playing') return;
			dropping = true;
			cooldown = true;

			const r = getRadius(nextValue);
			const clampedX = Math.max(PLAY_LEFT + r, Math.min(PLAY_RIGHT - r, x));
			createBall(clampedX, PLAY_TOP + 10, nextValue);

			nextValue = pickValue();
			previewGfx.visible = false;

			setTimeout(() => {
				dropping = false;
				cooldown = false;
				previewGfx.visible = true;
				updatePreview(clampedX);
			}, 500);
		}

		app.stage.eventMode = 'static';
		app.stage.hitArea = { x: 0, y: 0, width: W, height: H, contains: (x: number, y: number) => true };

		app.stage.on('pointermove', (e: { globalX: number }) => {
			if (!dropping && state === 'playing') {
				updatePreview(e.globalX);
			}
		});

		app.stage.on('pointerdown', (e: { globalX: number }) => {
			dropBall(e.globalX);
		});

		Matter.Events.on(physics.engine, 'collisionStart', (event: Matter.IEventCollision<Matter.Engine>) => {
			if (state !== 'playing') return;

			for (const pair of event.pairs) {
				const ballA = balls.find((b) => b.body === pair.bodyA && !b.merging);
				const ballB = balls.find((b) => b.body === pair.bodyB && !b.merging);

				if (ballA && ballB && ballA.value === ballB.value) {
					ballA.merging = true;
					ballB.merging = true;

					const newValue = ballA.value * 2;
					const midX = (ballA.body.position.x + ballB.body.position.x) / 2;
					const midY = (ballA.body.position.y + ballB.body.position.y) / 2;

					physics.remove(ballA.body, ballA.gfx);
					physics.remove(ballB.body, ballB.gfx);
					const idxA = balls.indexOf(ballA);
					if (idxA >= 0) balls.splice(idxA, 1);
					const idxB = balls.indexOf(ballB);
					if (idxB >= 0) balls.splice(idxB, 1);

					createBall(midX, midY, newValue);

					scoreVal += newValue;
					scoreText.text = String(scoreVal);

					if (newValue >= 2048) {
						state = 'won';
					}
				}
			}
		});

		let loseCheckTimer = 0;
		app.ticker.add(() => {
			if (state !== 'playing') return;

			loseCheckTimer += app.ticker.deltaMS;
			if (loseCheckTimer > 2000) {
				loseCheckTimer = 0;
				for (const b of balls) {
					if (!b.merging && b.body.position.y < PLAY_TOP + 40) {
						const speed = Math.abs(b.body.velocity.y);
						if (speed < 0.5) {
							state = 'lost';
							break;
						}
					}
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

	onMount(() => {
		startGame();
		return () => cleanup?.();
	});
</script>

<GameShell title="數字合體" onrestart={restart}>
	<div class="game-container" bind:this={containerEl}></div>

	{#if state === 'won'}
		<div class="overlay">
			<div class="overlay-box win">
				<p>2048!</p>
				<p class="sub">得分: {scoreVal}</p>
				<button onclick={restart}>再玩一次</button>
			</div>
		</div>
	{/if}

	{#if state === 'lost'}
		<div class="overlay">
			<div class="overlay-box lose">
				<p>滿了！</p>
				<p class="sub">得分: {scoreVal}</p>
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

	.win p { color: #00f0ff; text-shadow: 0 0 20px rgba(0, 240, 255, 0.5); }
	.lose p { color: #ff2d7b; text-shadow: 0 0 20px rgba(255, 45, 123, 0.5); }
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
