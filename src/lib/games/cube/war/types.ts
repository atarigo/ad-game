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
	templateId: string; // 敵人模板 ID（對應 JSON 中的 id）
	name: string; // 敵人名稱
	position: GridPosition;
	size: 1 | 2 | 3; // 1x1, 2x2, 3x3
	cooldown: number; // 冷卻時間（回合數）
	maxCooldown: number;
	hp: number;
	maxHp: number;
	attack: number; // 攻擊力
	color: number; // 顏色（十六進制）
	isBoss?: boolean; // 是否為 Boss
}

// 技能效果類型
export type SkillEffectType =
	| 'max_hp'
	| 'heal'
	| 'bullet_damage'
	| 'double_bullet'
	| 'enemy_slow'
	| 'pierce'
	| 'critical'
	| 'shield'
	| 'grid_expand'
	| 'more_options';

// 技能資料
export interface Skill {
	id: string;
	name: string;
	description: string;
	icon: string;
	effectType: SkillEffectType;
	value: number;
}

// 玩家技能狀態（追蹤已獲得的技能效果）
export interface PlayerSkills {
	maxHpBoost: number; // 最大生命值增加
	bulletDamage: number; // 子彈傷害加成
	doubleBullet: boolean; // 是否有雙重射擊
	pierceActive: boolean; // 是否有穿透效果
	criticalChance: number; // 暴擊機率
	shieldCount: number; // 護盾數量
	enemySlowBoost: number; // 敵人冷卻增加
	moreOptionsCount: number; // 額外可選方塊數量
	acquiredSkills: string[]; // 已獲得的技能ID列表
}

import type { GamePhase } from './config';

// 遊戲狀態
export interface GameState {
	phase: GamePhase;
	playerHp: number;
	playerMaxHp: number; // 最大生命值
	level: number; // 關卡數
	round: number; // 回合數（在當前關卡內）
	enemies: Enemy[];
	playerGrid: (number | null)[][]; // null 表示空，數字表示方塊ID
	options: TetrisPiece[];
	skills: PlayerSkills; // 玩家技能狀態
}
