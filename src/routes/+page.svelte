<script lang="ts">
	const links = [
		{ label: 'Infinity', href: '/infinity' },
		{ label: 'Legion', href: '/legion' }
	];
</script>

<section class="relative w-full">
	<div class="container mx-auto">
		<hgroup class="mb-8">
			<h2 class="text-2xl uppercase">links</h2>
		</hgroup>

		<ul class="text-xl font-bold">
			{#each links as link}
				<li>
					<a class="text-sky-600 hover:underline" href={link.href}>{link.label}</a>
				</li>
			{/each}
		</ul>
	</div>
</section>
