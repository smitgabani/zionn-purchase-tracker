'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks'
import { setEmployees, addEmployee, updateEmployee, deleteEmployee } from '@/lib/store/slices/employeesSlice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Database } from '@/lib/types/database.types'

type Employee = Database['public']['Tables']['employees']['Row']
type EmployeeInsert = Database['public']['Tables']['employees']['Insert']

export default function EmployeesPage() {
  const { user } = useAppSelector((state) => state.auth)
  const { employees } = useAppSelector((state) => state.employees)
  const dispatch = useAppDispatch()
  const supabase = createClient()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    notes: '',
  })

  useEffect(() => {
    if (user) {
      fetchEmployees()
    }
  }, [user])

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      dispatch(setEmployees(data || []))
    } catch (error) {
      toast.error('Failed to load employees')
      console.error(error)
    }
  }

  const handleOpenDialog = (employee?: Employee) => {
    if (employee) {
      setIsEditing(true)
      setCurrentEmployee(employee)
      setFormData({
        name: employee.name,
        email: employee.email || '',
        department: employee.department || '',
        notes: employee.notes || '',
      })
    } else {
      setIsEditing(false)
      setCurrentEmployee(null)
      setFormData({
        name: '',
        email: '',
        department: '',
        notes: '',
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setIsEditing(false)
    setCurrentEmployee(null)
    setFormData({
      name: '',
      email: '',
      department: '',
      notes: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    try {
      if (isEditing && currentEmployee) {
        // Update existing employee
        const { data, error } = await supabase
          .from('employees')
          .update({
            name: formData.name,
            email: formData.email || null,
            department: formData.department || null,
            notes: formData.notes || null,
          })
          .eq('id', currentEmployee.id)
          .select()
          .single()

        if (error) throw error
        dispatch(updateEmployee(data))
        toast.success('Employee updated successfully')
      } else {
        // Create new employee
        const newEmployee: EmployeeInsert = {
          admin_user_id: user.id,
          name: formData.name,
          email: formData.email || null,
          department: formData.department || null,
          notes: formData.notes || null,
        }

        const { data, error } = await supabase
          .from('employees')
          .insert(newEmployee)
          .select()
          .single()

        if (error) throw error
        dispatch(addEmployee(data))
        toast.success('Employee added successfully')
      }

      handleCloseDialog()
    } catch (error) {
      toast.error('Failed to save employee')
      console.error(error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return

    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)

      if (error) throw error
      dispatch(deleteEmployee(id))
      toast.success('Employee deleted successfully')
    } catch (error) {
      toast.error('Failed to delete employee')
      console.error(error)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage employee records and card assignments
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isEditing ? 'Edit Employee' : 'Add New Employee'}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? 'Update employee information'
                  : 'Add a new employee to track their purchases'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {isEditing ? 'Update' : 'Add'} Employee
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500">
                  No employees yet. Add your first employee to get started.
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.email || '-'}</TableCell>
                  <TableCell>{employee.department || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                      {employee.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(employee)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(employee.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
