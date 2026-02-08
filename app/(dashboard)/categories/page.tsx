'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks'
import { setCategories, addCategory, updateCategory, deleteCategory } from '@/lib/store/slices/categoriesSlice'
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

type Category = Database['public']['Tables']['categories']['Row']
type CategoryInsert = Database['public']['Tables']['categories']['Insert']

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // green
  '#6366f1', // indigo
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#ef4444', // red
  '#64748b', // slate
]

export default function CategoriesPage() {
  const { user } = useAppSelector((state) => state.auth)
  const { categories } = useAppSelector((state) => state.categories)
  const dispatch = useAppDispatch()
  const supabase = createClient()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    color: '#6366f1',
    icon: '',
  })

  useEffect(() => {
    if (user) {
      fetchCategories()
    }
  }, [user])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      dispatch(setCategories(data || []))
    } catch (error) {
      toast.error('Failed to load categories')
      console.error(error)
    }
  }

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setIsEditing(true)
      setCurrentCategory(category)
      setFormData({
        name: category.name,
        color: category.color,
        icon: category.icon || '',
      })
    } else {
      setIsEditing(false)
      setCurrentCategory(null)
      setFormData({
        name: '',
        color: '#6366f1',
        icon: '',
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setIsEditing(false)
    setCurrentCategory(null)
    setFormData({
      name: '',
      color: '#6366f1',
      icon: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    try {
      if (isEditing && currentCategory) {
        // Update existing category
        const { data, error } = await supabase
          .from('categories')
          .update({
            name: formData.name,
            color: formData.color,
            icon: formData.icon || null,
          })
          .eq('id', currentCategory.id)
          .select()
          .single()

        if (error) throw error
        dispatch(updateCategory(data))
        toast.success('Category updated successfully')
      } else {
        // Create new category
        const newCategory: CategoryInsert = {
          admin_user_id: user.id,
          name: formData.name,
          color: formData.color,
          icon: formData.icon || null,
          is_default: false,
        }

        const { data, error } = await supabase
          .from('categories')
          .insert(newCategory)
          .select()
          .single()

        if (error) throw error
        dispatch(addCategory(data))
        toast.success('Category added successfully')
      }

      handleCloseDialog()
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('A category with this name already exists')
      } else {
        toast.error('Failed to save category')
      }
      console.error(error)
    }
  }

  const handleDelete = async (id: string, isDefault: boolean) => {
    if (isDefault) {
      toast.error('Cannot delete default categories')
      return
    }

    if (!confirm('Are you sure you want to delete this category?')) return

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) throw error
      dispatch(deleteCategory(id))
      toast.success('Category deleted successfully')
    } catch (error) {
      toast.error('Failed to delete category')
      console.error(error)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="mt-1 text-sm text-gray-600">
            Organize purchases by category for better tracking
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isEditing ? 'Edit Category' : 'Add New Category'}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? 'Update category information'
                  : 'Create a new category to organize purchases'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Category Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Office Supplies, Travel"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <div className="flex gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`h-8 w-8 rounded-full border-2 transition-all ${
                          formData.color === color
                            ? 'border-gray-900 scale-110'
                            : 'border-gray-200 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({ ...formData, color })}
                      />
                    ))}
                  </div>
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="mt-2 h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon Name (optional)</Label>
                  <Input
                    id="icon"
                    placeholder="e.g., Briefcase, Plane"
                    value={formData.icon}
                    onChange={(e) =>
                      setFormData({ ...formData, icon: e.target.value })
                    }
                  />
                  <p className="text-xs text-gray-500">
                    Icon names from Lucide React library
                  </p>
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
                  {isEditing ? 'Update' : 'Add'} Category
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
              <TableHead>Color</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Icon</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500">
                  No categories yet. Default categories should be added on signup.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div
                      className="h-6 w-6 rounded-full border"
                      style={{ backgroundColor: category.color }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{category.icon || '-'}</TableCell>
                  <TableCell>
                    {category.is_default ? (
                      <Badge variant="secondary">Default</Badge>
                    ) : (
                      <Badge variant="outline">Custom</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category.id, category.is_default)}
                        disabled={category.is_default}
                      >
                        <Trash2 className={`h-4 w-4 ${category.is_default ? 'text-gray-300' : 'text-red-500'}`} />
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
