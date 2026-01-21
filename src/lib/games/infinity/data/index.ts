// 常數
export {
	TIER_MULTIPLIERS,
	TIER_ORDER,
	STAGE_REWARDS,
	EQUIPMENT_PRICES,
	POTION_PRICES,
	ATTRIBUTE_UPGRADE_COSTS,
	DROP_CHANCE,
	STAGES_TO_PROMOTE,
	getAttributeUpgradeCost,
	getTotalAttributeUpgradeCost,
	scaleAttributeByTier,
	scaleRewardByTier
} from './constants';
export type { Tier } from './constants';

// 怪物模板
export {
	ALL_MONSTERS,
	MONSTER_MAP,
	SLIMES,
	GOBLINS,
	WOLVES,
	UNDEAD,
	BOSSES,
	getMonsterTemplate,
	createMonsterInstance
} from './monsters';
export type { MonsterTemplate, MonsterInstance } from './monsters';

// 關卡
export {
	D_LEVEL_STAGES,
	C_LEVEL_STAGES,
	B_LEVEL_STAGES,
	A_LEVEL_STAGES,
	S_LEVEL_STAGES,
	ALL_STAGES,
	getRandomStage,
	getStageById,
	createMonsterFromLegacy
} from './stages';
export type {
	MapLevelKey,
	WinCondition,
	EnemySpawn,
	WaveConfig,
	StageConfig,
	EnemyConfig // 向後相容
} from './stages';
