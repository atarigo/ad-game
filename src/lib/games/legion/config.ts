// 遊戲固定尺寸（手機友善尺寸）
export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 640;

// 顏色設定
export const COLORS = {
	background: '#000000',
	border: 0x00ff00,
	text: '#00ff00',
	gridLine: 0x333333,
	enemyCell: 0x440000,
	allyCell: 0x004400,
	uiBackground: 0x222222,
	enemy: 0xff0000,
	ally: 0x00ff00,
	itemSlot: 0x444444,
	skillSlot: 0x555555
} as const;

// 棋盤設定
export const GRID = {
	// 敵人棋盤 6x6
	enemy: {
		rows: 6,
		cols: 6,
		cellSize: 50,
		gap: 2,
		offsetY: 20
	},
	// 我方棋盤 3x6
	ally: {
		rows: 3,
		cols: 6,
		cellSize: 50,
		gap: 2,
		get offsetY() {
			return GRID.enemy.offsetY + GRID.enemy.rows * (GRID.enemy.cellSize + GRID.enemy.gap) + 10;
		}
	}
} as const;

// UI設定
export const UI = {
	// 操作UI在最下方
	height: 130,
	get offsetY() {
		return GAME_HEIGHT - this.height;
	},
	padding: 10,
	rowGap: 10,
	// 道具格
	itemSlots: {
		count: 3,
		size: 50,
		gap: 5
	},
	// 技能格
	skillSlots: {
		count: 5,
		size: 50,
		gap: 5
	}
} as const;

// 敵人尺寸類型
export const ENEMY_SIZES = [
	{ width: 1, height: 1 },
	{ width: 2, height: 2 },
	{ width: 2, height: 3 }
] as const;

// 角色屬性
export interface CharacterStats {
	str: number; // 力量
	vit: number; // 體質
}

// 計算屬性
export function calculateStats(stats: CharacterStats) {
	return {
		atk: stats.str,
		hp: stats.vit * 10,
		def: stats.vit
	};
}
