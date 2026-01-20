import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, PLAYER, ZONES, ENEMY_GRID } from '../config';

export class MainScene extends Phaser.Scene {
	private player!: Phaser.GameObjects.Rectangle;
	private enemy!: Phaser.GameObjects.Rectangle;
	private gridPositions: { x: number; y: number }[] = [];

	constructor() {
		super({ key: 'MainScene' });
	}

	create() {
		// 建立深綠色背景（敵人區域）
		this.cameras.main.setBackgroundColor(COLORS.background);

		// 繪製玩家區域（底部，更深的綠色）
		this.add.rectangle(
			GAME_WIDTH / 2,
			GAME_HEIGHT - ZONES.playerAreaHeight / 2,
			GAME_WIDTH,
			ZONES.playerAreaHeight,
			Phaser.Display.Color.HexStringToColor(COLORS.playerArea).color
		);

		// 繪製區域分隔線
		this.add.rectangle(
			GAME_WIDTH / 2,
			GAME_HEIGHT - ZONES.playerAreaHeight,
			GAME_WIDTH,
			2,
			COLORS.zoneDivider
		);

		// 繪製敵人格子 (5x4)
		this.createEnemyGrid();

		// 隨機生成一個敵人
		this.spawnEnemy();

		// 建立綠色方塊代表 player（置於底部）
		this.player = this.add.rectangle(
			GAME_WIDTH / 2,
			GAME_HEIGHT - PLAYER.bottomPadding - PLAYER.height / 2,
			PLAYER.width,
			PLAYER.height,
			COLORS.player
		);

		// 添加簡單的邊框效果
		this.player.setStrokeStyle(PLAYER.strokeWidth, COLORS.playerStroke);
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
}
