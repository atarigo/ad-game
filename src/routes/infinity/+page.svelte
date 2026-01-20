<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type Phaser from 'phaser';
	import { createGame, destroyGame, GAME_WIDTH, GAME_HEIGHT } from '$lib/games/infinity';

	let gameContainer: HTMLDivElement;
	let game: Phaser.Game | null = null;

	onMount(async () => {
		game = await createGame(gameContainer);
	});

	onDestroy(() => {
		destroyGame(game);
		game = null;
	});
</script>

<section class="relative w-full">
	<div class="container mx-auto">
		<hgroup>
			<h2 class="text-2xl uppercase">Infinity</h2>
		</hgroup>
	</div>
</section>

<section class="relative w-full">
	<div class="flex min-h-screen items-center justify-center bg-gray-900">
		<div
			bind:this={gameContainer}
			class="game-container"
			style="width: {GAME_WIDTH}px; height: {GAME_HEIGHT}px; max-width: 100vw; max-height: 100vh;"
		></div>
	</div>
</section>

<style>
	.game-container {
		/* 確保遊戲容器在各種裝置上正確顯示 */
		aspect-ratio: 360 / 640;
	}

	/* 手機裝置：填滿寬度 */
	@media (max-width: 640px) {
		.game-container {
			width: 100vw !important;
			height: auto !important;
		}
	}
</style>
