import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Database } from '@/lib/types/database.types'

type Purchase = Database['public']['Tables']['purchases']['Row']

interface PurchasesState {
  purchases: Purchase[]
  loading: boolean
  error: string | null
}

const initialState: PurchasesState = {
  purchases: [],
  loading: false,
  error: null,
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
    addPurchase: (state, action: PayloadAction<Purchase>) => {
      state.purchases.push(action.payload)
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
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
      state.loading = false
    },
  },
})

export const { setPurchases, addPurchase, updatePurchase, deletePurchase, setLoading, setError } = purchasesSlice.actions
export default purchasesSlice.reducer
