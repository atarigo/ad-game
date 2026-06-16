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
	let state = $state<'idle' | 'growing' | 'falling' | 'walking' | 'dead' | 'transitioning'>('idle');
	let scoreVal = $state(0);

	async function startGame() {
		if (cleanup) cleanup();
		containerEl.innerHTML = '';
		state = 'idle';
		scoreVal = 0;

		const { app, cleanup: appCleanup } = await initApp(containerEl);

		const GROUND_Y = 550;
		const PLATFORM_H = 150;
		const MIN_GAP = 60;
		const MAX_GAP = 180;
		const MIN_PLAT_W = 40;
		const MAX_PLAT_W = 90;
		const HERO_SIZE = 24;
		const STICK_GROW_SPEED = 4;

		let platformX = 40;
		let platformW = 80;
		let nextPlatX = 0;
		let nextPlatW = 0;
		let stickLength = 0;
		let stickAngle = 0;
		let heroX = 0;
		let cameraOffset = 0;

		const scene = new Container();
		app.stage.addChild(scene);

		const scoreText = centeredText('0', W / 2, 40, { size: 32, color: COLORS.yellow });
		app.stage.addChild(scoreText);

		const hintText = centeredText('按住螢幕伸長棍子', W / 2, 80, {
			size: 14,
			color: COLORS.muted
		});
		app.stage.addChild(hintText);

		function generateNext() {
			const gap = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
			nextPlatW = MIN_PLAT_W + Math.random() * (MAX_PLAT_W - MIN_PLAT_W);
			nextPlatX = platformX + platformW + gap;
		}

		function drawScene() {
			scene.removeChildren();

			// Current platform
			const plat1 = new Graphics();
			plat1.rect(platformX - cameraOffset, GROUND_Y, platformW, PLATFORM_H);
			plat1.fill(0x334455);
			plat1.rect(platformX - cameraOffset, GROUND_Y, platformW, 4);
			plat1.fill(COLORS.cyan);
			scene.addChild(plat1);

			// Next platform
			const plat2 = new Graphics();
			plat2.rect(nextPlatX - cameraOffset, GROUND_Y, nextPlatW, PLATFORM_H);
			plat2.fill(0x334455);
			plat2.rect(nextPlatX - cameraOffset, GROUND_Y, nextPlatW, 4);
			plat2.fill(COLORS.cyan);
			scene.addChild(plat2);

			// Bonus zone (center of next platform)
			const bonusW = 8;
			const bonusCenterX = nextPlatX + nextPlatW / 2;
			const bonusGfx = new Graphics();
			bonusGfx.rect(bonusCenterX - bonusW / 2 - cameraOffset, GROUND_Y, bonusW, 4);
			bonusGfx.fill(COLORS.pink);
			scene.addChild(bonusGfx);

			// Stick
			if (stickLength > 0) {
				const stick = new Graphics();
				const stickBaseX = platformX + platformW - cameraOffset;
				const stickBaseY = GROUND_Y;

				stick.moveTo(stickBaseX, stickBaseY);
				if (stickAngle === 0) {
					stick.lineTo(stickBaseX, stickBaseY - stickLength);
				} else {
					const endX = stickBaseX + Math.sin(stickAngle) * stickLength;
					const endY = stickBaseY - Math.cos(stickAngle) * stickLength;
					stick.lineTo(endX, endY);
				}
				stick.stroke({ color: COLORS.yellow, width: 4 });
				scene.addChild(stick);
			}

			// Hero
			const hero = new Container();
			const heroBody = new Graphics();
			heroBody.rect(-HERO_SIZE / 2, -HERO_SIZE, HERO_SIZE, HERO_SIZE);
			heroBody.fill(COLORS.pink);
			const heroHead = new Graphics();
			heroHead.circle(0, -HERO_SIZE - 6, 6);
			heroHead.fill(COLORS.pink);
			hero.addChild(heroBody, heroHead);
			hero.x = heroX - cameraOffset;
			hero.y = GROUND_Y;
			scene.addChild(hero);
		}

		heroX = platformX + platformW - HERO_SIZE / 2 - 5;
		generateNext();
		drawScene();

		let pressing = false;

		app.stage.eventMode = 'static';
		app.stage.hitArea = { x: 0, y: 0, width: W, height: H, contains: () => true };

		app.stage.on('pointerdown', () => {
			if (state === 'idle') {
				state = 'growing';
				pressing = true;
				hintText.visible = false;
			}
		});

		app.stage.on('pointerup', () => {
			if (state === 'growing') {
				pressing = false;
				state = 'falling';
			}
		});

		app.ticker.add(() => {
			if (state === 'growing' && pressing) {
				stickLength += STICK_GROW_SPEED;
				drawScene();
			}

			if (state === 'falling') {
				stickAngle += 0.06;
				if (stickAngle >= Math.PI / 2) {
					stickAngle = Math.PI / 2;
					state = 'walking';
				}
				drawScene();
			}

			if (state === 'walking') {
				const stickEndX = platformX + platformW + stickLength;
				heroX += 3;

				const landedOnNext =
					stickEndX >= nextPlatX && stickEndX <= nextPlatX + nextPlatW;

				if (landedOnNext && heroX >= nextPlatX + nextPlatW - HERO_SIZE / 2 - 5) {
					heroX = nextPlatX + nextPlatW - HERO_SIZE / 2 - 5;
					state = 'transitioning';
					scoreVal++;
					scoreText.text = String(scoreVal);

					setTimeout(() => {
						platformX = nextPlatX;
						platformW = nextPlatW;
						stickLength = 0;
						stickAngle = 0;

						const targetOffset = platformX - 40;
						const animateCamera = () => {
							cameraOffset += (targetOffset - cameraOffset) * 0.1;
							if (Math.abs(cameraOffset - targetOffset) < 1) {
								cameraOffset = targetOffset;
								generateNext();
								drawScene();
								state = 'idle';
								return;
							}
							drawScene();
							requestAnimationFrame(animateCamera);
						};
						animateCamera();
					}, 300);
				} else if (!landedOnNext && heroX > platformX + platformW + stickLength) {
					state = 'dead';

					let fallY = 0;
					const fallTick = () => {
						fallY += 5;
						drawScene();
						const heroGfx = scene.children[scene.children.length - 1];
						if (heroGfx) heroGfx.y = GROUND_Y + fallY;
						if (fallY > 300) {
							app.ticker.remove(fallTick);
						}
					};
					app.ticker.add(fallTick);
				}

				drawScene();
			}
		});

		cleanup = appCleanup;
	}

	function restart() {
		startGame();
	}

	onMount(() => {
		startGame();
		return () => cleanup?.();
	});
</script>

<GameShell title="棍子英雄" onrestart={restart}>
	<div class="game-container" bind:this={containerEl}></div>

	{#if state === 'dead'}
		<div class="overlay">
			<div class="overlay-box lose">
				<p>掉下去了！</p>
				<p class="sub">走了 {scoreVal} 步</p>
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
