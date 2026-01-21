import { GRID_CONFIG } from '../config';
import type { Enemy, GridPosition } from '../types';
import type { EnemyTemplate } from '../data/enemyTypes';
import { calculateDifficultyScaling, applyDifficultyScaling, parseColor } from '../data/enemyTypes';
import enemyConfig from '../data/enemies.json';
import bossConfig from '../data/bosses.json';

export class EnemySystem {
	private static enemyTemplates: EnemyTemplate[] = enemyConfig.enemies;
	private static bossTemplates: EnemyTemplate[] = bossConfig.bosses;

	/**
	 * 生成敵人
	 */
	static generateEnemies(level: number): Enemy[] {
		const enemies: Enemy[] = [];

		// 每 10 關必定生成一個 Boss
		const isBossLevel = level % 10 === 0;

		if (isBossLevel) {
			// Boss 關卡：生成一個隨機 Boss
			const boss = this.generateBoss(level);
			if (boss) {
				enemies.push(boss);
			}
		} else {
			// 普通關卡：生成 2-8 隻普通敵人
			const count = 2 + Math.floor(Math.random() * 7);

			for (let i = 0; i < count; i++) {
				const enemy = this.generateNormalEnemy(level, enemies);
				if (enemy) {
					enemies.push(enemy);
				}
			}
		}

		return enemies;
	}

	/**
	 * 生成普通敵人
	 */
	private static generateNormalEnemy(level: number, existingEnemies: Enemy[]): Enemy | null {
		// 使用權重隨機選擇敵人模板
		const template = this.selectTemplateByWeight(this.enemyTemplates);
		if (!template) return null;

		// 尋找有效位置
		const position = this.findValidPosition(template.size, existingEnemies);
		if (!position) return null;

		// 計算難度加成
		const scaling = calculateDifficultyScaling(level);
		const stats = applyDifficultyScaling(template, scaling);

		return {
			id: `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			templateId: template.id,
			name: template.name,
			position,
			size: template.size,
			cooldown: stats.cooldown,
			maxCooldown: stats.maxCooldown,
			hp: stats.hp,
			maxHp: stats.maxHp,
			attack: stats.attack,
			color: parseColor(template.color),
			isBoss: false
		};
	}

	/**
	 * 生成 Boss
	 */
	private static generateBoss(level: number): Enemy | null {
		// 隨機選擇一個 Boss 模板
		const template = this.bossTemplates[Math.floor(Math.random() * this.bossTemplates.length)];
		if (!template) return null;

		// Boss 放在中間位置（如果可以）
		const centerRow = Math.floor((GRID_CONFIG.enemyRows - template.size) / 2);
		const centerCol = Math.floor((GRID_CONFIG.enemyCols - template.size) / 2);

		// 確保位置有效
		let position: GridPosition;
		if (
			centerRow >= 0 &&
			centerRow + template.size <= GRID_CONFIG.enemyRows &&
			centerCol >= 0 &&
			centerCol + template.size <= GRID_CONFIG.enemyCols
		) {
			position = { row: centerRow, col: centerCol };
		} else {
			// 如果中間位置無效，隨機找一個位置
			const foundPosition = this.findValidPosition(template.size, []);
			if (!foundPosition) return null;
			position = foundPosition;
		}

		// 計算難度加成（Boss 的難度加成更高）
		const scaling = calculateDifficultyScaling(level);
		const bossScaling = {
			hpMultiplier: scaling.hpMultiplier * 1.5, // Boss 血量額外 x1.5
			attackMultiplier: scaling.attackMultiplier * 1.3 // Boss 攻擊額外 x1.3
		};
		const stats = applyDifficultyScaling(template, bossScaling);

		return {
			id: `boss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			templateId: template.id,
			name: template.name,
			position,
			size: template.size,
			cooldown: stats.cooldown,
			maxCooldown: stats.maxCooldown,
			hp: stats.hp,
			maxHp: stats.maxHp,
			attack: stats.attack,
			color: parseColor(template.color),
			isBoss: true
		};
	}

	/**
	 * 根據權重選擇模板
	 */
	private static selectTemplateByWeight(templates: EnemyTemplate[]): EnemyTemplate | null {
		// 計算總權重
		const totalWeight = templates.reduce((sum, t) => sum + (t.spawnWeight || 1), 0);

		// 隨機選擇
		let random = Math.random() * totalWeight;

		for (const template of templates) {
			random -= template.spawnWeight || 1;
			if (random <= 0) {
				return template;
			}
		}

		// 如果沒有選中任何模板，返回第一個
		return templates[0] || null;
	}

	/**
	 * 尋找有效位置（不與其他敵人重疊）
	 */
	private static findValidPosition(
		size: 1 | 2 | 3,
		existingEnemies: Enemy[]
	): GridPosition | null {
		// 確保 size 不會超出邊界
		if (size > GRID_CONFIG.enemyRows || size > GRID_CONFIG.enemyCols) {
			return null;
		}

		const maxAttempts = 100;
		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			// 確保計算出的位置不會超出邊界
			const maxRow = GRID_CONFIG.enemyRows - size;
			const maxCol = GRID_CONFIG.enemyCols - size;

			if (maxRow < 0 || maxCol < 0) {
				return null;
			}

			const row = Math.floor(Math.random() * (maxRow + 1));
			const col = Math.floor(Math.random() * (maxCol + 1));

			// 驗證位置是否在範圍內
			if (
				row < 0 ||
				row + size > GRID_CONFIG.enemyRows ||
				col < 0 ||
				col + size > GRID_CONFIG.enemyCols
			) {
				continue;
			}

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
