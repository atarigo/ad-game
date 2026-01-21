<script lang="ts">
	import { onMount } from 'svelte';
	import { createGame, destroyGame } from '$lib/games/playground/mobile';
	import type Phaser from 'phaser';

	let gameContainer: HTMLDivElement;
	let game: Phaser.Game | null = null;

	onMount(async () => {
		game = await createGame(gameContainer);

		return () => {
			destroyGame(game);
		};
	});
</script>

<section class="relative w-full">
	<div class="container mx-auto">
		<hgroup>
			<h2 class="text-2xl uppercase">Mobile</h2>
		</hgroup>
	</div>
</section>

<section class="fixed inset-0 flex items-center justify-center bg-black">
	<div bind:this={gameContainer}></div>
</section>
