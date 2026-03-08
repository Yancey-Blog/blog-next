import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Use | Yancey Blog',
  description: 'Terms of use for Yancey Blog.'
}

export default function TermsOfUsePage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 pb-16 pt-28">
      <h1 className="mb-2 text-4xl font-bold tracking-tight">Terms of Use</h1>
      <p className="mb-10 text-sm text-muted-foreground">
        Last updated: March 3, 2022
      </p>

      <nav className="mb-12 rounded-xl border bg-muted/40 p-6">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Contents
        </p>
        <ol className="space-y-1.5 text-sm">
          {[
            ['#acceptance', 'I. Acceptance of Terms'],
            ['#intellectual-property', 'II. Intellectual Property'],
            ['#user-conduct', 'III. User Conduct'],
            ['#third-party-links', 'IV. Third-Party Links and Services'],
            ['#disclaimer', 'V. Disclaimer of Warranties'],
            ['#limitation', 'VI. Limitation of Liability'],
            ['#changes', 'VII. Changes to These Terms'],
            ['#governing-law', 'VIII. Governing Law'],
            ['#contact', 'IX. Contact']
          ].map(([href, label]) => (
            <li key={href}>
              <a href={href} className="text-primary hover:underline">
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h2 id="acceptance">I. Acceptance of Terms</h2>
        <p>
          By accessing and using this website (yancey.app, hereinafter &quot;the
          Site&quot;), you accept and agree to be bound by these Terms of Use.
          If you do not agree to these terms, please do not use the Site.
        </p>
        <p>
          The Owner reserves the right to update or modify these Terms of Use at
          any time without prior notice. Your continued use of the Site
          following any changes constitutes your acceptance of the new terms.
        </p>

        <h2 id="intellectual-property">II. Intellectual Property</h2>
        <p>
          All content published on this Site — including but not limited to
          articles, blog posts, code snippets, illustrations, photographs, and
          other materials — is the intellectual property of Yancey Inc. unless
          otherwise stated.
        </p>
        <p>
          You are welcome to quote or reference content from this Site for
          personal, educational, or non-commercial purposes, provided that you
          give clear attribution with a link back to the original article.
          Reproducing entire articles or substantial portions of content without
          permission is prohibited.
        </p>
        <p>
          Code snippets published on this Site are provided under the{' '}
          <a
            href="https://opensource.org/licenses/MIT"
            target="_blank"
            rel="noopener noreferrer"
          >
            MIT License
          </a>{' '}
          unless explicitly stated otherwise. You may use, copy, modify, and
          distribute such code freely with attribution.
        </p>

        <h2 id="user-conduct">III. User Conduct</h2>
        <p>When using this Site, you agree not to:</p>
        <ul>
          <li>
            Use the Site for any unlawful purpose or in violation of any
            regulations.
          </li>
          <li>
            Attempt to gain unauthorized access to any part of the Site or its
            related systems.
          </li>
          <li>
            Scrape, crawl, or otherwise extract content from the Site in bulk
            without prior written consent.
          </li>
          <li>
            Transmit any viruses, malware, or other harmful code through or in
            connection with the Site.
          </li>
          <li>
            Impersonate any person or entity or misrepresent your affiliation
            with any person or entity.
          </li>
          <li>
            Engage in any conduct that restricts or inhibits anyone&apos;s use
            or enjoyment of the Site.
          </li>
        </ul>

        <h2 id="third-party-links">IV. Third-Party Links and Services</h2>
        <p>
          The Site may contain links to third-party websites or services that
          are not owned or controlled by the Owner. These links are provided for
          convenience and informational purposes only.
        </p>
        <p>
          The Owner has no control over, and assumes no responsibility for, the
          content, privacy policies, or practices of any third-party websites.
        </p>
        <p>
          This Site uses third-party services including Google Analytics for
          traffic analysis, Algolia for search functionality, and AWS S3 for
          media hosting. Use of this Site constitutes acceptance of those
          services&apos; respective terms and policies.
        </p>

        <h2 id="disclaimer">V. Disclaimer of Warranties</h2>
        <p>
          The content on this Site is provided on an &quot;as is&quot; and
          &quot;as available&quot; basis without warranties of any kind, either
          express or implied. The Owner makes no representations or warranties
          regarding the accuracy, completeness, reliability, or suitability of
          any information on the Site.
        </p>
        <p>
          Technical articles and code examples are written to the best of the
          Owner&apos;s knowledge at the time of publication. The technology
          landscape evolves rapidly; content may become outdated. Always verify
          information against official documentation before applying it in
          production environments.
        </p>

        <h2 id="limitation">VI. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by applicable law, the Owner shall not
          be liable for any indirect, incidental, special, consequential, or
          punitive damages arising from your use of, or inability to use, this
          Site or its content — including but not limited to loss of data, loss
          of profits, or business interruption.
        </p>
        <p>
          The Owner&apos;s total liability for any claim arising out of or
          relating to these Terms shall not exceed the amount you paid, if any,
          to access the Site.
        </p>

        <h2 id="changes">VII. Changes to These Terms</h2>
        <p>
          The Owner reserves the right to revise these Terms of Use at any time.
          Changes will be effective immediately upon posting to the Site. The
          &quot;Last updated&quot; date at the top of this page will be revised
          accordingly.
        </p>
        <p>
          It is your responsibility to review these Terms periodically.
          Continued use of the Site after any changes are posted constitutes
          your acceptance of the revised Terms.
        </p>

        <h2 id="governing-law">VIII. Governing Law</h2>
        <p>
          These Terms of Use shall be governed by and construed in accordance
          with applicable laws, without regard to its conflict of law
          provisions. Any disputes arising under these Terms shall be subject to
          the exclusive jurisdiction of the courts in the Owner&apos;s
          jurisdiction.
        </p>

        <h2 id="contact">IX. Contact</h2>
        <p>
          If you have any questions about these Terms of Use, please contact the
          Owner at:{' '}
          <a href="mailto:developer@yanceyleo.com">developer@yanceyleo.com</a>
        </p>
      </article>
    </div>
  )
}
