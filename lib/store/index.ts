import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import employeesReducer from './slices/employeesSlice'
import cardsReducer from './slices/cardsSlice'
import categoriesReducer from './slices/categoriesSlice'
import purchasesReducer from './slices/purchasesSlice'

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      employees: employeesReducer,
      cards: cardsReducer,
      categories: categoriesReducer,
      purchases: purchasesReducer,
    },
  })
}

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
