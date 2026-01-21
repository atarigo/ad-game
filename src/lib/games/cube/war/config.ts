// 遊戲固定尺寸（手機友善尺寸）
export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 640;

// 格子配置
export const GRID_CONFIG = {
	// 敵人區域：4x6（橫向）
	enemyRows: 4,
	enemyCols: 6,
	// 中間區域：6x6（橫向）
	playerRows: 6,
	playerCols: 6,
	// 下方選項區域：每個選項顯示區域大小
	optionAreaHeight: 100,
	// 格子大小
	cellSize: 40,
	// 格子間距
	cellPadding: 2,
	// 下方選項區域方塊縮放比例（拖曳時會變回 1）
	optionPieceScale: 0.6
} as const;

// 區域位置配置
export const AREA_POSITIONS = {
	enemyArea: {
		x: (GAME_WIDTH - GRID_CONFIG.enemyCols * GRID_CONFIG.cellSize) / 2,
		y: 80
	},
	playerArea: {
		x: (GAME_WIDTH - GRID_CONFIG.playerCols * GRID_CONFIG.cellSize) / 2,
		y: GRID_CONFIG.enemyRows * GRID_CONFIG.cellSize + 100
	},
	optionArea: {
		x: 10,
		y: GAME_HEIGHT - GRID_CONFIG.optionAreaHeight - 20
	}
} as const;

// 顏色設定
export const COLORS = {
	background: '#1a1a2e',
	border: 0x00ff00,
	text: '#00ff00',
	gridLine: 0x4a5568,
	cellEmpty: 0x0f3460,
	cellFilled: 0x533483,
	enemy: 0xff0000,
	playerPiece: 0x00ff00,
	optionPiece: 0xffff00,
	button: 0x4a90e2,
	buttonHover: 0x357abd
} as const;

// 遊戲階段（用於狀態機）
export enum GamePhase {
	MENU = 'menu',
	START = 'start',
	PLAYER_TURN = 'player_turn',
	PLAYER_ATTACKING = 'player_attacking', // 子彈飛行中
	ENEMY_TURN = 'enemy_turn',
	LEVEL_COMPLETE_WAIT = 'level_complete_wait', // 等待關卡完成（清除子彈）
	SKILL_SELECT = 'skill_select',
	GAME_OVER = 'game_over'
}

// 玩家生命值
export const PLAYER_HP = 100;
