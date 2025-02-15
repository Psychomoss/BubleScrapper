import { CheerioCrawler, ProxyConfiguration } from "crawlee";
import { router } from "./routes.js";
import sql from "./db/index.ts";
import { pipeline } from "node:stream/promises";
import { createReadStream } from "node:fs";

const startUrls = ["https://tap.az/elanlar/elektronika/"];

const proxies = new ProxyConfiguration({
	proxyUrls: process.env.PROXY_URLS?.split(","),
});

const crawler = new CheerioCrawler({
	proxyConfiguration: proxies,
	requestHandler: router,
	maxRequestsPerCrawl: 1000,
	maxRequestRetries: 2,
	maxRequestsPerMinute: 200,
});

await crawler.run(startUrls);
await crawler.exportData("storage/datasets/data.csv", "csv");

console.log("saving to db");

try {
	const csvStream = createReadStream("storage/datasets/data.csv"); // CSV file

	const query = await sql`
      COPY products (url, price, source_id, view_count, category_id, subcategory_id, posted_at, meta_data)
      FROM STDIN
      WITH (FORMAT csv, HEADER true)
    `.writable();

	await pipeline(csvStream, query);	

	console.log("CSV data inserted successfully!");
} catch (error) {
	console.error("Error inserting CSV data:", error);
} finally {
	await sql.end();
}
