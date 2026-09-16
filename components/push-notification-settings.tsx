'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { useTRPC } from '@/lib/trpc/client'

export function PushNotificationSettings() {
  const trpc = useTRPC()
  const [title, setTitle] = useState('New notification')
  const [body, setBody] = useState('Hello from Yancey Blog!')

  const { data } = useQuery(trpc.push.subscriberCount.queryOptions())

  const sendMutation = useMutation(
    trpc.push.sendTest.mutationOptions({
      onSuccess: (result) => {
        toast.success(`Sent to ${result.sent} subscriber(s)`)
      },
      onError: () => toast.error('Failed to send notification')
    })
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Push Notifications</CardTitle>
        <CardDescription>
          {data?.count ?? 0} subscriber{data?.count === 1 ? '' : 's'} opted in.
          Send a test notification to everyone currently subscribed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="push-title">Title</FieldLabel>
            <Input
              id="push-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="push-body">Message</FieldLabel>
            <Input
              id="push-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
            />
          </Field>
          <Button
            onClick={() => sendMutation.mutate({ title, body })}
            disabled={sendMutation.isPending || !title || !body}
          >
            <Send className="mr-1.5 h-4 w-4" />
            {sendMutation.isPending ? 'Sending...' : 'Send test notification'}
          </Button>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
