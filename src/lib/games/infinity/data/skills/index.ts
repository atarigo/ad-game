/**
 * 技能資料
 */

import type { Skill } from '../../entities/Skill';
import meleeSkillsData from './melee-skills.json';

/**
 * 所有技能定義
 */
export const SKILLS: Record<string, Skill> = {};

// 載入近戰技能
(meleeSkillsData as Skill[]).forEach((skill) => {
	SKILLS[skill.id] = skill;
});

/**
 * 根據 ID 取得技能
 */
export function getSkill(skillId: string): Skill | undefined {
	return SKILLS[skillId];
}

/**
 * 取得所有技能
 */
export function getAllSkills(): Skill[] {
	return Object.values(SKILLS);
}

/**
 * 根據等級取得可購買的技能
 */
export function getSkillsByTier(tier: string): Skill[] {
	return Object.values(SKILLS).filter((skill) => skill.tier === tier);
}
