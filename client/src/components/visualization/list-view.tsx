import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { useState } from 'react'
import {
  TaxonomyData,
  TaxonomyCategory,
  TaxonomySubcategory,
  TaxonomyItem,
  Framework,
} from '@shared/schema'
import { ScrollArea } from '../ui/scroll-area'

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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

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

  // Get the selected category data
  const selectedCategoryData = selectedCategory
    ? displayData.find((cat) => cat.name === selectedCategory)
    : null

  // Auto-select first category if none selected and data is available
  if (!selectedCategory && displayData.length > 0) {
    setSelectedCategory(displayData[0].name)
  }

  return (
    <div className='grid grid-cols-1 lg:grid-cols-5 gap-6 h-full p-6 max-w-screen-xl mx-auto mt-12'>
      {/* Categories Column */}
      <div className='lg:col-span-2 space-y-2'>
        <div className='space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto'>
          {displayData.map((category) => (
            <Card
              key={category.name}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                selectedCategory === category.name
                  ? 'border-[#FFEAE0] bg-[#FFEAE0] text-primary'
                  : ''
              }`}
              onClick={() => {
                setSelectedCategory(category.name)
                onSelectionChange(category)
              }}
            >
              <CardHeader className='p-4'>
                <CardTitle className='text-sm'>{category.name}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Subcategories Column */}
      <div className='lg:col-span-3'>
        {selectedCategoryData ? (
          <div className='space-y-4'>
            <ScrollArea className='h-[calc(100vh-165px)] pr-4'>
              <div className='space-y-4'>
                {selectedCategoryData.subcategories.map((subcategory) => (
                  <Card key={subcategory.name} className='overflow-hidden'>
                    <CardHeader className='p-4 pb-1'>
                      <CardTitle className='text-lg'>
                        {subcategory.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='p-4 pt-0'>
                      <div className='space-y-1'>
                        {subcategory.items.map((item) => (
                          <div
                            key={item.id}
                            className='p-3 pb-1 bg-muted/30 rounded'
                          >
                            <div className='space-y-1'>
                              <h4 className='text-base font-medium text-foreground'>
                                {item.l3Number}. {item.l3Category}
                              </h4>
                              <p className='text-sm text-muted-foreground leading-relaxed'>
                                {item.example}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className='flex items-center justify-center h-64 text-muted-foreground'>
            Select a category to view its subcategories
          </div>
        )}
      </div>
    </div>
  )
}
