import Phaser from 'phaser';
import {
	COLORS,
	ENEMY_GRID,
	GAME_HEIGHT,
	GAME_WIDTH,
	HEALTH_BAR,
	INFO_DRAWER,
	ITEM_SLOTS,
	PLAYER,
	SKILL_SLOTS,
	UI_BUTTON,
	ZONES
} from '../config';
import {
	CharacterStats,
	ITEMS,
	ItemType,
	WEAPONS,
	ARMORS,
	createDefaultArmor,
	createDefaultWeapon
} from '../entities';
import { GameState } from '../state';
import type { StageConfig, WaveConfig, WinCondition, EnemySpawn, MonsterInstance } from '../data';
import { createMonsterInstance, createMonsterFromLegacy } from '../data';

// 血量條結構
interface HealthBar {
	background: Phaser.GameObjects.Rectangle;
	fill: Phaser.GameObjects.Rectangle;
}

// 資訊抽屜結構
interface InfoDrawer {
	container: Phaser.GameObjects.Container;
	background: Phaser.GameObjects.Rectangle;
	nameText: Phaser.GameObjects.Text;
	healthText: Phaser.GameObjects.Text;
	statsTexts: Phaser.GameObjects.Text[];
	weaponText: Phaser.GameObjects.Text;
	armorText: Phaser.GameObjects.Text;
	itemsText: Phaser.GameObjects.Text;
}

// 道具格結構
interface ItemSlot {
	background: Phaser.GameObjects.Rectangle;
	text: Phaser.GameObjects.Text | null;
	index: number;
}

// 敵人實體結構（運行時）
interface EnemyEntity {
	gameObject: Phaser.GameObjects.Rectangle;
	healthBar: HealthBar;
	stats: CharacterStats;
	instance: MonsterInstance;
	isAlive: boolean;
}

export class MainScene extends Phaser.Scene {
	private player!: Phaser.GameObjects.Sprite;
	private gridPositions: { x: number; y: number }[] = [];

	// 玩家狀態
	private playerStats!: CharacterStats;
	private playerHealthBar!: HealthBar;

	// 敵人管理
	private enemies: EnemyEntity[] = [];
	private selectedEnemyIndex: number = 0;

	// 資訊抽屜
	private infoDrawer!: InfoDrawer;
	private isDrawerOpen: boolean = false;
	private clickedOnCharacter: boolean = false;

	// 回合系統
	private turnCount: number = 0;
	private turnText!: Phaser.GameObjects.Text;

	// 波次系統
	private currentWaveIndex: number = 0;
	private waveInfoText!: Phaser.GameObjects.Text;
	private winConditionText!: Phaser.GameObjects.Text;

	// 道具格
	private itemSlots: ItemSlot[] = [];

	// 遊戲狀態
	private gameState!: GameState;
	private stageInfoText!: Phaser.GameObjects.Text;

	constructor() {
		super({ key: 'MainScene' });
	}

	preload() {
		// 載入玩家圖片
		this.load.image('player', '/src/lib/assets/player.png');
	}

	create() {
		// 重置波次
		this.currentWaveIndex = 0;
		this.turnCount = 0;
		this.enemies = [];

		// 初始化遊戲狀態
		this.gameState = GameState.getInstance();
		this.playerStats = this.gameState.playerStats;

		// 建立深綠色背景（敵人區域）
		this.cameras.main.setBackgroundColor(COLORS.background);

		// 繪製 UI 區域
		this.createZones();

		// 繪製敵人格子 (5x4)
		this.createEnemyGrid();

		// 建立玩家
		this.createPlayer();

		// 建立玩家血量條
		this.createPlayerHealthBar();

		// 建立技能格
		this.createSkillSlots();

		// 建立道具格
		this.createItemSlots();

		// 建立 UI
		this.createUI();

		// 建立資訊抽屜
		this.createInfoDrawer();

		// 生成第一波敵人
		this.spawnWave();

		// 設置角色互動
		this.setupCharacterInteraction();
	}

	/**
	 * 建立區域背景
	 */
	private createZones() {
		// 繪製 UI 區域（最底部）
		this.add.rectangle(
			GAME_WIDTH / 2,
			GAME_HEIGHT - ZONES.uiAreaHeight / 2,
			GAME_WIDTH,
			ZONES.uiAreaHeight,
			Phaser.Display.Color.HexStringToColor(COLORS.uiArea).color
		);

		// 繪製技能格區域（UI 區域上方）
		const skillRowY = GAME_HEIGHT - ZONES.uiAreaHeight - ZONES.skillRowHeight / 2;
		this.add.rectangle(
			GAME_WIDTH / 2,
			skillRowY,
			GAME_WIDTH,
			ZONES.skillRowHeight,
			Phaser.Display.Color.HexStringToColor(COLORS.uiArea).color
		);

		// 繪製道具格區域（技能格上方）
		const itemRowY =
			GAME_HEIGHT - ZONES.uiAreaHeight - ZONES.skillRowHeight - ZONES.itemRowHeight / 2;
		this.add.rectangle(
			GAME_WIDTH / 2,
			itemRowY,
			GAME_WIDTH,
			ZONES.itemRowHeight,
			Phaser.Display.Color.HexStringToColor(COLORS.uiArea).color
		);

		// 繪製玩家區域（道具格上方）
		const playerAreaY =
			GAME_HEIGHT -
			ZONES.uiAreaHeight -
			ZONES.skillRowHeight -
			ZONES.itemRowHeight -
			ZONES.playerAreaHeight / 2;
		this.add.rectangle(
			GAME_WIDTH / 2,
			playerAreaY,
			GAME_WIDTH,
			ZONES.playerAreaHeight,
			Phaser.Display.Color.HexStringToColor(COLORS.playerArea).color
		);

		// 繪製區域分隔線
		const dividerPositions = [
			GAME_HEIGHT -
				ZONES.uiAreaHeight -
				ZONES.skillRowHeight -
				ZONES.itemRowHeight -
				ZONES.playerAreaHeight,
			GAME_HEIGHT - ZONES.uiAreaHeight - ZONES.skillRowHeight - ZONES.itemRowHeight,
			GAME_HEIGHT - ZONES.uiAreaHeight - ZONES.skillRowHeight,
			GAME_HEIGHT - ZONES.uiAreaHeight
		];

		for (const y of dividerPositions) {
			this.add.rectangle(GAME_WIDTH / 2, y, GAME_WIDTH, 2, COLORS.zoneDivider);
		}
	}

	/**
	 * 建立敵人格子
	 */
	private createEnemyGrid() {
		const { columns, rows, cellSize, gap, topPadding, strokeWidth } = ENEMY_GRID;

		// 計算起始位置
		const totalWidth = columns * cellSize + (columns - 1) * gap;
		const startX = (GAME_WIDTH - totalWidth) / 2 + cellSize / 2;
		const startY = topPadding + cellSize / 2;

		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < columns; col++) {
				const x = startX + col * (cellSize + gap);
				const y = startY + row * (cellSize + gap);

				// 繪製格子邊框
				const cell = this.add.rectangle(x, y, cellSize, cellSize);
				cell.setStrokeStyle(strokeWidth, COLORS.enemySlotStroke);
				cell.setFillStyle();

				// 儲存格子位置
				this.gridPositions.push({ x, y });
			}
		}
	}

	/**
	 * 建立玩家
	 */
	private createPlayer() {
		const playerY =
			GAME_HEIGHT -
			ZONES.uiAreaHeight -
			ZONES.skillRowHeight -
			ZONES.itemRowHeight -
			ZONES.playerAreaHeight / 2;
		this.player = this.add.sprite(GAME_WIDTH / 2, playerY, 'player');

		// 縮放圖片以適應玩家區域（保持比例）
		const targetHeight = ZONES.playerAreaHeight - 20;
		const scale = targetHeight / this.player.height;
		this.player.setScale(scale);
		this.player.setDepth(10);
	}

	/**
	 * 建立玩家血量條
	 */
	private createPlayerHealthBar() {
		const playerDisplayHeight = this.player.displayHeight;
		this.playerHealthBar = this.createHealthBar(
			this.player.x,
			this.player.y - playerDisplayHeight / 2 - HEALTH_BAR.offsetY
		);
	}

	/**
	 * 生成當前波次的敵人
	 */
	private spawnWave() {
		// 清除舊敵人
		this.clearEnemies();

		const stageConfig = this.gameState.currentStageConfig;
		const wave = stageConfig.waves[this.currentWaveIndex];

		if (!wave) {
			console.error('No wave found at index', this.currentWaveIndex);
			return;
		}

		console.log(`\n========== 波次 ${this.currentWaveIndex + 1}/${stageConfig.waves.length} ==========`);
		console.log(`勝利條件: ${this.getWinConditionText(wave.winCondition)}`);

		// 生成每個敵人
		for (const spawn of wave.enemies) {
			this.spawnEnemy(spawn, stageConfig);
		}

		// 選中第一個敵人
		this.selectedEnemyIndex = 0;
		this.highlightSelectedEnemy();

		// 更新波次資訊
		this.updateWaveInfo();
	}

	/**
	 * 生成單個敵人
	 */
	private spawnEnemy(spawn: EnemySpawn, stageConfig: StageConfig) {
		// 建立怪物實例
		let instance: MonsterInstance | null;

		if (spawn.monsterId.startsWith('legacy_')) {
			instance = createMonsterFromLegacy(spawn, stageConfig);
		} else {
			instance = createMonsterInstance(
				spawn.monsterId,
				stageConfig.tier,
				spawn.position,
				spawn.instanceId
			);
		}

		if (!instance) {
			console.error('Failed to create monster instance:', spawn.monsterId);
			return;
		}

		// 計算位置
		const { columns } = ENEMY_GRID;
		const gridIndex = spawn.position.row * columns + spawn.position.col;
		const position = this.gridPositions[gridIndex];

		if (!position) {
			console.error('Invalid grid position:', spawn.position);
			return;
		}

		// 建立敵人圖形
		const { cellSize, strokeWidth } = ENEMY_GRID;
		const enemyColor = instance.color;
		const enemyStrokeColor = Phaser.Display.Color.ValueToColor(enemyColor).darken(30).color;

		const gameObject = this.add.rectangle(
			position.x,
			position.y,
			cellSize - 10,
			cellSize - 10,
			enemyColor
		);
		gameObject.setStrokeStyle(strokeWidth, enemyStrokeColor);
		gameObject.setDepth(10);

		// 建立敵人狀態
		const stats = new CharacterStats(
			instance.attributes,
			{},
			{
				weapon: instance.weapon ? WEAPONS[instance.weapon] : createDefaultWeapon(),
				armor: instance.armor ? ARMORS[instance.armor] : createDefaultArmor(),
				items: [],
				maxItemSlots: 0
			}
		);

		// 建立血量條
		const healthBar = this.createHealthBar(
			position.x,
			position.y - (cellSize - 10) / 2 - HEALTH_BAR.offsetY
		);

		// 建立敵人實體
		const enemy: EnemyEntity = {
			gameObject,
			healthBar,
			stats,
			instance,
			isAlive: true
		};

		this.enemies.push(enemy);

		// 設置互動
		gameObject.setInteractive({ useHandCursor: true });
		const enemyIndex = this.enemies.length - 1;

		gameObject.on('pointerdown', () => {
			this.clickedOnCharacter = true;
			this.selectedEnemyIndex = enemyIndex;
			this.highlightSelectedEnemy();
			this.openDrawer(instance!.name, stats);
		});

		console.log(`[生成] ${instance.name} 在位置 (${spawn.position.row}, ${spawn.position.col})`);
	}

	/**
	 * 清除所有敵人
	 */
	private clearEnemies() {
		for (const enemy of this.enemies) {
			enemy.gameObject.destroy();
			enemy.healthBar.background.destroy();
			enemy.healthBar.fill.destroy();
		}
		this.enemies = [];
	}

	/**
	 * 高亮選中的敵人
	 */
	private highlightSelectedEnemy() {
		for (let i = 0; i < this.enemies.length; i++) {
			const enemy = this.enemies[i];
			if (!enemy.isAlive) continue;

			if (i === this.selectedEnemyIndex) {
				enemy.gameObject.setStrokeStyle(3, 0xffff00); // 黃色高亮
			} else {
				const strokeColor = Phaser.Display.Color.ValueToColor(enemy.instance.color).darken(30).color;
				enemy.gameObject.setStrokeStyle(ENEMY_GRID.strokeWidth, strokeColor);
			}
		}
	}

	/**
	 * 建立單一血量條
	 */
	private createHealthBar(x: number, y: number): HealthBar {
		const { width, height, strokeWidth } = HEALTH_BAR;

		const background = this.add.rectangle(x, y, width, height, COLORS.healthBarBackground);
		background.setStrokeStyle(strokeWidth, COLORS.healthBarStroke);
		background.setDepth(20);

		const fillX = x - width / 2 + 1;
		const fill = this.add.rectangle(fillX, y, width - 2, height - 2, COLORS.healthBarFill);
		fill.setOrigin(0, 0.5);
		fill.setDepth(21);

		return { background, fill };
	}

	/**
	 * 更新血量條
	 */
	private updateHealthBar(healthBar: HealthBar, stats: CharacterStats) {
		const { width } = HEALTH_BAR;
		const healthPercent = stats.currentHealth / stats.derived.healthPoints;
		const newWidth = Math.max(0, (width - 2) * healthPercent);

		healthBar.fill.width = newWidth;

		// 低血量變紅
		if (healthPercent <= 0.3) {
			healthBar.fill.setFillStyle(COLORS.healthBarLow);
		} else {
			healthBar.fill.setFillStyle(COLORS.healthBarFill);
		}
	}

	/**
	 * 建立技能格
	 */
	private createSkillSlots() {
		const { size, gap, padding } = SKILL_SLOTS;
		const skillRowY = GAME_HEIGHT - ZONES.uiAreaHeight - ZONES.skillRowHeight / 2;

		// 從左側開始排列
		const startX = padding + size / 2;

		for (let i = 0; i < 3; i++) {
			const x = startX + i * (size + gap);
			const slot = this.add.rectangle(x, skillRowY, size, size, COLORS.skillSlot);
			slot.setStrokeStyle(2, COLORS.skillSlotStroke);
		}
	}

	/**
	 * 建立道具格
	 */
	private createItemSlots() {
		const { size, gap, padding } = ITEM_SLOTS;
		const itemRowY =
			GAME_HEIGHT - ZONES.uiAreaHeight - ZONES.skillRowHeight - ZONES.itemRowHeight / 2;

		// 從左側開始排列
		const startX = padding + size / 2;

		this.itemSlots = [];

		for (let i = 0; i < this.playerStats.maxItemSlots; i++) {
			const x = startX + i * (size + gap);

			const hasItem = i < this.playerStats.items.length;
			const bgColor = hasItem ? COLORS.itemSlotFilled : COLORS.itemSlot;

			const background = this.add.rectangle(x, itemRowY, size, size, bgColor);
			background.setStrokeStyle(2, COLORS.itemSlotStroke);

			let text: Phaser.GameObjects.Text | null = null;
			if (hasItem) {
				const item = this.playerStats.items[i];
				text = this.add.text(x, itemRowY, item.name.charAt(0), {
					fontSize: '16px',
					color: '#ffffff',
					fontFamily: 'Arial'
				});
				text.setOrigin(0.5);
			}

			const slot: ItemSlot = { background, text, index: i };
			this.itemSlots.push(slot);

			if (hasItem) {
				background.setInteractive({ useHandCursor: true });

				background.on('pointerover', () => {
					background.setStrokeStyle(3, COLORS.itemSlotStroke);
				});

				background.on('pointerout', () => {
					background.setStrokeStyle(2, COLORS.itemSlotStroke);
				});

				background.on('pointerdown', () => {
					this.useItemAtSlot(i);
				});
			}
		}
	}

	/**
	 * 使用道具
	 */
	private useItemAtSlot(index: number) {
		// 記錄使用前的血量
		const oldHealth = this.playerStats.currentHealth;
		
		if (this.playerStats.useItem(index)) {
			// 計算回復量
			const healAmount = this.playerStats.currentHealth - oldHealth;
			
			this.updateHealthBar(this.playerHealthBar, this.playerStats);
			this.flashEffect(this.player, 0x00ff00);
			
			// 顯示回復數字（如果有回復）
			if (healAmount > 0) {
				this.showDamageNumber(this.player.x, this.player.y, healAmount, false, true);
				console.log(`[使用道具] 回復血量: +${healAmount.toFixed(1)} (${oldHealth.toFixed(1)} → ${this.playerStats.currentHealth.toFixed(1)})`);
			}
			
			this.updateItemSlots();

			if (this.isDrawerOpen) {
				this.updateDrawerContent('玩家', this.playerStats);
			}
		}
	}

	/**
	 * 更新道具格
	 */
	private updateItemSlots() {
		for (const slot of this.itemSlots) {
			slot.background.destroy();
			if (slot.text) slot.text.destroy();
		}
		this.createItemSlots();
	}

	/**
	 * 建立 UI 元件
	 */
	private createUI() {
		const { width, height, padding, strokeWidth, fontSize } = UI_BUTTON;
		const stageConfig = this.gameState.currentStageConfig;

		// 關卡資訊（頂部）- 使用整數位置和較大字體減少模糊
		const { currentMapLevel, currentStage, currentStageNumber } = this.gameState;
		this.stageInfoText = this.add.text(
			Math.floor(GAME_WIDTH / 2),
			10,
			`${currentMapLevel}級 - ${currentStage}/3（${currentStageNumber}/15）${stageConfig.name}`,
			{ fontSize: '12px', color: '#cccccc', fontFamily: 'Arial' }
		);
		this.stageInfoText.setOrigin(0.5, 0);
		this.stageInfoText.setDepth(50);

		// 波次資訊
		this.waveInfoText = this.add.text(Math.floor(GAME_WIDTH / 2), 26, '', {
			fontSize: '11px',
			color: '#88aaff',
			fontFamily: 'Arial'
		});
		this.waveInfoText.setOrigin(0.5, 0);
		this.waveInfoText.setDepth(50);

		// 勝利條件
		this.winConditionText = this.add.text(Math.floor(GAME_WIDTH / 2), 40, '', {
			fontSize: '11px',
			color: '#ffaa88',
			fontFamily: 'Arial'
		});
		this.winConditionText.setOrigin(0.5, 0);
		this.winConditionText.setDepth(50);

		this.updateWaveInfo();

		// 按鈕位置（左下角）
		const buttonX = padding + width / 2;
		const buttonY = GAME_HEIGHT - ZONES.uiAreaHeight / 2;

		// 建立按鈕背景
		const button = this.add.rectangle(buttonX, buttonY, width, height, COLORS.button);
		button.setStrokeStyle(strokeWidth, COLORS.buttonStroke);
		button.setInteractive({ useHandCursor: true });

		// 建立按鈕文字
		const buttonText = this.add.text(buttonX, buttonY, '下一回合', {
			fontSize: `${fontSize}px`,
			color: '#ffffff',
			fontFamily: 'Arial'
		});
		buttonText.setOrigin(0.5);

		// 建立回合數顯示（右側）
		this.turnText = this.add.text(GAME_WIDTH - padding, buttonY, `回合: ${this.turnCount}`, {
			fontSize: `${fontSize}px`,
			color: '#ffffff',
			fontFamily: 'Arial'
		});
		this.turnText.setOrigin(1, 0.5);

		// 按鈕互動
		button.on('pointerover', () => button.setFillStyle(COLORS.buttonHover));
		button.on('pointerout', () => button.setFillStyle(COLORS.button));
		button.on('pointerdown', () => this.nextTurn());
	}

	/**
	 * 更新波次資訊
	 */
	private updateWaveInfo() {
		const stageConfig = this.gameState.currentStageConfig;
		const wave = stageConfig.waves[this.currentWaveIndex];

		this.waveInfoText.setText(`波次 ${this.currentWaveIndex + 1}/${stageConfig.waves.length}`);
		this.winConditionText.setText(`目標: ${this.getWinConditionText(wave.winCondition)}`);
	}

	/**
	 * 取得勝利條件文字
	 */
	private getWinConditionText(condition: WinCondition): string {
		switch (condition.type) {
			case 'annihilation':
				return '消滅所有敵人';
			case 'survive':
				return `存活 ${condition.rounds} 回合`;
			case 'target':
				return '擊敗目標敵人';
			default:
				return '未知';
		}
	}

	/**
	 * 執行下一回合
	 */
	private nextTurn() {
		if (!this.playerStats.isAlive) {
			console.log('遊戲已結束，無法繼續回合');
			return;
		}

		this.turnCount++;
		this.turnText.setText(`回合: ${this.turnCount}`);

		console.log(`\n========== 回合 ${this.turnCount} ==========`);

		// 玩家攻擊選中的敵人
		this.playerAttack();

		// 檢查勝利條件
		if (this.checkWinCondition()) {
			this.onWaveComplete();
			return;
		}

		// 敵人攻擊
		this.enemiesAttack();

		// 檢查玩家是否存活
		if (!this.playerStats.isAlive) {
			this.onPlayerDefeated();
			return;
		}

		// 回合結束回復
		this.applyEndOfTurnEffects();
	}

	/**
	 * 玩家攻擊
	 */
	private playerAttack() {
		const enemy = this.enemies[this.selectedEnemyIndex];
		if (!enemy || !enemy.isAlive) {
			// 找一個活著的敵人
			const aliveIndex = this.enemies.findIndex((e) => e.isAlive);
			if (aliveIndex === -1) return;
			this.selectedEnemyIndex = aliveIndex;
		}

		const target = this.enemies[this.selectedEnemyIndex];
		if (!target || !target.isAlive) return;

		let damage = this.playerStats.derived.meleeAttack;
		let isCritical = false;

		if (this.playerStats.rollCritical()) {
			damage = this.playerStats.calculateCriticalDamage(damage);
			isCritical = true;
		}

		const actualDamage = target.stats.takeDamage(damage);
		this.updateHealthBar(target.healthBar, target.stats);
		this.flashEffect(target.gameObject, 0xffffff);

		// 顯示傷害數字
		const enemyX = target.gameObject.x;
		const enemyY = target.gameObject.y;
		this.showDamageNumber(enemyX, enemyY, actualDamage, isCritical, false);

		console.log(
			`[玩家攻擊] ${target.instance.name} ${isCritical ? '💥暴擊！' : ''} 傷害: ${damage.toFixed(1)} → 實際: ${actualDamage.toFixed(1)}`
		);

		// 檢查敵人是否死亡
		if (!target.stats.isAlive) {
			this.onEnemyDefeated(this.selectedEnemyIndex);
		}
	}

	/**
	 * 敵人攻擊
	 */
	private enemiesAttack() {
		for (const enemy of this.enemies) {
			if (!enemy.isAlive) continue;

			let damage = enemy.stats.derived.meleeAttack;
			let isCritical = false;

			if (enemy.stats.rollCritical()) {
				damage = enemy.stats.calculateCriticalDamage(damage);
				isCritical = true;
			}

			const actualDamage = this.playerStats.takeDamage(damage);
			this.updateHealthBar(this.playerHealthBar, this.playerStats);
			this.flashEffect(this.player, 0xff0000);

			// 顯示傷害數字
			this.showDamageNumber(this.player.x, this.player.y, actualDamage, isCritical, false);

			console.log(
				`[${enemy.instance.name}攻擊] ${isCritical ? '💥暴擊！' : ''} 傷害: ${damage.toFixed(1)} → 實際: ${actualDamage.toFixed(1)}`
			);

			if (!this.playerStats.isAlive) break;
		}
	}

	/**
	 * 回合結束效果
	 */
	private applyEndOfTurnEffects() {
		// 玩家回復
		const playerOldHealth = this.playerStats.currentHealth;
		this.playerStats.applyRegeneration();
		const playerHealAmount = this.playerStats.currentHealth - playerOldHealth;
		this.updateHealthBar(this.playerHealthBar, this.playerStats);
		
		// 顯示玩家回復數字（如果有回復）
		if (playerHealAmount > 0) {
			this.showDamageNumber(this.player.x, this.player.y, playerHealAmount, false, true);
			console.log(`[回合結束] 玩家回復血量: +${playerHealAmount.toFixed(1)} (${playerOldHealth.toFixed(1)} → ${this.playerStats.currentHealth.toFixed(1)})`);
		}

		// 敵人回復
		for (const enemy of this.enemies) {
			if (enemy.isAlive) {
				const enemyOldHealth = enemy.stats.currentHealth;
				enemy.stats.applyRegeneration();
				const enemyHealAmount = enemy.stats.currentHealth - enemyOldHealth;
				this.updateHealthBar(enemy.healthBar, enemy.stats);
				
				// 顯示敵人回復數字（如果有回復）
				if (enemyHealAmount > 0) {
					this.showDamageNumber(enemy.gameObject.x, enemy.gameObject.y, enemyHealAmount, false, true);
					console.log(`[回合結束] ${enemy.instance.name} 回復血量: +${enemyHealAmount.toFixed(1)} (${enemyOldHealth.toFixed(1)} → ${enemy.stats.currentHealth.toFixed(1)})`);
				}
			}
		}

		console.log(`[回合結束] 玩家血量: ${this.playerStats.currentHealth.toFixed(1)}/${this.playerStats.derived.healthPoints}`);
	}

	/**
	 * 檢查勝利條件
	 */
	private checkWinCondition(): boolean {
		const wave = this.gameState.currentStageConfig.waves[this.currentWaveIndex];
		const condition = wave.winCondition;

		if (condition.type === 'annihilation') {
			return this.enemies.every((e) => !e.isAlive);
		}

		if (condition.type === 'survive') {
			return this.turnCount >= condition.rounds;
		}

		if (condition.type === 'target') {
			const targetEnemy = this.enemies.find(
				(e) => e.instance.instanceId === condition.targetId
			);
			return targetEnemy ? !targetEnemy.isAlive : false;
		}

		return false;
	}

	/**
	 * 敵人被擊敗
	 */
	private onEnemyDefeated(index: number) {
		const enemy = this.enemies[index];
		enemy.isAlive = false;
		enemy.gameObject.setVisible(false);
		enemy.gameObject.disableInteractive();
		enemy.healthBar.background.setVisible(false);
		enemy.healthBar.fill.setVisible(false);

		// 獲得點數
		const points = enemy.instance.pointReward;
		this.gameState.addPoints(points);

		console.log(`🎉 ${enemy.instance.name} 被擊敗！獲得 ${points} 點數`);

		// 關閉抽屜
		this.closeDrawer();

		// 選擇下一個活著的敵人
		const nextAlive = this.enemies.findIndex((e) => e.isAlive);
		if (nextAlive !== -1) {
			this.selectedEnemyIndex = nextAlive;
			this.highlightSelectedEnemy();
		}
	}

	/**
	 * 波次完成
	 */
	private onWaveComplete() {
		const stageConfig = this.gameState.currentStageConfig;
		const wave = stageConfig.waves[this.currentWaveIndex];

		// 獲得波次獎勵
		this.gameState.addPoints(wave.reward.points);
		console.log(`🎉 波次完成！獲得 ${wave.reward.points} 點數獎勵`);

		// 檢查是否還有下一波
		if (this.currentWaveIndex < stageConfig.waves.length - 1) {
			// 下一波
			this.currentWaveIndex++;

			// 顯示波次完成訊息
			const waveText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '波次完成！', {
				fontSize: '24px',
				color: '#00ff00',
				fontFamily: 'Arial',
				fontStyle: 'bold'
			});
			waveText.setOrigin(0.5);
			waveText.setDepth(100);

			this.time.delayedCall(1000, () => {
				waveText.destroy();
				this.spawnWave();
			});
		} else {
			// 關卡完成
			this.onStageComplete();
		}
	}

	/**
	 * 關卡完成
	 */
	private onStageComplete() {
		console.log('🎉 關卡完成！');

		// 使用 ProgressManager 處理進度
		const result = this.gameState.nextStage();

		// 顯示勝利訊息
		let victoryMessage = '關卡通關！';
		if (result.promoted && result.newTier) {
			victoryMessage = `🎉 晉級到 ${result.newTier} 級！`;
		}

		const victoryText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, victoryMessage, {
			fontSize: '32px',
			color: result.promoted ? '#ffcc00' : '#00ff00',
			fontFamily: 'Arial',
			fontStyle: 'bold'
		});
		victoryText.setOrigin(0.5);
		victoryText.setDepth(100);

		// 顯示獲得的點數
		const totalPoints = this.gameState.points;
		const pointsText = this.add.text(
			GAME_WIDTH / 2,
			GAME_HEIGHT / 2 + 40,
			`總點數: ${totalPoints}`,
			{
				fontSize: '18px',
				color: '#ffcc00',
				fontFamily: 'Arial'
			}
		);
		pointsText.setOrigin(0.5);
		pointsText.setDepth(100);

		// 延遲後進入補給場景
		this.time.delayedCall(2000, () => {
			this.scene.start('SupplyScene');
		});
	}

	/**
	 * 玩家被擊敗
	 */
	private onPlayerDefeated() {
		console.log('💀 玩家被擊敗！遊戲結束');
		this.player.setTint(0x555555);

		const gameOverText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '遊戲結束', {
			fontSize: '32px',
			color: '#ff0000',
			fontFamily: 'Arial',
			fontStyle: 'bold'
		});
		gameOverText.setOrigin(0.5);
		gameOverText.setDepth(100);
	}

	/**
	 * 閃爍效果
	 */
	private flashEffect(
		target: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite,
		color: number
	) {
		if (target instanceof Phaser.GameObjects.Sprite) {
			target.setTint(color);
			this.time.delayedCall(100, () => {
				target.clearTint();
			});
		} else {
			const originalColor = target.fillColor;
			target.setFillStyle(color);
			this.time.delayedCall(100, () => {
				target.setFillStyle(originalColor);
			});
		}
	}

	/**
	 * 顯示傷害數字
	 * @param x X 座標
	 * @param y Y 座標
	 * @param damage 傷害值
	 * @param isCritical 是否為暴擊
	 * @param isHeal 是否為回復（預設為 false，表示傷害）
	 */
	private showDamageNumber(
		x: number,
		y: number,
		damage: number,
		isCritical: boolean = false,
		isHeal: boolean = false
	) {
		// 格式化數字（整數顯示，小數點後一位）
		const damageText = damage.toFixed(damage % 1 === 0 ? 0 : 1);
		const prefix = isHeal ? '+' : '-';

		// 根據類型設定顏色和大小
		let color: string;
		let fontSize: number;
		let offsetY: number; // 垂直偏移（暴擊時稍微向上）

		if (isHeal) {
			// 回復：綠色
			color = '#00ff00';
			fontSize = isCritical ? 24 : 18;
			offsetY = isCritical ? -10 : 0;
		} else if (isCritical) {
			// 暴擊傷害：金色，更大
			color = '#ffcc00';
			fontSize = 24;
			offsetY = -10;
		} else {
			// 普通傷害：白色
			color = '#ffffff';
			fontSize = 18;
			offsetY = 0;
		}

		// 建立文字物件
		const text = this.add.text(x, y + offsetY, `${prefix}${damageText}`, {
			fontSize: `${fontSize}px`,
			color: color,
			fontFamily: 'Arial',
			fontStyle: 'bold',
			stroke: '#000000',
			strokeThickness: 3
		});
		text.setOrigin(0.5);
		text.setDepth(200); // 確保在最上層

		// 浮動動畫：向上移動並淡出
		const duration = isCritical ? 1000 : 800;
		const distance = isCritical ? 60 : 40;

		// 向上移動
		this.tweens.add({
			targets: text,
			y: y + offsetY - distance,
			duration: duration,
			ease: 'Power2'
		});

		// 淡出
		this.tweens.add({
			targets: text,
			alpha: 0,
			duration: duration,
			ease: 'Power2',
			onComplete: () => {
				text.destroy();
			}
		});

		// 暴擊時額外效果：稍微放大再縮小
		if (isCritical) {
			text.setScale(1.5);
			this.tweens.add({
				targets: text,
				scale: 1.0,
				duration: 200,
				ease: 'Back.easeOut'
			});
		}
	}

	/**
	 * 設置角色互動
	 */
	private setupCharacterInteraction() {
		// 玩家互動
		this.player.setInteractive({ useHandCursor: true });
		this.player.on('pointerdown', () => {
			this.clickedOnCharacter = true;
			this.openDrawer('玩家', this.playerStats);
		});

		// 背景點擊關閉抽屜
		this.input.on('pointerdown', () => {
			this.time.delayedCall(10, () => {
				if (!this.clickedOnCharacter && this.isDrawerOpen) {
					this.closeDrawer();
				}
				this.clickedOnCharacter = false;
			});
		});
	}

	/**
	 * 建立資訊抽屜
	 */
	private createInfoDrawer() {
		const { height, backgroundColor, borderColor, padding } = INFO_DRAWER;

		// 建立容器
		const container = this.add.container(0, -height);
		container.setDepth(200);

		// 背景
		const background = this.add.rectangle(
			GAME_WIDTH / 2,
			height / 2,
			GAME_WIDTH,
			height,
			backgroundColor
		);
		background.setStrokeStyle(2, borderColor);
		container.add(background);

		// 文字元素
		const nameText = this.add
			.text(padding, padding, '', {
				fontSize: '14px',
				color: '#ffffff',
				fontFamily: 'Arial',
				fontStyle: 'bold'
			})
			.setDepth(201);
		container.add(nameText);

		const healthText = this.add
			.text(padding, padding + 22, '', {
				fontSize: '12px',
				color: '#ffffff',
				fontFamily: 'Arial'
			})
			.setDepth(201);
		container.add(healthText);

		const statsTexts: Phaser.GameObjects.Text[] = [];
		const statsY = padding + 44;
		const statNames = ['力量', '敏捷', '體力', '智力', '意志', '幸運'];

		for (let i = 0; i < 6; i++) {
			const col = i < 3 ? 0 : 1;
			const row = i % 3;
			const x = padding + col * 100;
			const y = statsY + row * 18;
			const text = this.add
				.text(x, y, `${statNames[i]}: --`, {
					fontSize: '11px',
					color: '#aaaaaa',
					fontFamily: 'Arial'
				})
				.setDepth(201);
			container.add(text);
			statsTexts.push(text);
		}

		const equipY = statsY + 60;
		const weaponText = this.add
			.text(padding, equipY, '', {
				fontSize: '11px',
				color: '#4a9eff',
				fontFamily: 'Arial'
			})
			.setDepth(201);
		container.add(weaponText);

		const armorText = this.add
			.text(padding, equipY + 18, '', {
				fontSize: '11px',
				color: '#4a9eff',
				fontFamily: 'Arial'
			})
			.setDepth(201);
		container.add(armorText);

		const itemsText = this.add
			.text(padding, equipY + 36, '', {
				fontSize: '11px',
				color: '#4a9eff',
				fontFamily: 'Arial'
			})
			.setDepth(201);
		container.add(itemsText);

		this.infoDrawer = {
			container,
			background,
			nameText,
			healthText,
			statsTexts,
			weaponText,
			armorText,
			itemsText
		};
	}

	/**
	 * 開啟資訊抽屜
	 */
	private openDrawer(name: string, stats: CharacterStats) {
		this.updateDrawerContent(name, stats);

		if (!this.isDrawerOpen) {
			this.tweens.add({
				targets: this.infoDrawer.container,
				y: 0,
				duration: 200,
				ease: 'Power2'
			});
			this.isDrawerOpen = true;
		}
	}

	/**
	 * 關閉資訊抽屜
	 */
	private closeDrawer() {
		if (this.isDrawerOpen) {
			this.tweens.add({
				targets: this.infoDrawer.container,
				y: -INFO_DRAWER.height,
				duration: 200,
				ease: 'Power2'
			});
			this.isDrawerOpen = false;
		}
	}

	/**
	 * 更新抽屜內容
	 */
	private updateDrawerContent(name: string, stats: CharacterStats) {
		this.infoDrawer.nameText.setText(name);
		this.infoDrawer.healthText.setText(
			`HP: ${stats.currentHealth.toFixed(0)}/${stats.derived.healthPoints} | MP: ${stats.currentMana.toFixed(0)}/${stats.derived.manaPoints}`
		);

		const primary = stats.primary;
		this.infoDrawer.statsTexts[0].setText(`力量: ${primary.strength}`);
		this.infoDrawer.statsTexts[1].setText(`敏捷: ${primary.agility}`);
		this.infoDrawer.statsTexts[2].setText(`體力: ${primary.vitality}`);
		this.infoDrawer.statsTexts[3].setText(`智力: ${primary.intelligence}`);
		this.infoDrawer.statsTexts[4].setText(`意志: ${primary.willpower}`);
		this.infoDrawer.statsTexts[5].setText(`幸運: ${primary.luck}`);

		this.infoDrawer.weaponText.setText(
			`武器: ${stats.weapon?.name || '無'} (+${stats.weapon?.attack || 0})`
		);
		this.infoDrawer.armorText.setText(
			`防具: ${stats.armor?.name || '無'} (+${stats.armor?.defense || 0})`
		);

		if (stats.items.length > 0) {
			const itemNames = stats.items.map((item) => item.name).join(', ');
			this.infoDrawer.itemsText.setText(`道具: ${itemNames} (${stats.items.length}/${stats.maxItemSlots})`);
		} else {
			this.infoDrawer.itemsText.setText(`道具: 無 (0/${stats.maxItemSlots})`);
		}
	}
}
