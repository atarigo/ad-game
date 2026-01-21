/**
 * 怪物模板系統
 */

import type { PrimaryAttributes } from '../../entities';
import { WeaponType, ArmorType } from '../../entities';
import type { Tier } from '../constants';
import { scaleAttributeByTier, scaleRewardByTier } from '../constants';

// 載入怪物模板 JSON
import slimesData from './slimes.json';
import goblinsData from './goblins.json';
import wolvesData from './wolves.json';
import undeadData from './undead.json';
import bossesData from './bosses.json';

/**
 * 原始怪物模板（JSON 格式）
 */
interface RawMonsterTemplate {
	id: string;
	name: string;
	color: string;
	sprite?: string;
	baseAttributes: {
		strength: number;
		vitality: number;
		agility: number;
		intelligence: number;
		willpower: number;
		luck: number;
	};
	weapon: string;
	armor: string;
	basePointReward: number;
}

/**
 * 怪物模板（轉換後）
 */
export interface MonsterTemplate {
	id: string;
	name: string;
	color: number;
	sprite?: string;
	baseAttributes: PrimaryAttributes;
	weapon: WeaponType;
	armor: ArmorType;
	basePointReward: number;
}

/**
 * 實例化的怪物（用於戰鬥）
 */
export interface MonsterInstance {
	templateId: string;
	name: string;
	color: number;
	sprite?: string;
	attributes: PrimaryAttributes;
	weapon: WeaponType;
	armor: ArmorType;
	pointReward: number;
	position: { row: number; col: number };
	instanceId?: string;
}

/**
 * 解析顏色字串
 */
function parseColor(colorStr: string): number {
	if (colorStr.startsWith('0x')) {
		return parseInt(colorStr, 16);
	}
	if (colorStr.startsWith('#')) {
		return parseInt(colorStr.slice(1), 16);
	}
	return parseInt(colorStr, 16);
}

/**
 * 解析武器類型
 */
function parseWeaponType(weaponStr: string): WeaponType {
	const weaponMap: Record<string, WeaponType> = {
		wooden_sword: WeaponType.WoodenSword,
		iron_sword: WeaponType.IronSword,
		steel_sword: WeaponType.SteelSword
	};
	return weaponMap[weaponStr] ?? WeaponType.WoodenSword;
}

/**
 * 解析防具類型
 */
function parseArmorType(armorStr: string): ArmorType {
	const armorMap: Record<string, ArmorType> = {
		cloth_armor: ArmorType.ClothArmor,
		leather: ArmorType.Leather,
		iron_armor: ArmorType.IronArmor
	};
	return armorMap[armorStr] ?? ArmorType.ClothArmor;
}

/**
 * 轉換原始怪物模板
 */
function parseMonsterTemplate(raw: RawMonsterTemplate): MonsterTemplate {
	return {
		id: raw.id,
		name: raw.name,
		color: parseColor(raw.color),
		sprite: raw.sprite,
		baseAttributes: raw.baseAttributes,
		weapon: parseWeaponType(raw.weapon),
		armor: parseArmorType(raw.armor),
		basePointReward: raw.basePointReward
	};
}

// 轉換所有怪物模板
const SLIMES = (slimesData as RawMonsterTemplate[]).map(parseMonsterTemplate);
const GOBLINS = (goblinsData as RawMonsterTemplate[]).map(parseMonsterTemplate);
const WOLVES = (wolvesData as RawMonsterTemplate[]).map(parseMonsterTemplate);
const UNDEAD = (undeadData as RawMonsterTemplate[]).map(parseMonsterTemplate);
const BOSSES = (bossesData as RawMonsterTemplate[]).map(parseMonsterTemplate);

/**
 * 所有怪物模板
 */
export const ALL_MONSTERS: MonsterTemplate[] = [...SLIMES, ...GOBLINS, ...WOLVES, ...UNDEAD, ...BOSSES];

/**
 * 怪物模板索引（按 ID）
 */
export const MONSTER_MAP: Record<string, MonsterTemplate> = {};
for (const monster of ALL_MONSTERS) {
	MONSTER_MAP[monster.id] = monster;
}

/**
 * 根據 ID 取得怪物模板
 */
export function getMonsterTemplate(monsterId: string): MonsterTemplate | null {
	return MONSTER_MAP[monsterId] ?? null;
}

/**
 * 根據模板和等級建立怪物實例
 * @param monsterId 怪物模板 ID
 * @param tier 等級（用於屬性縮放）
 * @param position 位置
 * @param instanceId 實例 ID（可選，用於目標勝利條件）
 */
export function createMonsterInstance(
	monsterId: string,
	tier: Tier,
	position: { row: number; col: number },
	instanceId?: string
): MonsterInstance | null {
	const template = getMonsterTemplate(monsterId);
	if (!template) {
		console.error(`Monster template not found: ${monsterId}`);
		return null;
	}

	// 縮放屬性
	const scaledAttributes: PrimaryAttributes = {
		strength: scaleAttributeByTier(template.baseAttributes.strength, tier),
		vitality: scaleAttributeByTier(template.baseAttributes.vitality, tier),
		agility: scaleAttributeByTier(template.baseAttributes.agility, tier),
		intelligence: scaleAttributeByTier(template.baseAttributes.intelligence, tier),
		willpower: scaleAttributeByTier(template.baseAttributes.willpower, tier),
		luck: scaleAttributeByTier(template.baseAttributes.luck, tier)
	};

	return {
		templateId: template.id,
		name: template.name,
		color: template.color,
		sprite: template.sprite,
		attributes: scaledAttributes,
		weapon: template.weapon,
		armor: template.armor,
		pointReward: scaleRewardByTier(template.basePointReward, tier),
		position,
		instanceId
	};
}

// 匯出分類的怪物
export { SLIMES, GOBLINS, WOLVES, UNDEAD, BOSSES };
