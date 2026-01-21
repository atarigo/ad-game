import type Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';

export class MenuScene extends Phaser.Scene {
	constructor() {
		super({ key: 'MenuScene' });
	}

	create() {
		// 背景
		this.cameras.main.setBackgroundColor(COLORS.background);

		// 標題
		this.add
			.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, 'Cube War', {
				fontSize: '48px',
				color: COLORS.text,
				fontStyle: 'bold'
			})
			.setOrigin(0.5);

		// 開始遊戲按鈕
		const buttonWidth = 200;
		const buttonHeight = 60;
		const buttonX = GAME_WIDTH / 2;
		const buttonY = GAME_HEIGHT / 2 + 50;

		const button = this.add
			.rectangle(buttonX, buttonY, buttonWidth, buttonHeight, COLORS.button)
			.setInteractive({ useHandCursor: true })
			.on('pointerover', () => {
				button.setFillStyle(COLORS.buttonHover);
			})
			.on('pointerout', () => {
				button.setFillStyle(COLORS.button);
			})
			.on('pointerdown', () => {
				this.scene.start('GameScene');
			});

		this.add
			.text(buttonX, buttonY, '開始遊戲', {
				fontSize: '24px',
				color: '#ffffff'
			})
			.setOrigin(0.5);
	}
}
