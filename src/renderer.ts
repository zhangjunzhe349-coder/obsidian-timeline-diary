import { TimelineEntry } from "./parser";
import { Category } from "./settings";
import {
	formatTime,
	formatDuration,
	getCategoryColor,
	MINUTES_PER_DAY,
} from "./utils";

export function renderDailyBar(
	entries: TimelineEntry[],
	container: HTMLElement,
	categories: Category[],
	uncategorizedColor: string
): void {
	const bar = container.createDiv("timeline-diary-bar");

	for (const entry of entries) {
		const segment = bar.createDiv("timeline-diary-bar-segment");
		const widthPercent = (entry.duration / MINUTES_PER_DAY) * 100;
		segment.style.width = `${widthPercent}%`;
		segment.style.backgroundColor = getCategoryColor(entry.category, categories, uncategorizedColor);

		const tooltip = segment.createDiv("timeline-diary-tooltip");
		tooltip.setText(
			`${formatTime(entry.start)} - ${formatTime(entry.end)} · ${entry.description} · ${formatDuration(entry.duration)}`
		);
	}

	if (entries.length === 0) {
		bar.style.background = "var(--background-modifier-border)";
		bar.createEl("span", {
			text: "暂无时间轴数据",
			cls: "timeline-diary-empty-state",
		});
	}
}

export function renderTimelineDetail(
	entries: TimelineEntry[],
	container: HTMLElement,
	categories: Category[],
	uncategorizedColor: string
): void {
	const detail = container.createDiv("timeline-diary-detail");

	for (const entry of entries) {
		const item = detail.createDiv("timeline-diary-detail-item");

		const colorStrip = item.createDiv("timeline-diary-detail-color");
		colorStrip.style.backgroundColor = getCategoryColor(entry.category, categories, uncategorizedColor);

		item.createDiv({
			cls: "timeline-diary-detail-time",
			text: `${formatTime(entry.start)} - ${formatTime(entry.end)}`,
		});

		item.createDiv({
			cls: "timeline-diary-detail-text",
			text: entry.description,
		});

		item.createDiv({
			cls: "timeline-diary-detail-tag",
			text: entry.category,
		});
	}
}

export function renderDailyTimeline(
	entries: TimelineEntry[],
	container: HTMLElement,
	categories: Category[],
	uncategorizedColor: string
): void {
	const wrapper = container.createDiv("timeline-diary-block");
	renderDailyBar(entries, wrapper, categories, uncategorizedColor);
	renderTimelineDetail(entries, wrapper, categories, uncategorizedColor);
}
