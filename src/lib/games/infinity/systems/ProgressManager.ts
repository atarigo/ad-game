/**
 * 進度管理器
 * 負責管理關卡進度、晉級判定、關卡選擇
 */

import type { Tier } from '../data/constants';
import { TIER_ORDER, STAGES_TO_PROMOTE } from '../data/constants';
import { getRandomStage } from '../data';
import type { StageConfig } from '../data';
import type { MapLevel } from '../state/GameState';
import { MAP_LEVEL_ORDER } from '../state/GameState';

/**
 * 進度狀態
 */
export interface ProgressState {
	currentTier: Tier;
	currentMapLevel: MapLevel;
	currentStage: number;
	stagesClearedInCurrentLevel: number;
	totalStagesCleared: number;
}

/**
 * 關卡完成結果
 */
export interface StageCompleteResult {
	promoted: boolean;
	newTier?: Tier;
	newMapLevel?: MapLevel;
	nextStageConfig: StageConfig;
	progressState: ProgressState;
}

/**
 * 進度事件回調
 */
export interface ProgressCallbacks {
	onStageComplete?: (result: StageCompleteResult) => void;
	onPromote?: (newTier: Tier, newMapLevel: MapLevel) => void;
	onProgressUpdate?: (state: ProgressState) => void;
}

/**
 * 進度管理器
 */
export class ProgressManager {
	private progressState: ProgressState;
	private callbacks: ProgressCallbacks;

	/**
	 * 建立進度管理器
	 * @param initialTier 初始等級
	 * @param callbacks 事件回調
	 */
	constructor(initialTier: Tier = 'D', callbacks: ProgressCallbacks = {}) {
		this.progressState = {
			currentTier: initialTier,
			currentMapLevel: initialTier as MapLevel,
			currentStage: 1,
			stagesClearedInCurrentLevel: 0,
			totalStagesCleared: 0
		};
		this.callbacks = callbacks;
	}

	/**
	 * 取得當前進度狀態
	 */
	public getProgressState(): ProgressState {
		return { ...this.progressState };
	}

	/**
	 * 檢查是否可以晉級
	 * @returns 是否可以晉級
	 */
	public canPromote(): boolean {
		// S 級不能晉級（無限循環）
		if (this.progressState.currentTier === 'S') {
			return false;
		}

		// 檢查是否達到晉級條件
		return this.progressState.stagesClearedInCurrentLevel >= STAGES_TO_PROMOTE;
	}

	/**
	 * 完成關卡
	 * @returns 關卡完成結果
	 */
	public completeStage(): StageCompleteResult {
		// 更新計數
		this.progressState.totalStagesCleared++;
		this.progressState.stagesClearedInCurrentLevel++;
		this.progressState.currentStage++;

		let promoted = false;
		let newTier: Tier | undefined;
		let newMapLevel: MapLevel | undefined;

		// 檢查是否可以晉級
		if (this.canPromote()) {
			const currentTierIndex = TIER_ORDER.indexOf(this.progressState.currentTier);
			const nextTierIndex = currentTierIndex + 1;

			if (nextTierIndex < TIER_ORDER.length) {
				// 晉級到下一等級
				newTier = TIER_ORDER[nextTierIndex];
				newMapLevel = newTier as MapLevel;

				this.progressState.currentTier = newTier;
				this.progressState.currentMapLevel = newMapLevel;
				this.progressState.currentStage = 1;
				this.progressState.stagesClearedInCurrentLevel = 0;

				promoted = true;

				console.log(`🎉 晉級到 ${newTier} 級！`);

				// 觸發晉級事件
				if (this.callbacks.onPromote) {
					this.callbacks.onPromote(newTier, newMapLevel);
				}
			}
		}

		// 選擇下一個關卡配置
		const nextStageConfig = getRandomStage(this.progressState.currentMapLevel);

		const result: StageCompleteResult = {
			promoted,
			newTier,
			newMapLevel,
			nextStageConfig,
			progressState: this.getProgressState()
		};

		// 觸發關卡完成事件
		if (this.callbacks.onStageComplete) {
			this.callbacks.onStageComplete(result);
		}

		// 觸發進度更新事件
		if (this.callbacks.onProgressUpdate) {
			this.callbacks.onProgressUpdate(this.getProgressState());
		}

		return result;
	}

	/**
	 * 重置進度（新遊戲）
	 * @param initialTier 初始等級
	 */
	public reset(initialTier: Tier = 'D'): void {
		this.progressState = {
			currentTier: initialTier,
			currentMapLevel: initialTier as MapLevel,
			currentStage: 1,
			stagesClearedInCurrentLevel: 0,
			totalStagesCleared: 0
		};

		// 觸發進度更新事件
		if (this.callbacks.onProgressUpdate) {
			this.callbacks.onProgressUpdate(this.getProgressState());
		}
	}

	/**
	 * 設定事件回調
	 */
	public setCallbacks(callbacks: ProgressCallbacks): void {
		this.callbacks = { ...this.callbacks, ...callbacks };
	}

	/**
	 * 取得當前關卡的總編號
	 * @param stagesPerMap 每個地圖等級的關卡數
	 */
	public getCurrentStageNumber(stagesPerMap: number = 3): number {
		const mapIndex = MAP_LEVEL_ORDER.indexOf(this.progressState.currentMapLevel);
		return mapIndex * stagesPerMap + this.progressState.currentStage;
	}
}
