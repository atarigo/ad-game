/**
 * 角色狀態系統
 * 敵我雙方皆使用相同的屬性公式計算
 */

import type { Weapon, Armor, Item } from './Equipment';

// 主屬性基礎值
export const BASE_ATTRIBUTE_VALUE = 10;

/**
 * 主屬性介面
 */
export interface PrimaryAttributes {
	/** 力量 - 影響近距離攻擊力 */
	strength: number;
	/** 敏捷 - 預留給未來使用 */
	agility: number;
	/** 體力 - 影響血量、物理防禦 */
	vitality: number;
	/** 智力 - 影響魔法攻擊、魔力、魔法防禦 */
	intelligence: number;
	/** 意志 - 影響回復、暴擊傷害 */
	willpower: number;
	/** 幸運 - 影響暴擊機率 */
	luck: number;
}

/**
 * 裝備加成介面
 */
export interface EquipmentBonuses {
	/** 武器攻擊力 */
	weaponAttack: number;
	/** 魔法攻擊力加成 */
	magicAttack: number;
	/** 魔法武器攻擊力 */
	magicWeaponAttack: number;
	/** 子彈攻擊力 */
	ammoAttack: number;
	/** 防具魔法防禦力 */
	armorMagicDefense: number;
}

/**
 * 延伸屬性介面（唯讀，由公式計算）
 */
export interface DerivedAttributes {
	/** 近距離攻擊力 = 力量 + 武器攻擊力 */
	readonly meleeAttack: number;
	/** 魔法攻擊力 = 智力 + 魔法攻擊力 + 魔法武器攻擊力 */
	readonly magicAttack: number;
	/** 遠程攻擊力 = 武器攻擊力 + 子彈攻擊力 */
	readonly rangedAttack: number;
	/** 血量 = 體力 * 10 */
	readonly healthPoints: number;
	/** 魔力 = 智力 * 10 */
	readonly manaPoints: number;
	/** 物理防禦 = 體力 + 防具防禦力 */
	readonly defense: number;
	/** 魔法防禦力 = 智力 + 防具魔法防禦力 */
	readonly magicDefense: number;
	/** 每回合回復血量 = 意志 */
	readonly healthRegeneration: number;
	/** 每回合恢復魔力 = 意志 * 0.2 */
	readonly manaRegeneration: number;
	/** 暴擊機率 = 幸運 * 0.1 */
	readonly criticalChance: number;
	/** 暴擊傷害 = 意志 * 0.1 */
	readonly criticalDamage: number;
}

/**
 * 建立預設主屬性
 */
export function createDefaultPrimaryAttributes(): PrimaryAttributes {
	return {
		strength: BASE_ATTRIBUTE_VALUE,
		agility: BASE_ATTRIBUTE_VALUE,
		vitality: BASE_ATTRIBUTE_VALUE,
		intelligence: BASE_ATTRIBUTE_VALUE,
		willpower: BASE_ATTRIBUTE_VALUE,
		luck: BASE_ATTRIBUTE_VALUE
	};
}

/**
 * 建立空的裝備加成
 */
export function createEmptyEquipmentBonuses(): EquipmentBonuses {
	return {
		weaponAttack: 0,
		magicAttack: 0,
		magicWeaponAttack: 0,
		ammoAttack: 0,
		armorMagicDefense: 0
	};
}

/**
 * 角色狀態類別
 * 包含主屬性、裝備、道具，以及自動計算的延伸屬性
 */
export class CharacterStats {
	/** 主屬性 */
	public primary: PrimaryAttributes;

	/** 裝備加成（保留向後兼容） */
	public equipment: EquipmentBonuses;

	/** 裝備欄位 */
	public weapon: Weapon | null = null;
	public armor: Armor | null = null;

	/** 道具欄位（初始容量 1，最大容量 3） */
	public items: Item[] = [];
	public maxItemSlots: number = 1;

	/** 當前血量 */
	public currentHealth: number;

	/** 當前魔力 */
	public currentMana: number;

	constructor(
		primary: Partial<PrimaryAttributes> = {},
		equipment: Partial<EquipmentBonuses> = {},
		options?: {
			weapon?: Weapon | null;
			armor?: Armor | null;
			items?: Item[];
			maxItemSlots?: number;
		}
	) {
		this.primary = {
			...createDefaultPrimaryAttributes(),
			...primary
		};
		this.equipment = {
			...createEmptyEquipmentBonuses(),
			...equipment
		};

		// 裝備欄位
		this.weapon = options?.weapon ?? null;
		this.armor = options?.armor ?? null;
		this.items = options?.items ?? [];
		this.maxItemSlots = options?.maxItemSlots ?? 1;

		// 初始化當前血量和魔力為最大值
		this.currentHealth = this.derived.healthPoints;
		this.currentMana = this.derived.manaPoints;
	}

	/**
	 * 延伸屬性（唯讀，即時計算）
	 */
	get derived(): DerivedAttributes {
		const { strength, vitality, intelligence, willpower, luck } = this.primary;
		const { magicAttack, magicWeaponAttack, ammoAttack, armorMagicDefense } = this.equipment;

		// 從裝備欄位取得武器攻擊力（優先使用裝備欄位）
		const weaponAttack = this.weapon?.attack ?? this.equipment.weaponAttack;

		// 從裝備欄位取得防具防禦力
		const armorDefense = this.armor?.defense ?? 0;

		return {
			// 攻擊類
			meleeAttack: strength + weaponAttack,
			magicAttack: intelligence + magicAttack + magicWeaponAttack,
			rangedAttack: weaponAttack + ammoAttack,

			// 生存類
			healthPoints: vitality * 10,
			manaPoints: intelligence * 10,

			// 防禦類
			defense: vitality + armorDefense,
			magicDefense: intelligence + armorMagicDefense,

			// 回復類
			healthRegeneration: willpower,
			manaRegeneration: willpower * 0.2,

			// 暴擊類
			criticalChance: luck * 0.1,
			criticalDamage: willpower * 0.1
		};
	}

	/**
	 * 回合結束時自動回復
	 */
	applyRegeneration(): void {
		const { healthPoints, manaPoints, healthRegeneration, manaRegeneration } = this.derived;

		this.currentHealth = Math.min(this.currentHealth + healthRegeneration, healthPoints);
		this.currentMana = Math.min(this.currentMana + manaRegeneration, manaPoints);
	}

	/**
	 * 受到傷害
	 * @param damage 傷害值
	 * @param isMagic 是否為魔法傷害
	 * @returns 實際受到的傷害值
	 */
	takeDamage(damage: number, isMagic: boolean = false): number {
		const defense = isMagic ? this.derived.magicDefense : this.derived.defense;
		const actualDamage = Math.max(0, damage - defense);
		this.currentHealth = Math.max(0, this.currentHealth - actualDamage);
		return actualDamage;
	}

	/**
	 * 消耗魔力
	 * @param amount 消耗量
	 * @returns 是否成功消耗（魔力是否足夠）
	 */
	consumeMana(amount: number): boolean {
		if (this.currentMana >= amount) {
			this.currentMana -= amount;
			return true;
		}
		return false;
	}

	/**
	 * 判斷是否暴擊
	 * @returns 是否觸發暴擊
	 */
	rollCritical(): boolean {
		return Math.random() < this.derived.criticalChance;
	}

	/**
	 * 計算暴擊後的傷害
	 * @param baseDamage 基礎傷害
	 * @returns 暴擊後的傷害
	 */
	calculateCriticalDamage(baseDamage: number): number {
		return baseDamage * (1 + this.derived.criticalDamage);
	}

	/**
	 * 是否存活
	 */
	get isAlive(): boolean {
		return this.currentHealth > 0;
	}

	/**
	 * 重置當前血量和魔力為最大值
	 */
	resetToMax(): void {
		this.currentHealth = this.derived.healthPoints;
		this.currentMana = this.derived.manaPoints;
	}

	/**
	 * 裝備武器
	 * @param weapon 武器
	 */
	equipWeapon(weapon: Weapon): void {
		this.weapon = weapon;
	}

	/**
	 * 裝備防具
	 * @param armor 防具
	 */
	equipArmor(armor: Armor): void {
		this.armor = armor;
	}

	/**
	 * 添加道具到道具欄
	 * @param item 道具
	 * @returns 是否成功添加（道具欄是否還有空間）
	 */
	addItem(item: Item): boolean {
		if (this.items.length >= this.maxItemSlots) {
			return false;
		}
		this.items.push(item);
		return true;
	}

	/**
	 * 使用道具
	 * @param index 道具索引
	 * @returns 是否成功使用
	 */
	useItem(index: number): boolean {
		if (index < 0 || index >= this.items.length) {
			return false;
		}
		const item = this.items[index];
		item.effect(this);
		this.items.splice(index, 1); // 使用後移除
		return true;
	}

	/**
	 * 移除道具（不使用）
	 * @param index 道具索引
	 * @returns 被移除的道具，如果索引無效則返回 null
	 */
	removeItem(index: number): Item | null {
		if (index < 0 || index >= this.items.length) {
			return null;
		}
		return this.items.splice(index, 1)[0];
	}

	/**
	 * 檢查道具欄是否還有空間
	 */
	get hasItemSpace(): boolean {
		return this.items.length < this.maxItemSlots;
	}
}
