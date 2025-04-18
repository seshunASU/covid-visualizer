import { json } from "@sveltejs/kit";
import { prisma } from "$lib/server/prisma";
import { countryMap } from "$lib/server/country"

function countryToID(country_code: string): string {
    return countryMap[country_code] || country_code;
}

export const GET = async ({ url }) => {
    const dataTypesParam = url.searchParams.get("type") || "confirmed,deceased,recovered";
    const startDateParam = url.searchParams.get("start");
    const endDateParam = url.searchParams.get("end");

    let dataTypes = dataTypesParam.split(",");
    
    let startDate = startDateParam ? new Date(startDateParam) : new Date("2020-01-01T00:00:00Z");
    if (isNaN(startDate.getTime())) {
        throw new Error("Invalid start date");
    }
    
    let endDate = endDateParam ? new Date(endDateParam) : new Date();
    if (isNaN(endDate.getTime())) {
        throw new Error("Invalid end date");
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    if (startDate.getTime() > endDate.getTime()) {
        throw new Error("Start date cannot be after end date");
    }
    
    try {
        let dataRetrievals = [];
        
        if (dataTypes.includes("confirmed")) {
            dataRetrievals.push(
                prisma.$queryRaw`
                    SELECT
                        SPLIT_PART(location, '_', 1) AS country,
                        SUM("count") AS total_count
                    FROM confirmed
                    WHERE "date" BETWEEN ${startDate} AND ${endDate}
                    GROUP BY country
                `.then(d => ["confirmed", d])
            );
        }
        
        if (dataTypes.includes("deceased")) {
            dataRetrievals.push(
                prisma.$queryRaw`
                    SELECT
                        SPLIT_PART(location, '_', 1) AS country,
                        SUM("count") AS total_count
                    FROM deceased
                    WHERE "date" BETWEEN ${startDate} AND ${endDate}
                    GROUP BY country
                `.then(d => ["deceased", d])
            );
        }
        
        if (dataTypes.includes("recovered")) {
            dataRetrievals.push(
                prisma.$queryRaw`
                    SELECT
                        SPLIT_PART(location, '_', 1) AS country,
                        SUM("count") AS total_count
                    FROM recovered
                    WHERE "date" BETWEEN ${startDate} AND ${endDate}
                    GROUP BY country
                `.then(d => ["recovered", d])
            );
        }
        
        let results: Array<[string, Array<{ country: string, total_count: BigInt | number}>]> = await Promise.all(dataRetrievals) as any;

        // convert country to country_id AND BigInts to Numbers
        const formatted = Object.fromEntries(
            results.map(([key, entries]) => [
                key,
                Object.fromEntries(
                    entries.map(({ country, total_count }) => [
                        countryToID(country),
                        typeof total_count === 'bigint' ? Number(total_count) : total_count
                    ])
                )
            ])
        );
          
          return json(formatted);
    } catch (error) {
        console.error("Error fetching COVID data:", error);
        return json({ error: "Failed to fetch data" }, { status: 500 });
    }
};
