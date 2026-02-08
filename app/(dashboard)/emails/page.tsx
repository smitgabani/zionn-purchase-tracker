'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppSelector } from '@/lib/store/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Mail, Eye, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Database } from '@/lib/types/database.types'
import { format } from 'date-fns'

type RawEmail = Database['public']['Tables']['raw_emails']['Row']

export default function EmailsPage() {
  const { user } = useAppSelector((state) => state.auth)
  const supabase = createClient()

  const [emails, setEmails] = useState<RawEmail[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEmail, setSelectedEmail] = useState<RawEmail | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  useEffect(() => {
    if (user) {
      fetchEmails()
    }
  }, [user])

  const fetchEmails = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('raw_emails')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setEmails(data || [])
    } catch (error) {
      toast.error('Failed to load emails')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewEmail = (email: RawEmail) => {
    setSelectedEmail(email)
    setIsDetailOpen(true)
  }

  const filteredEmails = emails.filter(email => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      email.sender?.toLowerCase().includes(search) ||
      email.subject?.toLowerCase().includes(search) ||
      email.body?.toLowerCase().includes(search)
    )
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Synced Emails</h1>
        <p className="mt-1 text-sm text-gray-600">
          View all emails synced from Gmail and their parsing status
        </p>
      </div>

      {/* Search and Stats */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-600">
              Parsed: {emails.filter(e => e.parsed && !e.parse_error).length}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              Unparsed: {emails.filter(e => !e.parsed).length}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive">
              Failed: {emails.filter(e => e.parsed && e.parse_error).length}
            </Badge>
          </div>
        </div>
      </div>

      {/* Emails Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Received</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Subject</TableHead>
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
            ) : filteredEmails.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500">
                  {searchTerm ? 'No emails match your search' : 'No emails synced yet. Connect Gmail and sync emails.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredEmails.map((email) => (
                <TableRow key={email.id}>
                  <TableCell className="text-sm text-gray-600">
                    {email.received_at
                      ? format(new Date(email.received_at), 'MMM dd, yyyy HH:mm')
                      : '-'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">
                    {email.sender || '-'}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate font-medium">
                    {email.subject || '(No subject)'}
                  </TableCell>
                  <TableCell>
                    {email.parsed ? (
                      email.parse_error ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Failed
                          </Badge>
                        </div>
                      ) : (
                        <Badge variant="default" className="gap-1 bg-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Parsed
                        </Badge>
                      )
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Unparsed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewEmail(email)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Email Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Details</DialogTitle>
            <DialogDescription>
              View the full email content and parsing status
            </DialogDescription>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4">
              {/* Email Metadata */}
              <div className="space-y-2">
                <div className="grid gap-2">
                  <div className="flex gap-2">
                    <span className="font-semibold min-w-[100px]">From:</span>
                    <span className="text-gray-700">{selectedEmail.sender}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold min-w-[100px]">Subject:</span>
                    <span className="text-gray-700">{selectedEmail.subject || '(No subject)'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold min-w-[100px]">Received:</span>
                    <span className="text-gray-700">
                      {selectedEmail.received_at
                        ? format(new Date(selectedEmail.received_at), 'PPpp')
                        : '-'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold min-w-[100px]">Status:</span>
                    <div>
                      {selectedEmail.parsed ? (
                        selectedEmail.parse_error ? (
                          <Badge variant="destructive">Failed to Parse</Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-600">Parsed Successfully</Badge>
                        )
                      ) : (
                        <Badge variant="secondary">Not Parsed Yet</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Parse Error */}
              {selectedEmail.parse_error && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3">
                  <h4 className="font-semibold text-red-900 mb-1">Parse Error:</h4>
                  <p className="text-sm text-red-800">{selectedEmail.parse_error}</p>
                </div>
              )}

              {/* Email Body */}
              <div className="space-y-2">
                <h4 className="font-semibold">Email Content:</h4>
                <div className="rounded-md border bg-gray-50 p-4 max-h-[400px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono text-gray-700">
                    {selectedEmail.body || '(No content)'}
                  </pre>
                </div>
              </div>

              {/* Gmail Message ID */}
              <div className="text-xs text-gray-500">
                <span className="font-semibold">Gmail Message ID:</span> {selectedEmail.gmail_message_id}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
