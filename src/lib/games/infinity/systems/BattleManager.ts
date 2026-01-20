/**
 * 戰鬥管理器
 * 負責管理戰鬥邏輯、傷害計算、回合處理
 */

import { CharacterStats } from '../entities';

/**
 * 攻擊結果
 */
export interface AttackResult {
	damage: number;
	actualDamage: number;
	isCritical: boolean;
	targetDefeated: boolean;
}

/**
 * 回合結果
 */
export interface TurnResult {
	turnNumber: number;
	playerAttacks: AttackResult[];
	enemyAttacks: AttackResult[];
	playerDefeated: boolean;
	allEnemiesDefeated: boolean;
}

/**
 * 戰鬥事件回調
 */
export interface BattleCallbacks {
	onPlayerAttack?: (result: AttackResult, targetIndex: number) => void;
	onEnemyAttack?: (result: AttackResult, attackerIndex: number) => void;
	onPlayerDefeated?: () => void;
	onEnemyDefeated?: (index: number) => void;
	onTurnEnd?: (turnResult: TurnResult) => void;
	onRegeneration?: (entity: 'player' | 'enemy', index: number, healthRestored: number) => void;
}

/**
 * 戰鬥管理器
 */
export class BattleManager {
	private playerStats: CharacterStats;
	private enemyStats: CharacterStats[] = [];
	private selectedTargetIndex: number = 0;
	private turnCount: number = 0;
	private callbacks: BattleCallbacks;

	constructor(playerStats: CharacterStats, callbacks: BattleCallbacks = {}) {
		this.playerStats = playerStats;
		this.callbacks = callbacks;
	}

	/**
	 * 設置敵人
	 */
	public setEnemies(enemies: CharacterStats[]): void {
		this.enemyStats = enemies;
		this.selectedTargetIndex = 0;
	}

	/**
	 * 添加敵人
	 */
	public addEnemy(enemy: CharacterStats): number {
		this.enemyStats.push(enemy);
		return this.enemyStats.length - 1;
	}

	/**
	 * 清除所有敵人
	 */
	public clearEnemies(): void {
		this.enemyStats = [];
		this.selectedTargetIndex = 0;
	}

	/**
	 * 取得選中的目標索引
	 */
	public getSelectedTargetIndex(): number {
		return this.selectedTargetIndex;
	}

	/**
	 * 設置選中的目標
	 */
	public setSelectedTarget(index: number): boolean {
		if (index >= 0 && index < this.enemyStats.length && this.enemyStats[index].isAlive) {
			this.selectedTargetIndex = index;
			return true;
		}
		return false;
	}

	/**
	 * 選擇下一個存活的敵人
	 */
	public selectNextAliveEnemy(): number {
		const aliveIndex = this.enemyStats.findIndex((e) => e.isAlive);
		if (aliveIndex !== -1) {
			this.selectedTargetIndex = aliveIndex;
		}
		return aliveIndex;
	}

	/**
	 * 取得回合數
	 */
	public getTurnCount(): number {
		return this.turnCount;
	}

	/**
	 * 重置回合數
	 */
	public resetTurnCount(): void {
		this.turnCount = 0;
	}

	/**
	 * 執行玩家攻擊
	 */
	public executePlayerAttack(targetIndex?: number): AttackResult | null {
		const index = targetIndex ?? this.selectedTargetIndex;

		if (index < 0 || index >= this.enemyStats.length) {
			return null;
		}

		const target = this.enemyStats[index];
		if (!target.isAlive) {
			// 嘗試找一個活著的敵人
			const aliveIndex = this.selectNextAliveEnemy();
			if (aliveIndex === -1) return null;
			return this.executePlayerAttack(aliveIndex);
		}

		const result = this.calculateAttack(this.playerStats, target);

		this.callbacks.onPlayerAttack?.(result, index);

		if (result.targetDefeated) {
			this.callbacks.onEnemyDefeated?.(index);
		}

		return result;
	}

	/**
	 * 執行所有敵人的攻擊
	 */
	public executeEnemyAttacks(): AttackResult[] {
		const results: AttackResult[] = [];

		for (let i = 0; i < this.enemyStats.length; i++) {
			const enemy = this.enemyStats[i];
			if (!enemy.isAlive) continue;

			const result = this.calculateAttack(enemy, this.playerStats);
			results.push(result);

			this.callbacks.onEnemyAttack?.(result, i);

			if (result.targetDefeated) {
				this.callbacks.onPlayerDefeated?.();
				break; // 玩家死亡，停止攻擊
			}
		}

		return results;
	}

	/**
	 * 計算攻擊傷害
	 */
	private calculateAttack(attacker: CharacterStats, defender: CharacterStats): AttackResult {
		let damage = attacker.derived.meleeAttack;
		let isCritical = false;

		// 判定暴擊
		if (attacker.rollCritical()) {
			damage = attacker.calculateCriticalDamage(damage);
			isCritical = true;
		}

		// 造成傷害
		const actualDamage = defender.takeDamage(damage);
		const targetDefeated = !defender.isAlive;

		return {
			damage,
			actualDamage,
			isCritical,
			targetDefeated
		};
	}

	/**
	 * 執行回合結束效果（回復）
	 */
	public applyEndOfTurnEffects(): void {
		// 玩家回復
		const playerOldHealth = this.playerStats.currentHealth;
		this.playerStats.applyRegeneration();
		const playerHealthRestored = this.playerStats.currentHealth - playerOldHealth;
		if (playerHealthRestored > 0) {
			this.callbacks.onRegeneration?.('player', 0, playerHealthRestored);
		}

		// 敵人回復
		for (let i = 0; i < this.enemyStats.length; i++) {
			const enemy = this.enemyStats[i];
			if (!enemy.isAlive) continue;

			const oldHealth = enemy.currentHealth;
			enemy.applyRegeneration();
			const healthRestored = enemy.currentHealth - oldHealth;
			if (healthRestored > 0) {
				this.callbacks.onRegeneration?.('enemy', i, healthRestored);
			}
		}
	}

	/**
	 * 執行完整的一個回合
	 */
	public executeTurn(): TurnResult {
		this.turnCount++;

		const playerAttacks: AttackResult[] = [];
		const enemyAttacks: AttackResult[] = [];
		let playerDefeated = false;
		let allEnemiesDefeated = false;

		// 玩家攻擊
		const playerAttackResult = this.executePlayerAttack();
		if (playerAttackResult) {
			playerAttacks.push(playerAttackResult);
		}

		// 檢查所有敵人是否死亡
		allEnemiesDefeated = this.enemyStats.every((e) => !e.isAlive);

		if (!allEnemiesDefeated) {
			// 敵人攻擊
			const enemyResults = this.executeEnemyAttacks();
			enemyAttacks.push(...enemyResults);
			playerDefeated = !this.playerStats.isAlive;

			if (!playerDefeated) {
				// 回合結束回復
				this.applyEndOfTurnEffects();
			}
		}

		const turnResult: TurnResult = {
			turnNumber: this.turnCount,
			playerAttacks,
			enemyAttacks,
			playerDefeated,
			allEnemiesDefeated
		};

		this.callbacks.onTurnEnd?.(turnResult);

		return turnResult;
	}

	/**
	 * 檢查戰鬥是否結束
	 */
	public isBattleOver(): boolean {
		return !this.playerStats.isAlive || this.enemyStats.every((e) => !e.isAlive);
	}

	/**
	 * 檢查玩家是否勝利
	 */
	public isPlayerVictory(): boolean {
		return this.playerStats.isAlive && this.enemyStats.every((e) => !e.isAlive);
	}

	/**
	 * 取得存活的敵人數量
	 */
	public getAliveEnemyCount(): number {
		return this.enemyStats.filter((e) => e.isAlive).length;
	}

	/**
	 * 取得敵人列表
	 */
	public getEnemies(): CharacterStats[] {
		return this.enemyStats;
	}

	/**
	 * 取得玩家狀態
	 */
	public getPlayerStats(): CharacterStats {
		return this.playerStats;
	}
}
