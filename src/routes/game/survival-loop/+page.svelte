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
	import { Assets, Sprite, Texture } from 'pixi.js';
	import { survivalSpriteUrls, type SurvivalSpriteKey } from '$lib/survival-loop-assets';

	let containerEl: HTMLDivElement;
	let cleanup: (() => void) | undefined;
	let state = $state<'menu' | 'playing' | 'result'>('menu');
	let gameMode = $state<'normal' | 'infinite'>('normal');
	let resultData = $state({ trees: 0, animals: 0, coins: 0, score: 0 });

	async function startGame(mode: 'normal' | 'infinite') {
		gameMode = mode;
		if (cleanup) cleanup();
		containerEl.innerHTML = '';
		state = 'playing';
		const { app, cleanup: appCleanup } = await initApp(containerEl, 0x1a2a1a);

		const WW = 420;
		const WH = 700;
		const SPD = 4.5;
		const CAP = 50;
		const ACD = 350;
		const WORK_FRAME_MS = 180;
		const WORK_ANIM_MS = 360;
		const PR = 45;
		const DR = 55;
		const DMG = 6;
		const MAX_LV = 10;
		await Assets.load(Object.values(survivalSpriteUrls));
		const tex = Object.fromEntries(Object.entries(survivalSpriteUrls).map(function ([key, url]) {
			return [key, Texture.from(url)];
		})) as Record<SurvivalSpriteKey, Texture>;

		function makeSprite(key: SurvivalSpriteKey, width: number, height: number, anchorY = 0.82) {
			const s = new Sprite(tex[key]);
			s.anchor.set(0.5, anchorY);
			s.width = width;
			s.height = height;
			return s;
		}

		// 2D zone positions (compact, shifted down for HUD clearance)
		const FOREST = { x: 100, y: 200, r: 80 };
		const HUNT = { x: 320, y: 200, r: 110 };
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
		const groundFallback = new Graphics();
		groundFallback.rect(0, 0, WW, WH).fill(0x26353a);
		groundFallback.rect(0, 0, WW, 72).fill(0x27333d);
		groundFallback.rect(20, 36, WW - 40, 6).fill({ color: 0x87979d, alpha: 0.8 });
		groundFallback.circle(FOREST.x, FOREST.y, FOREST.r + 16).fill({ color: 0x263f38, alpha: 0.75 });
		groundFallback.circle(HUNT.x, HUNT.y, HUNT.r + 16).fill({ color: 0x4a3a2c, alpha: 0.65 });
		groundFallback.moveTo(40, 360).bezierCurveTo(120, 330, 300, 330, 380, 360).stroke({ color: 0xd9eef0, width: 18, alpha: 0.12 });
		groundFallback.moveTo(65, 520).bezierCurveTo(145, 470, 280, 470, 355, 515).stroke({ color: 0xd9eef0, width: 22, alpha: 0.12 });
		groundLayer.addChild(groundFallback);
		const groundMap = new Sprite(tex.worldMap);
		groundMap.x = 0;
		groundMap.y = 0;
		groundMap.width = WW;
		groundMap.height = WH;
		groundLayer.addChild(groundMap);
		for (let i = 0; i < 25; i++) {
			const patch = new Graphics();
			const px = Math.random() * WW;
			const py = Math.random() * WH;
			const pr = 15 + Math.random() * 25;
			patch.circle(px, py, pr).fill({ color: 0xd9eef0, alpha: 0.05 });
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
		function makeStn(x: number, y: number, label: string, key: SurvivalSpriteKey) {
			const c = new Container();
			c.x = x;
			c.y = y;
			const base = new Graphics();
			base.roundRect(-30, -23, 60, 42, 5).fill(key === 'meatStation' ? 0x54323a : key === 'mealShop' ? 0x5b4b32 : 0x564235);
			base.roundRect(-34, -31, 68, 14, 3).fill(0x2f3b45);
			base.roundRect(-30, -23, 60, 42, 5).stroke({ color: 0x7f8f95, width: 1, alpha: 0.45 });
			base.visible = false;
			c.addChild(base);
			c.addChild(makeSprite(key, 74, 64, 0.78));
			zoneLayer.addChild(c);
			zoneLayer.addChild(centeredText(label, x, y + 28, { size: 10, color: COLORS.muted, family: 'Arial' }));
		}
		makeStn(WSTN.x, WSTN.y, '木材站', 'woodStation');
		makeStn(MSTN.x, MSTN.y, '肉品站', 'meatStation');
		makeStn(BENTO.x, BENTO.y, '便當店', 'mealShop');

		// Zone labels
		zoneLayer.addChild(centeredText('🌲森林', FOREST.x, FOREST.y - FOREST.r - 12, { size: 11, color: COLORS.muted, family: 'Arial' }));
		zoneLayer.addChild(centeredText('🐻獵場', HUNT.x, HUNT.y - HUNT.r - 12, { size: 11, color: COLORS.muted, family: 'Arial' }));

		// Stock & level displays
		const wStockT = centeredText('', WSTN.x, WSTN.y - 28, { size: 11, color: COLORS.yellow, family: 'Arial' });
		const mStockT = centeredText('', MSTN.x, MSTN.y - 28, { size: 11, color: COLORS.yellow, family: 'Arial' });
		const wLvT = centeredText('Lv1', WSTN.x, WSTN.y - 40, { size: 10, color: COLORS.cyan, family: 'Arial' });
		const mLvT = centeredText('Lv1', MSTN.x, MSTN.y - 40, { size: 10, color: COLORS.cyan, family: 'Arial' });
		const bStockT = centeredText('', BENTO.x - 20, BENTO.y - 38, { size: 11, color: COLORS.yellow, family: 'Arial' });
		const bCoinT = centeredText('', BENTO.x + 20, BENTO.y - 38, { size: 11, color: COLORS.gold, family: 'Arial' });
		zoneLayer.addChild(wStockT, mStockT, wLvT, mLvT, bStockT, bCoinT);

		// --- Click area ---
		clickArea.rect(0, 0, WW, WH).fill({ color: 0x000000, alpha: 0.001 });
		clickArea.eventMode = 'static';
		clickArea.cursor = 'pointer';

		// --- Game State ---
		type IType = 'wood' | 'meat' | 'coin';
		interface Drop { type: IType | 'coin'; x: number; y: number; gfx: Graphics; vy: number; bounceY: number; landed: boolean; flying: boolean }
		interface Tree { c: Container; sprite: Sprite; x: number; y: number; hp: number; max: number; bar: Graphics }
		interface Beast { c: Container; sprite: Sprite; x: number; y: number; hp: number; max: number; bar: Graphics; vx: number; vy2: number; mt: number; walkT: number; hitT: number; atkCD: number; attackT: number }

		const drops: Drop[] = [];
		const trees: Tree[] = [];
		const beasts: Beast[] = [];
		const stumps: Sprite[] = [];

		let coins = 0;
		let wStock = 0, wLv = 1, wProdT = 0;
		let mStock = 0, mLv = 1, mProdT = 0;
		let bentoStock = 0, bentoProdT = 0;

		const GAME_TIME = 180000;
		let timer = mode === 'normal' ? GAME_TIME : 0;
		let score = 0;
		let statTrees = 0, statBeasts = 0, statCoins = 0;

		// Unified worker system
		type PlayerDir = 'down' | 'up' | 'left' | 'right';
		type HState = 'working' | 'toEat' | 'eating' | 'returning';
		interface Wk {
			c: Container; sprite: Sprite; kind: 'clerk' | 'lumber' | 'hunter'; x: number; y: number;
			homeX: number; homeY: number;
			face: number; dir: PlayerDir; walkT: number;
			workCount: number; hunger: HState;
			tgt: Tree | Beast | null; atkT: number;
			hp: number; maxHp: number; hpBar: Graphics;
		}
		const allWk: Wk[] = [];
		let wStnWk: Wk | null = null;
		let mStnWk: Wk | null = null;
		let cutterWk: Wk | null = null;
		const hunterWks: Wk[] = [];
		let bentoWk: Wk | null = null;

		function ucost(lv: number) { return Math.floor(8 * Math.pow(1.6, lv - 1)); }
		function prodMs(lv: number) { return 1000 / (1 + (lv - 1) * 0.35); }

		// --- Player ---
		const P = {
			x: BENTO.x, y: BENTO.y + 60,
			tx: BENTO.x, ty: BENTO.y + 60,
			carry: [] as IType[],
			face: 1, atkT: 0, walkT: 0,
			dir: 'down' as PlayerDir,
			tgt: null as Tree | Beast | null,
			hp: 100, maxHp: 100, invT: 0
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

		const pSprite = makeSprite('heroIdle', 48, 58, 0.86);
		pBody.addChild(pSprite);
		pShadow.visible = pLL.visible = pRL.visible = pTorso.visible = pHead.visible = pEye.visible = false;

		const pHpBar = new Graphics();
		pC.addChild(pHpBar);

		const pCarryC = new Container();
		pC.addChild(pCarryC);
		pC.x = P.x;
		pC.y = P.y;
		charLayer.addChild(pC);

		function setPlayerDir(dx: number, dy: number) {
			if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) return;
			if (Math.abs(dx) > Math.abs(dy)) P.dir = dx > 0 ? 'right' : 'left';
			else P.dir = dy > 0 ? 'down' : 'up';
		}

		function moveDir(dx: number, dy: number): PlayerDir {
			if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
			return dy > 0 ? 'down' : 'up';
		}

		function heroTexture(action: 'idle' | 'walk' | 'work', frame = 1) {
			const dir = P.dir[0].toUpperCase() + P.dir.slice(1);
			const suffix = action === 'idle' ? 'Idle' : action === 'walk' ? `Walk${frame}` : `Work${frame}`;
			return tex[`hero${dir}${suffix}` as SurvivalSpriteKey];
		}

		function updateCarryVisual() {
			pCarryC.removeChildren();
			let wc = 0, mc = 0, cc = 0;
			for (let i = 0; i < P.carry.length; i++) {
				if (P.carry[i] === 'wood') wc++;
				else if (P.carry[i] === 'meat') mc++;
				else cc++;
			}
			const parts: string[] = [];
			if (wc > 0) parts.push('🪵' + wc);
			if (mc > 0) parts.push('🥩' + mc);
			if (cc > 0) parts.push('💰' + cc);
			if (parts.length === 0) return;
			const spacing = 32;
			const totalW = parts.length * spacing;
			for (let i = 0; i < parts.length; i++) {
				const t = centeredText(parts[i], -totalW / 2 + spacing / 2 + i * spacing, -68, { size: 10, color: COLORS.yellow, family: 'Arial' });
				pCarryC.addChild(t);
			}
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
			// Geometry fallback keeps resources visible if image textures are not ready.
			const sh = new Graphics(); sh.ellipse(0, 6, 18, 8).fill({ color: 0x000000, alpha: 0.2 }); c.addChild(sh);
			const trunk = new Graphics(); trunk.rect(-5, -26, 10, 32).fill(0x6b4f35); c.addChild(trunk);
			const canopy = new Graphics();
			canopy.circle(0, -36, 22).fill(0x496f67);
			canopy.circle(-8, -28, 14).fill(0x3e625b);
			canopy.circle(8, -28, 14).fill(0x334f4b);
			canopy.moveTo(-16, -40).lineTo(16, -38).stroke({ color: 0xd7eef0, width: 3, alpha: 0.9 });
			c.addChild(canopy);
			sh.visible = trunk.visible = canopy.visible = false;
			const sprite = makeSprite('treeFull', 62, 76, 0.9);
			c.addChild(sprite);
			// HP bar
			const bar = new Graphics(); c.addChild(bar);
			objLayer.addChild(c);
			const tree: Tree = { c, sprite, x, y, hp: max, max, bar };
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
				const stump = makeSprite('treeStump', 46, 36, 0.86);
				stump.x = t.x;
				stump.y = t.y;
				stump.zIndex = t.y - 1;
				objLayer.addChild(stump);
				stumps.push(stump);
				if (stumps.length > 8) { const old = stumps.shift(); if (old && !old.destroyed) old.destroy(); }
				t.c.destroy();
				trees.splice(trees.indexOf(t), 1);
				statTrees++; score += 10;
				const n = 2 + Math.floor(Math.random() * 2);
				for (let i = 0; i < n; i++) spawnDrop('wood', t.x, t.y);
			} else {
				if (t.hp <= t.max / 2) t.sprite.texture = tex.treeDamaged;
				hpBar(t.bar, t.hp, t.max, 0, -62, COLORS.green);
			}
		}

		// --- Animals ---
		function spawnBeast() {
			const angle = Math.random() * Math.PI * 2;
			const radius = Math.random() * (HUNT.r - 15);
			const x = HUNT.x + Math.cos(angle) * radius;
			const y = HUNT.y + Math.sin(angle) * radius;
			const max = 16 + Math.floor(Math.random() * 6);
			const c = new Container();
			c.x = x;
			c.y = y;
			c.zIndex = y;
			// Geometry fallback keeps prey visible if image textures are not ready.
			const sh = new Graphics(); sh.ellipse(0, 4, 16, 7).fill({ color: 0x000000, alpha: 0.2 }); c.addChild(sh);
			const body = new Graphics(); body.ellipse(0, -10, 18, 11).fill(0x6f6257); c.addChild(body);
			const head = new Graphics(); head.circle(16, -15, 8).fill(0x756555); c.addChild(head);
			const snout = new Graphics(); snout.poly([22, -14, 30, -11, 22, -8]).fill(0xb9c1bf); c.addChild(snout);
			const eye = new Graphics(); eye.circle(19, -17, 2).fill(0x071014); c.addChild(eye);
			const legs = new Graphics();
			for (const lx of [-10, -3, 5, 12]) legs.rect(lx, -2, 4, 10).fill(0x3d332b);
			c.addChild(legs);
			sh.visible = body.visible = head.visible = snout.visible = eye.visible = legs.visible = false;
			const sprite = makeSprite('boarIdle', 72, 54, 0.82);
			c.addChild(sprite);
			// HP bar
			const bar = new Graphics(); c.addChild(bar);
			objLayer.addChild(c);
			const b: Beast = { c, sprite, x, y, hp: max, max, bar, vx: (Math.random() - 0.5) * 0.5, vy2: (Math.random() - 0.5) * 0.5, mt: 1200 + Math.random() * 1500, walkT: 0, hitT: 0, atkCD: 0, attackT: 0 };
			beasts.push(b);
			hpBar(bar, max, max, 0, -36, COLORS.red);
		}

		function hitBeast(b: Beast) {
			b.hp -= DMG;
			b.hitT = 220;
			b.sprite.texture = tex.boarHit;
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
				hpBar(b.bar, b.hp, b.max, 0, -36, COLORS.red);
			}
		}

		function hitPlayerByBeast(dmg: number) {
			if (P.invT > 0) return;
			P.hp -= dmg;
			popup('-' + dmg, P.x, P.y - 45, COLORS.red);
			if (P.hp <= 0) {
				P.hp = 0;
				playerDie();
			}
		}

		function playerDie() {
			for (let i = 0; i < P.carry.length; i++) {
				spawnDrop(P.carry[i], P.x + (Math.random() - 0.5) * 20, P.y + (Math.random() - 0.5) * 20);
			}
			P.carry = [];
			P.x = BENTO.x; P.y = BENTO.y + 60;
			P.tx = P.x; P.ty = P.y;
			P.tgt = null;
			P.hp = P.maxHp;
			P.invT = 1500;
			popup('💀復活！', BENTO.x, BENTO.y + 30, COLORS.yellow);
			refreshUI();
		}

		function hitHunterByBeast(wk: Wk, dmg: number) {
			wk.hp -= dmg;
			popup('-' + dmg, wk.x, wk.y - 35, COLORS.red);
			wk.c.x = wk.x + (Math.random() - 0.5) * 5;
			setTimeout(function () { if (!wk.c.destroyed) wk.c.x = wk.x; }, 80);
			if (wk.hp <= 0) {
				wk.c.destroy();
				const idx = allWk.indexOf(wk);
				if (idx >= 0) allWk.splice(idx, 1);
				const hi = hunterWks.indexOf(wk); if (hi >= 0) hunterWks.splice(hi, 1);
				popup('💀獵人陣亡', wk.x, wk.y - 50, COLORS.red);
			} else {
				hpBar(wk.hpBar, wk.hp, wk.maxHp, 0, -52, COLORS.green);
			}
		}

		// --- Workers ---
		function spawnWk(x: number, y: number, kind: 'clerk' | 'lumber' | 'hunter'): Wk {
			const c = new Container();
			c.x = x; c.y = y; c.zIndex = y;
			const fallbackColor = kind === 'lumber' ? 0x466548 : kind === 'hunter' ? 0x65543f : 0x5a5f63;
			const sh = new Graphics(); sh.ellipse(0, 2, 8, 4).fill({ color: 0x000000, alpha: 0.2 }); c.addChild(sh);
			const body = new Graphics(); body.rect(-5, -5, 10, 14).fill(fallbackColor); c.addChild(body);
			const hood = new Graphics(); hood.circle(0, -12, 7).fill(0x263845); c.addChild(hood);
			const head = new Graphics(); head.circle(1, -11, 5).fill(0xd1a072); c.addChild(head);
			sh.visible = body.visible = hood.visible = head.visible = false;
			const sprite = makeSprite(kind === 'lumber' ? 'lumberIdle' : kind === 'hunter' ? 'hunterIdle' : 'clerkIdle', 36, 46, 0.86);
			c.addChild(sprite);
			charLayer.addChild(c);
			const wkHp = kind === 'hunter' ? 60 : 0;
			const hpG = new Graphics();
			c.addChild(hpG);
			if (kind === 'hunter') hpBar(hpG, wkHp, wkHp, 0, -52, COLORS.green);
			const wk: Wk = { c, sprite, kind, x, y, homeX: x, homeY: y, face: 1, dir: 'down', walkT: 0, workCount: 0, hunger: 'working', tgt: null, atkT: 0, hp: wkHp, maxHp: wkHp, hpBar: hpG };
			allWk.push(wk);
			return wk;
		}

		// --- UI Buttons ---
		type BtnDef = { update: () => void; trigger: () => void; isVis: () => boolean; isOn: () => boolean };
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
			const idx = btns.length + 1;
			const keyLabel = centeredText(String(idx), -58, 0, { size: 9, color: COLORS.muted, family: 'Arial' });
			c.addChild(keyLabel);
			const lbl = centeredText(getText(), 4, 0, { size: 11, color: COLORS.white, family: 'Arial' });
			c.addChild(lbl);
			c.eventMode = 'static';
			c.cursor = 'pointer';
			c.visible = false;
			function doTrigger() {
				if (isOn()) { onClick(); refreshUI(); }
			}
			c.on('pointerdown', doTrigger);
			hudLayer.addChild(c);
			const def: BtnDef = {
				isVis,
				isOn,
				trigger: doTrigger,
				update: function () {
					const v = isVis();
					c.visible = v;
					if (v) { lbl.text = getText(); c.alpha = isOn() ? 1 : 0.6; }
				}
			};
			btns.push(def);
			return def;
		}

		function pNearW() { return dist(P.x, P.y, WSTN.x, WSTN.y) < DR; }
		function pNearM() { return dist(P.x, P.y, MSTN.x, MSTN.y) < DR; }
		function pNearB() { return dist(P.x, P.y, BENTO.x, BENTO.y) < DR; }
		function hasBentoStock() { return bentoStock > 0; }
		function useBentoStock() { if (bentoStock > 0) bentoStock--; }
		function carryCoins() { let n = 0; for (let i = 0; i < P.carry.length; i++) if (P.carry[i] === 'coin') n++; return n; }
		function spendCoins(amount: number) { for (let i = 0; i < amount; i++) { const ci = P.carry.indexOf('coin'); if (ci >= 0) P.carry.splice(ci, 1); } }

		// Wood station buttons
		mkBtn(
			function () { return '雇用店員 🍱1'; },
			function () { return pNearW() && !wStnWk; },
			function () { return hasBentoStock(); },
			function () { useBentoStock(); wStnWk = spawnWk(WSTN.x + 25, WSTN.y, 'clerk'); wStnWk.homeX = WSTN.x + 25; wStnWk.homeY = WSTN.y; popup('+👷', WSTN.x, WSTN.y - 30, COLORS.green); },
			H - 55
		);
		mkBtn(
			function () { return '雇用樵夫 🍱1'; },
			function () { return pNearW() && !cutterWk; },
			function () { return hasBentoStock(); },
			function () { useBentoStock(); cutterWk = spawnWk(FOREST.x, FOREST.y + 30, 'lumber'); cutterWk.homeX = FOREST.x; cutterWk.homeY = FOREST.y + 30; popup('+🪓', WSTN.x, WSTN.y - 30, COLORS.green); },
			H - 95
		);
		mkBtn(
			function () { return wLv >= MAX_LV ? '木材站 MAX' : '⬆木材站Lv' + (wLv + 1) + ' 💰' + ucost(wLv); },
			function () { return pNearW() && wLv < MAX_LV; },
			function () { return carryCoins() >= ucost(wLv); },
			function () { spendCoins(ucost(wLv)); wLv++; popup('⬆Lv' + wLv, WSTN.x, WSTN.y - 40, COLORS.cyan); },
			H - 135
		);

		// Meat station buttons
		mkBtn(
			function () { return '雇用店員 🍱1'; },
			function () { return pNearM() && !mStnWk; },
			function () { return hasBentoStock(); },
			function () { useBentoStock(); mStnWk = spawnWk(MSTN.x + 25, MSTN.y, 'clerk'); mStnWk.homeX = MSTN.x + 25; mStnWk.homeY = MSTN.y; popup('+👷', MSTN.x, MSTN.y - 30, COLORS.green); },
			H - 55
		);
		mkBtn(
			function () { return '雇用獵人 🍱1'; },
			function () { return pNearM() && hunterWks.length < 2; },
			function () { return hasBentoStock(); },
			function () { useBentoStock(); const ox = hunterWks.length === 0 ? 0 : 20; const hw = spawnWk(HUNT.x + ox, HUNT.y + 30, 'hunter'); hw.homeX = HUNT.x + ox; hw.homeY = HUNT.y + 30; hunterWks.push(hw); popup('+🏹', MSTN.x, MSTN.y - 30, COLORS.green); },
			H - 95
		);
		mkBtn(
			function () { return mLv >= MAX_LV ? '肉品站 MAX' : '⬆肉品站Lv' + (mLv + 1) + ' 💰' + ucost(mLv); },
			function () { return pNearM() && mLv < MAX_LV; },
			function () { return carryCoins() >= ucost(mLv); },
			function () { spendCoins(ucost(mLv)); mLv++; popup('⬆Lv' + mLv, MSTN.x, MSTN.y - 40, COLORS.cyan); },
			H - 135
		);

		// Bento shop button
		mkBtn(
			function () { return '雇用店員 🍱1'; },
			function () { return pNearB() && !bentoWk; },
			function () { return hasBentoStock(); },
			function () { useBentoStock(); bentoWk = spawnWk(BENTO.x + 25, BENTO.y, 'clerk'); bentoWk.homeX = BENTO.x + 25; bentoWk.homeY = BENTO.y; popup('+👷', BENTO.x, BENTO.y - 30, COLORS.green); },
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
		const scoreHud = centeredText('🏆 0', W - 55, 18, { size: 14, color: COLORS.cyan, family: 'Arial' });
		hudLayer.addChild(scoreHud);

		function refreshUI() {
			const sec = mode === 'normal' ? Math.max(0, Math.ceil(timer / 1000)) : Math.floor(timer / 1000);
			const m = Math.floor(sec / 60);
			const s = sec % 60;
			timerHud.text = m + ':' + (s < 10 ? '0' : '') + s;
			if (mode === 'normal' && sec <= 10) timerHud.style.fill = COLORS.red;
			scoreHud.text = '🏆 ' + score;
			wStockT.text = wStock > 0 ? '🪵' + wStock : '';
			mStockT.text = mStock > 0 ? '🥩' + mStock : '';
			bStockT.text = bentoStock > 0 ? '🍱' + bentoStock : '';
			bCoinT.text = coins > 0 ? '💰' + coins : '';
			wLvT.text = 'Lv' + wLv;
			mLvT.text = 'Lv' + mLv;
			updateCarryVisual();
			for (let i = 0; i < allBtns.length; i++) allBtns[i].update();
		}

		function setWorkerTexture(wk: Wk) {
			const prefix = wk.kind === 'lumber' ? 'lumber' : wk.kind === 'hunter' ? 'hunter' : 'clerk';
			const dir = wk.dir[0].toUpperCase() + wk.dir.slice(1);
			if (wk.hunger === 'working' && wk.walkT === 0) {
				const workFrame = wk.kind === 'clerk'
					? Math.floor(timer / 300) % 2 + 1
					: Math.floor(wk.atkT / WORK_FRAME_MS) % 2 + 1;
				wk.sprite.texture = tex[`${prefix}${dir}Work${workFrame}` as SurvivalSpriteKey];
				return;
			}
			if (wk.walkT > 0) {
				wk.sprite.texture = tex[`${prefix}${dir}Walk${Math.floor(wk.walkT / 10) % 2 === 0 ? 1 : 2}` as SurvivalSpriteKey];
				return;
			}
			wk.sprite.texture = tex[`${prefix}${dir}Idle` as SurvivalSpriteKey];
		}

		// --- Keyboard ---
		const keys: Record<string, boolean> = {};
		function onKeyDown(e: KeyboardEvent) {
			keys[e.key] = true;
			if (state !== 'playing') return;
			if (e.key >= '1' && e.key <= '9') {
				const idx = parseInt(e.key) - 1;
				const visible = btns.filter(function (b) { return b.isVis(); });
				if (idx < visible.length) visible[idx].trigger();
			}
		}
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

		function tapTarget(appX: number, appY: number) {
			const wx = Math.max(10, Math.min(WW - 10, appX - world.x));
			const wy = Math.max(10, Math.min(WH - 10, appY - world.y));

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

		// Use native touch events to bypass Chrome's gesture interception
		const canvas = app.canvas;

		function canvasToApp(cx: number, cy: number) {
			const rect = canvas.getBoundingClientRect();
			return { x: (cx - rect.left) / rect.width * W, y: (cy - rect.top) / rect.height * H };
		}

		canvas.addEventListener('touchstart', function (e: TouchEvent) {
			e.preventDefault();
			if (state !== 'playing') return;
			const t = e.changedTouches[0];
			const p = canvasToApp(t.clientX, t.clientY);
			joyId = t.identifier;
			tapStartX = p.x;
			tapStartY = p.y;
			tapTime = Date.now();
			joyBaseX = p.x;
			joyBaseY = p.y;
			joyDx = 0;
			joyDy = 0;
			joyActive = false;
			joyContainer.x = p.x;
			joyContainer.y = p.y;
			joyKnob.x = 0;
			joyKnob.y = 0;
		}, { passive: false });

		canvas.addEventListener('touchmove', function (e: TouchEvent) {
			e.preventDefault();
			for (let i = 0; i < e.changedTouches.length; i++) {
				const t = e.changedTouches[i];
				if (t.identifier !== joyId) continue;
				const p = canvasToApp(t.clientX, t.clientY);
				const mdx = p.x - joyBaseX;
				const mdy = p.y - joyBaseY;
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
			}
		}, { passive: false });

		canvas.addEventListener('touchend', function (e: TouchEvent) {
			for (let i = 0; i < e.changedTouches.length; i++) {
				const t = e.changedTouches[i];
				if (t.identifier !== joyId) continue;
				if (!joyActive) {
					const elapsed = Date.now() - tapTime;
					const p = canvasToApp(t.clientX, t.clientY);
					const tdx = p.x - tapStartX;
					const tdy = p.y - tapStartY;
					if (elapsed < 300 && Math.sqrt(tdx * tdx + tdy * tdy) < 15) {
						tapTarget(tapStartX, tapStartY);
					}
				}
				joyActive = false;
				joyId = -1;
				joyDx = 0;
				joyDy = 0;
				joyContainer.visible = false;
			}
		});

		canvas.addEventListener('touchcancel', function () {
			joyActive = false;
			joyId = -1;
			joyDx = 0;
			joyDy = 0;
			joyContainer.visible = false;
		});

		// Mouse fallback for desktop (PixiJS pointer events)
		clickArea.on('pointerdown', function (e: any) {
			if (state !== 'playing') return;
			if (e.pointerType === 'touch') return;
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
			if (e.pointerType === 'touch') return;
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
			if (e.pointerType === 'touch') return;
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
			const tf = dt / 16.67;

			// Timer
			if (mode === 'normal') {
				timer -= dt;
				if (timer <= 0) { timer = 0; refreshUI(); endGame(); return; }
			} else {
				timer += dt;
			}

			if (P.invT > 0) P.invT -= dt;

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
				P.x += inputDx * SPD * tf;
				P.y += inputDy * SPD * tf;
				P.x = Math.max(10, Math.min(WW - 10, P.x));
				P.y = Math.max(10, Math.min(WH - 10, P.y));
				P.tx = P.x;
				P.ty = P.y;
				if (Math.abs(inputDx) > 0.1) P.face = inputDx > 0 ? 1 : -1;
				setPlayerDir(inputDx, inputDy);
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
					P.x += (dx / d) * SPD * tf;
					P.y += (dy / d) * SPD * tf;
					if (Math.abs(dx) > 0.5) P.face = dx > 0 ? 1 : -1;
					setPlayerDir(dx, dy);
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
			if (atkRange && P.tgt) setPlayerDir(P.tgt.x - P.x, P.tgt.y - P.y);

			// Player visual
			pC.x = P.x;
			pC.y = P.y;
			pC.zIndex = P.y;
			pBody.scale.x = 1;
			if (atkRange && P.tgt && P.atkT > ACD - WORK_ANIM_MS) {
				const frame = Math.floor(P.atkT / WORK_FRAME_MS) % 2 === 0 ? 1 : 2;
				pSprite.texture = heroTexture('work', frame);
			} else if (moving) {
				const frame = Math.floor(P.walkT / 8) % 2 === 0 ? 1 : 2;
				pSprite.texture = heroTexture('walk', frame);
			} else {
				pSprite.texture = heroTexture('idle');
			}
			pSprite.y = moving ? Math.sin(P.walkT * 0.35) * 2 : 0;
			pC.alpha = P.invT > 0 ? (Math.floor(P.invT / 100) % 2 === 0 ? 0.3 : 1) : 1;
			hpBar(pHpBar, P.hp, P.maxHp, 0, -58, P.hp > P.maxHp * 0.3 ? COLORS.green : COLORS.red);
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
				dd.vy += 0.2 * tf;
				dd.gfx.y += dd.vy * tf;
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
					const typeCount = P.carry.filter(function (c) { return c === dd.type; }).length;
					const typeCap = dd.type === 'coin' ? 500 : CAP;
					if (typeCount >= typeCap) continue;
					pickupCD = 80;
					const tp = dd.type as IType;
					flyTo(dd, P.x, P.y - 15, function () { P.carry.push(tp); rmDrop(dd); refreshUI(); });
					break;
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
				if (dist(P.x, P.y, BENTO.x, BENTO.y) < DR) {
					const ci = P.carry.indexOf('coin');
					if (ci >= 0) {
						depositCD = 150;
						P.carry.splice(ci, 1);
						const g = mkGfx('coin');
						g.x = P.x; g.y = P.y - 10;
						itemLayer.addChild(g);
						const tmp: Drop = { type: 'coin', x: P.x, y: P.y - 10, gfx: g, vy: 0, bounceY: P.y, landed: true, flying: false };
						flyTo(tmp, BENTO.x, BENTO.y, function () { coins++; g.destroy(); refreshUI(); });
					}
				}
			}

			// Station production (requires worker working OR player nearby)
			const wStnActive = (wStnWk && wStnWk.hunger === 'working') || dist(P.x, P.y, WSTN.x, WSTN.y) < DR;
			if (wStock > 0 && wStnActive) {
				wProdT += dt;
				if (wProdT >= prodMs(wLv)) {
					wProdT = 0;
					wStock--;
					statCoins++; score += 10;
					spawnDrop('coin', WSTN.x + 15, WSTN.y + 10);
					if (wStnWk && wStnWk.hunger === 'working') {
						wStnWk.workCount++;
						if (wStnWk.workCount >= 5) wStnWk.hunger = 'toEat';
					}
					refreshUI();
				}
			} else { wProdT = 0; }

			const mStnActive = (mStnWk && mStnWk.hunger === 'working') || dist(P.x, P.y, MSTN.x, MSTN.y) < DR;
			if (mStock > 0 && mStnActive) {
				mProdT += dt;
				if (mProdT >= prodMs(mLv)) {
					mProdT = 0;
					mStock--;
					statCoins++; score += 10;
					spawnDrop('coin', MSTN.x + 15, MSTN.y + 10);
					if (mStnWk && mStnWk.hunger === 'working') {
						mStnWk.workCount++;
						if (mStnWk.workCount >= 5) mStnWk.hunger = 'toEat';
					}
					refreshUI();
				}
			} else { mProdT = 0; }

			// Bento production (player or bento worker at shop → coins to bento)
			const bentoActive = (bentoWk && bentoWk.hunger === 'working') || dist(P.x, P.y, BENTO.x, BENTO.y) < DR;
			if (bentoActive && coins > 0) {
				bentoProdT += dt;
				if (bentoProdT >= 1200) {
					bentoProdT = 0;
					coins--;
					bentoStock++; score += 10;
					popup('+🍱', BENTO.x, BENTO.y - 30, COLORS.white);
					if (bentoWk && bentoWk.hunger === 'working') {
						bentoWk.workCount++;
						if (bentoWk.workCount >= 5) {
							if (bentoStock > 0) { bentoStock--; bentoWk.workCount = 0; }
							else { bentoWk.hunger = 'eating'; }
						}
					}
					refreshUI();
				}
			} else { bentoProdT = 0; }

			// Bears AI (aggro + wander)
			for (let i = 0; i < beasts.length; i++) {
				const a = beasts[i];
				a.hitT -= dt;
				a.atkCD -= dt;
				a.attackT -= dt;

				const AGGRO_R = 70;
				const ATK_R = 25;
				const BEAR_SPD = 1.8;
				const BEAR_DMG = 5;
				const BEAR_ACD = 800;
				let aggroX = 0, aggroY = 0;
				let hasAggro = false;
				let aggroIsPlayer = false;
				let aggroWk: Wk | null = null;

				const dP = dist(a.x, a.y, P.x, P.y);
				let dH = Infinity;
				let closestHunter: Wk | null = null;
				for (let hi = 0; hi < hunterWks.length; hi++) {
					if (!hunterWks[hi].c.destroyed) {
						const hd = dist(a.x, a.y, hunterWks[hi].x, hunterWks[hi].y);
						if (hd < dH) { dH = hd; closestHunter = hunterWks[hi]; }
					}
				}

				if (dP < AGGRO_R || dH < AGGRO_R) {
					if (dist(a.x, a.y, HUNT.x, HUNT.y) < HUNT.r + 40) {
						if (dP <= dH) {
							aggroX = P.x; aggroY = P.y; hasAggro = true; aggroIsPlayer = true;
						} else if (closestHunter) {
							aggroX = closestHunter.x; aggroY = closestHunter.y; hasAggro = true; aggroWk = closestHunter;
						}
					}
				}

				if (hasAggro) {
					const ddx = aggroX - a.x, ddy = aggroY - a.y;
					const dd = Math.sqrt(ddx * ddx + ddy * ddy);
					if (dd > ATK_R) {
						a.x += (ddx / dd) * BEAR_SPD * tf;
						a.y += (ddy / dd) * BEAR_SPD * tf;
					}
					if (dd <= ATK_R && a.atkCD <= 0) {
						a.atkCD = BEAR_ACD;
						a.attackT = 420;
						if (aggroIsPlayer) hitPlayerByBeast(BEAR_DMG);
						else if (aggroWk) hitHunterByBeast(aggroWk, BEAR_DMG);
					}
					a.walkT += tf;
				} else {
					const homeDist = dist(a.x, a.y, HUNT.x, HUNT.y);
					if (homeDist > HUNT.r - 10) {
						const ddx = HUNT.x - a.x, ddy = HUNT.y - a.y;
						const dd = Math.sqrt(ddx * ddx + ddy * ddy);
						a.x += (ddx / dd) * 1.5 * tf;
						a.y += (ddy / dd) * 1.5 * tf;
						a.walkT += tf;
					} else {
						a.mt -= dt;
						if (a.mt <= 0) {
							a.vx = (Math.random() - 0.5) * 0.5;
							a.vy2 = (Math.random() - 0.5) * 0.5;
							a.mt = 1500 + Math.random() * 2000;
						}
						a.x += a.vx * tf;
						a.y += a.vy2 * tf;
						a.walkT += Math.abs(a.vx) + Math.abs(a.vy2) > 0.05 ? tf : 0;
					}
				}

				if (a.hitT > 0) {
					a.sprite.texture = tex.boarHit;
				} else if (a.attackT > 0) {
					a.sprite.texture = tex[a.attackT > 210 ? 'bearAttack1' : 'bearAttack2'];
				} else {
					a.sprite.texture = tex[Math.floor(a.walkT / 18) % 2 === 0 ? 'boarWalk1' : 'boarWalk2'];
				}
				if (!a.c.destroyed) { a.c.x = a.x; a.c.y = a.y; a.c.zIndex = a.y; }
			}

			// Spawn
			treeSpT += dt;
			if (treeSpT > 2500 && trees.length < 5) { treeSpT = 0; spawnTree(); }
			beastSpT += dt;
			if (beastSpT > 1000 && beasts.length < 8) { beastSpT = 0; spawnBeast(); }

			// --- Unified worker AI ---
			for (let wi = 0; wi < allWk.length; wi++) {
				const wk = allWk[wi];

				if (wk.hunger === 'toEat') {
					const d2 = dist(wk.x, wk.y, BENTO.x, BENTO.y + 15);
					if (d2 > 8) {
						const ddx = BENTO.x - wk.x, ddy = (BENTO.y + 15) - wk.y;
						const dd = Math.sqrt(ddx * ddx + ddy * ddy);
						wk.x += (ddx / dd) * 2.5 * tf; wk.y += (ddy / dd) * 2.5 * tf;
						if (Math.abs(ddx) > 0.5) wk.face = ddx > 0 ? 1 : -1;
						wk.dir = moveDir(ddx, ddy);
						wk.walkT++;
					} else { wk.hunger = 'eating'; wk.walkT = 0; }

				} else if (wk.hunger === 'eating') {
					if (bentoStock > 0) { bentoStock--; wk.workCount = 0; wk.hunger = 'returning'; refreshUI(); }

				} else if (wk.hunger === 'returning') {
					const d2 = dist(wk.x, wk.y, wk.homeX, wk.homeY);
					if (d2 > 8) {
						const ddx = wk.homeX - wk.x, ddy = wk.homeY - wk.y;
						const dd = Math.sqrt(ddx * ddx + ddy * ddy);
						wk.x += (ddx / dd) * 2.5 * tf; wk.y += (ddy / dd) * 2.5 * tf;
						if (Math.abs(ddx) > 0.5) wk.face = ddx > 0 ? 1 : -1;
						wk.dir = moveDir(ddx, ddy);
						wk.walkT++;
					} else { wk.hunger = 'working'; wk.walkT = 0; }

				} else if (wk.hunger === 'working') {
					// Cutter AI
					if (wk === cutterWk) {
						if (wk.tgt && wk.tgt.c.destroyed) wk.tgt = null;
						if (!wk.tgt && trees.length > 0) {
							let best: Tree | null = null, bd = Infinity;
							for (let j = 0; j < trees.length; j++) {
								const d2 = dist(wk.x, wk.y, trees[j].x, trees[j].y);
								if (d2 < bd) { bd = d2; best = trees[j]; }
							}
							wk.tgt = best;
						}
						if (wk.tgt) {
							const d2 = dist(wk.x, wk.y, wk.tgt.x, wk.tgt.y);
							if (d2 > 25) {
								const ddx = wk.tgt.x - wk.x, ddy = wk.tgt.y - wk.y;
								const dd = Math.sqrt(ddx * ddx + ddy * ddy);
								wk.x += (ddx / dd) * 2 * tf; wk.y += (ddy / dd) * 2 * tf;
								if (Math.abs(ddx) > 0.5) wk.face = ddx > 0 ? 1 : -1;
								wk.dir = moveDir(ddx, ddy);
								wk.walkT++;
							} else {
								wk.walkT = 0; wk.atkT -= dt;
								if (wk.atkT <= 0) {
									wk.atkT = ACD;
									const before = trees.length;
									hitTree(wk.tgt as Tree);
									if (trees.length < before) {
										wk.tgt = null; wk.workCount++;
										if (wk.workCount >= 5) wk.hunger = 'toEat';
									}
								}
							}
						}
					}

					// Hunter AI
					if (hunterWks.indexOf(wk) >= 0) {
						if (wk.tgt && (wk.tgt as Beast).c.destroyed) wk.tgt = null;
						if (!wk.tgt && beasts.length > 0) {
							let best: Beast | null = null, bd = Infinity;
							for (let j = 0; j < beasts.length; j++) {
								const d2 = dist(wk.x, wk.y, beasts[j].x, beasts[j].y);
								if (d2 < bd) { bd = d2; best = beasts[j]; }
							}
							wk.tgt = best;
						}
						if (wk.tgt) {
							const d2 = dist(wk.x, wk.y, wk.tgt.x, wk.tgt.y);
							if (d2 > 25) {
								const ddx = wk.tgt.x - wk.x, ddy = wk.tgt.y - wk.y;
								const dd = Math.sqrt(ddx * ddx + ddy * ddy);
								wk.x += (ddx / dd) * 2 * tf; wk.y += (ddy / dd) * 2 * tf;
								if (Math.abs(ddx) > 0.5) wk.face = ddx > 0 ? 1 : -1;
								wk.dir = moveDir(ddx, ddy);
								wk.walkT++;
							} else {
								wk.walkT = 0; wk.atkT -= dt;
								if (wk.atkT <= 0) {
									wk.atkT = ACD;
									const before = beasts.length;
									hitBeast(wk.tgt as Beast);
									if (beasts.length < before) {
										wk.tgt = null; wk.workCount++;
										if (wk.workCount >= 5) wk.hunger = 'toEat';
									}
								}
							}
						}
					}
				}

				wk.c.x = wk.x; wk.c.y = wk.y; wk.c.zIndex = wk.y;
				wk.c.scale.x = 1;
				setWorkerTexture(wk);
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

	function restart() { if (cleanup) cleanup(); state = 'menu'; }
	function selectMode(mode: 'normal' | 'infinite') { startGame(mode); }
	onMount(function () { return function () { if (cleanup) cleanup(); }; });
</script>

<GameShell title="末日生存" onrestart={restart}>
	<div class="game-container" bind:this={containerEl}></div>

	{#if state === 'menu'}
		<div class="menu-overlay">
			<div class="menu-box">
				<p class="menu-title">末日生存</p>
				<div class="menu-modes">
					<button class="menu-mode" onclick={() => selectMode('normal')}>
						<span class="menu-mode-name">一般模式</span>
						<span class="menu-mode-desc">3 分鐘限時挑戰</span>
					</button>
					<button class="menu-mode" onclick={() => selectMode('infinite')}>
						<span class="menu-mode-name">無限模式</span>
						<span class="menu-mode-desc">無時間限制</span>
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if state === 'result'}
		<div class="overlay">
			<div class="overlay-box result">
				<p class="title">時間到！</p>
				<div class="stats">
					<div class="stat-row"><span>🌲 砍倒木頭</span><span>{resultData.trees}</span></div>
					<div class="stat-row"><span>🐻 獵殺熊</span><span>{resultData.animals}</span></div>
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

	.menu-overlay {
		position: fixed;
		inset: 0;
		background: rgba(12, 12, 14, 0.85);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.menu-box {
		text-align: center;
		padding: 2rem 3rem;
		border-radius: 12px;
		background: #1c1e22;
		border: 1px solid rgba(180, 160, 130, 0.12);
		box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
	}

	.menu-title {
		font-family: 'Audiowide', sans-serif;
		font-size: 1.8rem;
		color: var(--neon-pink, #c4956a);
		text-shadow: 0 0 8px rgba(196, 149, 106, 0.5);
		margin: 0 0 1.5rem;
	}

	.menu-modes {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.menu-mode {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding: 1rem 2.5rem;
		border: 1px solid rgba(180, 160, 130, 0.25);
		background: rgba(180, 160, 130, 0.06);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.menu-mode:hover {
		background: rgba(180, 160, 130, 0.14);
		border-color: rgba(200, 175, 140, 0.4);
	}

	.menu-mode:active {
		background: rgba(180, 160, 130, 0.2);
	}

	.menu-mode-name {
		font-family: 'Audiowide', sans-serif;
		font-size: 1.1rem;
		color: #d4cfc8;
	}

	.menu-mode-desc {
		font-family: 'Arial', sans-serif;
		font-size: 0.8rem;
		color: #706b63;
	}
</style>
