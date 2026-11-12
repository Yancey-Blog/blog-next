'use client'

import { AccountManagement } from '@/components/account-management'
import { PasskeyManagement } from '@/components/passkey-management'
import { SessionManagement } from '@/components/session-management'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserManagement } from '@/components/user-management'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from './ui/card'

export default function AuthManagement() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Auth Management</CardTitle>
        <CardDescription> Manage users, sessions, and accounts</CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="users" className="flex-col space-y-4">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="passkeys">Passkeys</TabsTrigger>
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

          <TabsContent value="passkeys" className="space-y-4">
            <PasskeyManagement />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
