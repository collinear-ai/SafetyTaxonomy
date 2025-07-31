import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    TaxonomyData,
    TaxonomyCategory,
    TaxonomySubcategory,
    TaxonomyItem,
    Framework,
} from "@shared/schema";
import { SunburstChart } from "@/components/visualization/sunburst-chart";
import { DetailPanel } from "@/components/visualization/detail-panel";
import { FrameworkBadge } from "@/components/ui/framework-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, CircleDot, List, Download, Calendar } from "lucide-react";
import { searchTaxonomy } from "@/lib/taxonomy-utils";
import { parseTaxonomyCSV } from "@/lib/csv-parser";

export default function Home() {
    const [selectedData, setSelectedData] = useState<
        TaxonomyCategory | TaxonomySubcategory | TaxonomyItem | null
    >(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"circle" | "list">("circle");

    const {
        data: taxonomyData,
        isLoading,
        error,
    } = useQuery<TaxonomyData>({
        queryKey: ["taxonomy-csv"],
        queryFn: async () => {
            const response = await fetch("/taxonomy.csv");
            if (!response.ok) {
                throw new Error("Failed to fetch taxonomy data");
            }
            const csvContent = await response.text();
            return parseTaxonomyCSV(csvContent);
        },
    });

    if (isLoading) {
        return <LoadingSkeleton />;
    }

    if (error || !taxonomyData) {
        return <ErrorState error={error} />;
    }

    const searchResults = searchQuery
        ? searchTaxonomy(taxonomyData, searchQuery)
        : [];

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="bg-background shadow-sm border-b border-border flex-none">
                <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">
                                Collinear AI Safety Taxonomy
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Comprehensive framework mapping for AI safety
                                and security
                            </p>
                        </div>
                        <div className="flex items-center space-x-4 hidden">
                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-muted-foreground">
                                    Frameworks:
                                </span>
                                <div className="flex space-x-1">
                                    <FrameworkBadge framework="OWASP" />
                                    <FrameworkBadge framework="NIST" />
                                    <FrameworkBadge framework="EU AI Act" />
                                    <FrameworkBadge framework="US EO 14110" />
                                    <FrameworkBadge framework="UK AI Whitepaper" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="px-4 sm:px-6 lg:px-8 py-8 flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Visualization Panel */}
                <div className="lg:col-span-3">
                    <Card className="bg-[#fcfbfa]">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-xl">
                                    Interactive Safety Taxonomy
                                </CardTitle>
                                <div className="flex items-center space-x-4">
                                    {/* Search */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="text"
                                            placeholder="Search categories..."
                                            value={searchQuery}
                                            onChange={(e) =>
                                                setSearchQuery(e.target.value)
                                            }
                                            className="pl-10 w-64"
                                        />
                                    </div>
                                    {/* View Toggle */}
                                    <div className="flex bg-muted rounded-lg p-1">
                                        <Button
                                            size="sm"
                                            variant={
                                                viewMode === "circle"
                                                    ? "default"
                                                    : "ghost"
                                            }
                                            onClick={() =>
                                                setViewMode("circle")
                                            }
                                            className="text-xs"
                                        >
                                            <CircleDot className="h-3 w-3 mr-1" />
                                            Circle
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={
                                                viewMode === "list"
                                                    ? "default"
                                                    : "ghost"
                                            }
                                            onClick={() => setViewMode("list")}
                                            className="text-xs"
                                        >
                                            <List className="h-3 w-3 mr-1" />
                                            List
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {viewMode === "circle" ? (
                                <SunburstChart
                                    data={taxonomyData}
                                    onSelectionChange={setSelectedData}
                                    searchQuery={searchQuery}
                                    selectedItem={selectedData}
                                />
                            ) : (
                                <ListView
                                    data={taxonomyData}
                                    searchResults={searchResults}
                                    searchQuery={searchQuery}
                                    onSelectionChange={setSelectedData}
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Detail Panel */}
                <div className="lg:col-span-1">
                    <DetailPanel
                        selectedData={selectedData}
                        overallCoverage={
                            taxonomyData.overallCoverage as Record<
                                Framework,
                                number
                            >
                        }
                    />
                </div>
            </main>
        </div>
    );
}

function ListView({
    data,
    searchResults,
    searchQuery,
    onSelectionChange,
}: {
    data: TaxonomyData;
    searchResults: TaxonomyItem[];
    searchQuery: string;
    onSelectionChange: (
        selected: TaxonomyCategory | TaxonomySubcategory | TaxonomyItem
    ) => void;
}) {
    const displayData = searchQuery
        ? // Group search results by category and subcategory
          searchResults.reduce((acc, item) => {
              const existingL1 = acc.find(
                  (cat) => cat.name === item.l1Category
              );
              if (existingL1) {
                  const existingL2 = existingL1.subcategories.find(
                      (sub) => sub.name === item.l2Category
                  );
                  if (existingL2) {
                      existingL2.items.push(item);
                  } else {
                      existingL1.subcategories.push({
                          name: item.l2Category,
                          items: [item],
                          frameworkCoverage: {
                              OWASP: 0,
                              NIST: 0,
                              "EU AI Act": 0,
                              "US EO 14110": 0,
                              "UK AI Whitepaper": 0,
                          } as Record<Framework, number>,
                      });
                  }
              } else {
                  const originalCategory = data.categories.find(
                      (cat) => cat.name === item.l1Category
                  );
                  if (originalCategory) {
                      acc.push({
                          ...originalCategory,
                          subcategories: [
                              {
                                  name: item.l2Category,
                                  items: [item],
                                  frameworkCoverage: {
                                      OWASP: 0,
                                      NIST: 0,
                                      "EU AI Act": 0,
                                      "US EO 14110": 0,
                                      "UK AI Whitepaper": 0,
                                  } as Record<Framework, number>,
                              },
                          ],
                      });
                  }
              }
              return acc;
          }, [] as TaxonomyCategory[])
        : data.categories;

    return (
        <div className="space-y-4">
            {displayData.map((category) => (
                <Card key={category.name} className="overflow-hidden">
                    <CardHeader
                        className="bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => onSelectionChange(category)}
                    >
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                                {category.name}
                            </CardTitle>
                            <div className="flex items-center space-x-2">
                                <span className="text-xs text-muted-foreground">
                                    {category.subcategories.length}{" "}
                                    subcategories,{" "}
                                    {category.subcategories.reduce(
                                        (sum, sub) => sum + sub.items.length,
                                        0
                                    )}{" "}
                                    items
                                </span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        {category.subcategories.map((subcategory) => (
                            <div key={subcategory.name} className="space-y-2">
                                <div
                                    className="flex items-center justify-between p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() =>
                                        onSelectionChange(subcategory)
                                    }
                                >
                                    <h3 className="text-sm font-semibold text-foreground">
                                        {subcategory.name}
                                    </h3>
                                    <span className="text-xs text-muted-foreground">
                                        {subcategory.items.length} items
                                    </span>
                                </div>
                                <div className="space-y-2 ml-4">
                                    {subcategory.items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-start justify-between p-3 bg-muted/50 rounded cursor-pointer hover:bg-muted/70 transition-colors"
                                            onClick={() =>
                                                onSelectionChange(item)
                                            }
                                        >
                                            <div className="flex-1">
                                                <h4 className="text-sm font-medium text-foreground">
                                                    {item.l3Category}
                                                </h4>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {item.example}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-1 ml-3 hidden">
                                                {item.frameworks.map((fw) => (
                                                    <FrameworkBadge
                                                        key={fw}
                                                        framework={fw}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="min-h-screen bg-background">
            <header className="bg-background shadow-sm border-b border-border">
                <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
                    <Skeleton className="h-8 w-96 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
            </header>
            <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-3">
                        <Card>
                            <CardHeader>
                                <Skeleton className="h-6 w-48" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-96 w-full" />
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-1">
                        <Card>
                            <CardContent className="pt-6">
                                <Skeleton className="h-32 w-full" />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}

function ErrorState({ error }: { error: any }) {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-destructive">
                        Error Loading Data
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        {error?.message ||
                            "Failed to load taxonomy data. Please try again later."}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
