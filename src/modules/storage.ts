

export interface ReadingTimeData {
    [itemID: number]: {
        totalSeconds: number;
        lastUpdated: string; // ISO string
    };
}

export class ReadingTimeStorage {
    private filename = "reading_time_tracker.json";
    private data: ReadingTimeData = {};

    constructor() {
        this.load();
    }

    private getFilePath(): string {
        return PathUtils.join(Zotero.DataDirectory.dir, this.filename);
    }

    private async load() {
        try {
            const path = this.getFilePath();
            if (!(await IOUtils.exists(path))) {
                this.data = {};
                return;
            }
            const content = await IOUtils.readUTF8(path);
            this.data = JSON.parse(content);
        } catch (e) {
            Zotero.logError(e);
            this.data = {};
        }
    }

    public async save() {
        try {
            const path = this.getFilePath();
            await IOUtils.writeUTF8(path, JSON.stringify(this.data, null, 2));
        } catch (e) {
            Zotero.logError(e);
        }
    }

    public updateReadingTime(itemID: number, secondsConfig: number) {
        if (!this.data[itemID]) {
            this.data[itemID] = {
                totalSeconds: 0,
                lastUpdated: new Date().toISOString(),
            };
        }
        this.data[itemID].totalSeconds += secondsConfig;
        this.data[itemID].lastUpdated = new Date().toISOString();
        this.save();
    }

    public getReadingTime(itemID: number): number {
        return this.data[itemID]?.totalSeconds || 0;
    }

    public getAllData(): ReadingTimeData {
        return this.data;
    }
}
