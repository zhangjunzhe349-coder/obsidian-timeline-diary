import { ItemView, WorkspaceLeaf, moment } from "obsidian";
import { TimelineEntry } from "../parser";
import { TimelineDiarySettings } from "../settings";
import { TimelineCollector } from "../collector";
import {
	formatTime,
	getCategoryColor,
	buildCategoryColorMap,
	MINUTES_PER_DAY,
} from "../utils";

export const STATS_VIEW_TYPE = "timeline-diary-stats";

export class TimelineDiaryStatsView extends ItemView {
	settings: TimelineDiarySettings;
	collector: TimelineCollector;
	private currentMode: "week" | "month" = "week";
	private currentDate: moment.Moment;
	private abortController: AbortController | null = null;

	constructor(leaf: WorkspaceLeaf, settings: TimelineDiarySettings, collector: TimelineCollector) {
		super(leaf);
		this.settings = settings;
		this.collector = collector;
		this.currentDate = moment();
	}

	getViewType(): string {
		return STATS_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "时间统计";
	}

	getIcon(): string {
		return "calendar-days";
	}

	async onOpen(): Promise<void> {
		await this.render();
	}

	async onClose(): Promise<void> {
		this.abortController?.abort();
		this.abortController = null;
		this.containerEl.empty();
	}

	async render(): Promise<void> {
		this.abortController?.abort();
		this.abortController = new AbortController();
		const { signal } = this.abortController;

		this.contentEl.empty();
		this.contentEl.addClass("timeline-diary-stats-view");

		const momentUnit = this.currentMode; // "week" | "month" maps directly to moment units
		const allData = await this.collector.collectAll();
		const categoryColorMap = buildCategoryColorMap(
			this.settings.categories,
			this.settings.uncategorizedColor
		);

		if (signal.aborted) return;

		const toolbar = this.contentEl.createDiv("timeline-diary-stats-toolbar");

		const weekBtn = toolbar.createEl("button", { text: "周视图" });
		weekBtn.toggleClass("is-active", this.currentMode === "week");
		weekBtn.addEventListener("click", () => {
			this.currentMode = "week";
			this.render();
		});

		const monthBtn = toolbar.createEl("button", { text: "月视图" });
		monthBtn.toggleClass("is-active", this.currentMode === "month");
		monthBtn.addEventListener("click", () => {
			this.currentMode = "month";
			this.render();
		});

		const prevBtn = toolbar.createEl("button", { text: "←" });
		prevBtn.addEventListener("click", () => {
			this.currentDate.subtract(1, momentUnit);
			this.render();
		});

		const nextBtn = toolbar.createEl("button", { text: "→" });
		nextBtn.addEventListener("click", () => {
			this.currentDate.add(1, momentUnit);
			this.render();
		});

		const todayBtn = toolbar.createEl("button", { text: "今天" });
		todayBtn.addEventListener("click", () => {
			this.currentDate = moment();
			this.render();
		});

		const dateLabel = toolbar.createEl("span", {
			text: this.currentDate.format(this.currentMode === "week" ? "YYYY年第w周" : "YYYY年M月"),
		});
		dateLabel.style.marginLeft = "auto";
		dateLabel.style.fontWeight = "600";
		dateLabel.style.color = "var(--text-normal)";

		// Diagnostic: show data summary
		let totalEntries = 0;
		allData.forEach((entries) => { totalEntries += entries.length; });
		const diag = toolbar.createEl("span", {
			text: `文件: ${allData.size}天, ${totalEntries}条`,
		});
		diag.style.fontSize = "11px";
		diag.style.color = "var(--text-faint)";
		diag.style.marginLeft = "8px";

		if (this.currentMode === "week") {
			this.renderWeekView(allData, categoryColorMap);
		} else {
			this.renderMonthView(allData, categoryColorMap);
		}
	}

	private renderWeekView(
		allData: Map<string, TimelineEntry[]>,
		colorMap: Map<string, string>
	): void {
		const weekStart = this.currentDate.clone().startOf("week");
		const container = this.contentEl.createDiv("timeline-diary-week-view");

		for (let i = 0; i < 7; i++) {
			const day = weekStart.clone().add(i, "days");
			const dateKey = day.format("YYYY-MM-DD");
			const entries = allData.get(dateKey) || [];

			const column = container.createDiv("timeline-diary-week-column");
			column.createDiv({ cls: "timeline-diary-week-label", text: day.format("ddd") });
			column.createDiv({ cls: "timeline-diary-week-date", text: day.format("MM-DD") });

			const bar = column.createDiv("timeline-diary-week-column-bar");
			this.renderEntrySegments(entries, bar, "timeline-diary-week-segment", colorMap);
		}
	}

	private renderMonthView(
		allData: Map<string, TimelineEntry[]>,
		colorMap: Map<string, string>
	): void {
		const monthStart = this.currentDate.clone().startOf("month");
		const monthEnd = this.currentDate.clone().endOf("month");
		const startDay = monthStart.clone().startOf("week");
		const endDay = monthEnd.clone().endOf("week");
		const container = this.contentEl.createDiv("timeline-diary-month-view");

		const headers = ["日", "一", "二", "三", "四", "五", "六"];
		for (const h of headers) {
			container.createDiv({ cls: "timeline-diary-month-header-cell", text: h });
		}

		let currentDay = startDay.clone();
		while (currentDay.isSameOrBefore(endDay)) {
			const dateKey = currentDay.format("YYYY-MM-DD");
			const entries = allData.get(dateKey) || [];
			const isCurrentMonth = currentDay.isSame(monthStart, "month");

			const cell = container.createDiv("timeline-diary-month-cell");
			if (!isCurrentMonth) {
				cell.addClass("empty");
			}

			cell.createDiv({ cls: "timeline-diary-month-cell-date", text: currentDay.format("D") });

			if (entries.length > 0) {
				const bar = cell.createDiv("timeline-diary-month-cell-bar");
				this.renderEntrySegments(entries, bar, "timeline-diary-month-segment", colorMap);
			}

			currentDay.add(1, "day");
		}
	}

	private renderEntrySegments(
		entries: TimelineEntry[],
		bar: HTMLElement,
		segmentClass: string,
		colorMap: Map<string, string>
	): void {
		if (entries.length === 0) {
			bar.style.background = "var(--background-modifier-border)";
			bar.createEl("span", {
				text: "无",
				cls: "timeline-diary-empty-state",
			});
			return;
		}

		for (const entry of entries) {
			const segment = bar.createDiv(segmentClass);
			const heightPercent = (entry.duration / MINUTES_PER_DAY) * 100;
			segment.style.height = `${heightPercent}%`;
			segment.style.backgroundColor = colorMap.get(entry.category) || this.settings.uncategorizedColor;

			const tooltip = segment.createDiv("timeline-diary-tooltip");
			tooltip.setText(
				`${formatTime(entry.start)} - ${formatTime(entry.end)} · ${entry.description}`
			);
		}
	}
}
