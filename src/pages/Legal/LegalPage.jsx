import SEO from '../../components/common/SEO.jsx';
import { useApp } from '../../context/AppContext.jsx';

export default function LegalPage({ type = 'privacy' }) {
  const { settings } = useApp();
  const isPrivacy = type === 'privacy';

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
              <div className="space-y-4 text-sm text-[#64756B] leading-relaxed">
                <p>
                  This frontend prototype for <strong className="text-[#17231C]">{settings.companyName}</strong> stores submitted project quote requests, contact inquiries, and admin edits strictly inside your local browser&apos;s LocalStorage.
                </p>
                <p>
                  No personal details entered into this demonstration interface are transmitted to an external backend server, third-party payment processor, or marketing network.
                </p>
                <p>
                  You may clear all locally persisted data at any time using the &ldquo;Reset Demo Data&rdquo; control in the Admin Prototype sidebar or by clearing your browser site storage.
                </p>
              </div>
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
