import type Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config';

export { GAME_WIDTH, GAME_HEIGHT } from './config';

export async function createGame(parent: HTMLElement): Promise<Phaser.Game> {
	// 動態載入 Phaser，避免 SSR 問題
	const Phaser = await import('phaser');
	const { MenuScene } = await import('./scenes/MenuScene');
	const { GameScene } = await import('./scenes/GameScene');

	const config: Phaser.Types.Core.GameConfig = {
		type: Phaser.AUTO,
		parent,
		width: GAME_WIDTH,
		height: GAME_HEIGHT,
		backgroundColor: COLORS.background,
		scene: [MenuScene, GameScene],
		scale: {
			mode: Phaser.Scale.FIT,
			autoCenter: Phaser.Scale.CENTER_BOTH
		},
		physics: {
			default: 'arcade',
			arcade: {
				gravity: { y: 0, x: 0 },
				debug: false
			}
		}
	};

	return new Phaser.Game(config);
}

export function destroyGame(game: Phaser.Game | null): void {
	if (game) {
		game.destroy(true);
	}
}
