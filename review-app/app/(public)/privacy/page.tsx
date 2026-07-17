'use client'

import { useEffect } from 'react'
import '../dunathon-landing.css'
import DunaLandingFooter from '@/components/landing/DunaLandingFooter'

export default function PrivacyPage() {
  useEffect(() => {
    const burger = document.querySelector('.nav-burger') as HTMLElement
    const mobile = document.querySelector('.nav-mobile') as HTMLElement
    if (!burger || !mobile) return
    const toggle = () => mobile.classList.toggle('open')
    const close = () => mobile.classList.remove('open')
    burger.addEventListener('click', toggle)
    mobile.querySelectorAll('a').forEach((a) => a.addEventListener('click', close))
    return () => {
      burger.removeEventListener('click', toggle)
      mobile.querySelectorAll('a').forEach((a) => a.removeEventListener('click', close))
    }
  }, [])

  return (
    <div className="duna-landing legal-page">

      {/* ===== NAV ===== */}
      <div className="nav-shell">
        <div className="wrap">
          <nav className="nav">
            <a href="/" className="logo-link">
              <img className="logo" src="/review/screens/assets/kiduna-logo.svg" alt="Kiduna Club" style={{ width: 'auto' }} />
            </a>
            <div className="nav-links">
              <a href="/showcase">Showcase</a>
              <a href="/#earn">How to Earn</a>
              <a href="/how-it-works">How it Works</a>
              <a href="/#events">Events</a>
              <a href="/#about">About</a>
              <a href="/nightpapers">Nightpapers</a>
              <a href="/launchpad">Launchpad</a>
            </div>
            <div className="nav-actions">
              <a href="/#contact" className="nav-login">Get in Touch</a>
              <a href="/login" className="nav-login">Log in</a>
              <a href="/#contact" className="nav-cta">Join Early Access →</a>
            </div>
            <button className="nav-burger" aria-label="Menu">☰</button>
          </nav>
          <div className="nav-mobile">
            <a href="/showcase">Showcase</a>
            <a href="/#earn">How to Earn</a>
            <a href="/how-it-works">How it Works</a>
            <a href="/#events">Events</a>
            <a href="/#about">About</a>
            <a href="/nightpapers">Nightpapers</a>
            <a href="/launchpad">Launchpad</a>
            <a href="/#contact">Get in Touch</a>
            <a href="/login">Log in</a>
            <a href="/#contact">Join Early Access →</a>
          </div>
        </div>
      </div>

      {/* ===== PAGE HERO ===== */}
      <header className="page-hero">
        <img className="ridge" src="/review/screens/images/landing/ridge-motif.svg" alt="" aria-hidden="true" />
        <div className="wrap">
          <div className="eyebrow"><span className="dot" />Legal</div>
          <h1>Privacy <em className="wv-emph">Policy.</em></h1>
          <p className="lead">Last modified May 5, 2025.</p>
        </div>
      </header>

      {/* ===== LEGAL ===== */}
      <section className="section">
        <div className="wrap legal">
          <p>This privacy policy (&ldquo;Privacy Policy&rdquo;) explains how Kiduna Club (&ldquo;KC,&rdquo; &ldquo;our,&rdquo; &ldquo;we,&rdquo; or &ldquo;us&rdquo;) collects, uses, and discloses information about you. This Privacy Policy applies when you visit this website (the &ldquo;Website&rdquo;), use our mobile app, interact with any of our AI agents, contact our team by email or Telegram, engage with us on social media, or otherwise interact with us.</p>
          <p>We may change this Privacy Policy from time to time. If we make changes, we will notify you by revising the date at the top of this policy and, in some cases, we may provide you with additional notice (such as adding a statement to our Website or sending you a notification). We encourage you to review this Privacy Policy regularly to stay informed about our information practices and the choices available to you.</p>

          <h2>Collection of Information</h2>
          <h3>Information You Provide to Us</h3>
          <p>We collect information you provide directly to us. For example, you share information directly with us when you fill out a form, make a purchase, mint a token, connect with us on third-party platforms, participate in a contest or promotion, request customer support, or otherwise communicate with us. The types of personal information we may collect include your name, email address, biographical data, postal address, wallet address, phone number, credit card and other payment information, and any other information you choose to provide.</p>
          <h3>Information We Collect Automatically When You Interact with Us</h3>
          <p>When you access or use our Website or otherwise transact business with us, we automatically collect certain information, including:</p>
          <ul>
            <li><b>Transactional Information:</b> When you make a purchase or return, we collect information about the transaction, such as product details, purchase price, and the date and location of the transaction.</li>
            <li><b>Device and Usage Information:</b> We collect information about how you access our Website, including data about the device and network you use, such as your hardware model, operating system version, mobile network, IP address, unique device identifiers, browser type, and app version. We also collect information about your activity on our Website, such as access times, pages viewed, links clicked, and the page you visited before navigating to our Website.</li>
            <li><b>Location Information:</b> In accordance with your device permissions, we may collect information about the precise location of your device. You may stop the collection of precise location information at any time.</li>
            <li><b>Information Collected by Cookies and Similar Tracking Technologies:</b> We (and our service providers) use tracking technologies, such as cookies and web beacons, to collect information about you. Cookies are small data files stored on your hard drive or in device memory that help us improve our Website and your experience, see which areas and features of our Website are popular, and count visits. Web beacons (also known as &ldquo;pixel tags&rdquo; or &ldquo;clear GIFs&rdquo;) are electronic images that we use on our Website and in our emails to help deliver cookies, count visits, and understand usage and campaign effectiveness.</li>
          </ul>
          <h3>Information We Collect from Other Sources</h3>
          <p>We obtain information from third-party sources. For example, we may collect information about you from identity verification services, data analytics providers, wallet address providers, and mailing list providers (if applicable).</p>

          <h2>Use of Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve our products and services;</li>
            <li>Process transactions and send you related information, including confirmations, receipts, invoices, customer experience surveys, and recall notices;</li>
            <li>Personalize and improve your experience on our Website;</li>
            <li>Send you technical notices, security alerts, and support and administrative messages;</li>
            <li>Respond to your comments and questions and provide customer service;</li>
            <li>Communicate with you about products, services, and events offered by us and others and provide news and information that we think will interest you;</li>
            <li>Monitor and analyze trends, usage, and activities in connection with our Website;</li>
            <li>Facilitate contests, sweepstakes, and promotions and process and deliver entries and rewards;</li>
            <li>Detect, investigate, and prevent security incidents and other malicious, deceptive, fraudulent, or illegal activity and protect the rights and property of KC and others;</li>
            <li>Debug to identify and repair errors in our Website;</li>
            <li>Comply with our legal and financial obligations; and</li>
            <li>Carry out any other purpose described to you at the time the information was collected.</li>
          </ul>

          <h2>Sharing of Information</h2>
          <p>We share personal information in the following circumstances or as otherwise described in this policy:</p>
          <ul>
            <li>We share personal information with vendors, service providers, and consultants that need access to personal information in order to perform services for us, such as companies that assist us with web hosting, shipping and delivery, payment processing, fraud prevention, customer service, and marketing and advertising.</li>
            <li>We may disclose personal information if we believe that disclosure is in accordance with, or required by, any applicable law or legal process, including lawful requests by public authorities to meet national security or law enforcement requirements.</li>
            <li>We may share personal information if we believe that your actions are inconsistent with our user agreements or policies, if we believe that you have violated the law, or if we believe it is necessary to protect the rights, property, and safety of KC, our users, the public, or others.</li>
            <li>We share personal information with our lawyers and other professional advisors where necessary to obtain advice or otherwise protect and manage our business interests.</li>
            <li>We may share personal information in connection with, or during negotiations concerning, any merger, sale of company assets, financing, or acquisition of all or a portion of our business by another company.</li>
            <li>We share personal information with your consent or at your direction.</li>
            <li>We also share aggregated or de-identified information that cannot reasonably be used to identify you.</li>
          </ul>

          <h2>Analytics</h2>
          <p>We may collect your IP address, web browser, mobile network information, pages viewed, time spent on pages or in mobile apps, links clicked, and conversion information. This information may be used by KC and others to, among other things, research, analyze and track data, determine the popularity of certain content, and better understand your online activity. However, if you have deleted and disabled cookies, these uses will not be possible to the extent they are based on cookie information. We use Google Analytics to analyze traffic. You can find out more information about Google Analytics cookies at <a href="https://developers.google.com/analytics/devguides/collection/analyticsjs/cookie-usage" target="_blank" rel="noopener">developers.google.com</a>. To opt out of Google Analytics relating to your use of our site, you can download and install the browser plugin available at <a href="https://tools.google.com/dlpage/gaoptout?hl=en" target="_blank" rel="noopener">tools.google.com/dlpage/gaoptout</a>.</p>

          <h2>Transfer of Information to the United States and Other Countries</h2>
          <p>We operate and engage service providers in various jurisdictions. Therefore, we and our service providers may transfer your personal information to, or store or access it in, jurisdictions that may not provide levels of data protection that are equivalent to those of your home jurisdiction. By using our site, you acknowledge and agree to such transfers and processing, including to and in the United States. We will take steps to ensure that your personal information receives an adequate level of protection in the jurisdictions in which we process it.</p>

          <h2>Your Choices</h2>
          <h3>Cookies</h3>
          <p>Most browsers are set to accept cookies by default. If you prefer, you can usually set your browser to disable cookies, or to alert you when cookies are being sent. Likewise, most mobile devices allow you to disable the ability for geolocation information to be collected from your mobile device. The help function on most browsers and mobile devices contains instructions on how to set your browser to notify you before accepting cookies, disable cookies entirely, or disable the collection of geolocation data. You need to set each browser, on each device you use to surf the Web. Thus, if you use multiple browsers (e.g., Chrome, Safari, Firefox, etc.), you should repeat this procedure with each one. Similarly, if you connect to the Web from multiple devices (e.g., work and home), you need to set each browser on each device. Depending on your jurisdiction, you may be able to utilize additional cookie management tools. Please note that removing or rejecting cookies could affect the availability and functionality of our Website.</p>
          <h3>Communications Preferences</h3>
          <p>You may opt out of receiving newsletters from us by following the instructions in those communications.</p>

          <h2>Your California Privacy Rights</h2>
          <p>The California Consumer Privacy Act or &ldquo;CCPA&rdquo; (Cal. Civ. Code &sect; 1798.100 et seq.) affords consumers residing in California certain rights with respect to their personal information. If you are a California resident, this section applies to you.</p>
          <h3>California Consumer Privacy Act</h3>
          <p>In the preceding 12 months, we have collected the following categories of personal information: identifiers, financial information, biometric information, internet or electric network activity information, and geolocation data. For details about the precise data points we collect and the categories of sources of such collection, please see the Collection of Information section above. We collect personal information for the business and commercial purposes described in the Use of Information section above.</p>
          <p><b>We do not and will not sell your personal information.</b></p>
          <p>Subject to certain limitations, you have the right to (1) request to know more about the categories and specific pieces of personal information we collect, use, and disclose, (2) request deletion of your personal information, and (3) not be discriminated against for exercising these rights. You may make these requests by contacting us by email at support@kinship.systems. We will verify your request by asking you to provide information related to your recent interactions with us. We will not discriminate against you if you exercise your rights under the CCPA.</p>

          <h2>Additional Disclosures for Individuals in Europe</h2>
          <p>If you are located in the European Economic Area (&ldquo;EEA&rdquo;), the United Kingdom, or Switzerland, you have certain rights and protections under the law regarding the processing of your personal data, and this section applies to you.</p>
          <h3>Legal Basis for Processing</h3>
          <p>When we process your personal data, we will do so in reliance on the following lawful bases:</p>
          <ul>
            <li>To perform our responsibilities under our contract with you (e.g., processing payments for and providing the products and services you requested).</li>
            <li>When we have a legitimate interest in processing your personal data to operate our business or protect our interests (e.g., to provide, maintain, and improve our products and services, conduct data analytics, and communicate with you).</li>
            <li>To comply with our legal obligations (e.g., to maintain a record of your consents and track those who have opted out of communications).</li>
            <li>When we have your consent to do so (e.g., when you opt in to receive communications from us). When consent is the legal basis for our processing of your personal data, you may withdraw such consent at any time.</li>
          </ul>
          <h3>Data Retention</h3>
          <p>We store personal data for as long as necessary to carry out the purposes for which we originally collected it and for other legitimate business purposes, including to meet our legal, regulatory, or other compliance obligations.</p>
          <h3>Data Subject Requests</h3>
          <p>Subject to certain limitations, you have the right to request access to the personal data we hold about you and to receive your data in a portable format, the right to ask that your personal data be corrected or erased, and the right to object to, or request that we restrict, certain processing. If you would like to exercise any of these rights, please contact our technology services provider at support@kinship.systems.</p>
          <h3>Questions or Complaints</h3>
          <p>If you have a concern about our processing of personal data that we are not able to resolve, you have the right to lodge a complaint with the Data Protection Authority where you reside. Contact details for your Data Protection Authority can be found using the links below:</p>
          <ul>
            <li>For individuals in the EEA: <a href="https://edpb.europa.eu/about-edpb/board/members_en" target="_blank" rel="noopener">edpb.europa.eu</a></li>
            <li>For individuals in the UK: <a href="https://ico.org.uk/global/contact-us/" target="_blank" rel="noopener">ico.org.uk</a></li>
            <li>For individuals in Switzerland: <a href="https://www.edoeb.admin.ch/edoeb/en/home/the-fdpic/contact.html" target="_blank" rel="noopener">edoeb.admin.ch</a></li>
          </ul>

          <h2>Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at support@kinship.systems.</p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <DunaLandingFooter />

    </div>
  )
}