import { hashPassword } from '../utils/crypto.js';
import { isValidEmail } from '../validators/schemas.js';

/**
 * Safe, Non-Destructive DTKS Database Initializer (`seed.js`)
 *
 * Security & Persistence Guarantees:
 *   1. NEVER uses hardcoded default administrator credentials or fallback passwords.
 *   2. Initial administrator is created ONLY when the `admins` table is empty AND
 *      valid `INITIAL_ADMIN_EMAIL` + `INITIAL_ADMIN_PASSWORD` (>= 12 chars in production,
 *      >= 8 chars in dev/test, not a placeholder) are explicitly supplied via environment secrets.
 *   3. Uses `INSERT OR IGNORE` exclusively — NEVER `INSERT OR REPLACE` or `DELETE` —
 *      guaranteeing that existing production records are never overwritten or erased.
 *   4. Destructive reset/reseed functionality has been permanently removed.
 */

const SEED_SERVICES = [
  {
    id: 'svc-business-websites',
    title: 'Business & Corporate Websites',
    slug: 'business-corporate-websites',
    orderCategory: 'Business & Corporate Websites',
    shortDescription:
      'Professional multi-page websites designed to establish credibility, present your services clearly, and convert visitors into inquiries.',
    description:
      'Complete design and development of structured corporate websites for local companies, consultancies, clinics, hospitality groups, and regional enterprises across Kashmir and beyond.',
    features: [
      'Custom responsive multi-page layout (Desktop, Tablet & Mobile)',
      'Service showcase, company profile, and team pages',
      'Lead capture forms, WhatsApp click-to-chat, and call actions',
      'On-page SEO structure, meta tags, and fast page load optimization',
    ],
    technologies: ['React', 'Next.js', 'Tailwind CSS', 'HTML5 / CSS3', 'Node.js'],
    suitableFor: ['Local Businesses', 'Corporate Firms', 'Consultancies', 'Service Agencies'],
    iconName: 'Building2',
    price: 15000,
  },
  {
    id: 'svc-portfolio-websites',
    title: 'Personal Portfolio Websites',
    slug: 'personal-portfolio-websites',
    orderCategory: 'Personal Portfolio Websites',
    shortDescription:
      'Clean, fast portfolio websites for architects, photographers, doctors, designers, consultants, and independent creators.',
    description:
      'Showcase your work samples, case studies, credentials, and client testimonials in a distraction-free, modern web presentation with direct inquiry or booking forms.',
    features: [
      'Filterable project gallery and detailed case study pages',
      'Biography, resume/CV download, and skill highlights',
      'Client inquiry and consultation request form',
      'Social profile integration and custom domain setup',
    ],
    technologies: ['React', 'Tailwind CSS', 'Vite', 'Modern JavaScript'],
    suitableFor: ['Professionals', 'Architects & Designers', 'Photographers', 'Independent Consultants'],
    iconName: 'Layout',
    price: 9000,
  },
  {
    id: 'svc-landing-pages',
    title: 'Landing Pages',
    slug: 'landing-pages',
    orderCategory: 'Landing Pages',
    shortDescription:
      'Focused, high-conversion single-page websites built for product launches, marketing campaigns, events, and lead generation.',
    description:
      'Engineered for clarity and speed with persuasive copy hierarchy, clear call-to-action sections, trust signals, FAQ accordions, and instant lead submission.',
    features: [
      'Conversion-focused hero, benefits, and social proof sections',
      'Fast-loading assets and Core Web Vitals optimization',
      'Lead form, WhatsApp CTA, and analytics event hooks',
      'Mobile-first layout ideal for paid ad and social traffic',
    ],
    technologies: ['React', 'Tailwind CSS', 'HTML5', 'Vite'],
    suitableFor: ['Marketing Campaigns', 'Product Launches', 'Event Registration', 'Lead Generation'],
    iconName: 'Zap',
    price: 7500,
  },
  {
    id: 'svc-ecommerce-websites',
    title: 'E-Commerce Websites',
    slug: 'e-commerce-websites',
    orderCategory: 'E-Commerce Websites',
    shortDescription:
      'Online storefronts with product catalogs, category filtering, shopping cart workflows, and payment gateway integration.',
    description:
      'Launch a reliable online store for Kashmiri handicrafts, apparel, dry fruits, specialty retail, or D2C brands with intuitive product browsing and order management.',
    features: [
      'Product catalog with categories, variants, and search filters',
      'Cart, checkout workflow, and payment gateway integration',
      'Order management dashboard and customer notifications',
      'Mobile shopping optimization and product SEO schema',
    ],
    technologies: ['React', 'Node.js', 'REST APIs', 'Payment Gateways', 'Tailwind CSS'],
    suitableFor: ['Retail Stores', 'Kashmiri Handicrafts & D2C Brands', 'Boutiques', 'Wholesalers'],
    iconName: 'ShoppingBag',
    price: 30000,
  },
  {
    id: 'svc-booking-websites',
    title: 'Booking & Appointment Websites',
    slug: 'booking-appointment-websites',
    orderCategory: 'Booking & Appointment Websites',
    shortDescription:
      'Websites with structured appointment, consultation, tour, or service reservation workflows.',
    description:
      'Built for clinics, diagnostic centers, travel & tour operators, salons, and service businesses that need customers to request or schedule bookings online.',
    features: [
      'Date, time-slot, and service selection booking forms',
      'Automated booking reference generation and confirmation views',
      'Service catalog with duration and pricing display',
      'Admin booking review and status management',
    ],
    technologies: ['React', 'Node.js', 'Calendar Workflows', 'Tailwind CSS'],
    suitableFor: ['Clinics & Healthcare', 'Travel & Tour Agencies', 'Salons', 'Consultants'],
    iconName: 'CalendarCheck',
    price: 22000,
  },
  {
    id: 'svc-restaurant-hotel-websites',
    title: 'Restaurant & Hotel Websites',
    slug: 'restaurant-hotel-websites',
    orderCategory: 'Restaurant & Hotel Websites',
    shortDescription:
      'Hospitality websites featuring digital menus, room galleries, location maps, and table or stay inquiry forms.',
    description:
      'Designed for hotels, houseboats, resorts, cafes, and restaurants across Kashmir to showcase ambiance, rooms, dining menus, and direct reservation inquiries.',
    features: [
      'Room/property showcase or categorized digital food menu',
      'Direct room reservation or table booking inquiry form',
      'Photo gallery, guest reviews, and Google Maps directions',
      'Commission-free direct WhatsApp and phone inquiry buttons',
    ],
    technologies: ['React', 'Tailwind CSS', 'Responsive Image Galleries'],
    suitableFor: ['Hotels & Resorts', 'Restaurants & Cafes', 'Guest Houses & Homestays'],
    iconName: 'Utensils',
    price: 18000,
  },
  {
    id: 'svc-educational-websites',
    title: 'Educational & Coaching Websites',
    slug: 'educational-institution-websites',
    orderCategory: 'Educational / Coaching Websites',
    shortDescription:
      'Structured websites for schools, coaching institutes, training academies, and educational organizations.',
    description:
      'Present courses, faculty profiles, admission procedures, fee structures, notices, and student inquiry forms in an accessible, parent-friendly layout.',
    features: [
      'Course and program catalog with syllabus highlights',
      'Online admission inquiry and student registration forms',
      'Notice board, announcements, and downloadable brochures',
      'Faculty directory, campus gallery, and results showcase',
    ],
    technologies: ['React', 'Tailwind CSS', 'Content Modules'],
    suitableFor: ['Schools & Colleges', 'Coaching Institutes', 'Skill Academies', 'Training Centers'],
    iconName: 'GraduationCap',
    price: 20000,
  },
  {
    id: 'svc-redesign-optimization',
    title: 'Website Redesign & Speed Optimization',
    slug: 'website-redesign-optimization',
    orderCategory: 'Website Redesign',
    shortDescription:
      'Modernize outdated websites with a fresh responsive UI, cleaner navigation, faster load times, and improved SEO structure.',
    description:
      'Transform slow, legacy, or non-mobile-friendly websites into modern, fast-loading web experiences while preserving your existing domain and brand equity.',
    features: [
      'Complete UI/UX overhaul and mobile responsiveness',
      'Asset compression, code cleanup, and Core Web Vitals tuning',
      'Information architecture and navigation restructuring',
      'SEO-safe URL migration and metadata improvements',
    ],
    technologies: ['React', 'Vite', 'Tailwind CSS', 'Web Performance Optimization'],
    suitableFor: ['Outdated Business Sites', 'Slow Websites', 'Legacy HTML/WordPress Sites'],
    iconName: 'RefreshCw',
    price: 12000,
  },
  {
    id: 'svc-hosting-deployment',
    title: 'Website Hosting & Domain Deployment',
    slug: 'website-hosting-deployment',
    orderCategory: 'Custom Website Development',
    shortDescription:
      'Flexible deployment for customer-owned domains/hosting or fully managed hosting arranged by DreamTech Kashmir Solutions.',
    description:
      'Whether you already own a domain and hosting account or prefer DreamTech to handle DNS, SSL certificates, cloud deployment, and server setup, we configure everything cleanly.',
    features: [
      'Support for both customer-managed and DreamTech-managed hosting',
      'Custom domain DNS configuration and HTTPS/SSL setup',
      'Cloud deployment, CDN caching, and production readiness checks',
      'Clean handover documentation and deployment support',
    ],
    technologies: ['Cloudflare', 'Vercel / Netlify', 'VPS / Cloud Hosting', 'SSL / DNS'],
    suitableFor: ['All New Website Orders', 'Domain Migrations', 'Managed Hosting Clients'],
    iconName: 'Server',
    price: null,
  },
  {
    id: 'svc-website-maintenance',
    title: 'Ongoing Website Maintenance & Care Plans',
    slug: 'website-maintenance-support',
    orderCategory: 'Custom Website Development',
    shortDescription:
      'Optional monthly or annual website care plans covering content updates, backups, security checks, and uptime monitoring.',
    description:
      'Keep your website secure, updated, and running smoothly after launch with scheduled backups, text/photo updates, bug fixes, and priority technical support.',
    features: [
      'Regular website backups and uptime monitoring',
      'Scheduled content, banner, and page updates',
      'Security checks, dependency updates, and SSL renewal checks',
      'Dedicated technical support and bug resolution',
    ],
    technologies: ['Uptime Monitoring', 'Automated Backups', 'Security Audits', 'Content Updates'],
    suitableFor: ['Business Websites', 'E-Commerce Stores', 'Institutions', 'Managed Clients'],
    iconName: 'ShieldCheck',
    price: null,
  },
];

const SEED_PACKAGES = [
  {
    id: 'pkg-starter-website',
    name: 'Starter Website Package',
    category: 'Landing Pages',
    description:
      'Ideal for personal portfolios, landing pages, and new local businesses needing a clean, credible online presence quickly.',
    price: 8500,
    currency: 'INR',
    pagesCount: '1–3 Pages (or Single-Page Long Scroll)',
    features: [
      'Custom mobile-responsive design',
      'Hero, Services/About, Gallery, and Contact sections',
      'Contact form & WhatsApp click-to-chat integration',
      'Basic on-page SEO (titles, meta descriptions, headings)',
      'Deployment to customer hosting or DreamTech-managed hosting',
    ],
    revisions: '2 Design Revision Rounds',
    deliveryEstimate: '5–7 Business Days',
    supportDuration: '15 Days Post-Launch Bug Support',
    hostingOption: 'Customer-Managed or DreamTech-Managed (Quoted Separately)',
    maintenanceOption: 'Optional Monthly or Annual Care Plan',
    addOns: ['Custom Domain Registration', 'Additional Content Pages', 'Logo & Brand Palette Setup'],
    serviceId: 'svc-landing-pages',
    isActive: 1,
    isFeatured: 0,
  },
  {
    id: 'pkg-business-website',
    name: 'Business Website Package',
    category: 'Business & Corporate Websites',
    description:
      'Our most popular package for established businesses, clinics, hotels, and educational institutes requiring a structured multi-page website.',
    price: 18000,
    currency: 'INR',
    pagesCount: 'Up to 6–8 Custom Pages',
    features: [
      'Tailored multi-page design aligned with your brand identity',
      'Home, About, Services, Portfolio/Gallery, FAQ, and Contact pages',
      'Custom inquiry / quote / appointment request form',
      'Speed optimization, responsive images, and technical SEO setup',
      'Google Maps, social links, and WhatsApp integration',
      'Admin or content handover documentation',
    ],
    revisions: '3 Design Revision Rounds',
    deliveryEstimate: '2–3 Weeks',
    supportDuration: '30 Days Post-Launch Support',
    hostingOption: 'Customer-Managed or DreamTech-Managed Hosting Available',
    maintenanceOption: 'Compatible with Basic, Standard, or Premium Maintenance',
    addOns: ['Booking / Appointment Module', 'Blog / News Section', 'Annual Managed Hosting'],
    serviceId: 'svc-business-websites',
    isActive: 1,
    isFeatured: 1,
  },
  {
    id: 'pkg-ecommerce-store',
    name: 'E-Commerce Website Package',
    category: 'E-Commerce Websites',
    description:
      'Complete online storefront for retail brands, Kashmiri handicrafts, specialty foods, and product businesses ready to sell online.',
    price: 35000,
    currency: 'INR',
    pagesCount: 'Storefront + Catalog + Cart + Checkout + Admin',
    features: [
      'Custom storefront design with category & product detail pages',
      'Product search, filtering, and variant selection',
      'Shopping cart and checkout flow with payment gateway setup',
      'Order management view and customer order notifications',
      'Mobile shopping optimization and structured product metadata',
      'Initial batch product upload assistance (up to 25 products)',
    ],
    revisions: '3 Revision Rounds',
    deliveryEstimate: '3–5 Weeks',
    supportDuration: '45 Days Post-Launch Technical Support',
    hostingOption: 'Cloud / VPS Hosting Setup (Customer or DreamTech Managed)',
    maintenanceOption: 'Standard or Premium Maintenance Plan Recommended',
    addOns: ['Bulk Product Onboarding', 'Shipping Partner Integration', 'Discount & Coupon Rules'],
    serviceId: 'svc-ecommerce-websites',
    isActive: 1,
    isFeatured: 0,
  },
  {
    id: 'pkg-redesign-revamp',
    name: 'Website Redesign & Speed Revamp',
    category: 'Website Redesign',
    description:
      'Upgrade an existing outdated or slow website with a modern responsive interface, improved structure, and faster performance.',
    price: 14000,
    currency: 'INR',
    pagesCount: 'Up to 6 Existing Pages Redesigned',
    features: [
      'Audit of existing website layout, speed, and mobile usability',
      'Fresh modern UI design preserving your core brand identity',
      'Mobile-first responsive rebuild and asset optimization',
      'Improved call-to-action placement and inquiry forms',
      'SEO-safe URL structure and metadata cleanup',
    ],
    revisions: '2 Revision Rounds',
    deliveryEstimate: '10–14 Business Days',
    supportDuration: '30 Days Post-Launch Support',
    hostingOption: 'Keep Existing Hosting or Migrate to DreamTech Hosting',
    maintenanceOption: 'Optional Maintenance Plan Available',
    addOns: ['Extra Page Redesign', 'Content Copywriting Refresh', 'Hosting Migration'],
    serviceId: 'svc-redesign-optimization',
    isActive: 1,
    isFeatured: 0,
  },
  {
    id: 'pkg-custom-website',
    name: 'Custom Website & Portal Package',
    category: 'Custom Website Development',
    description:
      'Tailored web development for organizations needing custom booking workflows, multi-role web portals, or bespoke website functionality.',
    price: null,
    currency: 'INR',
    pagesCount: 'Custom Scope Based on Requirements',
    features: [
      'Dedicated requirement discovery and architecture planning',
      'Custom frontend & backend web workflows and admin panels',
      'Third-party API, CRM, or payment integrations',
      'Custom database modeling, role access, and security hardening',
      'Staging environment previews and milestone-based delivery',
    ],
    revisions: 'Iterative Milestone Reviews',
    deliveryEstimate: 'Scoped per Project (Typically 4–8 Weeks)',
    supportDuration: '60 Days Post-Launch Warranty Support',
    hostingOption: 'Dedicated Cloud / Managed Infrastructure Setup',
    maintenanceOption: 'Custom SLA or Premium Care Plan',
    addOns: ['Custom API Integrations', 'Dedicated Managed Cloud Hosting', 'Priority SLA Support'],
    serviceId: 'svc-hosting-deployment',
    isActive: 1,
    isFeatured: 0,
  },
];

const SEED_PORTFOLIO = [
  {
    id: 'proj-sample-hospitality',
    projectTitle: 'Kashmir Boutique Stay & Tour Showcase',
    slug: 'kashmir-boutique-stay-website',
    category: 'Business Websites',
    shortOverview:
      'A responsive hospitality and tour showcase website featuring room galleries, seasonal itineraries, and direct booking inquiry forms.',
    description:
      'Designed to demonstrate how local hotels, houseboats, and travel operators in Kashmir can present their properties with high-resolution galleries, transparent tariff tables, and commission-free direct reservation requests.',
    problemAddressed:
      'Local hospitality businesses often rely solely on third-party aggregators or social media pages without a central website to capture direct inquiries.',
    solutionImplemented:
      'Built a fast, mobile-first hospitality website with room category cards, itinerary highlights, FAQ sections, and a direct WhatsApp + email reservation inquiry workflow.',
    keyFeatures: [
      'Responsive room & package showcase with pricing tiers',
      'Direct stay & tour inquiry form with date selection',
      'Location guide and mobile click-to-call / WhatsApp bar',
      'Fast image loading optimized for mobile networks',
    ],
    technologies: ['React', 'Tailwind CSS', 'Vite', 'Responsive UI'],
    status: 'Sample Showcase',
    isSample: 1,
    isPublished: 1,
    isFeatured: 1,
    completionDate: '2026-02',
    thumbnail: '/assets/images/dreamtech-kashmir-website-studio.jpg',
    images: [
      '/assets/images/dreamtech-kashmir-website-studio.jpg',
      '/assets/images/dtks-corporate-website-showcase.jpg',
    ],
    projectUrl: 'https://dreamtechkashmirsolutions.studio',
  },
  {
    id: 'proj-sample-ecommerce',
    projectTitle: 'Artisanal Kashmiri Crafts & Dry Fruits Storefront',
    slug: 'kashmiri-crafts-ecommerce-storefront',
    category: 'E-Commerce Websites',
    shortOverview:
      'A modern online store layout for regional specialty products with category filtering, product detail drawers, and cart checkout flow.',
    description:
      'Created to showcase a clean, trustworthy D2C e-commerce experience for authentic Kashmiri saffron, dry fruits, and handcrafted goods shipping nationwide.',
    problemAddressed:
      'Regional sellers need a structured product catalog with clear weight/variant pricing and smooth mobile checkout rather than manual DM ordering.',
    solutionImplemented:
      'Engineered an e-commerce storefront with category filters, product detail views, trust badges, and an intuitive cart-to-checkout experience.',
    keyFeatures: [
      'Category filtering and instant product search',
      'Product detail pages with variant/weight pricing',
      'Slide-over shopping cart and structured checkout form',
      'Order confirmation and tracking reference generation',
    ],
    technologies: ['React', 'Tailwind CSS', 'E-Commerce UI', 'REST API Ready'],
    status: 'Sample Showcase',
    isSample: 1,
    isPublished: 1,
    isFeatured: 1,
    completionDate: '2026-02',
    thumbnail: '/assets/images/dtks-ecommerce-website-showcase.jpg',
    images: [
      '/assets/images/dtks-ecommerce-website-showcase.jpg',
      '/assets/images/dreamtech-kashmir-website-studio.jpg',
    ],
    projectUrl: 'https://dreamtechkashmirsolutions.studio',
  },
  {
    id: 'proj-sample-corporate',
    projectTitle: 'Regional Healthcare Clinic & Appointment Website',
    slug: 'healthcare-clinic-appointment-website',
    category: 'Custom Websites',
    shortOverview:
      'A patient-friendly clinic website with department listings, doctor profiles, and an online appointment request workflow.',
    description:
      'Demonstrates a clean, accessible medical and service business website where patients can browse specialties, check visiting hours, and book consultation slots online.',
    problemAddressed:
      'Patients frequently struggle to find accurate doctor timings, department details, and appointment request options online.',
    solutionImplemented:
      'Developed a clear multi-page clinic website with specialist cards, timing schedules, emergency contact banners, and a structured appointment booking form.',
    keyFeatures: [
      'Department and doctor profile directory',
      'Step-by-step patient appointment request form',
      'Clinic timings, location map, and emergency contact bar',
      'High-contrast, accessible typography for all age groups',
    ],
    technologies: ['React', 'Tailwind CSS', 'Form Validation', 'Accessible UI'],
    status: 'Sample Showcase',
    isSample: 1,
    isPublished: 1,
    isFeatured: 1,
    completionDate: '2026-01',
    thumbnail: '/assets/images/dtks-corporate-website-showcase.jpg',
    images: [
      '/assets/images/dtks-corporate-website-showcase.jpg',
      '/assets/images/dtks-educational-website-showcase.jpg',
    ],
    projectUrl: 'https://dreamtechkashmirsolutions.studio',
  },
  {
    id: 'proj-sample-education',
    projectTitle: 'Modern Coaching Academy & Admissions Website',
    slug: 'coaching-academy-admissions-website',
    category: 'Landing Pages',
    shortOverview:
      'An educational institute website featuring course batches, faculty highlights, fee overview, and student admission inquiry forms.',
    description:
      'Built for coaching centers and educational institutes to publish batch schedules, showcase student results, and collect online admission inquiries.',
    problemAddressed:
      'Students and parents need a single reliable website to review course structures, batch dates, and submit admission inquiries.',
    solutionImplemented:
      'Designed an organized educational website with program tabs, downloadable syllabus links, FAQ sections, and an online counseling request form.',
    keyFeatures: [
      'Course & batch schedule showcase',
      'Online student admission & counseling inquiry form',
      'Announcements & downloadable brochure section',
      'Mobile-friendly layout for students and parents',
    ],
    technologies: ['React', 'Tailwind CSS', 'Vite'],
    status: 'Sample Showcase',
    isSample: 1,
    isPublished: 1,
    isFeatured: 0,
    completionDate: '2026-01',
    thumbnail: '/assets/images/dtks-educational-website-showcase.jpg',
    images: [
      '/assets/images/dtks-educational-website-showcase.jpg',
      '/assets/images/dtks-corporate-website-showcase.jpg',
    ],
    projectUrl: 'https://dreamtechkashmirsolutions.studio',
  },
];

const SEED_SETTINGS = {
  companyName: 'DreamTech Kashmir Solutions',
  shortName: 'DTKS',
  tagline: 'Modern Website Design, Development, Hosting & Maintenance in Kashmir',
  websiteUrl: 'https://dreamtechkashmirsolutions.studio',
  contactEmail: 'contact@dreamtechkashmirsolutions.studio',
  contactPhone: '+91 (000) 000-0000 (Placeholder)',
  whatsappNumber: '+91 (000) 000-0000 (Placeholder)',
  businessLocation: 'Srinagar, Jammu & Kashmir (Office Address Configurable)',
  workingHours: 'Monday – Saturday · 10:00 AM – 6:30 PM IST',
  currency: 'INR',
  heroHeading: 'Professional Website Design & Development for Growing Businesses',
  heroSubheading:
    'DreamTech Kashmir Solutions (DTKS) designs, builds, deploys, and maintains fast, modern websites — from business websites and portfolios to e-commerce stores and custom web portals.',
  announcementText:
    'Now accepting new website design, redesign, and managed hosting projects — Request a custom quote online.',
  mapEmbedNote:
    'Google Maps embed coordinates can be configured here once the physical office pin is finalized.',
  socialLinks: {
    linkedin: '',
    github: '',
    instagram: '',
    facebook: '',
    x: '',
  },
  budgetOptions: [
    'Under ₹15,000',
    '₹15,000 – ₹30,000',
    '₹30,000 – ₹60,000',
    '₹60,000 – ₹1,00,000',
    '₹1,00,000+',
    'Need a Custom Estimate',
  ],
  urgencyOptions: [
    'Standard (3–6 Weeks)',
    'Priority (2–3 Weeks)',
    'Urgent (Under 2 Weeks)',
    'Flexible / Planning Stage',
  ],
};

const SEED_ADDONS = [
  {
    id: 'addon-domain',
    name: 'Domain Name Registration & DNS Setup',
    description: 'Assistance with selecting, registering, and configuring DNS records for your custom domain.',
    pricingNote: 'Quoted at actuals / per domain TLD',
  },
  {
    id: 'addon-hosting',
    name: 'DreamTech-Managed Website Hosting',
    description: 'Managed cloud hosting with SSL certificate, CDN caching, and server maintenance handled by DTKS.',
    pricingNote: 'Monthly or Annual Billing',
  },
  {
    id: 'addon-seo',
    name: 'Technical & On-Page SEO Setup',
    description: 'Search-friendly metadata, sitemap.xml, robots.txt, structured schema, and Google Search Console setup.',
    pricingNote: 'Included in Business+ or Add-On',
  },
  {
    id: 'addon-speed',
    name: 'Performance & Speed Optimization',
    description: 'Image compression, lazy loading, bundle optimization, and Core Web Vitals tuning.',
    pricingNote: 'Custom / Per Website',
  },
];

const SEED_MAINTENANCE_PLANS = [
  {
    id: 'maint-basic',
    name: 'Basic',
    billingCycle: 'Monthly / Annual',
    price: 1500,
    currency: 'INR',
    updateAllowance: 'Up to 2 minor text or image updates / month',
    backupFrequency: 'Monthly full website backup',
    securityChecks: 'Basic uptime & SSL certificate monitoring',
    responseTime: 'Within 48–72 business hours',
    hostingNote: 'Can be paired with Customer-Managed or DreamTech-Managed hosting',
    features: [
      'Monthly website health & broken-link check',
      'Up to 2 minor content/banner edits per month',
      'Monthly codebase & database backup',
      'SSL expiry monitoring',
    ],
  },
  {
    id: 'maint-standard',
    name: 'Standard',
    billingCycle: 'Monthly / Annual',
    price: 3000,
    currency: 'INR',
    updateAllowance: 'Up to 5 content or section updates / month',
    backupFrequency: 'Bi-weekly automated backups',
    securityChecks: 'Bi-weekly security, dependency & speed checks',
    responseTime: 'Within 24–48 business hours',
    hostingNote: 'Recommended for active Business & Corporate Websites',
    recommended: true,
    features: [
      'Up to 5 content, image, or page updates per month',
      'Bi-weekly backups and restore point retention',
      'Performance & mobile usability monitoring',
      'Bug fixes and form delivery verification',
      'Priority email & WhatsApp support',
    ],
  },
  {
    id: 'maint-premium',
    name: 'Premium',
    billingCycle: 'Monthly / Annual',
    price: 6000,
    currency: 'INR',
    updateAllowance: 'Up to 12 updates + minor feature enhancements / month',
    backupFrequency: 'Weekly automated backups',
    securityChecks: 'Weekly security audits, uptime alerts & speed tuning',
    responseTime: 'Priority same-day / 24-hour response',
    hostingNote: 'Ideal for E-Commerce, Booking & High-Traffic Websites',
    features: [
      'Weekly automated backups and security patching',
      'Up to 12 content/catalog updates or minor UI tweaks per month',
      'Continuous uptime monitoring & incident recovery',
      'Quarterly speed & SEO technical health report',
      'Dedicated priority support channel',
    ],
  },
  {
    id: 'maint-custom',
    name: 'Custom Care Plan',
    billingCycle: 'Custom Retainer',
    price: null,
    currency: 'INR',
    updateAllowance: 'Tailored to organization workflow',
    backupFrequency: 'Daily or custom backup schedule',
    securityChecks: 'Custom SLA & dedicated infrastructure monitoring',
    responseTime: 'Custom SLA response window',
    hostingNote: 'For multi-portal, institutional, or custom web platforms',
    features: [
      'Custom monthly development & update hours',
      'Dedicated cloud hosting & database administration',
      'Custom backup retention and staging environment',
      'Scheduled team review calls',
    ],
  },
];

const SEED_TEAM = [
  {
    id: 'team-1',
    fullName: 'Lead Full-Stack Web Developer (Role Placeholder)',
    role: 'Full-Stack Web Developer',
    title: 'Website Architecture & Custom Web Development',
    bio: 'Placeholder profile — editable in Admin. Responsible for frontend architecture, backend APIs, database modeling, and responsive web performance.',
    skills: ['React', 'Node.js', 'REST APIs', 'Database Design', 'Performance Optimization'],
    technologies: ['React', 'Vite', 'Node.js', 'PostgreSQL / SQL', 'Tailwind CSS'],
    avatarUrl: '',
    initials: 'FS',
    linkedinUrl: '',
    githubUrl: '',
    websiteUrl: '',
    visible: true,
    isPlaceholder: true,
    sortOrder: 1,
  },
  {
    id: 'team-2',
    fullName: 'UI/UX & Frontend Specialist (Role Placeholder)',
    role: 'UI/UX & Frontend Designer',
    title: 'Responsive Web Design & Conversion Interfaces',
    bio: 'Placeholder profile — editable in Admin. Focuses on clean layouts, brand-consistent typography, mobile responsiveness, and user-friendly website navigation.',
    skills: ['UI/UX Design', 'Responsive Layouts', 'Design Systems', 'Accessibility'],
    technologies: ['Figma', 'Tailwind CSS', 'HTML5 / CSS3', 'Interactive Prototypes'],
    avatarUrl: '',
    initials: 'UI',
    linkedinUrl: '',
    githubUrl: '',
    websiteUrl: '',
    visible: true,
    isPlaceholder: true,
    sortOrder: 2,
  },
];

const initializedDatabases = new WeakSet();

function isValidBootstrapPassword(password, isProduction = false) {
  if (typeof password !== 'string') return false;
  const trimmed = password.trim();
  const minLength = isProduction ? 12 : 8;
  if (trimmed.length < minLength || trimmed.length > 128) return false;
  if (/replace-with|changeme|password123/i.test(trimmed)) return false;
  return true;
}

export const REQUIRED_D1_TABLES = [
  'admins',
  'refresh_sessions',
  'customers',
  'services',
  'packages',
  'portfolio',
  'orders',
  'order_items',
  'order_status_history',
  'contact_messages',
  'site_settings',
  'activity_logs',
  'rate_limits',
];

/**
 * Inspects `sqlite_master` to verify all required D1 tables exist.
 */
export async function verifyDatabaseSchema(db) {
  if (!db || typeof db.prepare !== 'function') {
    return { valid: false, missingTables: [...REQUIRED_D1_TABLES] };
  }

  const rowsResult = await db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all();
  const existingSet = new Set(
    (rowsResult?.results || []).map((r) => String(r.name || '').toLowerCase())
  );

  const missingTables = REQUIRED_D1_TABLES.filter((t) => !existingSet.has(t.toLowerCase()));
  return {
    valid: missingTables.length === 0,
    missingTables,
  };
}

/**
 * Safely and idempotently initializes reference catalog records and optional initial administrator.
 * Never overwrites or deletes existing database rows.
 */
export async function ensureDatabaseSeeded(env) {
  if (!env?.DB || typeof env.DB.prepare !== 'function') {
    const err = new Error('Cloudflare D1 database binding (DB) is not configured.');
    err.status = 503;
    err.code = 'DATABASE_UNAVAILABLE';
    throw err;
  }

  if (initializedDatabases.has(env.DB)) return;

  const now = new Date().toISOString();
  const isProduction = env.ENVIRONMENT === 'production';

  try {
    // 1. Safe Initial Administrator Bootstrap (ONLY if `admins` table is empty AND explicit credentials are provided)
    const adminCountRow = await env.DB.prepare('SELECT COUNT(*) AS cnt FROM admins').first();
    if (!adminCountRow || Number(adminCountRow.cnt) === 0) {
      const rawEmail = (env.INITIAL_ADMIN_EMAIL || env.ADMIN_INITIAL_EMAIL || '').trim().toLowerCase();
      const rawPassword = env.INITIAL_ADMIN_PASSWORD || env.ADMIN_INITIAL_PASSWORD || '';
      const adminName = (
        env.INITIAL_ADMIN_NAME ||
        env.ADMIN_INITIAL_NAME ||
        'DTKS Principal Administrator'
      ).trim();

      if (isValidEmail(rawEmail) && isValidBootstrapPassword(rawPassword, isProduction)) {
        const passwordHash = await hashPassword(rawPassword);
        await env.DB.prepare(
          `INSERT OR IGNORE INTO admins (id, name, email, password_hash, role, is_active, created_at, updated_at, last_login_at)
           VALUES ('adm-root-1', ?, ?, ?, 'super_admin', 1, ?, ?, NULL)`
        )
          .bind(adminName, rawEmail, passwordHash, now, now)
          .run();
      }
    }

    // 2. Seed Reference Services (ONLY when `services` table is empty)
    const svcCountRow = await env.DB.prepare('SELECT COUNT(*) AS cnt FROM services').first();
    if (!svcCountRow || Number(svcCountRow.cnt) === 0) {
      for (let i = 0; i < SEED_SERVICES.length; i++) {
        const s = SEED_SERVICES[i];
        await env.DB.prepare(
          `INSERT OR IGNORE INTO services
           (id, title, slug, order_category, short_description, description, features, technologies, suitable_for, image, icon_name, price, currency, is_active, display_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, 'INR', 1, ?, ?, ?)`
        )
          .bind(
            s.id,
            s.title,
            s.slug,
            s.orderCategory,
            s.shortDescription,
            s.description,
            JSON.stringify(s.features),
            JSON.stringify(s.technologies),
            JSON.stringify(s.suitableFor),
            s.iconName,
            s.price,
            i + 1,
            now,
            now
          )
          .run();
      }
    }

    // 3. Seed Reference Packages (ONLY when `packages` table is empty)
    const pkgCountRow = await env.DB.prepare('SELECT COUNT(*) AS cnt FROM packages').first();
    if (!pkgCountRow || Number(pkgCountRow.cnt) === 0) {
      for (let i = 0; i < SEED_PACKAGES.length; i++) {
        const p = SEED_PACKAGES[i];
        await env.DB.prepare(
          `INSERT OR IGNORE INTO packages
           (id, name, category, description, price, currency, pages_count, features, revisions, delivery_estimate, support_duration, hosting_option, maintenance_option, add_ons, service_id, is_active, is_featured, display_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            p.id,
            p.name,
            p.category,
            p.description,
            p.price,
            p.currency,
            p.pagesCount,
            JSON.stringify(p.features),
            p.revisions,
            p.deliveryEstimate,
            p.supportDuration,
            p.hostingOption,
            p.maintenanceOption,
            JSON.stringify(p.addOns),
            p.serviceId,
            p.isActive,
            p.isFeatured,
            i + 1,
            now,
            now
          )
          .run();
      }
    }

    // 4. Seed Reference Portfolio Items (ONLY when `portfolio` table is empty)
    const portCountRow = await env.DB.prepare('SELECT COUNT(*) AS cnt FROM portfolio').first();
    if (!portCountRow || Number(portCountRow.cnt) === 0) {
      for (let i = 0; i < SEED_PORTFOLIO.length; i++) {
        const proj = SEED_PORTFOLIO[i];
        await env.DB.prepare(
          `INSERT OR IGNORE INTO portfolio
           (id, project_title, slug, short_overview, description, problem_addressed, solution_implemented, category, thumbnail, images, key_features, technologies, project_url, github_url, demo_video_url, status, completion_date, is_sample, is_published, is_featured, display_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            proj.id,
            proj.projectTitle,
            proj.slug,
            proj.shortOverview,
            proj.description,
            proj.problemAddressed,
            proj.solutionImplemented,
            proj.category,
            proj.thumbnail,
            JSON.stringify(proj.images),
            JSON.stringify(proj.keyFeatures),
            JSON.stringify(proj.technologies),
            proj.projectUrl,
            proj.status,
            proj.completionDate,
            proj.isSample,
            proj.isPublished,
            proj.isFeatured,
            i + 1,
            now,
            now
          )
          .run();
      }
    }

    // 5. Seed Default Site Settings (using INSERT OR IGNORE so existing settings are never overwritten)
    await env.DB.prepare(
      `INSERT OR IGNORE INTO site_settings (setting_key, setting_value, updated_at) VALUES ('general', ?, ?)`
    )
      .bind(JSON.stringify(SEED_SETTINGS), now)
      .run();

    await env.DB.prepare(
      `INSERT OR IGNORE INTO site_settings (setting_key, setting_value, updated_at) VALUES ('addons', ?, ?)`
    )
      .bind(JSON.stringify(SEED_ADDONS), now)
      .run();

    await env.DB.prepare(
      `INSERT OR IGNORE INTO site_settings (setting_key, setting_value, updated_at) VALUES ('maintenance_plans', ?, ?)`
    )
      .bind(JSON.stringify(SEED_MAINTENANCE_PLANS), now)
      .run();

    await env.DB.prepare(
      `INSERT OR IGNORE INTO site_settings (setting_key, setting_value, updated_at) VALUES ('team_members', ?, ?)`
    )
      .bind(JSON.stringify(SEED_TEAM), now)
      .run();

    initializedDatabases.add(env.DB);
  } catch (err) {
    const msg = String(err?.message || '');
    if (/no such table/i.test(msg)) {
      const schemaErr = new Error(
        `Database schema is missing required tables (${msg}). Please apply D1 migrations.`
      );
      schemaErr.status = 503;
      schemaErr.code = 'DATABASE_SCHEMA_MISSING';
      throw schemaErr;
    }
    const seedErr = new Error(`Database initialization failed: ${msg}`);
    seedErr.status = err?.status || 500;
    seedErr.code = err?.code || 'DATABASE_SEED_ERROR';
    throw seedErr;
  }
}

