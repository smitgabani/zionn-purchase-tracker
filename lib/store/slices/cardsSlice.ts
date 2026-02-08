import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Database } from '@/lib/types/database.types'

type Card = Database['public']['Tables']['cards']['Row']

interface CardsState {
  cards: Card[]
  loading: boolean
  error: string | null
}

const initialState: CardsState = {
  cards: [],
  loading: false,
  error: null,
}

const cardsSlice = createSlice({
  name: 'cards',
  initialState,
  reducers: {
    setCards: (state, action: PayloadAction<Card[]>) => {
      state.cards = action.payload
      state.loading = false
      state.error = null
    },
    addCard: (state, action: PayloadAction<Card>) => {
      state.cards.push(action.payload)
    },
    updateCard: (state, action: PayloadAction<Card>) => {
      const index = state.cards.findIndex(c => c.id === action.payload.id)
      if (index !== -1) {
        state.cards[index] = action.payload
      }
    },
    deleteCard: (state, action: PayloadAction<string>) => {
      state.cards = state.cards.filter(c => c.id !== action.payload)
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

export const { setCards, addCard, updateCard, deleteCard, setLoading, setError } = cardsSlice.actions
export default cardsSlice.reducer
