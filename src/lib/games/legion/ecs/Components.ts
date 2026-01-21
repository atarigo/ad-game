// 位置組件
export interface PositionComponent {
	row: number;
	col: number;
	width: number; // 占用格子寬度
	height: number; // 占用格子高度
}

// 陣營組件
export interface TeamComponent {
	isEnemy: boolean;
}

// 屬性組件
export interface StatsComponent {
	str: number;
	vit: number;
}

// 戰鬥組件
export interface CombatComponent {
	currentHp: number;
	maxHp: number;
	atk: number;
	def: number;
}

// 渲染組件
export interface RenderComponent {
	color: number;
	sprite?: Phaser.GameObjects.Rectangle;
	hpBarBackground?: Phaser.GameObjects.Rectangle;
	hpBarFill?: Phaser.GameObjects.Rectangle;
	hpBarBorder?: Phaser.GameObjects.Rectangle;
}

// 移動組件
export interface MovementComponent {
	canMove: boolean; // 是否可以移動
	hasMoved: boolean; // 本回合是否已移動
}

// 組件名稱常量
export const COMPONENTS = {
	POSITION: 'position',
	TEAM: 'team',
	STATS: 'stats',
	COMBAT: 'combat',
	RENDER: 'render',
	MOVEMENT: 'movement'
} as const;
