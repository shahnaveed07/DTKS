import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Globe } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import BrandLogo from '../common/BrandLogo.jsx';
import WhatsAppIcon from '../common/WhatsAppIcon.jsx';
import { buildWhatsAppUrl, buildMailtoUrl } from '../../utils/orderUtils.js';

export default function Footer() {
  const { settings, services, adminAccessPolicy } = useApp();
  const currentYear = new Date().getFullYear();

  const hasEmail = Boolean(settings.contactEmail && settings.contactEmail.trim());
  const hasPhone = Boolean(settings.contactPhone && settings.contactPhone.trim());
  const hasWhatsapp = Boolean(settings.whatsappNumber && settings.whatsappNumber.trim());
  const hasLocation = Boolean(settings.businessLocation && settings.businessLocation.trim());
  const serviceArea = settings.serviceArea || 'Srinagar, Kashmir, Jammu & Kashmir, India';
  const mailtoUrl = hasEmail ? buildMailtoUrl(settings.contactEmail) : '';
  const whatsappUrl = hasWhatsapp ? buildWhatsAppUrl(settings.whatsappNumber) : '';

  const socialEntries = Object.entries(settings.socialLinks || {}).filter(
    ([, url]) => typeof url === 'string' && url.trim().length > 0
  );

  return (
    <footer className="border-t border-[#0E532E] bg-[#116438] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Brand Summary */}
          <div className="lg:col-span-3">
            <Link
              to="/"
              aria-label={`${settings.companyName} (DTKS)`}
              className="inline-flex items-center rounded-xl focus-visible:outline-2 focus-visible:outline-white"
            >
              <BrandLogo variant="footer" alt={`${settings.companyName} (DTKS) logo`} />
            </Link>
            <p className="mt-3 text-sm text-[#D6EBDD] leading-relaxed">
              DreamTech Kashmir Solutions (DTKS) builds fast, responsive business websites, portfolios, landing pages, e-commerce storefronts, and custom websites for clients in Kashmir and beyond.
            </p>
            {adminAccessPolicy !== 'blocked_production_local' && (
              <div className="mt-5 flex items-center gap-3">
                <Link
                  to="/admin"
                  className="px-3.5 py-2 text-xs font-medium rounded-lg border border-white/25 text-white hover:bg-white/10 transition-colors whitespace-nowrap"
                >
                  Admin Panel
                </Link>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-white">
              Company
            </h3>
            <ul className="mt-3 space-y-2.5 text-sm">
              <li>
                <Link to="/about" className="text-[#D6EBDD] hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/portfolio" className="text-[#D6EBDD] hover:text-white transition-colors">
                  Our Work
                </Link>
              </li>
              <li>
                <Link to="/packages" className="text-[#D6EBDD] hover:text-white transition-colors">
                  Packages &amp; Pricing
                </Link>
              </li>
              <li>
                <Link to="/team" className="text-[#D6EBDD] hover:text-white transition-colors">
                  Team
                </Link>
              </li>
              <li>
                <Link to="/request-quote" className="text-[#D6EBDD] hover:text-white transition-colors">
                  Request a Quote
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-[#D6EBDD] hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/track-order" className="text-[#D6EBDD] hover:text-white transition-colors">
                  Track Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div className="lg:col-span-3">
            <h3 className="text-sm font-semibold text-white">
              Services
            </h3>
            <ul className="mt-3 space-y-2.5 text-sm">
              {services.slice(0, 6).map((svc) => (
                <li key={svc.id}>
                  <Link
                    to={`/services#${svc.slug}`}
                    className="text-[#D6EBDD] hover:text-white transition-colors"
                  >
                    {svc.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/services"
                  className="text-white font-medium hover:underline transition-colors"
                >
                  All Website Services &rarr;
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="lg:col-span-4">
            <h3 className="text-sm font-semibold text-white">
              Contact &amp; Region
            </h3>
            <ul className="mt-3 space-y-3 text-sm text-[#D6EBDD]">
              <li className="flex items-start gap-2.5">
                <Globe className="w-4 h-4 shrink-0 mt-0.5 text-[#E8F5EC]" />
                <span className="break-words min-w-0">dreamtechkashmirsolutions.studio</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-[#E8F5EC]" />
                <span>{hasLocation ? settings.businessLocation : serviceArea}</span>
              </li>
              {hasEmail && (
                <li className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 shrink-0 mt-0.5 text-[#E8F5EC]" />
                  <a
                    href={mailtoUrl}
                    className="break-words min-w-0 hover:text-white hover:underline transition-colors"
                  >
                    {settings.contactEmail}
                  </a>
                </li>
              )}
              {hasWhatsapp && (
                <li className="flex items-start gap-2.5">
                  <WhatsAppIcon className="w-4 h-4 shrink-0 mt-0.5 text-[#E8F5EC]" />
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white hover:underline transition-colors"
                  >
                    {settings.whatsappNumber}
                  </a>
                </li>
              )}
              {hasPhone && (
                <li className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 shrink-0 mt-0.5 text-[#E8F5EC]" />
                  <span>{settings.contactPhone}</span>
                </li>
              )}
            </ul>
            {socialEntries.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                {socialEntries.map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="capitalize font-medium text-white underline-offset-2 hover:underline"
                  >
                    {platform}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#D6EBDD]">
          <p>&copy; {currentYear} {settings.companyName}. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy-policy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-white transition-colors">
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
