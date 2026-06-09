<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		generateWarnings,
		getWarningsFiltered,
		getWarningStats,
		deleteWarning,
		getWarnings
	} from '$lib/storage';
	import {
		TRAINING_ITEMS,
		WARNING_LEVEL_LABELS,
		WARNING_SCOPE_LABELS
	} from '$lib/constants';
	import type { WarningRecord, WarningLevel, WarningScope, TrainingItem } from '$lib/types';
	import WarningDetailModal from '$lib/components/WarningDetailModal.svelte';

	let warnings: WarningRecord[] = [];
	let filteredWarnings: WarningRecord[] = [];
	let uniqueStudents: string[] = [];
	let stats = { total: 0, stable: 0, attention: 0, alert: 0 };

	let detailModalOpen = false;
	let selectedWarning: WarningRecord | null = null;

	let searchText = '';
	let studentName = '';
	let level = '' as WarningLevel | '';
	let scope = '' as WarningScope | '';
	let trainingItem = '' as TrainingItem | '';
	let startDate = '';
	let endDate = '';
	let dateRangeError = '';
	let onlyUnacknowledged = false;

	let isGenerating = false;

	onMount(() => {
		loadWarnings();

		const studentParam = $page.url.searchParams.get('student');
		const levelParam = $page.url.searchParams.get('level') as WarningLevel | '';
		const scopeParam = $page.url.searchParams.get('scope') as WarningScope | '';
		const itemParam = $page.url.searchParams.get('item') as TrainingItem | '';
		const startParam = $page.url.searchParams.get('startDate');
		const endParam = $page.url.searchParams.get('endDate');

		if (studentParam) studentName = studentParam;
		if (levelParam && ['stable', 'attention', 'alert'].includes(levelParam)) level = levelParam;
		if (scopeParam && ['student', 'item'].includes(scopeParam)) scope = scopeParam;
		if (itemParam && TRAINING_ITEMS.includes(itemParam)) trainingItem = itemParam;
		if (startParam) startDate = startParam;
		if (endParam) endDate = endParam;

		const warningIdParam = $page.url.searchParams.get('warningId');
		if (warningIdParam) {
			setTimeout(() => {
				const target = warnings.find((w) => w.id === warningIdParam);
				if (target) {
					openWarningDetail(target);
				}
			}, 100);
		}
		const autoGen = $page.url.searchParams.get('autoGen');
		if (autoGen === 'true') {
			setTimeout(() => handleGenerate(), 200);
		}
	});

	function loadWarnings() {
		warnings = getWarnings();
		const allRecords = warnings;
		uniqueStudents = [...new Set(allRecords.map((w) => w.studentName))];
		stats = getWarningStats();
		applyFilters();
	}

	$: validateDateRange(startDate, endDate);

	function validateDateRange(start: string, end: string) {
		dateRangeError = '';
		if (start && end && new Date(end) < new Date(start)) {
			dateRangeError = '结束日期不能早于开始日期';
		}
	}

	$: applyFilters();

	function applyFilters() {
		filteredWarnings = getWarningsFiltered({
			startDate: startDate || undefined,
			endDate: endDate || undefined,
			studentName: studentName || undefined,
			level: (level as WarningLevel) || undefined,
			scope: (scope as WarningScope) || undefined,
			trainingItem: (trainingItem as TrainingItem) || undefined
		});

		if (searchText.trim()) {
			const keyword = searchText.trim().toLowerCase();
			filteredWarnings = filteredWarnings.filter((w) =>
				w.studentName.toLowerCase().includes(keyword) ||
				(w.trainingItem && w.trainingItem.toLowerCase().includes(keyword)) ||
				w.reasons.some((r) => r.description.toLowerCase().includes(keyword))
			);
		}

		if (onlyUnacknowledged) {
			filteredWarnings = filteredWarnings.filter((w) => !w.acknowledged);
		}
	}

	function resetFilters() {
		searchText = '';
		studentName = '';
		level = '';
		scope = '';
		trainingItem = '';
		startDate = '';
		endDate = '';
		onlyUnacknowledged = false;
	}

	async function handleGenerate() {
		isGenerating = true;
		try {
			generateWarnings(startDate || undefined, endDate || undefined);
			loadWarnings();
		} finally {
			isGenerating = false;
		}
	}

	function openWarningDetail(warning: WarningRecord) {
		selectedWarning = warning;
		detailModalOpen = true;
	}

	function handleDelete(id: string) {
		if (confirm('确定要删除这条预警记录吗？')) {
			deleteWarning(id);
			loadWarnings();
		}
	}

	function refreshSelectedWarning() {
		const currentId = selectedWarning?.id;
		if (currentId) {
			const updated = getWarnings().find((w) => w.id === currentId);
			if (updated) {
				selectedWarning = updated;
			}
			loadWarnings();
		}
	}

	function goToStudentArchive(studentName: string) {
		detailModalOpen = false;
		goto(`/students?student=${encodeURIComponent(studentName)}`);
	}

	function getLevelBadgeClass(level: string): string {
		switch (level) {
			case 'stable':
				return 'bg-green-100 text-green-800 border border-green-300';
			case 'attention':
				return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
			case 'alert':
				return 'bg-red-100 text-red-800 border border-red-300';
			default:
				return 'bg-gray-100 text-gray-800 border border-gray-300';
		}
	}

	function getScopeBadgeClass(scope: string): string {
		return scope === 'student'
			? 'bg-blue-50 text-blue-700 border border-blue-200'
			: 'bg-purple-50 text-purple-700 border border-purple-200';
	}
</script>

<svelte:head>
	<title>阶段测评与预警中心 - 驾校科目二复盘系统</title>
</svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between flex-wrap gap-3">
		<h2 class="text-2xl font-bold text-gray-900">阶段测评与预警中心</h2>
		<div class="flex gap-2">
			<button
				class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed"
				on:click={handleGenerate}
				disabled={isGenerating}
			>
				{#if isGenerating}
					<svg class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					生成中...
				{:else}
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
					</svg>
					生成阶段测评
				{/if}
			</button>
		</div>
	</div>

	<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
		<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
			<p class="text-xs text-gray-500 mb-1">预警记录总数</p>
			<p class="text-2xl font-bold text-gray-900">{stats.total}</p>
		</div>
		<div class="bg-white rounded-lg p-4 shadow-sm border border-green-200">
			<p class="text-xs text-gray-500 mb-1">稳定</p>
			<p class="text-2xl font-bold text-green-600">{stats.stable}</p>
		</div>
		<div class="bg-white rounded-lg p-4 shadow-sm border border-yellow-200">
			<p class="text-xs text-gray-500 mb-1">需关注</p>
			<p class="text-2xl font-bold text-yellow-600">{stats.attention}</p>
		</div>
		<div class="bg-white rounded-lg p-4 shadow-sm border border-red-200">
			<p class="text-xs text-gray-500 mb-1">重点预警</p>
			<p class="text-2xl font-bold text-red-600">{stats.alert}</p>
		</div>
	</div>

	<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
		<div class="space-y-4">
			<h3 class="font-semibold text-gray-900">筛选搜索</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<div>
					<label class="block text-sm font-medium mb-1 text-gray-700">关键字搜索</label>
					<input
						type="text"
						bind:value={searchText}
						placeholder="搜索学员、项目、预警原因..."
						class="w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium mb-1 text-gray-700">学员姓名</label>
					<select
						bind:value={studentName}
						class="w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="">全部学员</option>
						{#each uniqueStudents as name}
							<option value={name}>{name}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium mb-1 text-gray-700">预警等级</label>
					<select
						bind:value={level}
						class="w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="">全部等级</option>
						<option value="stable">稳定</option>
						<option value="attention">需关注</option>
						<option value="alert">重点预警</option>
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium mb-1 text-gray-700">评估范围</label>
					<select
						bind:value={scope}
						class="w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="">全部范围</option>
						<option value="student">学员维度</option>
						<option value="item">项目维度</option>
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium mb-1 text-gray-700">训练项目</label>
					<select
						bind:value={trainingItem}
						class="w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="">全部项目</option>
						{#each TRAINING_ITEMS as item}
							<option value={item}>{item}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium mb-1 text-gray-700">开始日期</label>
					<input
						type="date"
						bind:value={startDate}
						max={endDate || undefined}
						class="w-full px-3 py-2 rounded border {dateRangeError ? 'border-red-500' : 'border-gray-300'} bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium mb-1 text-gray-700">结束日期</label>
					<input
						type="date"
						bind:value={endDate}
						min={startDate || undefined}
						class="w-full px-3 py-2 rounded border {dateRangeError ? 'border-red-500' : 'border-gray-300'} bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					{#if dateRangeError}
						<p class="text-xs text-red-500 mt-1">{dateRangeError}</p>
					{/if}
				</div>
				<div class="flex items-end">
					<label class="inline-flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={onlyUnacknowledged}
							class="w-4 h-4 text-blue-600 rounded"
						/>
						<span class="text-sm text-gray-700">仅显示未确认</span>
					</label>
				</div>
			</div>
			<div class="flex gap-2">
				<button
					class="px-4 py-2 rounded border border-blue-500 text-blue-500 hover:bg-blue-50 cursor-pointer font-medium"
					on:click={resetFilters}
				>
					重置筛选
				</button>
			</div>
		</div>
	</div>

	<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
		{#if filteredWarnings.length === 0}
			<div class="text-center py-12 text-gray-500">
				<p class="text-lg mb-2">暂无预警记录</p>
				<p class="text-sm">点击「生成阶段测评」按钮开始生成预警记录</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-sm text-gray-800">
					<thead>
						<tr class="border-b border-gray-200">
							<th class="text-left p-3 font-semibold text-gray-900">状态</th>
							<th class="text-left p-3 font-semibold text-gray-900">等级</th>
							<th class="text-left p-3 font-semibold text-gray-900">范围</th>
							<th class="text-left p-3 font-semibold text-gray-900">学员</th>
							<th class="text-left p-3 font-semibold text-gray-900">训练项目</th>
							<th class="text-left p-3 font-semibold text-gray-900">评分</th>
							<th class="text-left p-3 font-semibold text-gray-900">评估周期</th>
							<th class="text-left p-3 font-semibold text-gray-900">关键指标</th>
							<th class="text-left p-3 font-semibold text-gray-900">操作</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredWarnings as warning}
							<tr class="border-b border-gray-100 hover:bg-gray-50">
								<td class="p-3">
									{#if warning.acknowledged}
										<span class="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300">
											已确认
										</span>
									{:else}
										<span class="inline-block px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-700 border border-red-200">
											待确认
										</span>
									{/if}
								</td>
								<td class="p-3">
									<span class="inline-block px-3 py-1 rounded text-xs font-bold {getLevelBadgeClass(warning.level)}">
										{WARNING_LEVEL_LABELS[warning.level]}
									</span>
								</td>
								<td class="p-3">
									<span class="inline-block px-2 py-0.5 rounded text-xs font-medium {getScopeBadgeClass(warning.scope)}">
										{WARNING_SCOPE_LABELS[warning.scope]}
									</span>
								</td>
								<td class="p-3 font-medium cursor-pointer hover:text-blue-600" on:click={() => goToStudentArchive(warning.studentName)}>
									{warning.studentName}
								</td>
								<td class="p-3">{warning.trainingItem || '-'}</td>
								<td class="p-3">
									<span class="font-bold {warning.score >= 70 ? 'text-green-600' : warning.score >= 40 ? 'text-yellow-600' : 'text-red-600'}">
										{warning.score}
									</span>
								</td>
								<td class="p-3 text-xs text-gray-500">
									{warning.periodStart}<br/>~ {warning.periodEnd}
								</td>
								<td class="p-3 text-xs">
									<div class="space-y-0.5">
										<p>练习：{warning.practiceCount} 次</p>
										<p>扣均：{warning.avgDeduct} 分</p>
										<p>补训率：{(warning.retrainRate * 100).toFixed(0)}%</p>
									</div>
								</td>
								<td class="p-3">
									<div class="flex gap-2">
										<button
											class="px-3 py-1 text-sm rounded bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 cursor-pointer"
											on:click={() => openWarningDetail(warning)}
										>
											详情
										</button>
										<button
											class="px-3 py-1 text-sm rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer"
											on:click={() => goToStudentArchive(warning.studentName)}
										>
											档案
										</button>
										<button
											class="px-3 py-1 text-sm rounded bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 cursor-pointer"
											on:click={() => handleDelete(warning.id)}
										>
											删除
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
				<p class="text-sm text-gray-500 mt-4">
					共 {filteredWarnings.length} 条预警记录
				</p>
			</div>
		{/if}
	</div>
</div>

<WarningDetailModal
	bind:open={detailModalOpen}
	bind:warning={selectedWarning}
/>
<svelte:window on:storage={refreshSelectedWarning} />
