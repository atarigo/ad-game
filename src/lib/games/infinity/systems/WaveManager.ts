/**
 * 波次管理器
 * 負責管理關卡中的波次流程、勝利條件判定
 */

import type { StageConfig, WaveConfig, WinCondition, EnemySpawn, MonsterInstance } from '../data';
import { createMonsterInstance, createMonsterFromLegacy } from '../data';

/**
 * 敵人狀態
 */
export interface EnemyState {
	instance: MonsterInstance;
	isAlive: boolean;
	currentHealth: number;
	maxHealth: number;
}

/**
 * 波次完成回調
 */
export interface WaveCallbacks {
	onEnemyDefeated?: (enemy: EnemyState, index: number) => void;
	onWaveComplete?: (waveIndex: number, reward: number) => void;
	onStageComplete?: () => void;
	onWinConditionMet?: (condition: WinCondition) => void;
}

/**
 * 波次管理器
 */
export class WaveManager {
	private stageConfig: StageConfig;
	private currentWaveIndex: number = 0;
	private enemies: EnemyState[] = [];
	private turnCount: number = 0;
	private callbacks: WaveCallbacks;

	constructor(stageConfig: StageConfig, callbacks: WaveCallbacks = {}) {
		this.stageConfig = stageConfig;
		this.callbacks = callbacks;
	}

	/**
	 * 取得當前波次
	 */
	public getCurrentWave(): WaveConfig {
		return this.stageConfig.waves[this.currentWaveIndex];
	}

	/**
	 * 取得當前波次索引（從 0 開始）
	 */
	public getCurrentWaveIndex(): number {
		return this.currentWaveIndex;
	}

	/**
	 * 取得總波次數
	 */
	public getTotalWaves(): number {
		return this.stageConfig.waves.length;
	}

	/**
	 * 取得當前回合數
	 */
	public getTurnCount(): number {
		return this.turnCount;
	}

	/**
	 * 增加回合數
	 */
	public incrementTurn(): void {
		this.turnCount++;
	}

	/**
	 * 取得當前波次的敵人
	 */
	public getEnemies(): EnemyState[] {
		return this.enemies;
	}

	/**
	 * 取得存活的敵人
	 */
	public getAliveEnemies(): EnemyState[] {
		return this.enemies.filter((e) => e.isAlive);
	}

	/**
	 * 生成當前波次的敵人
	 * @returns 生成的敵人列表
	 */
	public spawnWave(): MonsterInstance[] {
		const wave = this.getCurrentWave();
		this.enemies = [];
		this.turnCount = 0;

		const instances: MonsterInstance[] = [];

		for (const spawn of wave.enemies) {
			const instance = this.createEnemy(spawn);
			if (instance) {
				const enemyState: EnemyState = {
					instance,
					isAlive: true,
					currentHealth: instance.attributes.vitality * 10,
					maxHealth: instance.attributes.vitality * 10
				};
				this.enemies.push(enemyState);
				instances.push(instance);
			}
		}

		return instances;
	}

	/**
	 * 建立敵人實例
	 */
	private createEnemy(spawn: EnemySpawn): MonsterInstance | null {
		if (spawn.monsterId.startsWith('legacy_')) {
			return createMonsterFromLegacy(spawn, this.stageConfig);
		}
		return createMonsterInstance(
			spawn.monsterId,
			this.stageConfig.tier,
			spawn.position,
			spawn.instanceId
		);
	}

	/**
	 * 標記敵人死亡
	 * @returns 是否成功標記
	 */
	public markEnemyDefeated(index: number): boolean {
		if (index < 0 || index >= this.enemies.length) {
			return false;
		}

		const enemy = this.enemies[index];
		if (!enemy.isAlive) {
			return false;
		}

		enemy.isAlive = false;
		enemy.currentHealth = 0;

		this.callbacks.onEnemyDefeated?.(enemy, index);

		return true;
	}

	/**
	 * 更新敵人血量
	 */
	public updateEnemyHealth(index: number, health: number): void {
		if (index >= 0 && index < this.enemies.length) {
			this.enemies[index].currentHealth = Math.max(0, health);
			if (this.enemies[index].currentHealth <= 0) {
				this.markEnemyDefeated(index);
			}
		}
	}

	/**
	 * 檢查當前波次的勝利條件是否達成
	 */
	public checkWinCondition(): boolean {
		const wave = this.getCurrentWave();
		const condition = wave.winCondition;

		switch (condition.type) {
			case 'annihilation':
				return this.enemies.every((e) => !e.isAlive);

			case 'survive':
				return this.turnCount >= condition.rounds;

			case 'target': {
				const targetEnemy = this.enemies.find(
					(e) => e.instance.instanceId === condition.targetId
				);
				return targetEnemy ? !targetEnemy.isAlive : false;
			}

			default:
				return false;
		}
	}

	/**
	 * 取得勝利條件描述文字
	 */
	public getWinConditionText(): string {
		const wave = this.getCurrentWave();
		const condition = wave.winCondition;

		switch (condition.type) {
			case 'annihilation':
				return '消滅所有敵人';
			case 'survive':
				return `存活 ${condition.rounds} 回合（目前 ${this.turnCount}/${condition.rounds}）`;
			case 'target':
				return '擊敗目標敵人';
			default:
				return '未知條件';
		}
	}

	/**
	 * 進入下一波
	 * @returns 是否成功進入下一波（false 表示關卡完成）
	 */
	public nextWave(): boolean {
		const wave = this.getCurrentWave();

		// 觸發波次完成回調
		this.callbacks.onWaveComplete?.(this.currentWaveIndex, wave.reward.points);

		// 檢查是否還有下一波
		if (this.currentWaveIndex < this.stageConfig.waves.length - 1) {
			this.currentWaveIndex++;
			return true;
		}

		// 關卡完成
		this.callbacks.onStageComplete?.();
		return false;
	}

	/**
	 * 檢查關卡是否完成
	 */
	public isStageComplete(): boolean {
		return (
			this.currentWaveIndex === this.stageConfig.waves.length - 1 && this.checkWinCondition()
		);
	}

	/**
	 * 取得當前波次的獎勵點數
	 */
	public getCurrentWaveReward(): number {
		return this.getCurrentWave().reward.points;
	}

	/**
	 * 重置波次管理器
	 */
	public reset(): void {
		this.currentWaveIndex = 0;
		this.enemies = [];
		this.turnCount = 0;
	}

	/**
	 * 載入新的關卡配置
	 */
	public loadStage(stageConfig: StageConfig): void {
		this.stageConfig = stageConfig;
		this.reset();
	}
}
