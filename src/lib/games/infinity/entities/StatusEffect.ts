/**
 * 狀態效果系統
 * 管理角色的 buff/debuff 狀態
 */

/**
 * 狀態效果類型
 */
export enum StatusEffectType {
	// Debuff（負面效果）
	Stun = 'stun', // 暈眩（無法行動）
	Poison = 'poison', // 中毒（每回合損血）
	Burn = 'burn', // 燃燒（持續傷害）
	Freeze = 'freeze', // 冰凍（行動受限）

	// Buff（正面效果，未來擴充）
	Strength = 'strength', // 力量提升
	Defense = 'defense', // 防禦提升
	Regeneration = 'regeneration' // 回復提升
}

/**
 * 狀態效果
 */
export interface StatusEffect {
	type: StatusEffectType;
	duration: number; // 剩餘持續時間（回合數）
	value?: number; // 效果數值（例如每回合傷害）
	source?: string; // 來源（例如技能 ID）
}

/**
 * 狀態效果管理器
 */
export class StatusEffectManager {
	private effects: StatusEffect[] = [];

	/**
	 * 添加狀態效果
	 */
	addEffect(effect: StatusEffect): void {
		const existingIndex = this.effects.findIndex((e) => e.type === effect.type);
		if (existingIndex >= 0) {
			// 更新持續時間（取較大值）
			this.effects[existingIndex].duration = Math.max(
				this.effects[existingIndex].duration,
				effect.duration
			);
			// 更新數值（如果有）
			if (effect.value !== undefined) {
				this.effects[existingIndex].value = effect.value;
			}
		} else {
			this.effects.push({ ...effect });
		}
	}

	/**
	 * 更新狀態效果（每回合結束時調用）
	 * @returns 更新後的狀態效果列表
	 */
	updateEffects(): StatusEffect[] {
		// 減少持續時間
		this.effects = this.effects
			.map((effect) => ({ ...effect, duration: effect.duration - 1 }))
			.filter((effect) => effect.duration > 0);

		return [...this.effects];
	}

	/**
	 * 檢查是否有特定狀態
	 */
	hasEffect(type: StatusEffectType): boolean {
		return this.effects.some((e) => e.type === type);
	}

	/**
	 * 取得所有狀態效果
	 */
	getEffects(): StatusEffect[] {
		return [...this.effects];
	}

	/**
	 * 取得特定類型的狀態效果
	 */
	getEffect(type: StatusEffectType): StatusEffect | undefined {
		return this.effects.find((e) => e.type === type);
	}

	/**
	 * 清除所有狀態效果
	 */
	clearAll(): void {
		this.effects = [];
	}

	/**
	 * 移除特定類型的狀態效果
	 */
	removeEffect(type: StatusEffectType): void {
		this.effects = this.effects.filter((e) => e.type !== type);
	}
}
