import { TaxonomyCategory, TaxonomyItem, Framework } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FrameworkBadge } from "@/components/ui/framework-badge";
import { Hand } from "lucide-react";

interface DetailPanelProps {
  selectedData: TaxonomyCategory | TaxonomyItem | null;
  overallCoverage: Record<Framework, number>;
}

export function DetailPanel({ selectedData, overallCoverage }: DetailPanelProps) {
  if (!selectedData) {
    return (
      <Card className="sticky top-8">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Hand className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Select a Category</h3>
            <p className="text-sm text-muted-foreground">
              Click on any segment in the visualization to view detailed information about that safety category.
            </p>
          </div>
        </CardContent>

        <div className="mt-8 pt-6 border-t border-border px-6 pb-6">
          <h4 className="text-sm font-medium text-foreground mb-4">Coverage Statistics</h4>
          <div className="space-y-3">
            {Object.entries(overallCoverage).map(([framework, coverage]) => (
              <div key={framework} className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{framework} Coverage</span>
                <span 
                  className="text-xs font-medium"
                  style={{ color: getFrameworkDisplayColor(framework as Framework) }}
                >
                  {coverage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // Check if it's a category or item
  if ('subcategories' in selectedData) {
    // It's a category
    const category = selectedData as TaxonomyCategory;
    return (
      <Card className="sticky top-8">
        <CardHeader>
          <div className="text-center mb-6">
            <div 
              className="w-12 h-12 rounded-full mx-auto mb-3"
              style={{ backgroundColor: category.color }}
            />
            <CardTitle className="text-lg">{category.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {category.subcategories.length} subcategories
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {category.subcategories.map((item) => (
            <div key={item.id} className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium text-sm text-foreground mb-1">{item.l2Category}</h4>
              <p className="text-xs text-muted-foreground mb-2">{item.example}</p>
              <div className="flex flex-wrap gap-1">
                {item.frameworks.map(fw => (
                  <FrameworkBadge key={fw} framework={fw} />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  } else {
    // It's an item
    const item = selectedData as TaxonomyItem;
    return (
      <Card className="sticky top-8">
        <CardHeader>
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full mx-auto mb-3 bg-primary" />
            <CardTitle className="text-lg">{item.l2Category}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{item.l1Category}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-sm text-foreground mb-2">Example</h4>
            <p className="text-sm text-muted-foreground">{item.example}</p>
          </div>
          <div>
            <h4 className="font-medium text-sm text-foreground mb-2">Framework Support</h4>
            <div className="flex flex-wrap gap-2">
              {item.frameworks.map(fw => (
                <FrameworkBadge key={fw} framework={fw} size="md" />
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
    'OWASP': 'hsl(340, 82%, 52%)',
    'NIST': 'hsl(262, 83%, 58%)',
    'EU AI Act': 'hsl(221, 83%, 53%)',
    'US EO 14110': 'hsl(158, 64%, 52%)',
    'UK AI Whitepaper': 'hsl(24, 95%, 53%)'
  };
  return colors[framework] || 'hsl(200, 50%, 50%)';
}
