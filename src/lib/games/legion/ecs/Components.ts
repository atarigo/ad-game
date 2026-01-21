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
}

// 組件名稱常量
export const COMPONENTS = {
	POSITION: 'position',
	TEAM: 'team',
	STATS: 'stats',
	COMBAT: 'combat',
	RENDER: 'render'
} as const;
