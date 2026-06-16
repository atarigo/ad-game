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
	let state = $state<'playing' | 'maxed'>('playing');

	async function startGame() {
		if (cleanup) cleanup();
		containerEl.innerHTML = '';
		state = 'playing';

		const { app, cleanup: appCleanup } = await initApp(containerEl, 0x0c1a0c);

		// --- Game State ---
		let wood = 0;
		let meat = 0;
		let coins = 0;
		let axeLevel = 1;
		let weaponLevel = 1;
		let campLevel = 1;

		const MAX_LEVEL = 10;

		function axePower() { return axeLevel * 2; }
		function weaponPower() { return weaponLevel * 2; }
		function autoRate() { return campLevel >= 3 ? (campLevel - 2) * 2 : 0; }
		function upgradeCost(level: number) { return Math.floor(10 * Math.pow(1.8, level - 1)); }

		// --- Layout Constants ---
		const GROUND_Y = 480;
		const HUD_Y = 10;
		const SHOP_Y = 540;
		const TREE_AREA_X = 30;
		const TREE_AREA_W = 140;
		const ANIMAL_AREA_X = 230;
		const ANIMAL_AREA_W = 140;
		const CAMP_X = W / 2;
		const CAMP_Y = 350;

		// --- Ground ---
		const ground = new Graphics();
		ground.rect(0, GROUND_Y, W, H - GROUND_Y);
		ground.fill(0x1a3a1a);
		ground.rect(0, GROUND_Y, W, 3);
		ground.fill(0x2a5a2a);
		app.stage.addChild(ground);

		// Snow/frost particles for atmosphere
		const snowContainer = new Container();
		app.stage.addChild(snowContainer);
		interface Snowflake { gfx: Graphics; x: number; y: number; speed: number; drift: number; }
		const snowflakes: Snowflake[] = [];
		for (let i = 0; i < 30; i++) {
			const g = new Graphics();
			const size = 1 + Math.random() * 2;
			g.circle(0, 0, size);
			g.fill({ color: 0xffffff, alpha: 0.3 + Math.random() * 0.3 });
			const s: Snowflake = {
				gfx: g,
				x: Math.random() * W,
				y: Math.random() * GROUND_Y,
				speed: 0.3 + Math.random() * 0.8,
				drift: (Math.random() - 0.5) * 0.5,
			};
			g.x = s.x;
			g.y = s.y;
			snowContainer.addChild(g);
			snowflakes.push(s);
		}

		// --- HUD ---
		const hudBg = new Graphics();
		hudBg.rect(0, 0, W, 70);
		hudBg.fill({ color: 0x000000, alpha: 0.5 });
		app.stage.addChild(hudBg);

		const woodIcon = centeredText('🪵', 30, 25, { size: 18, family: 'Arial' });
		app.stage.addChild(woodIcon);
		const woodText = centeredText('0', 80, 25, { size: 16, color: COLORS.yellow, family: 'Arial' });
		app.stage.addChild(woodText);

		const meatIcon = centeredText('🥩', 150, 25, { size: 18, family: 'Arial' });
		app.stage.addChild(meatIcon);
		const meatText = centeredText('0', 200, 25, { size: 16, color: COLORS.yellow, family: 'Arial' });
		app.stage.addChild(meatText);

		const coinIcon = centeredText('💰', 280, 25, { size: 18, family: 'Arial' });
		app.stage.addChild(coinIcon);
		const coinText = centeredText('0', 340, 25, { size: 20, color: COLORS.gold, family: 'Arial' });
		app.stage.addChild(coinText);

		const levelLabel = centeredText('', W / 2, 55, { size: 11, color: COLORS.muted, family: 'Arial' });
		app.stage.addChild(levelLabel);

		function updateHUD() {
			woodText.text = String(wood);
			meatText.text = String(meat);
			coinText.text = String(coins);
			levelLabel.text = `斧 Lv${axeLevel}  |  刀 Lv${weaponLevel}  |  營地 Lv${campLevel}`;
		}

		// --- Camp (center, upgradeable visual) ---
		const campContainer = new Container();
		campContainer.x = CAMP_X;
		campContainer.y = CAMP_Y;
		app.stage.addChild(campContainer);

		function drawCamp() {
			campContainer.removeChildren();
			const size = 20 + campLevel * 8;

			// Base
			const base = new Graphics();
			base.rect(-size, -size * 0.3, size * 2, size * 0.6);
			base.fill(0x5a3a1a);
			base.rect(-size, -size * 0.3, size * 2, size * 0.6);
			base.stroke({ color: 0x7a5a3a, width: 2 });
			campContainer.addChild(base);

			// Roof (triangle)
			const roof = new Graphics();
			roof.moveTo(-size - 5, -size * 0.3);
			roof.lineTo(0, -size * 0.3 - size * 0.6);
			roof.lineTo(size + 5, -size * 0.3);
			roof.closePath();
			roof.fill(0x8a2a1a);
			campContainer.addChild(roof);

			// Door
			const door = new Graphics();
			door.rect(-8, -size * 0.1, 16, size * 0.4);
			door.fill(0x3a2a0a);
			campContainer.addChild(door);

			// Campfire
			if (campLevel >= 2) {
				const fire = new Graphics();
				fire.circle(size + 20, 5, 6);
				fire.fill(COLORS.orange);
				fire.circle(size + 20, 0, 4);
				fire.fill(COLORS.yellow);
				campContainer.addChild(fire);
			}

			// Flag
			if (campLevel >= 4) {
				const pole = new Graphics();
				pole.moveTo(-size - 10, -size * 0.3 - size * 0.6);
				pole.lineTo(-size - 10, -size * 0.3 - size * 0.6 - 25);
				pole.stroke({ color: 0x888888, width: 2 });
				campContainer.addChild(pole);

				const flag = new Graphics();
				flag.moveTo(-size - 10, -size * 0.3 - size * 0.6 - 25);
				flag.lineTo(-size + 5, -size * 0.3 - size * 0.6 - 18);
				flag.lineTo(-size - 10, -size * 0.3 - size * 0.6 - 11);
				flag.closePath();
				flag.fill(COLORS.red);
				campContainer.addChild(flag);
			}

			// Fence
			if (campLevel >= 6) {
				const fence = new Graphics();
				for (let i = -3; i <= 3; i++) {
					const fx = i * 15;
					if (Math.abs(fx) < size + 5) continue;
					fence.rect(fx - 2, -5, 4, 20);
					fence.fill(0x6a4a2a);
				}
				campContainer.addChild(fence);
			}

			// Level indicator
			const lvl = centeredText(`Lv${campLevel}`, 0, size * 0.3 + 16, {
				size: 11,
				color: COLORS.muted,
				family: 'Arial'
			});
			campContainer.addChild(lvl);
		}

		drawCamp();

		// --- Trees ---
		interface TreeObj {
			gfx: Container;
			x: number;
			y: number;
			hp: number;
			maxHp: number;
			hpBar: Graphics;
		}
		const trees: TreeObj[] = [];
		let treeSpawnTimer = 0;

		function spawnTree() {
			const x = TREE_AREA_X + Math.random() * TREE_AREA_W;
			const y = GROUND_Y - 10 - Math.random() * 60;
			const maxHp = 3 + Math.floor(Math.random() * 3) + campLevel;

			const c = new Container();
			c.x = x;
			c.y = y;

			// Trunk
			const trunk = new Graphics();
			trunk.rect(-6, -30, 12, 40);
			trunk.fill(0x6a4a2a);
			c.addChild(trunk);

			// Leaves (triangle)
			const leaves = new Graphics();
			leaves.moveTo(0, -65);
			leaves.lineTo(22, -25);
			leaves.lineTo(-22, -25);
			leaves.closePath();
			leaves.fill(0x2a6a2a);
			leaves.moveTo(0, -50);
			leaves.lineTo(18, -15);
			leaves.lineTo(-18, -15);
			leaves.closePath();
			leaves.fill(0x3a7a3a);
			c.addChild(leaves);

			// HP bar
			const hpBar = new Graphics();
			c.addChild(hpBar);

			c.eventMode = 'static';
			c.cursor = 'pointer';

			app.stage.addChild(c);

			const tree: TreeObj = { gfx: c, x, y, hp: maxHp, maxHp, hpBar };
			trees.push(tree);

			function drawHpBar() {
				hpBar.clear();
				const bw = 30;
				hpBar.rect(-bw / 2, -72, bw, 5);
				hpBar.fill({ color: 0x333333, alpha: 0.6 });
				hpBar.rect(-bw / 2, -72, bw * (tree.hp / tree.maxHp), 5);
				hpBar.fill(COLORS.green);
			}
			drawHpBar();

			c.on('pointerdown', () => {
				if (state !== 'playing') return;
				tree.hp -= axePower();

				// Hit effect
				const popup = centeredText(`-${axePower()}`, x + (Math.random() - 0.5) * 20, y - 80, {
					size: 14,
					color: COLORS.yellow,
					family: 'Arial'
				});
				app.stage.addChild(popup);
				let popT = 0;
				const popTick = () => {
					popT += 0.04;
					popup.y -= 1.5;
					popup.alpha = 1 - popT;
					if (popT >= 1) { app.ticker.remove(popTick); popup.destroy(); }
				};
				app.ticker.add(popTick);

				// Shake
				c.x = x + (Math.random() - 0.5) * 6;
				setTimeout(() => { c.x = x; }, 80);

				if (tree.hp <= 0) {
					const gained = 2 + axeLevel;
					wood += gained;

					const woodPopup = centeredText(`+${gained} 🪵`, x, y - 90, {
						size: 16,
						color: COLORS.green,
						family: 'Arial'
					});
					app.stage.addChild(woodPopup);
					let wt = 0;
					const wtick = () => {
						wt += 0.03;
						woodPopup.y -= 1;
						woodPopup.alpha = 1 - wt;
						if (wt >= 1) { app.ticker.remove(wtick); woodPopup.destroy(); }
					};
					app.ticker.add(wtick);

					c.destroy();
					const idx = trees.indexOf(tree);
					if (idx >= 0) trees.splice(idx, 1);
					updateHUD();
				} else {
					drawHpBar();
				}
			});
		}

		// --- Animals ---
		interface AnimalObj {
			gfx: Container;
			x: number;
			y: number;
			hp: number;
			maxHp: number;
			hpBar: Graphics;
			vx: number;
			moveTimer: number;
		}
		const animals: AnimalObj[] = [];
		let animalSpawnTimer = 0;

		function spawnAnimal() {
			const x = ANIMAL_AREA_X + Math.random() * ANIMAL_AREA_W;
			const y = GROUND_Y - 5 - Math.random() * 50;
			const maxHp = 4 + Math.floor(Math.random() * 4) + campLevel;

			const c = new Container();
			c.x = x;
			c.y = y;

			// Body (simple quadruped)
			const body = new Graphics();
			body.ellipse(0, -10, 18, 10);
			body.fill(0x8a6a4a);
			c.addChild(body);

			// Head
			const head = new Graphics();
			head.circle(18, -14, 8);
			head.fill(0x7a5a3a);
			c.addChild(head);

			// Eye
			const eye = new Graphics();
			eye.circle(22, -16, 2);
			eye.fill(COLORS.white);
			c.addChild(eye);

			// Legs
			const legs = new Graphics();
			legs.rect(-12, -3, 4, 12).fill(0x6a4a2a);
			legs.rect(-4, -3, 4, 12).fill(0x6a4a2a);
			legs.rect(4, -3, 4, 12).fill(0x6a4a2a);
			legs.rect(12, -3, 4, 12).fill(0x6a4a2a);
			c.addChild(legs);

			// HP bar
			const hpBar = new Graphics();
			c.addChild(hpBar);

			c.eventMode = 'static';
			c.cursor = 'pointer';

			app.stage.addChild(c);

			const animal: AnimalObj = {
				gfx: c, x, y, hp: maxHp, maxHp, hpBar,
				vx: (Math.random() - 0.5) * 0.8,
				moveTimer: 1000 + Math.random() * 2000
			};
			animals.push(animal);

			function drawHpBar() {
				hpBar.clear();
				const bw = 30;
				hpBar.rect(-bw / 2, -30, bw, 5);
				hpBar.fill({ color: 0x333333, alpha: 0.6 });
				hpBar.rect(-bw / 2, -30, bw * (animal.hp / animal.maxHp), 5);
				hpBar.fill(COLORS.red);
			}
			drawHpBar();

			c.on('pointerdown', () => {
				if (state !== 'playing') return;
				animal.hp -= weaponPower();

				const popup = centeredText(`-${weaponPower()}`, x + (Math.random() - 0.5) * 20, y - 40, {
					size: 14,
					color: COLORS.red,
					family: 'Arial'
				});
				app.stage.addChild(popup);
				let popT = 0;
				const popTick = () => {
					popT += 0.04;
					popup.y -= 1.5;
					popup.alpha = 1 - popT;
					if (popT >= 1) { app.ticker.remove(popTick); popup.destroy(); }
				};
				app.ticker.add(popTick);

				c.x = animal.x + (Math.random() - 0.5) * 8;
				setTimeout(() => { if (!c.destroyed) c.x = animal.x; }, 80);

				if (animal.hp <= 0) {
					const gained = 2 + weaponLevel;
					meat += gained;

					const meatPopup = centeredText(`+${gained} 🥩`, animal.x, y - 50, {
						size: 16,
						color: COLORS.pink,
						family: 'Arial'
					});
					app.stage.addChild(meatPopup);
					let mt = 0;
					const mtick = () => {
						mt += 0.03;
						meatPopup.y -= 1;
						meatPopup.alpha = 1 - mt;
						if (mt >= 1) { app.ticker.remove(mtick); meatPopup.destroy(); }
					};
					app.ticker.add(mtick);

					c.destroy();
					const idx = animals.indexOf(animal);
					if (idx >= 0) animals.splice(idx, 1);
					updateHUD();
				} else {
					drawHpBar();
				}
			});
		}

		// --- Shop ---
		const shopBg = new Graphics();
		shopBg.rect(0, SHOP_Y - 10, W, H - SHOP_Y + 10);
		shopBg.fill({ color: 0x000000, alpha: 0.6 });
		app.stage.addChild(shopBg);

		const shopTitle = centeredText('— 升級商店 —', W / 2, SHOP_Y + 5, {
			size: 13,
			color: COLORS.gold,
			family: 'Arial'
		});
		app.stage.addChild(shopTitle);

		interface ShopButton {
			container: Container;
			label: Text;
			costLabel: Text;
			update: () => void;
		}
		const shopButtons: ShopButton[] = [];

		function createShopButton(
			x: number,
			y: number,
			icon: string,
			getName: () => string,
			getCost: () => number,
			canBuy: () => boolean,
			onBuy: () => void
		): ShopButton {
			const c = new Container();
			c.x = x;
			c.y = y;

			const bg = new Graphics();
			bg.roundRect(-55, -22, 110, 44, 6);
			bg.fill({ color: 0x2a2a3e, alpha: 0.8 });
			bg.roundRect(-55, -22, 110, 44, 6);
			bg.stroke({ color: COLORS.cyan, width: 1, alpha: 0.4 });
			c.addChild(bg);

			const iconText = centeredText(icon, -35, -5, { size: 16, family: 'Arial' });
			c.addChild(iconText);

			const label = centeredText(getName(), 10, -8, {
				size: 11,
				color: COLORS.white,
				family: 'Arial'
			});
			c.addChild(label);

			const costLabel = centeredText(`💰${getCost()}`, 10, 8, {
				size: 10,
				color: COLORS.gold,
				family: 'Arial'
			});
			c.addChild(costLabel);

			c.eventMode = 'static';
			c.cursor = 'pointer';

			c.on('pointerdown', () => {
				if (!canBuy()) return;
				onBuy();
				updateHUD();
				updateShop();
			});

			app.stage.addChild(c);

			const btn: ShopButton = {
				container: c,
				label,
				costLabel,
				update() {
					label.text = getName();
					const cost = getCost();
					costLabel.text = cost > 0 ? `💰${cost}` : 'MAX';
					c.alpha = canBuy() ? 1 : 0.5;
				}
			};
			shopButtons.push(btn);
			return btn;
		}

		// Sell buttons
		const sellWoodBtn = createShopButton(
			70, SHOP_Y + 40,
			'🪵→💰',
			() => '賣木材',
			() => 0,
			() => wood >= 5,
			() => {
				const sell = Math.min(wood, 10);
				wood -= sell;
				coins += sell * (1 + Math.floor(campLevel / 3));
			}
		);

		const sellMeatBtn = createShopButton(
			200, SHOP_Y + 40,
			'🥩→💰',
			() => '賣肉',
			() => 0,
			() => meat >= 5,
			() => {
				const sell = Math.min(meat, 10);
				meat -= sell;
				coins += sell * (2 + Math.floor(campLevel / 2));
			}
		);

		// Sell buttons show differently
		sellWoodBtn.costLabel.text = '5+🪵';
		sellMeatBtn.costLabel.text = '5+🥩';

		const axeBtn = createShopButton(
			70, SHOP_Y + 90,
			'🪓',
			() => `斧 Lv${axeLevel}`,
			() => axeLevel >= MAX_LEVEL ? 0 : upgradeCost(axeLevel),
			() => axeLevel < MAX_LEVEL && coins >= upgradeCost(axeLevel),
			() => { coins -= upgradeCost(axeLevel); axeLevel++; }
		);

		const weaponBtn = createShopButton(
			200, SHOP_Y + 90,
			'🗡',
			() => `刀 Lv${weaponLevel}`,
			() => weaponLevel >= MAX_LEVEL ? 0 : upgradeCost(weaponLevel),
			() => weaponLevel < MAX_LEVEL && coins >= upgradeCost(weaponLevel),
			() => { coins -= upgradeCost(weaponLevel); weaponLevel++; }
		);

		const campBtn = createShopButton(
			W / 2, SHOP_Y + 140,
			'🏠',
			() => `營地 Lv${campLevel}`,
			() => campLevel >= MAX_LEVEL ? 0 : upgradeCost(campLevel) * 2,
			() => campLevel < MAX_LEVEL && coins >= upgradeCost(campLevel) * 2,
			() => {
				coins -= upgradeCost(campLevel) * 2;
				campLevel++;
				drawCamp();
			}
		);

		function updateShop() {
			sellWoodBtn.update();
			sellMeatBtn.update();
			sellWoodBtn.costLabel.text = `${Math.min(wood, 10)}🪵→💰`;
			sellMeatBtn.costLabel.text = `${Math.min(meat, 10)}🥩→💰`;
			sellWoodBtn.container.alpha = wood >= 5 ? 1 : 0.5;
			sellMeatBtn.container.alpha = meat >= 5 ? 1 : 0.5;
			axeBtn.update();
			weaponBtn.update();
			campBtn.update();

			if (axeLevel >= MAX_LEVEL && weaponLevel >= MAX_LEVEL && campLevel >= MAX_LEVEL) {
				state = 'maxed';
			}
		}

		// --- Initial spawn ---
		for (let i = 0; i < 3; i++) spawnTree();
		for (let i = 0; i < 2; i++) spawnAnimal();

		// --- Game Loop ---
		let autoTimer = 0;

		app.ticker.add(() => {
			const dt = Math.min(app.ticker.deltaMS, 33);

			// Snow
			for (const s of snowflakes) {
				s.y += s.speed;
				s.x += s.drift;
				if (s.y > GROUND_Y) { s.y = -5; s.x = Math.random() * W; }
				if (s.x < 0) s.x = W;
				if (s.x > W) s.x = 0;
				s.gfx.x = s.x;
				s.gfx.y = s.y;
			}

			// Spawn trees
			treeSpawnTimer += dt;
			if (treeSpawnTimer > 3000 && trees.length < 4) {
				treeSpawnTimer = 0;
				spawnTree();
			}

			// Spawn animals
			animalSpawnTimer += dt;
			if (animalSpawnTimer > 4000 && animals.length < 3) {
				animalSpawnTimer = 0;
				spawnAnimal();
			}

			// Move animals
			for (const a of animals) {
				a.moveTimer -= dt;
				if (a.moveTimer <= 0) {
					a.vx = (Math.random() - 0.5) * 1;
					a.moveTimer = 1000 + Math.random() * 2000;
				}
				a.x += a.vx;
				a.x = Math.max(ANIMAL_AREA_X, Math.min(ANIMAL_AREA_X + ANIMAL_AREA_W, a.x));
				if (!a.gfx.destroyed) a.gfx.x = a.x;
			}

			// Auto-generation from camp
			autoTimer += dt;
			if (autoTimer > 2000 && autoRate() > 0) {
				autoTimer = 0;
				wood += autoRate();
				meat += Math.floor(autoRate() * 0.7);
				updateHUD();
				updateShop();

				const autoPopup = centeredText(
					`+${autoRate()}🪵 +${Math.floor(autoRate() * 0.7)}🥩`,
					CAMP_X, CAMP_Y - 60,
					{ size: 12, color: COLORS.cyan, family: 'Arial' }
				);
				app.stage.addChild(autoPopup);
				let at = 0;
				const atick = () => {
					at += 0.02;
					autoPopup.y -= 0.8;
					autoPopup.alpha = 1 - at;
					if (at >= 1) { app.ticker.remove(atick); autoPopup.destroy(); }
				};
				app.ticker.add(atick);
			}
		});

		updateHUD();
		updateShop();

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

<GameShell title="末日生存" onrestart={restart}>
	<div class="game-container" bind:this={containerEl}></div>

	{#if state === 'maxed'}
		<div class="overlay">
			<div class="overlay-box win">
				<p>全部滿級！</p>
				<p class="sub">你在末日中生存下來了</p>
				<button onclick={restart}>重新開始</button>
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
