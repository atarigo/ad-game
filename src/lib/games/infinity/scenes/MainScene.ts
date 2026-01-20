import Phaser from 'phaser';
import {
	GAME_WIDTH,
	GAME_HEIGHT,
	COLORS,
	PLAYER,
	ZONES,
	ENEMY_GRID,
	UI_BUTTON,
	HEALTH_BAR
} from '../config';
import { CharacterStats } from '../entities';

// 血量條結構
interface HealthBar {
	background: Phaser.GameObjects.Rectangle;
	fill: Phaser.GameObjects.Rectangle;
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

	// 回合系統
	private turnCount: number = 0;
	private turnText!: Phaser.GameObjects.Text;

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

		// 繪製玩家區域（UI 區域上方）
		const playerAreaY = GAME_HEIGHT - ZONES.uiAreaHeight - ZONES.playerAreaHeight / 2;
		this.add.rectangle(
			GAME_WIDTH / 2,
			playerAreaY,
			GAME_WIDTH,
			ZONES.playerAreaHeight,
			Phaser.Display.Color.HexStringToColor(COLORS.playerArea).color
		);

		// 繪製區域分隔線（玩家區域與敵人區域之間）
		this.add.rectangle(
			GAME_WIDTH / 2,
			GAME_HEIGHT - ZONES.uiAreaHeight - ZONES.playerAreaHeight,
			GAME_WIDTH,
			2,
			COLORS.zoneDivider
		);

		// 繪製區域分隔線（玩家區域與 UI 區域之間）
		this.add.rectangle(
			GAME_WIDTH / 2,
			GAME_HEIGHT - ZONES.uiAreaHeight,
			GAME_WIDTH,
			2,
			COLORS.zoneDivider
		);

		// 繪製敵人格子 (5x4)
		this.createEnemyGrid();

		// 隨機生成一個敵人
		this.spawnEnemy();

		// 建立綠色方塊代表 player（置於玩家區域中央）
		const playerY = GAME_HEIGHT - ZONES.uiAreaHeight - PLAYER.bottomPadding - PLAYER.height / 2;
		this.player = this.add.rectangle(
			GAME_WIDTH / 2,
			playerY,
			PLAYER.width,
			PLAYER.height,
			COLORS.player
		);

		// 添加簡單的邊框效果
		this.player.setStrokeStyle(PLAYER.strokeWidth, COLORS.playerStroke);

		// 建立血量條
		this.createHealthBars();

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
		const { cellSize, strokeWidth } = ENEMY_GRID;

		// 隨機選擇一個格子位置
		const randomIndex = Phaser.Math.Between(0, this.gridPositions.length - 1);
		const position = this.gridPositions[randomIndex];

		// 建立紅色敵人
		this.enemy = this.add.rectangle(
			position.x,
			position.y,
			cellSize - 10, // 稍微小一點，讓格子邊框可見
			cellSize - 10,
			COLORS.enemy
		);
		this.enemy.setStrokeStyle(strokeWidth, COLORS.enemyStroke);
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

		// 背景（灰色）
		const background = this.add.rectangle(x, y, width, height, COLORS.healthBarBackground);
		background.setStrokeStyle(strokeWidth, COLORS.healthBarStroke);

		// 血量填充（綠色）
		const fill = this.add.rectangle(x, y, width - 2, height - 2, COLORS.healthBarFill);

		return { background, fill };
	}

	/**
	 * 更新血量條顯示
	 */
	private updateHealthBar(healthBar: HealthBar, stats: CharacterStats) {
		const { width, lowHealthThreshold } = HEALTH_BAR;
		const healthPercent = stats.currentHealth / stats.derived.healthPoints;

		// 計算填充寬度
		const fillWidth = Math.max(0, (width - 2) * healthPercent);
		healthBar.fill.width = fillWidth;

		// 調整填充位置（從左側開始）
		const offsetX = (width - 2 - fillWidth) / 2;
		healthBar.fill.x = healthBar.background.x - offsetX;

		// 根據血量百分比改變顏色
		if (healthPercent <= lowHealthThreshold) {
			healthBar.fill.setFillStyle(COLORS.healthBarLow);
		} else {
			healthBar.fill.setFillStyle(COLORS.healthBarFill);
		}
	}

	/**
	 * 初始化玩家和敵人的角色狀態
	 */
	private initializeStats() {
		// 玩家使用預設屬性，可加上武器加成
		this.playerStats = new CharacterStats(
			{}, // 使用預設主屬性
			{ weaponAttack: 5 } // 初始武器攻擊力
		);

		// 敵人使用預設屬性
		this.enemyStats = new CharacterStats();

		// 輸出狀態到控制台供測試
		console.log('Player Stats:', {
			primary: this.playerStats.primary,
			derived: this.playerStats.derived,
			currentHealth: this.playerStats.currentHealth,
			currentMana: this.playerStats.currentMana
		});

		console.log('Enemy Stats:', {
			primary: this.enemyStats.primary,
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
	 * 敵人被擊敗
	 */
	private onEnemyDefeated() {
		console.log('🎉 敵人被擊敗！');
		this.enemy.setVisible(false);
		this.enemyHealthBar.background.setVisible(false);
		this.enemyHealthBar.fill.setVisible(false);
	}

	/**
	 * 玩家被擊敗
	 */
	private onPlayerDefeated() {
		console.log('💀 玩家被擊敗！遊戲結束');
		this.player.setFillStyle(0x555555);
	}
}
