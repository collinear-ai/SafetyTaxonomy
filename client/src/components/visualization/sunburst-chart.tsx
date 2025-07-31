import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import {
    TaxonomyData,
    TaxonomyCategory,
    TaxonomySubcategory,
    TaxonomyItem,
} from "@shared/schema";
import { createHierarchyData, HierarchyNode } from "@/lib/taxonomy-utils";

interface SunburstChartProps {
    data: TaxonomyData;
    onSelectionChange: (
        selected: TaxonomyCategory | TaxonomySubcategory | null
    ) => void;
    searchQuery: string;
    selectedItem: TaxonomyCategory | TaxonomySubcategory | TaxonomyItem | null;
}

export function SunburstChart({
    data,
    onSelectionChange,
    searchQuery,
    selectedItem,
}: SunburstChartProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
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
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (!svgRef.current || !data) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const { width, height } = dimensions;
        const radius = Math.min(width, height) / 2;

        const g = svg
            .attr("viewBox", `0 0 ${width} ${height}`)
            .on("click", function (event) {
                // Deselect if clicking on background (not on any path)
                if (event.target === this) {
                    onSelectionChange(null);
                }
            })
            .append("g")
            .attr("transform", `translate(${width / 2},${height / 2})`);

        // Create hierarchy data
        const hierarchyData = createHierarchyData(data);
        const root = d3
            .hierarchy(hierarchyData)
            .sum((d) => d.value || 0)
            .sort((a, b) => (b.value || 0) - (a.value || 0));

        const partition = d3
            .partition<HierarchyNode>()
            .size([2 * Math.PI, radius]);

        partition(root);

        const arc = d3
            .arc<d3.HierarchyRectangularNode<HierarchyNode>>()
            .startAngle((d) => d.x0)
            .endAngle((d) => d.x1)
            .innerRadius((d) => d.y0)
            .outerRadius((d) => d.y1);

        // Filter based on search
        const filteredNodes = root
            .descendants()
            .slice(1)
            .filter((d) => {
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase();

                if (d.data.data && "items" in d.data.data) {
                    const subcategory = d.data.data as TaxonomySubcategory;
                    return (
                        subcategory.name.toLowerCase().includes(query) ||
                        subcategory.items.some(
                            (item) =>
                                item.l3Category.toLowerCase().includes(query) ||
                                item.example.toLowerCase().includes(query) ||
                                item.frameworks.some((fw) =>
                                    fw.toLowerCase().includes(query)
                                )
                        )
                    );
                }

                if (d.data.data && "subcategories" in d.data.data) {
                    const category = d.data.data as TaxonomyCategory;
                    return (
                        category.name.toLowerCase().includes(query) ||
                        category.subcategories.some(
                            (sub) =>
                                sub.name.toLowerCase().includes(query) ||
                                sub.items.some(
                                    (item) =>
                                        item.l3Category
                                            .toLowerCase()
                                            .includes(query) ||
                                        item.example
                                            .toLowerCase()
                                            .includes(query) ||
                                        item.frameworks.some((fw) =>
                                            fw.toLowerCase().includes(query)
                                        )
                                )
                        )
                    );
                }

                return d.data.name.toLowerCase().includes(query);
            });

        // Create paths
        const path = g
            .selectAll("path")
            .data(filteredNodes)
            .enter()
            .append("path")
            .attr("d", arc)
            .style("fill", (d) => {
                // Determine if this node should be grayed out
                const shouldGrayOut = () => {
                    if (!selectedItem) return false;

                    if (d.depth === 1) {
                        // For L1 categories
                        const currentL1Name = d.data.name;

                        if ("subcategories" in selectedItem) {
                            // Selected item is an L1 category
                            return currentL1Name !== selectedItem.name;
                        } else if ("items" in selectedItem) {
                            // Selected item is an L2 category - find its parent L1
                            const parentL1 = data.categories.find((cat) =>
                                cat.subcategories.some(
                                    (sub) => sub.name === selectedItem.name
                                )
                            );
                            return currentL1Name !== parentL1?.name;
                        } else {
                            // Selected item is an L3/item - find its parent L1
                            const parentL1 = data.categories.find((cat) =>
                                cat.subcategories.some((sub) =>
                                    sub.items.some(
                                        (item) => item.id === selectedItem.id
                                    )
                                )
                            );
                            return currentL1Name !== parentL1?.name;
                        }
                    } else {
                        // For L2 categories - gray out if parent L1 should be grayed out
                        const parentL1Name = d.parent?.data.name;

                        if ("subcategories" in selectedItem) {
                            // Selected item is an L1 category
                            return parentL1Name !== selectedItem.name;
                        } else if ("items" in selectedItem) {
                            // Selected item is an L2 category - find its parent L1
                            const parentL1 = data.categories.find((cat) =>
                                cat.subcategories.some(
                                    (sub) => sub.name === selectedItem.name
                                )
                            );
                            return parentL1Name !== parentL1?.name;
                        } else {
                            // Selected item is an L3/item - find its parent L1
                            const parentL1 = data.categories.find((cat) =>
                                cat.subcategories.some((sub) =>
                                    sub.items.some(
                                        (item) => item.id === selectedItem.id
                                    )
                                )
                            );
                            return parentL1Name !== parentL1?.name;
                        }
                    }
                };

                const isGrayed = shouldGrayOut();

                if (d.depth === 1) {
                    // L1 categories - use their specific colors
                    const baseColor = d.data.color || "#3B82F6";
                    return isGrayed ? "hsl(0, 0%, 80%)" : baseColor;
                } else {
                    // L2 categories - gradient from light to dark orange
                    if (isGrayed) {
                        return "hsl(0, 0%, 85%)";
                    }

                    const siblings = d.parent?.children || [];
                    const currentIndex = siblings.findIndex(
                        (sibling) => sibling === d
                    );
                    const totalSiblings = siblings.length;

                    if (totalSiblings <= 1) {
                        return "hsl(23.25deg 93.02% 83.14%)"; // Default to light orange if only one
                    }

                    // Calculate gradient position (0 = light, 1 = dark)
                    const gradientPosition = currentIndex / (totalSiblings - 1);

                    // Interpolate between light orange and dark orange
                    // Light: hsl(23.25deg 93.02% 83.14%)
                    // Dark: hsl(17.56deg 88.74% 45%)
                    const lightness = 83.14 - gradientPosition * (83.14 - 45);
                    const saturation =
                        93.02 - gradientPosition * (93.02 - 88.74);
                    const hue = 23.25 - gradientPosition * (23.25 - 17.56);

                    return `hsl(${hue}deg ${saturation}% ${lightness}%)`;
                }
            })
            .style("stroke", "#fff")
            .style("stroke-width", 2)
            .style("cursor", "pointer")
            .style("opacity", searchQuery ? 0.6 : 0.8)
            .on("mouseover", function (event, d) {
                d3.select(this).style("opacity", 1);

                // Show tooltip for L2 categories
                if (d.depth === 2 && tooltipRef.current) {
                    const tooltip = tooltipRef.current;
                    tooltip.textContent = d.data.name;
                    tooltip.style.display = "block";

                    // Get mouse position relative to the parent container
                    const containerRect =
                        svgRef.current!.parentElement!.getBoundingClientRect();
                    const mouseX = event.clientX - containerRect.left;
                    const mouseY = event.clientY - containerRect.top;

                    tooltip.style.left = `${mouseX + 10}px`;
                    tooltip.style.top = `${mouseY - 30}px`;
                    tooltip.style.transform = "none";
                }
            })
            .on("mousemove", function (event, d) {
                // Update tooltip position on mouse move for L2 categories
                if (d.depth === 2 && tooltipRef.current) {
                    const tooltip = tooltipRef.current;
                    const containerRect =
                        svgRef.current!.parentElement!.getBoundingClientRect();
                    const mouseX = event.clientX - containerRect.left;
                    const mouseY = event.clientY - containerRect.top;

                    tooltip.style.left = `${mouseX + 10}px`;
                    tooltip.style.top = `${mouseY - 30}px`;
                }
            })
            .on("mouseout", function (event, d) {
                d3.select(this).style("opacity", searchQuery ? 0.6 : 0.8);

                // Hide tooltip for L2 categories
                if (d.depth === 2 && tooltipRef.current) {
                    tooltipRef.current.style.display = "none";
                }
            })
            .on("click", function (event, d) {
                if (d.data.data) {
                    const clickedItem = d.data.data as
                        | TaxonomyCategory
                        | TaxonomySubcategory;
                    // If clicking the same item, deselect it
                    if (
                        selectedItem &&
                        (selectedItem === clickedItem ||
                            ("name" in selectedItem &&
                                "name" in clickedItem &&
                                selectedItem.name === clickedItem.name))
                    ) {
                        onSelectionChange(null);
                    } else {
                        onSelectionChange(clickedItem);
                    }
                }
            });

        // Add labels for L1 categories with pill backgrounds
        const labelGroup = g
            .selectAll("g.label-group")
            .data(filteredNodes.filter((d) => d.depth === 1))
            .enter()
            .append("g")
            .attr("class", "label-group")
            .attr("transform", (d) => {
                const angle = (d.x0 + d.x1) / 2;
                const radius = (d.y0 + d.y1) / 2 + 20; // Push labels outward
                const x = Math.cos(angle - Math.PI / 2) * radius;
                const y = Math.sin(angle - Math.PI / 2) * radius;
                return `translate(${x},${y})`;
            });

        // Add pill background
        labelGroup
            .append("rect")
            .attr("rx", 12)
            .attr("ry", 12)
            .style("fill", "white")
            .style("stroke", "#e5e5e5")
            .style("stroke-width", 1)
            .style("opacity", 0.95)
            .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))")
            .attr("width", (d) => {
                const name = d.data.name;
                const displayName =
                    name.length > 40 ? name.substring(0, 40) + "..." : name;
                return displayName.length * 6.5 + 16; // Approximate width based on character count
            })
            .attr("height", 20)
            .attr("x", (d) => {
                const name = d.data.name;
                const displayName =
                    name.length > 40 ? name.substring(0, 40) + "..." : name;
                return -(displayName.length * 6.5 + 16) / 2;
            })
            .attr("y", -10);

        // Add text labels
        labelGroup
            .append("text")
            .attr("dy", "0.35em")
            .style("text-anchor", "middle")
            .style("font-size", "11px")
            .style("font-weight", "600")
            .style("fill", "hsl(20, 14.3%, 4.1%)")
            .style("pointer-events", "none")
            .text((d) => {
                const name = d.data.name;
                return name.length > 40 ? name.substring(0, 40) + "..." : name;
            });
    }, [data, dimensions, searchQuery, selectedItem]);

    return (
        <div className="relative">
            <svg
                ref={svgRef}
                width="100%"
                height="600"
                className="drop-shadow-sm"
            />
            {/* L2 Category Tooltip */}
            <div
                ref={tooltipRef}
                className="absolute z-50 px-3 py-1 text-xs font-medium text-white bg-gray-900 rounded-full shadow-lg pointer-events-none whitespace-nowrap"
                style={{ display: "none" }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center bg-background/90 rounded-full p-6 shadow-lg border">
                    <h3 className="text-lg font-semibold text-foreground">
                        AI Safety
                    </h3>
                    <p className="text-sm text-muted-foreground">Taxonomy</p>
                    <div className="text-xs text-muted-foreground mt-2">
                        <span>{data.categories.length}</span> Categories
                    </div>
                </div>
            </div>
        </div>
    );
}
