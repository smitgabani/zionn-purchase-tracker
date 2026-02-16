import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Database } from '@/lib/types/database.types'

type Merchant = Database['public']['Tables']['merchants']['Row']

interface MerchantsState {
  merchants: Merchant[]
  loading: boolean
  error: string | null
}

const initialState: MerchantsState = {
  merchants: [],
  loading: false,
  error: null,
}

export const merchantsSlice = createSlice({
  name: 'merchants',
  initialState,
  reducers: {
    setMerchants: (state, action: PayloadAction<Merchant[]>) => {
      state.merchants = action.payload
      state.loading = false
      state.error = null
    },
    addMerchant: (state, action: PayloadAction<Merchant>) => {
      state.merchants.push(action.payload)
    },
    updateMerchant: (state, action: PayloadAction<Merchant>) => {
      const index = state.merchants.findIndex(m => m.id === action.payload.id)
      if (index !== -1) {
        state.merchants[index] = action.payload
      }
    },
    deleteMerchant: (state, action: PayloadAction<string>) => {
      state.merchants = state.merchants.filter(m => m.id !== action.payload)
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

export const {
  setMerchants,
  addMerchant,
  updateMerchant,
  deleteMerchant,
  setLoading,
  setError,
} = merchantsSlice.actions

export default merchantsSlice.reducer
