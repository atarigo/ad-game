/**
 * 敵人模板配置（從 JSON 讀取）
 */
export interface EnemyTemplate {
	id: string;
	name: string;
	size: 1 | 2 | 3;
	baseHp: number;
	baseAttack: number;
	baseCooldown: {
		min: number;
		max: number;
	};
	color: string; // 十六進制字符串格式（如 "#ff6b6b"）
	spawnWeight?: number; // 普通敵人的生成權重（Boss 沒有）
	description?: string; // Boss 的描述
}

/**
 * 將十六進制顏色字符串轉換為數字
 */
export function parseColor(colorString: string): number {
	// 移除 # 符號並轉換為數字
	return parseInt(colorString.replace('#', ''), 16);
}

/**
 * 敵人配置文件結構
 */
export interface EnemyConfig {
	enemies: EnemyTemplate[];
}

/**
 * Boss 配置文件結構
 */
export interface BossConfig {
	bosses: EnemyTemplate[];
}

/**
 * 關卡難度配置
 */
export interface DifficultyScaling {
	hpMultiplier: number; // 血量倍率
	attackMultiplier: number; // 攻擊力倍率
}

/**
 * 根據關卡計算難度加成
 */
export function calculateDifficultyScaling(level: number): DifficultyScaling {
	// 每 5 關增加 20% 血量和攻擊力
	const tier = Math.floor((level - 1) / 5);
	const multiplier = 1 + tier * 0.2;

	return {
		hpMultiplier: multiplier,
		attackMultiplier: multiplier
	};
}

/**
 * 應用難度加成到敵人模板
 */
export function applyDifficultyScaling(
	template: EnemyTemplate,
	scaling: DifficultyScaling
): {
	hp: number;
	maxHp: number;
	attack: number;
	cooldown: number;
	maxCooldown: number;
} {
	// 計算實際數值
	const hp = Math.ceil(template.baseHp * scaling.hpMultiplier);
	const attack = Math.ceil(template.baseAttack * scaling.attackMultiplier);

	// 冷卻時間在範圍內隨機
	const cooldown =
		template.baseCooldown.min +
		Math.floor(Math.random() * (template.baseCooldown.max - template.baseCooldown.min + 1));

	return {
		hp,
		maxHp: hp,
		attack,
		cooldown,
		maxCooldown: cooldown
	};
}
