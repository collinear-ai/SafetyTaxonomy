import { TaxonomyData, TaxonomyCategory, TaxonomyItem, Framework } from "@shared/schema";

const CATEGORY_COLORS = {
  "Fairness, Bias & Non-Discrimination": "hsl(0, 84%, 60%)",
  "Governance & Oversight": "hsl(262, 83%, 58%)",
  "Harmful Content & Misuse": "hsl(0, 76%, 50%)",
  "Misinformation & Factuality": "hsl(43, 96%, 56%)",
  "Regulatory & Compliance": "hsl(158, 64%, 52%)",
  "Security, Privacy & Data Protection": "hsl(221, 83%, 53%)",
  "Societal, Ethics & Long-Term Risks": "hsl(256, 65%, 58%)"
};

export function parseTaxonomyCSV(csvContent: string): TaxonomyData {
  const lines = csvContent.split('\n');
  const items: TaxonomyItem[] = [];
  
  // Skip header row and process data
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = parseCSVLine(line);
    if (columns.length < 10) continue;
    
    const l1Category = columns[0]?.trim();
    const l2Category = columns[1]?.trim();
    const example = columns[3]?.trim();
    
    if (!l1Category || !l2Category || !example) continue;
    
    // Parse framework support
    const frameworks: Framework[] = [];
    const frameworkColumns = [
      { col: 4, name: "OWASP" as Framework },
      { col: 5, name: "NIST" as Framework },
      { col: 6, name: "EU AI Act" as Framework },
      { col: 7, name: "US EO 14110" as Framework },
      { col: 8, name: "UK AI Whitepaper" as Framework }
    ];
    
    frameworkColumns.forEach(({ col, name }) => {
      if (columns[col]?.includes('✔️')) {
        frameworks.push(name);
      }
    });
    
    items.push({
      id: `${l1Category}-${l2Category}`.replace(/[^a-zA-Z0-9]/g, '-'),
      l1Category,
      l2Category,
      example,
      frameworks
    });
  }
  
  // Group items by L1 category
  const categoryMap = new Map<string, TaxonomyItem[]>();
  items.forEach(item => {
    if (!categoryMap.has(item.l1Category)) {
      categoryMap.set(item.l1Category, []);
    }
    categoryMap.get(item.l1Category)!.push(item);
  });
  
  // Create categories with coverage statistics
  const categories: TaxonomyCategory[] = [];
  const allFrameworks: Framework[] = ["OWASP", "NIST", "EU AI Act", "US EO 14110", "UK AI Whitepaper"];
  const overallCoverage: Record<Framework, number> = {} as Record<Framework, number>;
  
  // Initialize overall coverage
  allFrameworks.forEach(fw => {
    overallCoverage[fw] = 0;
  });
  
  categoryMap.forEach((subcategories, categoryName) => {
    const frameworkCoverage: Record<Framework, number> = {} as Record<Framework, number>;
    
    allFrameworks.forEach(framework => {
      const supportedCount = subcategories.filter(item => 
        item.frameworks.includes(framework)
      ).length;
      const coverage = Math.round((supportedCount / subcategories.length) * 100);
      frameworkCoverage[framework] = coverage;
      overallCoverage[framework] += supportedCount;
    });
    
    categories.push({
      name: categoryName,
      color: CATEGORY_COLORS[categoryName as keyof typeof CATEGORY_COLORS] || "hsl(200, 50%, 50%)",
      subcategories,
      frameworkCoverage
    });
  });
  
  // Calculate overall coverage percentages
  const totalItems = items.length;
  allFrameworks.forEach(framework => {
    overallCoverage[framework] = Math.round((overallCoverage[framework] / totalItems) * 100);
  });
  
  return {
    categories,
    totalItems,
    overallCoverage
  };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}
