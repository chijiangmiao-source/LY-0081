<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		getRecords,
		addRecord,
		updateRecord,
		generateId,
		generateRecordNo,
		checkDuplicateRecord,
		getSuggestions
	} from '$lib/storage';
	import {
		TRAINING_ITEMS,
		ERROR_TYPES,
		MIN_DEDUCT,
		MAX_DEDUCT,
		AUTO_RETRAIN_THRESHOLD
	} from '$lib/constants';
	import type { PracticeRecord, TrainingItem, ErrorType, Suggestion } from '$lib/types';

	let editingId: string | null = null;
	let isEditing = false;

	let form = {
		recordNo: '',
		studentName: '',
		practiceDate: new Date().toISOString().split('T')[0],
		trainingItem: TRAINING_ITEMS[0] as TrainingItem,
		deductCount: 0,
		mainErrorType: ERROR_TYPES[0] as ErrorType,
		needRetraining: false,
		coachComment: '',
		improvementSuggestion: ''
	};

	let errors: Record<string, string> = {};
	let successMsg = '';
	let suggestions: Suggestion[] = [];

	onMount(() => {
		suggestions = getSuggestions();
		const id = $page.url.searchParams.get('id');
		if (id) {
			editingId = id;
			isEditing = true;
			const record = getRecords().find((r) => r.id === id);
			if (record) {
				form = {
					recordNo: record.recordNo,
					studentName: record.studentName,
					practiceDate: record.practiceDate,
					trainingItem: record.trainingItem,
					deductCount: record.deductCount,
					mainErrorType: record.mainErrorType,
					needRetraining: record.needRetraining,
					coachComment: record.coachComment,
					improvementSuggestion: record.improvementSuggestion
				};
			}
		} else {
			form.recordNo = generateRecordNo();
		}
	});

	$: {
		if (form.deductCount > AUTO_RETRAIN_THRESHOLD) {
			form.needRetraining = true;
		}
	}

	$: {
		const matched = suggestions.find((s) => s.errorType === form.mainErrorType);
		if (matched && !form.improvementSuggestion) {
			form.improvementSuggestion = matched.content;
		}
	}

	function validate(): boolean {
		errors = {};

		if (!form.studentName.trim()) {
			errors.studentName = '请输入学员姓名';
		}

		if (!form.practiceDate) {
			errors.practiceDate = '请选择练习日期';
		}

		if (!form.trainingItem) {
			errors.trainingItem = '请选择训练项目';
		}

		const deductNum = Number(form.deductCount);
		if (isNaN(deductNum) || !Number.isInteger(deductNum)) {
			errors.deductCount = '扣分次数必须是整数';
		} else if (deductNum < MIN_DEDUCT || deductNum > MAX_DEDUCT) {
			errors.deductCount = `扣分次数必须在 ${MIN_DEDUCT} 到 ${MAX_DEDUCT} 之间`;
		}

		if (deductNum > AUTO_RETRAIN_THRESHOLD && !form.needRetraining) {
			errors.needRetraining = `扣分次数大于 ${AUTO_RETRAIN_THRESHOLD} 时必须补训`;
		}

		if (!form.mainErrorType) {
			errors.mainErrorType = '请选择主要失误类型';
		}

		if (!form.coachComment.trim()) {
			errors.coachComment = '请输入教练评语';
		}

		if (!form.improvementSuggestion.trim()) {
			errors.improvementSuggestion = '请输入改进建议';
		}

		if (
			form.coachComment.trim() &&
			form.improvementSuggestion.trim() &&
			form.coachComment.trim() === form.improvementSuggestion.trim()
		) {
			errors.coachComment = '教练评语和改进建议不能完全相同';
			errors.improvementSuggestion = '教练评语和改进建议不能完全相同';
		}

		if (
			!errors.studentName &&
			!errors.practiceDate &&
			!errors.trainingItem
		) {
			if (checkDuplicateRecord(form.studentName.trim(), form.practiceDate, form.trainingItem, editingId || undefined)) {
				errors.duplicate = '该学员当天该项目已有记录，请选择其他日期、学员或训练项目';
			}
		}

		return Object.keys(errors).length === 0;
	}

	function handleSubmit() {
		successMsg = '';
		if (!validate()) return;

		const now = Date.now();
		const record: PracticeRecord = {
			id: editingId || generateId(),
			recordNo: form.recordNo || generateRecordNo(),
			studentName: form.studentName.trim(),
			practiceDate: form.practiceDate,
			trainingItem: form.trainingItem,
			deductCount: Number(form.deductCount),
			mainErrorType: form.mainErrorType,
			needRetraining: form.needRetraining,
			coachComment: form.coachComment.trim(),
			improvementSuggestion: form.improvementSuggestion.trim(),
			createdAt: isEditing ? 0 : now,
			updatedAt: now
		};

		if (isEditing) {
			const oldRecord = getRecords().find((r) => r.id === editingId);
			if (oldRecord) {
				record.createdAt = oldRecord.createdAt;
			}
			updateRecord(record);
			successMsg = '记录更新成功！';
		} else {
			addRecord(record);
			successMsg = '记录创建成功！';
			resetForm();
		}
	}

	function resetForm() {
		form = {
			recordNo: generateRecordNo(),
			studentName: '',
			practiceDate: new Date().toISOString().split('T')[0],
			trainingItem: TRAINING_ITEMS[0] as TrainingItem,
			deductCount: 0,
			mainErrorType: ERROR_TYPES[0] as ErrorType,
			needRetraining: false,
			coachComment: '',
			improvementSuggestion: ''
		};
		errors = {};
	}
</script>

<svelte:head>
	<title>{isEditing ? '编辑练习' : '新增练习'} - 驾校科目二复盘系统</title>
</svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-bold">{isEditing ? '编辑练习记录' : '新增练习记录'}</h2>
		<button
			class="px-4 py-2 rounded border border-surface-300-700-token hover:bg-surface-200-800-token cursor-pointer font-medium"
			on:click={() => goto('/')}
		>
			返回列表
		</button>
	</div>

	{#if successMsg}
		<div class="bg-green-100 border border-green-300 text-green-800 rounded-lg p-4 mb-4">
			<div class="flex items-center justify-between w-full">
				<span>{successMsg}</span>
				<button
					class="px-3 py-1 text-sm rounded bg-transparent border border-green-600 text-green-700 hover:bg-green-200 cursor-pointer"
					on:click={() => goto('/')}
				>
					查看列表
				</button>
			</div>
		</div>
	{/if}

	{#if errors.duplicate}
		<div class="bg-red-100 border border-red-300 text-red-800 rounded-lg p-4 mb-4">
			{errors.duplicate}
		</div>
	{/if}

	<div class="bg-surface-100-900-token rounded-lg p-6 shadow-sm border border-surface-200-800-token">
		<form on:submit|preventDefault={handleSubmit} class="space-y-6">
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				<div>
					<label class="block text-sm font-medium mb-1">练习编号</label>
					<input
						type="text"
						bind:value={form.recordNo}
						readonly
						placeholder="系统自动生成"
						class="w-full px-3 py-2 rounded border border-surface-300-700-token bg-surface-50-900-token focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-not-allowed opacity-75"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium mb-1">学员姓名 <span class="text-red-500">*</span></label>
					<input
						type="text"
						bind:value={form.studentName}
						placeholder="请输入学员姓名"
						class="w-full px-3 py-2 rounded border {errors.studentName ? 'border-red-500' : 'border-surface-300-700-token'} bg-surface-50-900-token focus:outline-none focus:ring-2 focus:ring-primary-500"
					/>
					{#if errors.studentName}
						<p class="text-xs text-red-500 mt-1">{errors.studentName}</p>
					{/if}
				</div>
				<div>
					<label class="block text-sm font-medium mb-1">练习日期 <span class="text-red-500">*</span></label>
					<input
						type="date"
						bind:value={form.practiceDate}
						class="w-full px-3 py-2 rounded border {errors.practiceDate ? 'border-red-500' : 'border-surface-300-700-token'} bg-surface-50-900-token focus:outline-none focus:ring-2 focus:ring-primary-500"
					/>
					{#if errors.practiceDate}
						<p class="text-xs text-red-500 mt-1">{errors.practiceDate}</p>
					{/if}
				</div>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				<div>
					<label class="block text-sm font-medium mb-1">训练项目 <span class="text-red-500">*</span></label>
					<select
						bind:value={form.trainingItem}
						class="w-full px-3 py-2 rounded border {errors.trainingItem ? 'border-red-500' : 'border-surface-300-700-token'} bg-surface-50-900-token focus:outline-none focus:ring-2 focus:ring-primary-500"
					>
						{#each TRAINING_ITEMS as item}
							<option value={item}>{item}</option>
						{/each}
					</select>
					{#if errors.trainingItem}
						<p class="text-xs text-red-500 mt-1">{errors.trainingItem}</p>
					{/if}
				</div>
				<div>
					<label class="block text-sm font-medium mb-1">扣分次数 <span class="text-red-500">*</span></label>
					<input
						type="number"
						bind:value={form.deductCount}
						min={MIN_DEDUCT}
						max={MAX_DEDUCT}
						placeholder={`${MIN_DEDUCT} - ${MAX_DEDUCT}`}
						class="w-full px-3 py-2 rounded border {errors.deductCount ? 'border-red-500' : 'border-surface-300-700-token'} bg-surface-50-900-token focus:outline-none focus:ring-2 focus:ring-primary-500"
					/>
					{#if errors.deductCount}
						<p class="text-xs text-red-500 mt-1">{errors.deductCount}</p>
					{:else}
						<p class="text-xs text-on-surface-variant-token mt-1">
							取值范围：{MIN_DEDUCT} - {MAX_DEDUCT}，超过 {AUTO_RETRAIN_THRESHOLD} 自动触发补训
						</p>
					{/if}
				</div>
				<div>
					<label class="block text-sm font-medium mb-1">主要失误类型 <span class="text-red-500">*</span></label>
					<select
						bind:value={form.mainErrorType}
						class="w-full px-3 py-2 rounded border {errors.mainErrorType ? 'border-red-500' : 'border-surface-300-700-token'} bg-surface-50-900-token focus:outline-none focus:ring-2 focus:ring-primary-500"
					>
						{#each ERROR_TYPES as type}
							<option value={type}>{type}</option>
						{/each}
					</select>
					{#if errors.mainErrorType}
						<p class="text-xs text-red-500 mt-1">{errors.mainErrorType}</p>
					{/if}
				</div>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div class="flex items-center">
					<label class="flex items-center cursor-pointer">
						<input
							type="checkbox"
							bind:checked={form.needRetraining}
							disabled={form.deductCount > AUTO_RETRAIN_THRESHOLD}
							class="w-4 h-4 mr-2 cursor-pointer disabled:cursor-not-allowed"
						/>
						<span>是否需要补训</span>
					</label>
					{#if form.deductCount > AUTO_RETRAIN_THRESHOLD}
						<span class="inline-block ml-2 px-2 py-1 rounded text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300">
							自动补训
						</span>
					{/if}
				</div>
				{#if errors.needRetraining}
					<p class="text-xs text-red-500">{errors.needRetraining}</p>
				{/if}
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label class="block text-sm font-medium mb-1">教练评语 <span class="text-red-500">*</span></label>
					<textarea
						bind:value={form.coachComment}
						placeholder="请输入教练评语..."
						rows={4}
						class="w-full px-3 py-2 rounded border {errors.coachComment ? 'border-red-500' : 'border-surface-300-700-token'} bg-surface-50-900-token focus:outline-none focus:ring-2 focus:ring-primary-500"
					></textarea>
					{#if errors.coachComment}
						<p class="text-xs text-red-500 mt-1">{errors.coachComment}</p>
					{/if}
				</div>
				<div>
					<label class="block text-sm font-medium mb-1">改进建议 <span class="text-red-500">*</span></label>
					<textarea
						bind:value={form.improvementSuggestion}
						placeholder="请输入改进建议，选择失误类型后会自动填入建议..."
						rows={4}
						class="w-full px-3 py-2 rounded border {errors.improvementSuggestion ? 'border-red-500' : 'border-surface-300-700-token'} bg-surface-50-900-token focus:outline-none focus:ring-2 focus:ring-primary-500"
					></textarea>
					{#if errors.improvementSuggestion}
						<p class="text-xs text-red-500 mt-1">{errors.improvementSuggestion}</p>
					{/if}
				</div>
			</div>

			<div class="flex gap-3 pt-4">
				<button
					type="submit"
					class="px-6 py-2 rounded bg-primary-500 text-white hover:bg-primary-600 cursor-pointer font-medium"
				>
					{isEditing ? '保存修改' : '创建记录'}
				</button>
				<button
					type="button"
					class="px-6 py-2 rounded border border-surface-300-700-token hover:bg-surface-200-800-token cursor-pointer font-medium"
					on:click={resetForm}
				>
					重置表单
				</button>
			</div>
		</form>
	</div>
</div>
