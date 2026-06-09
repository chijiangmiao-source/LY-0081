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
	SUGGESTIONS: 'driving_suggestions'
} as const;

export const MIN_DEDUCT = 0;
export const MAX_DEDUCT = 20;
export const AUTO_RETRAIN_THRESHOLD = 10;
