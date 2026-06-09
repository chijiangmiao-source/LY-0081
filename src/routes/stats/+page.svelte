<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import ApexChart from '$lib/components/ApexChart.svelte';
	import { getRecords, getWarningStats, getWarningsFiltered } from '$lib/storage';
	import { TRAINING_ITEMS, ERROR_TYPES, WARNING_LEVEL_LABELS } from '$lib/constants';
	import { getWarningLevelBadgeClass, getDeductBadgeClass, buildWarningsUrl } from '$lib/utils';
	import type { PracticeRecord, WarningRecord } from '$lib/types';

	let records: PracticeRecord[] = [];
	let selectedStudent = '';
	let uniqueStudents: string[] = [];
	let warningStats = { total: 0, stable: 0, attention: 0, alert: 0 };
	let alertWarnings: WarningRecord[] = [];
	let attentionWarnings: WarningRecord[] = [];

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
		yaxis: {
			title: { text: '次数' },
			labels: {
				formatter: function(val: number) {
					return Math.round(val).toString();
				}
			}
		},
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
		yaxis: {
			title: { text: '扣分数' },
			labels: {
				formatter: function(val: number) {
					return Math.round(val).toString();
				}
			}
		},
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
		loadWarningData();
	});

	function loadWarningData() {
		warningStats = getWarningStats();
		alertWarnings = getWarningsFiltered({ level: 'alert' }).slice(0, 5);
		attentionWarnings = getWarningsFiltered({ level: 'attention' }).slice(0, 5);
	}

	function goToWarnings() {
		goto(buildWarningsUrl());
	}

	function goToWarningsLevel(level: string) {
		goto(buildWarningsUrl({ level: level as 'stable' | 'attention' | 'alert' }));
	}

	function goToStudentWarnings(studentName: string) {
		goto(buildWarningsUrl({ student: studentName }));
	}
</script>

<svelte:head>
	<title>统计分析 - 驾校科目二复盘系统</title>
</svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between flex-wrap gap-3">
		<div class="flex items-center gap-3">
			<h2 class="text-2xl font-bold text-gray-900">统计分析</h2>
			<button
				class="px-3 py-1.5 text-sm rounded bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 cursor-pointer font-medium inline-flex items-center gap-1"
				on:click={goToWarnings}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
				</svg>
				阶段测评与预警中心
			</button>
		</div>
		<div class="w-64">
			<label class="block text-sm font-medium mb-1 text-gray-700">学员维度查看</label>
			<select
				bind:value={selectedStudent}
				class="w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
			>
				<option value="">全部学员</option>
				{#each uniqueStudents as name}
					<option value={name}>{name}</option>
				{/each}
			</select>
		</div>
	</div>

	{#if warningStats.total > 0}
		<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
			<div class="flex items-center justify-between mb-4">
				<h3 class="font-semibold text-lg text-gray-900">阶段测评预警概览</h3>
				<button
					class="px-3 py-1 text-sm text-purple-600 hover:text-purple-800 cursor-pointer font-medium"
					on:click={goToWarnings}
				>
					查看全部 →
				</button>
			</div>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
				<div
					class="bg-gray-50 rounded-lg p-4 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
					on:click={goToWarnings}
				>
					<p class="text-xs text-gray-500 mb-1">预警总数</p>
					<p class="text-2xl font-bold text-gray-900">{warningStats.total}</p>
				</div>
				<div
					class="bg-green-50 rounded-lg p-4 border border-green-200 cursor-pointer hover:bg-green-100 transition-colors"
					on:click={() => goToWarningsLevel('stable')}
				>
					<p class="text-xs text-gray-500 mb-1">稳定</p>
					<p class="text-2xl font-bold text-green-600">{warningStats.stable}</p>
				</div>
				<div
					class="bg-yellow-50 rounded-lg p-4 border border-yellow-200 cursor-pointer hover:bg-yellow-100 transition-colors"
					on:click={() => goToWarningsLevel('attention')}
				>
					<p class="text-xs text-gray-500 mb-1">需关注</p>
					<p class="text-2xl font-bold text-yellow-600">{warningStats.attention}</p>
				</div>
				<div
					class="bg-red-50 rounded-lg p-4 border border-red-200 cursor-pointer hover:bg-red-100 transition-colors"
					on:click={() => goToWarningsLevel('alert')}
				>
					<p class="text-xs text-gray-500 mb-1">重点预警</p>
					<p class="text-2xl font-bold text-red-600">{warningStats.alert}</p>
				</div>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#if alertWarnings.length > 0}
					<div class="bg-red-50 rounded-lg p-4 border border-red-100">
						<h4 class="font-semibold text-red-800 mb-3 flex items-center gap-2">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
							重点预警学员 TOP 5
						</h4>
						<div class="space-y-2">
							{#each alertWarnings as w}
								<div
									class="flex items-center justify-between p-2 bg-white rounded border border-red-100 cursor-pointer hover:bg-red-50"
									on:click={() => goToStudentWarnings(w.studentName)}
								>
									<div class="flex items-center gap-2">
										<span class="font-medium text-gray-900">{w.studentName}</span>
										{#if w.trainingItem}
											<span class="text-xs text-gray-500">· {w.trainingItem}</span>
										{/if}
									</div>
									<div class="flex items-center gap-2">
										<span class="text-sm font-bold text-red-600">{w.score}分</span>
										<span class="inline-block px-2 py-0.5 rounded text-xs font-bold {getWarningLevelBadgeClass(w.level)}">
											{WARNING_LEVEL_LABELS[w.level]}
										</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if attentionWarnings.length > 0}
					<div class="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
						<h4 class="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							需关注学员 TOP 5
						</h4>
						<div class="space-y-2">
							{#each attentionWarnings as w}
								<div
									class="flex items-center justify-between p-2 bg-white rounded border border-yellow-100 cursor-pointer hover:bg-yellow-50"
									on:click={() => goToStudentWarnings(w.studentName)}
								>
									<div class="flex items-center gap-2">
										<span class="font-medium text-gray-900">{w.studentName}</span>
										{#if w.trainingItem}
											<span class="text-xs text-gray-500">· {w.trainingItem}</span>
										{/if}
									</div>
									<div class="flex items-center gap-2">
										<span class="text-sm font-bold text-yellow-600">{w.score}分</span>
										<span class="inline-block px-2 py-0.5 rounded text-xs font-bold {getWarningLevelBadgeClass(w.level)}">
											{WARNING_LEVEL_LABELS[w.level]}
										</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	{#if records.length === 0}
		<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
			<div class="text-center py-12 text-gray-500">
				<p class="text-lg">暂无数据，请先添加练习记录</p>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
				<ApexChart options={itemChartOptions} />
			</div>
			<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
				<ApexChart options={deductChartOptions} />
			</div>
			<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
				{#if errorStats.length > 0}
					<ApexChart options={errorChartOptions} />
				{:else}
					<div class="text-center py-12 text-gray-500">
						暂无失误类型数据
					</div>
				{/if}
			</div>
			<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
				<ApexChart options={trendChartOptions} />
			</div>
		</div>

		<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
			<h3 class="font-semibold text-lg mb-4 text-gray-900">各训练项目统计明细</h3>
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-sm text-gray-800">
					<thead>
						<tr class="border-b border-gray-200">
							<th class="text-left p-3 font-semibold text-gray-900">训练项目</th>
							<th class="text-left p-3 font-semibold text-gray-900">练习次数</th>
							<th class="text-left p-3 font-semibold text-gray-900">总扣分</th>
							<th class="text-left p-3 font-semibold text-gray-900">平均扣分</th>
							<th class="text-left p-3 font-semibold text-gray-900">需补训次数</th>
						</tr>
					</thead>
					<tbody>
						{#each itemStats as stat}
							<tr class="border-b border-gray-100 hover:bg-gray-50">
								<td class="p-3 font-medium">{stat.item}</td>
								<td class="p-3">{stat.count} 次</td>
								<td class="p-3">
									<span class="inline-block px-2 py-1 rounded text-xs font-bold {getDeductBadgeClass(stat.totalDeduct)}">
										{stat.totalDeduct} 分
									</span>
								</td>
								<td class="p-3">
									<span class="inline-block px-2 py-1 rounded text-xs font-bold {getDeductBadgeClass(parseFloat(stat.avgDeduct))}">
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
			<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
				<h3 class="font-semibold text-lg mb-4 text-gray-900">学员维度统计</h3>
				<div class="overflow-x-auto">
					<table class="w-full border-collapse text-sm text-gray-800">
						<thead>
							<tr class="border-b border-gray-200">
								<th class="text-left p-3 font-semibold text-gray-900">学员姓名</th>
								<th class="text-left p-3 font-semibold text-gray-900">练习总次数</th>
								<th class="text-left p-3 font-semibold text-gray-900">总扣分</th>
								<th class="text-left p-3 font-semibold text-gray-900">平均扣分</th>
								<th class="text-left p-3 font-semibold text-gray-900">需补训次数</th>
							</tr>
						</thead>
						<tbody>
							{#each studentStats as stat}
								<tr class="border-b border-gray-100 hover:bg-gray-50">
									<td class="p-3 font-medium">{stat.name}</td>
									<td class="p-3">{stat.count} 次</td>
									<td class="p-3">
										<span class="inline-block px-2 py-1 rounded text-xs font-bold {getDeductBadgeClass(stat.totalDeduct)}">
											{stat.totalDeduct} 分
										</span>
									</td>
									<td class="p-3">
										<span class="inline-block px-2 py-1 rounded text-xs font-bold {getDeductBadgeClass(parseFloat(stat.avgDeduct))}">
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
