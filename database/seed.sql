-- ============================================================================
-- Seed data — KURNOOL FITNESS CENTRE (CLEAN start)
-- Author: Manoj Kumar <123cs0023@iiitk.ac.in>
-- Run AFTER schema.sql:  psql "$DATABASE_URL" -f database/seed.sql
-- ----------------------------------------------------------------------------
-- Admin login ->  admin@kurnoolfitness.com  /  Admin@123
-- Member login -> member@kurnoolfitness.com /  Member@123
-- ============================================================================

TRUNCATE audit_logs, timetable_slots, order_items, orders, appointments, payments,
         memberships, reviews, enquiries, gallery_images, banners, site_content,
         products, product_categories, services, facilities, trainers,
         membership_plans, members, carts, users RESTART IDENTITY CASCADE;

-- ADMIN USER (password: Admin@123) --------------------------------------------
INSERT INTO users (name, email, password_hash, role) VALUES
('Kurnool Centre Administrator', 'admin@kurnoolfitness.com', '$2b$10$dEH7/wZMvnt1sMAc265.kOQ3m6gvYbcIKxjwD0vVcC5AchcUCH1WW', 'admin'),
('Demo Member',                 'member@kurnoolfitness.com', '$2b$10$ioEMLZ2QfaRC6IyTs8mR6OA5PL/3B3ATIk.Adk7pBtfF7E1rk9lvi', 'member');

-- DEFAULT WEBSITE CONTENT -----------------------------------------------------
INSERT INTO site_content (key, value) VALUES
('hero_eyebrow',    'Welcome to Kurnool Fitness Centre'),
('hero_title',      'UNLEASH YOUR BEST PHYSIQUE'),
('hero_subtitle',   'Kurnool’s premier fitness destination featuring elite strength equipment, certified Indian coaches, and results-driven training.'),
('hero_image',      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80'),
('about_title',     'We Help You Build Sustainable Fitness & Power'),
('about_content',   'At Kurnool Fitness Centre, we provide world-class equipment, personalized coaching, and a supportive community to help you achieve sustainable fitness right here in Kurnool.'),
('about_image',     'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1200&q=80'),
('mission',         'To deliver world-class fitness, strength training, and lifestyle transformation accessible to everyone in Kurnool and Andhra Pradesh.'),
('vision',          'To be the most trusted, scientifically backed athletic conditioning and fitness centre in the region.'),
('contact_phone',   '+91 83280 75915'),
('contact_email',   'contact@kurnoolfitness.com'),
('contact_address', 'Near Bellary Road, Kurnool, Andhra Pradesh - 518004'),
('opening_hours',   'Mon - Sun: 5:00 AM - 10:00 PM'),
('social_facebook', 'https://facebook.com'),
('social_instagram','https://instagram.com'),
('social_youtube',  'https://youtube.com'),
('footer_tagline',  'Kurnool Fitness Centre · Engineered by Manoj Kumar');
