/**
 * 遊戲狀態管理
 */

import { CharacterStats, createDefaultWeapon, createDefaultArmor, ITEMS, ItemType } from '../entities';
import { getRandomStage } from '../data';
import type { StageConfig } from '../data';
import {
	TIER_ORDER,
	STAGES_TO_PROMOTE,
	POTION_PRICES,
	EQUIPMENT_PRICES,
	getAttributeUpgradeCost
} from '../data/constants';
import type { Tier } from '../data/constants';

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
 * 每個地圖等級的關卡數（改為無限，用晉級系統）
 */
export const STAGES_PER_MAP = 3;

/**
 * 總關卡數（用於顯示，實際可無限）
 */
export const TOTAL_STAGES = MAP_LEVEL_ORDER.length * STAGES_PER_MAP;

/**
 * 根據地圖等級取得可購買的血瓶類型
 */
export function getAvailablePotions(mapLevel: MapLevel): ItemType[] {
	const potions: ItemType[] = [];

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

	return potions;
}

/**
 * 取得血瓶價格
 */
export function getPotionPrice(itemType: ItemType): number {
	const priceMap: Partial<Record<ItemType, Tier>> = {
		[ItemType.HealthPotionD]: 'D',
		[ItemType.HealthPotionC]: 'C',
		[ItemType.HealthPotionB]: 'B',
		[ItemType.HealthPotionA]: 'A'
	};
	const tier = priceMap[itemType];
	return tier ? POTION_PRICES[tier] : 0;
}

/**
 * 遊戲狀態介面
 */
export interface IGameState {
	currentMapLevel: MapLevel;
	currentStage: number;
	totalStagesCleared: number;
	playerStats: CharacterStats;
	points: number;
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
	public stagesClearedInCurrentLevel: number = 0;

	// 當前關卡配置
	public currentStageConfig: StageConfig;

	// 玩家狀態
	public playerStats: CharacterStats;

	// 貨幣（點數）
	public points: number = 0;

	private constructor() {
		this.playerStats = this.createInitialPlayerStats();
		this.currentStageConfig = getRandomStage(this.currentMapLevel);
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
			{},
			{},
			{
				weapon: createDefaultWeapon(),
				armor: createDefaultArmor(),
				items: [ITEMS[ItemType.HealthPotionD]],
				maxItemSlots: 1
			}
		);
	}

	/**
	 * 增加點數
	 */
	public addPoints(amount: number): void {
		this.points += amount;
		console.log(`[點數] +${amount}，目前: ${this.points}`);
	}

	/**
	 * 消費點數
	 * @returns 是否成功消費
	 */
	public spendPoints(amount: number): boolean {
		if (this.points >= amount) {
			this.points -= amount;
			console.log(`[點數] -${amount}，目前: ${this.points}`);
			return true;
		}
		console.log(`[點數] 不足！需要 ${amount}，目前: ${this.points}`);
		return false;
	}

	/**
	 * 進入下一關
	 * @returns 是否成功進入下一關（false 表示遊戲通關）
	 */
	public nextStage(): boolean {
		this.totalStagesCleared++;
		this.stagesClearedInCurrentLevel++;
		this.currentStage++;

		// 檢查是否可以晉級
		if (this.stagesClearedInCurrentLevel >= STAGES_TO_PROMOTE) {
			const currentIndex = MAP_LEVEL_ORDER.indexOf(this.currentMapLevel);

			if (currentIndex < MAP_LEVEL_ORDER.length - 1) {
				// 晉級到下一等級
				this.currentMapLevel = MAP_LEVEL_ORDER[currentIndex + 1];
				this.currentStage = 1;
				this.stagesClearedInCurrentLevel = 0;
				console.log(`🎉 晉級到 ${this.currentMapLevel} 級！`);
			}
			// S 級無限循環，不需要特殊處理
		}

		// 選擇下一個關卡配置
		this.currentStageConfig = getRandomStage(this.currentMapLevel);

		return true;
	}

	/**
	 * 取得當前關卡的總編號
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
	 * 取得道具欄擴充價格
	 * 第一格（1→2）: 10000，第二格（2→3）: 20000
	 */
	public getItemSlotPrice(): number {
		const currentSlots = this.playerStats.maxItemSlots;
		if (currentSlots === 1) return 10000;
		if (currentSlots === 2) return 20000;
		return 0; // 已達上限
	}

	/**
	 * 購買道具欄擴充
	 * @returns 是否成功購買
	 */
	public buyItemSlot(): boolean {
		if (this.playerStats.maxItemSlots >= 3) {
			return false;
		}
		const price = this.getItemSlotPrice();
		if (!this.spendPoints(price)) {
			return false;
		}
		this.playerStats.maxItemSlots++;
		return true;
	}

	/**
	 * 購買血瓶
	 * @returns 是否成功購買
	 */
	public buyPotion(potionType: ItemType): boolean {
		if (!this.playerStats.hasItemSpace) {
			return false;
		}

		if (!this.availablePotions.includes(potionType)) {
			return false;
		}

		const price = getPotionPrice(potionType);
		if (!this.spendPoints(price)) {
			return false;
		}

		return this.playerStats.addItem(ITEMS[potionType]);
	}

	/**
	 * 出售道具
	 * @returns 是否成功出售
	 */
	public sellItem(index: number): boolean {
		const item = this.playerStats.removeItem(index);
		if (item) {
			// 返還一半價格
			const price = getPotionPrice(item.type);
			const sellPrice = Math.floor(price * 0.5);
			this.addPoints(sellPrice);
			return true;
		}
		return false;
	}

	/**
	 * 升級屬性
	 * @param attribute 屬性名稱
	 * @returns 是否成功升級
	 */
	public upgradeAttribute(attribute: keyof typeof this.playerStats.primary): boolean {
		const currentValue = this.playerStats.primary[attribute];

		if (currentValue >= 250) {
			console.log(`[屬性] ${attribute} 已達上限 250`);
			return false;
		}

		const cost = getAttributeUpgradeCost(currentValue);
		if (!this.spendPoints(cost)) {
			return false;
		}

		this.playerStats.primary[attribute]++;
		console.log(`[屬性] ${attribute} 升級至 ${this.playerStats.primary[attribute]}，花費 ${cost} 點`);

		// 更新延伸屬性影響的當前值
		if (attribute === 'vitality') {
			// 體力影響血量，按比例調整
			const oldMax = (currentValue) * 10;
			const newMax = this.playerStats.derived.healthPoints;
			this.playerStats.currentHealth = (this.playerStats.currentHealth / oldMax) * newMax;
		}
		if (attribute === 'intelligence') {
			// 智力影響魔力，按比例調整
			const oldMax = (currentValue) * 10;
			const newMax = this.playerStats.derived.manaPoints;
			this.playerStats.currentMana = (this.playerStats.currentMana / oldMax) * newMax;
		}

		return true;
	}

	/**
	 * 戰鬥後回復玩家狀態
	 */
	public healPlayerToFull(): void {
		this.playerStats.resetToMax();
	}
}
