import { browser } from '$app/environment';
import { STORAGE_KEYS, WARNING_THRESHOLDS } from './constants';
import type {
	PracticeRecord,
	Suggestion,
	StudentArchive,
	SuggestionUsage,
	ErrorType,
	TrainingItem,
	WarningRecord,
	WarningLevel,
	WarningScope,
	WarningReason,
	WarningTrendPoint,
	RetrainingSuggestion
} from './types';

export function getRecords(): PracticeRecord[] {
	if (!browser) return [];
	try {
		const data = localStorage.getItem(STORAGE_KEYS.RECORDS);
		return data ? (JSON.parse(data) as PracticeRecord[]) : [];
	} catch {
		return [];
	}
}

export function saveRecords(records: PracticeRecord[]): void {
	if (!browser) return;
	localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
}

export function addRecord(record: PracticeRecord): PracticeRecord[] {
	const records = getRecords();
	records.push(record);
	saveRecords(records);
	return records;
}

export function updateRecord(updated: PracticeRecord): PracticeRecord[] {
	const records = getRecords();
	const index = records.findIndex((r) => r.id === updated.id);
	if (index !== -1) {
		records[index] = { ...updated, updatedAt: Date.now() };
		saveRecords(records);
	}
	return records;
}

export function deleteRecord(id: string): PracticeRecord[] {
	const records = getRecords().filter((r) => r.id !== id);
	saveRecords(records);
	return records;
}

export function getSuggestions(): Suggestion[] {
	if (!browser) return [];
	try {
		const data = localStorage.getItem(STORAGE_KEYS.SUGGESTIONS);
		return data ? (JSON.parse(data) as Suggestion[]) : [];
	} catch {
		return [];
	}
}

export function saveSuggestions(suggestions: Suggestion[]): void {
	if (!browser) return;
	localStorage.setItem(STORAGE_KEYS.SUGGESTIONS, JSON.stringify(suggestions));
}

export function addSuggestion(suggestion: Suggestion): Suggestion[] {
	const suggestions = getSuggestions();
	suggestions.push(suggestion);
	saveSuggestions(suggestions);
	return suggestions;
}

export function updateSuggestion(updated: Suggestion): Suggestion[] {
	const suggestions = getSuggestions();
	const index = suggestions.findIndex((s) => s.id === updated.id);
	if (index !== -1) {
		suggestions[index] = updated;
		saveSuggestions(suggestions);
	}
	return suggestions;
}

export function deleteSuggestion(id: string): Suggestion[] {
	const suggestions = getSuggestions().filter((s) => s.id !== id);
	saveSuggestions(suggestions);
	return suggestions;
}

export function checkDuplicateRecord(
	studentName: string,
	practiceDate: string,
	trainingItem: string,
	excludeId?: string
): boolean {
	const records = getRecords();
	return records.some(
		(r) =>
			r.studentName === studentName &&
			r.practiceDate === practiceDate &&
			r.trainingItem === trainingItem &&
			r.id !== excludeId
	);
}

export function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function generateRecordNo(): string {
	const now = new Date();
	const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
	const records = getRecords();
	const todayCount = records.filter((r) => r.recordNo.startsWith(dateStr)).length + 1;
	return `${dateStr}${String(todayCount).padStart(3, '0')}`;
}

export function getStudentArchives(
	startDate?: string,
	endDate?: string
): StudentArchive[] {
	const records = getRecords();
	const filtered = records.filter((r) => {
		const matchStart = !startDate || r.practiceDate >= startDate;
		const matchEnd = !endDate || r.practiceDate <= endDate;
		return matchStart && matchEnd;
	});

	const studentNames = [...new Set(filtered.map((r) => r.studentName))];

	return studentNames.map((name) => {
		const studentRecords = filtered
			.filter((r) => r.studentName === name)
			.sort((a, b) => (a.practiceDate > b.practiceDate ? 1 : -1));

		const totalDeduct = studentRecords.reduce((sum, r) => sum + r.deductCount, 0);
		const retrainCount = studentRecords.filter((r) => r.needRetraining).length;
		const avgDeduct = studentRecords.length > 0 ? Number((totalDeduct / studentRecords.length).toFixed(1)) : 0;

		const errorTypeMap = new Map<ErrorType, number>();
		studentRecords.forEach((r) => {
			errorTypeMap.set(r.mainErrorType, (errorTypeMap.get(r.mainErrorType) || 0) + 1);
		});
		const errorTypeStats = [...errorTypeMap.entries()]
			.map(([type, count]) => ({ type, count }))
			.sort((a, b) => b.count - a.count);

		const itemMap = new Map<TrainingItem, { count: number; totalDeduct: number; retrainCount: number }>();
		studentRecords.forEach((r) => {
			const existing = itemMap.get(r.trainingItem) || { count: 0, totalDeduct: 0, retrainCount: 0 };
			itemMap.set(r.trainingItem, {
				count: existing.count + 1,
				totalDeduct: existing.totalDeduct + r.deductCount,
				retrainCount: existing.retrainCount + (r.needRetraining ? 1 : 0)
			});
		});
		const itemStats = [...itemMap.entries()].map(([item, data]) => ({
			item,
			count: data.count,
			avgDeduct: data.count > 0 ? Number((data.totalDeduct / data.count).toFixed(1)) : 0,
			retrainCount: data.retrainCount
		}));

		const dates = [...new Set(studentRecords.map((r) => r.practiceDate))].sort();
		const trendData = dates.map((date) => {
			const dayRecords = studentRecords.filter((r) => r.practiceDate === date);
			const sum = dayRecords.reduce((s, r) => s + r.deductCount, 0);
			return {
				date,
				avgDeduct: dayRecords.length > 0 ? Number((sum / dayRecords.length).toFixed(1)) : 0
			};
		});

		const suggestionMap = new Map<string, number>();
		studentRecords.forEach((r) => {
			if (r.improvementSuggestion) {
				const lines = r.improvementSuggestion
					.split(/\n|•/)
					.map((s) => s.trim())
					.filter((s) => s.length > 0);
				lines.forEach((line) => {
					suggestionMap.set(line, (suggestionMap.get(line) || 0) + 1);
				});
			}
		});
		const commonSuggestions = [...suggestionMap.entries()]
			.map(([content, count]) => ({ content, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		return {
			studentName: name,
			totalPractices: studentRecords.length,
			retrainCount,
			totalDeduct,
			avgDeduct,
			errorTypeStats,
			itemStats,
			records: studentRecords,
			firstPracticeDate: studentRecords.length > 0 ? studentRecords[0].practiceDate : '-',
			lastPracticeDate: studentRecords.length > 0 ? studentRecords[studentRecords.length - 1].practiceDate : '-',
			trendData,
			commonSuggestions
		};
	}).sort((a, b) => b.totalPractices - a.totalPractices);
}

export function getSuggestionUsage(): SuggestionUsage[] {
	const records = getRecords();
	const suggestions = getSuggestions();

	return suggestions.map((s) => {
		const usageByStudentMap = new Map<string, { count: number; recordIds: string[] }>();

		records.forEach((r) => {
			if (r.improvementSuggestion && r.improvementSuggestion.includes(s.content)) {
				const existing = usageByStudentMap.get(r.studentName) || { count: 0, recordIds: [] };
				usageByStudentMap.set(r.studentName, {
					count: existing.count + 1,
					recordIds: [...existing.recordIds, r.id]
				});
			}
		});

		const usageByStudent = [...usageByStudentMap.entries()]
			.map(([studentName, data]) => ({
				studentName,
				count: data.count,
				recordIds: data.recordIds
			}))
			.sort((a, b) => b.count - a.count);

		const totalUsage = usageByStudent.reduce((sum, u) => sum + u.count, 0);

		return {
			suggestionId: s.id,
			suggestionContent: s.content,
			errorType: s.errorType,
			usageByStudent,
			totalUsage
		};
	}).sort((a, b) => b.totalUsage - a.totalUsage);
}

export function getWarnings(): WarningRecord[] {
	if (!browser) return [];
	try {
		const data = localStorage.getItem(STORAGE_KEYS.WARNINGS);
		return data ? (JSON.parse(data) as WarningRecord[]) : [];
	} catch {
		return [];
	}
}

export function saveWarnings(warnings: WarningRecord[]): void {
	if (!browser) return;
	localStorage.setItem(STORAGE_KEYS.WARNINGS, JSON.stringify(warnings));
}

function scoreToLevel(score: number): WarningLevel {
	if (score >= WARNING_THRESHOLDS.SCORE_STABLE_MIN) return 'stable';
	if (score >= WARNING_THRESHOLDS.SCORE_ATTENTION_MIN) return 'attention';
	return 'alert';
}

function computeTrendDirection(
	records: PracticeRecord[]
): 'improving' | 'stable' | 'declining' | 'insufficient' {
	if (records.length < WARNING_THRESHOLDS.PRACTICE_MIN_COUNT) return 'insufficient';
	const sorted = [...records].sort((a, b) => (a.practiceDate > b.practiceDate ? 1 : -1));
	const mid = Math.floor(sorted.length / 2);
	const earlier = sorted.slice(0, mid);
	const later = sorted.slice(mid);
	const earlierAvg = earlier.reduce((s, r) => s + r.deductCount, 0) / earlier.length;
	const laterAvg = later.reduce((s, r) => s + r.deductCount, 0) / later.length;
	const delta = laterAvg - earlierAvg;
	if (delta < -WARNING_THRESHOLDS.TREND_DECLINE_DELTA) return 'improving';
	if (delta > WARNING_THRESHOLDS.TREND_DECLINE_DELTA) return 'declining';
	return 'stable';
}

function buildTopErrorTypes(records: PracticeRecord[]): { type: ErrorType; count: number; rate: number }[] {
	const total = records.length;
	if (total === 0) return [];
	const map = new Map<ErrorType, number>();
	records.forEach((r) => {
		map.set(r.mainErrorType, (map.get(r.mainErrorType) || 0) + 1);
	});
	return [...map.entries()]
		.map(([type, count]) => ({ type, count, rate: Number((count / total).toFixed(2)) }))
		.sort((a, b) => b.count - a.count);
}

function generateReasons(
	avgDeduct: number,
	retrainRate: number,
	practiceCount: number,
	trendDirection: string,
	topErrorTypes: { type: ErrorType; count: number; rate: number }[]
): WarningReason[] {
	const reasons: WarningReason[] = [];

	if (avgDeduct >= WARNING_THRESHOLDS.AVG_DEDUCT_ALERT) {
		reasons.push({
			code: 'HIGH_DEDUCT',
			description: `平均扣分 ${avgDeduct} 分，超过预警阈值（${WARNING_THRESHOLDS.AVG_DEDUCT_ALERT}分）`,
			weight: 30
		});
	} else if (avgDeduct >= WARNING_THRESHOLDS.AVG_DEDUCT_ATTENTION) {
		reasons.push({
			code: 'MID_DEDUCT',
			description: `平均扣分 ${avgDeduct} 分，偏高需关注`,
			weight: 15
		});
	}

	if (retrainRate >= WARNING_THRESHOLDS.RETRAIN_RATE_ALERT) {
		reasons.push({
			code: 'HIGH_RETRAIN',
			description: `补训率 ${(retrainRate * 100).toFixed(0)}%，超过预警阈值`,
			weight: 25
		});
	} else if (retrainRate >= WARNING_THRESHOLDS.RETRAIN_RATE_ATTENTION) {
		reasons.push({
			code: 'MID_RETRAIN',
			description: `补训率 ${(retrainRate * 100).toFixed(0)}%，偏高需关注`,
			weight: 12
		});
	}

	if (trendDirection === 'declining') {
		reasons.push({
			code: 'DECLINING_TREND',
			description: '近期表现呈下降趋势，需警惕',
			weight: 20
		});
	} else if (trendDirection === 'improving') {
		reasons.push({
			code: 'IMPROVING_TREND',
			description: '近期表现呈上升趋势，状态好转',
			weight: -15
		});
	}

	if (topErrorTypes.length > 0 && topErrorTypes[0].rate >= WARNING_THRESHOLDS.ERROR_TYPE_DOMINANCE_RATE) {
		const top = topErrorTypes[0];
		reasons.push({
			code: 'DOMINANT_ERROR',
			description: `失误类型集中：「${top.type}」占比 ${(top.rate * 100).toFixed(0)}%`,
			weight: 15
		});
	}

	if (practiceCount < WARNING_THRESHOLDS.PRACTICE_MIN_COUNT && practiceCount > 0) {
		reasons.push({
			code: 'INSUFFICIENT_DATA',
			description: `样本较少（${practiceCount}次），评估结果仅供参考`,
			weight: 5
		});
	}

	return reasons.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
}

function computeScore(avgDeduct: number, retrainRate: number, trendDirection: string): number {
	let score = 100;

	if (avgDeduct >= WARNING_THRESHOLDS.AVG_DEDUCT_ALERT) {
		score -= 35;
	} else if (avgDeduct >= WARNING_THRESHOLDS.AVG_DEDUCT_ATTENTION) {
		score -= 18;
	} else if (avgDeduct >= 3) {
		score -= 8;
	}

	if (retrainRate >= WARNING_THRESHOLDS.RETRAIN_RATE_ALERT) {
		score -= 30;
	} else if (retrainRate >= WARNING_THRESHOLDS.RETRAIN_RATE_ATTENTION) {
		score -= 15;
	} else if (retrainRate > 0) {
		score -= 5;
	}

	if (trendDirection === 'declining') {
		score -= 20;
	} else if (trendDirection === 'improving') {
		score += 10;
	}

	return Math.max(0, Math.min(100, Math.round(score)));
}

function generateSuggestions(
	topErrorTypes: { type: ErrorType; count: number; rate: number }[],
	level: WarningLevel,
	trendDirection: string
): RetrainingSuggestion[] {
	const suggestions: RetrainingSuggestion[] = [];
	const suggestionsPool = getSuggestions();

	if (level === 'alert') {
		suggestions.push({
			priority: 'high',
			content: '建议立即安排专项补训，重点加强基础动作规范训练'
		});
	} else if (level === 'attention') {
		suggestions.push({
			priority: 'medium',
			content: '建议增加针对性练习频率，关注薄弱环节改进'
		});
	}

	if (trendDirection === 'declining') {
		suggestions.push({
			priority: 'high',
			content: '近期状态下滑，建议调整训练节奏，避免疲劳练习'
		});
	}

	topErrorTypes.slice(0, 2).forEach((err) => {
		const matched = suggestionsPool.filter((s) => s.errorType === err.type);
		if (matched.length > 0) {
			suggestions.push({
				priority: err.rate >= WARNING_THRESHOLDS.ERROR_TYPE_DOMINANCE_RATE ? 'high' : 'medium',
				content: `针对「${err.type}」：${matched[0].content}`,
				errorType: err.type
			});
		} else {
			suggestions.push({
				priority: err.rate >= WARNING_THRESHOLDS.ERROR_TYPE_DOMINANCE_RATE ? 'high' : 'medium',
				content: `加强「${err.type}」相关技术要点的反复练习`,
				errorType: err.type
			});
		}
	});

	return suggestions.sort((a, b) => {
		const order = { high: 0, medium: 1, low: 2 };
		return order[a.priority] - order[b.priority];
	});
}

function buildWeeklyTrend(records: PracticeRecord[]): WarningTrendPoint[] {
	if (records.length === 0) return [];
	const sorted = [...records].sort((a, b) => (a.practiceDate > b.practiceDate ? 1 : -1));
	const weekMap = new Map<string, PracticeRecord[]>();

	sorted.forEach((r) => {
		const d = new Date(r.practiceDate);
		const weekStart = new Date(d);
		const day = d.getDay() || 7;
		weekStart.setDate(d.getDate() - day + 1);
		const weekKey = weekStart.toISOString().slice(0, 10);
		if (!weekMap.has(weekKey)) weekMap.set(weekKey, []);
		weekMap.get(weekKey)!.push(r);
	});

	const result: WarningTrendPoint[] = [];
	[...weekMap.entries()]
		.sort((a, b) => (a[0] > b[0] ? 1 : -1))
		.forEach(([week, weekRecords]) => {
			const avgDed = weekRecords.reduce((s, r) => s + r.deductCount, 0) / weekRecords.length;
			const retrainR = weekRecords.filter((r) => r.needRetraining).length / weekRecords.length;
			const trend = computeTrendDirection(weekRecords);
			const score = computeScore(avgDed, retrainR, trend);
			result.push({
				date: week,
				level: scoreToLevel(score),
				score
			});
		});

	return result;
}

function evaluateScope(
	scope: WarningScope,
	studentName: string,
	records: PracticeRecord[],
	periodStart: string,
	periodEnd: string,
	trainingItem?: TrainingItem
): WarningRecord | null {
	if (records.length === 0) return null;

	const totalDeduct = records.reduce((s, r) => s + r.deductCount, 0);
	const avgDeduct = Number((totalDeduct / records.length).toFixed(1));
	const retrainCount = records.filter((r) => r.needRetraining).length;
	const retrainRate = Number((retrainCount / records.length).toFixed(2));
	const trendDirection = computeTrendDirection(records);
	const topErrorTypes = buildTopErrorTypes(records);
	const reasons = generateReasons(avgDeduct, retrainRate, records.length, trendDirection, topErrorTypes);
	const score = computeScore(avgDeduct, retrainRate, trendDirection);
	const level = scoreToLevel(score);
	const suggestions = generateSuggestions(topErrorTypes, level, trendDirection);
	const trendHistory = buildWeeklyTrend(records);

	return {
		id: generateId(),
		scope,
		studentName,
		trainingItem,
		level,
		score,
		periodStart,
		periodEnd,
		practiceCount: records.length,
		avgDeduct,
		retrainRate,
		trendDirection,
		topErrorTypes,
		reasons,
		trendHistory,
		suggestions,
		recordIds: records.map((r) => r.id),
		createdAt: Date.now(),
		acknowledged: false
	};
}

export function generateWarnings(
	startDate?: string,
	endDate?: string
): WarningRecord[] {
	const allRecords = getRecords();
	const filtered = allRecords.filter((r) => {
		const matchStart = !startDate || r.practiceDate >= startDate;
		const matchEnd = !endDate || r.practiceDate <= endDate;
		return matchStart && matchEnd;
	});

	if (filtered.length === 0) return [];

	const periodStart = startDate || filtered.reduce((min, r) => (r.practiceDate < min ? r.practiceDate : min), filtered[0].practiceDate);
	const periodEnd = endDate || filtered.reduce((max, r) => (r.practiceDate > max ? r.practiceDate : max), filtered[0].practiceDate);

	const warnings: WarningRecord[] = [];

	const studentNames = [...new Set(filtered.map((r) => r.studentName))];
	studentNames.forEach((name) => {
		const studentRecords = filtered.filter((r) => r.studentName === name);
		const studentWarning = evaluateScope('student', name, studentRecords, periodStart, periodEnd);
		if (studentWarning) warnings.push(studentWarning);

		const items = [...new Set(studentRecords.map((r) => r.trainingItem))];
		items.forEach((item) => {
			const itemRecords = studentRecords.filter((r) => r.trainingItem === item);
			const itemWarning = evaluateScope('item', name, itemRecords, periodStart, periodEnd, item);
			if (itemWarning) warnings.push(itemWarning);
		});
	});

	const existing = getWarnings();
	const toKeep = existing.filter((w) => {
		const inRange = (!startDate || w.periodStart >= startDate) && (!endDate || w.periodEnd <= endDate);
		return !inRange;
	});

	const finalWarnings = [...toKeep, ...warnings];
	saveWarnings(finalWarnings);
	return warnings;
}

export function getWarningsFiltered(params: {
	startDate?: string;
	endDate?: string;
	studentName?: string;
	level?: WarningLevel;
	scope?: WarningScope;
	trainingItem?: TrainingItem;
}): WarningRecord[] {
	const warnings = getWarnings();
	return warnings.filter((w) => {
		if (params.startDate && w.periodEnd < params.startDate) return false;
		if (params.endDate && w.periodStart > params.endDate) return false;
		if (params.studentName && w.studentName !== params.studentName) return false;
		if (params.level && w.level !== params.level) return false;
		if (params.scope && w.scope !== params.scope) return false;
		if (params.trainingItem && w.trainingItem !== params.trainingItem) return false;
		return true;
	}).sort((a, b) => {
		const levelOrder = { alert: 0, attention: 1, stable: 2 };
		if (levelOrder[a.level] !== levelOrder[b.level]) return levelOrder[a.level] - levelOrder[b.level];
		return b.createdAt - a.createdAt;
	});
}

export function getWarningsByStudent(studentName: string): WarningRecord[] {
	return getWarningsFiltered({ studentName, scope: 'student' });
}

export function getWarningsBySuggestion(suggestionId: string): { warning: WarningRecord; matchCount: number }[] {
	const usage = getSuggestionUsage();
	const targetUsage = usage.find((u) => u.suggestionId === suggestionId);
	if (!targetUsage) return [];

	const warnings = getWarningsFiltered({ level: 'alert' }).concat(
		getWarningsFiltered({ level: 'attention' })
	);

	const result: { warning: WarningRecord; matchCount: number }[] = [];
	targetUsage.usageByStudent.forEach((usageItem) => {
		const studentWarnings = warnings.filter((w) => w.studentName === usageItem.studentName);
		studentWarnings.forEach((w) => {
			const matchedIds = usageItem.recordIds.filter((id) => w.recordIds.includes(id));
			if (matchedIds.length > 0) {
				result.push({ warning: w, matchCount: matchedIds.length });
			}
		});
	});

	return result.sort((a, b) => b.matchCount - a.matchCount);
}

export function acknowledgeWarning(id: string): void {
	const warnings = getWarnings();
	const idx = warnings.findIndex((w) => w.id === id);
	if (idx !== -1) {
		warnings[idx] = {
			...warnings[idx],
			acknowledged: true,
			acknowledgedAt: Date.now()
		};
		saveWarnings(warnings);
	}
}

export function deleteWarning(id: string): void {
	const warnings = getWarnings().filter((w) => w.id !== id);
	saveWarnings(warnings);
}

export function getWarningStats(): {
	total: number;
	stable: number;
	attention: number;
	alert: number;
} {
	const warnings = getWarnings();
	const stats = { total: warnings.length, stable: 0, attention: 0, alert: 0 };
	warnings.forEach((w) => {
		stats[w.level]++;
	});
	return stats;
}
