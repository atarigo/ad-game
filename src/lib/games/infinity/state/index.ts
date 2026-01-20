export {
	GameState,
	MapLevel,
	MAP_LEVEL_ORDER,
	STAGES_PER_MAP,
	TOTAL_STAGES,
	getAvailablePotions
} from './GameState';

export type { IGameState } from './GameState';

// Re-export from data for convenience
export type { StageConfig, EnemyConfig } from '../data';
