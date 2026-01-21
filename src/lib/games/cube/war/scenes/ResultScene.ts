import type Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';

export class ResultScene extends Phaser.Scene {
	private level!: number;

	constructor() {
		super({ key: 'ResultScene' });
	}

	init(data: { level: number }) {
		this.level = data.level || 1;
	}

	create() {
		// 黑色背景
		this.add
			.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.9)
			.setDepth(0);

		// 標題
		this.add
			.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, '遊戲結束', {
				fontSize: '48px',
				color: COLORS.text,
				fontStyle: 'bold'
			})
			.setOrigin(0.5);

		// 顯示通關層數
		this.add
			.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, `通關層數: ${this.level}`, {
				fontSize: '32px',
				color: COLORS.text
			})
			.setOrigin(0.5);

		// 確認按鈕
		const button = this.add
			.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, 200, 60, COLORS.button)
			.setInteractive({ useHandCursor: true })
			.on('pointerdown', () => {
				this.scene.start('MenuScene');
			})
			.on('pointerover', () => {
				button.setFillStyle(COLORS.button, 0.8);
			})
			.on('pointerout', () => {
				button.setFillStyle(COLORS.button, 1);
			});

		this.add
			.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, '確認', {
				fontSize: '24px',
				color: '#ffffff'
			})
			.setOrigin(0.5);
	}
}
