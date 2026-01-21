import type { Skill, PlayerSkills, GameState } from '../types';
import skillsData from '../data/skills.json';

export class SkillSystem {
	/**
	 * 初始化玩家技能狀態
	 */
	static initPlayerSkills(): PlayerSkills {
		return {
			maxHpBoost: 0,
			bulletDamage: 10, // 基礎傷害
			doubleBullet: false,
			pierceActive: false,
			criticalChance: 0,
			shieldCount: 0,
			enemySlowBoost: 0,
			moreOptionsCount: 0,
			acquiredSkills: []
		};
	}

	/**
	 * 獲取所有技能
	 */
	static getAllSkills(): Skill[] {
		return skillsData.skills as Skill[];
	}

	/**
	 * 隨機選擇3個技能
	 */
	static getRandomSkills(count: number = 3): Skill[] {
		const allSkills = this.getAllSkills();
		const shuffled = [...allSkills].sort(() => Math.random() - 0.5);
		return shuffled.slice(0, count);
	}

	/**
	 * 應用技能效果到遊戲狀態
	 */
	static applySkill(skill: Skill, gameState: GameState): void {
		const skills = gameState.skills;

		// 記錄已獲得的技能
		if (!skills.acquiredSkills.includes(skill.id)) {
			skills.acquiredSkills.push(skill.id);
		}

		switch (skill.effectType) {
			case 'max_hp':
				// 增加最大生命值，並同時恢復相同數值的生命
				skills.maxHpBoost += skill.value;
				gameState.playerMaxHp += skill.value;
				gameState.playerHp += skill.value;
				break;

			case 'heal':
				// 立即恢復生命值（不超過最大值）
				gameState.playerHp = Math.min(
					gameState.playerHp + skill.value,
					gameState.playerMaxHp
				);
				break;

			case 'bullet_damage':
				// 增加子彈傷害
				skills.bulletDamage += skill.value;
				break;

			case 'double_bullet':
				// 啟用雙重射擊
				skills.doubleBullet = true;
				break;

			case 'enemy_slow':
				// 增加敵人冷卻時間
				skills.enemySlowBoost += skill.value;
				break;

			case 'pierce':
				// 啟用穿透效果
				skills.pierceActive = true;
				break;

			case 'critical':
				// 增加暴擊機率
				skills.criticalChance += skill.value;
				break;

			case 'shield':
				// 增加護盾數量
				skills.shieldCount += skill.value;
				break;

			case 'grid_expand':
				// 格子擴展（需要在 GameScene 中處理）
				// 這裡只記錄，實際效果在生成選項時應用
				break;

			case 'more_options':
				// 增加可選方塊數量
				skills.moreOptionsCount += skill.value;
				break;
		}
	}

	/**
	 * 計算子彈傷害（含暴擊）
	 */
	static calculateBulletDamage(skills: PlayerSkills): number {
		let damage = skills.bulletDamage;

		// 暴擊判定
		if (skills.criticalChance > 0 && Math.random() < skills.criticalChance) {
			damage *= 2;
		}

		return damage;
	}

	/**
	 * 檢查是否有護盾
	 */
	static hasShield(skills: PlayerSkills): boolean {
		return skills.shieldCount > 0;
	}

	/**
	 * 消耗護盾
	 */
	static consumeShield(skills: PlayerSkills): void {
		if (skills.shieldCount > 0) {
			skills.shieldCount--;
		}
	}

	/**
	 * 獲取應該生成的選項數量（基礎3個 + 技能加成）
	 */
	static getOptionCount(skills: PlayerSkills): number {
		return 3 + skills.moreOptionsCount;
	}

	/**
	 * 檢查是否應該觸發技能選擇（每5關）
	 */
	static shouldTriggerSkillSelect(level: number): boolean {
		return level > 1 && (level - 1) % 5 === 0;
	}
}
