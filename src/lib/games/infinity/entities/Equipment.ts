/**
 * 裝備系統
 */

/**
 * 武器類型
 */
export enum WeaponType {
	WoodenSword = 'wooden_sword',
	IronSword = 'iron_sword',
	SteelSword = 'steel_sword'
}

/**
 * 防具類型
 */
export enum ArmorType {
	ClothArmor = 'cloth_armor',
	Leather = 'leather',
	IronArmor = 'iron_armor'
}

/**
 * 道具類型
 */
export enum ItemType {
	HealthPotionD = 'health_potion_d', // D級血瓶
	HealthPotionC = 'health_potion_c', // C級血瓶
	HealthPotionB = 'health_potion_b', // B級血瓶
	HealthPotionA = 'health_potion_a' // A級血瓶
}

/**
 * 武器資料
 */
export interface Weapon {
	type: WeaponType;
	name: string;
	nameEn: string;
	attack: number;
}

/**
 * 防具資料
 */
export interface Armor {
	type: ArmorType;
	name: string;
	nameEn: string;
	defense: number;
}

/**
 * 道具資料
 */
export interface Item {
	type: ItemType;
	name: string;
	nameEn: string;
	/** 回復百分比（0-1），例如 0.25 表示回復 25% 最大血量 */
	healPercent?: number;
	effect: (stats: any) => void; // 使用效果函數
}

/**
 * 武器資料庫
 */
export const WEAPONS: Record<WeaponType, Weapon> = {
	[WeaponType.WoodenSword]: {
		type: WeaponType.WoodenSword,
		name: '木劍',
		nameEn: 'Wooden Sword',
		attack: 5
	},
	[WeaponType.IronSword]: {
		type: WeaponType.IronSword,
		name: '鐵劍',
		nameEn: 'Iron Sword',
		attack: 10
	},
	[WeaponType.SteelSword]: {
		type: WeaponType.SteelSword,
		name: '鋼劍',
		nameEn: 'Steel Sword',
		attack: 15
	}
};

/**
 * 防具資料庫
 */
export const ARMORS: Record<ArmorType, Armor> = {
	[ArmorType.ClothArmor]: {
		type: ArmorType.ClothArmor,
		name: '布甲',
		nameEn: 'Cloth Armor',
		defense: 1
	},
	[ArmorType.Leather]: {
		type: ArmorType.Leather,
		name: '皮甲',
		nameEn: 'Leather',
		defense: 2
	},
	[ArmorType.IronArmor]: {
		type: ArmorType.IronArmor,
		name: '鐵甲',
		nameEn: 'Iron Armor',
		defense: 3
	}
};

/**
 * 建立血瓶效果函數
 * @param healPercent 回復百分比（0-1）
 */
function createHealthPotionEffect(healPercent: number) {
	return (stats: { currentHealth: number; derived: { healthPoints: number } }) => {
		const maxHealth = stats.derived.healthPoints;
		const healAmount = maxHealth * healPercent;
		// 不會溢補，最多回復到最大血量
		stats.currentHealth = Math.min(stats.currentHealth + healAmount, maxHealth);
	};
}

/**
 * 道具資料庫
 */
export const ITEMS: Record<ItemType, Item> = {
	[ItemType.HealthPotionD]: {
		type: ItemType.HealthPotionD,
		name: 'D級血瓶',
		nameEn: 'Health Potion (D)',
		healPercent: 0.25,
		effect: createHealthPotionEffect(0.25)
	},
	[ItemType.HealthPotionC]: {
		type: ItemType.HealthPotionC,
		name: 'C級血瓶',
		nameEn: 'Health Potion (C)',
		healPercent: 0.5,
		effect: createHealthPotionEffect(0.5)
	},
	[ItemType.HealthPotionB]: {
		type: ItemType.HealthPotionB,
		name: 'B級血瓶',
		nameEn: 'Health Potion (B)',
		healPercent: 0.75,
		effect: createHealthPotionEffect(0.75)
	},
	[ItemType.HealthPotionA]: {
		type: ItemType.HealthPotionA,
		name: 'A級血瓶',
		nameEn: 'Health Potion (A)',
		healPercent: 1.0,
		effect: createHealthPotionEffect(1.0)
	}
};

/**
 * 建立預設武器（木劍）
 */
export function createDefaultWeapon(): Weapon {
	return WEAPONS[WeaponType.WoodenSword];
}

/**
 * 建立預設防具（布甲）
 */
export function createDefaultArmor(): Armor {
	return ARMORS[ArmorType.ClothArmor];
}
