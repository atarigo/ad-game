import type Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';

export class MainScene extends Phaser.Scene {
	constructor() {
		super({ key: 'MainScene' });
	}

	create() {
		// 繪製邊界框來顯示遊戲區域
		const graphics = this.add.graphics();
		graphics.lineStyle(2, COLORS.border, 1);
		graphics.strokeRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

		// 添加文字顯示遊戲尺寸
		this.add
			.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `遊戲區域\n${GAME_WIDTH} x ${GAME_HEIGHT}`, {
				fontSize: '24px',
				color: COLORS.text,
				align: 'center'
			})
			.setOrigin(0.5);

		// 在四個角落畫正立方體
		const cubeSize = 50;
		const padding = 10;

		// 左上角
		this.drawCube(padding, padding, cubeSize);

		// 右上角
		this.drawCube(GAME_WIDTH - padding - cubeSize, padding, cubeSize);

		// 左下角
		this.drawCube(padding, GAME_HEIGHT - padding - cubeSize, cubeSize);

		// 右下角
		this.drawCube(GAME_WIDTH - padding - cubeSize, GAME_HEIGHT - padding - cubeSize, cubeSize);
	}

	drawCube(x: number, y: number, size: number) {
		const graphics = this.add.graphics();

		// 等距投影參數
		const depth = size * 0.6; // 深度

		// 頂面（菱形）
		graphics.fillStyle(0xff6666, 1);
		graphics.beginPath();
		graphics.moveTo(x + size / 2, y); // 上
		graphics.lineTo(x + size, y + size / 4); // 右
		graphics.lineTo(x + size / 2, y + size / 2); // 下
		graphics.lineTo(x, y + size / 4); // 左
		graphics.closePath();
		graphics.fill();
		graphics.lineStyle(2, 0x990000, 1);
		graphics.strokePath();

		// 左面
		graphics.fillStyle(0xcc0000, 1);
		graphics.beginPath();
		graphics.moveTo(x, y + size / 4); // 頂面左
		graphics.lineTo(x, y + size / 4 + depth); // 底部左
		graphics.lineTo(x + size / 2, y + size / 2 + depth); // 底部中
		graphics.lineTo(x + size / 2, y + size / 2); // 頂面下
		graphics.closePath();
		graphics.fill();
		graphics.lineStyle(2, 0x990000, 1);
		graphics.strokePath();

		// 右面
		graphics.fillStyle(0xff0000, 1);
		graphics.beginPath();
		graphics.moveTo(x + size, y + size / 4); // 頂面右
		graphics.lineTo(x + size, y + size / 4 + depth); // 底部右
		graphics.lineTo(x + size / 2, y + size / 2 + depth); // 底部中
		graphics.lineTo(x + size / 2, y + size / 2); // 頂面下
		graphics.closePath();
		graphics.fill();
		graphics.lineStyle(2, 0x990000, 1);
		graphics.strokePath();
	}
}
