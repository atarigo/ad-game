import type Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config';

export { GAME_WIDTH, GAME_HEIGHT } from './config';

export async function createGame(parent: HTMLElement): Promise<Phaser.Game> {
	// 動態載入 Phaser，避免 SSR 問題
	const Phaser = await import('phaser');
	const { MainScene } = await import('./scenes/MainScene');
	const { SupplyScene } = await import('./scenes/SupplyScene');

	// 重置遊戲狀態
	const { GameState } = await import('./state');
	GameState.reset();

	const config: Phaser.Types.Core.GameConfig = {
		type: Phaser.AUTO,
		width: GAME_WIDTH,
		height: GAME_HEIGHT,
		parent,
		backgroundColor: COLORS.background,
		scene: [MainScene, SupplyScene], // 註冊所有場景
		scale: {
			mode: Phaser.Scale.FIT,
			autoCenter: Phaser.Scale.CENTER_BOTH
		},
		render: {
			antialias: true, // 啟用抗鋸齒
			roundPixels: true // 像素對齊，減少文字模糊
		},
		audio: {
			disableWebAudio: true // 禁用 WebAudio，避免場景切換時的 AudioContext 錯誤
		}
	};

	return new Phaser.Game(config);
}

export function destroyGame(game: Phaser.Game | null): void {
	if (game) {
		game.destroy(true);
	}
}
