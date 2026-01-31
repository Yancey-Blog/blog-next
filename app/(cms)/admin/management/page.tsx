'use client'

import { AccountManagement } from '@/components/account-management'
import { SessionManagement } from '@/components/session-management'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserManagement } from '@/components/user-management'

export default function ManagementPage() {
  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Auth Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage users, sessions, and accounts
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <UserManagement />
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <SessionManagement />
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <AccountManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}
