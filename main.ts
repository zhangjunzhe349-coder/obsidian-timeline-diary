import {
	Plugin,
	WorkspaceLeaf,
} from "obsidian";
import {
	TimelineDiarySettings,
	DEFAULT_SETTINGS,
	TimelineDiarySettingTab,
} from "./src/settings";
import { parseTimeline } from "./src/parser";
import { renderDailyTimeline } from "./src/renderer";
import { TimelineCollector } from "./src/collector";
import {
	TimelineDiaryStatsView,
	STATS_VIEW_TYPE,
} from "./src/views/stats-view";

export default class TimelineDiaryPlugin extends Plugin {
	settings: TimelineDiarySettings;
	collector: TimelineCollector;

	private get categoryNames(): string[] {
		return this.settings.categories.map((c) => c.name);
	}

	async onload() {
		await this.loadSettings();

		this.collector = new TimelineCollector(
			this.app.vault,
			this.settings.codeblockLang,
			this.categoryNames,
			this.settings.diaryFolder
		);

		this.registerMarkdownCodeBlockProcessor(
			this.settings.codeblockLang,
			(source, el) => {
				const entries = parseTimeline(source, this.categoryNames);
				renderDailyTimeline(
					entries,
					el,
					this.settings.categories,
					this.settings.uncategorizedColor
				);
			}
		);

		this.registerView(STATS_VIEW_TYPE, (leaf: WorkspaceLeaf) => {
			return new TimelineDiaryStatsView(
				leaf,
				this.settings,
				this.collector
			);
		});

		this.addCommand({
			id: "open-timeline-diary-stats",
			name: "打开时间统计",
			callback: () => this.openStatsView(),
		});

		this.addSettingTab(new TimelineDiarySettingTab(this.app, this));
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(STATS_VIEW_TYPE);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		const oldLang = this.settings.codeblockLang;
		const oldCategories = this.settings.categories;
		const oldFolder = this.settings.diaryFolder;

		await this.saveData(this.settings);

		// Only invalidate collector when a relevant config changed
		if (this.collector) {
			const catNamesChanged =
				oldCategories.length !== this.settings.categories.length ||
				oldCategories.some((c, i) =>
					c.name !== this.settings.categories[i]?.name
				);

			if (
				oldLang !== this.settings.codeblockLang ||
				catNamesChanged ||
				oldFolder !== this.settings.diaryFolder
			) {
				this.collector.updateConfig(
					this.settings.codeblockLang,
					this.categoryNames,
					this.settings.diaryFolder
				);
			}
		}
	}

	async openStatsView() {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(STATS_VIEW_TYPE)[0];

		if (!leaf) {
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({
					type: STATS_VIEW_TYPE,
					active: true,
				});
			}
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}
}
