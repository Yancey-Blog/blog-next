import { Github, Mail, Twitter } from 'lucide-react'
import Link from 'next/link'
import { ThemeModeSwitcher } from './theme-mode-switcher'

export function FrontendFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t bg-background py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          {/* Left: copyright + legal links */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground sm:justify-start">
            <span>Copyright &copy; {currentYear} Yancey Inc.</span>
            <span className="hidden sm:inline">·</span>
            <Link href="/legal/privacy-policy" className="transition-colors hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/legal/terms-of-use" className="transition-colors hover:text-foreground">
              Terms of Use
            </Link>
          </div>

          {/* Right: social icons + theme switcher */}
          <div className="flex items-center gap-4">
            <a
              href="mailto:developer@yanceyleo.com"
              aria-label="Email"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Mail className="h-4 w-4" />
            </a>
            <a
              href="https://github.com/YanceyOfficial"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href="https://x.com/YanceyOfficial"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter / X"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <div className="h-4 w-px bg-border" />
            <ThemeModeSwitcher />
          </div>
        </div>
      </div>
    </footer>
  )
}
