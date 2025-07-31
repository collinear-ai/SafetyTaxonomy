import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import {
  TaxonomyData,
  TaxonomyCategory,
  TaxonomySubcategory,
  TaxonomyItem,
} from '@shared/schema'
import { createHierarchyData, HierarchyNode } from '@/lib/taxonomy-utils'

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
        const size = Math.min(parentWidth - 24, 600)
        setDimensions({ width: size, height: size })
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!svgRef.current || !data) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const { width, height } = dimensions
    // Use the viewBox dimensions for the circle size, not the responsive container dimensions
    const viewBoxWidth = 600
    const viewBoxHeight = 600
    const radius = Math.min(viewBoxWidth, viewBoxHeight) / 2 - 10 // Use full viewBox with 10px margin

    console.log(
      'Calculated radius:',
      radius,
      'Expected circle diameter:',
      radius * 2,
    )

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
    const root = d3
      .hierarchy(hierarchyData)
      .sum((d) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0))

    // The issue is that D3's partition isn't using our full radius
    // Let's directly control the radial positioning
    const l1InnerRadius = radius * 0.12 // Match centerHoleRadius
    const l1OuterRadius = radius * 0.7 // Give L1 most of the space
    const l2OuterRadius = radius * 0.9 // L2 extends further out
    const l3OuterRadius = radius // L3 goes to the edge

    const partition = d3.partition<HierarchyNode>().size([2 * Math.PI, radius])
    partition(root)

    // Override D3's radial positioning with our custom layout
    root.descendants().forEach((d) => {
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
    const l1Nodes = root.descendants().filter((d) => d.depth === 1)
    if (l1Nodes.length > 0) {
      console.log(
        'L1 node y1 (outer radius) after scaling:',
        l1Nodes[0].y1,
        'Expected:',
        radius,
      )
    }

    // Fix gaps by ensuring children perfectly fill their parent's angular space
    root.descendants().forEach((d) => {
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
      .arc<d3.HierarchyRectangularNode<HierarchyNode>>()
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
    const filteredNodes = root
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

    // Create paths
    const path = g
      .selectAll('path')
      .data(filteredNodes)
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
        if (d.depth === 3) return 'transparent' // L3 has transparent stroke
        return '#fff' // L1 and L2 have white strokes
      })
      .style('stroke-width', (d) => {
        if (d.depth === 1) return 3
        if (d.depth === 2) return 0.5
        return 0 // L3 has no stroke width
      })
      .style('cursor', 'pointer')
      .style('opacity', searchQuery ? 0.6 : 0.8)
      .style('transition', 'fill 0.4s ease')
      .on('mouseover', function (event, d) {
        // Increase opacity for all levels on hover
        d3.select(this).style('opacity', 1)

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
      .data(filteredNodes.filter((d) => d.depth === 1))
      .enter()
      .append('text')
      .attr('class', 'l1-label')
      .attr('transform', (d) => {
        const angle = (d.x0 + d.x1) / 2
        // Move text 15% further out from center for better breathing room
        const ringCenter = (d.y0 + d.y1) / 2
        const textRadius = ringCenter + (d.y1 - d.y0) * 0.15
        const x = Math.cos(angle - Math.PI / 2) * textRadius
        const y = Math.sin(angle - Math.PI / 2) * textRadius

        return `translate(${x},${y})`
      })
      .style('text-anchor', 'middle')
      .style('dominant-baseline', 'middle')
      .style('font-size', (d) => {
        // Larger font sizes for the bigger circle
        const arcAngle = d.x1 - d.x0
        const baseSize = Math.min(14, arcAngle * 80) // Increased scale factor and max size
        return `${Math.max(12, baseSize)}px` // Increased minimum size
      })
      .style('font-weight', '400')
      .style('fill', '#2C2C2C')
      .style('font-family', '"Libre Caslon Display", serif')
      .style('pointer-events', 'none')
      .each(function (d) {
        const text = d3.select(this)
        const name = d.data.name

        // Helper function to create more balanced line breaks
        const createBalancedLines = (words) => {
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
  }, [data, dimensions, searchQuery, selectedItem])

  return (
    <div className='relative'>
      <svg ref={svgRef} width='100%' height='600' className='drop-shadow-sm' />
      {/* L2 Category Tooltip */}
      <div
        ref={tooltipRef}
        className='absolute z-50 px-3 py-1 text-xs font-medium text-white bg-gray-900 rounded-full shadow-lg pointer-events-none whitespace-nowrap'
        style={{ display: 'none' }}
      />
      <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
        <div className='flex flex-col items-center justify-center text-center bg-background rounded-full p-6 shadow-lg w-[160px] h-[160px]'>
          <h3 className='text-lg font-semibold text-foreground libre-caslon-display-regular'>
            Collinear AI
          </h3>
          <p className='text-sm text-muted-foreground libre-caslon-display-regular mt-1'>
            Safety Taxonomy
          </p>
        </div>
      </div>
    </div>
  )
}
