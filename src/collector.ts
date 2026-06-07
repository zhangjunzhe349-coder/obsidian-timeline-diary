import { TFile, Vault } from "obsidian";
import { parseTimeline, TimelineEntry } from "./parser";
import { debugLog } from "./utils";

interface FileCacheEntry {
	mtime: number;
	entries: TimelineEntry[];
	dateKey: string;
}

export class TimelineCollector {
	private vault: Vault;
	private cache: Map<string, FileCacheEntry> = new Map();
	private codeblockLang: string;
	private categoryNames: string[];
	private diaryFolder: string;
	private codeblockRegex: RegExp;

	constructor(vault: Vault, codeblockLang: string, categoryNames: string[], diaryFolder: string) {
		this.vault = vault;
		this.codeblockLang = codeblockLang;
		this.categoryNames = categoryNames;
		this.diaryFolder = diaryFolder;
		this.codeblockRegex = this.buildRegex(codeblockLang);
	}

	updateConfig(codeblockLang: string, categoryNames: string[], diaryFolder: string) {
		this.codeblockLang = codeblockLang;
		this.categoryNames = categoryNames;
		this.diaryFolder = diaryFolder;
		this.codeblockRegex = this.buildRegex(codeblockLang);
		this.cache.clear();
	}

	private buildRegex(lang: string): RegExp {
		const escaped = lang.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		return new RegExp("```" + escaped + "\\s*[\\r\\n]+([\\s\\S]*?)```", "g");
	}

	async collectAll(): Promise<Map<string, TimelineEntry[]>> {
		const result = new Map<string, TimelineEntry[]>();

		const folder = this.vault.getAbstractFileByPath(this.diaryFolder);
		if (!folder) {
			debugLog("ERROR: folder not found:", this.diaryFolder);
			return result;
		}

		const folderPrefix = this.diaryFolder.replace(/\/$/, "") + "/";
		const files = this.vault.getMarkdownFiles().filter((f) =>
			f.path.startsWith(folderPrefix)
		);

		// Process files concurrently
		const fileResults = await Promise.all(
			files.map((f) => this.parseFile(f))
		);

		for (let i = 0; i < files.length; i++) {
			const entries = fileResults[i];
			if (entries.length === 0) continue;

			const dateKey = this.cache.get(files[i].path)?.dateKey;
			if (!dateKey) continue;

			const existing = result.get(dateKey);
			if (existing) {
				existing.push(...entries);
			} else {
				result.set(dateKey, entries);
			}
		}

		return result;
	}

	private async parseFile(file: TFile): Promise<TimelineEntry[]> {
		const stat = await this.vault.adapter.stat(file.path);
		const mtime = stat ? stat.mtime : 0;

		const cached = this.cache.get(file.path);
		if (cached && cached.mtime === mtime) {
			return cached.entries;
		}

		const content = await this.vault.cachedRead(file);
		const entries = this.extractFromContent(content);
		const dateKey = this.extractDateFromFile(file);

		this.cache.set(file.path, { mtime, entries, dateKey: dateKey || "" });

		return entries;
	}

	private extractFromContent(content: string): TimelineEntry[] {
		const entries: TimelineEntry[] = [];
		let match;

		// Reset regex state (regex is global, needs fresh start)
		this.codeblockRegex.lastIndex = 0;

		while ((match = this.codeblockRegex.exec(content)) !== null) {
			const blockContent = match[1];
			const parsed = parseTimeline(blockContent, this.categoryNames);
			entries.push(...parsed);
		}

		return entries;
	}

	private extractDateFromFile(file: TFile): string | null {
		const basename = file.basename;

		const sepMatch = basename.match(/(\d{2,4})[.\-_](\d{1,2})[.\-_](\d{1,2})/);
		if (sepMatch) {
			return this.normalizeDate(sepMatch[1], sepMatch[2], sepMatch[3]);
		}

		const compact8 = basename.match(/(\d{4})(\d{2})(\d{2})/);
		if (compact8) {
			return this.normalizeDate(compact8[1], compact8[2], compact8[3]);
		}

		const compact6 = basename.match(/^(\d{2})(\d{2})(\d{2})$/);
		if (compact6) {
			return this.normalizeDate(compact6[1], compact6[2], compact6[3]);
		}

		return null;
	}

	private normalizeDate(yearStr: string, monthStr: string, dayStr: string): string | null {
		let year = parseInt(yearStr, 10);
		const month = parseInt(monthStr, 10);
		const day = parseInt(dayStr, 10);

		if (year < 100) year += 2000;
		if (month < 1 || month > 12) return null;
		if (day < 1 || day > 31) return null;

		return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
	}
}
