import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { FrameworkBadge } from '@/components/ui/framework-badge'
import {
  TaxonomyData,
  TaxonomyCategory,
  TaxonomySubcategory,
  TaxonomyItem,
  Framework,
} from '@shared/schema'

export function ListView({
  data,
  searchResults,
  searchQuery,
  onSelectionChange,
}: {
  data: TaxonomyData
  searchResults: TaxonomyItem[]
  searchQuery: string
  onSelectionChange: (
    selected: TaxonomyCategory | TaxonomySubcategory | TaxonomyItem,
  ) => void
}) {
  const displayData = searchQuery
    ? // Group search results by category and subcategory
      searchResults.reduce((acc, item) => {
        const existingL1 = acc.find((cat) => cat.name === item.l1Category)
        if (existingL1) {
          const existingL2 = existingL1.subcategories.find(
            (sub) => sub.name === item.l2Category,
          )
          if (existingL2) {
            existingL2.items.push(item)
          } else {
            existingL1.subcategories.push({
              name: item.l2Category,
              items: [item],
              frameworkCoverage: {
                OWASP: 0,
                NIST: 0,
                'EU AI Act': 0,
                'US EO 14110': 0,
                'UK AI Whitepaper': 0,
              } as Record<Framework, number>,
            })
          }
        } else {
          const originalCategory = data.categories.find(
            (cat) => cat.name === item.l1Category,
          )
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
                    'EU AI Act': 0,
                    'US EO 14110': 0,
                    'UK AI Whitepaper': 0,
                  } as Record<Framework, number>,
                },
              ],
            })
          }
        }
        return acc
      }, [] as TaxonomyCategory[])
    : data.categories

  return (
    <div className='space-y-4'>
      {displayData.map((category) => (
        <Card key={category.name} className='overflow-hidden'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle className='text-base'>{category.name}</CardTitle>
              <div className='flex items-center space-x-2'>
                <span className='text-xs text-muted-foreground'>
                  {category.subcategories.length} subcategories,{' '}
                  {category.subcategories.reduce(
                    (sum, sub) => sum + sub.items.length,
                    0,
                  )}{' '}
                  items
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className='p-4 space-y-4'>
            {category.subcategories.map((subcategory) => (
              <div
                key={subcategory.name}
                className='space-y-2 border rounded-md p-4'
              >
                <div className='flex items-center justify-between'>
                  <h3 className='text-sm font-semibold text-foreground'>
                    {subcategory.name}
                  </h3>
                  <span className='text-xs text-muted-foreground'>
                    {subcategory.items.length} items
                  </span>
                </div>
                <ol className='ml-4'>
                  {subcategory.items.map((item) => (
                    <li
                      key={item.id}
                      className='flex items-start justify-between p-1 bg-muted/50 rounded cursor-pointer hover:bg-muted transition-colors'
                      onClick={() => onSelectionChange(item)}
                    >
                      <div className='flex-1'>
                        <h4 className='text-sm font-medium text-foreground'>
                          {item.l3Category}
                        </h4>
                      </div>
                      <div className='flex flex-wrap gap-1 ml-3 hidden'>
                        {item.frameworks.map((fw) => (
                          <FrameworkBadge key={fw} framework={fw} />
                        ))}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
