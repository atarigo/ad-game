// 方塊類型
export type TetrisPieceType =
	| 'I'
	| 'O'
	| 'T'
	| 'S'
	| 'Z'
	| 'J'
	| 'L'
	| '1x1'
	| '2x1'
	| '1x2'
	| '1x3'
	| '3x1'
	| '2x2_TL'
	| '2x2_TR'
	| '2x2_BL'
	| '2x2_BR';

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

import type { GamePhase } from './config';

// 遊戲狀態
export interface GameState {
	phase: GamePhase;
	playerHp: number;
	level: number; // 關卡數
	round: number; // 回合數（在當前關卡內）
	enemies: Enemy[];
	playerGrid: (number | null)[][]; // null 表示空，數字表示方塊ID
	options: TetrisPiece[];
}
