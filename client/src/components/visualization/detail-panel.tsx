import {
    TaxonomyCategory,
    TaxonomySubcategory,
    TaxonomyItem,
    Framework,
} from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FrameworkBadge } from "@/components/ui/framework-badge";
import { Hand } from "lucide-react";

interface DetailPanelProps {
    selectedData: TaxonomyCategory | TaxonomySubcategory | TaxonomyItem | null;
    overallCoverage: Record<Framework, number>;
}

export function DetailPanel({
    selectedData,
    overallCoverage,
}: DetailPanelProps) {
    if (!selectedData) {
        return (
            <Card className="sticky top-8">
                <CardContent className="pt-6">
                    <div className="text-center py-8">
                        <Hand className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                            Select a Category
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Click on any segment in the visualization to view
                            detailed information about that safety category.
                        </p>
                    </div>
                </CardContent>

                <div className="mt-8 pt-6 border-t border-border px-6 pb-6 hidden">
                    <h4 className="text-sm font-medium text-foreground mb-4">
                        Coverage Statistics
                    </h4>
                    <div className="space-y-3">
                        {Object.entries(overallCoverage).map(
                            ([framework, coverage]) => (
                                <div
                                    key={framework}
                                    className="flex justify-between items-center"
                                >
                                    <span className="text-xs text-muted-foreground">
                                        {framework} Coverage
                                    </span>
                                    <span
                                        className="text-xs font-medium"
                                        style={{
                                            color: getFrameworkDisplayColor(
                                                framework as Framework
                                            ),
                                        }}
                                    >
                                        {coverage}%
                                    </span>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </Card>
        );
    }

    // Check if it's a category, subcategory, or item
    if ("subcategories" in selectedData) {
        // It's an L1 category
        const category = selectedData as TaxonomyCategory;
        const totalItems = category.subcategories.reduce(
            (sum, sub) => sum + sub.items.length,
            0
        );

        return (
            <Card className="sticky top-8">
                <CardHeader>
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        {category.subcategories.length} subcategories •{" "}
                        {totalItems} items
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    {category.subcategories.map((subcategory) => (
                        <div
                            key={subcategory.name}
                            className="p-3 bg-muted rounded-lg"
                        >
                            <h4 className="font-medium text-sm text-foreground mb-1">
                                {subcategory.name}
                            </h4>
                            <p className="text-xs text-muted-foreground mb-2">
                                {subcategory.items.length} items in this
                                subcategory
                            </p>
                            <div className="space-y-1">
                                {subcategory.items.slice(0, 3).map((item) => (
                                    <div
                                        key={item.id}
                                        className="text-xs text-muted-foreground"
                                    >
                                        • {item.l3Category}
                                    </div>
                                ))}
                                {subcategory.items.length > 3 && (
                                    <div className="text-xs text-muted-foreground">
                                        ... and {subcategory.items.length - 3}{" "}
                                        more
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    } else if ("items" in selectedData) {
        // It's an L2 subcategory
        const subcategory = selectedData as TaxonomySubcategory;
        return (
            <Card className="sticky top-8">
                <CardHeader>
                    <CardTitle className="text-lg">
                        {subcategory.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        {subcategory.items.length} items
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    {subcategory.items.map((item) => (
                        <div key={item.id} className="p-3 bg-muted rounded-lg">
                            <h4 className="font-medium text-sm text-foreground mb-1">
                                {item.l3Category}
                            </h4>
                            <p className="text-xs text-muted-foreground mb-2">
                                {item.example}
                            </p>
                            <div className="flex flex-wrap gap-1 hidden">
                                {item.frameworks.map((fw) => (
                                    <FrameworkBadge key={fw} framework={fw} />
                                ))}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    } else {
        // It's an L3 item
        const item = selectedData as TaxonomyItem;
        return (
            <Card className="sticky top-8">
                <CardHeader>
                    <CardTitle className="text-lg">{item.l3Category}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        {item.l2Category} • {item.l1Category}
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="font-medium text-sm text-foreground mb-2">
                            Example
                        </h4>
                        <p className="text-sm text-muted-foreground">
                            {item.example}
                        </p>
                    </div>
                    <div className="hidden">
                        <h4 className="font-medium text-sm text-foreground mb-2">
                            Framework Support
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {item.frameworks.map((fw) => (
                                <FrameworkBadge
                                    key={fw}
                                    framework={fw}
                                    size="md"
                                />
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }
}

function getFrameworkDisplayColor(framework: Framework): string {
    const colors = {
        OWASP: "hsl(340, 82%, 52%)",
        NIST: "hsl(262, 83%, 58%)",
        "EU AI Act": "hsl(221, 83%, 53%)",
        "US EO 14110": "hsl(158, 64%, 52%)",
        "UK AI Whitepaper": "hsl(24, 95%, 53%)",
    };
    return colors[framework] || "hsl(200, 50%, 50%)";
}
