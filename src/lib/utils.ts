import { AUTO_RETRAIN_THRESHOLD, WARNING_THRESHOLDS } from './constants';
import type { WarningLevel, PracticeRecord } from './types';

export function getDeductBadgeClass(count: number | string): string {
	const d = typeof count === 'string' ? parseFloat(count) : count;
	if (d === 0) return 'bg-green-100 text-green-800 border border-green-300';
	if (d <= 5) return 'bg-green-50 text-green-700 border border-green-200';
	if (d <= AUTO_RETRAIN_THRESHOLD) return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
	return 'bg-red-100 text-red-800 border border-red-300';
}

export function getDeductTextClass(count: number | string): string {
	const d = typeof count === 'string' ? parseFloat(count) : count;
	if (d === 0) return 'text-green-600';
	if (d <= 5) return 'text-green-600';
	if (d <= AUTO_RETRAIN_THRESHOLD) return 'text-yellow-600';
	return 'text-red-600';
}

export function getWarningLevelBadgeClass(level: string): string {
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

export function getWarningLevelTextClass(level: string): string {
	switch (level) {
		case 'stable':
			return 'text-green-600';
		case 'attention':
			return 'text-yellow-600';
		case 'alert':
			return 'text-red-600';
		default:
			return 'text-gray-600';
	}
}

export function getScoreTextClass(score: number): string {
	if (score >= WARNING_THRESHOLDS.SCORE_STABLE_MIN) return 'text-green-600';
	if (score >= WARNING_THRESHOLDS.SCORE_ATTENTION_MIN) return 'text-yellow-600';
	return 'text-red-600';
}

export function getAvgDeductTextClass(avgDeduct: number): string {
	if (avgDeduct >= WARNING_THRESHOLDS.AVG_DEDUCT_ALERT) return 'text-red-600';
	if (avgDeduct >= WARNING_THRESHOLDS.AVG_DEDUCT_ATTENTION) return 'text-yellow-600';
	return 'text-green-600';
}

export function getRetrainRateTextClass(retrainRate: number): string {
	if (retrainRate >= WARNING_THRESHOLDS.RETRAIN_RATE_ALERT) return 'text-red-600';
	if (retrainRate >= WARNING_THRESHOLDS.RETRAIN_RATE_ATTENTION) return 'text-yellow-600';
	return 'text-green-600';
}

export function getTrendDirectionClass(dir: string): string {
	switch (dir) {
		case 'improving':
			return 'text-green-600';
		case 'declining':
			return 'text-red-600';
		case 'stable':
			return 'text-blue-600';
		default:
			return 'text-gray-500';
	}
}

export function getTrendDirectionLabel(dir: string): string {
	switch (dir) {
		case 'improving':
			return '上升趋势 ↑';
		case 'declining':
			return '下降趋势 ↓';
		case 'stable':
			return '保持稳定 →';
		default:
			return '数据不足';
	}
}

export function getPriorityClass(priority: string): string {
	switch (priority) {
		case 'high':
			return 'bg-red-50 text-red-700 border border-red-200';
		case 'medium':
			return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
		default:
			return 'bg-blue-50 text-blue-700 border border-blue-200';
	}
}

export function getPriorityLabel(priority: string): string {
	switch (priority) {
		case 'high':
			return '高优先级';
		case 'medium':
			return '中优先级';
		default:
			return '低优先级';
	}
}

export function appendSuggestion(
	existingSuggestions: string,
	newContent: string
): { finalSuggestion: string; isDuplicate: boolean } {
	const existing = existingSuggestions?.trim() || '';
	const content = newContent.trim();

	if (!existing) {
		return { finalSuggestion: content, isDuplicate: false };
	}
	if (existing.includes(content)) {
		return { finalSuggestion: existing, isDuplicate: true };
	}
	return {
		finalSuggestion: `${existing}\n\n• ${content}`,
		isDuplicate: false
	};
}

export function computeTrendDirection(
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

export function computeArchiveImprovementTrend(
	trendData: { date: string; avgDeduct: number }[]
): { label: string; class: string } {
	if (trendData.length < 2) {
		return { label: '数据不足', class: 'bg-gray-100 text-gray-600 border border-gray-300' };
	}
	const recent = trendData.slice(-3);
	const earlier = trendData.slice(0, 3);
	const recentAvg = recent.reduce((s, d) => s + d.avgDeduct, 0) / recent.length;
	const earlierAvg = earlier.reduce((s, d) => s + d.avgDeduct, 0) / earlier.length;

	if (recentAvg < earlierAvg - 2) {
		return { label: '明显进步 ↓', class: 'bg-green-100 text-green-800 border border-green-300' };
	} else if (recentAvg > earlierAvg + 2) {
		return { label: '有所退步 ↑', class: 'bg-red-100 text-red-800 border border-red-300' };
	}
	return { label: '稳定 →', class: 'bg-yellow-100 text-yellow-800 border border-yellow-300' };
}

export function scoreToLevel(score: number): WarningLevel {
	if (score >= WARNING_THRESHOLDS.SCORE_STABLE_MIN) return 'stable';
	if (score >= WARNING_THRESHOLDS.SCORE_ATTENTION_MIN) return 'attention';
	return 'alert';
}

export function buildStudentArchiveUrl(studentName: string): string {
	return `/students?student=${encodeURIComponent(studentName)}`;
}

export function buildWarningsUrl(params?: {
	student?: string;
	level?: WarningLevel;
	scope?: 'student' | 'item';
	item?: string;
	startDate?: string;
	endDate?: string;
	warningId?: string;
	autoGen?: boolean;
}): string {
	if (!params) return '/warnings';
	const searchParams = new URLSearchParams();
	if (params.student) searchParams.set('student', params.student);
	if (params.level) searchParams.set('level', params.level);
	if (params.scope) searchParams.set('scope', params.scope);
	if (params.item) searchParams.set('item', params.item);
	if (params.startDate) searchParams.set('startDate', params.startDate);
	if (params.endDate) searchParams.set('endDate', params.endDate);
	if (params.warningId) searchParams.set('warningId', params.warningId);
	if (params.autoGen) searchParams.set('autoGen', 'true');
	const query = searchParams.toString();
	return query ? `/warnings?${query}` : '/warnings';
}

export function buildEditRecordUrl(recordId: string): string {
	return `/edit?id=${recordId}`;
}

export function buildHomeWithRecordUrl(recordId: string): string {
	return `/?recordId=${encodeURIComponent(recordId)}`;
}

export function buildStatsUrl(): string {
	return '/stats';
}
