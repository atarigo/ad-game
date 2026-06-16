<script lang="ts">
	import { onMount } from 'svelte';
	import GameShell from '$lib/components/GameShell.svelte';
	import {
		initApp,
		W,
		H,
		COLORS,
		centeredText,
		drawRect,
		drawCircle,
		Graphics,
		Container
	} from '$lib/game-engine';

	let containerEl: HTMLDivElement;
	let cleanup: (() => void) | undefined;
	let state = $state<'playing' | 'won' | 'lost' | 'animating'>('playing');
	let round = $state(0);
	let score = $state(0);

	interface Round {
		scenario: string;
		heroColor: number;
		threatShape: 'triangle' | 'circle' | 'rect';
		threatColor: number;
		choices: { label: string; correct: boolean; color: number }[];
	}

	const rounds: Round[] = [
		{
			scenario: 'VS 火龍',
			heroColor: COLORS.cyan,
			threatShape: 'triangle',
			threatColor: COLORS.lava,
			choices: [
				{ label: '劍', correct: true, color: 0xcccccc },
				{ label: '盾', correct: false, color: 0x886633 },
				{ label: '藥水', correct: false, color: COLORS.green }
			]
		},
		{
			scenario: 'VS 洪水',
			heroColor: COLORS.cyan,
			threatShape: 'rect',
			threatColor: COLORS.water,
			choices: [
				{ label: '劍', correct: false, color: 0xcccccc },
				{ label: '船', correct: true, color: 0x886633 },
				{ label: '火把', correct: false, color: COLORS.orange }
			]
		},
		{
			scenario: 'VS 暴風雪',
			heroColor: COLORS.cyan,
			threatShape: 'circle',
			threatColor: 0xaaddff,
			choices: [
				{ label: '火把', correct: true, color: COLORS.orange },
				{ label: '冰劍', correct: false, color: 0x88ccff },
				{ label: '盾', correct: false, color: 0x886633 }
			]
		},
		{
			scenario: 'VS 毒蛇',
			heroColor: COLORS.cyan,
			threatShape: 'triangle',
			threatColor: COLORS.green,
			choices: [
				{ label: '解毒劑', correct: true, color: COLORS.purple },
				{ label: '劍', correct: false, color: 0xcccccc },
				{ label: '盾', correct: false, color: 0x886633 }
			]
		},
		{
			scenario: 'VS 巨石',
			heroColor: COLORS.cyan,
			threatShape: 'circle',
			threatColor: 0x777777,
			choices: [
				{ label: '鏟子', correct: false, color: 0x886633 },
				{ label: '炸藥', correct: true, color: COLORS.red },
				{ label: '繩子', correct: false, color: 0xccaa66 }
			]
		}
	];

	async function startGame() {
		if (cleanup) cleanup();
		containerEl.innerHTML = '';
		state = 'playing';
		round = 0;
		score = 0;

		const { app, cleanup: appCleanup } = await initApp(containerEl);
		let sceneContainer: Container;

		function drawRound() {
			if (sceneContainer) {
				app.stage.removeChild(sceneContainer);
				sceneContainer.destroy({ children: true });
			}
			sceneContainer = new Container();
			app.stage.addChild(sceneContainer);

			const r = rounds[round];

			const clickBait = centeredText('99% 的人選錯了！', W / 2, 30, {
				size: 14,
				color: COLORS.yellow
			});
			sceneContainer.addChild(clickBait);

			const scenarioLabel = centeredText(r.scenario, W / 2, 70, {
				size: 28,
				color: COLORS.pink
			});
			sceneContainer.addChild(scenarioLabel);

			const roundLabel = centeredText(`第 ${round + 1} / ${rounds.length} 回合`, W / 2, 110, {
				size: 14,
				color: COLORS.muted
			});
			sceneContainer.addChild(roundLabel);

			const scoreLabel = centeredText(`得分: ${score}`, W / 2, 140, {
				size: 16,
				color: COLORS.cyan
			});
			sceneContainer.addChild(scoreLabel);

			// Hero (stick figure)
			const hero = new Container();
			const head = drawCircle(0, 0, 20, r.heroColor);
			const bodyLine = new Graphics();
			bodyLine.moveTo(0, 20).lineTo(0, 70).stroke({ color: r.heroColor, width: 4 });
			bodyLine.moveTo(-25, 45).lineTo(25, 45).stroke({ color: r.heroColor, width: 4 });
			bodyLine.moveTo(0, 70).lineTo(-15, 110).stroke({ color: r.heroColor, width: 4 });
			bodyLine.moveTo(0, 70).lineTo(15, 110).stroke({ color: r.heroColor, width: 4 });
			hero.addChild(bodyLine, head);
			hero.x = 120;
			hero.y = 280;
			sceneContainer.addChild(hero);

			// Threat
			const threat = new Graphics();
			if (r.threatShape === 'triangle') {
				threat.moveTo(0, -40).lineTo(35, 30).lineTo(-35, 30).closePath();
				threat.fill(r.threatColor);
			} else if (r.threatShape === 'circle') {
				threat.circle(0, 0, 40);
				threat.fill(r.threatColor);
			} else {
				threat.rect(-35, -35, 70, 70);
				threat.fill(r.threatColor);
			}
			threat.x = 280;
			threat.y = 300;
			sceneContainer.addChild(threat);

			// VS text
			const vsText = centeredText('VS', 200, 300, { size: 36, color: COLORS.yellow });
			sceneContainer.addChild(vsText);

			// Choice buttons
			const choiceStartY = 500;
			const choiceGap = 80;

			for (let i = 0; i < r.choices.length; i++) {
				const c = r.choices[i];
				const btn = new Container();

				const bg = new Graphics();
				bg.roundRect(-80, -25, 160, 50, 10);
				bg.fill({ color: c.color, alpha: 0.2 });
				bg.roundRect(-80, -25, 160, 50, 10);
				bg.stroke({ color: c.color, width: 2 });
				btn.addChild(bg);

				const label = centeredText(c.label, 0, 0, { size: 20, color: c.color });
				btn.addChild(label);

				btn.x = W / 2;
				btn.y = choiceStartY + i * choiceGap;
				btn.eventMode = 'static';
				btn.cursor = 'pointer';

				btn.on('pointerdown', () => {
					if (state !== 'playing') return;
					state = 'animating';

					if (c.correct) {
						score++;
						bg.clear();
						bg.roundRect(-80, -25, 160, 50, 10);
						bg.fill({ color: COLORS.green, alpha: 0.4 });
						bg.roundRect(-80, -25, 160, 50, 10);
						bg.stroke({ color: COLORS.green, width: 3 });

						const winText = centeredText('正確！', W / 2, 440, {
							size: 30,
							color: COLORS.green
						});
						sceneContainer.addChild(winText);

						// Threat shrinks away
						let shrinkT = 0;
						const ticker = () => {
							shrinkT += 0.03;
							threat.scale.set(Math.max(0, 1 - shrinkT));
							if (shrinkT >= 1) {
								app.ticker.remove(ticker);
								setTimeout(() => {
									if (round < rounds.length - 1) {
										round++;
										state = 'playing';
										drawRound();
									} else {
										state = 'won';
									}
								}, 500);
							}
						};
						app.ticker.add(ticker);
					} else {
						bg.clear();
						bg.roundRect(-80, -25, 160, 50, 10);
						bg.fill({ color: COLORS.red, alpha: 0.4 });
						bg.roundRect(-80, -25, 160, 50, 10);
						bg.stroke({ color: COLORS.red, width: 3 });

						const failText = centeredText('錯誤！', W / 2, 440, {
							size: 30,
							color: COLORS.red
						});
						sceneContainer.addChild(failText);

						// Hero falls
						let fallT = 0;
						const ticker = () => {
							fallT += 0.02;
							hero.y += 3;
							hero.rotation += 0.05;
							hero.alpha = Math.max(0, 1 - fallT);
							if (fallT >= 1) {
								app.ticker.remove(ticker);
								setTimeout(() => {
									state = 'lost';
								}, 300);
							}
						};
						app.ticker.add(ticker);
					}
				});

				sceneContainer.addChild(btn);
			}
		}

		drawRound();

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

<GameShell title="英雄救援" onrestart={restart}>
	<div class="game-container" bind:this={containerEl}></div>

	{#if state === 'won'}
		<div class="overlay">
			<div class="overlay-box win">
				<p>全部通關！</p>
				<p class="sub">得分: {score} / {rounds.length}</p>
				<button onclick={restart}>再玩一次</button>
			</div>
		</div>
	{/if}

	{#if state === 'lost'}
		<div class="overlay">
			<div class="overlay-box lose">
				<p>英雄陣亡！</p>
				<p class="sub">得分: {score} / {rounds.length}</p>
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
