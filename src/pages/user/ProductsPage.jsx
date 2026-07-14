import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import UserLayout from '../../components/layout/UserLayout.jsx'
import PageHeader from '../../components/admin/PageHeader.jsx'
import BuyProductCard from '../../components/user/BuyProductCard.jsx'
import Card from '../../components/ui/Card.jsx'
import { BUY_PRODUCTS } from '../../lib/mockData.js'

const CATEGORY_OPTIONS = ['All Categories', 'Electronics', 'Smart TV']

function UserProductsPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All Categories')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [appliedCategory, setAppliedCategory] = useState('All Categories')

  const products = useMemo(() => {
    return BUY_PRODUCTS.filter((product) => {
      const matchesCategory = appliedCategory === 'All Categories' || product.category === appliedCategory
      const matchesQuery =
        !appliedQuery.trim() || product.name.toLowerCase().includes(appliedQuery.trim().toLowerCase())
      return matchesCategory && matchesQuery
    })
  }, [appliedCategory, appliedQuery])

  const handleSearch = (e) => {
    e.preventDefault()
    setAppliedQuery(query)
    setAppliedCategory(category)
  }

  return (
    <UserLayout>
      <PageHeader eyebrow="User Panel" title="Buy Products" />

      <Card className="mb-6 p-3 shadow-soft sm:p-4">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Products"
            className="h-11 w-full flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-11 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 sm:w-48"
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            type="submit"
            aria-label="Search products"
            className="flex h-11 w-full items-center justify-center rounded-lg bg-slate-900 text-white transition-colors hover:bg-slate-800 sm:w-11 sm:shrink-0"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <BuyProductCard key={product.id} product={product} />
        ))}
      </div>

      {products.length === 0 && (
        <Card className="p-10 text-center text-sm text-slate-500 shadow-soft">No products found.</Card>
      )}
    </UserLayout>
  )
}

export default UserProductsPage
