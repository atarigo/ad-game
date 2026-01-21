import { GRID_CONFIG } from '../config';
import type { Enemy, GridPosition } from '../types';

export class EnemySystem {
	/**
	 * 生成隨機敵人
	 */
	static generateEnemies(round: number): Enemy[] {
		const enemies: Enemy[] = [];
		const count = 2 + Math.floor(Math.random() * 7); // 2-8 隻

		for (let i = 0; i < count; i++) {
			const size = this.getRandomSize();
			const position = this.findValidPosition(size, enemies);

			if (position) {
				enemies.push({
					id: `enemy_${Date.now()}_${i}`,
					position,
					size,
					cooldown: 1 + Math.floor(Math.random() * 4), // 1-4 回合冷卻
					maxCooldown: 1 + Math.floor(Math.random() * 4),
					hp: size * 10 + round * 5, // 根據大小和回合數設定血量
					maxHp: size * 10 + round * 5
				});
			}
		}

		return enemies;
	}

	/**
	 * 獲取隨機大小
	 */
	private static getRandomSize(): 1 | 2 | 3 {
		const rand = Math.random();
		if (rand < 0.6) return 1; // 60% 機率 1x1
		if (rand < 0.9) return 2; // 30% 機率 2x2
		return 3; // 10% 機率 3x3 (boss)
	}

	/**
	 * 尋找有效位置（不與其他敵人重疊）
	 */
	private static findValidPosition(
		size: 1 | 2 | 3,
		existingEnemies: Enemy[]
	): GridPosition | null {
		const maxAttempts = 50;
		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const row = Math.floor(Math.random() * (GRID_CONFIG.enemyRows - size + 1));
			const col = Math.floor(Math.random() * (GRID_CONFIG.enemyCols - size + 1));

			// 檢查是否與現有敵人重疊
			let isValid = true;
			for (const enemy of existingEnemies) {
				if (this.isOverlapping({ row, col }, size, enemy.position, enemy.size)) {
					isValid = false;
					break;
				}
			}

			if (isValid) {
				return { row, col };
			}
		}

		return null;
	}

	/**
	 * 檢查兩個區域是否重疊
	 */
	private static isOverlapping(
		pos1: GridPosition,
		size1: number,
		pos2: GridPosition,
		size2: number
	): boolean {
		return !(
			pos1.col + size1 <= pos2.col ||
			pos2.col + size2 <= pos1.col ||
			pos1.row + size1 <= pos2.row ||
			pos2.row + size2 <= pos1.row
		);
	}

	/**
	 * 獲取敵人佔據的所有格子位置
	 */
	static getEnemyCells(enemy: Enemy): GridPosition[] {
		const cells: GridPosition[] = [];
		for (let row = 0; row < enemy.size; row++) {
			for (let col = 0; col < enemy.size; col++) {
				cells.push({
					row: enemy.position.row + row,
					col: enemy.position.col + col
				});
			}
		}
		return cells;
	}

	/**
	 * 檢查位置是否有敵人
	 */
	static getEnemyAtPosition(position: GridPosition, enemies: Enemy[]): Enemy | null {
		for (const enemy of enemies) {
			const cells = this.getEnemyCells(enemy);
			if (cells.some((cell) => cell.row === position.row && cell.col === position.col)) {
				return enemy;
			}
		}
		return null;
	}

	/**
	 * 減少敵人冷卻時間
	 */
	static reduceCooldowns(enemies: Enemy[]): void {
		for (const enemy of enemies) {
			if (enemy.cooldown > 0) {
				enemy.cooldown--;
			}
		}
	}

	/**
	 * 獲取可以攻擊的敵人（冷卻時間為 0）
	 */
	static getReadyEnemies(enemies: Enemy[]): Enemy[] {
		return enemies.filter((enemy) => enemy.cooldown === 0);
	}
}
