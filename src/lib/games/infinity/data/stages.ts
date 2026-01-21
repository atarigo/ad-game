/**
 * 關卡配置系統
 * 支援新的波次系統，同時向後相容舊格式
 */

import type { PrimaryAttributes } from '../entities';
import { WeaponType, ArmorType } from '../entities';
import type { Tier } from './constants';
import { getMonsterTemplate, createMonsterInstance } from './monsters';
import type { MonsterInstance } from './monsters';

// 載入 JSON 關卡配置
import dLevelStages from './stages/d-level.json';
import cLevelStages from './stages/c-level.json';
import bLevelStages from './stages/b-level.json';
import aLevelStages from './stages/a-level.json';
import sLevelStages from './stages/s-level.json';

/**
 * 地圖等級類型（向後相容）
 */
export type MapLevelKey = 'D' | 'C' | 'B' | 'A' | 'S';

// ==================== 新格式介面 ====================

/**
 * 勝利條件類型
 */
export type WinCondition =
	| { type: 'annihilation' }
	| { type: 'survive'; rounds: number }
	| { type: 'target'; targetId: string };

/**
 * 敵人生成配置（新格式）
 */
export interface EnemySpawn {
	monsterId: string;
	position: { row: number; col: number };
	instanceId?: string;
}

/**
 * 波次配置（新格式）
 */
export interface WaveConfig {
	id: string;
	enemies: EnemySpawn[];
	winCondition: WinCondition;
	reward: { points: number };
}

/**
 * 關卡配置（新格式）
 */
export interface StageConfig {
	id: string;
	name: string;
	tier: Tier;
	waves: WaveConfig[];
}

// ==================== 舊格式介面（向後相容）====================

/**
 * JSON 中的敵人配置（舊格式）
 */
interface LegacyEnemyConfig {
	name: string;
	color: string;
	attributes?: Partial<PrimaryAttributes>;
	weapon?: string;
	armor?: string;
	position: { row: number; col: number };
}

/**
 * JSON 中的關卡配置（舊格式）
 */
interface LegacyStageConfig {
	id: string;
	name: string;
	enemies: LegacyEnemyConfig[];
}

/**
 * JSON 中的關卡配置（新格式）
 */
interface RawStageConfig {
	id: string;
	name: string;
	tier?: Tier;
	waves?: Array<{
		id: string;
		enemies: EnemySpawn[];
		winCondition: WinCondition;
		reward: { points: number };
	}>;
	// 舊格式欄位
	enemies?: LegacyEnemyConfig[];
}

// ==================== 轉換函數 ====================

/**
 * 將字串顏色轉換為數字
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
 * 將字串武器類型轉換為枚舉
 */
function parseWeaponType(weaponStr?: string): WeaponType {
	if (!weaponStr) return WeaponType.WoodenSword;
	const weaponMap: Record<string, WeaponType> = {
		wooden_sword: WeaponType.WoodenSword,
		iron_sword: WeaponType.IronSword,
		steel_sword: WeaponType.SteelSword
	};
	return weaponMap[weaponStr] ?? WeaponType.WoodenSword;
}

/**
 * 將字串防具類型轉換為枚舉
 */
function parseArmorType(armorStr?: string): ArmorType {
	if (!armorStr) return ArmorType.ClothArmor;
	const armorMap: Record<string, ArmorType> = {
		cloth_armor: ArmorType.ClothArmor,
		leather: ArmorType.Leather,
		iron_armor: ArmorType.IronArmor
	};
	return armorMap[armorStr] ?? ArmorType.ClothArmor;
}

/**
 * 從關卡 ID 推斷等級
 */
function inferTierFromId(id: string): Tier {
	const prefix = id.charAt(0).toUpperCase();
	if (['D', 'C', 'B', 'A', 'S'].includes(prefix)) {
		return prefix as Tier;
	}
	return 'D';
}

/**
 * 將舊格式敵人轉換為臨時怪物 ID
 * 用於向後相容，產生唯一的臨時 ID
 */
function createLegacyMonsterId(enemy: LegacyEnemyConfig, stageId: string, index: number): string {
	return `legacy_${stageId}_${index}`;
}

/**
 * 轉換舊格式關卡為新格式
 */
function convertLegacyStage(raw: LegacyStageConfig, tier: Tier): StageConfig {
	// 將舊格式的 enemies 陣列轉換為單一波次
	const enemies: EnemySpawn[] = raw.enemies.map((enemy, index) => ({
		monsterId: createLegacyMonsterId(enemy, raw.id, index),
		position: enemy.position,
		instanceId: `${raw.id}_enemy_${index}`
	}));

	const wave: WaveConfig = {
		id: `${raw.id}-W1`,
		enemies,
		winCondition: { type: 'annihilation' },
		reward: { points: 500 } // 預設獎勵
	};

	return {
		id: raw.id,
		name: raw.name,
		tier,
		waves: [wave]
	};
}

/**
 * 轉換新格式關卡
 */
function parseNewStage(raw: RawStageConfig): StageConfig {
	return {
		id: raw.id,
		name: raw.name,
		tier: raw.tier ?? inferTierFromId(raw.id),
		waves: raw.waves!
	};
}

/**
 * 智慧轉換關卡配置（自動判斷格式）
 */
function parseStageConfig(raw: RawStageConfig, defaultTier: Tier): StageConfig {
	// 檢查是否為新格式（有 waves 欄位）
	if (raw.waves && Array.isArray(raw.waves)) {
		return parseNewStage(raw);
	}
	// 舊格式：轉換為單波次
	return convertLegacyStage(raw as unknown as LegacyStageConfig, defaultTier);
}

// ==================== 關卡資料 ====================

/**
 * D 級關卡配置
 */
export const D_LEVEL_STAGES: StageConfig[] = (dLevelStages as RawStageConfig[]).map((raw) =>
	parseStageConfig(raw, 'D')
);

/**
 * C 級關卡配置
 */
export const C_LEVEL_STAGES: StageConfig[] = (cLevelStages as RawStageConfig[]).map((raw) =>
	parseStageConfig(raw, 'C')
);

/**
 * B 級關卡配置
 */
export const B_LEVEL_STAGES: StageConfig[] = (bLevelStages as RawStageConfig[]).map((raw) =>
	parseStageConfig(raw, 'B')
);

/**
 * A 級關卡配置
 */
export const A_LEVEL_STAGES: StageConfig[] = (aLevelStages as RawStageConfig[]).map((raw) =>
	parseStageConfig(raw, 'A')
);

/**
 * S 級關卡配置
 */
export const S_LEVEL_STAGES: StageConfig[] = (sLevelStages as RawStageConfig[]).map((raw) =>
	parseStageConfig(raw, 'S')
);

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

// ==================== 查詢函數 ====================

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

// ==================== 舊格式相容性 ====================

/**
 * 舊格式敵人配置（向後相容用）
 * @deprecated 請使用新的 EnemySpawn 格式
 */
export interface EnemyConfig {
	name: string;
	color: number;
	attributes?: Partial<PrimaryAttributes>;
	weapon?: WeaponType;
	armor?: ArmorType;
	position: { row: number; col: number };
}

/**
 * 舊格式的臨時怪物資料存儲
 * 用於向後相容舊格式的關卡
 */
const LEGACY_MONSTER_CACHE: Map<string, LegacyEnemyConfig> = new Map();

/**
 * 註冊舊格式怪物（用於向後相容）
 */
export function registerLegacyMonster(monsterId: string, config: LegacyEnemyConfig): void {
	LEGACY_MONSTER_CACHE.set(monsterId, config);
}

/**
 * 從舊格式關卡建立怪物實例
 * 向後相容：如果是 legacy_ 開頭的 ID，從快取中取得配置
 */
export function createMonsterFromLegacy(
	spawn: EnemySpawn,
	stageConfig: StageConfig
): MonsterInstance | null {
	// 如果是新格式，使用怪物模板
	if (!spawn.monsterId.startsWith('legacy_')) {
		return createMonsterInstance(spawn.monsterId, stageConfig.tier, spawn.position, spawn.instanceId);
	}

	// 舊格式：從原始 JSON 中找到對應的敵人配置
	const legacyConfig = LEGACY_MONSTER_CACHE.get(spawn.monsterId);
	if (!legacyConfig) {
		console.error(`Legacy monster not found: ${spawn.monsterId}`);
		return null;
	}

	// 建立怪物實例（不縮放，使用原始屬性）
	return {
		templateId: spawn.monsterId,
		name: legacyConfig.name,
		color: parseColor(legacyConfig.color),
		attributes: {
			strength: legacyConfig.attributes?.strength ?? 10,
			vitality: legacyConfig.attributes?.vitality ?? 10,
			agility: legacyConfig.attributes?.agility ?? 10,
			intelligence: legacyConfig.attributes?.intelligence ?? 10,
			willpower: legacyConfig.attributes?.willpower ?? 10,
			luck: legacyConfig.attributes?.luck ?? 10
		},
		weapon: parseWeaponType(legacyConfig.weapon),
		armor: parseArmorType(legacyConfig.armor),
		pointReward: 300, // 預設獎勵
		position: spawn.position,
		instanceId: spawn.instanceId
	};
}

// 初始化：註冊舊格式關卡中的怪物
function initializeLegacyMonsters(): void {
	const allRawStages = [
		...(dLevelStages as RawStageConfig[]),
		...(cLevelStages as RawStageConfig[]),
		...(bLevelStages as RawStageConfig[]),
		...(aLevelStages as RawStageConfig[]),
		...(sLevelStages as RawStageConfig[])
	];

	for (const raw of allRawStages) {
		// 只處理舊格式
		if (raw.enemies && !raw.waves) {
			raw.enemies.forEach((enemy, index) => {
				const monsterId = createLegacyMonsterId(enemy, raw.id, index);
				registerLegacyMonster(monsterId, enemy);
			});
		}
	}
}

// 執行初始化
initializeLegacyMonsters();
