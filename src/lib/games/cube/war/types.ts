// 俄羅斯方塊類型
export type TetrisPieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

// 方塊形狀定義（相對於中心點的偏移）
export interface TetrisPiece {
	type: TetrisPieceType;
	shape: Array<{ x: number; y: number }>; // 相對於中心點的偏移
	color: number;
}

// 格子位置
export interface GridPosition {
	row: number;
	col: number;
}

// 敵人資料
export interface Enemy {
	id: string;
	position: GridPosition;
	size: 1 | 2 | 3; // 1x1, 2x2, 3x3
	cooldown: number; // 冷卻時間（回合數）
	maxCooldown: number;
	hp: number;
	maxHp: number;
}

// 遊戲狀態
export interface GameState {
	phase: string;
	playerHp: number;
	round: number;
	enemies: Enemy[];
	playerGrid: (number | null)[][]; // null 表示空，數字表示方塊ID
	options: TetrisPiece[];
}
