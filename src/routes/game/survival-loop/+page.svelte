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
	let state = $state<'playing' | 'result'>('playing');
	let resultData = $state({ trees: 0, animals: 0, coins: 0, score: 0 });

	async function startGame() {
		if (cleanup) cleanup();
		containerEl.innerHTML = '';
		state = 'playing';
		const { app, cleanup: appCleanup } = await initApp(containerEl, 0x1a2a1a);

		const WW = 420;
		const WH = 700;
		const SPD = 4.5;
		const CAP = 20;
		const ACD = 350;
		const PR = 45;
		const DR = 55;
		const DMG = 6;
		const MAX_LV = 10;

		// 2D zone positions (compact, shifted down for HUD clearance)
		const FOREST = { x: 100, y: 200, r: 80 };
		const HUNT = { x: 320, y: 200, r: 80 };
		const WSTN = { x: 85, y: 380 };
		const MSTN = { x: 335, y: 380 };
		const BENTO = { x: 210, y: 510 };

		function dist(ax: number, ay: number, bx: number, by: number) {
			return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
		}

		// --- Layers ---
		const world = new Container();
		const groundLayer = new Container();
		const zoneLayer = new Container();
		const snowLayer = new Container();
		const clickArea = new Graphics();
		const objLayer = new Container();
		objLayer.sortableChildren = true;
		const itemLayer = new Container();
		const charLayer = new Container();
		charLayer.sortableChildren = true;
		const fxLayer = new Container();
		world.addChild(groundLayer, zoneLayer, snowLayer, clickArea, objLayer, itemLayer, charLayer, fxLayer);
		app.stage.addChild(world);
		const hudLayer = new Container();
		app.stage.addChild(hudLayer);

		// --- Ground ---
		const ground = new Graphics();
		ground.rect(0, 0, WW, WH).fill(0x1a3a1a);
		groundLayer.addChild(ground);
		for (let i = 0; i < 25; i++) {
			const patch = new Graphics();
			const px = Math.random() * WW;
			const py = Math.random() * WH;
			const pr = 15 + Math.random() * 25;
			patch.circle(px, py, pr).fill({ color: 0x153015, alpha: 0.4 });
			groundLayer.addChild(patch);
		}

		// Zone ground indicators
		function zoneCircle(x: number, y: number, r: number, color: number) {
			const g = new Graphics();
			g.circle(x, y, r).fill({ color, alpha: 0.2 });
			g.circle(x, y, r).stroke({ color, width: 1, alpha: 0.15 });
			zoneLayer.addChild(g);
		}
		zoneCircle(FOREST.x, FOREST.y, FOREST.r, 0x2a5a2a);
		zoneCircle(HUNT.x, HUNT.y, HUNT.r, 0x5a3a1a);

		function zoneMark(x: number, y: number, color: number) {
			const g = new Graphics();
			g.circle(x, y, 36).fill({ color, alpha: 0.15 });
			g.circle(x, y, 36).stroke({ color, width: 1, alpha: 0.2 });
			zoneLayer.addChild(g);
		}
		zoneMark(WSTN.x, WSTN.y, 0x6a4a2a);
		zoneMark(MSTN.x, MSTN.y, 0x8a3a2a);
		zoneMark(BENTO.x, BENTO.y, 0x8a7a3a);

		// --- Station visuals ---
		function makeStn(x: number, y: number, emoji: string, label: string, col: number) {
			const c = new Container();
			c.x = x;
			c.y = y;
			const base = new Graphics();
			base.roundRect(-26, -16, 52, 32, 5).fill(col);
			base.roundRect(-26, -16, 52, 32, 5).stroke({ color: 0x7a6a5a, width: 1 });
			c.addChild(base);
			c.addChild(centeredText(emoji, 0, 0, { size: 20, family: 'Arial' }));
			zoneLayer.addChild(c);
			zoneLayer.addChild(centeredText(label, x, y + 28, { size: 10, color: COLORS.muted, family: 'Arial' }));
		}
		makeStn(WSTN.x, WSTN.y, '🪵', '木材站', 0x4a3a2a);
		makeStn(MSTN.x, MSTN.y, '🥩', '肉品站', 0x4a2a2a);

		// Bento shop
		const shopC = new Container();
		shopC.x = BENTO.x;
		shopC.y = BENTO.y;
		const shopBase = new Graphics();
		shopBase.roundRect(-28, -20, 56, 40, 5).fill(0x4a3a2a);
		shopBase.roundRect(-28, -20, 56, 40, 5).stroke({ color: 0x6a5a4a, width: 1 });
		shopC.addChild(shopBase);
		const shopRoof = new Graphics();
		shopRoof.roundRect(-32, -28, 64, 12, 3).fill(0x8a2a1a);
		shopC.addChild(shopRoof);
		shopC.addChild(centeredText('🍱', 0, 2, { size: 20, family: 'Arial' }));
		zoneLayer.addChild(shopC);
		zoneLayer.addChild(centeredText('便當店', BENTO.x, BENTO.y + 30, { size: 10, color: COLORS.muted, family: 'Arial' }));

		// Zone labels
		zoneLayer.addChild(centeredText('🌲森林', FOREST.x, FOREST.y - FOREST.r - 12, { size: 11, color: COLORS.muted, family: 'Arial' }));
		zoneLayer.addChild(centeredText('🎯獵場', HUNT.x, HUNT.y - HUNT.r - 12, { size: 11, color: COLORS.muted, family: 'Arial' }));

		// Stock & level displays
		const wStockT = centeredText('', WSTN.x, WSTN.y - 28, { size: 11, color: COLORS.yellow, family: 'Arial' });
		const mStockT = centeredText('', MSTN.x, MSTN.y - 28, { size: 11, color: COLORS.yellow, family: 'Arial' });
		const wLvT = centeredText('Lv1', WSTN.x, WSTN.y - 40, { size: 10, color: COLORS.cyan, family: 'Arial' });
		const mLvT = centeredText('Lv1', MSTN.x, MSTN.y - 40, { size: 10, color: COLORS.cyan, family: 'Arial' });
		zoneLayer.addChild(wStockT, mStockT, wLvT, mLvT);

		// --- Snow ---
		interface Flake { g: Graphics; x: number; y: number; s: number; d: number }
		const flakes: Flake[] = [];
		for (let i = 0; i < 35; i++) {
			const g = new Graphics();
			g.circle(0, 0, 1 + Math.random() * 1.5).fill({ color: 0xffffff, alpha: 0.15 + Math.random() * 0.2 });
			const f: Flake = { g, x: Math.random() * WW, y: Math.random() * WH, s: 0.3 + Math.random() * 0.5, d: (Math.random() - 0.5) * 0.3 };
			g.x = f.x;
			g.y = f.y;
			snowLayer.addChild(g);
			flakes.push(f);
		}

		// --- Click area ---
		clickArea.rect(0, 0, WW, WH).fill({ color: 0x000000, alpha: 0.001 });
		clickArea.eventMode = 'static';
		clickArea.cursor = 'pointer';

		// --- Game State ---
		type IType = 'wood' | 'meat' | 'bento';
		interface Drop { type: IType | 'coin'; x: number; y: number; gfx: Graphics; vy: number; bounceY: number; landed: boolean; flying: boolean }
		interface Tree { c: Container; x: number; y: number; hp: number; max: number; bar: Graphics }
		interface Beast { c: Container; x: number; y: number; hp: number; max: number; bar: Graphics; vx: number; vy2: number; mt: number }

		const drops: Drop[] = [];
		const trees: Tree[] = [];
		const beasts: Beast[] = [];

		let coins = 0;
		let wStock = 0, wLv = 1, wWorker = false, wProdT = 0;
		let mStock = 0, mLv = 1, mWorker = false, mProdT = 0;
		let hasCutter = false, hasHunter2 = false;
		let cutterT = 0, hunterT2 = 0;

		// Score & timer
		const GAME_TIME = 180000;
		let timer = GAME_TIME;
		let score = 0;
		let statTrees = 0, statBeasts = 0, statCoins = 0;

		// Movable field workers
		interface FieldWorker { c: Container; x: number; y: number; tgt: Tree | Beast | null; atkT: number; face: number; walkT: number }
		let cutterW: FieldWorker | null = null;
		let hunterW: FieldWorker | null = null;

		function ucost(lv: number) { return Math.floor(8 * Math.pow(1.6, lv - 1)); }
		function prodMs(lv: number) { return 1500 / (1 + (lv - 1) * 0.35); }

		// --- Player ---
		const P = {
			x: BENTO.x, y: BENTO.y + 60,
			tx: BENTO.x, ty: BENTO.y + 60,
			carry: [] as IType[],
			face: 1, atkT: 0, walkT: 0,
			tgt: null as Tree | Beast | null
		};

		const pC = new Container();
		const pBody = new Container();
		pC.addChild(pBody);

		// Shadow
		const pShadow = new Graphics();
		pShadow.ellipse(0, 3, 13, 5).fill({ color: 0x000000, alpha: 0.25 });
		pBody.addChild(pShadow);
		// Legs
		const pLL = new Graphics(); pLL.rect(-6, 8, 5, 13).fill(0x4a4a6a);
		const pRL = new Graphics(); pRL.rect(1, 8, 5, 13).fill(0x4a4a6a);
		pBody.addChild(pLL, pRL);
		// Torso
		const pTorso = new Graphics(); pTorso.rect(-7, -10, 14, 20).fill(0x3a6aaa);
		pBody.addChild(pTorso);
		// Head
		const pHead = new Graphics(); pHead.circle(0, -19, 9).fill(0xdda070);
		pBody.addChild(pHead);
		// Eye
		const pEye = new Graphics(); pEye.circle(3, -20, 2).fill(0x222222);
		pBody.addChild(pEye);

		const pCarryT = centeredText('', 0, -32, { size: 11, color: COLORS.yellow, family: 'Arial' });
		pC.addChild(pCarryT);
		pC.x = P.x;
		pC.y = P.y;
		charLayer.addChild(pC);

		function carryText(): string {
			const c: Record<string, number> = {};
			for (const i of P.carry) c[i] = (c[i] || 0) + 1;
			const p: string[] = [];
			if (c.wood) p.push('🪵' + c.wood);
			if (c.meat) p.push('🥩' + c.meat);
			if (c.bento) p.push('🍱' + c.bento);
			return p.join(' ');
		}

		// --- Helpers ---
		function popup(s: string, x: number, y: number, col: number) {
			const t = centeredText(s, x, y, { size: 15, color: col, family: 'Arial' });
			fxLayer.addChild(t);
			let p = 0;
			const tk = function () {
				p += 0.03;
				t.y -= 1;
				t.alpha = 1 - p;
				if (p >= 1) { app.ticker.remove(tk); t.destroy(); }
			};
			app.ticker.add(tk);
		}

		function mkGfx(type: IType | 'coin'): Graphics {
			const g = new Graphics();
			if (type === 'wood') g.roundRect(-7, -4, 14, 8, 2).fill(0x8a6a3a).rect(-4, -1, 8, 3).fill(0x6a4a2a);
			else if (type === 'meat') g.circle(0, 0, 7).fill(0xcc4444).circle(-2, -1, 3).fill(0xee6666);
			else if (type === 'coin') g.circle(0, 0, 7).fill(COLORS.gold).circle(0, 0, 4).fill(0xeebb00);
			else g.rect(-7, -5, 14, 10).fill(0xeeeeee).rect(-4, -2, 8, 4).fill(0xcc4444);
			return g;
		}

		function spawnDrop(type: IType | 'coin', x: number, y: number) {
			const gfx = mkGfx(type);
			const dx = (Math.random() - 0.5) * 30;
			const dy = (Math.random() - 0.5) * 20;
			gfx.x = x + dx;
			gfx.y = y + dy;
			itemLayer.addChild(gfx);
			drops.push({ type, x: gfx.x, y: gfx.y, gfx, vy: -3, bounceY: y + dy, landed: false, flying: false });
		}

		function flyTo(d: Drop, tx: number, ty: number, cb: () => void) {
			d.flying = true;
			const fx = d.x, fy = d.y;
			let t = 0;
			const tk = function () {
				t += app.ticker.deltaMS;
				const p = Math.min(t / 300, 1);
				d.gfx.x = d.x = fx + (tx - fx) * p;
				d.gfx.y = d.y = fy + (ty - fy) * p - Math.sin(p * Math.PI) * 40;
				if (p >= 1) { app.ticker.remove(tk); cb(); }
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
			const angle = Math.random() * Math.PI * 2;
			const radius = Math.random() * (FOREST.r - 15);
			const x = FOREST.x + Math.cos(angle) * radius;
			const y = FOREST.y + Math.sin(angle) * radius;
			const max = 6 + Math.floor(Math.random() * 4);
			const c = new Container();
			c.x = x;
			c.y = y;
			c.zIndex = y;
			// Shadow
			const sh = new Graphics(); sh.ellipse(0, 6, 18, 8).fill({ color: 0x000000, alpha: 0.2 }); c.addChild(sh);
			// Trunk
			const trunk = new Graphics(); trunk.rect(-5, -26, 10, 32).fill(0x6a4a2a); c.addChild(trunk);
			// Canopy
			const canopy = new Graphics();
			canopy.circle(0, -36, 22).fill(0x2a6a2a);
			canopy.circle(-8, -28, 14).fill(0x3a7a3a);
			canopy.circle(8, -28, 14).fill(0x2a5a2a);
			c.addChild(canopy);
			// HP bar
			const bar = new Graphics(); c.addChild(bar);
			objLayer.addChild(c);
			const tree: Tree = { c, x, y, hp: max, max, bar };
			trees.push(tree);
			hpBar(bar, max, max, 0, -62, COLORS.green);
		}

		function hpBar(g: Graphics, hp: number, max: number, ox: number, oy: number, col: number) {
			g.clear();
			const bw = 32;
			g.rect(ox - bw / 2, oy, bw, 4).fill({ color: 0x333333, alpha: 0.5 });
			g.rect(ox - bw / 2, oy, bw * Math.max(0, hp / max), 4).fill(col);
		}

		function hitTree(t: Tree) {
			t.hp -= DMG;
			t.c.x = t.x + (Math.random() - 0.5) * 5;
			setTimeout(function () { if (!t.c.destroyed) t.c.x = t.x; }, 80);
			popup('-' + DMG, t.x, t.y - 65, COLORS.yellow);
			if (t.hp <= 0) {
				t.c.destroy();
				trees.splice(trees.indexOf(t), 1);
				statTrees++; score += 10;
				const n = 2 + Math.floor(Math.random() * 2);
				for (let i = 0; i < n; i++) spawnDrop('wood', t.x, t.y);
			} else {
				hpBar(t.bar, t.hp, t.max, 0, -62, COLORS.green);
			}
		}

		// --- Animals ---
		function spawnBeast() {
			const angle = Math.random() * Math.PI * 2;
			const radius = Math.random() * (HUNT.r - 15);
			const x = HUNT.x + Math.cos(angle) * radius;
			const y = HUNT.y + Math.sin(angle) * radius;
			const max = 8 + Math.floor(Math.random() * 4);
			const c = new Container();
			c.x = x;
			c.y = y;
			c.zIndex = y;
			// Shadow
			const sh = new Graphics(); sh.ellipse(0, 4, 16, 7).fill({ color: 0x000000, alpha: 0.2 }); c.addChild(sh);
			// Body
			const body = new Graphics(); body.ellipse(0, -10, 18, 11).fill(0x8a6a4a); c.addChild(body);
			// Head
			const head = new Graphics(); head.circle(16, -15, 8).fill(0x7a5a3a); c.addChild(head);
			// Eye
			const eye = new Graphics(); eye.circle(20, -16, 2).fill(0xffffff); c.addChild(eye);
			// Legs
			const legs = new Graphics();
			for (const lx of [-10, -3, 5, 12]) legs.rect(lx, -2, 4, 10).fill(0x6a4a2a);
			c.addChild(legs);
			// HP bar
			const bar = new Graphics(); c.addChild(bar);
			objLayer.addChild(c);
			const b: Beast = { c, x, y, hp: max, max, bar, vx: (Math.random() - 0.5) * 0.5, vy2: (Math.random() - 0.5) * 0.5, mt: 1200 + Math.random() * 1500 };
			beasts.push(b);
			hpBar(bar, max, max, 0, -28, COLORS.red);
		}

		function hitBeast(b: Beast) {
			b.hp -= DMG;
			b.c.x = b.x + (Math.random() - 0.5) * 6;
			setTimeout(function () { if (!b.c.destroyed) b.c.x = b.x; }, 80);
			popup('-' + DMG, b.x, b.y - 32, COLORS.red);
			if (b.hp <= 0) {
				b.c.destroy();
				beasts.splice(beasts.indexOf(b), 1);
				statBeasts++; score += 10;
				const n = 2 + Math.floor(Math.random() * 2);
				for (let i = 0; i < n; i++) spawnDrop('meat', b.x, b.y);
			} else {
				hpBar(b.bar, b.hp, b.max, 0, -28, COLORS.red);
			}
		}

		// --- Workers ---
		function addWorker(x: number, y: number, col: number): Container {
			const c = new Container();
			c.x = x;
			c.y = y;
			c.zIndex = y;
			const sh = new Graphics(); sh.ellipse(0, 2, 7, 3).fill({ color: 0x000000, alpha: 0.2 }); c.addChild(sh);
			const b = new Graphics(); b.rect(-4, -4, 8, 12).fill(col); c.addChild(b);
			const h = new Graphics(); h.circle(0, -10, 5).fill(0xdda070); c.addChild(h);
			charLayer.addChild(c);
			return c;
		}

		function makeFieldWorker(x: number, y: number, col: number): FieldWorker {
			const c = addWorker(x, y, col);
			return { c, x, y, tgt: null, atkT: 0, face: 1, walkT: 0 };
		}

		// --- UI Buttons ---
		type BtnDef = { update: () => void };
		const btns: BtnDef[] = [];

		function mkBtn(
			getText: () => string,
			isVis: () => boolean,
			isOn: () => boolean,
			onClick: () => void,
			yPos: number
		): BtnDef {
			const c = new Container();
			c.x = W / 2;
			c.y = yPos;
			const bg = new Graphics();
			bg.roundRect(-70, -15, 140, 30, 6)
				.fill({ color: 0x1a1a2e, alpha: 0.9 })
				.roundRect(-70, -15, 140, 30, 6)
				.stroke({ color: COLORS.cyan, width: 1, alpha: 0.5 });
			c.addChild(bg);
			const lbl = centeredText(getText(), 0, 0, { size: 11, color: COLORS.white, family: 'Arial' });
			c.addChild(lbl);
			c.eventMode = 'static';
			c.cursor = 'pointer';
			c.visible = false;
			c.on('pointerdown', function () {
				if (isOn()) { onClick(); refreshUI(); }
			});
			hudLayer.addChild(c);
			const def: BtnDef = {
				update: function () {
					const v = isVis();
					c.visible = v;
					if (v) { lbl.text = getText(); c.alpha = isOn() ? 1 : 0.35; }
				}
			};
			btns.push(def);
			return def;
		}

		function pNearW() { return dist(P.x, P.y, WSTN.x, WSTN.y) < DR; }
		function pNearM() { return dist(P.x, P.y, MSTN.x, MSTN.y) < DR; }
		function pNearB() { return dist(P.x, P.y, BENTO.x, BENTO.y) < DR; }
		function pInFor() { return dist(P.x, P.y, FOREST.x, FOREST.y) < FOREST.r + 20; }
		function pInHunt() { return dist(P.x, P.y, HUNT.x, HUNT.y) < HUNT.r + 20; }
		function pHasBento() { return P.carry.includes('bento'); }
		function useBento() {
			const i = P.carry.indexOf('bento');
			if (i >= 0) P.carry.splice(i, 1);
		}

		mkBtn(
			function () { return '買便當 💰3'; },
			function () { return pNearB(); },
			function () { return coins >= 3 && P.carry.length < CAP; },
			function () { coins -= 3; P.carry.push('bento'); popup('+🍱', P.x, P.y - 30, COLORS.white); },
			H - 55
		);

		mkBtn(
			function () { return wLv >= MAX_LV ? '木材站 MAX' : '⬆木材站Lv' + (wLv + 1) + ' 💰' + ucost(wLv); },
			function () { return pNearW() && wLv < MAX_LV; },
			function () { return coins >= ucost(wLv); },
			function () { coins -= ucost(wLv); wLv++; popup('⬆Lv' + wLv, WSTN.x, WSTN.y - 40, COLORS.cyan); },
			H - 95
		);

		mkBtn(
			function () { return mLv >= MAX_LV ? '肉品站 MAX' : '⬆肉品站Lv' + (mLv + 1) + ' 💰' + ucost(mLv); },
			function () { return pNearM() && mLv < MAX_LV; },
			function () { return coins >= ucost(mLv); },
			function () { coins -= ucost(mLv); mLv++; popup('⬆Lv' + mLv, MSTN.x, MSTN.y - 40, COLORS.cyan); },
			H - 95
		);

		mkBtn(
			function () { return '雇用站工人 🍱1'; },
			function () { return pNearW() && !wWorker; },
			function () { return pHasBento(); },
			function () { useBento(); wWorker = true; addWorker(WSTN.x + 25, WSTN.y, 0x6a8a4a); popup('+👷', WSTN.x, WSTN.y - 30, COLORS.green); },
			H - 55
		);

		mkBtn(
			function () { return '雇用站工人 🍱1'; },
			function () { return pNearM() && !mWorker; },
			function () { return pHasBento(); },
			function () { useBento(); mWorker = true; addWorker(MSTN.x + 25, MSTN.y, 0x8a4a6a); popup('+👷', MSTN.x, MSTN.y - 30, COLORS.green); },
			H - 55
		);

		mkBtn(
			function () { return '雇用砍柴工 🍱1'; },
			function () { return pInFor() && !hasCutter; },
			function () { return pHasBento(); },
			function () { useBento(); hasCutter = true; cutterW = makeFieldWorker(FOREST.x, FOREST.y + 30, 0x4a8a4a); popup('+🪓', FOREST.x, FOREST.y - 20, COLORS.green); },
			H - 55
		);

		mkBtn(
			function () { return '雇用獵人 🍱1'; },
			function () { return pInHunt() && !hasHunter2; },
			function () { return pHasBento(); },
			function () { useBento(); hasHunter2 = true; hunterW = makeFieldWorker(HUNT.x, HUNT.y + 30, 0x8a6a4a); popup('+🏹', HUNT.x, HUNT.y - 20, COLORS.green); },
			H - 55
		);

		const allBtns = btns;

		// --- HUD ---
		const hudBg = new Graphics();
		hudBg.rect(0, 0, W, 35).fill({ color: 0x000000, alpha: 0.6 });
		hudBg.eventMode = 'static';
		hudLayer.addChild(hudBg);
		const timerHud = centeredText('3:00', 55, 18, { size: 14, color: COLORS.white, family: 'Arial' });
		hudLayer.addChild(timerHud);
		const coinHud = centeredText('💰 0', W / 2, 18, { size: 14, color: COLORS.gold, family: 'Arial' });
		hudLayer.addChild(coinHud);
		const scoreHud = centeredText('🏆 0', W - 55, 18, { size: 14, color: COLORS.cyan, family: 'Arial' });
		hudLayer.addChild(scoreHud);

		function refreshUI() {
			const sec = Math.max(0, Math.ceil(timer / 1000));
			const m = Math.floor(sec / 60);
			const s = sec % 60;
			timerHud.text = m + ':' + (s < 10 ? '0' : '') + s;
			if (sec <= 10) timerHud.style.fill = COLORS.red;
			coinHud.text = '💰 ' + coins;
			scoreHud.text = '🏆 ' + score;
			wStockT.text = wStock > 0 ? '🪵' + wStock : '';
			mStockT.text = mStock > 0 ? '🥩' + mStock : '';
			wLvT.text = 'Lv' + wLv;
			mLvT.text = 'Lv' + mLv;
			pCarryT.text = carryText();
			for (let i = 0; i < allBtns.length; i++) allBtns[i].update();
		}

		// --- Keyboard ---
		const keys: Record<string, boolean> = {};
		function onKeyDown(e: KeyboardEvent) { keys[e.key] = true; }
		function onKeyUp(e: KeyboardEvent) { keys[e.key] = false; }
		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);

		// --- Virtual Joystick ---
		const JOY_R = 50;
		const JOY_KNOB = 20;
		const JOY_DEAD = 8;
		let joyActive = false;
		let joyId = -1;
		let joyBaseX = 0, joyBaseY = 0;
		let joyDx = 0, joyDy = 0;
		let tapStartX = 0, tapStartY = 0, tapTime = 0;

		const joyContainer = new Container();
		joyContainer.visible = false;
		hudLayer.addChild(joyContainer);
		const joyBase = new Graphics();
		joyBase.circle(0, 0, JOY_R).fill({ color: 0xffffff, alpha: 0.12 });
		joyBase.circle(0, 0, JOY_R).stroke({ color: 0xffffff, width: 1.5, alpha: 0.25 });
		joyContainer.addChild(joyBase);
		const joyKnob = new Graphics();
		joyKnob.circle(0, 0, JOY_KNOB).fill({ color: 0xffffff, alpha: 0.3 });
		joyContainer.addChild(joyKnob);

		function tapTarget(screenX: number, screenY: number) {
			const pos = { x: screenX, y: screenY };
			const wLocal = world.toLocal(pos);
			const wx = Math.max(10, Math.min(WW - 10, wLocal.x));
			const wy = Math.max(10, Math.min(WH - 10, wLocal.y));

			let bestTree: Tree | null = null;
			let bestD = 30;
			for (let i = 0; i < trees.length; i++) {
				const d2 = dist(trees[i].x, trees[i].y, wx, wy);
				if (d2 < bestD) { bestD = d2; bestTree = trees[i]; }
			}
			if (bestTree) { P.tx = bestTree.x; P.ty = bestTree.y; P.tgt = bestTree; return; }

			let bestBeast: Beast | null = null;
			bestD = 30;
			for (let i = 0; i < beasts.length; i++) {
				const d2 = dist(beasts[i].x, beasts[i].y, wx, wy);
				if (d2 < bestD) { bestD = d2; bestBeast = beasts[i]; }
			}
			if (bestBeast) { P.tx = bestBeast.x; P.ty = bestBeast.y; P.tgt = bestBeast; return; }

			P.tx = wx;
			P.ty = wy;
			P.tgt = null;
		}

		clickArea.on('pointerdown', function (e: any) {
			if (state !== 'playing') return;
			const gx = e.global.x;
			const gy = e.global.y;
			joyId = e.pointerId;
			tapStartX = gx;
			tapStartY = gy;
			tapTime = Date.now();
			joyBaseX = gx;
			joyBaseY = gy;
			joyDx = 0;
			joyDy = 0;
			joyActive = false;
			joyContainer.x = gx;
			joyContainer.y = gy;
			joyKnob.x = 0;
			joyKnob.y = 0;
		});

		app.stage.eventMode = 'static';
		app.stage.hitArea = { contains: function () { return true; } };

		app.stage.on('pointermove', function (e: any) {
			if (joyId < 0) return;
			const gx = e.global.x;
			const gy = e.global.y;
			const mdx = gx - joyBaseX;
			const mdy = gy - joyBaseY;
			const md = Math.sqrt(mdx * mdx + mdy * mdy);

			if (!joyActive && md > JOY_DEAD) {
				joyActive = true;
				joyContainer.visible = true;
			}

			if (joyActive) {
				const clamped = Math.min(md, JOY_R);
				const nx = md > 0 ? mdx / md : 0;
				const ny = md > 0 ? mdy / md : 0;
				joyKnob.x = nx * clamped;
				joyKnob.y = ny * clamped;
				joyDx = nx * (clamped / JOY_R);
				joyDy = ny * (clamped / JOY_R);
			}
		});

		app.stage.on('pointerup', function (e: any) {
			if (e.pointerId !== joyId) return;
			if (!joyActive) {
				const elapsed = Date.now() - tapTime;
				const tdx = e.global.x - tapStartX;
				const tdy = e.global.y - tapStartY;
				if (elapsed < 300 && Math.sqrt(tdx * tdx + tdy * tdy) < 15) {
					tapTarget(tapStartX, tapStartY);
				}
			}
			joyActive = false;
			joyId = -1;
			joyDx = 0;
			joyDy = 0;
			joyContainer.visible = false;
		});

		app.stage.on('pointerupoutside', function (e: any) {
			if (e.pointerId !== joyId) return;
			joyActive = false;
			joyId = -1;
			joyDx = 0;
			joyDy = 0;
			joyContainer.visible = false;
		});

		// --- Initial spawns ---
		for (let i = 0; i < 4; i++) spawnTree();
		for (let i = 0; i < 2; i++) spawnBeast();

		let treeSpT = 0, beastSpT = 0, depositCD = 0, pickupCD = 0;

		function endGame() {
			resultData = { trees: statTrees, animals: statBeasts, coins: statCoins, score };
			state = 'result';
		}

		// --- Main Loop ---
		app.ticker.add(function () {
			if (state !== 'playing') return;
			const dt = Math.min(app.ticker.deltaMS, 33);

			// Timer
			timer -= dt;
			if (timer <= 0) { timer = 0; refreshUI(); endGame(); return; }

			// Snow
			for (let i = 0; i < flakes.length; i++) {
				const f = flakes[i];
				f.y += f.s;
				f.x += f.d;
				if (f.y > WH) { f.y = -3; f.x = Math.random() * WW; }
				if (f.x < 0) f.x = WW;
				if (f.x > WW) f.x = 0;
				f.g.x = f.x;
				f.g.y = f.y;
			}

			// --- Input: keyboard / joystick / tap ---
			let inputDx = 0, inputDy = 0;
			let directInput = false;

			// Keyboard
			let kx = 0, ky = 0;
			if (keys['w'] || keys['W'] || keys['ArrowUp']) ky = -1;
			if (keys['s'] || keys['S'] || keys['ArrowDown']) ky = 1;
			if (keys['a'] || keys['A'] || keys['ArrowLeft']) kx = -1;
			if (keys['d'] || keys['D'] || keys['ArrowRight']) kx = 1;
			if (kx !== 0 || ky !== 0) {
				const kd = Math.sqrt(kx * kx + ky * ky);
				inputDx = kx / kd;
				inputDy = ky / kd;
				directInput = true;
			}

			// Joystick (overrides keyboard if active)
			if (joyActive && (Math.abs(joyDx) > 0.05 || Math.abs(joyDy) > 0.05)) {
				inputDx = joyDx;
				inputDy = joyDy;
				directInput = true;
			}

			// Clear tap target when using direct input
			if (directInput) {
				P.tgt = null;
			}

			// Chase target (tap mode)
			if (P.tgt) {
				if (P.tgt.c.destroyed) {
					P.tgt = null;
					P.tx = P.x;
					P.ty = P.y;
				} else {
					P.tx = P.tgt.x;
					P.ty = P.tgt.y;
				}
			}

			// Movement
			let moving = false;
			const inRange = P.tgt && dist(P.x, P.y, P.tgt.x, P.tgt.y) < 30;

			if (directInput) {
				P.x += inputDx * SPD;
				P.y += inputDy * SPD;
				P.x = Math.max(10, Math.min(WW - 10, P.x));
				P.y = Math.max(10, Math.min(WH - 10, P.y));
				P.tx = P.x;
				P.ty = P.y;
				if (Math.abs(inputDx) > 0.1) P.face = inputDx > 0 ? 1 : -1;
				moving = true;
				// Find nearest attackable in range
				P.tgt = null;
				for (let i = 0; i < trees.length; i++) {
					if (dist(P.x, P.y, trees[i].x, trees[i].y) < 30) { P.tgt = trees[i]; break; }
				}
				if (!P.tgt) {
					for (let i = 0; i < beasts.length; i++) {
						if (dist(P.x, P.y, beasts[i].x, beasts[i].y) < 30) { P.tgt = beasts[i]; break; }
					}
				}
			} else {
				const dx = P.tx - P.x;
				const dy = P.ty - P.y;
				const d = Math.sqrt(dx * dx + dy * dy);
				if (d > 3 && !inRange) {
					P.x += (dx / d) * SPD;
					P.y += (dy / d) * SPD;
					if (Math.abs(dx) > 0.5) P.face = dx > 0 ? 1 : -1;
					moving = true;
				}
			}

			if (moving) { P.walkT++; } else { P.walkT = 0; }

			// Attack
			P.atkT -= dt;
			const atkRange = P.tgt && !P.tgt.c.destroyed && dist(P.x, P.y, P.tgt.x, P.tgt.y) < 30;
			if (atkRange && P.tgt && P.atkT <= 0) {
				P.atkT = ACD;
				if ('vx' in P.tgt) hitBeast(P.tgt as Beast);
				else hitTree(P.tgt as Tree);
			}

			// Player visual
			pC.x = P.x;
			pC.y = P.y;
			pC.zIndex = P.y;
			pBody.scale.x = P.face;
			const sw = Math.sin(P.walkT * 0.3) * 3;
			pLL.y = sw;
			pRL.y = -sw;

			// Camera (2D follow)
			const camX = Math.max(0, Math.min(WW - W, P.x - W / 2));
			const camY = Math.max(0, Math.min(WH - H, P.y - H / 2));
			world.x = -camX;
			world.y = -camY;

			// Drops physics (vertical bounce then settle)
			for (let i = 0; i < drops.length; i++) {
				const dd = drops[i];
				if (dd.flying || dd.landed) continue;
				dd.vy += 0.2;
				dd.gfx.y += dd.vy;
				if (dd.gfx.y >= dd.bounceY) {
					dd.gfx.y = dd.bounceY;
					dd.vy = -dd.vy * 0.3;
					if (Math.abs(dd.vy) < 0.5) { dd.landed = true; dd.vy = 0; }
				}
				dd.y = dd.gfx.y;
			}

			// Pickup
			pickupCD -= dt;
			if (pickupCD <= 0) {
				for (let i = 0; i < drops.length; i++) {
					const dd = drops[i];
					if (dd.flying || !dd.landed) continue;
					if (dist(dd.x, dd.y, P.x, P.y) > PR) continue;
					if (dd.type === 'coin') {
						pickupCD = 80;
						flyTo(dd, P.x, P.y - 15, function () { coins++; rmDrop(dd); refreshUI(); });
						break;
					} else {
						if (P.carry.length >= CAP) continue;
						pickupCD = 100;
						const tp = dd.type as IType;
						flyTo(dd, P.x, P.y - 15, function () { P.carry.push(tp); rmDrop(dd); refreshUI(); });
						break;
					}
				}
			}

			// Auto-deposit
			depositCD -= dt;
			if (depositCD <= 0) {
				if (dist(P.x, P.y, WSTN.x, WSTN.y) < DR) {
					const wi = P.carry.indexOf('wood');
					if (wi >= 0) {
						depositCD = 150;
						P.carry.splice(wi, 1);
						const g = mkGfx('wood');
						g.x = P.x; g.y = P.y - 10;
						itemLayer.addChild(g);
						const tmp: Drop = { type: 'wood', x: P.x, y: P.y - 10, gfx: g, vy: 0, bounceY: P.y, landed: true, flying: false };
						flyTo(tmp, WSTN.x, WSTN.y, function () { wStock++; g.destroy(); refreshUI(); });
					}
				}
				if (dist(P.x, P.y, MSTN.x, MSTN.y) < DR) {
					const mi = P.carry.indexOf('meat');
					if (mi >= 0) {
						depositCD = 150;
						P.carry.splice(mi, 1);
						const g = mkGfx('meat');
						g.x = P.x; g.y = P.y - 10;
						itemLayer.addChild(g);
						const tmp: Drop = { type: 'meat', x: P.x, y: P.y - 10, gfx: g, vy: 0, bounceY: P.y, landed: true, flying: false };
						flyTo(tmp, MSTN.x, MSTN.y, function () { mStock++; g.destroy(); refreshUI(); });
					}
				}
			}

			// Station production (requires worker OR player nearby)
			const wManned = wWorker || dist(P.x, P.y, WSTN.x, WSTN.y) < DR;
			if (wStock > 0 && wManned) {
				wProdT += dt;
				if (wProdT >= prodMs(wLv)) {
					wProdT = 0;
					wStock--;
					statCoins++; score += 10;
					spawnDrop('coin', WSTN.x + 15, WSTN.y + 10);
					refreshUI();
				}
			} else { wProdT = 0; }

			const mManned = mWorker || dist(P.x, P.y, MSTN.x, MSTN.y) < DR;
			if (mStock > 0 && mManned) {
				mProdT += dt;
				if (mProdT >= prodMs(mLv)) {
					mProdT = 0;
					mStock--;
					statCoins++; score += 10;
					spawnDrop('coin', MSTN.x + 15, MSTN.y + 10);
					refreshUI();
				}
			} else { mProdT = 0; }

			// Animals wander (2D)
			for (let i = 0; i < beasts.length; i++) {
				const a = beasts[i];
				a.mt -= dt;
				if (a.mt <= 0) {
					a.vx = (Math.random() - 0.5) * 0.5;
					a.vy2 = (Math.random() - 0.5) * 0.5;
					a.mt = 1500 + Math.random() * 2000;
				}
				a.x += a.vx;
				a.y += a.vy2;
				if (dist(a.x, a.y, HUNT.x, HUNT.y) > HUNT.r - 10) {
					a.vx *= -1;
					a.vy2 *= -1;
					a.x += a.vx * 2;
					a.y += a.vy2 * 2;
				}
				if (!a.c.destroyed) {
					a.c.x = a.x;
					a.c.y = a.y;
					a.c.zIndex = a.y;
				}
			}

			// Spawn
			treeSpT += dt;
			if (treeSpT > 2500 && trees.length < 5) { treeSpT = 0; spawnTree(); }
			beastSpT += dt;
			if (beastSpT > 3000 && beasts.length < 3) { beastSpT = 0; spawnBeast(); }

			// Field worker AI (cutter)
			if (cutterW) {
				const fw = cutterW;
				if (fw.tgt && fw.tgt.c.destroyed) fw.tgt = null;
				if (!fw.tgt && trees.length > 0) {
					let best: Tree | null = null, bd = Infinity;
					for (let i = 0; i < trees.length; i++) {
						const d2 = dist(fw.x, fw.y, trees[i].x, trees[i].y);
						if (d2 < bd) { bd = d2; best = trees[i]; }
					}
					fw.tgt = best;
				}
				if (fw.tgt) {
					const d2 = dist(fw.x, fw.y, fw.tgt.x, fw.tgt.y);
					if (d2 > 25) {
						const ddx = fw.tgt.x - fw.x, ddy = fw.tgt.y - fw.y;
						const dd = Math.sqrt(ddx * ddx + ddy * ddy);
						fw.x += (ddx / dd) * 2;
						fw.y += (ddy / dd) * 2;
						if (Math.abs(ddx) > 0.5) fw.face = ddx > 0 ? 1 : -1;
						fw.walkT++;
					} else {
						fw.walkT = 0;
						fw.atkT -= dt;
						if (fw.atkT <= 0) { fw.atkT = ACD; hitTree(fw.tgt); }
					}
				}
				fw.c.x = fw.x; fw.c.y = fw.y; fw.c.zIndex = fw.y;
				fw.c.scale.x = fw.face;
			}

			// Field worker AI (hunter)
			if (hunterW) {
				const fw = hunterW;
				if (fw.tgt && (fw.tgt as Beast).c.destroyed) fw.tgt = null;
				if (!fw.tgt && beasts.length > 0) {
					let best: Beast | null = null, bd = Infinity;
					for (let i = 0; i < beasts.length; i++) {
						const d2 = dist(fw.x, fw.y, beasts[i].x, beasts[i].y);
						if (d2 < bd) { bd = d2; best = beasts[i]; }
					}
					fw.tgt = best;
				}
				if (fw.tgt) {
					const d2 = dist(fw.x, fw.y, fw.tgt.x, fw.tgt.y);
					if (d2 > 25) {
						const ddx = fw.tgt.x - fw.x, ddy = fw.tgt.y - fw.y;
						const dd = Math.sqrt(ddx * ddx + ddy * ddy);
						fw.x += (ddx / dd) * 2;
						fw.y += (ddy / dd) * 2;
						if (Math.abs(ddx) > 0.5) fw.face = ddx > 0 ? 1 : -1;
						fw.walkT++;
					} else {
						fw.walkT = 0;
						fw.atkT -= dt;
						if (fw.atkT <= 0) { fw.atkT = ACD; hitBeast(fw.tgt as Beast); }
					}
				}
				fw.c.x = fw.x; fw.c.y = fw.y; fw.c.zIndex = fw.y;
				fw.c.scale.x = fw.face;
			}

			refreshUI();
		});

		refreshUI();
		cleanup = function () {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
			appCleanup();
		};
	}

	function restart() { startGame(); }
	onMount(function () { startGame(); return function () { if (cleanup) cleanup(); }; });
</script>

<GameShell title="末日生存" onrestart={restart}>
	<div class="game-container" bind:this={containerEl}></div>

	{#if state === 'result'}
		<div class="overlay">
			<div class="overlay-box result">
				<p class="title">時間到！</p>
				<div class="stats">
					<div class="stat-row"><span>🌲 砍倒木頭</span><span>{resultData.trees}</span></div>
					<div class="stat-row"><span>🥩 獵殺動物</span><span>{resultData.animals}</span></div>
					<div class="stat-row"><span>💰 產出金幣</span><span>{resultData.coins}</span></div>
					<div class="stat-row total"><span>🏆 總分</span><span>{resultData.score}</span></div>
				</div>
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

	.result .title {
		font-family: 'Audiowide', sans-serif;
		font-size: 1.8rem;
		color: #00f0ff;
		text-shadow: 0 0 20px rgba(0, 240, 255, 0.5);
		margin-bottom: 1.2rem;
	}

	.stats {
		text-align: left;
		margin-bottom: 1.2rem;
	}

	.stat-row {
		display: flex;
		justify-content: space-between;
		font-family: 'Arial', sans-serif;
		font-size: 1.1rem;
		color: #e0e0f0;
		padding: 0.4rem 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.stat-row.total {
		border-bottom: none;
		border-top: 2px solid #ffe156;
		margin-top: 0.4rem;
		padding-top: 0.6rem;
		font-size: 1.4rem;
		color: #ffe156;
		font-weight: bold;
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
