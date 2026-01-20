export {
	CharacterStats,
	createDefaultPrimaryAttributes,
	createEmptyEquipmentBonuses,
	BASE_ATTRIBUTE_VALUE
} from './CharacterStats';

export type {
	PrimaryAttributes,
	EquipmentBonuses,
	DerivedAttributes
} from './CharacterStats';

export {
	WeaponType,
	ArmorType,
	ItemType,
	WEAPONS,
	ARMORS,
	ITEMS,
	createDefaultWeapon,
	createDefaultArmor
} from './Equipment';

export type { Weapon, Armor, Item } from './Equipment';

export {
	StatusEffectManager,
	StatusEffectType
} from './StatusEffect';

export type { StatusEffect } from './StatusEffect';

export {
	DamageType,
	calculateDamage
} from './DamageSystem';

export type { DamageSource, DamageResult } from './DamageSystem';

export {
	SkillType,
	SkillManager
} from './Skill';

export type { Skill, SkillEffect, LearnedSkill } from './Skill';
