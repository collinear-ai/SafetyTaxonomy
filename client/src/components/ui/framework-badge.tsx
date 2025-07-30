import { Badge } from "@/components/ui/badge";
import { Framework } from "@shared/schema";
import { getFrameworkColor } from "@/lib/taxonomy-utils";

interface FrameworkBadgeProps {
  framework: Framework;
  size?: "sm" | "md";
}

export function FrameworkBadge({ framework, size = "sm" }: FrameworkBadgeProps) {
  const color = getFrameworkColor(framework);
  
  return (
    <Badge 
      variant="secondary"
      className={`text-white border-0 ${size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'}`}
      style={{ backgroundColor: color }}
    >
      {framework}
    </Badge>
  );
}
