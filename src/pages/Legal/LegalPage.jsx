import SEO from '../../components/common/SEO.jsx';
import { useApp } from '../../context/AppContext.jsx';

export default function LegalPage({ type = 'privacy' }) {
  const { settings, submissionMode } = useApp();
  const isPrivacy = type === 'privacy';
  const isLocalPreview = submissionMode === 'local_demo';

  return (
    <>
      <SEO settings={settings} />

      <section className="py-14 bg-[#F7FAF7]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-8 space-y-6">
            <div>
              <p className="text-xs font-semibold text-[#16834A]">
                Legal Information
              </p>
              <h1 className="mt-1 font-display text-3xl font-bold text-[#17231C]">
                {isPrivacy ? 'Privacy Policy' : 'Terms & Conditions'}
              </h1>
            </div>

            {isPrivacy ? (
              isLocalPreview ? (
                <div className="space-y-4 text-sm text-[#64756B] leading-relaxed">
                  <p>
                    In local preview mode for <strong className="text-[#17231C]">{settings.companyName}</strong>, submitted project quote requests, contact inquiries, and admin edits are stored inside your current browser&apos;s LocalStorage for offline development testing.
                  </p>
                  <p>
                    No data entered during local preview mode is transmitted to third-party marketing networks or external payment processors.
                  </p>
                  <p>
                    You may clear locally stored preview records at any time using the browser site storage settings or administrative local controls.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 text-sm text-[#64756B] leading-relaxed">
                  <p>
                    <strong className="text-[#17231C]">{settings.companyName} (DTKS)</strong> on{' '}
                    <span className="text-[#17231C] font-medium">dreamtechkashmirsolutions.studio</span> collects only the contact, account, and website project details you voluntarily submit through our quote request, inquiry, and client portal workflows.
                  </p>
                  <p>
                    Submitted information (such as your name, email address, phone number, business name, and project scope) is used strictly to prepare quotations, track active website orders, coordinate domain/hosting arrangements, and provide customer support.
                  </p>
                  <p>
                    Client portal authentication uses secure session cookies and verified email checks. We do not sell, rent, or distribute client contact records or project briefs to third-party advertising networks.
                  </p>
                </div>
              )
            ) : (
              <div className="space-y-4 text-sm text-[#64756B] leading-relaxed">
                <p>
                  <strong className="text-[#17231C]">Hybrid Quotations:</strong> Package starting prices shown on this platform serve as baseline estimates. Final project pricing and timelines are confirmed in writing after reviewing specific client requirements.
                </p>
                <p>
                  <strong className="text-[#17231C]">Hosting &amp; Domain Ownership:</strong> When Customer-Managed Hosting is selected, the client retains direct ownership and renewal billing responsibility. Under DreamTech-Managed Hosting, hosting charges are quoted separately with transparent renewal tracking.
                </p>
                <p>
                  <strong className="text-[#17231C]">Maintenance Boundaries:</strong> Ongoing maintenance plans are optional and not included by default in development packages. Major new features, full redesigns, and third-party API/SaaS subscriptions are scoped separately.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
