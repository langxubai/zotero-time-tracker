import { ReadingTimeStorage } from "./storage";

export class ReadingTimeTracker {
    private storage: ReadingTimeStorage;
    private currentItemID: number | null = null;
    private startTime: number | null = null;
    private observerID: string | null = null;

    constructor() {
        this.storage = new ReadingTimeStorage();
    }

    public register() {
        this.observerID = Zotero.Notifier.registerObserver(
            {
                notify: (event, type, ids, extraData) => {
                    this.onNotify(event, type, ids, extraData);
                },
            },
            ["tab"],
            "ReadingTimeTracker"
        );

        // Also check current tab on startup with a delay to ensure UI ready
        setTimeout(() => this.checkCurrentTab(), 2000);
    }

    public unregister() {
        if (this.observerID) {
            Zotero.Notifier.unregisterObserver(this.observerID);
            this.observerID = null;
        }
        this.stopTracking();
    }

    private onNotify(
        event: string,
        type: string,
        ids: string[] | number[],
        extraData: { [key: string]: any }
    ) {
        if (type !== "tab") return;

        // When a tab is selected, or updated, or opened
        if (event === "select" || event === "add" || event === "mod") {
            // slight delay to ensure tab state is ready
            // Increased to 500ms to avoid 'No selected tab' race condition
            const tabID = (event === "select" && ids.length > 0) ? ids[0] : null;
            setTimeout(() => this.checkCurrentTab(tabID), 500);
        }
    }

    private checkCurrentTab(specificTabID?: string | number | null) {
        try {
            const win = Zotero.getMainWindow();
            if (!win) {
                Zotero.debug("[ReadingTimeTracker] No main window found.");
                return;
            }
            // @ts-ignore
            const zTabs = win.Zotero_Tabs;
            if (!zTabs) {
                Zotero.debug("[ReadingTimeTracker] Zotero_Tabs not found on main window.");
                return;
            }

            let tab = zTabs.selectedTab;

            // Fallback: if selectedTab is null but we have a specific ID from notify
            if (!tab && specificTabID) {
                if (typeof zTabs.getTab === 'function') {
                    const fallbackTab = zTabs.getTab(specificTabID);
                    if (fallbackTab) {
                        tab = fallbackTab;
                        Zotero.debug(`[ReadingTimeTracker] Using fallback tab from ID ${specificTabID}`);
                    }
                }
            }

            if (!tab) {
                Zotero.debug(`[ReadingTimeTracker] No selected tab. (Waited 500ms). specID: ${specificTabID}`);
                this.stopTracking();
                return;
            }

            // Zotero 7 Reader tab type is 'reader'
            if (tab.type === "reader") {
                // Get the item ID from the reader
                // @ts-ignore
                const reader = Zotero.Reader.getByTabID(tab.id);
                if (reader && reader.itemID) {
                    this.startTracking(reader.itemID);
                } else {
                    this.stopTracking();
                }
            } else {
                this.stopTracking();
            }
        } catch (e) {
            Zotero.logError(e);
            this.stopTracking();
        }
    }

    private startTracking(itemID: number) {
        if (this.currentItemID === itemID) return; // Already tracking this item

        this.stopTracking(); // Stop previous if any

        this.currentItemID = itemID;
        this.startTime = Date.now();
        Zotero.debug(`[ReadingTimeTracker] Started tracking item ${itemID}`);
    }

    private stopTracking() {
        if (this.currentItemID !== null && this.startTime !== null) {
            const durationSeconds = (Date.now() - this.startTime) / 1000;
            if (durationSeconds > 1) { // Ignore very short interactions
                this.storage.updateReadingTime(this.currentItemID, durationSeconds);
                Zotero.debug(`[ReadingTimeTracker] Stopped tracking item ${this.currentItemID}. Duration: ${durationSeconds}s`);
            }
        }
        this.currentItemID = null;
        this.startTime = null;
    }

    public getStorage(): ReadingTimeStorage {
        return this.storage;
    }
}
