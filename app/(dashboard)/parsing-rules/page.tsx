'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppSelector } from '@/lib/store/hooks'
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
import { Plus, Pencil, Trash2, PlayCircle, ChevronUp, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Database } from '@/lib/types/database.types'

type ParsingRule = Database['public']['Tables']['parsing_rules']['Row']
type ParsingRuleInsert = Database['public']['Tables']['parsing_rules']['Insert']

export default function ParsingRulesPage() {
  const { user } = useAppSelector((state) => state.auth)
  const supabase = createClient()

  const [rules, setRules] = useState<ParsingRule[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentRule, setCurrentRule] = useState<ParsingRule | null>(null)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    priority: 0,
    sender_pattern: '',
    subject_pattern: '',
    body_pattern: '',
    amount_pattern: '',
    merchant_pattern: '',
    date_pattern: '',
    card_last_four_pattern: '',
    date_format: 'MMM dd, yyyy',
  })

  useEffect(() => {
    if (user) {
      fetchRules()
    }
  }, [user])

  const fetchRules = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('parsing_rules')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setRules(data || [])
    } catch (error) {
      toast.error('Failed to load parsing rules')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (rule?: ParsingRule) => {
    if (rule) {
      setIsEditing(true)
      setCurrentRule(rule)
      setFormData({
        name: rule.name,
        description: rule.description || '',
        is_active: rule.is_active,
        priority: rule.priority,
        sender_pattern: rule.sender_pattern || '',
        subject_pattern: rule.subject_pattern || '',
        body_pattern: rule.body_pattern || '',
        amount_pattern: rule.amount_pattern,
        merchant_pattern: rule.merchant_pattern || '',
        date_pattern: rule.date_pattern || '',
        card_last_four_pattern: rule.card_last_four_pattern || '',
        date_format: rule.date_format,
      })
    } else {
      setIsEditing(false)
      setCurrentRule(null)
      setFormData({
        name: '',
        description: '',
        is_active: true,
        priority: 0,
        sender_pattern: '',
        subject_pattern: '',
        body_pattern: '',
        amount_pattern: '',
        merchant_pattern: '',
        date_pattern: '',
        card_last_four_pattern: '',
        date_format: 'MMM dd, yyyy',
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setIsEditing(false)
    setCurrentRule(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    try {
      if (isEditing && currentRule) {
        // Update existing rule
        const { data, error } = await supabase
          .from('parsing_rules')
          .update({
            name: formData.name,
            description: formData.description || null,
            is_active: formData.is_active,
            priority: formData.priority,
            sender_pattern: formData.sender_pattern || null,
            subject_pattern: formData.subject_pattern || null,
            body_pattern: formData.body_pattern || null,
            amount_pattern: formData.amount_pattern,
            merchant_pattern: formData.merchant_pattern || null,
            date_pattern: formData.date_pattern || null,
            card_last_four_pattern: formData.card_last_four_pattern || null,
            date_format: formData.date_format,
          })
          .eq('id', currentRule.id)
          .select()
          .single()

        if (error) throw error
        toast.success('Parsing rule updated successfully')
      } else {
        // Create new rule
        const newRule: ParsingRuleInsert = {
          admin_user_id: user.id,
          name: formData.name,
          description: formData.description || null,
          is_active: formData.is_active,
          priority: formData.priority,
          sender_pattern: formData.sender_pattern || null,
          subject_pattern: formData.subject_pattern || null,
          body_pattern: formData.body_pattern || null,
          amount_pattern: formData.amount_pattern,
          merchant_pattern: formData.merchant_pattern || null,
          date_pattern: formData.date_pattern || null,
          card_last_four_pattern: formData.card_last_four_pattern || null,
          date_format: formData.date_format,
        }

        const { data, error } = await supabase
          .from('parsing_rules')
          .insert(newRule)
          .select()
          .single()

        if (error) throw error
        toast.success('Parsing rule added successfully')
      }

      await fetchRules()
      handleCloseDialog()
    } catch (error) {
      toast.error('Failed to save parsing rule')
      console.error(error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this parsing rule?')) return

    try {
      const { error } = await supabase
        .from('parsing_rules')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Parsing rule deleted successfully')
      await fetchRules()
    } catch (error) {
      toast.error('Failed to delete parsing rule')
      console.error(error)
    }
  }

  const toggleActive = async (rule: ParsingRule) => {
    try {
      const { error } = await supabase
        .from('parsing_rules')
        .update({ is_active: !rule.is_active })
        .eq('id', rule.id)

      if (error) throw error
      toast.success(rule.is_active ? 'Rule deactivated' : 'Rule activated')
      await fetchRules()
    } catch (error) {
      toast.error('Failed to update rule')
      console.error(error)
    }
  }

  const changePriority = async (rule: ParsingRule, direction: 'up' | 'down') => {
    const newPriority = direction === 'up' ? rule.priority + 1 : rule.priority - 1

    try {
      const { error } = await supabase
        .from('parsing_rules')
        .update({ priority: newPriority })
        .eq('id', rule.id)

      if (error) throw error
      await fetchRules()
    } catch (error) {
      toast.error('Failed to update priority')
      console.error(error)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parsing Rules</h1>
          <p className="mt-1 text-sm text-gray-600">
            Create rules to automatically extract purchase data from bank emails
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? 'Edit Parsing Rule' : 'Add New Parsing Rule'}
              </DialogTitle>
              <DialogDescription>
                Define patterns to extract purchase information from emails
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Basic Information</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Rule Name *</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Chase Bank Alert"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority (higher = first)</Label>
                      <Input
                        id="priority"
                        type="number"
                        value={formData.priority}
                        onChange={(e) =>
                          setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Optional description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Matching Patterns */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Matching Patterns (Regex)</h3>
                  <p className="text-xs text-gray-500">
                    Leave blank to match all. Use regex to match specific senders/subjects/body text.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="sender_pattern">Sender Pattern</Label>
                    <Input
                      id="sender_pattern"
                      placeholder="e.g., alerts@chase\.com"
                      value={formData.sender_pattern}
                      onChange={(e) =>
                        setFormData({ ...formData, sender_pattern: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject_pattern">Subject Pattern</Label>
                    <Input
                      id="subject_pattern"
                      placeholder="e.g., Transaction Alert|Purchase Made"
                      value={formData.subject_pattern}
                      onChange={(e) =>
                        setFormData({ ...formData, subject_pattern: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="body_pattern">Body Pattern</Label>
                    <Input
                      id="body_pattern"
                      placeholder="e.g., card ending"
                      value={formData.body_pattern}
                      onChange={(e) =>
                        setFormData({ ...formData, body_pattern: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Extraction Patterns */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Extraction Patterns (Regex with capture groups)</h3>
                  <p className="text-xs text-gray-500">
                    Use parentheses () to capture the data you want to extract.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="amount_pattern">Amount Pattern * (capture group required)</Label>
                    <Input
                      id="amount_pattern"
                      placeholder="e.g., \$?([\d,]+\.?\d{0,2})"
                      value={formData.amount_pattern}
                      onChange={(e) =>
                        setFormData({ ...formData, amount_pattern: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="merchant_pattern">Merchant Pattern</Label>
                    <Input
                      id="merchant_pattern"
                      placeholder="e.g., at (.+?) on|merchant: (.+?)$"
                      value={formData.merchant_pattern}
                      onChange={(e) =>
                        setFormData({ ...formData, merchant_pattern: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_pattern">Date Pattern</Label>
                    <Input
                      id="date_pattern"
                      placeholder="e.g., on ([A-Z][a-z]+ \d+, \d{4})"
                      value={formData.date_pattern}
                      onChange={(e) =>
                        setFormData({ ...formData, date_pattern: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="card_last_four_pattern">Card Last 4 Digits Pattern</Label>
                    <Input
                      id="card_last_four_pattern"
                      placeholder="e.g., ending (\d{4})|card \*+(\d{4})"
                      value={formData.card_last_four_pattern}
                      onChange={(e) =>
                        setFormData({ ...formData, card_last_four_pattern: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_format">Date Format</Label>
                    <Input
                      id="date_format"
                      placeholder="MMM dd, yyyy"
                      value={formData.date_format}
                      onChange={(e) =>
                        setFormData({ ...formData, date_format: e.target.value })
                      }
                    />
                    <p className="text-xs text-gray-500">
                      Format for parsing dates (using date-fns format)
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">
                    Active (rule will be used for parsing)
                  </Label>
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
                  {isEditing ? 'Update' : 'Add'} Rule
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rules Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Priority</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Patterns</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500">
                  Loading...
                </TableCell>
              </TableRow>
            ) : rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500">
                  No parsing rules yet. Add your first rule to get started.
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{rule.priority}</span>
                      <div className="flex flex-col">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                          onClick={() => changePriority(rule, 'up')}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                          onClick={() => changePriority(rule, 'down')}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{rule.name}</div>
                      {rule.description && (
                        <div className="text-xs text-gray-500">{rule.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {rule.sender_pattern && <Badge variant="outline">Sender</Badge>}
                      {rule.subject_pattern && <Badge variant="outline">Subject</Badge>}
                      {rule.body_pattern && <Badge variant="outline">Body</Badge>}
                      {rule.merchant_pattern && <Badge variant="outline">Merchant</Badge>}
                      {rule.card_last_four_pattern && <Badge variant="outline">Card</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(rule)}
                    >
                      <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(rule)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(rule.id)}
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

      {/* Help Section */}
      <div className="mt-6 rounded-lg border bg-blue-50 p-4">
        <h3 className="font-semibold text-blue-900">Regex Pattern Tips:</h3>
        <ul className="mt-2 space-y-1 text-sm text-blue-800">
          <li>• Use <code className="bg-blue-100 px-1 rounded">( )</code> to capture the value you want to extract</li>
          <li>• <code className="bg-blue-100 px-1 rounded">\d</code> matches any digit, <code className="bg-blue-100 px-1 rounded">\d+</code> matches one or more digits</li>
          <li>• <code className="bg-blue-100 px-1 rounded">\.  </code> matches a literal period (escape special chars)</li>
          <li>• <code className="bg-blue-100 px-1 rounded">.*?</code> matches any characters (non-greedy)</li>
          <li>• <code className="bg-blue-100 px-1 rounded">|</code> means OR (e.g., <code className="bg-blue-100 px-1 rounded">cat|dog</code>)</li>
          <li>• Test your patterns with sample emails before saving</li>
        </ul>
      </div>
    </div>
  )
}
