'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, RefreshCw } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { useTRPC } from '@/lib/trpc/client'

export function AIModelSettings() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const current = useQuery(trpc.admin.aiModel.get.queryOptions())
  const models = useQuery(
    trpc.admin.aiModel.list.queryOptions(undefined, {
      staleTime: 5 * 60 * 1000,
      retry: false
    })
  )

  // Local pick until saved; falls back to the stored model.
  const [picked, setPicked] = useState<string | null>(null)
  const selected = picked ?? current.data?.model ?? null

  const save = useMutation(
    trpc.admin.aiModel.set.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.admin.aiModel.get.queryFilter())
        setPicked(null)
        toast.success('AI model saved')
      },
      onError: (error) => toast.error(error.message)
    })
  )

  const ids = models.data?.map((m) => m.id) ?? []
  const retiring = new Set(
    models.data?.filter((m) => m.retiring).map((m) => m.id)
  )
  const dirty = picked !== null && picked !== current.data?.model

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Model</CardTitle>
        <CardDescription>
          The OpenAI model used by the editor&apos;s AI menu and AI polish. The
          list comes live from your OpenAI account, newest first.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Model</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Combobox
              items={ids}
              value={selected}
              onValueChange={(value) => setPicked(value as string | null)}
              disabled={models.isLoading || models.isError}
            >
              <ComboboxInput
                className="w-80"
                placeholder={
                  models.isLoading ? 'Loading models…' : 'Search models…'
                }
              />
              <ComboboxContent>
                <ComboboxEmpty>No models found</ComboboxEmpty>
                <ComboboxList>
                  {(id: string) => (
                    <ComboboxItem key={id} value={id}>
                      {id}
                      {retiring.has(id) && (
                        <span className="text-muted-foreground ml-auto text-xs">
                          retiring
                        </span>
                      )}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Refresh model list"
              disabled={models.isFetching}
              onClick={() => void models.refetch()}
            >
              <RefreshCw className={models.isFetching ? 'animate-spin' : ''} />
            </Button>
            <Button
              type="button"
              disabled={!dirty || save.isPending}
              onClick={() => selected && save.mutate({ model: selected })}
            >
              {save.isPending && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </div>
          {models.isError ? (
            <p className="text-destructive text-sm">
              Couldn&apos;t load models: {models.error.message}
            </p>
          ) : (
            current.data && (
              <p className="text-muted-foreground text-sm">
                Default: {current.data.defaultModel}
              </p>
            )
          )}
        </div>
      </CardContent>
    </Card>
  )
}
