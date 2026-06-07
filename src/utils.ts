import { Category } from "./settings";

export const MINUTES_PER_DAY = 24 * 60;
const MAX_OVERNIGHT_HOURS = 16;

export function formatTime(minutes: number): string {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function formatDuration(minutes: number): string {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (h > 0 && m > 0) return `${h}小时${m}分钟`;
	if (h > 0) return `${h}小时`;
	if (m > 0) return `${m}分钟`;
	return "0分钟";
}

export function getCategoryColor(
	category: string,
	categories: Category[],
	uncategorizedColor: string
): string {
	const found = categories.find((c) => c.name === category);
	return found ? found.color : uncategorizedColor;
}

export function buildCategoryColorMap(
	categories: Category[],
	uncategorizedColor: string
): Map<string, string> {
	const map = new Map<string, string>();
	for (const cat of categories) {
		map.set(cat.name, cat.color);
	}
	map.set("未分类", uncategorizedColor);
	return map;
}

export function computeDuration(start: number, end: number): number {
	if (end < start) {
		// overnight span
		const duration = (MINUTES_PER_DAY - start) + end;
		// reject unreasonably long spans (> MAX_OVERNIGHT_HOURS)
		if (duration > MAX_OVERNIGHT_HOURS * 60) return 0;
		return duration;
	}
	return end - start;
}

export function isValidTime(hours: number, minutes: number): boolean {
	return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

const DEBUG = true;

export function debugLog(...args: unknown[]): void {
	if (DEBUG) {
		console.log("[TimelineDiary]", ...args);
	}
}
