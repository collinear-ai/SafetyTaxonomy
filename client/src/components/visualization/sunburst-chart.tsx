import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import {
  TaxonomyData,
  TaxonomyCategory,
  TaxonomySubcategory,
  TaxonomyItem,
} from '@shared/schema'
import { createHierarchyData, HierarchyNode } from '@/lib/taxonomy-utils'

// Extended type to include partition layout properties
type PartitionNode = d3.HierarchyRectangularNode<HierarchyNode>

interface SunburstChartProps {
  data: TaxonomyData
  onSelectionChange: (
    selected: TaxonomyCategory | TaxonomySubcategory | TaxonomyItem | null,
  ) => void
  searchQuery: string
  selectedItem: TaxonomyCategory | TaxonomySubcategory | TaxonomyItem | null
}

export function SunburstChart({
  data,
  onSelectionChange,
  searchQuery,
  selectedItem,
}: SunburstChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 600, height: 600 })

  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current?.parentElement) {
        const parentWidth = svgRef.current.parentElement.clientWidth
        const parentHeight = svgRef.current.parentElement.clientHeight
        const size = Math.min(parentWidth - 24, parentHeight - 24)
        setDimensions({ width: size, height: size })
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    console.log('data', data, selectedItem)
    if (!svgRef.current || !data) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const { width, height } = dimensions
    // Use the viewBox dimensions for the circle size, not the responsive container dimensions
    const viewBoxWidth = width
    const viewBoxHeight = height
    const radius = Math.min(viewBoxWidth, viewBoxHeight) / 2 - 10 // Use full viewBox with 10px margin

    // console.log(
    //   'Calculated radius:',
    //   radius,
    //   'Expected circle diameter:',
    //   radius * 2,
    // )

    const g = svg
      .attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
      .on('click', function (event) {
        // Deselect if clicking on background (not on any path)
        if (event.target === this) {
          onSelectionChange(null)
        }
      })
      .append('g')
      .attr('transform', `translate(${viewBoxWidth / 2},${viewBoxHeight / 2})`)

    // Create hierarchy data
    const hierarchyData = createHierarchyData(data)
    const root = d3.hierarchy(hierarchyData).sum((d) => d.value || 0)
    // Removed .sort() to preserve original data order

    // The issue is that D3's partition isn't using our full radius
    // Let's directly control the radial positioning
    const l1InnerRadius = radius * 0.12 // Match centerHoleRadius

    // Adjust ring sizes based on whether we have a selection
    let l1OuterRadius, l2OuterRadius, l3OuterRadius
    if (selectedItem) {
      // When selected: make L1 smaller, L2 and L3 bigger for better detail view
      l1OuterRadius = radius * 0.45 // Reduced from 0.7 - much smaller L1 ring
      l2OuterRadius = radius * 0.75 // Increased from 0.9 - bigger L2 ring
      l3OuterRadius = radius // L3 still goes to the edge but gets more space
    } else {
      // Default sizes for full view
      l1OuterRadius = radius * 0.7 // Give L1 most of the space
      l2OuterRadius = radius * 0.9 // L2 extends further out
      l3OuterRadius = radius // L3 goes to the edge
    }

    const partition = d3.partition<HierarchyNode>().size([2 * Math.PI, radius])
    const partitionedRoot = partition(root) as PartitionNode

    // Override D3's radial positioning with our custom layout
    partitionedRoot.descendants().forEach((d) => {
      if (d.depth === 1) {
        d.y0 = l1InnerRadius
        d.y1 = l1OuterRadius
      } else if (d.depth === 2) {
        d.y0 = l1OuterRadius
        d.y1 = l2OuterRadius
      } else if (d.depth === 3) {
        d.y0 = l2OuterRadius
        d.y1 = l3OuterRadius
      }
    })

    // Debug: Check what the partition layout is generating after scaling
    const l1Nodes = partitionedRoot.descendants().filter((d) => d.depth === 1)
    if (l1Nodes.length > 0) {
      console.log(
        'L1 node y1 (outer radius) after scaling:',
        l1Nodes[0].y1,
        'Expected:',
        radius,
      )
    }

    // Fix gaps by ensuring children perfectly fill their parent's angular space
    partitionedRoot.descendants().forEach((d) => {
      if (d.children && d.children.length > 0) {
        // For any node with children, ensure children perfectly span the parent's angular range
        const parentAngularSize = d.x1 - d.x0
        const childCount = d.children.length
        const childAngularSize = parentAngularSize / childCount

        d.children.forEach((child, index) => {
          child.x0 = d.x0 + index * childAngularSize
          child.x1 = d.x0 + (index + 1) * childAngularSize
        })
      }
    })

    // Small fixed inner circle - just bigger than center text
    const centerHoleRadius = radius * 0.12 // Smaller hole for smaller chart

    const arc = d3
      .arc<PartitionNode>()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .innerRadius((d) => d.y0) // Use the custom radial positioning we set
      .outerRadius((d) => {
        if (d.depth === 3) {
          // L3 gets 30% of the L3 ring space (50% bigger than the original 20%)
          const l3RingHeight = l3OuterRadius - l2OuterRadius
          const reducedHeight = l3RingHeight * 0.3
          return l2OuterRadius + reducedHeight
        }
        return d.y1
      })

    // Filter based on search
    const filteredNodes = partitionedRoot
      .descendants()
      .slice(1)
      .filter((d) => {
        if (!searchQuery.trim()) return true
        const query = searchQuery.toLowerCase()

        if (d.data.data && 'items' in d.data.data) {
          const subcategory = d.data.data as TaxonomySubcategory
          return (
            subcategory.name.toLowerCase().includes(query) ||
            subcategory.items.some(
              (item) =>
                item.l3Category.toLowerCase().includes(query) ||
                item.example.toLowerCase().includes(query) ||
                item.frameworks.some((fw) => fw.toLowerCase().includes(query)),
            )
          )
        }

        if (d.data.data && 'subcategories' in d.data.data) {
          const category = d.data.data as TaxonomyCategory
          return (
            category.name.toLowerCase().includes(query) ||
            category.subcategories.some(
              (sub) =>
                sub.name.toLowerCase().includes(query) ||
                sub.items.some(
                  (item) =>
                    item.l3Category.toLowerCase().includes(query) ||
                    item.example.toLowerCase().includes(query) ||
                    item.frameworks.some((fw) =>
                      fw.toLowerCase().includes(query),
                    ),
                ),
            )
          )
        }

        return d.data.name.toLowerCase().includes(query)
      })

    // Filter nodes to show only selected L1 slice when zoomed
    let displayNodes = filteredNodes
    let isZoomed = false

    if (selectedItem) {
      // Find the target L1 section based on selected item
      let targetL1Name: string | undefined

      if ('subcategories' in selectedItem) {
        // L1 selected
        targetL1Name = selectedItem.name
      } else if ('items' in selectedItem) {
        // L2 selected - find parent L1
        const parentL1 = data.categories.find((cat) =>
          cat.subcategories.some((sub) => sub.name === selectedItem.name),
        )
        targetL1Name = parentL1?.name
      } else {
        // L3 selected - find parent L1
        const parentL1 = data.categories.find((cat) =>
          cat.subcategories.some((sub) =>
            sub.items.some((item) => item.id === selectedItem.id),
          ),
        )
        targetL1Name = parentL1?.name
      }

      // Filter to show only the selected L1 slice and its children
      if (targetL1Name) {
        displayNodes = filteredNodes.filter((d) => {
          if (d.depth === 1) {
            return d.data.name === targetL1Name
          } else if (d.depth === 2) {
            return d.parent?.data.name === targetL1Name
          } else if (d.depth === 3) {
            return d.parent?.parent?.data.name === targetL1Name
          }
          return false
        })
        isZoomed = true

        // Recalculate the angles for the focused slice to center it and expand it
        const targetL1Node = displayNodes.find((d) => d.depth === 1)
        if (targetL1Node) {
          const originalAngularSize = targetL1Node.x1 - targetL1Node.x0
          const originalStartAngle = targetL1Node.x0

          // Expand the slice to fill more of the circle (about 80% of 2π)
          const newAngularSize = Math.PI * 1.6
          const newStartAngle = -newAngularSize / 2
          const newEndAngle = newAngularSize / 2

          // Update the L1 node angles
          targetL1Node.x0 = newStartAngle
          targetL1Node.x1 = newEndAngle

          // Recalculate child angles proportionally
          const l2Nodes = displayNodes.filter((d) => d.depth === 2)
          l2Nodes.forEach((l2Node) => {
            const originalL2Start = l2Node.x0
            const originalL2End = l2Node.x1
            const proportionStart =
              (originalL2Start - originalStartAngle) / originalAngularSize
            const proportionEnd =
              (originalL2End - originalStartAngle) / originalAngularSize

            l2Node.x0 = newStartAngle + proportionStart * newAngularSize
            l2Node.x1 = newStartAngle + proportionEnd * newAngularSize

            // Update L3 children of this L2
            const l3Children = displayNodes.filter(
              (d) => d.depth === 3 && d.parent === l2Node,
            )
            l3Children.forEach((l3Node) => {
              const originalL3Start = l3Node.x0
              const originalL3End = l3Node.x1
              const l3ProportionStart =
                (originalL3Start - originalL2Start) /
                (originalL2End - originalL2Start)
              const l3ProportionEnd =
                (originalL3End - originalL2Start) /
                (originalL2End - originalL2Start)

              l3Node.x0 =
                l2Node.x0 + l3ProportionStart * (l2Node.x1 - l2Node.x0)
              l3Node.x1 = l2Node.x0 + l3ProportionEnd * (l2Node.x1 - l2Node.x0)
            })
          })
        }
      }
    }

    // Set transform (always centered, no zoom transform needed since we're filtering nodes)
    g.attr('transform', `translate(${viewBoxWidth / 2},${viewBoxHeight / 2})`)

    // Create paths
    const path = g
      .selectAll('path')
      .data(displayNodes)
      .enter()
      .append('path')
      .attr('d', arc)
      .style('fill', (d) => {
        // Determine if this node should be grayed out
        const shouldGrayOut = () => {
          if (!selectedItem) return false

          if (d.depth === 1) {
            // For L1 categories
            const currentL1Name = d.data.name

            if ('subcategories' in selectedItem) {
              // Selected item is an L1 category
              return currentL1Name !== selectedItem.name
            } else if ('items' in selectedItem) {
              // Selected item is an L2 category - find its parent L1
              const parentL1 = data.categories.find((cat) =>
                cat.subcategories.some((sub) => sub.name === selectedItem.name),
              )
              return currentL1Name !== parentL1?.name
            } else {
              // Selected item is an L3/item - find its parent L1
              const parentL1 = data.categories.find((cat) =>
                cat.subcategories.some((sub) =>
                  sub.items.some((item) => item.id === selectedItem.id),
                ),
              )
              return currentL1Name !== parentL1?.name
            }
          } else if (d.depth === 2) {
            // For L2 categories
            const parentL1Name = d.parent?.data.name
            const currentL2Name = d.data.name

            if ('subcategories' in selectedItem) {
              // Selected item is an L1 category - gray out if different L1
              return parentL1Name !== selectedItem.name
            } else if ('items' in selectedItem) {
              // Selected item is an L2 category
              const parentL1 = data.categories.find((cat) =>
                cat.subcategories.some((sub) => sub.name === selectedItem.name),
              )

              // Gray out if different L1 OR if same L1 but different L2
              if (parentL1Name !== parentL1?.name) {
                return true // Different L1, so gray out
              } else {
                return currentL2Name !== selectedItem.name // Same L1, gray out if different L2
              }
            } else {
              // Selected item is an L3/item - find its parent L1 and L2
              const parentL1 = data.categories.find((cat) =>
                cat.subcategories.some((sub) =>
                  sub.items.some((item) => item.id === selectedItem.id),
                ),
              )
              const parentL2 = parentL1?.subcategories.find((sub) =>
                sub.items.some((item) => item.id === selectedItem.id),
              )

              // Gray out if different L1 OR if same L1 but different L2
              if (parentL1Name !== parentL1?.name) {
                return true // Different L1, so gray out
              } else {
                return currentL2Name !== parentL2?.name // Same L1, gray out if different L2
              }
            }
          } else {
            // For L3 categories
            const parentL1Name = d.parent?.parent?.data.name
            const parentL2Name = d.parent?.data.name
            const currentL3Name = d.data.name

            if ('subcategories' in selectedItem) {
              // Selected item is an L1 category - gray out if different L1
              return parentL1Name !== selectedItem.name
            } else if ('items' in selectedItem) {
              // Selected item is an L2 category - find its parent L1
              const parentL1 = data.categories.find((cat) =>
                cat.subcategories.some((sub) => sub.name === selectedItem.name),
              )

              // Gray out if different L1 OR if same L1 but different L2
              if (parentL1Name !== parentL1?.name) {
                return true // Different L1, so gray out
              } else {
                return parentL2Name !== selectedItem.name // Same L1, gray out if different L2
              }
            } else {
              // Selected item is an L3/item
              const parentL1 = data.categories.find((cat) =>
                cat.subcategories.some((sub) =>
                  sub.items.some((item) => item.id === selectedItem.id),
                ),
              )
              const parentL2 = parentL1?.subcategories.find((sub) =>
                sub.items.some((item) => item.id === selectedItem.id),
              )

              // Gray out if different L1 OR different L2 OR different L3
              if (parentL1Name !== parentL1?.name) {
                return true // Different L1, so gray out
              } else if (parentL2Name !== parentL2?.name) {
                return true // Different L2, so gray out
              } else {
                return currentL3Name !== selectedItem.l3Category // Same L1 and L2, gray out if different L3
              }
            }
          }
        }

        const isGrayed = shouldGrayOut()

        if (d.depth === 1) {
          // L1 categories - use their specific colors
          const baseColor = d.data.color || '#3B82F6'
          return isGrayed ? 'hsl(0, 0%, 80%)' : baseColor
        } else if (d.depth === 2) {
          // L2 categories - gradient from light to dark orange
          if (isGrayed) {
            return 'hsl(0, 0%, 85%)'
          }

          const siblings = d.parent?.children || []
          const currentIndex = siblings.findIndex((sibling) => sibling === d)
          const totalSiblings = siblings.length

          if (totalSiblings <= 1) {
            return 'hsl(23.25deg 93.02% 83.14%)' // Default to light orange if only one
          }

          // Calculate gradient position (0 = light, 1 = dark)
          const gradientPosition = currentIndex / (totalSiblings - 1)

          // Interpolate between light orange and dark orange
          // Light: hsl(23.25deg 93.02% 83.14%)
          // Dark: hsl(17.56deg 88.74% 45%)
          const lightness = 83.14 - gradientPosition * (83.14 - 45)
          const saturation = 93.02 - gradientPosition * (93.02 - 88.74)
          const hue = 23.25 - gradientPosition * (23.25 - 17.56)

          return `hsl(${hue}deg ${saturation}% ${lightness}%)`
        } else {
          // L3 categories - darker orange for better visibility
          if (isGrayed) {
            return 'hsl(0, 0%, 90%)'
          }
          return 'hsl(23.25deg 93.02% 75%)' // Darker orange for L3 (was 90%)
        }
      })
      .style('stroke', (d) => {
        // if (d.depth === 3) return 'transparent' // L3 has transparent stroke
        return '#fff' // L1 and L2 have white strokes
      })
      .style('stroke-width', (d) => {
        if (d.depth === 1) return 3
        if (d.depth === 2) return 0.5
        return 0.5 // L3 has no stroke width
      })
      .style('cursor', 'pointer')
      .style('opacity', searchQuery ? 0.6 : 0.8)
      .style('transition', 'fill 0.4s ease')
      .on('mouseover', function (event, d) {
        // Increase opacity for all levels on hover
        d3.select(this).style('opacity', 1)

        // Enhanced hover color for L3 categories
        if (d.depth === 3) {
          // Check if parent L2 is selected
          const parentL2 = d.parent?.data.data as
            | TaxonomySubcategory
            | undefined
          const isParentL2Selected =
            selectedItem &&
            'items' in selectedItem &&
            parentL2?.name === selectedItem.name

          if (isParentL2Selected) {
            // Vibrant orange when parent L2 is selected
            d3.select(this).style('fill', 'hsl(17.56deg 88.74% 60%)')
          } else {
            // Slightly more vibrant than default for general hover
            d3.select(this).style('fill', 'hsl(23.25deg 93.02% 65%)')
          }
        }

        // Show tooltip for L2 and L3 categories
        if ((d.depth === 2 || d.depth === 3) && tooltipRef.current) {
          const tooltip = tooltipRef.current
          tooltip.textContent = d.data.name
          tooltip.style.display = 'block'

          // Get mouse position relative to the parent container
          const containerRect =
            svgRef.current!.parentElement!.getBoundingClientRect()
          const mouseX = event.clientX - containerRect.left
          const mouseY = event.clientY - containerRect.top

          tooltip.style.left = `${mouseX + 10}px`
          tooltip.style.top = `${mouseY - 30}px`
          tooltip.style.transform = 'none'
        }
      })
      .on('mousemove', function (event, d) {
        // Update tooltip position on mouse move for L2 and L3 categories
        if ((d.depth === 2 || d.depth === 3) && tooltipRef.current) {
          const tooltip = tooltipRef.current
          const containerRect =
            svgRef.current!.parentElement!.getBoundingClientRect()
          const mouseX = event.clientX - containerRect.left
          const mouseY = event.clientY - containerRect.top

          tooltip.style.left = `${mouseX + 10}px`
          tooltip.style.top = `${mouseY - 30}px`
        }
      })
      .on('mouseout', function (event, d) {
        d3.select(this).style('opacity', searchQuery ? 0.6 : 0.8)

        // Restore original color for L3 categories on mouse out
        if (d.depth === 3) {
          // Check if this L3 should be grayed out
          const shouldGrayOut = () => {
            if (!selectedItem) return false
            if ('subcategories' in selectedItem) {
              // L1 selected - gray out if different L1
              const parentL1Name = d.parent?.parent?.data.name
              return parentL1Name !== selectedItem.name
            } else if ('items' in selectedItem) {
              // L2 selected - gray out if different L2
              const parentL2 = d.parent?.data.data as
                | TaxonomySubcategory
                | undefined
              return parentL2?.name !== selectedItem.name
            } else {
              // L3 selected - gray out if not this L3
              const currentItem = d.data.data as TaxonomyItem
              return currentItem.id !== selectedItem.id
            }
          }

          if (shouldGrayOut()) {
            d3.select(this).style('fill', 'hsl(0, 0%, 90%)')
          } else {
            d3.select(this).style('fill', 'hsl(23.25deg 93.02% 75%)')
          }
        }

        // Hide tooltip for L2 and L3 categories
        if ((d.depth === 2 || d.depth === 3) && tooltipRef.current) {
          tooltipRef.current.style.display = 'none'
        }
      })
      .on('click', function (event, d) {
        if (d.data.data) {
          const clickedItem = d.data.data as
            | TaxonomyCategory
            | TaxonomySubcategory
            | TaxonomyItem
          // If clicking the same item, deselect it
          if (
            selectedItem &&
            (selectedItem === clickedItem ||
              ('name' in selectedItem &&
                'name' in clickedItem &&
                selectedItem.name === clickedItem.name))
          ) {
            onSelectionChange(null)
          } else {
            onSelectionChange(clickedItem)
          }
        }
      })

    // Add text labels directly in L1 segments
    g.selectAll('text.l1-label')
      .data(displayNodes.filter((d) => d.depth === 1))
      .enter()
      .append('text')
      .attr('class', 'l1-label')
      .attr('transform', (d) => {
        const angle = (d.x0 + d.x1) / 2
        // Responsive text positioning based on screen size
        const screenScale = Math.min(width, height) / 800
        const ringCenter = (d.y0 + d.y1) / 2
        // Adjust text offset based on screen size - closer to center on smaller screens
        const textOffsetRatio = isZoomed
          ? 0.11
          : Math.max(0.08, 0.09 * screenScale)
        const textRadius = ringCenter + (d.y1 - d.y0) * textOffsetRatio
        const x = Math.cos(angle - Math.PI / 2) * textRadius
        let y = Math.sin(angle - Math.PI / 2) * textRadius

        if (isZoomed) {
          y = Math.sin(angle - Math.PI / 2) * textRadius * 0.85
        }

        return `translate(${x},${y})`
      })
      .style('text-anchor', 'middle')
      .style('dominant-baseline', 'middle')
      .style('font-size', (d) => {
        // Screen size responsive scaling
        const screenScale = Math.min(width, height) / 800 // Scale factor based on chart size

        // Much larger font sizes when zoomed to individual slice
        if (isZoomed) {
          const arcAngle = d.x1 - d.x0
          const baseSize = Math.min(
            20 * screenScale,
            arcAngle * 100 * screenScale,
          )
          return `${Math.max(16 * screenScale, baseSize)}px`
        } else {
          // Normal sizes for full view - responsive to screen size
          const arcAngle = d.x1 - d.x0
          const baseSize = Math.min(
            16 * screenScale,
            arcAngle * 50 * screenScale,
          )
          // Minimum font size scales with screen: 12px for small screens, up to 20px for large
          const minSize = Math.max(12, Math.min(20, 14 * screenScale))
          return `${Math.max(minSize, baseSize)}px`
        }
      })
      .style('font-weight', '450')
      .style('fill', '#2C2C2C')
      // .style('font-family', '"Libre Caslon Display", serif')
      .style('pointer-events', 'none')
      .each(function (d) {
        const text = d3.select(this)
        const name = d.data.name

        // Helper function to create more balanced line breaks
        const createBalancedLines = (words: string[]) => {
          if (words.length <= 2) return [words.join(' ')]

          const totalChars = words.join(' ').length
          const targetLineLength = Math.ceil(totalChars / 2)

          let line1 = ''
          let line2 = ''
          let currentLength = 0

          for (let i = 0; i < words.length; i++) {
            const wordWithSpace = (i === 0 ? '' : ' ') + words[i]
            const newLength = currentLength + wordWithSpace.length

            // If adding this word would exceed target and we have at least one word
            if (newLength > targetLineLength && line1.length > 0) {
              line2 = words.slice(i).join(' ')
              break
            } else {
              line1 += wordWithSpace
              currentLength = newLength
            }
          }

          // If line2 is empty, split at midpoint
          if (!line2) {
            const midPoint = Math.ceil(words.length / 2)
            line1 = words.slice(0, midPoint).join(' ')
            line2 = words.slice(midPoint).join(' ')
          }

          return [line1, line2]
        }

        // Split long names into multiple lines for better readability
        const words = name.split(' ')
        if (words.length > 2 && name.length > 20) {
          text.text('') // Clear existing text

          const [line1, line2] = createBalancedLines(words)

          // Add first tspan
          text.append('tspan').attr('x', 0).attr('dy', '-0.4em').text(line1)

          // Add second tspan
          text.append('tspan').attr('x', 0).attr('dy', '1.2em').text(line2)
        } else {
          // Keep single line for shorter names
          text.text(name.length > 30 ? name.substring(0, 27) + '...' : name)
        }
      })

    // Add L2 labels when any item is selected (L1, L2, or L3)
    const isL1Selected = selectedItem && 'subcategories' in selectedItem
    const isL2Selected = selectedItem && 'items' in selectedItem
    const isL3Selected = selectedItem && 'l3Category' in selectedItem

    if (isL1Selected || isL2Selected || isL3Selected) {
      let selectedL2Nodes: PartitionNode[]

      if (isL1Selected) {
        // Show all L2 categories within the selected L1
        selectedL2Nodes = displayNodes.filter((d) => d.depth === 2)
      } else if (isL2Selected) {
        const selectedL2 = selectedItem as TaxonomySubcategory
        // Find the L2 nodes that belong to the selected L2 category
        selectedL2Nodes = displayNodes.filter((d) => {
          return (
            d.depth === 2 &&
            d.data.data &&
            'items' in d.data.data &&
            (d.data.data as TaxonomySubcategory).name === selectedL2.name
          )
        })
      } else {
        // Find the parent L2 category for the selected L3 item
        const selectedL3 = selectedItem as TaxonomyItem
        const parentL1 = data.categories.find((cat) =>
          cat.subcategories.some((sub) =>
            sub.items.some((item) => item.id === selectedL3.id),
          ),
        )
        const selectedL2 = parentL1?.subcategories.find((sub) =>
          sub.items.some((item) => item.id === selectedL3.id),
        )!

        selectedL2Nodes = displayNodes.filter((d) => {
          return (
            d.depth === 2 &&
            d.data.data &&
            'items' in d.data.data &&
            (d.data.data as TaxonomySubcategory).name === selectedL2.name
          )
        })
      }

      g.selectAll('text.l2-label')
        .data(selectedL2Nodes)
        .enter()
        .append('text')
        .attr('class', 'l2-label')
        .attr('transform', (d) => {
          const angle = (d.x0 + d.x1) / 2
          // Position text closer to the inner edge of the L2 ring
          const ringInner = d.y0
          const ringOuter = d.y1
          const textRadius = ringInner + (ringOuter - ringInner) * 0.15 // 15% from inner edge
          const x = Math.cos(angle - Math.PI / 2) * textRadius
          const y = Math.sin(angle - Math.PI / 2) * textRadius

          // Calculate rotation for radial text that's always readable
          // Start with the angle aligned to point outward from center
          let rotationAngle = (angle * 180) / Math.PI - 90

          // Simple rule: if the final rotation would make text upside down (between 90° and 270°), flip it
          // Normalize first to 0-360 range
          while (rotationAngle < 0) rotationAngle += 360
          while (rotationAngle >= 360) rotationAngle -= 360

          // If text would be upside down, rotate 180° to flip it
          if (rotationAngle > 90 && rotationAngle < 270) {
            rotationAngle += 180
          }

          // Final normalization to -180 to 180 range for consistency
          if (rotationAngle > 180) rotationAngle -= 360

          return `translate(${x},${y}) rotate(${rotationAngle})`
        })
        .style('text-anchor', (d) => {
          const angle = (d.x0 + d.x1) / 2

          // Calculate if text is flipped to determine alignment
          let rotationAngle = (angle * 180) / Math.PI - 90
          while (rotationAngle < 0) rotationAngle += 360
          while (rotationAngle >= 360) rotationAngle -= 360

          let isFlipped = false
          if (rotationAngle > 90 && rotationAngle < 270) {
            isFlipped = true
          }

          // For radial L2 labels, use start/end alignment based on position and flip
          if (isFlipped) {
            // Flipped text: right side should be left-aligned, left side right-aligned
            return angle < Math.PI ? 'end' : 'start'
          } else {
            // Normal text: right side should be right-aligned, left side left-aligned
            return angle < Math.PI ? 'start' : 'end'
          }
        })
        .style('dominant-baseline', 'central')
        .style('font-size', (d) => {
          // Font size that fits within the radial section
          const arcAngle = d.x1 - d.x0
          const ringWidth = d.y1 - d.y0

          // Scale based on both angular size and radial width
          const angularScale = Math.min(18, arcAngle * 120)
          const radialScale = Math.min(16, ringWidth * 0.8)
          const baseSize = Math.min(angularScale, radialScale)

          return `${Math.max(10, baseSize)}px`
        })
        .style('font-weight', '500')
        .style('fill', '#2C2C2C')
        .style('font-family', 'system-ui, -apple-system, sans-serif')
        .style('pointer-events', 'none')
        .each(function (d) {
          const text = d3.select(this)
          const name = d.data.name

          // Get the calculated font size for this element
          const arcAngle = d.x1 - d.x0
          const ringWidth = d.y1 - d.y0
          const angularScale = Math.min(18, arcAngle * 120)
          const radialScale = Math.min(16, ringWidth * 0.8)
          const baseSize = Math.min(angularScale, radialScale)
          const fontSize = Math.max(10, baseSize)

          // Helper function for L2 label text wrapping based on radial constraints
          const createL2Lines = (words: string[]) => {
            const fullText = words.join(' ')

            // Estimate text width in pixels (rough approximation)
            const charWidth = fontSize * 0.6 // Average character width for sans-serif
            const estimatedTextWidth = fullText.length * charWidth

            // Calculate available radial space (the "height" for rotated text)
            const availableRadialSpace = ringWidth * 0.8 // Leave some padding

            // If text fits in one line, use it
            if (estimatedTextWidth <= availableRadialSpace) {
              return [fullText]
            }

            // Calculate how many characters can fit per line
            const charsPerLine = Math.floor(availableRadialSpace / charWidth)

            // For very small sections, truncate to fit
            if (charsPerLine < 8) {
              return [
                fullText.substring(0, Math.max(4, charsPerLine - 3)) + '...',
              ]
            }

            // Split into multiple lines intelligently
            const lines: string[] = []
            let remainingWords = [...words]

            while (remainingWords.length > 0 && lines.length < 3) {
              // Max 3 lines
              let currentLine = ''
              let wordsInLine: string[] = []

              // Add words until we would exceed the line length
              for (let i = 0; i < remainingWords.length; i++) {
                const testLine =
                  wordsInLine.length === 0
                    ? remainingWords[i]
                    : wordsInLine.join(' ') + ' ' + remainingWords[i]

                if (testLine.length * charWidth <= availableRadialSpace) {
                  wordsInLine.push(remainingWords[i])
                  currentLine = testLine
                } else {
                  break
                }
              }

              // If we couldn't fit even one word, truncate it
              if (wordsInLine.length === 0 && remainingWords.length > 0) {
                const word = remainingWords[0]
                const maxChars =
                  Math.floor(availableRadialSpace / charWidth) - 3
                currentLine = word.substring(0, Math.max(3, maxChars)) + '...'
                remainingWords = remainingWords.slice(1)
              } else {
                remainingWords = remainingWords.slice(wordsInLine.length)
              }

              if (currentLine) {
                lines.push(currentLine)
              }
            }

            return lines.length > 0 ? lines : [fullText.substring(0, 4) + '...']
          }

          const words = name.split(' ')
          text.text('') // Clear existing text
          const lines = createL2Lines(words)

          if (lines.length === 1) {
            // Single line - no need for tspans
            text.text(lines[0])
          } else {
            // Multiple lines - use tspans
            lines.forEach((line, index) => {
              const dy =
                index === 0 ? `-${(lines.length - 1) * 0.6}em` : '1.2em'
              text.append('tspan').attr('x', 0).attr('dy', dy).text(line)
            })
          }
        })
    }

    // Add L3 numbers when zoomed (always visible in zoomed state)
    if (isZoomed) {
      // Get all L3 nodes when zoomed
      const l3Nodes = displayNodes.filter((d) => d.depth === 3)

      // Add numbers to L3 sections inside the circle
      g.selectAll('text.l3-number')
        .data(l3Nodes)
        .enter()
        .append('text')
        .attr('class', 'l3-number')
        .attr('transform', (d) => {
          const angle = (d.x0 + d.x1) / 2
          // Position numbers inside the L3 ring
          const ringInner = d.y0
          const ringOuter = d.y1
          const numberRadius = ringInner + (ringOuter - ringInner) * 0.15 // Center of ring
          const x = Math.cos(angle - Math.PI / 2) * numberRadius
          const y = Math.sin(angle - Math.PI / 2) * numberRadius
          return `translate(${x},${y})`
        })
        .style('text-anchor', 'middle')
        .style('dominant-baseline', 'central')
        .style('font-size', (d) => {
          // Font size based on section size
          const arcAngle = d.x1 - d.x0
          const ringWidth = d.y1 - d.y0
          const baseSize = Math.min(14, arcAngle * 100)
          return `${Math.max(10, baseSize)}px`
        })
        .style('font-weight', '600')
        .style('fill', '#1f2937')
        .style('font-family', 'system-ui, -apple-system, sans-serif')
        .style('pointer-events', 'none')
        .text((d, i) => i + 1) // Number starting from 1
    }

    // L3 text labels removed - only keeping L3 numbers
  }, [data, dimensions, searchQuery, selectedItem])

  return (
    <div className='relative min-h-[calc(100vh-5rem)]'>
      <svg
        className='absolute inset-0'
        ref={svgRef}
        width='100%'
        height='100%'
      />
      {/* L2 Category Tooltip */}
      <div
        ref={tooltipRef}
        className='absolute z-50 px-3 py-1 text-xs font-medium text-white bg-gray-900 rounded-full shadow-lg pointer-events-none whitespace-nowrap'
        style={{ display: 'none' }}
      />
      <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
        <div className='flex flex-col items-center justify-center text-center bg-background rounded-full shadow-lg w-[130px] h-[130px] [@media(min-height:950px)]:w-[160px] [@media(min-height:950px)]:h-[160px]'>
          <h3 className='text-base [@media(min-height:950px)]:text-lg font-semibold text-foreground'>
            Collinear AI
          </h3>
          <p className='text-xs [@media(min-height:950px)]:text-sm text-muted-foreground mt-0.5'>
            Safety Taxonomy
          </p>
        </div>
      </div>
    </div>
  )
}
