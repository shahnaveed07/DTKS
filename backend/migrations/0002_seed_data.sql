-- =============================================================================
-- DTKS (DreamTech Kashmir Solutions) — Initial Reference Data Migration
-- Migration: 0002_seed_data.sql
-- Safe & Idempotent: Uses INSERT OR IGNORE so existing production settings are never overwritten.
-- =============================================================================

INSERT OR IGNORE INTO site_settings (setting_key, setting_value)
VALUES (
  'general',
  '{"companyName":"DreamTech Kashmir Solutions","shortName":"DTKS","tagline":"Modern Website Design, Development, Hosting & Maintenance in Kashmir","websiteUrl":"https://dreamtechkashmirsolutions.studio","contactEmail":"support@dreamtechkashmirsolutions.studio","contactPhone":"","whatsappNumber":"+91 9796854163","businessLocation":"","workingHours":"","currency":"INR","heroHeading":"Professional Website Design & Development for Growing Businesses","heroSubheading":"DreamTech Kashmir Solutions (DTKS) designs, builds, deploys, and maintains fast, modern websites — from business websites and portfolios to e-commerce stores and custom web portals.","announcementText":"Now accepting new website design, redesign, and managed hosting projects — Request a custom quote online.","socialLinks":{"linkedin":"","github":"","instagram":"","facebook":"","x":""},"budgetOptions":["Under ₹15,000","₹15,000 – ₹30,000","₹30,000 – ₹60,000","₹60,000 – ₹1,00,000","₹1,00,000+","Need a Custom Estimate"],"urgencyOptions":["Standard (3–6 Weeks)","Priority (2–3 Weeks)","Urgent (Under 2 Weeks)","Flexible / Planning Stage"]}'
);
