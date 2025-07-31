import {
    TaxonomyData,
    TaxonomyCategory,
    TaxonomySubcategory,
    TaxonomyItem,
    Framework,
} from "@shared/schema";

const CATEGORY_COLORS = {
    "Fairness, Bias & Non-Discrimination": "hsl(17.56deg 100% 85.74%)",
    "Governance & Oversight": "hsl(17.56deg 100% 85.74%)",
    "Harmful Content & Misuse": "hsl(17.56deg 100% 85.74%)",
    "Misinformation & Factuality": "hsl(17.56deg 100% 85.74%)",
    "Regulatory & Compliance": "hsl(17.56deg 100% 85.74%)",
    "Security, Privacy & Data Protection": "hsl(17.56deg 100% 85.74%)",
    "Societal, Ethics & Long-Term Risks": "hsl(17.56deg 100% 85.74%)",
};

export function parseTaxonomyCSV(csvContent: string): TaxonomyData {
    const lines = csvContent.split("\n");
    const items: TaxonomyItem[] = [];

    // Skip first empty line and header row, then process data
    // Line 0: empty comma line, Line 1: actual header, Line 2+: data
    for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const columns = parseCSVLine(line);
        if (columns.length < 6) continue; // Need at least empty col, L1, L2, L3, Example, and first framework

        let l1Category = columns[1]?.trim() || "";
        let l2Category = columns[2]?.trim() || "";
        let l3Category = columns[3]?.trim() || "";
        let example = columns[4]?.trim() || "";

        // Remove quotes if present
        l1Category = l1Category.replace(/^"/, "").replace(/"$/, "");
        l2Category = l2Category.replace(/^"/, "").replace(/"$/, "");
        l3Category = l3Category.replace(/^"/, "").replace(/"$/, "");
        example = example.replace(/^"/, "").replace(/"$/, "");

        if (!l1Category || !l2Category || !l3Category) {
            continue;
        }

        // Use a placeholder example if missing
        if (!example) {
            example = `Example for ${l3Category}`;
        }

        // Parse framework support
        const frameworks: Framework[] = [];
        const frameworkColumns = [
            { col: 5, name: "OWASP" as Framework },
            { col: 6, name: "NIST" as Framework },
            { col: 7, name: "EU AI Act" as Framework },
            { col: 8, name: "US EO 14110" as Framework },
            { col: 9, name: "UK AI Whitepaper" as Framework },
        ];

        frameworkColumns.forEach(({ col, name }) => {
            if (columns[col]?.includes("✔️")) {
                frameworks.push(name);
            }
        });

        items.push({
            id: `${l1Category}-${l2Category}-${l3Category}`.replace(
                /[^a-zA-Z0-9]/g,
                "-"
            ),
            l1Category,
            l2Category,
            l3Category,
            example,
            frameworks,
        });
    }

    // Group items by L1 -> L2 -> L3 hierarchy
    const l1Map = new Map<string, Map<string, TaxonomyItem[]>>();

    items.forEach((item) => {
        if (!l1Map.has(item.l1Category)) {
            l1Map.set(item.l1Category, new Map());
        }
        const l2Map = l1Map.get(item.l1Category)!;

        if (!l2Map.has(item.l2Category)) {
            l2Map.set(item.l2Category, []);
        }
        l2Map.get(item.l2Category)!.push(item);
    });

    // Create categories with proper L1 -> L2 -> L3 hierarchy
    const categories: TaxonomyCategory[] = [];
    const allFrameworks: Framework[] = [
        "OWASP",
        "NIST",
        "EU AI Act",
        "US EO 14110",
        "UK AI Whitepaper",
    ];
    const overallCoverage: Record<Framework, number> = {
        OWASP: 0,
        NIST: 0,
        "EU AI Act": 0,
        "US EO 14110": 0,
        "UK AI Whitepaper": 0,
    };

    // Overall coverage is already initialized above

    l1Map.forEach((l2Map, l1CategoryName) => {
        const subcategories: TaxonomySubcategory[] = [];
        const allL1Items: TaxonomyItem[] = [];

        // Create L2 subcategories
        l2Map.forEach((l3Items, l2CategoryName) => {
            // Calculate framework coverage for this L2 category
            const l2FrameworkCoverage: Record<Framework, number> = {} as Record<
                Framework,
                number
            >;

            allFrameworks.forEach((framework) => {
                const supportedCount = l3Items.filter((item) =>
                    item.frameworks.includes(framework)
                ).length;
                const coverage =
                    l3Items.length > 0
                        ? Math.round((supportedCount / l3Items.length) * 100)
                        : 0;
                l2FrameworkCoverage[framework] = coverage;
            });

            subcategories.push({
                name: l2CategoryName,
                items: l3Items,
                frameworkCoverage: l2FrameworkCoverage,
            });

            allL1Items.push(...l3Items);
        });

        // Calculate framework coverage for the entire L1 category
        const l1FrameworkCoverage: Record<Framework, number> = {} as Record<
            Framework,
            number
        >;

        allFrameworks.forEach((framework) => {
            const supportedCount = allL1Items.filter((item) =>
                item.frameworks.includes(framework)
            ).length;
            const coverage =
                allL1Items.length > 0
                    ? Math.round((supportedCount / allL1Items.length) * 100)
                    : 0;
            l1FrameworkCoverage[framework] = coverage;
            overallCoverage[framework] += supportedCount;
        });

        categories.push({
            name: l1CategoryName,
            color:
                CATEGORY_COLORS[
                    l1CategoryName as keyof typeof CATEGORY_COLORS
                ] || "hsl(17.56deg 88.74% 54.71%)",
            subcategories,
            frameworkCoverage: l1FrameworkCoverage,
        });
    });

    // Calculate overall coverage percentages
    const totalItems = items.length;
    allFrameworks.forEach((framework) => {
        overallCoverage[framework] = Math.round(
            (overallCoverage[framework] / totalItems) * 100
        );
    });

    return {
        categories,
        totalItems,
        overallCoverage,
    };
}

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
            result.push(current);
            current = "";
        } else {
            current += char;
        }
    }

    result.push(current);
    return result;
}
