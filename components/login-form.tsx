'use client'

import { KeyRound } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup } from '@/components/ui/field'
import { authClient } from '@/lib/auth/auth-client'
import { cn } from '@/lib/utils'

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    setLoading('google')
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/admin'
      })
    } catch (error) {
      console.error('Google login error:', error)
    } finally {
      setLoading(null)
    }
  }

  const handleGitHubLogin = async () => {
    setLoading('github')
    try {
      await authClient.signIn.social({
        provider: 'github',
        callbackURL: '/admin'
      })
    } catch (error) {
      console.error('GitHub login error:', error)
    } finally {
      setLoading(null)
    }
  }

  const handleAppleLogin = async () => {
    setLoading('apple')
    try {
      await authClient.signIn.social({
        provider: 'apple',
        callbackURL: '/admin'
      })
    } catch (error) {
      console.error('Apple login error:', error)
    } finally {
      setLoading(null)
    }
  }

  const handlePasskeyLogin = async () => {
    setLoading('passkey')
    try {
      await authClient.signIn.passkey({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = '/admin'
          },
          onError: (context) => {
            console.error('Passkey login error:', context.error.message)
          }
        }
      })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome Back</CardTitle>
          <CardDescription>
            Sign in with Google or GitHub account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <Button
                variant="outline"
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading !== null}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                  <path
                    d="M501.8 261.8c0-18.2-1.6-35.6-4.7-52.4H256v99.1h137.8c-6.1 31.9-24.2 58.9-51.4 77V450h83.1c48.3-44.6 76.3-110.2 76.3-188.2"
                    style={{
                      fill: '#4285f4'
                    }}
                  />
                  <path
                    d="M256 512c69.1 0 127.1-22.8 169.4-61.9l-83.1-64.5c-22.8 15.4-51.9 24.7-86.3 24.7-66.6 0-123.1-44.9-143.4-105.4H27.5V371C69.6 454.5 155.9 512 256 512"
                    style={{
                      fill: '#34a853'
                    }}
                  />
                  <path
                    d="M112.6 304.6c-5.1-15.4-8.1-31.7-8.1-48.6s3-33.3 8.1-48.6v-66.1H27.5C10 175.7 0 214.6 0 256s10 80.3 27.5 114.7L93.8 319c0 .1 18.8-14.4 18.8-14.4"
                    style={{
                      fill: '#fbbc05'
                    }}
                  />
                  <path
                    d="M256 101.9c37.7 0 71.2 13 98 38.2l73.3-73.3C382.8 25.4 325.1 0 256 0 155.9 0 69.6 57.5 27.5 141.3l85.2 66.1c20.2-60.5 76.7-105.5 143.3-105.5"
                    style={{
                      fill: '#ea4335'
                    }}
                  />
                  <path
                    d="M0 0h512v512H0z"
                    style={{
                      fill: 'none'
                    }}
                  />
                </svg>
                {loading === 'google' ? 'Signing in...' : 'Sign in with Google'}
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={handleGitHubLogin}
                disabled={loading !== null}
              >
                <svg
                  fill="currentColor"
                  aria-hidden="true"
                  focusable="false"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 512 512"
                >
                  <path
                    d="M256 6.3C114.6 6.3 0 120.9 0 262.3c0 113.3 73.3 209 175 242.9 12.8 2.2 17.6-5.4 17.6-12.2 0-6.1-.3-26.2-.3-47.7-64.3 11.8-81-15.7-86.1-30.1-2.9-7.4-15.4-30.1-26.2-36.2-9-4.8-21.8-16.6-.3-17 20.2-.3 34.6 18.6 39.4 26.2 23 38.7 59.8 27.8 74.6 21.1 2.2-16.6 9-27.8 16.3-34.2-57-6.4-116.5-28.5-116.5-126.4 0-27.8 9.9-50.9 26.2-68.8-2.6-6.4-11.5-32.6 2.6-67.8 0 0 21.4-6.7 70.4 26.2 20.5-5.8 42.2-8.6 64-8.6s43.5 2.9 64 8.6c49-33.3 70.4-26.2 70.4-26.2 14.1 35.2 5.1 61.4 2.6 67.8 16.3 17.9 26.2 40.6 26.2 68.8 0 98.2-59.8 120-116.8 126.4 9.3 8 17.3 23.4 17.3 47.4 0 34.2-.3 61.8-.3 70.4 0 6.7 4.8 14.7 17.6 12.2C438.7 471.3 512 375.3 512 262.3c0-141.4-114.6-256-256-256"
                    fillRule="evenodd"
                    clipRule="evenodd"
                  />
                </svg>

                {loading === 'github' ? 'Signing in...' : 'Sign in with GitHub'}
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={handleAppleLogin}
                disabled={loading !== null}
              >
                <svg
                  fill="currentColor"
                  aria-hidden="true"
                  focusable="false"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="47.6 0 416.8 512"
                >
                  <path d="M451.1 174.6c-3 2.3-55.4 31.8-55.4 97.5 0 76 66.7 102.9 68.7 103.5-.3 1.6-10.6 36.8-35.2 72.7-21.9 31.5-44.8 63-79.6 63s-43.8-20.2-84-20.2c-39.2 0-53.1 20.9-84.9 20.9s-54.1-29.2-79.6-65c-29.6-42.1-53.5-107.5-53.5-169.5 0-99.5 64.7-152.3 128.4-152.3 33.8 0 62.1 22.2 83.3 22.2 20.2 0 51.8-23.6 90.3-23.6 14.6 0 67 1.3 101.5 50.8m-119.8-93c15.9-18.9 27.2-45.1 27.2-71.3 0-3.6-.3-7.3-1-10.3-25.9 1-56.7 17.3-75.3 38.8-14.6 16.6-28.2 42.8-28.2 69.4 0 4 .7 8 1 9.3 1.6.3 4.3.7 7 .7 23.2-.1 52.4-15.6 69.3-36.6" />
                </svg>

                {loading === 'apple' ? (
                  'Signing in...'
                ) : (
                  <>{'Sign in with Apple'}&nbsp;&nbsp;</>
                )}
              </Button>
            </Field>
            <div className="flex w-full items-center gap-4">
              <div className="bg-border h-px flex-1" />
              <span className="text-muted-foreground text-sm">Or</span>
              <div className="bg-border h-px flex-1" />
            </div>
            <Field>
              <Button
                variant="outline"
                type="button"
                onClick={handlePasskeyLogin}
                disabled={loading !== null}
              >
                <KeyRound className="h-4 w-4" />
                {loading === 'passkey'
                  ? 'Signing in...'
                  : 'Sign in with Passkey'}
              </Button>
            </Field>
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
