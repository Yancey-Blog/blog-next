'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from './ui/card'

export function AccountManagement() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Management</CardTitle>
        <CardDescription>
          Manage OAuth accounts and linked providers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-12">
          <p className="text-center text-muted-foreground">
            Account management features coming soon...
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
