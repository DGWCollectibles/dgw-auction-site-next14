import InfoPageLayout from "@/components/InfoPageLayout";

export const metadata = {
  title: "Privacy Policy | DGW Collectibles & Estates",
  description: "How DGW Collectibles collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <InfoPageLayout title="Privacy Policy" subtitle="Legal" lastUpdated="February 2026">
      <p>
        This Privacy Policy explains how DGW Collectibles, Inc. d/b/a DGW Collectibles & Estates
        (&quot;DGW,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, and discloses personal information of its
        customers, prospective customers, and visitors to its website at dgw.auction (the &quot;Site&quot;).
      </p>

      <h2>1. Collection of Personal Information</h2>

      <h3>Information Collected Directly From You</h3>
      <p>
        We may collect personal information directly from you, for example through a web form, while
        registering to bid on any of our auctions, when you contact us for customer support, or upon
        payment for auction items. Personal information we collect directly from you may include:
      </p>
      <ul>
        <li>First and last name</li>
        <li>Mailing and shipping address</li>
        <li>Email address</li>
        <li>Phone number</li>
        <li>Billing information (processed securely by Stripe)</li>
      </ul>

      <h3>Information Collected From Your Device</h3>
      <p>
        Our website may use tracking technologies such as cookies, web beacons, pixels, and other
        similar technologies to automatically collect certain information from your device, including
        your IP address, geographic location, referring website address, browser type and version,
        and other information about how you interact with the Site. You may disable cookies in your
        web browser; however, parts of our website may not function properly. More information about
        blocking and deleting cookies is available
        at <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer">allaboutcookies.org</a>.
      </p>
      <p>
        Our email campaigns may also use tracking technologies such as web beacons, pixels, and other
        similar technologies to automatically collect certain information such as your IP address,
        browser type and version, and email engagement statistics.
      </p>

      <h2>2. How We Use Your Information</h2>
      <p>We use information collected directly from you to:</p>
      <ul>
        <li>Process auction registrations, bids, and payments</li>
        <li>Provide customer service and support</li>
        <li>Send transactional communications (invoices, shipping confirmations, outbid notifications)</li>
        <li>Market our upcoming auctions, products, and services to you, including by email and text message, subject to your consent</li>
        <li>Send abandoned cart reminders if you added items but did not complete checkout</li>
      </ul>
      <p>
        We use information collected automatically from your device to provide and optimize our website
        and to assist with our advertising and marketing efforts.
      </p>

      <h2>3. Third-Party Service Providers</h2>
      <p>
        We may use third-party service providers to assist us with providing and marketing our products
        and services to you, and we may share your information with such third parties for these limited
        purposes:
      </p>
      <ul>
        <li>
          <strong>Stripe</strong> is our payment processor. Stripe uses and processes your payment
          information in accordance with its privacy policy available
          at <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">stripe.com/privacy</a>.
          We never store your full credit card number on our servers.
        </li>
        <li>
          <strong>Supabase</strong> provides our database and authentication infrastructure. Your account
          information is stored securely in accordance with industry-standard practices.
        </li>
        <li>
          <strong>Resend</strong> is used for transactional email delivery (invoices, outbid notifications,
          winner notifications).
        </li>
        <li>
          <strong>Vercel</strong> hosts our website and processes web requests in accordance with its
          privacy policy.
        </li>
        <li>
          <strong>Google Ads</strong> may be used to help us understand how visitors interact with our
          website and to serve relevant advertisements.
        </li>
      </ul>
      <p>
        We may also share your personal information if necessary to comply with applicable laws and
        regulations, to respond to a subpoena, search warrant, or other lawful request for information
        we receive, or to otherwise protect our rights.
      </p>

      <h2>4. Email and Text Message Communications</h2>
      <p>
        If you wish to unsubscribe from our email campaigns, please click on the Unsubscribe link at
        the bottom of any marketing email sent from us.
      </p>
      <p>
        If you wish to stop receiving text messages from us, reply STOP, QUIT, CANCEL, OPT-OUT, or
        UNSUBSCRIBE to any text message sent from us. For more information, see our Mobile Messaging
        Terms in the Buyer Terms section of this site.
      </p>

      <h2>5. Your Rights</h2>
      <p>
        You may have the right to request access to the personal information we hold about you, to
        port it to a new service, or to request that your personal information be corrected or deleted.
        To exercise any of these rights, please contact us at{" "}
        <a href="mailto:dgwcollectibles@gmail.com">dgwcollectibles@gmail.com</a>.
      </p>
      <p>
        If you are a California resident, you may have additional rights under the California Consumer
        Privacy Act (CCPA), including the right to know what personal information we have collected
        about you, the right to request deletion of your personal information, and the right to opt
        out of the sale of your personal information. DGW does not sell personal information.
      </p>

      <h2>6. Data Security</h2>
      <p>
        We implement commercially reasonable technical and organizational measures to protect your
        personal information against unauthorized access, loss, destruction, or alteration. All payment
        information is processed through Stripe&apos;s PCI Level 1 certified infrastructure and is never
        stored on our servers. However, no method of transmission over the Internet or method of
        electronic storage is 100% secure, and we cannot guarantee absolute security.
      </p>

      <h2>7. Data Retention</h2>
      <p>
        We retain your personal information for as long as necessary to provide our services to you,
        to comply with our legal obligations, resolve disputes, and enforce our agreements. Auction
        transaction records are retained for a minimum of seven (7) years in accordance with applicable
        tax and business record-keeping requirements.
      </p>

      <h2>8. Children&apos;s Privacy</h2>
      <p>
        Our services are not directed to individuals under the age of 18. We do not knowingly collect
        personal information from children. If we become aware that a child has provided us with personal
        information, we will take steps to delete such information.
      </p>

      <h2>9. Changes to This Privacy Policy</h2>
      <p>
        We may update this Privacy Policy at any time. Changes will be posted on this page with an
        updated &quot;Last updated&quot; date. We encourage you to review this Privacy Policy periodically.
        Your continued use of our services after any changes constitutes your acceptance of the
        updated Privacy Policy.
      </p>

      <h2>10. Contact Information</h2>
      <p>
        If you have any questions about this Privacy Policy or our privacy practices, please contact us:
      </p>
      <p>
        <strong>DGW Collectibles, Inc.</strong><br />
        d/b/a DGW Collectibles & Estates<br />
        Poughkeepsie, NY 12603<br />
        Email: <a href="mailto:dgwcollectibles@gmail.com">dgwcollectibles@gmail.com</a>
      </p>
    </InfoPageLayout>
  );
}
