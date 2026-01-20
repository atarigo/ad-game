// 遊戲可視範圍大小 (手機友善尺寸)
export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 640;

// 區域設定
export const ZONES = {
	// UI 區域（最底部）
	uiAreaHeight: 60,
	// 技能格區域（UI 上方）
	skillRowHeight: 50,
	// 道具格區域（技能格上方）
	itemRowHeight: 50,
	// 玩家區域（道具格上方）
	playerAreaHeight: 120,
	// 敵人區域（上方）
	get enemyAreaHeight() {
		return (
			GAME_HEIGHT -
			this.playerAreaHeight -
			this.itemRowHeight -
			this.skillRowHeight -
			this.uiAreaHeight
		);
	}
} as const;

// 顏色設定
export const COLORS = {
	background: '#1a4d1a', // 深綠色背景（敵人區域）
	playerArea: '#0d260d', // 更深的綠色（玩家區域）
	uiArea: '#0a1a0a', // 最深的綠色（UI 區域）
	player: 0x00ff00, // 亮綠色
	playerStroke: 0x00aa00, // 玩家邊框
	zoneDivider: 0x2d5a2d, // 區域分隔線
	enemySlot: 0x143d14, // 敵人格子填充
	enemySlotStroke: 0x2d5a2d, // 敵人格子邊框
	enemy: 0xff0000, // 紅色敵人
	enemyStroke: 0xaa0000, // 敵人邊框
	// UI 按鈕
	button: 0x2d5a2d,
	buttonHover: 0x3d7a3d,
	buttonStroke: 0x4a8a4a,
	buttonText: 0xffffff,
	// 血量條
	healthBarBackground: 0x333333,
	healthBarFill: 0x00ff00,
	healthBarLow: 0xff0000, // 血量低於 30% 時顯示紅色
	healthBarStroke: 0x000000,
	// 技能格和道具格
	skillSlot: 0x2a4a2a, // 技能格背景
	skillSlotStroke: 0x3d5a3d, // 技能格邊框
	itemSlot: 0x2a4a2a, // 道具格背景
	itemSlotStroke: 0x3d5a3d, // 道具格邊框
	itemSlotFilled: 0x4a6a4a // 有道具的格子
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

// UI 按鈕設定
export const UI_BUTTON = {
	width: 80,
	height: 40,
	padding: 10, // 距離邊緣的間距
	strokeWidth: 2,
	fontSize: 14
} as const;

// 血量條設定
export const HEALTH_BAR = {
	width: 40, // 血量條寬度
	height: 6, // 血量條高度
	offsetY: 8, // 距離角色頭部的距離
	strokeWidth: 1,
	lowHealthThreshold: 0.3 // 低血量閾值（30%）
} as const;

// 資訊抽屜設定
export const INFO_DRAWER = {
	height: 200, // 抽屜高度（增加以容納裝備和道具）
	padding: 12, // 內邊距
	fontSize: 11,
	titleFontSize: 14,
	animationDuration: 200, // 動畫時間 (ms)
	backgroundColor: 0x1a1a2e,
	borderColor: 0x4a4a6a,
	textColor: '#ffffff',
	labelColor: '#aaaaaa',
	equipmentColor: '#4a9eff' // 裝備文字顏色
} as const;

// 技能格設定
export const SKILL_SLOTS = {
	count: 3, // 技能格數量
	size: 40, // 格子大小
	gap: 8, // 格子間距
	padding: 10, // 距離邊緣的間距
	strokeWidth: 2
} as const;

// 道具格設定
export const ITEM_SLOTS = {
	size: 40, // 格子大小
	gap: 8, // 格子間距
	padding: 10, // 距離邊緣的間距
	strokeWidth: 2
} as const;

// 商店設定
export const SHOP = {
	itemSize: 70, // 商品格子大小
	itemGap: 10, // 商品間距
	padding: 20, // 邊距
	fontSize: 12,
	titleFontSize: 18,
	priceColor: '#ffcc00', // 金幣顏色
	disabledColor: 0x555555 // 不可購買時的顏色
} as const;
