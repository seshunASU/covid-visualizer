import { json } from "@sveltejs/kit";
import { prisma } from "$lib/server/prisma";
import { countryMap } from "$lib/server/country";

function countryToID(country_code: string): string {
  return countryMap[country_code] || country_code;
}

export const GET = async ({ url }) => {
  const minCount = parseInt(url.searchParams.get("minCount") ?? "0", 10);
  const dataTypesParam = url.searchParams.get("type") || "confirmed,deceased,recovered";
  const startDateParam = url.searchParams.get("start");
  const endDateParam = url.searchParams.get("end");
  const dataTypes = dataTypesParam.split(",");

  let startDate = startDateParam
    ? new Date(startDateParam)
    : new Date("2020-01-01T00:00:00Z");
  if (isNaN(startDate.getTime())) throw new Error("Invalid start date");

  let endDate = endDateParam ? new Date(endDateParam) : new Date();
  if (isNaN(endDate.getTime())) throw new Error("Invalid end date");

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  if (startDate > endDate) throw new Error("Start date cannot be after end date");

  try {
    const queries: Promise<any>[] = [];

    for (const table of ["confirmed", "deceased", "recovered"] as const) {
      if (dataTypes.includes(table)) {
        queries.push(
          prisma.$queryRawUnsafe(
            `
            SELECT
              SPLIT_PART(location, '_', 1) AS country,
              SUM("count") AS total_count
            FROM ${table}
            WHERE "date" BETWEEN $1 AND $2
            GROUP BY country
	    HAVING SUM("count") >= $3;
            `,
            startDate,
            endDate,
            minCount
          ).then((rows) => [table, rows])
        );
      }
    }

    const results = (await Promise.all(queries)) as Array<
      [string, Array<{ country: string; total_count: bigint | number }>]
    >;

    const formatted = Object.fromEntries(
      results.map(([key, entries]) => [
        key,
        Object.fromEntries(
          entries.map(({ country, total_count }) => [
            countryToID(country),
            typeof total_count === "bigint" ? Number(total_count) : total_count
          ])
        )
      ])
    );

    return json(formatted);
  } catch (err) {
    console.error("Error fetching COVID data:", err);
    return json({ error: "Failed to fetch data" }, { status: 500 });
  }
};


