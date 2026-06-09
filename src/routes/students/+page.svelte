<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getStudentArchives, getSuggestions, getRecords } from '$lib/storage';
	import { AUTO_RETRAIN_THRESHOLD } from '$lib/constants';
	import type { StudentArchive, Suggestion } from '$lib/types';
	import StudentArchiveModal from '$lib/components/StudentArchiveModal.svelte';

	let archives: StudentArchive[] = [];
	let filteredArchives: StudentArchive[] = [];
	let suggestions: Suggestion[] = [];

	let searchText = '';
	let startDate = '';
	let endDate = '';
	let dateRangeError = '';
	let sortBy = 'totalPractices' as 'totalPractices' | 'avgDeduct' | 'retrainCount';

	let modalOpen = false;
	let selectedArchive: StudentArchive | null = null;

	onMount(() => {
		loadData();
		const studentParam = $page.url.searchParams.get('student');
		if (studentParam) {
			searchText = studentParam;
			setTimeout(() => {
				const target = filteredArchives.find((a) => a.studentName === studentParam);
				if (target) {
					openArchiveDetail(target);
				}
			}, 100);
		}
	});

	function loadData() {
		archives = getStudentArchives(startDate, endDate);
		suggestions = getSuggestions();
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
		let result = getStudentArchives(startDate, endDate);

		if (searchText.trim()) {
			const keyword = searchText.trim().toLowerCase();
			result = result.filter((a) => a.studentName.toLowerCase().includes(keyword));
		}

		result.sort((a, b) => {
			if (sortBy === 'totalPractices') return b.totalPractices - a.totalPractices;
			if (sortBy === 'avgDeduct') return b.avgDeduct - a.avgDeduct;
			if (sortBy === 'retrainCount') return b.retrainCount - a.retrainCount;
			return 0;
		});

		filteredArchives = result;
	}

	function resetFilters() {
		searchText = '';
		startDate = '';
		endDate = '';
		sortBy = 'totalPractices';
	}

	function openArchiveDetail(archive: StudentArchive) {
		selectedArchive = archive;
		modalOpen = true;
	}

	function refreshArchives() {
		const currentName = selectedArchive?.studentName;
		loadData();
		if (currentName) {
			const updated = filteredArchives.find((a) => a.studentName === currentName);
			if (updated) {
				selectedArchive = updated;
			}
		}
	}

	function getDeductBadgeClass(count: number): string {
		if (count === 0) return 'bg-green-100 text-green-800 border border-green-300';
		if (count <= 5) return 'bg-green-50 text-green-700 border border-green-200';
		if (count <= AUTO_RETRAIN_THRESHOLD) return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
		return 'bg-red-100 text-red-800 border border-red-300';
	}

	function getDeductTextClass(count: number): string {
		if (count === 0) return 'text-green-600';
		if (count <= 5) return 'text-green-600';
		if (count <= AUTO_RETRAIN_THRESHOLD) return 'text-yellow-600';
		return 'text-red-600';
	}

	function getTopErrors(archive: StudentArchive, limit = 3): string[] {
		return archive.errorTypeStats.slice(0, limit).map((e) => e.type);
	}
</script>

<svelte:head>
	<title>学员成长档案 - 驾校科目二复盘系统</title>
</svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-bold text-gray-900">学员成长档案</h2>
	</div>

	<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
		<div class="space-y-4">
			<h3 class="font-semibold text-gray-900">筛选条件</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<div>
					<label class="block text-sm font-medium mb-1 text-gray-700">学员姓名搜索</label>
					<input
						type="text"
						bind:value={searchText}
						placeholder="输入学员姓名..."
						class="w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
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
				<div>
					<label class="block text-sm font-medium mb-1 text-gray-700">排序方式</label>
					<select
						bind:value={sortBy}
						class="w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="totalPractices">按练习次数</option>
						<option value="avgDeduct">按平均扣分</option>
						<option value="retrainCount">按补训次数</option>
					</select>
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

	{#if filteredArchives.length === 0}
		<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
			<div class="text-center py-12 text-gray-500">
				<p class="text-lg mb-2">暂无学员档案数据</p>
				<p class="text-sm">请先在练习记录中添加学员练习数据</p>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each filteredArchives as archive}
				<div
					class="bg-white rounded-lg p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
					on:click={() => openArchiveDetail(archive)}
				>
					<div class="flex items-start justify-between mb-4">
						<div>
							<h3 class="text-lg font-bold text-gray-900">{archive.studentName}</h3>
							<p class="text-xs text-gray-500 mt-1">
								{archive.firstPracticeDate} ~ {archive.lastPracticeDate}
							</p>
						</div>
						<span class="inline-block px-2 py-1 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
							{archive.totalPractices} 次练习
						</span>
					</div>

					<div class="grid grid-cols-3 gap-3 mb-4">
						<div class="bg-gray-50 rounded p-2 text-center">
							<p class="text-xs text-gray-500 mb-1">补训次数</p>
							<p class="text-lg font-bold {archive.retrainCount > 0 ? 'text-orange-600' : 'text-gray-600'}">
								{archive.retrainCount}
							</p>
						</div>
						<div class="bg-gray-50 rounded p-2 text-center">
							<p class="text-xs text-gray-500 mb-1">总扣分</p>
							<p class="text-lg font-bold {getDeductTextClass(archive.avgDeduct)}">
								{archive.totalDeduct}
							</p>
						</div>
						<div class="bg-gray-50 rounded p-2 text-center">
							<p class="text-xs text-gray-500 mb-1">平均扣分</p>
							<p class="text-lg font-bold {getDeductTextClass(archive.avgDeduct)}">
								{archive.avgDeduct}
							</p>
						</div>
					</div>

					{#if archive.errorTypeStats.length > 0}
						<div class="mb-3">
							<p class="text-xs font-medium text-gray-600 mb-2">常见失误类型：</p>
							<div class="flex flex-wrap gap-1">
								{#each getTopErrors(archive) as errorType}
									<span class="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">
										{errorType}
									</span>
								{/each}
								{#if archive.errorTypeStats.length > 3}
									<span class="inline-block px-2 py-0.5 rounded text-xs text-gray-500">
										+{archive.errorTypeStats.length - 3} 种
									</span>
								{/if}
							</div>
						</div>
					{/if}

					{#if archive.itemStats.length > 0}
						<div class="mb-3">
							<p class="text-xs font-medium text-gray-600 mb-2">训练项目：</p>
							<div class="flex flex-wrap gap-1">
								{#each archive.itemStats.slice(0, 4) as item}
									<span class="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
										{item.item}
									</span>
								{/each}
								{#if archive.itemStats.length > 4}
									<span class="inline-block px-2 py-0.5 rounded text-xs text-gray-500">
										+{archive.itemStats.length - 4} 项
									</span>
								{/if}
							</div>
						</div>
					{/if}

					<div class="pt-3 border-t border-gray-100">
						<button
							class="w-full py-2 text-sm rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer font-medium"
						>
							查看完整档案 →
						</button>
					</div>
				</div>
			{/each}
		</div>

		<p class="text-sm text-gray-500 mt-2">
			共 {filteredArchives.length} 位学员
		</p>
	{/if}
</div>

<StudentArchiveModal
	bind:open={modalOpen}
	bind:archive={selectedArchive}
	{suggestions}
/>
<svelte:window on:storage={refreshArchives} />
