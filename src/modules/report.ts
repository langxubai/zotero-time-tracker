import addon from "../hooks";

export class ReadingReport {
    static async show() {
        // @ts-ignore
        const tracker = addon.tracker;
        if (!tracker) {
            Zotero.alert(null, "Reading Time Tracker", "Tracker not initialized.");
            return;
        }

        const data = tracker.getStorage().getAllData();
        const items = await Promise.all(
            Object.keys(data).map(async (id) => {
                const item = await Zotero.Items.getAsync(parseInt(id));
                return {
                    title: item ? item.getField("title") : "Unknown Item",
                    seconds: data[parseInt(id)].totalSeconds,
                    lastUpdated: data[parseInt(id)].lastUpdated,
                };
            })
        );

        // Sort by most recently read
        items.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());

        let html = `
            <html>
            <head>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    table { border-collapse: collapse; width: 100%; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                </style>
            </head>
            <body>
                <h1>Reading Time Report</h1>
                <table>
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Time (Minutes)</th>
                            <th>Last Read</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td>${item.title}</td>
                                <td>${(item.seconds / 60).toFixed(2)}</td>
                                <td>${new Date(item.lastUpdated).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const window = Zotero.getMainWindow();
        const dialog = new Zotero.ItemPane.DialogSync(window, {
            title: "Reading Time Report",
            body: html,
            buttons: ["OK"],
            width: 600,
            height: 400
        });

        // Using basic alert for now as HTML dialogs are complex in Zotero
        // Or specific Zotero.openInViewer

        // Let's use Zotero.openInViewer for a nice HTML report
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        Zotero.launchURL(url);
    }
}
