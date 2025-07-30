import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { TaxonomyData, TaxonomyCategory, TaxonomyItem } from '@shared/schema';
import { createHierarchyData, HierarchyNode } from '@/lib/taxonomy-utils';

interface SunburstChartProps {
  data: TaxonomyData;
  onSelectionChange: (selected: TaxonomyCategory | TaxonomyItem | null) => void;
  searchQuery: string;
}

export function SunburstChart({ data, onSelectionChange, searchQuery }: SunburstChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 600 });

  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current?.parentElement) {
        const parentWidth = svgRef.current.parentElement.clientWidth;
        const size = Math.min(parentWidth - 32, 600);
        setDimensions({ width: size, height: size });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    const radius = Math.min(width, height) / 2;

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Create hierarchy data
    const hierarchyData = createHierarchyData(data);
    const root = d3.hierarchy(hierarchyData)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const partition = d3.partition<HierarchyNode>()
      .size([2 * Math.PI, radius]);

    partition(root);

    const arc = d3.arc<d3.HierarchyRectangularNode<HierarchyNode>>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1);

    // Filter based on search
    const filteredNodes = root.descendants().slice(1).filter(d => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      
      if (d.data.data && 'l2Category' in d.data.data) {
        const item = d.data.data as TaxonomyItem;
        return (
          item.l1Category.toLowerCase().includes(query) ||
          item.l2Category.toLowerCase().includes(query) ||
          item.example.toLowerCase().includes(query) ||
          item.frameworks.some(fw => fw.toLowerCase().includes(query))
        );
      }
      
      if (d.data.data && 'subcategories' in d.data.data) {
        const category = d.data.data as TaxonomyCategory;
        return category.name.toLowerCase().includes(query);
      }
      
      return d.data.name.toLowerCase().includes(query);
    });

    // Create paths
    const path = g.selectAll("path")
      .data(filteredNodes)
      .enter().append("path")
      .attr("d", arc)
      .style("fill", d => {
        if (d.depth === 1) {
          return d.data.color || '#3B82F6';
        }
        const parentColor = d.parent?.data.color || '#3B82F6';
        return d3.color(parentColor)?.brighter(0.5)?.toString() || '#60A5FA';
      })
      .style("stroke", "#fff")
      .style("stroke-width", 2)
      .style("cursor", "pointer")
      .style("opacity", searchQuery ? 0.6 : 0.8)
      .on("mouseover", function(event, d) {
        d3.select(this).style("opacity", 1);
      })
      .on("mouseout", function(event, d) {
        d3.select(this).style("opacity", searchQuery ? 0.6 : 0.8);
      })
      .on("click", function(event, d) {
        if (d.data.data) {
          onSelectionChange(d.data.data as TaxonomyCategory | TaxonomyItem);
        }
      });

    // Add labels for L1 categories only
    const text = g.selectAll("text")
      .data(filteredNodes.filter(d => d.depth === 1))
      .enter().append("text")
      .attr("transform", d => {
        const angle = (d.x0 + d.x1) / 2;
        const radius = (d.y0 + d.y1) / 2;
        return `rotate(${(angle * 180 / Math.PI - 90)}) translate(${radius},0) rotate(${angle > Math.PI ? 180 : 0})`;
      })
      .attr("dy", "0.35em")
      .style("text-anchor", d => (d.x0 + d.x1) / 2 > Math.PI ? "end" : "start")
      .style("font-size", "11px")
      .style("font-weight", "500")
      .style("fill", "hsl(20, 14.3%, 4.1%)")
      .style("pointer-events", "none")
      .text(d => {
        const name = d.data.name;
        return name.length > 18 ? name.substring(0, 18) + "..." : name;
      });

  }, [data, dimensions, searchQuery]);

  return (
    <div className="relative">
      <svg 
        ref={svgRef} 
        width="100%" 
        height="600" 
        className="drop-shadow-sm"
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center bg-background/90 rounded-full p-6 shadow-lg border">
          <h3 className="text-lg font-semibold text-foreground">AI Safety</h3>
          <p className="text-sm text-muted-foreground">Taxonomy</p>
          <div className="text-xs text-muted-foreground mt-2">
            <span>{data.categories.length}</span> Categories
          </div>
        </div>
      </div>
    </div>
  );
}
