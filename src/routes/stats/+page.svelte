<script lang="ts">
	import { onMount } from 'svelte';
	import ApexChart from '$lib/components/ApexChart.svelte';
	import { getRecords } from '$lib/storage';
	import { TRAINING_ITEMS, ERROR_TYPES, AUTO_RETRAIN_THRESHOLD } from '$lib/constants';
	import type { PracticeRecord } from '$lib/types';

	let records: PracticeRecord[] = [];
	let selectedStudent = '';
	let uniqueStudents: string[] = [];

	$: filteredRecords = selectedStudent
		? records.filter((r) => r.studentName === selectedStudent)
		: records;

	$: itemStats = TRAINING_ITEMS.map((item) => {
		const itemRecords = filteredRecords.filter((r) => r.trainingItem === item);
		const totalDeduct = itemRecords.reduce((sum, r) => sum + r.deductCount, 0);
		const retrainCount = itemRecords.filter((r) => r.needRetraining).length;
		const avgDeduct = itemRecords.length > 0 ? (totalDeduct / itemRecords.length).toFixed(1) : '0';
		return {
			item,
			count: itemRecords.length,
			totalDeduct,
			avgDeduct,
			retrainCount
		};
	});

	$: errorStats = ERROR_TYPES.map((type) => {
		const count = filteredRecords.filter((r) => r.mainErrorType === type).length;
		return { type, count };
	}).filter((s) => s.count > 0).sort((a, b) => b.count - a.count);

	$: studentStats = [...uniqueStudents].map((name) => {
		const studentRecords = records.filter((r) => r.studentName === name);
		const totalDeduct = studentRecords.reduce((sum, r) => sum + r.deductCount, 0);
		const retrainCount = studentRecords.filter((r) => r.needRetraining).length;
		const avgDeduct = studentRecords.length > 0 ? (totalDeduct / studentRecords.length).toFixed(1) : '0';
		return {
			name,
			count: studentRecords.length,
			totalDeduct,
			avgDeduct,
			retrainCount
		};
	}).sort((a, b) => b.totalDeduct - a.totalDeduct);

	$: itemChartOptions = {
		chart: {
			type: 'bar',
			height: 350,
			toolbar: { show: false }
		},
		title: { text: '各训练项目练习次数统计', align: 'center' },
		plotOptions: {
			bar: { horizontal: false, columnWidth: '55%', endingShape: 'rounded' }
		},
		dataLabels: { enabled: false },
		xaxis: { categories: TRAINING_ITEMS },
		yaxis: { title: { text: '次数' } },
		series: [
			{ name: '练习次数', data: itemStats.map((s) => s.count) },
			{ name: '需补训次数', data: itemStats.map((s) => s.retrainCount) }
		],
		colors: ['#3b82f6', '#f59e0b']
	};

	$: deductChartOptions = {
		chart: { type: 'bar', height: 350, toolbar: { show: false } },
		title: { text: '各训练项目扣分情况统计', align: 'center' },
		plotOptions: { bar: { columnWidth: '55%' } },
		dataLabels: { enabled: true },
		xaxis: { categories: TRAINING_ITEMS },
		yaxis: { title: { text: '扣分数' } },
		series: [{ name: '总扣分', data: itemStats.map((s) => s.totalDeduct) }],
		colors: ['#ef4444']
	};

	$: errorChartOptions = {
		chart: { type: 'pie', height: 350 },
		title: { text: '主要失误类型分布', align: 'center' },
		labels: errorStats.map((s) => s.type),
		series: errorStats.map((s) => s.count),
		responsive: [{ breakpoint: 480, options: { chart: { width: 300 } } }]
	};

	$: trendChartOptions = (() => {
		const dates = [...new Set(filteredRecords.map((r) => r.practiceDate))].sort();
		const avgDeductByDate = dates.map((date) => {
			const dayRecords = filteredRecords.filter((r) => r.practiceDate === date);
			const sum = dayRecords.reduce((s, r) => s + r.deductCount, 0);
			return dayRecords.length > 0 ? Number((sum / dayRecords.length).toFixed(1)) : 0;
		});
		return {
			chart: { type: 'line', height: 300, toolbar: { show: false } },
			title: { text: '日常平均扣分趋势', align: 'center' },
			stroke: { curve: 'smooth', width: 2 },
			markers: { size: 5 },
			xaxis: { categories: dates, labels: { rotate: -45 } },
			yaxis: { title: { text: '平均扣分' }, min: 0, max: 20 },
			series: [{ name: '平均扣分', data: avgDeductByDate }],
			colors: ['#8b5cf6']
		};
	})();

	onMount(() => {
		records = getRecords().sort((a, b) => (a.practiceDate > b.practiceDate ? 1 : -1));
		uniqueStudents = [...new Set(records.map((r) => r.studentName))];
	});

	function getDeductClass(deduct: number | string): string {
		const d = typeof deduct === 'string' ? parseFloat(deduct) : deduct;
		if (d === 0) return 'bg-green-100 text-green-800 border border-green-300';
		if (d <= 5) return 'bg-green-50 text-green-700 border border-green-200';
		if (d <= AUTO_RETRAIN_THRESHOLD) return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
		return 'bg-red-100 text-red-800 border border-red-300';
	}
</script>

<svelte:head>
	<title>统计分析 - 驾校科目二复盘系统</title>
</svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-bold">统计分析</h2>
		<div class="w-64">
			<label class="block text-sm font-medium mb-1">学员维度查看</label>
			<select
				bind:value={selectedStudent}
				class="w-full px-3 py-2 rounded border border-surface-300-700-token bg-surface-50-900-token focus:outline-none focus:ring-2 focus:ring-primary-500"
			>
				<option value="">全部学员</option>
				{#each uniqueStudents as name}
					<option value={name}>{name}</option>
				{/each}
			</select>
		</div>
	</div>

	{#if records.length === 0}
		<div class="bg-surface-100-900-token rounded-lg p-4 shadow-sm border border-surface-200-800-token">
			<div class="text-center py-12 text-on-surface-variant-token">
				<p class="text-lg">暂无数据，请先添加练习记录</p>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div class="bg-surface-100-900-token rounded-lg p-4 shadow-sm border border-surface-200-800-token">
				<ApexChart options={itemChartOptions} />
			</div>
			<div class="bg-surface-100-900-token rounded-lg p-4 shadow-sm border border-surface-200-800-token">
				<ApexChart options={deductChartOptions} />
			</div>
			<div class="bg-surface-100-900-token rounded-lg p-4 shadow-sm border border-surface-200-800-token">
				{#if errorStats.length > 0}
					<ApexChart options={errorChartOptions} />
				{:else}
					<div class="text-center py-12 text-on-surface-variant-token">
						暂无失误类型数据
					</div>
				{/if}
			</div>
			<div class="bg-surface-100-900-token rounded-lg p-4 shadow-sm border border-surface-200-800-token">
				<ApexChart options={trendChartOptions} />
			</div>
		</div>

		<div class="bg-surface-100-900-token rounded-lg p-4 shadow-sm border border-surface-200-800-token">
			<h3 class="font-semibold text-lg mb-4">各训练项目统计明细</h3>
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-sm">
					<thead>
						<tr class="border-b border-surface-300-700-token">
							<th class="text-left p-3 font-semibold">训练项目</th>
							<th class="text-left p-3 font-semibold">练习次数</th>
							<th class="text-left p-3 font-semibold">总扣分</th>
							<th class="text-left p-3 font-semibold">平均扣分</th>
							<th class="text-left p-3 font-semibold">需补训次数</th>
						</tr>
					</thead>
					<tbody>
						{#each itemStats as stat}
							<tr class="border-b border-surface-200-800-token">
								<td class="p-3 font-medium">{stat.item}</td>
								<td class="p-3">{stat.count} 次</td>
								<td class="p-3">
									<span class="inline-block px-2 py-1 rounded text-xs font-bold {getDeductClass(stat.totalDeduct)}">
										{stat.totalDeduct} 分
									</span>
								</td>
								<td class="p-3">
									<span class="inline-block px-2 py-1 rounded text-xs font-bold {getDeductClass(parseFloat(stat.avgDeduct))}">
										{stat.avgDeduct} 分
									</span>
								</td>
								<td class="p-3">
									{#if stat.retrainCount > 0}
										<span class="inline-block px-2 py-1 rounded text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300">
											{stat.retrainCount} 次
										</span>
									{:else}
										-
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		{#if !selectedStudent}
			<div class="bg-surface-100-900-token rounded-lg p-4 shadow-sm border border-surface-200-800-token">
				<h3 class="font-semibold text-lg mb-4">学员维度统计</h3>
				<div class="overflow-x-auto">
					<table class="w-full border-collapse text-sm">
						<thead>
							<tr class="border-b border-surface-300-700-token">
								<th class="text-left p-3 font-semibold">学员姓名</th>
								<th class="text-left p-3 font-semibold">练习总次数</th>
								<th class="text-left p-3 font-semibold">总扣分</th>
								<th class="text-left p-3 font-semibold">平均扣分</th>
								<th class="text-left p-3 font-semibold">需补训次数</th>
							</tr>
						</thead>
						<tbody>
							{#each studentStats as stat}
								<tr class="border-b border-surface-200-800-token">
									<td class="p-3 font-medium">{stat.name}</td>
									<td class="p-3">{stat.count} 次</td>
									<td class="p-3">
										<span class="inline-block px-2 py-1 rounded text-xs font-bold {getDeductClass(stat.totalDeduct)}">
											{stat.totalDeduct} 分
										</span>
									</td>
									<td class="p-3">
										<span class="inline-block px-2 py-1 rounded text-xs font-bold {getDeductClass(parseFloat(stat.avgDeduct))}">
											{stat.avgDeduct} 分
										</span>
									</td>
									<td class="p-3">
										{#if stat.retrainCount > 0}
											<span class="inline-block px-2 py-1 rounded text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300">
												{stat.retrainCount} 次
											</span>
										{:else}
											-
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	{/if}
</div>
