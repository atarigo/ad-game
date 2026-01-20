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
import type { EnemyConfig, StageConfig } from '../data';

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

export class MainScene extends Phaser.Scene {
	private player!: Phaser.GameObjects.Rectangle;
	private enemy!: Phaser.GameObjects.Rectangle;
	private gridPositions: { x: number; y: number }[] = [];

	// 角色狀態
	private playerStats!: CharacterStats;
	private enemyStats!: CharacterStats;

	// 血量條
	private playerHealthBar!: HealthBar;
	private enemyHealthBar!: HealthBar;

	// 資訊抽屜
	private infoDrawer!: InfoDrawer;
	private isDrawerOpen: boolean = false;
	private clickedOnCharacter: boolean = false;

	// 回合系統
	private turnCount: number = 0;
	private turnText!: Phaser.GameObjects.Text;

	// 道具格
	private itemSlots: ItemSlot[] = [];

	// 遊戲狀態
	private gameState!: GameState;
	private stageInfoText!: Phaser.GameObjects.Text;
	private currentEnemyName: string = '敵人';

	constructor() {
		super({ key: 'MainScene' });
	}

	create() {
		// 初始化角色狀態
		this.initializeStats();

		// 建立深綠色背景（敵人區域）
		this.cameras.main.setBackgroundColor(COLORS.background);

		// 繪製 UI 區域（最底部）
		this.add.rectangle(
			GAME_WIDTH / 2,
			GAME_HEIGHT - ZONES.uiAreaHeight / 2,
			GAME_WIDTH,
			ZONES.uiAreaHeight,
			Phaser.Display.Color.HexStringToColor(COLORS.uiArea).color
		);

		// 繪製技能格區域（UI 區域上方）
		const skillRowY =
			GAME_HEIGHT - ZONES.uiAreaHeight - ZONES.skillRowHeight / 2;
		this.add.rectangle(
			GAME_WIDTH / 2,
			skillRowY,
			GAME_WIDTH,
			ZONES.skillRowHeight,
			Phaser.Display.Color.HexStringToColor(COLORS.uiArea).color
		);

		// 繪製道具格區域（技能格上方）
		const itemRowY =
			GAME_HEIGHT -
			ZONES.uiAreaHeight -
			ZONES.skillRowHeight -
			ZONES.itemRowHeight / 2;
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
		const dividerY1 =
			GAME_HEIGHT - ZONES.uiAreaHeight - ZONES.skillRowHeight - ZONES.itemRowHeight - ZONES.playerAreaHeight;
		this.add.rectangle(
			GAME_WIDTH / 2,
			dividerY1,
			GAME_WIDTH,
			2,
			COLORS.zoneDivider
		);

		const dividerY2 = GAME_HEIGHT - ZONES.uiAreaHeight - ZONES.skillRowHeight - ZONES.itemRowHeight;
		this.add.rectangle(
			GAME_WIDTH / 2,
			dividerY2,
			GAME_WIDTH,
			2,
			COLORS.zoneDivider
		);

		const dividerY3 = GAME_HEIGHT - ZONES.uiAreaHeight - ZONES.skillRowHeight;
		this.add.rectangle(
			GAME_WIDTH / 2,
			dividerY3,
			GAME_WIDTH,
			2,
			COLORS.zoneDivider
		);

		const dividerY4 = GAME_HEIGHT - ZONES.uiAreaHeight;
		this.add.rectangle(
			GAME_WIDTH / 2,
			dividerY4,
			GAME_WIDTH,
			2,
			COLORS.zoneDivider
		);

		// 繪製敵人格子 (5x4)
		this.createEnemyGrid();

		// 隨機生成一個敵人
		this.spawnEnemy();

		// 建立綠色方塊代表 player（置於玩家區域中央）
		const playerY =
			GAME_HEIGHT -
			ZONES.uiAreaHeight -
			ZONES.skillRowHeight -
			ZONES.itemRowHeight -
			PLAYER.bottomPadding -
			PLAYER.height / 2;
		this.player = this.add.rectangle(
			GAME_WIDTH / 2,
			playerY,
			PLAYER.width,
			PLAYER.height,
			COLORS.player
		);

		// 添加簡單的邊框效果
		this.player.setStrokeStyle(PLAYER.strokeWidth, COLORS.playerStroke);

		// 設置玩家深度，確保可被點擊
		this.player.setDepth(10);

		// 建立血量條
		this.createHealthBars();

		// 建立技能格
		this.createSkillSlots();

		// 建立道具格
		this.createItemSlots();

		// 建立資訊抽屜
		this.createInfoDrawer();

		// 設置角色點擊事件
		this.setupCharacterInteraction();

		// 設置點擊其他區域關閉抽屜
		this.setupBackgroundClick();

		// 建立 UI
		this.createUI();
	}

	private createEnemyGrid() {
		const { columns, rows, cellSize, gap, topPadding, strokeWidth } = ENEMY_GRID;

		// 計算格子總寬度和起始位置（置中）
		const gridWidth = columns * cellSize + (columns - 1) * gap;
		const startX = (GAME_WIDTH - gridWidth) / 2 + cellSize / 2;
		const startY = topPadding + cellSize / 2;

		// 清空格子位置陣列
		this.gridPositions = [];

		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < columns; col++) {
				const x = startX + col * (cellSize + gap);
				const y = startY + row * (cellSize + gap);

				// 儲存格子位置
				this.gridPositions.push({ x, y });

				const slot = this.add.rectangle(x, y, cellSize, cellSize, COLORS.enemySlot);
				slot.setStrokeStyle(strokeWidth, COLORS.enemySlotStroke);
			}
		}
	}

	private spawnEnemy() {
		const { cellSize, strokeWidth, columns } = ENEMY_GRID;

		// 取得當前關卡配置
		const stageConfig = this.gameState.currentStageConfig;
		const enemyConfig = stageConfig.enemies[0]; // 目前只處理第一個敵人

		// 根據關卡配置的位置計算座標
		const gridIndex = enemyConfig.position.row * columns + enemyConfig.position.col;
		const position = this.gridPositions[gridIndex] || this.gridPositions[0];

		// 使用關卡配置的顏色
		const enemyColor = enemyConfig.color;
		const enemyStrokeColor = Phaser.Display.Color.ValueToColor(enemyColor).darken(30).color;

		// 建立敵人
		this.enemy = this.add.rectangle(
			position.x,
			position.y,
			cellSize - 10, // 稍微小一點，讓格子邊框可見
			cellSize - 10,
			enemyColor
		);
		this.enemy.setStrokeStyle(strokeWidth, enemyStrokeColor);

		// 設置敵人深度，確保在血量條之上可被點擊
		this.enemy.setDepth(10);
	}

	/**
	 * 建立血量條
	 */
	private createHealthBars() {
		// 玩家血量條
		this.playerHealthBar = this.createHealthBar(
			this.player.x,
			this.player.y - PLAYER.height / 2 - HEALTH_BAR.offsetY
		);

		// 敵人血量條
		const enemySize = ENEMY_GRID.cellSize - 10;
		this.enemyHealthBar = this.createHealthBar(
			this.enemy.x,
			this.enemy.y - enemySize / 2 - HEALTH_BAR.offsetY
		);
	}

	/**
	 * 建立單一血量條
	 */
	private createHealthBar(x: number, y: number): HealthBar {
		const { width, height, strokeWidth } = HEALTH_BAR;

		// 背景（灰色）- 以中心為原點
		const background = this.add.rectangle(x, y, width, height, COLORS.healthBarBackground);
		background.setStrokeStyle(strokeWidth, COLORS.healthBarStroke);

		// 血量填充（綠色）- 以左側中心為原點
		const fillX = x - width / 2 + 1; // 背景左邊界 + 1px 邊距
		const fill = this.add.rectangle(fillX, y, width - 2, height - 2, COLORS.healthBarFill);
		fill.setOrigin(0, 0.5); // 設置原點為左側中心

		return { background, fill };
	}

	/**
	 * 更新血量條顯示
	 */
	private updateHealthBar(healthBar: HealthBar, stats: CharacterStats) {
		const { width, lowHealthThreshold } = HEALTH_BAR;
		const healthPercent = stats.currentHealth / stats.derived.healthPoints;

		// 計算填充寬度
		const maxFillWidth = width - 2;
		const fillWidth = Math.max(0, maxFillWidth * healthPercent);

		// 因為 origin 設為 (0, 0.5)，只需更新寬度即可
		healthBar.fill.width = fillWidth;

		// 根據血量百分比改變顏色
		if (healthPercent <= lowHealthThreshold) {
			healthBar.fill.setFillStyle(COLORS.healthBarLow);
		} else {
			healthBar.fill.setFillStyle(COLORS.healthBarFill);
		}
	}

	/**
	 * 建立技能格
	 */
	private createSkillSlots() {
		const { count, size, gap, padding, strokeWidth } = SKILL_SLOTS;
		const skillRowY = GAME_HEIGHT - ZONES.uiAreaHeight - ZONES.skillRowHeight / 2;

		// 從左邊開始排列
		const startX = padding + size / 2;

		for (let i = 0; i < count; i++) {
			const x = startX + i * (size + gap);
			const slot = this.add.rectangle(x, skillRowY, size, size, COLORS.skillSlot);
			slot.setStrokeStyle(strokeWidth, COLORS.skillSlotStroke);
		}
	}

	/**
	 * 建立道具格
	 */
	private createItemSlots() {
		const { size, gap, padding, strokeWidth } = ITEM_SLOTS;
		const itemRowY =
			GAME_HEIGHT - ZONES.uiAreaHeight - ZONES.skillRowHeight - ZONES.itemRowHeight / 2;

		// 取得玩家道具欄位數量
		const maxSlots = this.playerStats.maxItemSlots;

		// 從左邊開始排列
		const startX = padding + size / 2;

		// 清空舊的道具格
		this.itemSlots = [];

		// 建立道具格
		for (let i = 0; i < maxSlots; i++) {
			const x = startX + i * (size + gap);
			const slot = this.add.rectangle(x, itemRowY, size, size, COLORS.itemSlot);
			slot.setStrokeStyle(strokeWidth, COLORS.itemSlotStroke);

			let itemText: Phaser.GameObjects.Text | null = null;

			// 如果有道具，顯示道具
			if (i < this.playerStats.items.length) {
				const item = this.playerStats.items[i];
				// 在格子中央顯示道具圖示或文字
				itemText = this.add.text(x, itemRowY, item.name.charAt(0), {
					fontSize: '16px',
					color: '#ffffff',
					fontFamily: 'Arial'
				});
				itemText.setOrigin(0.5);

				// 將格子改為有道具的顏色
				slot.setFillStyle(COLORS.itemSlotFilled);

				// 設置互動
				slot.setInteractive({ useHandCursor: true });

				// 點擊事件
				const slotIndex = i;
				slot.on('pointerdown', () => {
					this.useItemAtSlot(slotIndex);
				});

				// 懸停效果
				slot.on('pointerover', () => {
					slot.setStrokeStyle(strokeWidth + 1, COLORS.itemSlotStroke);
				});

				slot.on('pointerout', () => {
					slot.setStrokeStyle(strokeWidth, COLORS.itemSlotStroke);
				});
			}

			// 存儲道具格引用
			this.itemSlots.push({
				background: slot,
				text: itemText,
				index: i
			});
		}
	}

	/**
	 * 使用指定位置的道具
	 */
	private useItemAtSlot(slotIndex: number) {
		// 檢查是否有道具
		if (slotIndex >= this.playerStats.items.length) {
			console.log(`道具格 ${slotIndex} 沒有道具`);
			return;
		}

		const item = this.playerStats.items[slotIndex];
		const beforeHealth = this.playerStats.currentHealth;

		// 使用道具
		const success = this.playerStats.useItem(slotIndex);

		if (success) {
			const afterHealth = this.playerStats.currentHealth;
			const healed = afterHealth - beforeHealth;

			console.log(
				`[使用道具] ${item.name} | 回復: ${healed.toFixed(1)} | 血量: ${afterHealth.toFixed(1)}/${this.playerStats.derived.healthPoints}`
			);

			// 更新血量條
			this.updateHealthBar(this.playerHealthBar, this.playerStats);

			// 閃爍效果（綠色表示回復）
			this.flashEffect(this.player, 0x00ff00);

			// 更新道具欄顯示
			this.updateItemSlots();

			// 如果資訊抽屜開啟且顯示玩家，更新內容
			if (this.isDrawerOpen) {
				this.updateDrawerContent(this.playerStats, '玩家');
			}
		}
	}

	/**
	 * 更新道具格顯示
	 */
	private updateItemSlots() {
		const { size, strokeWidth } = ITEM_SLOTS;

		for (let i = 0; i < this.itemSlots.length; i++) {
			const slot = this.itemSlots[i];

			// 移除舊的文字
			if (slot.text) {
				slot.text.destroy();
				slot.text = null;
			}

			// 移除舊的事件監聽器
			slot.background.removeAllListeners();
			slot.background.disableInteractive();

			// 如果有道具，更新顯示
			if (i < this.playerStats.items.length) {
				const item = this.playerStats.items[i];

				// 建立新的文字
				slot.text = this.add.text(slot.background.x, slot.background.y, item.name.charAt(0), {
					fontSize: '16px',
					color: '#ffffff',
					fontFamily: 'Arial'
				});
				slot.text.setOrigin(0.5);

				// 更新顏色
				slot.background.setFillStyle(COLORS.itemSlotFilled);

				// 重新設置互動
				slot.background.setInteractive({ useHandCursor: true });

				const slotIndex = i;
				slot.background.on('pointerdown', () => {
					this.useItemAtSlot(slotIndex);
				});

				slot.background.on('pointerover', () => {
					slot.background.setStrokeStyle(strokeWidth + 1, COLORS.itemSlotStroke);
				});

				slot.background.on('pointerout', () => {
					slot.background.setStrokeStyle(strokeWidth, COLORS.itemSlotStroke);
				});
			} else {
				// 沒有道具，恢復空格顏色
				slot.background.setFillStyle(COLORS.itemSlot);
			}
		}
	}

	/**
	 * 初始化玩家和敵人的角色狀態
	 */
	private initializeStats() {
		// 取得遊戲狀態
		this.gameState = GameState.getInstance();

		// 玩家狀態從 GameState 取得（跨場景保留）
		this.playerStats = this.gameState.playerStats;

		// 取得當前關卡配置
		const stageConfig = this.gameState.currentStageConfig;
		const enemyConfig = stageConfig.enemies[0]; // 目前只處理第一個敵人

		// 儲存敵人名稱
		this.currentEnemyName = enemyConfig.name;

		// 敵人：使用關卡配置的屬性
		this.enemyStats = new CharacterStats(
			enemyConfig.attributes || {}, // 使用配置的主屬性
			{}, // 不使用舊的裝備加成系統
			{
				weapon: enemyConfig.weapon ? WEAPONS[enemyConfig.weapon] : createDefaultWeapon(),
				armor: enemyConfig.armor ? ARMORS[enemyConfig.armor] : createDefaultArmor(),
				items: [], // 敵人無道具
				maxItemSlots: 0 // 敵人無道具欄位
			}
		);

		// 輸出狀態到控制台供測試
		const { currentMapLevel, currentStage, currentStageNumber } = this.gameState;
		console.log(`[遊戲] ${currentMapLevel}級地圖 第${currentStage}關（${currentStageNumber}/15）`);
		console.log(`[關卡] ${stageConfig.id}: ${stageConfig.name}`);
		console.log(`[敵人] ${enemyConfig.name}`);

		console.log('Player Stats:', {
			primary: this.playerStats.primary,
			weapon: this.playerStats.weapon?.name,
			armor: this.playerStats.armor?.name,
			items: this.playerStats.items.map((i) => i.name),
			derived: this.playerStats.derived,
			currentHealth: this.playerStats.currentHealth,
			currentMana: this.playerStats.currentMana
		});

		console.log('Enemy Stats:', {
			primary: this.enemyStats.primary,
			weapon: this.enemyStats.weapon?.name,
			armor: this.enemyStats.armor?.name,
			derived: this.enemyStats.derived,
			currentHealth: this.enemyStats.currentHealth,
			currentMana: this.enemyStats.currentMana
		});
	}

	/**
	 * 建立 UI 元件
	 */
	private createUI() {
		const { width, height, padding, strokeWidth, fontSize } = UI_BUTTON;

		// 關卡資訊（頂部）
		const { currentMapLevel, currentStage, currentStageNumber } = this.gameState;
		this.stageInfoText = this.add.text(
			GAME_WIDTH / 2,
			15,
			`${currentMapLevel}級 - ${currentStage}/3（${currentStageNumber}/15）`,
			{
				fontSize: '12px',
				color: '#aaaaaa',
				fontFamily: 'Arial'
			}
		);
		this.stageInfoText.setOrigin(0.5);
		this.stageInfoText.setDepth(50);

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

		// 按鈕互動效果
		button.on('pointerover', () => {
			button.setFillStyle(COLORS.buttonHover);
		});

		button.on('pointerout', () => {
			button.setFillStyle(COLORS.button);
		});

		button.on('pointerdown', () => {
			this.nextTurn();
		});
	}

	/**
	 * 執行下一回合
	 */
	private nextTurn() {
		// 檢查遊戲是否已結束
		if (!this.playerStats.isAlive || !this.enemyStats.isAlive) {
			console.log('遊戲已結束，無法繼續回合');
			return;
		}

		this.turnCount++;
		this.turnText.setText(`回合: ${this.turnCount}`);

		console.log(`\n========== 回合 ${this.turnCount} ==========`);

		// 回合開始：玩家攻擊敵人
		this.playerAttack();

		// 檢查敵人是否存活
		if (!this.enemyStats.isAlive) {
			this.onEnemyDefeated();
			return;
		}

		// 回合結束：敵人攻擊玩家
		this.enemyAttack();

		// 檢查玩家是否存活
		if (!this.playerStats.isAlive) {
			this.onPlayerDefeated();
			return;
		}

		// 回合結束：雙方回復
		this.applyEndOfTurnEffects();
	}

	/**
	 * 玩家攻擊敵人
	 */
	private playerAttack() {
		const attacker = this.playerStats;
		const defender = this.enemyStats;

		// 使用近距離攻擊力
		let damage = attacker.derived.meleeAttack;
		let isCritical = false;

		// 判定暴擊
		if (attacker.rollCritical()) {
			damage = attacker.calculateCriticalDamage(damage);
			isCritical = true;
		}

		// 造成傷害
		const actualDamage = defender.takeDamage(damage);

		// 更新敵人血量條
		this.updateHealthBar(this.enemyHealthBar, this.enemyStats);

		// 閃爍效果
		this.flashEffect(this.enemy, 0xffffff);

		console.log(
			`[玩家攻擊] ${isCritical ? '💥暴擊！' : ''} 傷害: ${damage.toFixed(1)} → 實際: ${actualDamage.toFixed(1)} | 敵人血量: ${defender.currentHealth.toFixed(1)}/${defender.derived.healthPoints}`
		);
	}

	/**
	 * 敵人攻擊玩家
	 */
	private enemyAttack() {
		const attacker = this.enemyStats;
		const defender = this.playerStats;

		// 使用近距離攻擊力
		let damage = attacker.derived.meleeAttack;
		let isCritical = false;

		// 判定暴擊
		if (attacker.rollCritical()) {
			damage = attacker.calculateCriticalDamage(damage);
			isCritical = true;
		}

		// 造成傷害
		const actualDamage = defender.takeDamage(damage);

		// 更新玩家血量條
		this.updateHealthBar(this.playerHealthBar, this.playerStats);

		// 閃爍效果
		this.flashEffect(this.player, 0xff0000);

		console.log(
			`[敵人攻擊] ${isCritical ? '💥暴擊！' : ''} 傷害: ${damage.toFixed(1)} → 實際: ${actualDamage.toFixed(1)} | 玩家血量: ${defender.currentHealth.toFixed(1)}/${defender.derived.healthPoints}`
		);
	}

	/**
	 * 回合結束效果（回復）
	 */
	private applyEndOfTurnEffects() {
		this.playerStats.applyRegeneration();
		this.enemyStats.applyRegeneration();

		// 更新血量條（回復後）
		this.updateHealthBar(this.playerHealthBar, this.playerStats);
		this.updateHealthBar(this.enemyHealthBar, this.enemyStats);

		console.log('[回合結束] 雙方回復');
		console.log(
			`  玩家: HP ${this.playerStats.currentHealth.toFixed(1)}/${this.playerStats.derived.healthPoints} | MP ${this.playerStats.currentMana.toFixed(1)}/${this.playerStats.derived.manaPoints}`
		);
		console.log(
			`  敵人: HP ${this.enemyStats.currentHealth.toFixed(1)}/${this.enemyStats.derived.healthPoints} | MP ${this.enemyStats.currentMana.toFixed(1)}/${this.enemyStats.derived.manaPoints}`
		);
	}

	/**
	 * 閃爍效果
	 */
	private flashEffect(target: Phaser.GameObjects.Rectangle, color: number) {
		const originalColor = target.fillColor;
		target.setFillStyle(color);

		this.time.delayedCall(100, () => {
			target.setFillStyle(originalColor);
		});
	}

	/**
	 * 建立資訊抽屜
	 */
	private createInfoDrawer() {
		const { height, padding, fontSize, titleFontSize, backgroundColor, borderColor } = INFO_DRAWER;

		// 建立容器（初始位置在畫面上方外側）
		const container = this.add.container(0, -height);

		// 背景
		const background = this.add.rectangle(
			GAME_WIDTH / 2,
			height / 2,
			GAME_WIDTH,
			height,
			backgroundColor
		);
		background.setStrokeStyle(2, borderColor);

		// 名稱文字
		const nameText = this.add.text(padding, padding, '敵人', {
			fontSize: `${titleFontSize}px`,
			color: INFO_DRAWER.textColor,
			fontFamily: 'Arial',
			fontStyle: 'bold'
		});

		// 血量文字
		const healthText = this.add.text(padding, padding + 24, 'HP: 100/100', {
			fontSize: `${fontSize}px`,
			color: INFO_DRAWER.textColor,
			fontFamily: 'Arial'
		});

		// 六屬性文字（分兩列，調整位置）
		const statsTexts: Phaser.GameObjects.Text[] = [];
		const attributes = [
			{ label: '力量', key: 'strength' },
			{ label: '敏捷', key: 'agility' },
			{ label: '體力', key: 'vitality' },
			{ label: '智力', key: 'intelligence' },
			{ label: '意志', key: 'willpower' },
			{ label: '幸運', key: 'luck' }
		];

		const col1X = padding;
		const col2X = GAME_WIDTH / 2 + padding;
		const startY = padding + 42;
		const lineHeight = 18;

		attributes.forEach((attr, index) => {
			const col = index < 3 ? col1X : col2X;
			const row = index % 3;
			const text = this.add.text(col, startY + row * lineHeight, `${attr.label}: 10`, {
				fontSize: `${fontSize}px`,
				color: INFO_DRAWER.labelColor,
				fontFamily: 'Arial'
			});
			statsTexts.push(text);
		});

		// 裝備文字
		const equipmentY = startY + 3 * lineHeight + 8;
		const weaponText = this.add.text(padding, equipmentY, '武器: 無', {
			fontSize: `${fontSize}px`,
			color: INFO_DRAWER.equipmentColor,
			fontFamily: 'Arial'
		});

		const armorText = this.add.text(padding, equipmentY + 16, '防具: 無', {
			fontSize: `${fontSize}px`,
			color: INFO_DRAWER.equipmentColor,
			fontFamily: 'Arial'
		});

		// 道具文字
		const itemsText = this.add.text(padding, equipmentY + 32, '道具: 無', {
			fontSize: `${fontSize}px`,
			color: INFO_DRAWER.equipmentColor,
			fontFamily: 'Arial'
		});

		// 將所有元素加入容器
		container.add([
			background,
			nameText,
			healthText,
			...statsTexts,
			weaponText,
			armorText,
			itemsText
		]);

		// 設置深度，確保在最上層
		container.setDepth(100);

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
	 * 設置角色點擊事件（玩家和敵人）
	 */
	private setupCharacterInteraction() {
		// 敵人點擊事件
		this.enemy.setInteractive({ useHandCursor: true });
		this.enemy.on('pointerdown', () => {
			console.log('敵人被點擊');
			this.clickedOnCharacter = true;
			this.openDrawer(this.enemyStats, this.currentEnemyName);
		});

		// 玩家點擊事件
		this.player.setInteractive({ useHandCursor: true });
		this.player.on('pointerdown', () => {
			console.log('玩家被點擊');
			this.clickedOnCharacter = true;
			this.openDrawer(this.playerStats, '玩家');
		});
	}

	/**
	 * 設置點擊背景關閉抽屜
	 */
	private setupBackgroundClick() {
		this.input.on('pointerdown', () => {
			// 延遲檢查，讓角色的點擊事件先執行
			this.time.delayedCall(10, () => {
				if (this.clickedOnCharacter) {
					this.clickedOnCharacter = false;
					return;
				}
				if (this.isDrawerOpen) {
					console.log('關閉抽屜');
					this.closeDrawer();
				}
			});
		});
	}

	/**
	 * 開啟抽屜並顯示角色資訊
	 */
	private openDrawer(stats: CharacterStats, name: string) {
		if (this.isDrawerOpen) {
			// 如果已開啟，先關閉再開啟（更新內容）
			this.updateDrawerContent(stats, name);
			return;
		}

		this.isDrawerOpen = true;

		// 更新抽屜內容
		this.updateDrawerContent(stats, name);

		// 滑入動畫
		this.tweens.add({
			targets: this.infoDrawer.container,
			y: 0,
			duration: INFO_DRAWER.animationDuration,
			ease: 'Power2'
		});
	}

	/**
	 * 關閉抽屜
	 */
	private closeDrawer() {
		if (!this.isDrawerOpen) return;

		this.isDrawerOpen = false;

		// 滑出動畫
		this.tweens.add({
			targets: this.infoDrawer.container,
			y: -INFO_DRAWER.height,
			duration: INFO_DRAWER.animationDuration,
			ease: 'Power2'
		});
	}

	/**
	 * 更新抽屜內容
	 */
	private updateDrawerContent(stats: CharacterStats, name: string) {
		const { primary, derived } = stats;

		// 更新名稱
		this.infoDrawer.nameText.setText(name);

		// 更新血量
		this.infoDrawer.healthText.setText(
			`HP: ${stats.currentHealth.toFixed(0)}/${derived.healthPoints}`
		);

		// 更新六屬性
		const attributes = [
			{ label: '力量', value: primary.strength },
			{ label: '敏捷', value: primary.agility },
			{ label: '體力', value: primary.vitality },
			{ label: '智力', value: primary.intelligence },
			{ label: '意志', value: primary.willpower },
			{ label: '幸運', value: primary.luck }
		];

		attributes.forEach((attr, index) => {
			this.infoDrawer.statsTexts[index].setText(`${attr.label}: ${attr.value}`);
		});

		// 更新裝備資訊
		const weaponName = stats.weapon ? `${stats.weapon.name} (+${stats.weapon.attack})` : '無';
		this.infoDrawer.weaponText.setText(`武器: ${weaponName}`);

		const armorName = stats.armor ? `${stats.armor.name} (+${stats.armor.defense})` : '無';
		this.infoDrawer.armorText.setText(`防具: ${armorName}`);

		// 更新道具資訊
		if (stats.items.length > 0) {
			const itemNames = stats.items.map((item) => item.name).join(', ');
			this.infoDrawer.itemsText.setText(`道具: ${itemNames} (${stats.items.length}/${stats.maxItemSlots})`);
		} else {
			this.infoDrawer.itemsText.setText(`道具: 無 (0/${stats.maxItemSlots})`);
		}
	}

	/**
	 * 敵人被擊敗
	 */
	private onEnemyDefeated() {
		console.log('🎉 敵人被擊敗！');
		this.enemy.setVisible(false);
		this.enemy.disableInteractive(); // 禁用互動
		this.enemyHealthBar.background.setVisible(false);
		this.enemyHealthBar.fill.setVisible(false);
		this.closeDrawer(); // 關閉抽屜

		// 顯示勝利訊息
		const victoryText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '勝利！', {
			fontSize: '32px',
			color: '#00ff00',
			fontFamily: 'Arial',
			fontStyle: 'bold'
		});
		victoryText.setOrigin(0.5);
		victoryText.setDepth(100);

		// 延遲後進入補給場景
		this.time.delayedCall(1500, () => {
			this.scene.start('SupplyScene');
		});
	}

	/**
	 * 玩家被擊敗
	 */
	private onPlayerDefeated() {
		console.log('💀 玩家被擊敗！遊戲結束');
		this.player.setFillStyle(0x555555);
	}
}
