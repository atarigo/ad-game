<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		onrestart,
		children
	}: {
		title: string;
		onrestart?: () => void;
		children: Snippet;
	} = $props();
</script>

<svelte:head>
	<title>{title} — Ad Game</title>
</svelte:head>

<div class="shell">
	<header>
		<a href="/" class="back">← 返回</a>
		<span class="title">{title}</span>
		{#if onrestart}
			<button class="restart" onclick={onrestart}>重玩</button>
		{:else}
			<span></span>
		{/if}
	</header>
	<div class="canvas-wrap">
		{@render children()}
	</div>
</div>

<style>
	.shell {
		height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		background: linear-gradient(180deg, var(--bg-dark, #111315) 0%, var(--bg-purple, #1c1e22) 100%);
		overflow: hidden;
		padding-bottom: env(safe-area-inset-bottom, 0px);
	}

	header {
		width: 100%;
		max-width: 420px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 1rem;
		gap: 0.5rem;
	}

	.back {
		font-size: 0.85rem;
		color: #6cb8d6;
		text-decoration: none;
		white-space: nowrap;
	}

	.back:hover {
		color: #88ccee;
		text-shadow: 0 0 10px rgba(108, 184, 214, 0.4);
	}

	.title {
		font-family: 'Audiowide', sans-serif;
		font-size: 1rem;
		color: var(--neon-pink, #ff2d7b);
		text-shadow: 0 0 8px rgba(255, 45, 123, 0.5);
		text-align: center;
		flex: 1;
	}

	.restart {
		background: none;
		border: 1px solid var(--neon-yellow, #ffe156);
		color: var(--neon-yellow, #ffe156);
		padding: 0.25rem 0.7rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
		font-family: inherit;
		white-space: nowrap;
	}

	.restart:hover {
		background: rgba(255, 225, 86, 0.1);
		text-shadow: 0 0 6px rgba(255, 225, 86, 0.4);
	}

	.canvas-wrap {
		flex: 1;
		width: 100%;
		max-width: 420px;
		min-height: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		touch-action: none;
		-webkit-user-select: none;
		user-select: none;
	}

	.canvas-wrap :global(canvas) {
		display: block;
		touch-action: none;
	}
</style>
