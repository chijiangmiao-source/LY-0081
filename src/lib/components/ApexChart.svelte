<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import ApexCharts from 'apexcharts';

	export let options: any;

	let chartEl: HTMLDivElement;
	let chart: ApexCharts;

	onMount(() => {
		if (chartEl) {
			chart = new ApexCharts(chartEl, options);
			chart.render();
		}
	});

	$: if (chart && options) {
		chart.updateOptions(options);
	}

	onDestroy(() => {
		if (chart) {
			chart.destroy();
		}
	});
</script>

<div bind:this={chartEl} class="w-full"></div>
