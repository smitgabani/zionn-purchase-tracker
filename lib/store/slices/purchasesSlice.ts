import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Database } from '@/lib/types/database.types'

type Purchase = Database['public']['Tables']['purchases']['Row']

interface PurchasesState {
  purchases: Purchase[]
  loading: boolean
  error: string | null
  // Pagination state
  currentPage: number
  hasMore: boolean
  isLoadingMore: boolean
}

const initialState: PurchasesState = {
  purchases: [],
  loading: false,
  error: null,
  currentPage: 0,
  hasMore: true,
  isLoadingMore: false,
}

const purchasesSlice = createSlice({
  name: 'purchases',
  initialState,
  reducers: {
    setPurchases: (state, action: PayloadAction<Purchase[]>) => {
      state.purchases = action.payload
      state.loading = false
      state.error = null
    },
    appendPurchases: (state, action: PayloadAction<Purchase[]>) => {
      state.purchases.push(...action.payload)
      state.isLoadingMore = false
    },
    resetPurchases: (state) => {
      state.purchases = []
      state.currentPage = 0
      state.hasMore = true
      state.isLoadingMore = false
    },
    addPurchase: (state, action: PayloadAction<Purchase>) => {
      state.purchases.unshift(action.payload) // Add to beginning
    },
    updatePurchase: (state, action: PayloadAction<Purchase>) => {
      const index = state.purchases.findIndex(p => p.id === action.payload.id)
      if (index !== -1) {
        state.purchases[index] = action.payload
      }
    },
    deletePurchase: (state, action: PayloadAction<string>) => {
      state.purchases = state.purchases.filter(p => p.id !== action.payload)
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setLoadingMore: (state, action: PayloadAction<boolean>) => {
      state.isLoadingMore = action.payload
    },
    setHasMore: (state, action: PayloadAction<boolean>) => {
      state.hasMore = action.payload
    },
    incrementPage: (state) => {
      state.currentPage += 1
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
      state.loading = false
      state.isLoadingMore = false
    },
  },
})

export const {
  setPurchases,
  appendPurchases,
  resetPurchases,
  addPurchase,
  updatePurchase,
  deletePurchase,
  setLoading,
  setLoadingMore,
  setHasMore,
  incrementPage,
  setPage,
  setError
} = purchasesSlice.actions
export default purchasesSlice.reducer
