/**
 * 傷害計算系統
 * 支援多種傷害類型的計算
 */

import type { PrimaryAttributes } from './CharacterStats';
import type { CharacterStats } from './CharacterStats';

/**
 * 傷害類型
 */
export enum DamageType {
	Physical = 'physical', // 物理傷害（考慮物理防禦）
	Magic = 'magic', // 魔法傷害（考慮魔法防禦）
	True = 'true' // 真實傷害（無視防禦）
}

/**
 * 傷害來源
 */
export interface DamageSource {
	type: DamageType;
	baseValue?: number; // 基礎傷害值
	multiplier?: number; // 倍率（例如 1.5 = 150%）
	attribute?: keyof PrimaryAttributes; // 基於哪個屬性
	attributePercent?: number; // 屬性百分比（例如 0.6 = 60%）
	attacker?: CharacterStats; // 攻擊者（用於計算基礎攻擊力）
}

/**
 * 傷害結果
 */
export interface DamageResult {
	baseDamage: number; // 基礎傷害（計算防禦前）
	actualDamage: number; // 實際傷害（計算防禦後）
	isCritical: boolean; // 是否暴擊
	damageType: DamageType; // 傷害類型
}

/**
 * 計算傷害
 * @param source 傷害來源
 * @param defender 防禦者
 * @param isCritical 是否為暴擊
 * @returns 傷害結果
 */
export function calculateDamage(
	source: DamageSource,
	defender: CharacterStats,
	isCritical: boolean = false
): DamageResult {
	let baseDamage = 0;

	// 計算基礎傷害
	if (source.type === DamageType.True) {
		// 真實傷害：基於屬性
		if (source.attribute && source.attributePercent && source.attacker) {
			baseDamage = source.attacker.primary[source.attribute] * source.attributePercent;
		} else if (source.baseValue) {
			baseDamage = source.baseValue;
		}

		// 真實傷害無視防禦
		const actualDamage = baseDamage;
		defender.currentHealth = Math.max(0, defender.currentHealth - actualDamage);

		return {
			baseDamage,
			actualDamage,
			isCritical,
			damageType: DamageType.True
		};
	}

	// 普通傷害：計算基礎值
	if (source.multiplier && source.attacker) {
		// 倍率傷害（基於普通攻擊力）
		baseDamage = source.attacker.derived.meleeAttack * source.multiplier;
	} else if (source.attribute && source.attributePercent && source.attacker) {
		// 屬性傷害
		baseDamage = source.attacker.primary[source.attribute] * source.attributePercent;
	} else if (source.baseValue) {
		// 固定傷害
		baseDamage = source.baseValue;
	}

	// 計算防禦
	const defense = source.type === DamageType.Magic ? defender.derived.magicDefense : defender.derived.defense;

	const actualDamage = Math.max(0, baseDamage - defense);
	defender.currentHealth = Math.max(0, defender.currentHealth - actualDamage);

	return {
		baseDamage,
		actualDamage,
		isCritical,
		damageType: source.type
	};
}
