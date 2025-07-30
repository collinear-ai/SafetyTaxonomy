import { TaxonomyData } from "@shared/schema";
import { parseTaxonomyCSV } from "../client/src/lib/csv-parser";
import fs from "fs";
import path from "path";

export interface IStorage {
  getTaxonomyData(): Promise<TaxonomyData>;
}

export class MemStorage implements IStorage {
  private taxonomyData: TaxonomyData | null = null;

  async getTaxonomyData(): Promise<TaxonomyData> {
    if (!this.taxonomyData) {
      const csvPath = path.join(import.meta.dirname, "data", "taxonomy.csv");
      const csvContent = await fs.promises.readFile(csvPath, "utf-8");
      this.taxonomyData = parseTaxonomyCSV(csvContent);
    }
    return this.taxonomyData;
  }
}

export const storage = new MemStorage();
