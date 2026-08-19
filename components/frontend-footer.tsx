import { Mail } from 'lucide-react'
import Link from 'next/link'

import { GithubIcon, TwitterIcon } from './brand-icons'
import { ThemeModeSwitcher } from './theme-mode-switcher'

export function FrontendFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-background border-t py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          {/* Left: copyright + legal links */}
          <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm sm:justify-start">
            <span>Copyright &copy; {currentYear} Yancey Inc.</span>
            <Link
              href="/legal/privacy-policy"
              className="hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/legal/terms-of-use"
              className="hover:text-foreground transition-colors"
            >
              Terms of Use
            </Link>
          </div>

          {/* Right: social icons + theme switcher */}
          <div className="flex items-center gap-4">
            <a
              href="mailto:developer@yanceyleo.com"
              aria-label="Email"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="h-4 w-4" />
            </a>
            <a
              href="https://github.com/YanceyOfficial"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <GithubIcon className="h-4 w-4" />
            </a>
            <a
              href="https://x.com/YanceyOfficial"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter / X"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <TwitterIcon className="h-4 w-4" />
            </a>
            <div className="bg-border h-4 w-px" />
            <ThemeModeSwitcher />
          </div>
        </div>
      </div>
    </footer>
  )
}
