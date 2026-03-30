'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { FieldDescription, FieldGroup } from '@/components/ui/field'
import { authClient } from '@/lib/auth/auth-client'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const [loading, setLoading] = useState(false)

  const handleKeycloakLogin = async () => {
    setLoading(true)
    try {
      await authClient.signIn.oauth2({
        providerId: 'keycloak',
        callbackURL: '/admin'
      })
    } catch (error) {
      console.error('Keycloak login error:', error)
      setLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome Back</CardTitle>
          <CardDescription>Sign in with your SSO account</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Button
              variant="outline"
              type="button"
              onClick={handleKeycloakLogin}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Redirecting...' : 'Sign in with SSO'}
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By continuing, you agree to our{' '}
        <a href="/legal/terms-of-use">Terms of Use</a> and{' '}
        <a href="/legal/privacy-policy">Privacy Policy</a>
      </FieldDescription>
    </div>
  )
}
