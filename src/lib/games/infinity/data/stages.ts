/**
 * 關卡配置系統
 */

import type { PrimaryAttributes } from '../entities';
import { WeaponType, ArmorType } from '../entities';

// 載入 JSON 關卡配置
import dLevelStages from './stages/d-level.json';
import cLevelStages from './stages/c-level.json';
import bLevelStages from './stages/b-level.json';
import aLevelStages from './stages/a-level.json';
import sLevelStages from './stages/s-level.json';

/**
 * 地圖等級類型（字串，避免循環依賴）
 */
export type MapLevelKey = 'D' | 'C' | 'B' | 'A' | 'S';

/**
 * JSON 中的敵人配置（原始格式）
 */
interface RawEnemyConfig {
	name: string;
	color: string;
	attributes?: Partial<PrimaryAttributes>;
	weapon?: string;
	armor?: string;
	position: { row: number; col: number };
}

/**
 * JSON 中的關卡配置（原始格式）
 */
interface RawStageConfig {
	id: string;
	name: string;
	enemies: RawEnemyConfig[];
}

/**
 * 敵人配置（轉換後）
 */
export interface EnemyConfig {
	/** 敵人名稱 */
	name: string;
	/** 敵人顏色 */
	color: number;
	/** 主屬性（可選，未設定則使用預設值 10） */
	attributes?: Partial<PrimaryAttributes>;
	/** 武器類型 */
	weapon?: WeaponType;
	/** 防具類型 */
	armor?: ArmorType;
	/** 格子位置（row: 0-3, col: 0-4） */
	position: { row: number; col: number };
}

/**
 * 關卡配置（轉換後）
 */
export interface StageConfig {
	/** 關卡 ID */
	id: string;
	/** 關卡名稱 */
	name: string;
	/** 敵人列表 */
	enemies: EnemyConfig[];
}

/**
 * 地圖等級關卡配置
 */
export interface MapLevelStages {
	/** 地圖等級 */
	level: MapLevel;
	/** 該等級的所有關卡配置 */
	stages: StageConfig[];
}

/**
 * 將字串顏色轉換為數字
 */
function parseColor(colorStr: string): number {
	// 支援 "0x00aa00" 或 "#00aa00" 格式
	if (colorStr.startsWith('0x')) {
		return parseInt(colorStr, 16);
	}
	if (colorStr.startsWith('#')) {
		return parseInt(colorStr.slice(1), 16);
	}
	return parseInt(colorStr, 16);
}

/**
 * 將字串武器類型轉換為枚舉
 */
function parseWeaponType(weaponStr?: string): WeaponType | undefined {
	if (!weaponStr) return undefined;
	const weaponMap: Record<string, WeaponType> = {
		wooden_sword: WeaponType.WoodenSword,
		iron_sword: WeaponType.IronSword,
		steel_sword: WeaponType.SteelSword
	};
	return weaponMap[weaponStr];
}

/**
 * 將字串防具類型轉換為枚舉
 */
function parseArmorType(armorStr?: string): ArmorType | undefined {
	if (!armorStr) return undefined;
	const armorMap: Record<string, ArmorType> = {
		cloth_armor: ArmorType.ClothArmor,
		leather: ArmorType.Leather,
		iron_armor: ArmorType.IronArmor
	};
	return armorMap[armorStr];
}

/**
 * 轉換原始關卡配置為內部格式
 */
function parseStageConfig(raw: RawStageConfig): StageConfig {
	return {
		id: raw.id,
		name: raw.name,
		enemies: raw.enemies.map((enemy) => ({
			name: enemy.name,
			color: parseColor(enemy.color),
			attributes: enemy.attributes,
			weapon: parseWeaponType(enemy.weapon),
			armor: parseArmorType(enemy.armor),
			position: enemy.position
		}))
	};
}

/**
 * D 級關卡配置
 */
export const D_LEVEL_STAGES: StageConfig[] = (dLevelStages as RawStageConfig[]).map(parseStageConfig);

/**
 * C 級關卡配置
 */
export const C_LEVEL_STAGES: StageConfig[] = (cLevelStages as RawStageConfig[]).map(parseStageConfig);

/**
 * B 級關卡配置
 */
export const B_LEVEL_STAGES: StageConfig[] = (bLevelStages as RawStageConfig[]).map(parseStageConfig);

/**
 * A 級關卡配置
 */
export const A_LEVEL_STAGES: StageConfig[] = (aLevelStages as RawStageConfig[]).map(parseStageConfig);

/**
 * S 級關卡配置
 */
export const S_LEVEL_STAGES: StageConfig[] = (sLevelStages as RawStageConfig[]).map(parseStageConfig);

/**
 * 所有關卡配置
 */
export const ALL_STAGES: Record<MapLevelKey, StageConfig[]> = {
	D: D_LEVEL_STAGES,
	C: C_LEVEL_STAGES,
	B: B_LEVEL_STAGES,
	A: A_LEVEL_STAGES,
	S: S_LEVEL_STAGES
};

/**
 * 根據地圖等級隨機取得一個關卡配置
 */
export function getRandomStage(mapLevel: MapLevelKey): StageConfig {
	const stages = ALL_STAGES[mapLevel];
	const randomIndex = Math.floor(Math.random() * stages.length);
	return stages[randomIndex];
}

/**
 * 根據關卡 ID 取得關卡配置
 */
export function getStageById(stageId: string): StageConfig | null {
	for (const stages of Object.values(ALL_STAGES)) {
		const stage = stages.find((s) => s.id === stageId);
		if (stage) return stage;
	}
	return null;
}
