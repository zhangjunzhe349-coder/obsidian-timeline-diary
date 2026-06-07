import { computeDuration, isValidTime } from "./utils";

export interface TimelineEntry {
	start: number;
	end: number;
	description: string;
	category: string;
	duration: number;
}

function timeToMinutes(timeStr: string): { minutes: number; valid: boolean } {
	const parts = timeStr.split(":").map(Number);
	if (parts.length !== 2 || parts.some(isNaN)) {
		return { minutes: 0, valid: false };
	}
	const [hours, minutes] = parts;
	if (!isValidTime(hours, minutes)) {
		return { minutes: 0, valid: false };
	}
	return { minutes: hours * 60 + minutes, valid: true };
}

export function parseTimeline(text: string, categoryNames: string[]): TimelineEntry[] {
	const entries: TimelineEntry[] = [];
	const lines = text.split(/\r?\n/);

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;

		const match = trimmed.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s+(.*?)(?:\s+#(\S+))?$/);
		if (!match) continue;

		const startResult = timeToMinutes(match[1]);
		const endResult = timeToMinutes(match[2]);
		if (!startResult.valid || !endResult.valid) continue;

		const description = match[3].trim();
		const tag = match[4];

		const duration = computeDuration(startResult.minutes, endResult.minutes);
		if (duration <= 0) continue;

		let category = "未分类";
		if (tag) {
			category = categoryNames.includes(tag) ? tag : tag;
		}

		entries.push({
			start: startResult.minutes,
			end: endResult.minutes,
			description,
			category,
			duration,
		});
	}

	return entries.sort((a, b) => a.start - b.start);
}
