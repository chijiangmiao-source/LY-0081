<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getRecords, deleteRecord, getSuggestions } from '$lib/storage';
	import { TRAINING_ITEMS, AUTO_RETRAIN_THRESHOLD } from '$lib/constants';
	import type { PracticeRecord, TrainingItem, FilterOptions, Suggestion } from '$lib/types';
	import RecordDetailModal from '$lib/components/RecordDetailModal.svelte';

	let records: PracticeRecord[] = [];
	let filteredRecords: PracticeRecord[] = [];
	let uniqueStudents: string[] = [];
	let suggestions: Suggestion[] = [];

	let detailModalOpen = false;
	let selectedRecord: PracticeRecord | null = null;

	let filters: FilterOptions = {
		searchText: '',
		studentName: '',
		trainingItem: '',
		startDate: '',
		endDate: ''
	};

	let dateRangeError = '';

	onMount(() => {
		loadRecords();
	});

	$: validateDateRange(filters.startDate, filters.endDate);

	function validateDateRange(start: string, end: string) {
		dateRangeError = '';
		if (start && end && new Date(end) < new Date(start)) {
			dateRangeError = '结束日期不能早于开始日期';
		}
	}

	function loadRecords() {
		records = getRecords().sort((a, b) => b.createdAt - a.createdAt);
		uniqueStudents = [...new Set(records.map((r) => r.studentName))];
		suggestions = getSuggestions();
		applyFilters();
	}

	function openDetail(record: PracticeRecord) {
		selectedRecord = record;
		detailModalOpen = true;
	}

	function refreshSelectedRecord() {
		const currentId = selectedRecord?.id;
		if (currentId) {
			const updated = getRecords().find((r) => r.id === currentId);
			if (updated) {
				selectedRecord = updated;
			}
			loadRecords();
		}
	}

	function applyFilters() {
		filteredRecords = records.filter((r) => {
			const matchSearch =
				!filters.searchText ||
				r.recordNo.toLowerCase().includes(filters.searchText.toLowerCase()) ||
				r.studentName.includes(filters.searchText) ||
				r.coachComment.includes(filters.searchText) ||
				r.improvementSuggestion.includes(filters.searchText);

			const matchStudent = !filters.studentName || r.studentName === filters.studentName;
			const matchItem = !filters.trainingItem || r.trainingItem === filters.trainingItem;
			const matchStartDate = !filters.startDate || r.practiceDate >= filters.startDate;
			const matchEndDate = !filters.endDate || r.practiceDate <= filters.endDate;

			return matchSearch && matchStudent && matchItem && matchStartDate && matchEndDate;
		});
	}

	$: applyFilters();

	function resetFilters() {
		filters = {
			searchText: '',
			studentName: '',
			trainingItem: '',
			startDate: '',
			endDate: ''
		};
	}

	function editRecord(id: string) {
		goto(`/edit?id=${id}`);
	}

	function confirmDelete(id: string) {
		if (confirm('确定要删除这条练习记录吗？此操作不可恢复。')) {
			deleteRecord(id);
			loadRecords();
		}
	}

	function getDeductBadgeClass(count: number): string {
		if (count === 0) return 'bg-green-100 text-green-800 border border-green-300';
		if (count <= 5) return 'bg-green-50 text-green-700 border border-green-200';
		if (count <= AUTO_RETRAIN_THRESHOLD) return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
		return 'bg-red-100 text-red-800 border border-red-300';
	}
</script>

<svelte:head>
	<title>练习记录 - 驾校科目二复盘系统</title>
</svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-bold">练习记录列表</h2>
		<button
			class="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 cursor-pointer font-medium"
			on:click={() => goto('/edit')}
		>
			<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			新增练习
		</button>
	</div>

	<div class="bg-surface-100-900-token rounded-lg p-4 shadow-sm border border-surface-200-800-token">
		<div class="space-y-4">
			<h3 class="font-semibold">筛选搜索</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
				<div>
					<label class="block text-sm font-medium mb-1">关键字搜索</label>
					<input
						type="text"
						bind:value={filters.searchText}
						placeholder="搜索记录编号、学员、评语..."
						class="w-full px-3 py-2 rounded border border-surface-300-700-token bg-surface-50-900-token focus:outline-none focus:ring-2 focus:ring-primary-500"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium mb-1">学员姓名</label>
					<select
						bind:value={filters.studentName}
						class="w-full px-3 py-2 rounded border border-surface-300-700-token bg-surface-50-900-token focus:outline-none focus:ring-2 focus:ring-primary-500"
					>
						<option value="">全部学员</option>
						{#each uniqueStudents as name}
							<option value={name}>{name}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium mb-1">训练项目</label>
					<select
						bind:value={filters.trainingItem}
						class="w-full px-3 py-2 rounded border border-surface-300-700-token bg-surface-50-900-token focus:outline-none focus:ring-2 focus:ring-primary-500"
					>
						<option value="">全部项目</option>
						{#each TRAINING_ITEMS as item}
							<option value={item}>{item}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium mb-1">开始日期</label>
					<input
						type="date"
						bind:value={filters.startDate}
						max={filters.endDate || undefined}
						class="w-full px-3 py-2 rounded border {dateRangeError ? 'border-red-500' : 'border-surface-300-700-token'} bg-surface-50-900-token focus:outline-none focus:ring-2 focus:ring-primary-500"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium mb-1">结束日期</label>
					<input
						type="date"
						bind:value={filters.endDate}
						min={filters.startDate || undefined}
						class="w-full px-3 py-2 rounded border {dateRangeError ? 'border-red-500' : 'border-surface-300-700-token'} bg-surface-50-900-token focus:outline-none focus:ring-2 focus:ring-primary-500"
					/>
					{#if dateRangeError}
						<p class="text-xs text-red-500 mt-1">{dateRangeError}</p>
					{/if}
				</div>
			</div>
			<div class="flex gap-2">
				<button
					class="px-4 py-2 rounded border border-primary-500 text-primary-500 hover:bg-primary-50 cursor-pointer font-medium"
					on:click={resetFilters}
				>
					重置筛选
				</button>
				<button
					class="px-4 py-2 rounded bg-primary-500 text-white hover:bg-primary-600 cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed"
					on:click={applyFilters}
					disabled={!!dateRangeError}
				>
					应用筛选
				</button>
			</div>
		</div>
	</div>

	<div class="bg-surface-100-900-token rounded-lg p-4 shadow-sm border border-surface-200-800-token">
		{#if filteredRecords.length === 0}
			<div class="text-center py-12 text-on-surface-variant-token">
				<p class="text-lg mb-2">暂无练习记录</p>
				<p class="text-sm">点击右上角「新增练习」按钮添加第一条记录</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-sm">
					<thead>
						<tr class="border-b border-surface-300-700-token">
							<th class="text-left p-3 font-semibold">记录编号</th>
							<th class="text-left p-3 font-semibold">学员姓名</th>
							<th class="text-left p-3 font-semibold">练习日期</th>
							<th class="text-left p-3 font-semibold">训练项目</th>
							<th class="text-left p-3 font-semibold">扣分次数</th>
							<th class="text-left p-3 font-semibold">主要失误</th>
							<th class="text-left p-3 font-semibold">补训</th>
							<th class="text-left p-3 font-semibold">操作</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredRecords as record}
							<tr class="border-b border-surface-200-800-token hover:bg-surface-50-900-token cursor-pointer" on:click={() => openDetail(record)}>
								<td class="p-3 font-mono">{record.recordNo}</td>
								<td class="p-3">{record.studentName}</td>
								<td class="p-3">{record.practiceDate}</td>
								<td class="p-3">{record.trainingItem}</td>
								<td class="p-3">
									<span class="inline-block px-2 py-1 rounded text-xs font-bold {getDeductBadgeClass(record.deductCount)}">
										{record.deductCount} 分
									</span>
								</td>
								<td class="p-3">{record.mainErrorType}</td>
								<td class="p-3">
									{#if record.needRetraining}
										<span class="inline-block px-2 py-1 rounded text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300">是</span>
									{:else}
										<span class="inline-block px-2 py-1 rounded text-xs font-bold bg-green-50 text-green-700 border border-green-200">否</span>
									{/if}
								</td>
								<td class="p-3" on:click|stopPropagation>
									<div class="flex gap-2">
										<button
											class="px-3 py-1 text-sm rounded bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 cursor-pointer"
											on:click={() => openDetail(record)}
										>
											详情
										</button>
										<button
											class="px-3 py-1 text-sm rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer"
											on:click={() => editRecord(record.id)}
										>
											编辑
										</button>
										<button
											class="px-3 py-1 text-sm rounded bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 cursor-pointer"
											on:click={() => confirmDelete(record.id)}
										>
											删除
										</button>
									</div>
								</td>
							</tr>
							<tr class="bg-surface-50-900-token cursor-pointer" on:click={() => openDetail(record)}>
								<td colspan="8" class="p-3">
									<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<p class="text-sm font-semibold mb-1">教练评语：</p>
											<p class="text-sm text-on-surface-variant-token">{record.coachComment || '-'}</p>
										</div>
										<div>
											<p class="text-sm font-semibold mb-1">改进建议：</p>
											<p class="text-sm text-on-surface-variant-token">{record.improvementSuggestion || '-'}</p>
										</div>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
				<p class="text-sm text-on-surface-variant-token mt-4">
					共 {filteredRecords.length} 条记录（总记录数：{records.length}）
				</p>
			</div>
		{/if}
	</div>
</div>

<RecordDetailModal
	bind:open={detailModalOpen}
	bind:record={selectedRecord}
	{suggestions}
/>
<svelte:window on:storage={loadRecords} />
