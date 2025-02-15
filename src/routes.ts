import { createCheerioRouter } from "crawlee";
import { categories, subcategories } from "./utils/index.ts";
import moment from "moment";
export const router = createCheerioRouter();
router.addDefaultHandler(
	async ({ $, pushData, request, enqueueLinks, log }) => {
		if (request.label === "detail") {
			const title = $("title").text();
			const price_text = $(".price-val:first").text().replace(" ", "");
			const price = price_text.match(/\d+/g)?.map(Number)[0];
			const source_id = $(".product-info__statistics__i-text:eq(0)")
				.text()
				.replace("№", "")
				.trim();
			const view_count = $(".product-info__statistics__i-text:eq(2)")
				.text()
				.match(/\d+/g)
				?.map(Number)[0];
			const category_id = categories[$(".breadcrumbs__i-text:eq(1)").text()];
			const subcategory_id =
				subcategories[$(".breadcrumbs__i-text:eq(2)").text()];
			const posted_at_text = $(
				".product-info__statistics__i-text:eq(1)",
			).text();
			let baseDate = moment();
			if (
				posted_at_text.includes("Bugün") ||
				posted_at_text.includes("Dünən")
			) {
				const [dayPart, timePart] = posted_at_text.split(", ");
				const timeMoment = moment(timePart, "HH:mm");

				if (dayPart === "Dünən") {
					baseDate = moment().subtract(1, "days");
				}

				baseDate.set({
					hour: timeMoment.get("hour"),
					minute: timeMoment.get("minute"),
					second: 0,
					millisecond: 0,
				});
			} else {
				baseDate = moment(posted_at_text, "DD MMMM YYYY", "az");
			}
			const posted_at = baseDate.toISOString();
			const meta_data = $(".product-properties__i")
				.map((_, el) => {
					const key = $(el).find(".product-properties__i-name").text().trim();

					const value = $(el)
						.find(".product-properties__i-value")
						.text()
						.trim();

					return { key, value };
				})
				.get()
				.reduce(
					(acc, { key, value }) => {
						acc[key] = value;
						return acc;
					},
					{} as Record<string, string>,
				);

			log.info(`${title}`, { url: request.loadedUrl });
			await pushData({
				url: request.loadedUrl,
				price,
				source_id,
				view_count,
				category_id,
				subcategory_id,
				posted_at,
				meta_data,
			});
		} else if (request.label === "pagination") {
			log.info(`enqueueing new URLs ${request.url}`);
			await enqueueLinks({
				selector: ".products-link",
				label: "detail",
			});
			const nextLink = $("div.next a").attr("href");
			if (nextLink) {
				await enqueueLinks({
					selector: "div.next a",
					label: "pagination",
				});
			}
		} else {
			log.info(`enqueueing new URLs ${request.url}`);
			await enqueueLinks({
				selector: ".products-link",
				label: "detail",
			});
			const nextLink = $("div.next a").attr("href");
			if (nextLink) {
				await enqueueLinks({
					selector: "div.next a",
					label: "pagination",
				});
			}
		}
	},
);
