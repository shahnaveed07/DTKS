import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Clock, CheckCircle2, Send, MessageSquare } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import SEO from '../../components/common/SEO.jsx';
import Breadcrumbs from '../../components/common/Breadcrumbs.jsx';
import { ROUTE_SEO } from '../../seo/seoConfig.js';
import { validateContactForm } from '../../utils/orderUtils.js';

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
};

export default function ContactPage() {
  const { settings, submitInquiry } = useApp();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submittedRecord, setSubmittedRecord] = useState(null);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validation = validateContactForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    const saved = submitInquiry(formData);
    setSubmittedRecord(saved);
    setFormData(EMPTY_FORM);
    setErrors({});
  };

  const socialEntries = Object.entries(settings.socialLinks || {}).filter(
    ([, url]) => typeof url === 'string' && url.trim().length > 0
  );

  return (
    <>
      <SEO settings={settings} />

      <section className="border-b border-[#E3EBE5] bg-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={ROUTE_SEO['/contact'].breadcrumbs} />
          <div className="max-w-3xl">
            <p className="text-xs font-semibold text-[#16834A]">
              Contact DTKS · DreamTech Kashmir Solutions
            </p>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#17231C]">
              Contact DreamTech Kashmir Solutions (DTKS)
            </h1>
            <p className="mt-4 text-base text-[#64756B] leading-relaxed">
              Have a business website enquiry, website redesign question, maintenance request, or custom quotation requirement in Srinagar, Kashmir, or beyond? Send us a message below,{' '}
              <Link to="/packages" className="text-[#16834A] hover:text-[#116438] font-medium hover:underline">
                view website packages
              </Link>
              , or{' '}
              <Link to="/request-quote" className="text-[#16834A] hover:text-[#116438] font-medium hover:underline">
                request a website quote
              </Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="py-14 bg-[#F7FAF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Contact Details */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6 space-y-5">
                <h2 className="font-display text-lg font-bold text-[#17231C]">
                  Business Contact Information
                </h2>

                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-[#16834A] shrink-0 mt-1" />
                    <div className="min-w-0">
                      <p className="text-xs text-[#64756B]">Email Address</p>
                      <p className="font-medium text-[#17231C] break-words">
                        {settings.contactEmail}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-[#16834A] shrink-0 mt-1" />
                    <div>
                      <p className="text-xs text-[#64756B]">Phone / WhatsApp</p>
                      <p className="font-medium text-[#17231C]">
                        {settings.contactPhone}
                      </p>
                      <p className="text-xs text-[#64756B] mt-0.5">
                        WhatsApp: {settings.whatsappNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-[#16834A] shrink-0 mt-1" />
                    <div>
                      <p className="text-xs text-[#64756B]">Business Location</p>
                      <p className="font-medium text-[#17231C]">
                        {settings.businessLocation}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-[#16834A] shrink-0 mt-1" />
                    <div>
                      <p className="text-xs text-[#64756B]">Working Hours</p>
                      <p className="font-medium text-[#17231C]">
                        {settings.workingHours}
                      </p>
                    </div>
                  </div>
                </div>

                {socialEntries.length > 0 && (
                  <div className="pt-4 border-t border-[#E3EBE5]">
                    <p className="text-xs text-[#64756B] mb-2">Verified Channels</p>
                    <div className="flex flex-wrap gap-3 text-xs">
                      {socialEntries.map(([name, url]) => (
                        <a
                          key={name}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="capitalize font-medium text-[#16834A] hover:text-[#116438] hover:underline"
                        >
                          {name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Google Maps Placeholder */}
              <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6">
                <h3 className="font-display text-sm font-semibold text-[#17231C]">
                  Location Map (Configurable)
                </h3>
                <div className="mt-3 rounded-lg border border-dashed border-[#E3EBE5] bg-[#F7FAF7] p-6 text-center">
                  <MapPin className="w-6 h-6 text-[#16834A] mx-auto mb-2" />
                  <p className="text-xs text-[#64756B] leading-relaxed">
                    {settings.mapEmbedNote}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-7">
              <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6 sm:p-8">
                {submittedRecord ? (
                  <div className="py-6 space-y-4">
                    <div className="w-11 h-11 rounded-lg bg-[#E8F5EC] text-[#16A34A] flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h2 className="font-display text-2xl font-bold text-[#17231C]">
                      Inquiry Recorded Locally
                    </h2>
                    <p className="text-sm text-[#64756B] leading-relaxed">
                      Thank you, <strong className="text-[#17231C]">{submittedRecord.name}</strong>. Because this application is currently in frontend-only mode, your message has been stored in browser LocalStorage rather than dispatched via a live email API.
                    </p>
                    <div className="rounded-lg border border-[#E3EBE5] bg-[#F7FAF7] p-4 text-xs text-[#64756B]">
                      <p><strong className="text-[#17231C]">Subject:</strong> {submittedRecord.subject}</p>
                      <p className="mt-1"><strong className="text-[#17231C]">Email:</strong> {submittedRecord.email}</p>
                    </div>
                    <div className="pt-2 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setSubmittedRecord(null)}
                        className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors"
                      >
                        Send Another Message
                      </button>
                      <Link
                        to="/admin/inquiries"
                        className="px-4 py-2 text-sm font-medium rounded-lg border border-[#16834A] text-[#16834A] hover:bg-[#E8F5EC] transition-colors"
                      >
                        View in Admin Inquiries
                      </Link>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate className="space-y-5">
                    <div className="flex items-center gap-2.5 mb-2">
                      <MessageSquare className="w-5 h-5 text-[#16834A]" />
                      <h2 className="font-display text-xl font-bold text-[#17231C]">
                        Send a General Inquiry
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="contact-name" className="block text-xs font-semibold text-[#17231C] mb-1.5">
                          Full Name *
                        </label>
                        <input
                          id="contact-name"
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleChange('name', e.target.value)}
                          placeholder="Your full name"
                          className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] placeholder:text-[#64756B]/60 focus:outline-none focus:border-[#16834A]"
                        />
                        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                      </div>

                      <div>
                        <label htmlFor="contact-email" className="block text-xs font-semibold text-[#17231C] mb-1.5">
                          Email Address *
                        </label>
                        <input
                          id="contact-email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          placeholder="you@company.com"
                          className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] placeholder:text-[#64756B]/60 focus:outline-none focus:border-[#16834A]"
                        />
                        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="contact-phone" className="block text-xs font-semibold text-[#17231C] mb-1.5">
                          Phone / WhatsApp (Optional)
                        </label>
                        <input
                          id="contact-phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleChange('phone', e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] placeholder:text-[#64756B]/60 focus:outline-none focus:border-[#16834A]"
                        />
                        {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                      </div>

                      <div>
                        <label htmlFor="contact-subject" className="block text-xs font-semibold text-[#17231C] mb-1.5">
                          Subject *
                        </label>
                        <input
                          id="contact-subject"
                          type="text"
                          value={formData.subject}
                          onChange={(e) => handleChange('subject', e.target.value)}
                          placeholder="Project consultation or question"
                          className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] placeholder:text-[#64756B]/60 focus:outline-none focus:border-[#16834A]"
                        />
                        {errors.subject && <p className="mt-1 text-xs text-red-600">{errors.subject}</p>}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="contact-message" className="block text-xs font-semibold text-[#17231C] mb-1.5">
                        Message *
                      </label>
                      <textarea
                        id="contact-message"
                        rows={5}
                        value={formData.message}
                        onChange={(e) => handleChange('message', e.target.value)}
                        placeholder="Tell us briefly about your website goals, redesign timeline, or hosting questions..."
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] placeholder:text-[#64756B]/60 focus:outline-none focus:border-[#16834A]"
                      />
                      {errors.message && <p className="mt-1 text-xs text-red-600">{errors.message}</p>}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                      <p className="text-xs text-[#64756B]">
                        Need a detailed project estimate?{' '}
                        <Link to="/request-quote" className="text-[#16834A] hover:text-[#116438] hover:underline font-medium">
                          Use the 7-Step Order Form
                        </Link>
                      </p>
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors whitespace-nowrap"
                      >
                        <Send className="w-4 h-4" />
                        <span>Send Message</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
