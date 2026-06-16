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
	let state = $state<'playing' | 'finished'>('playing');
	let finalScore = $state(0);

	interface Gate {
		lane: number; // 0=left, 1=right
		y: number;
		label: string;
		op: (v: number) => number;
		color: number;
	}

	async function startGame() {
		if (cleanup) cleanup();
		containerEl.innerHTML = '';
		state = 'playing';
		finalScore = 0;

		const { app, cleanup: appCleanup } = await initApp(containerEl);

		const LANE_W = W / 2;
		const RUNNER_Y = H - 120;
		const RUNNER_SIZE = 30;
		const SCROLL_SPEED = 3;
		const GATE_H = 60;
		const GATE_W = LANE_W - 20;

		let lane = 0; // 0=left, 1=right
		let coins = 1;
		let distance = 0;
		let gatesPassed = 0;
		const TOTAL_GATES = 15;

		// Generate gates
		const gates: Gate[] = [];
		const gateOps: { label: string; op: (v: number) => number; color: number }[] = [
			{ label: '×2', op: (v) => v * 2, color: COLORS.green },
			{ label: '×3', op: (v) => v * 3, color: COLORS.cyan },
			{ label: '+5', op: (v) => v + 5, color: COLORS.blue },
			{ label: '+10', op: (v) => v + 10, color: COLORS.blue },
			{ label: '÷2', op: (v) => Math.max(1, Math.floor(v / 2)), color: COLORS.red },
			{ label: '-3', op: (v) => Math.max(1, v - 3), color: COLORS.orange },
			{ label: '×5', op: (v) => v * 5, color: COLORS.gold },
		];

		for (let i = 0; i < TOTAL_GATES; i++) {
			const leftOp = gateOps[Math.floor(Math.random() * gateOps.length)];
			let rightOp = gateOps[Math.floor(Math.random() * gateOps.length)];
			while (rightOp.label === leftOp.label) {
				rightOp = gateOps[Math.floor(Math.random() * gateOps.length)];
			}
			const baseY = -(i + 1) * 300 - 200;
			gates.push({
				lane: 0,
				y: baseY,
				label: leftOp.label,
				op: leftOp.op,
				color: leftOp.color
			});
			gates.push({
				lane: 1,
				y: baseY,
				label: rightOp.label,
				op: rightOp.op,
				color: rightOp.color
			});
		}

		// Divider
		const divider = new Graphics();
		divider.rect(W / 2 - 1, 0, 2, H);
		divider.fill({ color: 0x334455, alpha: 0.5 });
		app.stage.addChild(divider);

		// Score text
		const coinText = centeredText('💰 1', W / 2, 35, { size: 24, color: COLORS.yellow });
		app.stage.addChild(coinText);

		const progressText = centeredText(`0 / ${TOTAL_GATES}`, W / 2, 70, {
			size: 14,
			color: COLORS.muted
		});
		app.stage.addChild(progressText);

		// Runner
		const runner = new Container();
		const runnerBody = new Graphics();
		runnerBody.circle(0, 0, RUNNER_SIZE);
		runnerBody.fill(COLORS.pink);
		runner.addChild(runnerBody);

		const runnerLabel = centeredText('1', 0, 0, { size: 18, color: COLORS.white, family: 'Arial' });
		runner.addChild(runnerLabel);

		runner.x = LANE_W / 2;
		runner.y = RUNNER_Y;
		app.stage.addChild(runner);

		// Coin trail
		const trailDots: Graphics[] = [];
		function updateCoinCount() {
			coinText.text = `${coins}`;
			runnerLabel.text = String(coins);
			const scale = Math.min(2, 0.8 + Math.log2(Math.max(1, coins)) * 0.15);
			runner.scale.set(scale);
		}

		// Gate graphics container
		const gateContainer = new Container();
		app.stage.addChild(gateContainer);
		app.stage.setChildIndex(runner, app.stage.children.length - 1);

		function drawGates() {
			gateContainer.removeChildren();
			for (const gate of gates) {
				const screenY = gate.y + distance;
				if (screenY < -100 || screenY > H + 100) continue;

				const gateGfx = new Container();
				const bg = new Graphics();
				const gx = gate.lane === 0 ? 10 : LANE_W + 10;
				bg.roundRect(gx, screenY, GATE_W, GATE_H, 8);
				bg.fill({ color: gate.color, alpha: 0.15 });
				bg.roundRect(gx, screenY, GATE_W, GATE_H, 8);
				bg.stroke({ color: gate.color, width: 2 });
				gateGfx.addChild(bg);

				const label = centeredText(gate.label, gx + GATE_W / 2, screenY + GATE_H / 2, {
					size: 24,
					color: gate.color
				});
				gateGfx.addChild(label);

				gateContainer.addChild(gateGfx);
			}
		}

		// Controls
		app.stage.eventMode = 'static';
		app.stage.hitArea = { x: 0, y: 0, width: W, height: H, contains: () => true };

		app.stage.on('pointerdown', (e: { globalX: number }) => {
			if (state !== 'playing') return;
			const scaleFactor = W / app.canvas.getBoundingClientRect().width;
			const x = e.globalX * scaleFactor;
			lane = x < W / 2 ? 0 : 1;
		});

		// Smooth lane switching
		app.ticker.add(() => {
			if (state !== 'playing') return;

			distance += SCROLL_SPEED;
			const targetX = lane === 0 ? LANE_W / 2 : LANE_W + LANE_W / 2;
			runner.x += (targetX - runner.x) * 0.15;

			drawGates();

			// Check gate collision
			for (let i = gates.length - 1; i >= 0; i--) {
				const gate = gates[i];
				const screenY = gate.y + distance;
				if (
					gate.lane === lane &&
					screenY > RUNNER_Y - GATE_H / 2 &&
					screenY < RUNNER_Y + RUNNER_SIZE
				) {
					coins = gate.op(coins);
					coins = Math.max(1, coins);
					updateCoinCount();
					gatesPassed++;
					progressText.text = `${Math.ceil(gatesPassed / 2)} / ${TOTAL_GATES}`;

					// Remove both gates at this y position
					const pairY = gate.y;
					for (let j = gates.length - 1; j >= 0; j--) {
						if (gates[j].y === pairY) gates.splice(j, 1);
					}
					break;
				}
			}

			// Check finish
			if (gates.length === 0) {
				state = 'finished';
				finalScore = coins;
			}

			// Trail effect
			if (Math.random() < 0.3) {
				const dot = new Graphics();
				dot.circle(runner.x + (Math.random() - 0.5) * 10, RUNNER_Y + RUNNER_SIZE + 5, 2);
				dot.fill({ color: COLORS.pink, alpha: 0.5 });
				app.stage.addChild(dot);
				trailDots.push(dot);
				if (trailDots.length > 20) {
					const old = trailDots.shift()!;
					old.destroy();
				}
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

<GameShell title="金幣跑酷" onrestart={restart}>
	<div class="game-container" bind:this={containerEl}></div>

	{#if state === 'finished'}
		<div class="overlay">
			<div class="overlay-box win">
				<p>終點！</p>
				<p class="sub">最終金幣: {finalScore}</p>
				<button onclick={restart}>再跑一次</button>
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
