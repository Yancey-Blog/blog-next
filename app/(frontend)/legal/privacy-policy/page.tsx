import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Yancey Blog',
  description: 'Privacy policy for Yancey Blog.'
}

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 pb-16 pt-28">
      <h1 className="mb-2 text-4xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mb-10 text-sm text-muted-foreground">
        Last updated: March 3, 2022
      </p>

      <nav className="mb-12 rounded-xl border bg-muted/40 p-6">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Contents
        </p>
        <ol className="space-y-1.5 text-sm">
          {[
            ['#types-of-data', 'I. Types of Data Collected'],
            ['#mode-and-place', 'II. Mode and Place of Processing the Data'],
            ['#purposes', 'III. The Purposes of Processing'],
            [
              '#detailed-processing',
              'IV. Detailed Information on the Processing of Personal Data'
            ],
            ['#user-rights', 'V. The Rights of Users'],
            [
              '#additional-info',
              'VI. Additional Information about Data Collection and Processing'
            ],
            ['#third-party-services', 'VII. Third-Party Services'],
            ['#definitions', 'VIII. Definitions and Legal References'],
            ['#owner', 'IX. Owner and Data Controller']
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
        <h2 id="types-of-data">I. Types of Data Collected</h2>
        <p>
          Among the types of Personal Data that this Application collects, by
          itself or through third parties, there are: Cookies and Usage Data.
        </p>
        <p>
          Complete details on each type of Personal Data collected are provided
          in the dedicated sections of this privacy policy or by specific
          explanation texts displayed prior to the Data collection.
        </p>
        <p>
          Personal Data may be freely provided by the User, or, in case of Usage
          Data, collected automatically when using this Application.
        </p>
        <p>
          Unless specified otherwise, all Data requested by this Application is
          mandatory and failure to provide this Data may make it impossible for
          this Application to provide its services.
        </p>
        <p>
          Any use of Cookies — or of other tracking tools — by this Application
          or by the owners of third-party services used by this Application
          serves the purpose of providing the Service required by the User, in
          addition to any other purposes described in the present document.
        </p>
        <p>
          Users are responsible for any third-party Personal Data obtained,
          published or shared through this Application and confirm that they
          have the third party&apos;s consent to provide the Data to the Owner.
        </p>

        <h2 id="mode-and-place">II. Mode and Place of Processing the Data</h2>
        <h3>Methods of processing</h3>
        <p>
          The Owner takes appropriate security measures to prevent unauthorized
          access, disclosure, modification, or unauthorized destruction of the
          Data. The Data processing is carried out using computers and/or
          IT-enabled tools, following organizational procedures and modes
          strictly related to the purposes indicated.
        </p>
        <h3>Legal basis of processing</h3>
        <p>
          The Owner may process Personal Data relating to Users if one of the
          following applies:
        </p>
        <ul>
          <li>
            Users have given their consent for one or more specific purposes.
          </li>
          <li>
            Provision of Data is necessary for the performance of an agreement
            with the User and/or for any pre-contractual obligations thereof.
          </li>
          <li>
            Processing is necessary for compliance with a legal obligation to
            which the Owner is subject.
          </li>
          <li>
            Processing is related to a task that is carried out in the public
            interest or in the exercise of official authority vested in the
            Owner.
          </li>
          <li>
            Processing is necessary for the purposes of the legitimate interests
            pursued by the Owner or by a third party.
          </li>
        </ul>
        <h3>Place</h3>
        <p>
          The Data is processed at the Owner&apos;s operating offices and in any
          other places where the parties involved in the processing are located.
          Depending on the User&apos;s location, data transfers may involve
          transferring the User&apos;s Data to a country other than their own.
        </p>
        <h3>Retention time</h3>
        <p>
          Personal Data shall be processed and stored for as long as required by
          the purpose they have been collected for. Once the retention period
          expires, Personal Data shall be deleted.
        </p>

        <h2 id="purposes">III. The Purposes of Processing</h2>
        <p>
          The Data concerning the User is collected to allow the Owner to
          provide its Services, as well as for the following purposes:
          Analytics, Registration and authentication, and Interaction with
          external social networks and platforms.
        </p>

        <h2 id="detailed-processing">
          IV. Detailed Information on the Processing of Personal Data
        </h2>
        <h3>Analytics</h3>
        <p>
          Google Analytics is a web analysis service provided by Google Inc.
          Google utilizes the Data collected to track and examine the use of
          this Application and prepare reports on its activities. Personal Data
          collected: Cookies and Usage Data. Place of processing: United States
          —{' '}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </a>
          .
        </p>
        <h3>Registration and authentication</h3>
        <p>
          GitHub OAuth is a registration and authentication service provided by
          GitHub Inc. Place of processing: United States —{' '}
          <a
            href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </a>
          .
        </p>
        <p>
          Google OAuth is a registration and authentication service provided by
          Google Inc. Place of processing: United States —{' '}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </a>
          .
        </p>

        <h2 id="user-rights">V. The Rights of Users</h2>
        <p>
          Users may exercise certain rights regarding their Data processed by
          the Owner. In particular, Users have the right to do the following:
        </p>
        <ul>
          <li>
            <strong>Withdraw their consent at any time.</strong> Users have the
            right to withdraw consent where they have previously given their
            consent to the processing of their Personal Data.
          </li>
          <li>
            <strong>Object to processing of their Data.</strong> Users have the
            right to object to the processing of their Data if the processing is
            carried out on a legal basis other than consent.
          </li>
          <li>
            <strong>Access their Data.</strong> Users have the right to learn if
            Data is being processed by the Owner and obtain a copy of the Data
            undergoing processing.
          </li>
          <li>
            <strong>Verify and seek rectification.</strong> Users have the right
            to verify the accuracy of their Data and ask for it to be updated or
            corrected.
          </li>
          <li>
            <strong>Restrict the processing of their Data.</strong> Users have
            the right, under certain circumstances, to restrict the processing
            of their Data.
          </li>
          <li>
            <strong>
              Have their Personal Data deleted or otherwise removed.
            </strong>{' '}
            Users have the right, under certain circumstances, to obtain the
            erasure of their Data from the Owner.
          </li>
          <li>
            <strong>Lodge a complaint.</strong> Users have the right to bring a
            claim before their competent data protection authority.
          </li>
        </ul>
        <h3>How to exercise these rights</h3>
        <p>
          Any requests to exercise User rights can be directed to the Owner
          through the contact details provided in this document. These requests
          can be exercised free of charge and will be addressed by the Owner as
          early as possible and always within one month.
        </p>

        <h2 id="additional-info">
          VI. Additional Information about Data Collection and Processing
        </h2>
        <h3>Legal action</h3>
        <p>
          The User&apos;s Personal Data may be used for legal purposes by the
          Owner in Court or in the stages leading to possible legal action
          arising from improper use of this Application or the related Services.
        </p>
        <h3>System logs and maintenance</h3>
        <p>
          For operation and maintenance purposes, this Application and any
          third-party services may collect files that record interaction with
          this Application (System logs) and use other Personal Data (such as
          the IP Address) for this purpose.
        </p>
        <h3>Changes to this privacy policy</h3>
        <p>
          The Owner reserves the right to make changes to this privacy policy at
          any time by giving notice to its Users on this page. It is strongly
          recommended to check this page often, referring to the date of the
          last modification listed at the bottom.
        </p>

        <h2 id="third-party-services">VII. Third-Party Services</h2>
        <p>
          This Application uses Algolia for full-text search functionality.
          Search queries may be processed by Algolia&apos;s servers. For more
          information, please refer to{' '}
          <a
            href="https://www.algolia.com/policies/privacy/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Algolia&apos;s Privacy Policy
          </a>
          .
        </p>
        <p>
          Images and static assets are served via AWS S3 and a CDN. Access logs
          may be retained for operational and security purposes.
        </p>

        <h2 id="definitions">VIII. Definitions and Legal References</h2>
        <h3>Personal Data (or Data)</h3>
        <p>
          Any information that directly, indirectly, or in connection with other
          information allows for the identification or identifiability of a
          natural person.
        </p>
        <h3>Usage Data</h3>
        <p>
          Information collected automatically through this Application, which
          can include: IP addresses, URI addresses, time of the request, browser
          and operating system details, and other parameters about the
          User&apos;s IT environment.
        </p>
        <h3>User</h3>
        <p>
          The individual using this Application who, unless otherwise specified,
          coincides with the Data Subject.
        </p>
        <h3>Cookies</h3>
        <p>Small sets of data stored in the User&apos;s device.</p>
        <h3>Legal information</h3>
        <p>
          This privacy statement has been prepared based on provisions of
          multiple legislations, including Art. 13/14 of Regulation (EU)
          2016/679 (General Data Protection Regulation). This privacy policy
          relates solely to this Application, if not stated otherwise within
          this document.
        </p>

        <h2 id="owner">IX. Owner and Data Controller</h2>
        <p>Yancey Inc. and its affiliates.</p>
        <p>
          Owner contact email:{' '}
          <a href="mailto:developer@yanceyleo.com">developer@yanceyleo.com</a>
        </p>
      </article>
    </div>
  )
}
