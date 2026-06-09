import type { TrainingItem, ErrorType } from './types';

export const TRAINING_ITEMS: TrainingItem[] = [
	'倒车入库',
	'侧方停车',
	'曲线行驶',
	'直角转弯',
	'坡道定点停车和起步',
	'通过限宽门',
	'通过连续障碍'
];

export const ERROR_TYPES: ErrorType[] = [
	'压线',
	'中途停车',
	'超时',
	'熄火',
	'角度不当',
	'速度过快',
	'后视镜观察不足',
	'方向控制不稳',
	'其他'
];

export const STORAGE_KEYS = {
	RECORDS: 'driving_practice_records',
	SUGGESTIONS: 'driving_suggestions',
	WARNINGS: 'driving_warning_records'
} as const;

export const MIN_DEDUCT = 0;
export const MAX_DEDUCT = 20;
export const AUTO_RETRAIN_THRESHOLD = 10;

export const WARNING_THRESHOLDS = {
	SCORE_STABLE_MIN: 70,
	SCORE_ATTENTION_MIN: 40,
	AVG_DEDUCT_ATTENTION: 5,
	AVG_DEDUCT_ALERT: 8,
	RETRAIN_RATE_ATTENTION: 0.2,
	RETRAIN_RATE_ALERT: 0.4,
	PRACTICE_MIN_COUNT: 3,
	ERROR_TYPE_DOMINANCE_RATE: 0.4,
	TREND_DECLINE_DELTA: 2
} as const;

export const WARNING_LEVEL_LABELS: Record<string, string> = {
	stable: '稳定',
	attention: '需关注',
	alert: '重点预警'
} as const;

export const WARNING_SCOPE_LABELS: Record<string, string> = {
	student: '学员维度',
	item: '项目维度'
} as const;
