import { App, PluginSettingTab, Setting } from "obsidian";
import TimelineDiaryPlugin from "../main";

export interface Category {
	name: string;
	color: string;
}

export interface TimelineDiarySettings {
	diaryFolder: string;
	categories: Category[];
	uncategorizedColor: string;
	codeblockLang: string;
}

export const DEFAULT_SETTINGS: TimelineDiarySettings = {
	diaryFolder: "日记",
	categories: [
		{ name: "工作", color: "#3b82f6" },
		{ name: "学习", color: "#10b981" },
		{ name: "生活", color: "#f59e0b" },
		{ name: "娱乐", color: "#ef4444" },
	],
	uncategorizedColor: "#9ca3af",
	codeblockLang: "timeline",
};

export class TimelineDiarySettingTab extends PluginSettingTab {
	plugin: TimelineDiaryPlugin;

	constructor(app: App, plugin: TimelineDiaryPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "时间轴日记设置" });

		new Setting(containerEl)
			.setName("日记文件夹")
			.setDesc("存放日记文件的文件夹路径，用于汇总统计")
			.addText((text) =>
				text
					.setPlaceholder("日记")
					.setValue(this.plugin.settings.diaryFolder)
					.onChange(async (value) => {
						this.plugin.settings.diaryFolder = value || "日记";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("代码块标识")
			.setDesc("用于识别时间轴的代码块语言标识")
			.addText((text) =>
				text
					.setPlaceholder("timeline")
					.setValue(this.plugin.settings.codeblockLang)
					.onChange(async (value) => {
						this.plugin.settings.codeblockLang = value || "timeline";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("未分类颜色")
			.setDesc("没有时间标签的条目默认显示的颜色")
			.addColorPicker((color) =>
				color
					.setValue(this.plugin.settings.uncategorizedColor)
					.onChange(async (value) => {
						this.plugin.settings.uncategorizedColor = value;
						await this.plugin.saveSettings();
					})
			);

		containerEl.createEl("h3", { text: "事件类型" });
		containerEl.createEl("p", {
			text: "自定义事件类别及其对应颜色。在日记中使用 #类别名 来标记事件。",
			cls: "setting-item-description",
		});

		const categoriesContainer = containerEl.createDiv("timeline-diary-categories");
		this.renderCategories(categoriesContainer);
	}

	renderCategories(container: HTMLElement): void {
		container.empty();

		this.plugin.settings.categories.forEach((category, index) => {
			const row = container.createDiv("timeline-diary-category-row");

			const nameInput = row.createEl("input", {
				type: "text",
				placeholder: "类别名称",
				value: category.name,
			});
			nameInput.addEventListener("change", async () => {
				this.plugin.settings.categories[index].name = nameInput.value;
				await this.plugin.saveSettings();
			});

			const colorInput = row.createEl("input", {
				type: "color",
				value: category.color,
			});
			colorInput.addEventListener("change", async () => {
				this.plugin.settings.categories[index].color = colorInput.value;
				await this.plugin.saveSettings();
			});

			const deleteBtn = row.createEl("button", {
				text: "删除",
			});
			deleteBtn.addEventListener("click", async () => {
				this.plugin.settings.categories.splice(index, 1);
				await this.plugin.saveSettings();
				this.renderCategories(container);
			});
		});

		const addBtn = container.createEl("button", {
			text: "+ 添加类别",
			cls: "mod-cta",
		});
		addBtn.addEventListener("click", async () => {
			this.plugin.settings.categories.push({
				name: "新类别",
				color: "#6366f1",
			});
			await this.plugin.saveSettings();
			this.renderCategories(container);
		});
	}
}
