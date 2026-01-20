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
	HealthPotion = 'health_potion'
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
 * 道具資料庫
 */
export const ITEMS: Record<ItemType, Item> = {
	[ItemType.HealthPotion]: {
		type: ItemType.HealthPotion,
		name: '血瓶',
		nameEn: 'Health Potion',
		effect: (stats: { currentHealth: number; derived: { healthPoints: number } }) => {
			// 回復 50 點血量，可超過上限
			stats.currentHealth = Math.min(
				stats.currentHealth + 50,
				stats.derived.healthPoints + 50
			);
		}
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
