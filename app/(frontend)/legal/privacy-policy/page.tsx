import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Yancey Blog',
  description:
    'How Yancey Blog collects, uses, stores, shares, and protects personal information, including Google Sign-In data.'
}

const sections = [
  ['#overview', 'I. Overview'],
  ['#data-collected', 'II. Information We Collect'],
  ['#google-sign-in', 'III. Google Sign-In and OAuth Authentication'],
  ['#use-of-data', 'IV. How We Use Information'],
  ['#sharing', 'V. Data Sharing and Third Parties'],
  ['#storage-security', 'VI. Storage, Security, and Retention'],
  ['#rights', 'VII. Your Choices and Rights'],
  ['#cookies', 'VIII. Cookies and Technical Information'],
  ['#changes', 'IX. Changes to This Policy'],
  ['#contact', 'X. Contact']
] as const

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 pt-28 pb-16">
      <h1 className="mb-2 text-4xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="text-muted-foreground mb-10 text-sm">
        Last updated: November 7, 2026
      </p>

      <nav
        className="bg-muted/40 mb-12 rounded-xl border p-6"
        aria-label="Contents"
      >
        <p className="text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase">
          Contents
        </p>
        <ol className="space-y-1.5 text-sm">
          {sections.map(([href, label]) => (
            <li key={href}>
              <a href={href} className="text-primary hover:underline">
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h2 id="overview">I. Overview</h2>
        <p>
          Yancey Blog (&quot;the Website&quot;, &quot;we&quot;, or
          &quot;us&quot;) is a personal publishing website featuring articles,
          projects, and related content. The Website also has a private
          administration console used by authorized administrators to manage
          blog content and related projects, including publication assets and
          community content moderation.
        </p>
        <p>
          This Privacy Policy describes how information is collected, accessed,
          used, stored, shared, and protected when people visit the Website or
          attempt to sign in to its administration console. Public visitors do
          not need a Google Account to read blog content. The administration
          console is not a public registration service and is restricted to
          explicitly authorized accounts.
        </p>

        <h2 id="data-collected">II. Information We Collect</h2>
        <h3>Information provided through sign-in providers</h3>
        <p>
          When an individual chooses to authenticate with Google, GitHub, or
          Apple, the selected provider may supply basic identity information,
          subject to the permissions granted and information available from that
          provider. This may include:
        </p>
        <ul>
          <li>Email address and, where provided, its verification status.</li>
          <li>A provider-specific account identifier.</li>
          <li>Display name and profile picture, if available.</li>
          <li>
            Authentication and account-linking information needed to operate the
            sign-in process.
          </li>
        </ul>
        <p>
          We use these details to identify the account and determine whether it
          belongs to an authorized administrator. We do not request access to
          Gmail messages, Google Drive files, contacts, calendars, or other
          Google Account content through Google Sign-In.
        </p>
        <h3>Technical and usage information</h3>
        <p>
          When you access the Website, our hosting and technical services may
          process information such as your IP address, browser and device type,
          requested pages, timestamps, and security or error logs.
          Authentication services may also use session identifiers and cookies
          to maintain a secure signed-in session.
        </p>

        <h2 id="google-sign-in">
          III. Google Sign-In and OAuth Authentication
        </h2>
        <h3>What Google data we access</h3>
        <p>
          Yancey Blog offers Google Sign-In as an optional authentication method
          for its private administration console. With the basic OpenID Connect
          scopes (openid, email, and profile), Google may provide a unique
          Google Account identifier, email address, email verification status,
          display name, and profile picture. We access only the identity data
          needed for sign-in and access control; we do not request additional
          Google API scopes for email, files, or other personal content.
        </p>
        <h3>How Google data is used</h3>
        <ul>
          <li>To verify account identity during OAuth authentication.</li>
          <li>
            To compare the verified email address with our administrator
            allowlist.
          </li>
          <li>
            To create and manage an authorized account and its login sessions.
          </li>
          <li>
            To prevent unauthorized administrative access and investigate
            security incidents.
          </li>
        </ul>
        <p>
          A successful Google authentication does not automatically grant access
          to the administration console. Only accounts explicitly authorized by
          the Website operator may use protected administrative functions.
          Google identity information is not used for advertising, marketing,
          profiling, or sale to third parties.
        </p>
        <h3>How Google data is stored</h3>
        <p>
          For authorized sign-ins, our authentication system may store the
          account identifier, email address, profile details, linked-provider
          information, and session records needed to operate the service.
          Authentication records are kept in access-controlled application
          storage. We do not store your Google password. Information submitted
          by accounts that are not authorized is not intended to be used to
          provide administrator access; limited technical or security records
          may nevertheless be retained to protect the service.
        </p>
        <h3>Google data sharing and limitations</h3>
        <p>
          Google Sign-In information is used for the authentication and security
          purposes stated in this policy. We do not sell it or disclose it to
          advertisers. Information may be processed by infrastructure and
          authentication service providers acting on our behalf, or disclosed
          when required by applicable law. The use of information received from
          Google APIs is limited to the purposes disclosed here and is subject
          to the applicable Google API Services User Data Policy.
        </p>
        <p>
          For details about Google&apos;s own data practices, see{' '}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google&apos;s Privacy Policy
          </a>
          .
        </p>
        <h3>Other sign-in methods</h3>
        <p>
          The administration console may also support GitHub and Sign in with
          Apple. These methods are used for the same identity verification and
          administrator authorization purposes. Apple users may choose to hide
          their email address, in which case an Apple relay address may be
          supplied instead of their personal email. Access still depends on
          matching an authorized identity.
        </p>

        <h2 id="use-of-data">IV. How We Use Information</h2>
        <p>We process personal information only as reasonably necessary to:</p>
        <ul>
          <li>Deliver and maintain the Website and its public content.</li>
          <li>Authenticate administrators and enforce access restrictions.</li>
          <li>
            Manage published material and perform administrative moderation.
          </li>
          <li>
            Maintain sessions, diagnose errors, and protect against misuse.
          </li>
          <li>
            Respond to privacy or support inquiries and meet legal obligations.
          </li>
        </ul>
        <p>
          Google Sign-In information is used for authentication, authorization,
          and account security, not as a general-purpose source of user data.
        </p>

        <h2 id="sharing">V. Data Sharing and Third Parties</h2>
        <h3>Authentication providers</h3>
        <p>
          Authentication is provided through Google, GitHub, and Apple when
          those options are selected. Each provider processes information under
          its own terms and privacy policy. See{' '}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google
          </a>
          ,{' '}
          <a
            href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          , and{' '}
          <a
            href="https://www.apple.com/legal/privacy/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Apple
          </a>
          .
        </p>
        <h3>Analytics, search, hosting, and assets</h3>
        <p>
          The Website may use Google Analytics to understand aggregated website
          usage, Algolia to provide search, and hosting, object-storage, or CDN
          services to deliver pages and assets. These providers may process
          technical information required to perform their services. Their
          involvement does not mean they are given access to Google Sign-In
          profile information for advertising purposes.
        </p>
        <p>
          For more information, see the privacy policies of{' '}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google
          </a>{' '}
          and{' '}
          <a
            href="https://www.algolia.com/policies/privacy/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Algolia
          </a>
          .
        </p>
        <p>
          We do not sell personal information. We may disclose information to
          service providers for hosting, security, and operation of the Website,
          or when legally required.
        </p>

        <h2 id="storage-security">VI. Storage, Security, and Retention</h2>
        <p>
          We use technical and organizational safeguards, including restricted
          administrative access and authenticated sessions, to protect personal
          information from unauthorized access, alteration, or disclosure. No
          online system can guarantee absolute security.
        </p>
        <p>
          Account and authentication data is retained while needed to maintain
          an authorized account, provide security, resolve disputes, or comply
          with applicable obligations. We delete or de-identify information when
          it is no longer reasonably necessary for those purposes, subject to
          applicable retention requirements and operational backups.
          Authentication sessions may expire or be revoked independently of the
          associated account record.
        </p>
        <p>
          Infrastructure providers may process or store technical data in
          jurisdictions other than the visitor&apos;s country of residence.
        </p>

        <h2 id="rights">VII. Your Choices and Rights</h2>
        <p>
          Depending on applicable law, you may request access to, correction of,
          or deletion of personal information associated with your account, or
          object to certain processing. You can also revoke Yancey Blog&apos;s
          access to your Google Account through your Google Account settings.
          Revoking access prevents future use of that authorization but does
          not, by itself, necessarily delete account records already held by the
          Website.
        </p>
        <p>
          To request deletion or correction of authentication data stored by
          Yancey Blog, email{' '}
          <a href="mailto:developer@yanceyleo.com">developer@yanceyleo.com</a>{' '}
          with sufficient information to identify the relevant account. We will
          review the request and respond in accordance with applicable law,
          subject to identity verification and legitimate retention needs.
        </p>

        <h2 id="cookies">VIII. Cookies and Technical Information</h2>
        <p>
          The administration console uses cookies or equivalent session
          mechanisms required for authentication and account security. The
          public Website and its third-party services may also use cookies or
          similar technologies for analytics and basic functionality, where
          enabled. Browser settings can be used to manage cookies, although
          blocking essential session cookies may prevent sign-in.
        </p>

        <h2 id="changes">IX. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy as the Website and its related
          services evolve. The latest version will be published on this page
          with an updated revision date. Material changes to the handling of
          personal information will be communicated as required by applicable
          law.
        </p>

        <h2 id="contact">X. Contact</h2>
        <p>
          Website and service: <strong>Yancey Blog</strong>
        </p>
        <p>
          Privacy and data requests:{' '}
          <a href="mailto:developer@yanceyleo.com">developer@yanceyleo.com</a>
        </p>
        <p>
          Website:{' '}
          <a href="https://www.yanceyleo.com">https://www.yanceyleo.com</a>
        </p>
      </article>
    </div>
  )
}
