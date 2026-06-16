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
	let state = $state<'playing' | 'dead'>('playing');
	let scoreVal = $state(0);

	async function startGame() {
		if (cleanup) cleanup();
		containerEl.innerHTML = '';
		state = 'playing';
		scoreVal = 0;

		const { app, cleanup: appCleanup } = await initApp(containerEl);

		const BLOCK_H = 28;
		const BASE_Y = H - 60;
		const START_W = 120;
		const SWING_SPEED_BASE = 2.5;
		const SWING_SPEED_INC = 0.15;

		interface Block {
			x: number;
			y: number;
			w: number;
			gfx: Graphics;
		}

		const blocks: Block[] = [];
		let currentBlock: Block | null = null;
		let swingDir = 1;
		let swingSpeed = SWING_SPEED_BASE;
		let cameraY = 0;

		const scene = new Container();
		app.stage.addChild(scene);

		const scoreText = centeredText('0', W / 2, 35, { size: 32, color: COLORS.yellow });
		app.stage.addChild(scoreText);

		const hintText = centeredText('點擊放下方塊', W / 2, 75, {
			size: 14,
			color: COLORS.muted
		});
		app.stage.addChild(hintText);

		const blockColors = [
			COLORS.pink, COLORS.cyan, COLORS.yellow,
			COLORS.green, COLORS.orange, COLORS.purple,
			COLORS.blue, COLORS.red
		];

		function getColor(idx: number): number {
			return blockColors[idx % blockColors.length];
		}

		function createBlock(x: number, y: number, w: number, colorIdx: number): Block {
			const gfx = new Graphics();
			gfx.roundRect(-w / 2, -BLOCK_H / 2, w, BLOCK_H, 3);
			gfx.fill(getColor(colorIdx));
			gfx.roundRect(-w / 2, -BLOCK_H / 2, w, BLOCK_H, 3);
			gfx.stroke({ color: 0xffffff, width: 1, alpha: 0.2 });
			gfx.x = x;
			gfx.y = y;
			scene.addChild(gfx);
			return { x, y, w, gfx };
		}

		// Base block
		const base = createBlock(W / 2, BASE_Y, START_W, 0);
		blocks.push(base);

		function spawnSwinging() {
			const prevBlock = blocks[blocks.length - 1];
			const y = prevBlock.y - BLOCK_H;
			const w = prevBlock.w;
			const newBlock = createBlock(-w, y, w, blocks.length);
			currentBlock = newBlock;
			swingDir = 1;
			swingSpeed = SWING_SPEED_BASE + blocks.length * SWING_SPEED_INC;
		}

		function dropBlock() {
			if (!currentBlock || state !== 'playing') return;

			const prev = blocks[blocks.length - 1];
			const curr = currentBlock;

			const prevLeft = prev.x - prev.w / 2;
			const prevRight = prev.x + prev.w / 2;
			const currLeft = curr.x - curr.w / 2;
			const currRight = curr.x + curr.w / 2;

			const overlapLeft = Math.max(prevLeft, currLeft);
			const overlapRight = Math.min(prevRight, currRight);
			const overlapW = overlapRight - overlapLeft;

			if (overlapW <= 0) {
				// Miss completely
				state = 'dead';

				// Fall animation
				let fallSpeed = 0;
				const fallTick = () => {
					fallSpeed += 0.5;
					curr.gfx.y += fallSpeed;
					curr.gfx.rotation += 0.03 * swingDir;
					if (curr.gfx.y > H + 100) {
						app.ticker.remove(fallTick);
					}
				};
				app.ticker.add(fallTick);
				return;
			}

			// Calculate new position
			const newX = overlapLeft + overlapW / 2;
			const cutOff = curr.w - overlapW;

			// Update current block to overlapping portion
			scene.removeChild(curr.gfx);
			curr.gfx.destroy();

			const newGfx = new Graphics();
			newGfx.roundRect(-overlapW / 2, -BLOCK_H / 2, overlapW, BLOCK_H, 3);
			newGfx.fill(getColor(blocks.length));
			newGfx.roundRect(-overlapW / 2, -BLOCK_H / 2, overlapW, BLOCK_H, 3);
			newGfx.stroke({ color: 0xffffff, width: 1, alpha: 0.2 });
			newGfx.x = newX;
			newGfx.y = curr.y;
			scene.addChild(newGfx);

			curr.x = newX;
			curr.w = overlapW;
			curr.gfx = newGfx;
			blocks.push(curr);

			// Falling cut piece
			if (cutOff > 2) {
				const cutX = curr.x < prev.x
					? overlapLeft - cutOff / 2
					: overlapRight + cutOff / 2;

				const cutGfx = new Graphics();
				cutGfx.roundRect(-cutOff / 2, -BLOCK_H / 2, cutOff, BLOCK_H, 2);
				cutGfx.fill({ color: getColor(blocks.length - 1), alpha: 0.5 });
				cutGfx.x = cutX;
				cutGfx.y = curr.y;
				scene.addChild(cutGfx);

				let fallSpeed = 0;
				const fallTick = () => {
					fallSpeed += 0.3;
					cutGfx.y += fallSpeed;
					cutGfx.alpha -= 0.01;
					if (cutGfx.y > H + 100 || cutGfx.alpha <= 0) {
						app.ticker.remove(fallTick);
						cutGfx.destroy();
					}
				};
				app.ticker.add(fallTick);
			}

			scoreVal++;
			scoreText.text = String(scoreVal);

			// Perfect landing bonus
			if (cutOff < 5) {
				const perfect = centeredText('PERFECT!', W / 2, curr.y - cameraY - 30, {
					size: 16,
					color: COLORS.gold
				});
				app.stage.addChild(perfect);
				setTimeout(() => perfect.destroy(), 600);
			}

			// Check if block is too narrow
			if (overlapW < 8) {
				state = 'dead';
				return;
			}

			currentBlock = null;
			hintText.visible = false;

			// Camera scroll up
			const targetCamY = Math.max(0, (blocks.length - 10) * BLOCK_H);
			const animateCamera = () => {
				cameraY += (targetCamY - cameraY) * 0.1;
				scene.y = cameraY;
				if (Math.abs(cameraY - targetCamY) < 0.5) {
					cameraY = targetCamY;
					scene.y = cameraY;
					spawnSwinging();
					return;
				}
				requestAnimationFrame(animateCamera);
			};
			setTimeout(() => animateCamera(), 100);
		}

		// Controls
		app.stage.eventMode = 'static';
		app.stage.hitArea = { x: 0, y: 0, width: W, height: H, contains: () => true };
		app.stage.on('pointerdown', dropBlock);

		// Swing the current block
		app.ticker.add(() => {
			if (!currentBlock || state !== 'playing') return;
			currentBlock.x += swingSpeed * swingDir;
			currentBlock.gfx.x = currentBlock.x;

			if (currentBlock.x > W + currentBlock.w / 2) swingDir = -1;
			if (currentBlock.x < -currentBlock.w / 2) swingDir = 1;
		});

		// Start first swinging block
		spawnSwinging();

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

<GameShell title="疊疊高塔" onrestart={restart}>
	<div class="game-container" bind:this={containerEl}></div>

	{#if state === 'dead'}
		<div class="overlay">
			<div class="overlay-box lose">
				<p>塔倒了！</p>
				<p class="sub">疊了 {scoreVal} 層</p>
				<button onclick={restart}>再疊一次</button>
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
