/**
 * DreamTech Kashmir Solutions (DTKS) — Production Seed Configuration
 *
 * Strictly scoped to Website Design, Website Development, Deployment, Hosting & Maintenance.
 * Contains zero fake customer orders, zero fake inquiries, zero sample portfolio projects,
 * zero placeholder team profiles, and zero unconfirmed pricing or statistics.
 */

export const WEBSITE_CATEGORIES = [
  'Business & Corporate Websites',
  'Portfolio & Personal Brand Websites',
  'E-Commerce Websites',
  'Landing Pages & Campaign Pages',
  'Educational / Coaching / Institute Websites',
  'Clinic / Hospital / Healthcare Websites',
  'Restaurant / Cafe / Food Ordering Websites',
  'Real Estate / Property Listing Websites',
  'Blog / News / Content Publishing Websites',
  'Custom Web Portals & Web Applications',
];

export const SUPPORTING_SERVICES = [
  {
    id: 'sup-uiux',
    title: 'Custom Responsive UI/UX Website Design',
    description: 'Clean, modern visual hierarchy and mobile-first responsive layouts tailored to your brand.',
    iconName: 'Palette',
  },
  {
    id: 'sup-redesign',
    title: 'Website Redesign & Modernization',
    description: 'Upgrade outdated websites with modern React architecture, faster load speeds, and improved UX.',
    iconName: 'RefreshCw',
  },
  {
    id: 'sup-speed',
    title: 'Speed & Performance Optimization',
    description: 'Core Web Vitals tuning, asset compression, code splitting, and responsive image delivery.',
    iconName: 'Gauge',
  },
  {
    id: 'sup-seo',
    title: 'Technical SEO Setup',
    description: 'Canonical URLs, XML sitemaps, robots.txt, OpenGraph metadata, and Schema.org JSON-LD markup.',
    iconName: 'Search',
  },
  {
    id: 'sup-cms',
    title: 'Admin Panel / CMS Integration',
    description: 'Manage portfolio items, packages, team profiles, and inquiries through a structured admin interface.',
    iconName: 'Code2',
  },
  {
    id: 'sup-hosting',
    title: 'Website Hosting & Deployment',
    description: 'Cloudflare Pages / Workers edge deployment, custom domain DNS configuration, and SSL setup.',
    iconName: 'Server',
  },
  {
    id: 'sup-maintenance',
    title: 'Ongoing Website Maintenance & Support',
    description: 'Optional monthly or annual backup schedules, security checks, and routine content updates.',
    iconName: 'ShieldCheck',
  },
];

export const ORDER_STATUSES = [
  'Pending',
  'New Request',
  'Reviewed',
  'Under Review',
  'Requirements Clarification',
  'Quotation Sent',
  'Awaiting Customer Approval',
  'Approved',
  'InProgress',
  'In Progress',
  'Under Testing',
  'Completed',
  'Rejected',
  'Cancelled',
];

export const INQUIRY_STATUSES = [
  'New',
  'In Review',
  'Replied',
  'Archived',
];

export const PORTFOLIO_CATEGORIES = [
  'All',
  'Business Websites',
  'E-Commerce',
  'Landing Pages',
  'Educational Websites',
  'Healthcare Websites',
  'Portfolio Websites',
  'Custom Web Apps',
];

export const TEAM_ROLES = [
  'Founder / Project Lead',
  'Full-Stack Web Developer',
  'Frontend Developer',
  'Backend Developer',
  'UI/UX Designer',
  'Deployment & Maintenance Engineer',
];

export const DOMAIN_PREFERENCES = [
  {
    value: 'Already have a domain',
    desc: 'You already own your domain name and want us to point it to the new website.',
  },
  {
    value: 'Need help registering a domain',
    desc: 'We will assist you in selecting and registering a domain under your ownership.',
  },
  {
    value: 'Need domain advice',
    desc: 'Discuss available domain extensions (.com, .in, .studio, .org) during consultation.',
  },
];

export const HOSTING_PREFERENCES = [
  {
    value: 'Customer-managed',
    desc: 'Deploy to your existing cloud/hosting account with full handover documentation.',
  },
  {
    value: 'DreamTech-managed',
    desc: 'Hands-off cloud deployment, SSL management, and server administration by DTKS.',
  },
  {
    value: 'Need advice',
    desc: 'Recommend the best hosting architecture based on traffic and project scope.',
  },
];

export const MAINTENANCE_PREFERENCES = [
  {
    value: 'Interested',
    desc: 'Include optional monthly or yearly website maintenance and backup options in my quote.',
  },
  {
    value: 'Not interested',
    desc: 'One-time website build only (includes complimentary 30-day post-launch bug support).',
  },
  {
    value: 'Need more information',
    desc: 'Share maintenance plan details and scope options alongside the website quotation.',
  },
];

/**
 * Exact mapping of original legacy seed IDs to their unconfirmed prototype starting prices.
 * Used during migration so that ONLY unmodified legacy seed records have their unconfirmed
 * prototype prices cleared, while admin-created custom packages or admin-modified prices
 * are never touched.
 */
export const LEGACY_SEED_PRICE_BY_ID = {
  'pkg-starter': 15000,
  'pkg-business': 28000,
  'pkg-custom': 45000,
  'svc-business': 28000,
  'svc-ecommerce': 25000,
  'svc-landing-portfolio': 15000,
  'svc-education-healthcare': 22000,
  'svc-hospitality-realestate': 30000,
  'svc-custom-portals': 20000,
};

/**
 * Known Legacy Demo Markers used strictly by the non-destructive LocalStorage migration
 * to remove only preloaded prototype sample records while preserving any real user-created data.
 */
export const KNOWN_DEMO_MARKERS = {
  orderIds: ['ord-demo-1', 'ord-demo-2'],
  orderReferences: ['DKS-2026-0001', 'DKS-2026-0002'],
  demoEmails: [
    'demo.customer@example.com',
    'clinic.demo@example.com',
    'inquiry.demo@example.com',
    'contact@dreamtechkashmir.example',
  ],
  inquiryIds: ['inq-demo-1'],
  portfolioIds: ['proj-sample-1', 'proj-sample-2', 'proj-sample-3', 'proj-sample-4'],
  portfolioSlugs: [
    'kashmir-enterprise-corporate-website-sample',
    'modern-commerce-storefront-sample',
    'architect-creative-portfolio-website-sample',
    'academy-admissions-portal-website-sample',
  ],
  teamIds: ['team-1', 'team-2', 'team-3', 'team-4'],
  placeholderStrings: [
    'contact@dreamtechkashmir.example',
    '+91 (000) 000-0000 (Placeholder)',
    'Srinagar, Jammu & Kashmir (Office Address Configurable)',
  ],
  legacySeedPriceById: LEGACY_SEED_PRICE_BY_ID,
};

export const INITIAL_SERVICES = [
  {
    id: 'svc-business',
    slug: 'business-corporate-websites',
    title: 'Business & Corporate Websites',
    category: 'Business & Corporate Websites',
    orderCategory: 'Business & Corporate Websites',
    iconName: 'Briefcase',
    shortDescription:
      'Structured multi-page websites for companies, agencies, and local enterprises seeking a credible digital presence.',
    description:
      'We build fast, responsive corporate websites tailored to your brand identity, service lines, and lead-generation goals. Every build includes clean navigation, mobile-first layout architecture, and technical SEO foundations.',
    idealFor: 'Established businesses, consultancies, service companies, and regional enterprises.',
    suitableFor: ['Corporate Enterprises', 'Service Agencies', 'Consultancies', 'Regional Businesses'],
    technologies: ['React', 'JavaScript', 'Tailwind CSS', 'Vite', 'Cloudflare Pages'],
    features: [
      'Custom responsive multi-page design',
      'Service showcase & structured company profile',
      'Lead capture & quotation inquiry forms',
      'On-page technical SEO & metadata setup',
      'Speed optimization & SSL security setup',
    ],
    includedFeatures: [
      'Custom responsive multi-page design',
      'Service showcase & structured company profile',
      'Lead capture & quotation inquiry forms',
      'On-page technical SEO & metadata setup',
      'Speed optimization & SSL security setup',
    ],
    optionalAddons: [
      'Custom Admin Content Manager',
      'WhatsApp & direct inquiry integration',
      'DreamTech-managed cloud hosting',
    ],
    deliveryTimeline: '2 – 4 Weeks',
    startingPrice: null,
    priceConfirmed: false,
    currency: 'INR',
  },
  {
    id: 'svc-ecommerce',
    slug: 'ecommerce-websites',
    title: 'E-Commerce Websites',
    category: 'E-Commerce Websites',
    orderCategory: 'E-Commerce Websites',
    iconName: 'ShoppingBag',
    shortDescription:
      'Online storefronts with product catalogs, cart workflows, order management, and payment gateway readiness.',
    description:
      'Launch a reliable online store designed for smooth browsing, mobile checkout, and straightforward inventory management. Built for retail brands, Kashmiri handicrafts, specialty foods, and growing D2C sellers.',
    idealFor: 'Retail brands, handicraft exporters, boutique stores, and D2C product businesses.',
    suitableFor: ['Retail Storefronts', 'Handicraft Exporters', 'Boutique Brands', 'D2C Sellers'],
    technologies: ['React', 'Modern Web APIs', 'Tailwind CSS', 'Payment Gateway Integration'],
    features: [
      'Categorized product catalog & search filters',
      'Shopping cart & responsive checkout flow',
      'Order management & status tracking dashboard',
      'Payment gateway & shipping rule integration',
      'Mobile-optimized product gallery & zoom',
    ],
    includedFeatures: [
      'Categorized product catalog & search filters',
      'Shopping cart & responsive checkout flow',
      'Order management & status tracking dashboard',
      'Payment gateway & shipping rule integration',
      'Mobile-optimized product gallery & zoom',
    ],
    optionalAddons: [
      'Bulk product import & inventory alerts',
      'Discount coupon & promotional banner system',
      'Ongoing monthly store maintenance',
    ],
    deliveryTimeline: '3 – 6 Weeks',
    startingPrice: null,
    priceConfirmed: false,
    currency: 'INR',
  },
  {
    id: 'svc-landing-portfolio',
    slug: 'portfolio-and-landing-pages',
    title: 'Portfolio, Personal Brand & Landing Pages',
    category: 'Portfolio & Personal Brand Websites',
    orderCategory: 'Portfolio & Personal Brand Websites',
    iconName: 'LayoutTemplate',
    shortDescription:
      'High-conversion campaign landing pages and curated showcase websites for professionals, creators, and studios.',
    description:
      'Present your work, credentials, or product launch with clarity and visual precision. Designed for fast load times, clear calls-to-action, and effortless case-study browsing across all screen sizes.',
    idealFor: 'Architects, photographers, consultants, startups, and marketing campaigns.',
    suitableFor: ['Creative Studios', 'Architects & Designers', 'Independent Consultants', 'Product Launches'],
    technologies: ['React', 'Tailwind CSS', 'Vite', 'OpenGraph & Schema SEO'],
    features: [
      'Conversion-focused hero & visual storytelling layout',
      'Filterable project or case-study showcase',
      'Direct contact, booking, or lead capture form',
      'Fast Core Web Vitals performance tuning',
      'Social preview cards (OpenGraph) & SEO setup',
    ],
    includedFeatures: [
      'Conversion-focused hero & visual storytelling layout',
      'Filterable project or case-study showcase',
      'Direct contact, booking, or lead capture form',
      'Fast Core Web Vitals performance tuning',
      'Social preview cards (OpenGraph) & SEO setup',
    ],
    optionalAddons: [
      'Self-editable portfolio admin panel',
      'Custom domain & edge deployment',
      'Analytics & conversion event tracking',
    ],
    deliveryTimeline: '1 – 2 Weeks',
    startingPrice: null,
    priceConfirmed: false,
    currency: 'INR',
  },
  {
    id: 'svc-education-healthcare',
    slug: 'education-and-healthcare-websites',
    title: 'Educational, Coaching & Healthcare Websites',
    category: 'Educational / Coaching / Institute Websites',
    orderCategory: 'Educational / Coaching / Institute Websites',
    iconName: 'GraduationCap',
    shortDescription:
      'Dedicated web platforms for schools, coaching institutes, clinics, and healthcare practices.',
    description:
      'Purpose-built websites that help students, parents, and patients find accurate information quickly. Includes course or department directories, admission or appointment inquiry workflows, and notice boards.',
    idealFor: 'Coaching centers, schools, training academies, clinics, diagnostic centers, and doctors.',
    suitableFor: ['Schools & Academies', 'Coaching Institutes', 'Clinics & Hospitals', 'Diagnostic Centers'],
    technologies: ['React', 'Accessible UI', 'Tailwind CSS', 'Structured Schema Markup'],
    features: [
      'Course / department / specialist directory pages',
      'Online admission or appointment request forms',
      'Announcements, schedules, or downloadable resources',
      'Location map, timings, and emergency contact bar',
      'Accessible, high-contrast mobile-friendly reading experience',
    ],
    includedFeatures: [
      'Course / department / specialist directory pages',
      'Online admission or appointment request forms',
      'Announcements, schedules, or downloadable resources',
      'Location map, timings, and emergency contact bar',
      'Accessible, high-contrast mobile-friendly reading experience',
    ],
    optionalAddons: [
      'Student / patient inquiry management panel',
      'Document & syllabus PDF download portal',
      'Scheduled backups & priority security updates',
    ],
    deliveryTimeline: '2 – 4 Weeks',
    startingPrice: null,
    priceConfirmed: false,
    currency: 'INR',
  },
  {
    id: 'svc-hospitality-realestate',
    slug: 'restaurant-and-real-estate-websites',
    title: 'Restaurant, Hospitality & Real Estate Websites',
    category: 'Real Estate / Property Listing Websites',
    orderCategory: 'Real Estate / Property Listing Websites',
    iconName: 'Building2',
    shortDescription:
      'Interactive menu and table-inquiry websites for restaurants, plus searchable property showcase sites for realtors.',
    description:
      'Give diners and property buyers an engaging digital experience. From digital food menus and reservation requests to filterable property listings with photo galleries and location inquiries.',
    idealFor: 'Restaurants, cafes, boutique hotels, real estate agencies, and property developers.',
    suitableFor: ['Restaurants & Cafes', 'Boutique Hotels', 'Real Estate Agencies', 'Property Developers'],
    technologies: ['React', 'Interactive Filtering', 'Tailwind CSS', 'Local Business SEO'],
    features: [
      'Interactive menu or filterable property listings',
      'High-resolution photo galleries & virtual tour embeds',
      'Table reservation, food inquiry, or site-visit forms',
      'Direct WhatsApp & phone click-to-connect actions',
      'Local SEO schema for regional discoverability',
    ],
    includedFeatures: [
      'Interactive menu or filterable property listings',
      'High-resolution photo galleries & virtual tour embeds',
      'Table reservation, food inquiry, or site-visit forms',
      'Direct WhatsApp & phone click-to-connect actions',
      'Local SEO schema for regional discoverability',
    ],
    optionalAddons: [
      'Admin listing manager for properties or menu items',
      'Multi-location branch directory',
      'Managed cloud hosting & daily backups',
    ],
    deliveryTimeline: '2 – 5 Weeks',
    startingPrice: null,
    priceConfirmed: false,
    currency: 'INR',
  },
  {
    id: 'svc-custom-portals',
    slug: 'custom-web-portals-and-redesign',
    title: 'Custom Web Applications, Portals & Website Redesign',
    category: 'Custom Web Portals & Web Applications',
    orderCategory: 'Custom Web Portals & Web Applications',
    iconName: 'Code2',
    shortDescription:
      'Bespoke web applications, internal dashboards, content publishing platforms, and full website modernizations.',
    description:
      'When off-the-shelf templates fall short, we architect custom React and modern web applications with clean workflows, role-based dashboards, API integrations, or complete redesigns of legacy websites.',
    idealFor: 'Growing organizations, digital publications, SaaS MVPs, and businesses upgrading legacy sites.',
    suitableFor: ['Custom Web Portals', 'Content Publishers', 'Legacy Site Redesigns', 'Internal Dashboards'],
    technologies: ['React', 'REST API Architecture', 'Tailwind CSS', 'Cloudflare Workers / D1 Ready'],
    features: [
      'Custom workflow & interactive UI engineering',
      'Admin dashboard, content publishing, or portal views',
      'REST API architecture & database-ready frontend',
      'Legacy content migration & URL redirect preservation',
      'Comprehensive cross-browser & device QA testing',
    ],
    includedFeatures: [
      'Custom workflow & interactive UI engineering',
      'Admin dashboard, content publishing, or portal views',
      'REST API architecture & database-ready frontend',
      'Legacy content migration & URL redirect preservation',
      'Comprehensive cross-browser & device QA testing',
    ],
    optionalAddons: [
      'Dedicated cloud infrastructure setup',
      'Custom third-party API integrations',
      'Monthly retainer for feature enhancements',
    ],
    deliveryTimeline: '3 – 8 Weeks',
    startingPrice: null,
    priceConfirmed: false,
    currency: 'INR',
  },
];

export const INITIAL_PACKAGES = [
  {
    id: 'pkg-starter',
    title: 'Starter Website Package',
    slug: 'starter-website',
    category: 'Portfolio & Personal Brand Websites',
    description:
      'Ideal for personal brands, professionals, campaigns, and new local businesses needing a clean, responsive web presence.',
    startingPrice: null,
    priceConfirmed: false,
    currency: 'INR',
    pagesCount: 'Up to 5 Pages',
    features: [
      'Custom responsive design (Mobile, Tablet & Desktop)',
      'Home, About, Services/Showcase, & Contact pages',
      'Validated contact & inquiry form integration',
      'Foundational on-page SEO (meta titles, descriptions, sitemap)',
      'Fast asset optimization & SSL setup guidance',
    ],
    revisions: '2 Design Revision Rounds',
    deliveryEstimate: '1 – 2 Weeks',
    supportDuration: '30 Days Post-Launch Bug Support',
    hostingOption: 'Customer-Managed or DreamTech-Managed Hosting',
    maintenanceOption: 'Optional Monthly or Yearly Maintenance',
    extraServices: 'Additional pages, logo design, or copywriting available on request',
    active: true,
    featured: false,
  },
  {
    id: 'pkg-business',
    title: 'Business Website Package',
    slug: 'business-website',
    category: 'Business & Corporate Websites',
    description:
      'Comprehensive website solution for growing companies, clinics, institutes, and service organizations requiring structured pages and admin control.',
    startingPrice: null,
    priceConfirmed: false,
    currency: 'INR',
    pagesCount: 'Up to 10 Pages',
    features: [
      'Bespoke UI/UX design aligned with brand guidelines',
      'Dedicated service/department pages & project showcase',
      'Multi-step quotation or appointment request workflow',
      'Admin content management for key dynamic sections',
      'Technical SEO setup, OpenGraph tags & speed optimization',
      ' Deployment to cloud hosting + custom domain configuration',
    ],
    revisions: '3 Design & Content Revision Rounds',
    deliveryEstimate: '2 – 4 Weeks',
    supportDuration: '30 Days Post-Launch Bug Support',
    hostingOption: 'Customer-Managed or DreamTech-Managed Hosting',
    maintenanceOption: 'Optional Monthly or Yearly Maintenance',
    extraServices: 'Custom integrations, multilingual pages, or priority SLA available',
    active: true,
    featured: true,
  },
  {
    id: 'pkg-custom',
    title: 'Custom Website / Web App Package',
    slug: 'custom-web-application',
    category: 'Custom Web Portals & Web Applications',
    description:
      'Tailored engineering for e-commerce stores, property portals, custom web applications, and complex multi-module platforms.',
    startingPrice: null,
    priceConfirmed: false,
    currency: 'INR',
    pagesCount: 'Custom Scope & Architecture',
    features: [
      'Custom system architecture & interactive frontend views',
      'E-Commerce catalog, booking engine, or custom portal modules',
      'Full Admin panel for orders, listings, or content operations',
      'API integration readiness & scalable data layer',
      'Performance auditing, security hardening & staging preview',
      'Dedicated handover documentation & team walkthrough',
    ],
    revisions: 'Iterative Milestone Reviews',
    deliveryEstimate: '4 – 8 Weeks (Scope Dependent)',
    supportDuration: '30 Days Post-Launch Bug Support',
    hostingOption: 'Customer-Managed or DreamTech-Managed Cloud Stack',
    maintenanceOption: 'Recommended Monthly or Yearly Maintenance Plan',
    extraServices: 'Custom API backend development & cloud infrastructure management',
    active: true,
    featured: false,
  },
];

export const INITIAL_MAINTENANCE_PLANS = [
  {
    id: 'maint-monthly',
    name: 'Monthly',
    billingCycle: 'Billed Monthly',
    price: null,
    currency: 'INR',
    bugFixSupport: 'Post-launch bug fixes & layout issue resolution',
    contentUpdateAllowance: 'Up to 4 minor content or image updates per month',
    updateAllowance: 'Up to 4 minor content or image updates per month',
    backupFrequency: 'Weekly automated website backups',
    securityChecks: 'Routine dependency, SSL & uptime monitoring',
    performanceMonitoring: 'Monthly Core Web Vitals & uptime health check',
    responseTime: 'Standard support response within 24–48 business hours',
    scopeNote:
      'Covers bug fixes, minor text/image swaps, and health checks. Major new features or full page redesigns are quoted separately.',
    active: true,
  },
  {
    id: 'maint-yearly',
    name: 'Yearly',
    billingCycle: 'Billed Annually',
    price: null,
    currency: 'INR',
    bugFixSupport: 'Priority bug fixes, browser compatibility & layout resolution',
    contentUpdateAllowance: 'Up to 6 minor content or section updates per month',
    updateAllowance: 'Up to 6 minor content or section updates per month',
    backupFrequency: 'Weekly automated backups + pre-update restore points',
    securityChecks: 'Proactive security patching, SSL renewal & quarterly speed audit',
    performanceMonitoring: 'Continuous uptime monitoring & quarterly speed optimization',
    responseTime: 'Priority support response within 24 business hours',
    scopeNote:
      'Ideal for businesses wanting year-round peace of mind. Major feature additions or structural rebuilds are quoted separately.',
    active: true,
  },
];

export const INITIAL_ADDONS = [
  {
    id: 'addon-pages',
    name: 'Extra Content Pages',
    description: 'Additional custom-designed static or dynamic pages beyond package scope.',
    startingPrice: null,
    pricingNote: 'Request a Quote',
    active: true,
  },
  {
    id: 'addon-admin',
    name: 'Custom Admin Panel / CMS',
    description: 'Manage portfolio items, listings, team members, or announcements without code.',
    startingPrice: null,
    pricingNote: 'Request a Quote',
    active: true,
  },
  {
    id: 'addon-seo',
    name: 'Advanced Technical SEO Setup',
    description: 'Structured schema markup, canonical auditing, sitemap setup, and Core Web Vitals tuning.',
    startingPrice: null,
    pricingNote: 'Request a Quote',
    active: true,
  },
  {
    id: 'addon-hosting',
    name: 'DreamTech-Managed Hosting & Deployment',
    description: 'End-to-end DNS configuration, SSL provisioning, CDN setup, and cloud deployment.',
    startingPrice: null,
    pricingNote: 'Request a Quote',
    active: true,
  },
  {
    id: 'addon-redesign',
    name: 'Legacy Website Content Migration',
    description: 'Careful transfer of existing pages, media assets, and SEO URL redirects.',
    startingPrice: null,
    pricingNote: 'Request a Quote',
    active: true,
  },
  {
    id: 'addon-speed',
    name: 'Performance & Speed Optimization',
    description: 'Image compression, code splitting, lazy loading, and bundle optimization.',
    startingPrice: null,
    pricingNote: 'Request a Quote',
    active: true,
  },
];

/**
 * Clean default arrays:
 * Only real, verified records created by the website owner or customers should populate these.
 */
export const INITIAL_PORTFOLIO = [];

export const INITIAL_TEAM = [];

export const INITIAL_ORDERS = [];

export const INITIAL_INQUIRIES = [];

export const INITIAL_SETTINGS = {
  companyName: 'DreamTech Kashmir Solutions',
  brandAbbreviation: 'DTKS',
  officialDomain: 'https://dreamtechkashmirsolutions.studio/',
  tagline: 'Modern Website Design & Development for Growing Businesses',
  heroSupportText:
    'We design, build, deploy, and maintain responsive websites, e-commerce storefronts, and custom web portals tailored to your business requirements.',
  contactEmail: 'support@dreamtechkashmirsolutions.studio',
  contactPhone: '',
  whatsappNumber: '+91 9796854163',
  businessLocation: '',
  serviceArea: 'Srinagar, Kashmir, Jammu & Kashmir, India',
  workingHours: '',
  socialLinks: {
    github: '',
    linkedin: '',
    instagram: '',
    facebook: '',
    x: '',
    other: '',
  },
  highlights: [
    {
      id: 'hl-1',
      label: 'Website Categories',
      value: '',
      verified: false,
    },
    {
      id: 'hl-2',
      label: 'Post-Launch Bug Support',
      value: '',
      verified: false,
    },
    {
      id: 'hl-3',
      label: 'Primary Service Region',
      value: '',
      verified: false,
    },
  ],
};

export const PACKAGES_FAQS = [
  {
    question: 'Why do packages show "Request a Quote" instead of fixed checkout prices?',
    answer:
      'Every website has unique page counts, content readiness, and integration requirements. Until fixed starting rates are published for a specific tier, we provide a transparent, itemized quotation tailored to your exact project scope.',
  },
  {
    question: 'What is included in the 30-day post-launch bug support?',
    answer:
      'Every website delivered by DreamTech Kashmir Solutions includes 30 days of complimentary support covering layout fixes, broken links, or functional bugs related to the agreed scope.',
  },
  {
    question: 'Can we manage our own domain and hosting, or can DreamTech manage it for us?',
    answer:
      'Both options are supported. You may keep full ownership of your domain and hosting accounts while we handle deployment, or choose DreamTech-managed hosting for hands-off administration.',
  },
  {
    question: 'Is ongoing website maintenance mandatory?',
    answer:
      'No. Ongoing monthly or yearly maintenance is completely optional. You can start with a one-time website build and subscribe to a maintenance plan later if you need regular updates and backups.',
  },
];
