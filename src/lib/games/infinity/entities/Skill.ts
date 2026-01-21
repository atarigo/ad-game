/**
 * 技能系統
 * 定義技能資料結構和管理器
 */

import type { PrimaryAttributes } from './CharacterStats';
import { DamageType } from './DamageSystem';
import { StatusEffectType } from './StatusEffect';
import type { Tier } from '../data/constants';

/**
 * 技能類型
 */
export enum SkillType {
	Active = 'active',
	Passive = 'passive'
}

/**
 * 技能效果
 */
export interface SkillEffect {
	type: 'damage' | 'heal' | 'buff' | 'debuff' | 'stun';
	damageType?: DamageType;
	value?: number;
	multiplier?: number;
	attribute?: keyof PrimaryAttributes;
	attributePercent?: number;
	statusEffect?: {
		type: StatusEffectType;
		duration: number;
		value?: number;
	};
}

/**
 * 技能定義
 */
export interface Skill {
	id: string;
	name: string;
	nameEn: string;
	description: string;
	type: SkillType;
	effects: SkillEffect[];
	manaCost: number;
	cooldown: number;
	price: number;
	tier: Tier;
	icon?: string;
}

/**
 * 已學習的技能
 */
export interface LearnedSkill {
	skillId: string;
	currentCooldown: number;
	isOnCooldown: boolean;
}

/**
 * 技能管理器
 */
export class SkillManager {
	private learnedSkills: Map<string, LearnedSkill> = new Map();
	private skillDefinitions: Map<string, Skill> = new Map();

	/**
	 * 註冊技能定義（可批量註冊）
	 */
	registerSkill(skill: Skill): void {
		this.skillDefinitions.set(skill.id, skill);
	}

	/**
	 * 批量註冊技能定義
	 */
	registerSkills(skills: Skill[]): void {
		for (const skill of skills) {
			this.registerSkill(skill);
		}
	}

	/**
	 * 學習技能
	 */
	learnSkill(skillId: string): boolean {
		if (this.learnedSkills.has(skillId)) {
			return false; // 已學習
		}

		if (!this.skillDefinitions.has(skillId)) {
			return false; // 技能不存在
		}

		this.learnedSkills.set(skillId, {
			skillId,
			currentCooldown: 0,
			isOnCooldown: false
		});

		return true;
	}

	/**
	 * 檢查技能是否可用
	 */
	canUseSkill(skillId: string, currentMana: number): boolean {
		const learned = this.learnedSkills.get(skillId);
		if (!learned) return false;

		const skill = this.skillDefinitions.get(skillId);
		if (!skill) return false;

		if (learned.isOnCooldown) return false;
		if (currentMana < skill.manaCost) return false;

		return true;
	}

	/**
	 * 使用技能（開始冷卻）
	 */
	useSkill(skillId: string): void {
		const learned = this.learnedSkills.get(skillId);
		if (!learned) return;

		const skill = this.skillDefinitions.get(skillId);
		if (!skill) return;

		learned.currentCooldown = skill.cooldown;
		learned.isOnCooldown = true;
	}

	/**
	 * 更新冷卻（每回合結束時調用）
	 */
	updateCooldowns(): void {
		for (const learned of this.learnedSkills.values()) {
			if (learned.isOnCooldown) {
				learned.currentCooldown--;
				if (learned.currentCooldown <= 0) {
					learned.currentCooldown = 0;
					learned.isOnCooldown = false;
				}
			}
		}
	}

	/**
	 * 取得已學習的技能列表
	 */
	getLearnedSkills(): LearnedSkill[] {
		return Array.from(this.learnedSkills.values());
	}

	/**
	 * 取得技能定義
	 */
	getSkill(skillId: string): Skill | undefined {
		return this.skillDefinitions.get(skillId);
	}

	/**
	 * 取得技能冷卻狀態
	 */
	getSkillCooldown(skillId: string): number {
		const learned = this.learnedSkills.get(skillId);
		return learned?.currentCooldown ?? 0;
	}

	/**
	 * 檢查技能是否已學習
	 */
	hasSkill(skillId: string): boolean {
		return this.learnedSkills.has(skillId);
	}
}
