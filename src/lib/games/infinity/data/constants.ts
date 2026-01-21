/**
 * 遊戲數值常數
 * 集中管理所有遊戲平衡相關的數值
 */

/**
 * 等級類型
 */
export type Tier = 'D' | 'C' | 'B' | 'A' | 'S';

/**
 * 等級順序（用於比較和晉級）
 */
export const TIER_ORDER: Tier[] = ['D', 'C', 'B', 'A', 'S'];

/**
 * 敵人屬性倍率
 * D=1.0x, C=1.2x, B=1.6x, A=2.2x, S=3.0x
 */
export const TIER_MULTIPLIERS: Record<Tier, number> = {
	D: 1.0,
	C: 1.2,
	B: 1.6,
	A: 2.2,
	S: 3.0
};

/**
 * 關卡總獎勵點數
 */
export const STAGE_REWARDS: Record<Tier, number> = {
	D: 10000,
	C: 20000,
	B: 30000,
	A: 40000,
	S: 50000
};

/**
 * 裝備價格
 */
export const EQUIPMENT_PRICES: Record<Tier, number> = {
	D: 5000,
	C: 10000,
	B: 15000,
	A: 20000,
	S: 25000
};

/**
 * 血瓶價格
 */
export const POTION_PRICES: Record<Tier, number> = {
	D: 1000,
	C: 2000,
	B: 3000,
	A: 4000,
	S: 5000
};

/**
 * 屬性升級成本區間
 */
export const ATTRIBUTE_UPGRADE_COSTS = [
	{ max: 50, cost: 50 },
	{ max: 100, cost: 100 },
	{ max: 150, cost: 200 },
	{ max: 200, cost: 400 },
	{ max: 250, cost: 800 }
] as const;

/**
 * 計算屬性升級成本
 * @param currentValue 當前屬性值
 * @returns 升級一點所需的點數
 */
export function getAttributeUpgradeCost(currentValue: number): number {
	for (const tier of ATTRIBUTE_UPGRADE_COSTS) {
		if (currentValue < tier.max) {
			return tier.cost;
		}
	}
	return ATTRIBUTE_UPGRADE_COSTS[ATTRIBUTE_UPGRADE_COSTS.length - 1].cost;
}

/**
 * 計算屬性從 start 升級到 target 的總成本
 * @param start 起始值
 * @param target 目標值
 * @returns 總花費點數
 */
export function getTotalAttributeUpgradeCost(start: number, target: number): number {
	let total = 0;
	for (let i = start; i < target; i++) {
		total += getAttributeUpgradeCost(i);
	}
	return total;
}

/**
 * 裝備掉落機率
 */
export const DROP_CHANCE = 0.15;

/**
 * 晉級所需通關次數
 */
export const STAGES_TO_PROMOTE = 3;

/**
 * 縮放敵人屬性
 * @param baseValue 基礎屬性值
 * @param tier 等級
 * @returns 縮放後的屬性值
 */
export function scaleAttributeByTier(baseValue: number, tier: Tier): number {
	return Math.floor(baseValue * TIER_MULTIPLIERS[tier]);
}

/**
 * 縮放點數獎勵
 * @param baseReward 基礎獎勵
 * @param tier 等級
 * @returns 縮放後的獎勵
 */
export function scaleRewardByTier(baseReward: number, tier: Tier): number {
	return Math.floor(baseReward * TIER_MULTIPLIERS[tier]);
}
