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
	let state = $state<'playing' | 'won'>('playing');
	let moves = $state(0);

	const BALL_COLORS = [COLORS.red, COLORS.blue, COLORS.green, COLORS.yellow, COLORS.purple];

	async function startGame() {
		if (cleanup) cleanup();
		containerEl.innerHTML = '';
		state = 'playing';
		moves = 0;

		const { app, cleanup: appCleanup } = await initApp(containerEl);

		const NUM_TUBES = 5;
		const BALLS_PER_TUBE = 4;
		const NUM_COLORS = 3;
		const BALL_R = 18;
		const TUBE_W = 50;
		const TUBE_H = BALLS_PER_TUBE * (BALL_R * 2 + 4) + 16;
		const TUBE_GAP = 12;
		const TOTAL_W = NUM_TUBES * TUBE_W + (NUM_TUBES - 1) * TUBE_GAP;
		const START_X = (W - TOTAL_W) / 2;
		const START_Y = 220;

		const titleText = centeredText('球球分類', W / 2, 30, { size: 22, color: COLORS.pink });
		app.stage.addChild(titleText);

		const moveText = centeredText(`移動: ${moves}`, W / 2, 65, { size: 16, color: COLORS.yellow });
		app.stage.addChild(moveText);

		const hintText = centeredText('點擊管子移動最上方的球', W / 2, 95, {
			size: 13,
			color: COLORS.muted
		});
		app.stage.addChild(hintText);

		// Generate puzzle: NUM_COLORS colors × BALLS_PER_TUBE balls, shuffled into tubes
		// Last (NUM_TUBES - NUM_COLORS) tubes start empty
		const allBalls: number[] = [];
		for (let c = 0; c < NUM_COLORS; c++) {
			for (let i = 0; i < BALLS_PER_TUBE; i++) {
				allBalls.push(c);
			}
		}

		// Shuffle
		for (let i = allBalls.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[allBalls[i], allBalls[j]] = [allBalls[j], allBalls[i]];
		}

		// tubes[i] = array of color indices, bottom first
		const tubes: number[][] = [];
		for (let t = 0; t < NUM_COLORS; t++) {
			tubes.push(allBalls.slice(t * BALLS_PER_TUBE, (t + 1) * BALLS_PER_TUBE));
		}
		for (let t = NUM_COLORS; t < NUM_TUBES; t++) {
			tubes.push([]);
		}

		let selectedTube: number | null = null;
		let floatingBall: Container | null = null;
		let floatingColorIdx = -1;

		const tubeContainers: Container[] = [];

		function tubeX(i: number) {
			return START_X + i * (TUBE_W + TUBE_GAP) + TUBE_W / 2;
		}

		function drawTubes() {
			for (const tc of tubeContainers) {
				tc.destroy({ children: true });
			}
			tubeContainers.length = 0;

			for (let t = 0; t < NUM_TUBES; t++) {
				const tc = new Container();
				const cx = tubeX(t);

				// Tube body
				const tube = new Graphics();
				tube.roundRect(cx - TUBE_W / 2, START_Y, TUBE_W, TUBE_H, 4);
				tube.fill({ color: 0x1a1a3e, alpha: 0.6 });
				tube.roundRect(cx - TUBE_W / 2, START_Y, TUBE_W, TUBE_H, 4);
				tube.stroke({ color: selectedTube === t ? COLORS.cyan : 0x445566, width: 2 });
				tc.addChild(tube);

				// Balls in tube
				for (let b = 0; b < tubes[t].length; b++) {
					const colorIdx = tubes[t][b];
					const ballY = START_Y + TUBE_H - (b + 1) * (BALL_R * 2 + 4) + BALL_R - 4;
					const ball = new Graphics();
					ball.circle(cx, ballY, BALL_R);
					ball.fill(BALL_COLORS[colorIdx]);
					tc.addChild(ball);
				}

				// Hit area for interaction
				const hitArea = new Graphics();
				hitArea.rect(cx - TUBE_W / 2 - 4, START_Y - 60, TUBE_W + 8, TUBE_H + 70);
				hitArea.fill({ color: 0x000000, alpha: 0.001 });
				hitArea.eventMode = 'static';
				hitArea.cursor = 'pointer';

				const tubeIdx = t;
				hitArea.on('pointerdown', () => {
					if (state !== 'playing') return;
					onTubeClick(tubeIdx);
				});

				tc.addChild(hitArea);
				app.stage.addChild(tc);
				tubeContainers.push(tc);
			}
		}

		function onTubeClick(idx: number) {
			if (selectedTube === null) {
				// Select: pick from this tube
				if (tubes[idx].length === 0) return;
				selectedTube = idx;

				// Show floating ball
				floatingColorIdx = tubes[idx][tubes[idx].length - 1];
				floatingBall = new Container();
				const g = new Graphics();
				g.circle(0, 0, BALL_R);
				g.fill(BALL_COLORS[floatingColorIdx]);
				floatingBall.addChild(g);
				floatingBall.x = tubeX(idx);
				floatingBall.y = START_Y - 40;
				app.stage.addChild(floatingBall);

				drawTubes();
			} else if (selectedTube === idx) {
				// Deselect
				if (floatingBall) {
					floatingBall.destroy();
					floatingBall = null;
				}
				selectedTube = null;
				drawTubes();
			} else {
				// Place ball
				const targetTube = tubes[idx];
				const canPlace =
					targetTube.length < BALLS_PER_TUBE &&
					(targetTube.length === 0 ||
						targetTube[targetTube.length - 1] === floatingColorIdx);

				if (canPlace) {
					const ball = tubes[selectedTube!].pop()!;
					targetTube.push(ball);
					moves++;
					moveText.text = `移動: ${moves}`;
				}

				if (floatingBall) {
					floatingBall.destroy();
					floatingBall = null;
				}
				selectedTube = null;
				drawTubes();

				checkWin();
			}
		}

		function checkWin() {
			for (const tube of tubes) {
				if (tube.length === 0) continue;
				if (tube.length !== BALLS_PER_TUBE) return;
				if (!tube.every((b) => b === tube[0])) return;
			}
			state = 'won';
		}

		drawTubes();

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

<GameShell title="球球分類" onrestart={restart}>
	<div class="game-container" bind:this={containerEl}></div>

	{#if state === 'won'}
		<div class="overlay">
			<div class="overlay-box win">
				<p>完美分類！</p>
				<p class="sub">{moves} 步完成</p>
				<button onclick={restart}>再玩一次</button>
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
