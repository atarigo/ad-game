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
	let state = $state<'playing' | 'win'>('playing');

	async function startGame() {
		if (cleanup) cleanup();
		containerEl.innerHTML = '';
		state = 'playing';
		const { app, cleanup: appCleanup } = await initApp(containerEl, 0x0c1a0c);

		const WW = 1000;
		const GY = 480;
		const SPD = 2.5;
		const CAP = 5;
		const ACD = 600;
		const PR = 40;
		const DR = 50;
		const DMG = 4;
		const MAX_LV = 10;

		const ZX = { forest: 130, woodStn: 320, bento: 500, meatStn: 680, hunt: 870 };
		const FSPAN = 120;
		const HSPAN = 120;

		// --- Layers ---
		const world = new Container();
		const staticLayer = new Container();
		const snowLayer = new Container();
		const clickArea = new Graphics();
		const objLayer = new Container();
		const itemLayer = new Container();
		const charLayer = new Container();
		const fxLayer = new Container();
		world.addChild(staticLayer, snowLayer, clickArea, objLayer, itemLayer, charLayer, fxLayer);
		app.stage.addChild(world);
		const hudLayer = new Container();
		app.stage.addChild(hudLayer);

		// --- Background ---
		const bg = new Graphics();
		bg.rect(0, 0, WW, GY).fill(0x0c1a0c);
		bg.rect(0, GY, WW, H - GY).fill(0x1a3a1a);
		bg.rect(0, GY, WW, 3).fill(0x2a5a2a);
		staticLayer.addChild(bg);

		const forestBg = new Graphics();
		forestBg.rect(ZX.forest - FSPAN, GY - 200, FSPAN * 2, 200).fill({ color: 0x0a2a0a, alpha: 0.3 });
		staticLayer.addChild(forestBg);
		const huntBg = new Graphics();
		huntBg.rect(ZX.hunt - HSPAN, GY - 200, HSPAN * 2, 200).fill({ color: 0x2a1a0a, alpha: 0.3 });
		staticLayer.addChild(huntBg);

		// --- Stations ---
		function makeStn(x: number, emoji: string, label: string, col: number) {
			const c = new Container();
			c.x = x;
			c.y = GY;
			const p = new Graphics();
			p.rect(-30, -6, 60, 6).fill(0x5a4a3a).rect(-30, -6, 60, 6).stroke({ color: 0x7a6a5a, width: 1 });
			c.addChild(p);
			const post = new Graphics();
			post.rect(-2, -32, 4, 26).fill(0x6a5a4a);
			c.addChild(post);
			const sign = new Graphics();
			sign.roundRect(-16, -42, 32, 13, 3).fill(col);
			c.addChild(sign);
			c.addChild(centeredText(emoji, 0, -36, { size: 10, family: 'Arial' }));
			staticLayer.addChild(c);
			staticLayer.addChild(centeredText(label, x, GY + 18, { size: 9, color: COLORS.muted, family: 'Arial' }));
		}
		makeStn(ZX.woodStn, '🪵', '木材站', 0x6a4a2a);
		makeStn(ZX.meatStn, '🥩', '肉品站', 0x8a3a2a);

		// Bento shop
		const shopC = new Container();
		shopC.x = ZX.bento;
		shopC.y = GY;
		const shopB = new Graphics();
		shopB.rect(-22, -45, 44, 45).fill(0x4a3a2a).rect(-22, -45, 44, 45).stroke({ color: 0x6a5a4a, width: 1 });
		shopC.addChild(shopB);
		const shopR = new Graphics();
		shopR.moveTo(-27, -45).lineTo(0, -58).lineTo(27, -45).closePath().fill(0x8a2a1a);
		shopC.addChild(shopR);
		shopC.addChild(centeredText('🍱', 0, -28, { size: 14, family: 'Arial' }));
		staticLayer.addChild(shopC);
		staticLayer.addChild(centeredText('便當店', ZX.bento, GY + 18, { size: 9, color: COLORS.muted, family: 'Arial' }));
		staticLayer.addChild(centeredText('🌲 森林', ZX.forest, GY + 18, { size: 9, color: COLORS.muted, family: 'Arial' }));
		staticLayer.addChild(centeredText('🎯 獵場', ZX.hunt, GY + 18, { size: 9, color: COLORS.muted, family: 'Arial' }));

		const woodStockT = centeredText('', ZX.woodStn, GY - 52, { size: 10, color: COLORS.yellow, family: 'Arial' });
		const meatStockT = centeredText('', ZX.meatStn, GY - 52, { size: 10, color: COLORS.yellow, family: 'Arial' });
		const woodLvT = centeredText('Lv1', ZX.woodStn, GY - 63, { size: 9, color: COLORS.cyan, family: 'Arial' });
		const meatLvT = centeredText('Lv1', ZX.meatStn, GY - 63, { size: 9, color: COLORS.cyan, family: 'Arial' });
		staticLayer.addChild(woodStockT, meatStockT, woodLvT, meatLvT);

		// --- Snow ---
		interface Flake { g: Graphics; x: number; y: number; s: number; d: number }
		const flakes: Flake[] = [];
		for (let i = 0; i < 40; i++) {
			const g = new Graphics();
			g.circle(0, 0, 1 + Math.random() * 1.5).fill({ color: 0xffffff, alpha: 0.2 + Math.random() * 0.25 });
			const f: Flake = { g, x: Math.random() * WW, y: Math.random() * GY, s: 0.3 + Math.random() * 0.5, d: (Math.random() - 0.5) * 0.3 };
			g.x = f.x;
			g.y = f.y;
			snowLayer.addChild(g);
			flakes.push(f);
		}

		// --- Click area ---
		clickArea.rect(0, 0, WW, H).fill({ color: 0x000000, alpha: 0.001 });
		clickArea.eventMode = 'static';
		clickArea.cursor = 'pointer';

		// --- Game State ---
		type IType = 'wood' | 'meat' | 'bento';
		interface Drop {
			type: IType | 'coin';
			x: number;
			y: number;
			gfx: Graphics;
			vy: number;
			landed: boolean;
			flying: boolean;
		}
		interface Tree {
			c: Container;
			x: number;
			hp: number;
			max: number;
			bar: Graphics;
		}
		interface Beast {
			c: Container;
			x: number;
			hp: number;
			max: number;
			bar: Graphics;
			vx: number;
			mt: number;
		}

		const drops: Drop[] = [];
		const trees: Tree[] = [];
		const beasts: Beast[] = [];

		let coins = 0;
		let wStock = 0, wLv = 1, wWorker = false, wProdT = 0;
		let mStock = 0, mLv = 1, mWorker = false, mProdT = 0;
		let hasCutter = false, hasHunter = false;
		let cutterT = 0, hunterT = 0;

		function ucost(lv: number) {
			return Math.floor(10 * Math.pow(1.8, lv - 1));
		}
		function prodMs(lv: number, worker: boolean) {
			return (worker ? 3000 : 6000) / (1 + (lv - 1) * 0.3);
		}

		// --- Player ---
		const P = {
			x: ZX.bento,
			tx: ZX.bento,
			carry: [] as IType[],
			face: 1,
			atkT: 0,
			walkT: 0,
			tgt: null as Tree | Beast | null
		};

		const pC = new Container();
		const pBody = new Container();
		pC.addChild(pBody);

		const pLL = new Graphics();
		pLL.rect(-5, 12, 4, 12).fill(0x4a4a6a);
		const pRL = new Graphics();
		pRL.rect(1, 12, 4, 12).fill(0x4a4a6a);
		const pTorso = new Graphics();
		pTorso.rect(-6, -4, 12, 18).fill(0x3a6aaa);
		const pHead = new Graphics();
		pHead.circle(0, -12, 8).fill(0xdda070);
		const pEye = new Graphics();
		pEye.circle(3, -13, 1.5).fill(0x222222);
		pBody.addChild(pLL, pRL, pTorso, pHead, pEye);

		const pCarryT = centeredText('', 0, -28, { size: 8, color: COLORS.yellow, family: 'Arial' });
		pC.addChild(pCarryT);
		pC.x = P.x;
		pC.y = GY;
		charLayer.addChild(pC);

		function carryText(): string {
			const c: Record<string, number> = {};
			for (const i of P.carry) c[i] = (c[i] || 0) + 1;
			const p: string[] = [];
			if (c.wood) p.push(`🪵${c.wood}`);
			if (c.meat) p.push(`🥩${c.meat}`);
			if (c.bento) p.push(`🍱${c.bento}`);
			return p.join(' ');
		}

		// --- Helpers ---
		function popup(s: string, x: number, y: number, col: number) {
			const t = centeredText(s, x, y, { size: 12, color: col, family: 'Arial' });
			fxLayer.addChild(t);
			let p = 0;
			const tk = () => {
				p += 0.03;
				t.y -= 1;
				t.alpha = 1 - p;
				if (p >= 1) {
					app.ticker.remove(tk);
					t.destroy();
				}
			};
			app.ticker.add(tk);
		}

		function mkGfx(type: IType | 'coin'): Graphics {
			const g = new Graphics();
			if (type === 'wood') g.roundRect(-5, -3, 10, 6, 1).fill(0x8a6a3a).rect(-3, -1, 6, 2).fill(0x6a4a2a);
			else if (type === 'meat') g.circle(0, 0, 5).fill(0xcc4444).circle(-1, -1, 2).fill(0xee6666);
			else if (type === 'coin') g.circle(0, 0, 5).fill(COLORS.gold).circle(0, 0, 3).fill(0xeebb00);
			else g.rect(-5, -4, 10, 8).fill(0xeeeeee).rect(-3, -1, 6, 3).fill(0xcc4444);
			return g;
		}

		function spawnDrop(type: IType | 'coin', x: number, y: number) {
			const gfx = mkGfx(type);
			gfx.x = x + (Math.random() - 0.5) * 25;
			gfx.y = y;
			itemLayer.addChild(gfx);
			drops.push({
				type,
				x: gfx.x,
				y: gfx.y,
				gfx,
				vy: -2.5 - Math.random() * 1.5,
				landed: false,
				flying: false
			});
		}

		function flyTo(d: Drop, tx: number, ty: number, cb: () => void) {
			d.flying = true;
			const fx = d.x,
				fy = d.y;
			let t = 0;
			const tk = () => {
				t += app.ticker.deltaMS;
				const p = Math.min(t / 300, 1);
				d.gfx.x = d.x = fx + (tx - fx) * p;
				d.gfx.y = d.y = fy + (ty - fy) * p - Math.sin(p * Math.PI) * 50;
				if (p >= 1) {
					app.ticker.remove(tk);
					cb();
				}
			};
			app.ticker.add(tk);
		}

		function rmDrop(d: Drop) {
			const i = drops.indexOf(d);
			if (i >= 0) drops.splice(i, 1);
			if (!d.gfx.destroyed) d.gfx.destroy();
		}

		// --- Trees ---
		function spawnTree() {
			const x = ZX.forest - FSPAN + 20 + Math.random() * (FSPAN * 2 - 40);
			const max = 6 + Math.floor(Math.random() * 4);
			const c = new Container();
			c.x = x;
			c.y = GY;
			const trunk = new Graphics();
			trunk.rect(-5, -28, 10, 28).fill(0x6a4a2a);
			c.addChild(trunk);
			const lv = new Graphics();
			lv.moveTo(0, -55).lineTo(18, -25).lineTo(-18, -25).closePath().fill(0x2a6a2a);
			lv.moveTo(0, -45).lineTo(14, -18).lineTo(-14, -18).closePath().fill(0x3a7a3a);
			c.addChild(lv);
			const bar = new Graphics();
			c.addChild(bar);
			objLayer.addChild(c);
			const tree: Tree = { c, x, hp: max, max, bar };
			trees.push(tree);
			hpBar(bar, max, max, 0, -60, COLORS.green);
		}

		function hpBar(g: Graphics, hp: number, max: number, ox: number, oy: number, col: number) {
			g.clear();
			const bw = 26;
			g.rect(ox - bw / 2, oy, bw, 4).fill({ color: 0x333333, alpha: 0.5 });
			g.rect(ox - bw / 2, oy, bw * Math.max(0, hp / max), 4).fill(col);
		}

		function hitTree(t: Tree) {
			t.hp -= DMG;
			t.c.x = t.x + (Math.random() - 0.5) * 6;
			setTimeout(() => {
				if (!t.c.destroyed) t.c.x = t.x;
			}, 80);
			popup(`-${DMG}`, t.x, GY - 65, COLORS.yellow);
			if (t.hp <= 0) {
				t.c.destroy();
				trees.splice(trees.indexOf(t), 1);
				const n = 2 + Math.floor(Math.random() * 2);
				for (let i = 0; i < n; i++) spawnDrop('wood', t.x, GY - 15);
			} else {
				hpBar(t.bar, t.hp, t.max, 0, -60, COLORS.green);
			}
		}

		// --- Animals ---
		function spawnBeast() {
			const x = ZX.hunt - HSPAN + 20 + Math.random() * (HSPAN * 2 - 40);
			const max = 8 + Math.floor(Math.random() * 4);
			const c = new Container();
			c.x = x;
			c.y = GY;
			const body = new Graphics();
			body.ellipse(0, -10, 16, 9).fill(0x8a6a4a);
			c.addChild(body);
			const head = new Graphics();
			head.circle(14, -14, 7).fill(0x7a5a3a);
			c.addChild(head);
			const eye = new Graphics();
			eye.circle(18, -15, 1.5).fill(0xffffff);
			c.addChild(eye);
			const legs = new Graphics();
			for (const lx of [-10, -3, 4, 11]) legs.rect(lx, -3, 3, 10).fill(0x6a4a2a);
			c.addChild(legs);
			const bar = new Graphics();
			c.addChild(bar);
			objLayer.addChild(c);
			const b: Beast = {
				c,
				x,
				hp: max,
				max,
				bar,
				vx: (Math.random() - 0.5) * 0.5,
				mt: 1500 + Math.random() * 2000
			};
			beasts.push(b);
			hpBar(bar, max, max, 0, -28, COLORS.red);
		}

		function hitBeast(b: Beast) {
			b.hp -= DMG;
			b.c.x = b.x + (Math.random() - 0.5) * 8;
			setTimeout(() => {
				if (!b.c.destroyed) b.c.x = b.x;
			}, 80);
			popup(`-${DMG}`, b.x, GY - 32, COLORS.red);
			if (b.hp <= 0) {
				b.c.destroy();
				beasts.splice(beasts.indexOf(b), 1);
				const n = 2 + Math.floor(Math.random() * 2);
				for (let i = 0; i < n; i++) spawnDrop('meat', b.x, GY - 8);
			} else {
				hpBar(b.bar, b.hp, b.max, 0, -28, COLORS.red);
			}
		}

		// --- Workers ---
		function addWorker(x: number, col: number) {
			const c = new Container();
			c.x = x;
			c.y = GY;
			const b = new Graphics();
			b.rect(-4, -2, 8, 14).fill(col);
			c.addChild(b);
			const h = new Graphics();
			h.circle(0, -8, 5).fill(0xdda070);
			c.addChild(h);
			charLayer.addChild(c);
		}

		// --- UI Buttons ---
		type BtnDef = { update: () => void };
		const btns: BtnDef[] = [];

		function mkBtn(
			getText: () => string,
			isVis: () => boolean,
			isOn: () => boolean,
			onClick: () => void,
			y: number
		): BtnDef {
			const c = new Container();
			c.x = W / 2;
			c.y = y;
			const bg = new Graphics();
			bg.roundRect(-70, -15, 140, 30, 6)
				.fill({ color: 0x1a1a2e, alpha: 0.9 })
				.roundRect(-70, -15, 140, 30, 6)
				.stroke({ color: COLORS.cyan, width: 1, alpha: 0.5 });
			c.addChild(bg);
			const lbl = centeredText(getText(), 0, 0, {
				size: 11,
				color: COLORS.white,
				family: 'Arial'
			});
			c.addChild(lbl);
			c.eventMode = 'static';
			c.cursor = 'pointer';
			c.visible = false;
			c.on('pointerdown', () => {
				if (isOn()) {
					onClick();
					refreshUI();
				}
			});
			hudLayer.addChild(c);
			const def: BtnDef = {
				update() {
					const v = isVis();
					c.visible = v;
					if (v) {
						lbl.text = getText();
						c.alpha = isOn() ? 1 : 0.35;
					}
				}
			};
			btns.push(def);
			return def;
		}

		function nearW() { return Math.abs(P.x - ZX.woodStn) < DR; }
		function nearM() { return Math.abs(P.x - ZX.meatStn) < DR; }
		function nearB() { return Math.abs(P.x - ZX.bento) < DR; }
		function inFor() { return P.x < ZX.forest + FSPAN + 10; }
		function inHunt() { return P.x > ZX.hunt - HSPAN - 10; }
		function pHasBento() { return P.carry.includes('bento'); }

		function useBento() {
			const i = P.carry.indexOf('bento');
			if (i >= 0) P.carry.splice(i, 1);
		}

		mkBtn(
			function () { return '買便當 💰3'; },
			function () { return nearB(); },
			function () { return coins >= 3 && P.carry.length < CAP; },
			function () {
				coins -= 3;
				P.carry.push('bento');
				popup('+🍱', P.x, GY - 40, COLORS.white);
			},
			H - 55
		);

		mkBtn(
			function () { return wLv >= MAX_LV ? '木材站 MAX' : '⬆木材站Lv' + (wLv + 1) + ' 💰' + ucost(wLv); },
			function () { return nearW() && wLv < MAX_LV; },
			function () { return coins >= ucost(wLv); },
			function () {
				coins -= ucost(wLv);
				wLv++;
				popup('⬆Lv' + wLv, ZX.woodStn, GY - 75, COLORS.cyan);
				checkWin();
			},
			H - 95
		);

		mkBtn(
			function () { return mLv >= MAX_LV ? '肉品站 MAX' : '⬆肉品站Lv' + (mLv + 1) + ' 💰' + ucost(mLv); },
			function () { return nearM() && mLv < MAX_LV; },
			function () { return coins >= ucost(mLv); },
			function () {
				coins -= ucost(mLv);
				mLv++;
				popup('⬆Lv' + mLv, ZX.meatStn, GY - 75, COLORS.cyan);
				checkWin();
			},
			H - 95
		);

		mkBtn(
			function () { return '雇用站工人 🍱1'; },
			function () { return nearW() && !wWorker; },
			function () { return pHasBento(); },
			function () {
				useBento();
				wWorker = true;
				addWorker(ZX.woodStn + 22, 0x6a8a4a);
				popup('+👷', ZX.woodStn, GY - 50, COLORS.green);
			},
			H - 55
		);

		mkBtn(
			function () { return '雇用站工人 🍱1'; },
			function () { return nearM() && !mWorker; },
			function () { return pHasBento(); },
			function () {
				useBento();
				mWorker = true;
				addWorker(ZX.meatStn + 22, 0x8a4a6a);
				popup('+👷', ZX.meatStn, GY - 50, COLORS.green);
			},
			H - 55
		);

		mkBtn(
			function () { return '雇用砍柴工 🍱1'; },
			function () { return inFor() && !hasCutter; },
			function () { return pHasBento(); },
			function () {
				useBento();
				hasCutter = true;
				addWorker(ZX.forest + 30, 0x4a8a4a);
				popup('+🪓', ZX.forest, GY - 50, COLORS.green);
			},
			H - 55
		);

		mkBtn(
			function () { return '雇用獵人 🍱1'; },
			function () { return inHunt() && !hasHunter; },
			function () { return pHasBento(); },
			function () {
				useBento();
				hasHunter = true;
				addWorker(ZX.hunt - 30, 0x8a6a4a);
				popup('+🏹', ZX.hunt, GY - 50, COLORS.green);
			},
			H - 55
		);

		// --- HUD ---
		const hudBg = new Graphics();
		hudBg.rect(0, 0, W, 35).fill({ color: 0x000000, alpha: 0.6 });
		hudBg.eventMode = 'static';
		hudLayer.addChild(hudBg);
		const coinHud = centeredText('💰 0', W / 2, 18, {
			size: 14,
			color: COLORS.gold,
			family: 'Arial'
		});
		hudLayer.addChild(coinHud);

		function refreshUI() {
			coinHud.text = `💰 ${coins}`;
			woodStockT.text = wStock > 0 ? `🪵${wStock}` : '';
			meatStockT.text = mStock > 0 ? `🥩${mStock}` : '';
			woodLvT.text = `Lv${wLv}`;
			meatLvT.text = `Lv${mLv}`;
			pCarryT.text = carryText();
			for (const b of btns) b.update();
		}

		// --- Click ---
		clickArea.on('pointerdown', (e: any) => {
			if (state !== 'playing') return;
			const pos = e.getLocalPosition(world);
			const wx = Math.max(10, Math.min(WW - 10, pos.x));

			const nt = trees.find((t) => Math.abs(t.x - wx) < 25);
			if (nt) {
				P.tx = nt.x;
				P.tgt = nt;
				return;
			}
			const nb = beasts.find((b) => Math.abs(b.x - wx) < 25);
			if (nb) {
				P.tx = nb.x;
				P.tgt = nb;
				return;
			}
			P.tx = wx;
			P.tgt = null;
		});

		// --- Initial spawns ---
		for (let i = 0; i < 3; i++) spawnTree();
		for (let i = 0; i < 2; i++) spawnBeast();

		let treeSpT = 0,
			beastSpT = 0,
			depositCD = 0,
			pickupCD = 0;

		function checkWin() {
			if (wLv >= MAX_LV && mLv >= MAX_LV) state = 'win';
		}

		// --- Main Loop ---
		app.ticker.add(() => {
			if (state !== 'playing') return;
			const dt = Math.min(app.ticker.deltaMS, 33);

			// Snow
			for (const f of flakes) {
				f.y += f.s;
				f.x += f.d;
				if (f.y > GY) {
					f.y = -3;
					f.x = Math.random() * WW;
				}
				if (f.x < 0) f.x = WW;
				if (f.x > WW) f.x = 0;
				f.g.x = f.x;
				f.g.y = f.y;
			}

			// Chase target
			if (P.tgt) {
				if (P.tgt.c.destroyed) {
					P.tgt = null;
				} else {
					P.tx = P.tgt.x;
				}
			}

			// Movement
			const dx = P.tx - P.x;
			const inRange = P.tgt && Math.abs(P.x - P.tgt.x) < 30;
			if (Math.abs(dx) > 3 && !inRange) {
				P.x += Math.sign(dx) * SPD;
				P.face = dx > 0 ? 1 : -1;
				P.walkT++;
			} else {
				P.walkT = 0;
			}

			// Attack
			P.atkT -= dt;
			if (inRange && P.tgt && P.atkT <= 0) {
				P.atkT = ACD;
				if ('vx' in P.tgt) hitBeast(P.tgt as Beast);
				else hitTree(P.tgt as Tree);
			}

			// Player visual
			pC.x = P.x;
			pBody.scale.x = P.face;
			const sw = Math.sin(P.walkT * 0.3) * 4;
			pLL.y = sw;
			pRL.y = -sw;

			// Camera
			world.x = -Math.max(0, Math.min(WW - W, P.x - W / 2));

			// Drops physics
			for (const d of drops) {
				if (d.flying || d.landed) continue;
				d.vy += 0.15;
				d.y += d.vy;
				if (d.y >= GY - 5) {
					d.y = GY - 5;
					d.vy = -d.vy * 0.3;
					if (Math.abs(d.vy) < 0.5) {
						d.landed = true;
						d.vy = 0;
					}
				}
				d.gfx.x = d.x;
				d.gfx.y = d.y;
			}

			// Pickup
			pickupCD -= dt;
			if (pickupCD <= 0) {
				for (const d of [...drops]) {
					if (d.flying || !d.landed) continue;
					if (Math.abs(d.x - P.x) > PR) continue;
					if (d.type === 'coin') {
						pickupCD = 80;
						flyTo(d, P.x, GY - 25, () => {
							coins++;
							rmDrop(d);
							refreshUI();
						});
						break;
					} else {
						if (P.carry.length >= CAP) continue;
						pickupCD = 100;
						const tp = d.type as IType;
						flyTo(d, P.x, GY - 25, () => {
							P.carry.push(tp);
							rmDrop(d);
							refreshUI();
						});
						break;
					}
				}
			}

			// Auto-deposit
			depositCD -= dt;
			if (depositCD <= 0) {
				if (Math.abs(P.x - ZX.woodStn) < DR) {
					const wi = P.carry.indexOf('wood');
					if (wi >= 0) {
						depositCD = 150;
						P.carry.splice(wi, 1);
						const g = mkGfx('wood');
						g.x = P.x;
						g.y = GY - 15;
						itemLayer.addChild(g);
						const tmp: Drop = {
							type: 'wood',
							x: P.x,
							y: GY - 15,
							gfx: g,
							vy: 0,
							landed: true,
							flying: false
						};
						flyTo(tmp, ZX.woodStn, GY - 20, () => {
							wStock++;
							g.destroy();
							refreshUI();
						});
					}
				}
				if (Math.abs(P.x - ZX.meatStn) < DR) {
					const mi = P.carry.indexOf('meat');
					if (mi >= 0) {
						depositCD = 150;
						P.carry.splice(mi, 1);
						const g = mkGfx('meat');
						g.x = P.x;
						g.y = GY - 15;
						itemLayer.addChild(g);
						const tmp: Drop = {
							type: 'meat',
							x: P.x,
							y: GY - 15,
							gfx: g,
							vy: 0,
							landed: true,
							flying: false
						};
						flyTo(tmp, ZX.meatStn, GY - 20, () => {
							mStock++;
							g.destroy();
							refreshUI();
						});
					}
				}
			}

			// Station production
			if (wStock > 0) {
				wProdT += dt;
				if (wProdT >= prodMs(wLv, wWorker)) {
					wProdT = 0;
					wStock--;
					spawnDrop('coin', ZX.woodStn, GY - 30);
					refreshUI();
				}
			} else {
				wProdT = 0;
			}
			if (mStock > 0) {
				mProdT += dt;
				if (mProdT >= prodMs(mLv, mWorker)) {
					mProdT = 0;
					mStock--;
					spawnDrop('coin', ZX.meatStn, GY - 30);
					refreshUI();
				}
			} else {
				mProdT = 0;
			}

			// Animals wander
			for (const a of beasts) {
				a.mt -= dt;
				if (a.mt <= 0) {
					a.vx = (Math.random() - 0.5) * 0.6;
					a.mt = 1500 + Math.random() * 2000;
				}
				a.x += a.vx;
				a.x = Math.max(ZX.hunt - HSPAN + 10, Math.min(ZX.hunt + HSPAN - 10, a.x));
				if (!a.c.destroyed) a.c.x = a.x;
			}

			// Spawn
			treeSpT += dt;
			if (treeSpT > 4000 && trees.length < 4) {
				treeSpT = 0;
				spawnTree();
			}
			beastSpT += dt;
			if (beastSpT > 5000 && beasts.length < 3) {
				beastSpT = 0;
				spawnBeast();
			}

			// Auto workers
			if (hasCutter) {
				cutterT += dt;
				if (cutterT > 2000 && trees.length > 0) {
					cutterT = 0;
					hitTree(trees[Math.floor(Math.random() * trees.length)]);
				}
			}
			if (hasHunter) {
				hunterT += dt;
				if (hunterT > 2500 && beasts.length > 0) {
					hunterT = 0;
					hitBeast(beasts[Math.floor(Math.random() * beasts.length)]);
				}
			}

			refreshUI();
		});

		refreshUI();
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

	{#if state === 'win'}
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

	.win p {
		color: #00f0ff;
		text-shadow: 0 0 20px rgba(0, 240, 255, 0.5);
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
