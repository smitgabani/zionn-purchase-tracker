import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Database } from '@/lib/types/database.types'

type Employee = Database['public']['Tables']['employees']['Row']

interface EmployeesState {
  employees: Employee[]
  loading: boolean
  error: string | null
}

const initialState: EmployeesState = {
  employees: [],
  loading: false,
  error: null,
}

const employeesSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {
    setEmployees: (state, action: PayloadAction<Employee[]>) => {
      state.employees = action.payload
      state.loading = false
      state.error = null
    },
    addEmployee: (state, action: PayloadAction<Employee>) => {
      state.employees.push(action.payload)
    },
    updateEmployee: (state, action: PayloadAction<Employee>) => {
      const index = state.employees.findIndex(e => e.id === action.payload.id)
      if (index !== -1) {
        state.employees[index] = action.payload
      }
    },
    deleteEmployee: (state, action: PayloadAction<string>) => {
      state.employees = state.employees.filter(e => e.id !== action.payload)
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

export const { setEmployees, addEmployee, updateEmployee, deleteEmployee, setLoading, setError } = employeesSlice.actions
export default employeesSlice.reducer
