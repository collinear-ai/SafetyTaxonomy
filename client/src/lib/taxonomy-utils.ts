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
  return {
    name: 'AI Safety Taxonomy',
    children: taxonomyData.categories.map((category) => ({
      name: category.name,
      color: category.color,
      data: category,
      children: category.subcategories.map((subcategory) => ({
        name: subcategory.name,
        value: 1 / category.subcategories.length, // Equal L2 slices, equal L1 total values
        data: subcategory,
        children: subcategory.items.map((item) => ({
          name: item.l3Category,
          value: 1 / subcategory.items.length, // Equal L3 slices within each L2
          data: item,
        })),
      })),
    })),
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
