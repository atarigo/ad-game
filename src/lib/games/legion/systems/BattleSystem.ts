import type { World, Entity } from '../ecs/Entity';
import {
	COMPONENTS,
	type PositionComponent,
	type TeamComponent,
	type CombatComponent
} from '../ecs/Components';
import { DEBUG_MODE } from '../config';

export enum TurnPhase {
	PLAYER_CONTROL = 'player_control', // 玩家控制階段
	PLAYER_AUTO = 'player_auto', // 玩家自動攻擊階段
	ENEMY_CHECK = 'enemy_check', // 檢查敵人是否全滅
	ENEMY_CONTROL = 'enemy_control', // 敵人控制階段
	ENEMY_AUTO = 'enemy_auto', // 敵人自動攻擊階段
	FINAL_CHECK = 'final_check' // 最終結算
}

export enum BattleResult {
	ONGOING = 'ongoing',
	VICTORY = 'victory',
	DEFEAT = 'defeat'
}

export class BattleSystem {
	private world: World;
	private currentPhase: TurnPhase = TurnPhase.PLAYER_CONTROL;
	private battleResult: BattleResult = BattleResult.ONGOING;

	constructor(world: World) {
		this.world = world;
	}

	getCurrentPhase(): TurnPhase {
		return this.currentPhase;
	}

	getBattleResult(): BattleResult {
		return this.battleResult;
	}

	// 玩家控制階段完成，進入下一階段
	endPlayerControl() {
		if (this.currentPhase === TurnPhase.PLAYER_CONTROL) {
			this.currentPhase = TurnPhase.PLAYER_AUTO;
			this.executePlayerAutoPhase();
		}
	}

	// 玩家自動攻擊階段
	private executePlayerAutoPhase() {
		if (DEBUG_MODE) console.log('⚔️ [Phase] 我方攻擊中...');

		const allies = this.world.getEntitiesWith(COMPONENTS.POSITION, COMPONENTS.TEAM, COMPONENTS.COMBAT);
		const allyUnits = allies.filter((e) => !e.getComponent<TeamComponent>(COMPONENTS.TEAM)!.isEnemy);

		for (const ally of allyUnits) {
			const allyPos = ally.getComponent<PositionComponent>(COMPONENTS.POSITION)!;
			const allyCombat = ally.getComponent<CombatComponent>(COMPONENTS.COMBAT)!;

			// 檢查正前方是否有敵人
			const target = this.findEnemyInFront(allyPos);
			if (target) {
				this.attack(ally, target, true);
			}
		}

		// 進入小結算
		this.currentPhase = TurnPhase.ENEMY_CHECK;
		this.checkEnemyWipe();
	}

	// 檢查敵人是否全滅
	private checkEnemyWipe() {
		if (DEBUG_MODE) console.log('🔍 [Phase] 檢查敵人...');

		const enemies = this.getAliveEnemies();
		if (enemies.length === 0) {
			if (DEBUG_MODE) console.log('🎉 [Result] 敵人全滅！');
			this.battleResult = BattleResult.VICTORY;
			this.currentPhase = TurnPhase.FINAL_CHECK;
		} else {
			if (DEBUG_MODE) console.log(`📊 [Info] 剩餘 ${enemies.length} 個敵人`);
			this.currentPhase = TurnPhase.ENEMY_CONTROL;
			this.executeEnemyControlPhase();
		}
	}

	// 敵人控制階段
	private executeEnemyControlPhase() {
		if (DEBUG_MODE) console.log('👾 [Phase] 敵人回合');
		// TODO: 實作敵人技能和移動邏輯
		// 目前跳過直接進入敵人自動攻擊
		this.currentPhase = TurnPhase.ENEMY_AUTO;
		this.executeEnemyAutoPhase();
	}

	// 敵人自動攻擊階段
	private executeEnemyAutoPhase() {
		if (DEBUG_MODE) console.log('💥 [Phase] 敵方攻擊中...');

		const enemies = this.getAliveEnemies();

		for (const enemy of enemies) {
			const enemyPos = enemy.getComponent<PositionComponent>(COMPONENTS.POSITION)!;

			// 檢查正前方是否有我方單位
			const target = this.findAllyInFront(enemyPos);
			if (target) {
				this.attack(enemy, target, false);
			}
		}

		// 進入最終結算
		this.currentPhase = TurnPhase.FINAL_CHECK;
		this.finalCheck();
	}

	// 最終結算
	private finalCheck() {
		if (DEBUG_MODE) console.log('📋 [Phase] 結算中...');

		const allies = this.getAliveAllies();
		if (allies.length === 0) {
			if (DEBUG_MODE) console.log('💀 [Result] 我方全滅！');
			this.battleResult = BattleResult.DEFEAT;
		} else {
			if (DEBUG_MODE) console.log(`📊 [Info] 剩餘 ${allies.length} 個我方單位`);
			if (DEBUG_MODE) console.log('🎮 [Phase] 玩家回合');
			// 回到玩家控制階段
			this.currentPhase = TurnPhase.PLAYER_CONTROL;
		}
	}

	// 攻擊計算
	private attack(attacker: Entity, target: Entity, isAllyAttacking: boolean) {
		const attackerPos = attacker.getComponent<PositionComponent>(COMPONENTS.POSITION)!;
		const targetPos = target.getComponent<PositionComponent>(COMPONENTS.POSITION)!;
		const attackerCombat = attacker.getComponent<CombatComponent>(COMPONENTS.COMBAT)!;
		const targetCombat = target.getComponent<CombatComponent>(COMPONENTS.COMBAT)!;

		const damage = Math.max(1, attackerCombat.atk - targetCombat.def);
		targetCombat.currentHp -= damage;

		if (DEBUG_MODE) {
			const attackerInfo = isAllyAttacking
				? `我方(${attackerPos.row},${attackerPos.col})`
				: `敵人(${attackerPos.row},${attackerPos.col})`;
			const targetInfo = isAllyAttacking
				? `敵人(${targetPos.row},${targetPos.col})`
				: `我方(${targetPos.row},${targetPos.col})`;

			console.log(
				`  ⚡ ${attackerInfo} → ${targetInfo} | 傷害: ${damage} | 剩餘HP: ${Math.max(0, targetCombat.currentHp)}/${targetCombat.maxHp}`
			);
		}

		if (targetCombat.currentHp <= 0) {
			if (DEBUG_MODE) {
				const deadInfo = isAllyAttacking
					? `敵人(${targetPos.row},${targetPos.col})`
					: `我方(${targetPos.row},${targetPos.col})`;
				console.log(`  ☠️ ${deadInfo} 已陣亡`);
			}
			this.removeEntity(target);
		}
	}

	// 找到正前方的敵人（我方攻擊用）
	private findEnemyInFront(allyPos: PositionComponent): Entity | null {
		const enemies = this.getAliveEnemies();

		for (const enemy of enemies) {
			const enemyPos = enemy.getComponent<PositionComponent>(COMPONENTS.POSITION)!;

			// 檢查是否在同一列
			if (this.isInSameColumn(allyPos, enemyPos)) {
				return enemy;
			}
		}

		return null;
	}

	// 找到正前方的我方單位（敵人攻擊用）
	private findAllyInFront(enemyPos: PositionComponent): Entity | null {
		const allies = this.getAliveAllies();

		for (const ally of allies) {
			const allyPos = ally.getComponent<PositionComponent>(COMPONENTS.POSITION)!;

			// 檢查是否在同一列
			if (this.isInSameColumn(enemyPos, allyPos)) {
				return ally;
			}
		}

		return null;
	}

	// 檢查是否在同一列（考慮寬度）
	private isInSameColumn(pos1: PositionComponent, pos2: PositionComponent): boolean {
		const cols1 = Array.from({ length: pos1.width }, (_, i) => pos1.col + i);
		const cols2 = Array.from({ length: pos2.width }, (_, i) => pos2.col + i);

		return cols1.some((col) => cols2.includes(col));
	}

	// 獲取存活的敵人
	private getAliveEnemies(): Entity[] {
		const entities = this.world.getEntitiesWith(
			COMPONENTS.POSITION,
			COMPONENTS.TEAM,
			COMPONENTS.COMBAT
		);
		return entities.filter((e) => {
			const team = e.getComponent<TeamComponent>(COMPONENTS.TEAM)!;
			const combat = e.getComponent<CombatComponent>(COMPONENTS.COMBAT)!;
			return team.isEnemy && combat.currentHp > 0;
		});
	}

	// 獲取存活的我方單位
	private getAliveAllies(): Entity[] {
		const entities = this.world.getEntitiesWith(
			COMPONENTS.POSITION,
			COMPONENTS.TEAM,
			COMPONENTS.COMBAT
		);
		return entities.filter((e) => {
			const team = e.getComponent<TeamComponent>(COMPONENTS.TEAM)!;
			const combat = e.getComponent<CombatComponent>(COMPONENTS.COMBAT)!;
			return !team.isEnemy && combat.currentHp > 0;
		});
	}

	// 移除實體
	private removeEntity(entity: Entity) {
		// 移除渲染物件
		const render = entity.getComponent<any>(COMPONENTS.RENDER);
		if (render && render.sprite) {
			render.sprite.destroy();
		}

		// 從世界中移除
		this.world.removeEntity(entity.id);
	}
}
