import {
  TaxonomyData,
  TaxonomyCategory,
  TaxonomySubcategory,
  TaxonomyItem,
} from '@shared/schema'

export interface HierarchyNode {
  name: string
  color?: string
  value?: number
  data?: TaxonomyItem | TaxonomySubcategory | TaxonomyCategory
  children?: HierarchyNode[]
}

export function createHierarchyData(taxonomyData: TaxonomyData): HierarchyNode {
  const totalCategories = taxonomyData.categories.length

  return {
    name: 'AI Safety Taxonomy',
    children: taxonomyData.categories.map((category, categoryIndex) => {
      // Calculate precise L2 values that sum exactly to the L1 value
      const l2Count = category.subcategories.length
      const baseL2Value = 1 / l2Count

      return {
        name: category.name,
        color: category.color,
        value: 1, // Equal L1 slices - all L1 categories get same size
        data: category,
        children: category.subcategories.map((subcategory, subIndex) => {
          // Calculate precise L3 values that sum exactly to the L2 value
          const l3Count = subcategory.items.length
          const baseL3Value = baseL2Value / l3Count

          return {
            name: subcategory.name,
            value: baseL2Value, // Precise L2 value
            data: subcategory,
            children: subcategory.items.map((item, itemIndex) => ({
              name: item.l3Category,
              value: baseL3Value, // Precise L3 value
              data: item,
            })),
          }
        }),
      }
    }),
  }
}

export function searchTaxonomy(
  taxonomyData: TaxonomyData,
  query: string,
): TaxonomyItem[] {
  if (!query.trim()) return []

  const lowerQuery = query.toLowerCase()
  const results: TaxonomyItem[] = []

  taxonomyData.categories.forEach((category) => {
    category.subcategories.forEach((subcategory) => {
      subcategory.items.forEach((item) => {
        if (
          item.l1Category.toLowerCase().includes(lowerQuery) ||
          item.l2Category.toLowerCase().includes(lowerQuery) ||
          item.l3Category.toLowerCase().includes(lowerQuery) ||
          item.example.toLowerCase().includes(lowerQuery) ||
          item.frameworks.some((fw) => fw.toLowerCase().includes(lowerQuery))
        ) {
          results.push(item)
        }
      })
    })
  })

  return results
}

export function getFrameworkColor(framework: string): string {
  const colors = {
    OWASP: 'hsl(340, 82%, 52%)',
    NIST: 'hsl(262, 83%, 58%)',
    'EU AI Act': 'hsl(221, 83%, 53%)',
    'US EO 14110': 'hsl(158, 64%, 52%)',
    'UK AI Whitepaper': 'hsl(24, 95%, 53%)',
  }
  return colors[framework as keyof typeof colors] || 'hsl(200, 50%, 50%)'
}
