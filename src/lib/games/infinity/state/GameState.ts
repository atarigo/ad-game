/**
 * 遊戲狀態管理
 */

import { CharacterStats, createDefaultWeapon, createDefaultArmor, ITEMS, ItemType } from '../entities';

/**
 * 地圖等級
 */
export enum MapLevel {
	D = 'D',
	C = 'C',
	B = 'B',
	A = 'A',
	S = 'S'
}

/**
 * 地圖等級順序（用於比較）
 */
export const MAP_LEVEL_ORDER: MapLevel[] = [
	MapLevel.D,
	MapLevel.C,
	MapLevel.B,
	MapLevel.A,
	MapLevel.S
];

/**
 * 每個地圖等級的關卡數
 */
export const STAGES_PER_MAP = 3;

/**
 * 總關卡數
 */
export const TOTAL_STAGES = MAP_LEVEL_ORDER.length * STAGES_PER_MAP; // 15

/**
 * 根據地圖等級取得可購買的血瓶類型
 */
export function getAvailablePotions(mapLevel: MapLevel): ItemType[] {
	const potions: ItemType[] = [];

	// D級以上都可以買 D級血瓶
	potions.push(ItemType.HealthPotionD);

	if (mapLevel === MapLevel.C || mapLevel === MapLevel.B || mapLevel === MapLevel.A || mapLevel === MapLevel.S) {
		potions.push(ItemType.HealthPotionC);
	}

	if (mapLevel === MapLevel.B || mapLevel === MapLevel.A || mapLevel === MapLevel.S) {
		potions.push(ItemType.HealthPotionB);
	}

	if (mapLevel === MapLevel.A || mapLevel === MapLevel.S) {
		potions.push(ItemType.HealthPotionA);
	}

	// S級地圖不開放 S級血瓶（目前沒有 S級血瓶）

	return potions;
}

/**
 * 遊戲狀態介面
 */
export interface IGameState {
	// 進度
	currentMapLevel: MapLevel;
	currentStage: number; // 1-3（當前地圖內的關卡）
	totalStagesCleared: number; // 0-15

	// 玩家狀態
	playerStats: CharacterStats;

	// 貨幣（未來擴充）
	gold: number;
}

/**
 * 遊戲狀態管理類別（單例模式）
 */
export class GameState {
	private static instance: GameState | null = null;

	// 進度
	public currentMapLevel: MapLevel = MapLevel.D;
	public currentStage: number = 1;
	public totalStagesCleared: number = 0;

	// 玩家狀態
	public playerStats: CharacterStats;

	// 貨幣
	public gold: number = 0;

	private constructor() {
		// 初始化玩家狀態
		this.playerStats = this.createInitialPlayerStats();
	}

	/**
	 * 取得遊戲狀態實例
	 */
	public static getInstance(): GameState {
		if (!GameState.instance) {
			GameState.instance = new GameState();
		}
		return GameState.instance;
	}

	/**
	 * 重置遊戲狀態（開始新遊戲）
	 */
	public static reset(): void {
		GameState.instance = null;
	}

	/**
	 * 建立初始玩家狀態
	 */
	private createInitialPlayerStats(): CharacterStats {
		return new CharacterStats(
			{}, // 使用預設主屬性
			{}, // 不使用舊的裝備加成系統
			{
				weapon: createDefaultWeapon(), // 木劍 (+5 攻擊)
				armor: createDefaultArmor(), // 布甲 (+1 防禦)
				items: [ITEMS[ItemType.HealthPotionD]], // 初始 1 瓶 D 級血瓶
				maxItemSlots: 1 // 初始道具欄位 1 格
			}
		);
	}

	/**
	 * 進入下一關
	 * @returns 是否成功進入下一關（false 表示遊戲結束）
	 */
	public nextStage(): boolean {
		this.totalStagesCleared++;

		if (this.totalStagesCleared >= TOTAL_STAGES) {
			// 遊戲通關
			return false;
		}

		this.currentStage++;

		// 如果當前地圖的關卡已經完成，進入下一個地圖等級
		if (this.currentStage > STAGES_PER_MAP) {
			this.currentStage = 1;
			const currentIndex = MAP_LEVEL_ORDER.indexOf(this.currentMapLevel);
			if (currentIndex < MAP_LEVEL_ORDER.length - 1) {
				this.currentMapLevel = MAP_LEVEL_ORDER[currentIndex + 1];
			}
		}

		return true;
	}

	/**
	 * 取得當前關卡的總編號（1-15）
	 */
	public get currentStageNumber(): number {
		const mapIndex = MAP_LEVEL_ORDER.indexOf(this.currentMapLevel);
		return mapIndex * STAGES_PER_MAP + this.currentStage;
	}

	/**
	 * 取得當前可購買的血瓶類型
	 */
	public get availablePotions(): ItemType[] {
		return getAvailablePotions(this.currentMapLevel);
	}

	/**
	 * 購買道具欄擴充
	 * @returns 是否成功購買
	 */
	public buyItemSlot(): boolean {
		if (this.playerStats.maxItemSlots >= 3) {
			return false; // 已達上限
		}
		this.playerStats.maxItemSlots++;
		return true;
	}

	/**
	 * 購買血瓶
	 * @param potionType 血瓶類型
	 * @returns 是否成功購買
	 */
	public buyPotion(potionType: ItemType): boolean {
		// 檢查是否有空的道具欄
		if (!this.playerStats.hasItemSpace) {
			return false;
		}

		// 檢查是否為可購買的血瓶類型
		if (!this.availablePotions.includes(potionType)) {
			return false;
		}

		// 添加道具
		return this.playerStats.addItem(ITEMS[potionType]);
	}

	/**
	 * 出售道具
	 * @param index 道具索引
	 * @returns 是否成功出售
	 */
	public sellItem(index: number): boolean {
		const item = this.playerStats.removeItem(index);
		if (item) {
			// 未來可以在這裡加入返還金幣的邏輯
			return true;
		}
		return false;
	}

	/**
	 * 戰鬥後回復玩家狀態（可選，用於補給場景）
	 */
	public healPlayerToFull(): void {
		this.playerStats.resetToMax();
	}
}
