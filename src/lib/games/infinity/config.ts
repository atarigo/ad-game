// 遊戲可視範圍大小 (手機友善尺寸)
export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 640;

// 區域設定
export const ZONES = {
	// 玩家區域（底部）
	playerAreaHeight: 120,
	// 敵人區域（上方）
	get enemyAreaHeight() {
		return GAME_HEIGHT - this.playerAreaHeight;
	}
} as const;

// 顏色設定
export const COLORS = {
	background: '#1a4d1a', // 深綠色背景（敵人區域）
	playerArea: '#0d260d', // 更深的綠色（玩家區域）
	player: 0x00ff00, // 亮綠色
	playerStroke: 0x00aa00, // 玩家邊框
	zoneDivider: 0x2d5a2d, // 區域分隔線
	enemySlot: 0x143d14, // 敵人格子填充
	enemySlotStroke: 0x2d5a2d, // 敵人格子邊框
	enemy: 0xff0000, // 紅色敵人
	enemyStroke: 0xaa0000 // 敵人邊框
} as const;

// 玩家設定
export const PLAYER = {
	width: 50,
	height: 50,
	strokeWidth: 2,
	// 距離底部的間距
	bottomPadding: 35
} as const;

// 敵人格子設定
export const ENEMY_GRID = {
	columns: 5, // 5 欄（一橫五個）
	rows: 4, // 4 列
	cellSize: 60, // 格子大小
	gap: 12, // 格子間距
	topPadding: 40, // 距離頂部的間距
	strokeWidth: 2
} as const;
