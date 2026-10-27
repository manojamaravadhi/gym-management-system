-- ============================================================================
-- Seed data — realistic demo content for KURNOOL FITNESS CENTRE
-- Author: Manoj Kumar <123cs0023@iiitk.ac.in>
-- Run AFTER schema.sql:  psql -U postgres -d gym_management -f database/seed.demo.sql
-- ----------------------------------------------------------------------------
-- Demo credentials:
--   Admin  -> admin@kurnoolfitness.com  / Admin@123
--   Member -> member@kurnoolfitness.com / Member@123
-- ============================================================================

TRUNCATE audit_logs, timetable_slots, order_items, orders, appointments, payments,
         memberships, reviews, enquiries, gallery_images, banners, site_content,
         products, product_categories, services, facilities, trainers,
         membership_plans, members, carts, users RESTART IDENTITY CASCADE;

-- USERS ----------------------------------------------------------------------
INSERT INTO users (name, email, password_hash, role) VALUES
('Kurnool Centre Administrator', 'admin@kurnoolfitness.com',  '$2b$10$dEH7/wZMvnt1sMAc265.kOQ3m6gvYbcIKxjwD0vVcC5AchcUCH1WW', 'admin'),
('Manoj Kumar',                 'member@kurnoolfitness.com', '$2b$10$ioEMLZ2QfaRC6IyTs8mR6OA5PL/3B3ATIk.Adk7pBtfF7E1rk9lvi', 'member');

-- MEMBERS --------------------------------------------------------------------
INSERT INTO members (user_id, member_code, full_name, email, phone, date_of_birth, gender, address, status) VALUES
(2,    'KFC1001', 'Manoj Kumar',   'member@kurnoolfitness.com', '+91 83280 75915', '1998-03-12', 'male',   'Near Bellary Road, Kurnool, Andhra Pradesh - 518004', 'active'),
(NULL, 'KFC1002', 'Karthik Rao',   'karthik.rao@gmail.com',     '+91 98480 12345', '1995-07-21', 'male',   'Gayatri Estate, Kurnool, Andhra Pradesh',              'active'),
(NULL, 'KFC1003', 'Sneha K.',      'sneha.k@gmail.com',        '+91 94401 56789', '1999-11-02', 'female', 'Nandyal Check Post, Kurnool, Andhra Pradesh',         'active'),
(NULL, 'KFC1004', 'Arun Kumar',    'arun.kumar@gmail.com',      '+91 98850 67890', '1993-01-15', 'male',   'Budhawarapeta, Kurnool, Andhra Pradesh',               'expired'),
(NULL, 'KFC1005', 'Divya Teja',    'divya.teja@gmail.com',      '+91 97012 34567', '1996-05-30', 'female', 'Mourya Inn Area, Kurnool, Andhra Pradesh',           'active'),
(NULL, 'KFC1006', 'Rajesh Naidu',  'rajesh.naidu@gmail.com',    '+91 91210 98765', '2000-09-09', 'male',   'Santosh Nagar, Kurnool, Andhra Pradesh',               'pending'),
(NULL, 'KFC1007', 'Suresh Varma',  'suresh.varma@gmail.com',    '+91 93901 23456', '1990-12-25', 'male',   'Camp Area, Kurnool, Andhra Pradesh',                   'active');

-- MEMBERSHIP PLANS (7) -------------------------------------------------------
INSERT INTO membership_plans (name, description, price, duration_months, features, is_featured, is_active) VALUES
('Starter Plan',     'Ideal for beginners starting their fitness routine.',    1500.00, 1,
  '["Gym Floor Access","Standard Equipment","Locker Facility","1 Free Fitness Assessment"]', FALSE, TRUE),
('Silver Quarterly', 'Consistent training with dedicated gym access.',         4000.00, 3,
  '["Full Gym Access","Cardio & Free Weights","Locker Room","2 Trainer Consultation Sessions"]', FALSE, TRUE),
('Gold Pro Plan',    'Our most popular semi-annual transformation program.',   7500.00, 6,
  '["Unlimited Gym Access","Strength & Conditioning Floor","Personal Trainer (2x/Week)","Custom Nutrition Guide","Free Group Classes"]', TRUE, TRUE),
('Platinum Annual',  'Comprehensive year-round training for serious athletes.',12000.00, 12,
  '["All Gold Benefits","Dedicated Coach (3x/Week)","Macro Nutrition Plan","Body Composition Tests","Priority Timetable Booking"]', FALSE, TRUE),
('VIP Elite Annual', 'The ultimate personalized bodybuilding & wellness suite.', 18000.00, 12,
  '["All Platinum Benefits","1-on-1 Daily Coaching","Physiotherapy Screening","2 Guest Passes Monthly","Exclusive Locker Access"]', FALSE, TRUE),
('Monsoon Boost',    'Short commitment, high intensity seasonal package.',     3200.00, 2,
  '["Full Gym Access","Cardio & HIIT Zones","Group Workouts","1 Diet Chart"]', FALSE, TRUE),
('Student Special',  'Discounted rates for verified college students.',        1200.00, 1,
  '["Full Gym Access","Off-Peak Hours (11 AM - 4 PM)","Locker Room"]', FALSE, TRUE);

-- MEMBERSHIPS ----------------------------------------------------------------
INSERT INTO memberships (member_id, plan_id, plan_name, price, start_date, end_date, status) VALUES
(1, 3, 'Gold Pro Plan',     7500.00, '2024-05-10', '2025-05-10', 'active'),
(2, 2, 'Silver Quarterly',  4000.00, '2024-05-12', '2024-11-12', 'active'),
(3, 4, 'Platinum Annual',  12000.00, '2024-05-15', '2025-05-15', 'active'),
(4, 1, 'Starter Plan',      1500.00, '2024-02-10', '2024-03-10', 'expired'),
(5, 3, 'Gold Pro Plan',     7500.00, '2024-05-18', '2025-05-18', 'active'),
(6, 2, 'Silver Quarterly',  4000.00, '2024-05-22', '2024-11-22', 'pending'),
(7, 5, 'VIP Elite Annual', 18000.00, '2024-05-25', '2025-05-25', 'active');

-- PAYMENTS -------------------------------------------------------------------
INSERT INTO payments (member_id, membership_id, amount, method, reference, status, paid_at) VALUES
(1, 1,  7500.00, 'upi',           'UPI-KFC-9801', 'paid',    '2024-05-10'),
(2, 2,  4000.00, 'cash',          'TXN-KFC-9802', 'paid',    '2024-05-12'),
(3, 3, 12000.00, 'card',          'TXN-KFC-9803', 'paid',    '2024-05-15'),
(5, 5,  7500.00, 'upi',           'UPI-KFC-9805', 'paid',    '2024-05-18'),
(6, 6,  4000.00, 'cash',          'TXN-KFC-9806', 'pending', NULL),
(7, 7, 18000.00, 'bank_transfer', 'NEFT-KFC-9807','paid',    '2024-05-25');

-- TRAINERS (Indian Profiles) -------------------------------------------------
INSERT INTO trainers (name, role, specialization, experience_years, bio, certifications, photo_url, facebook_url, instagram_url, availability, is_active) VALUES
('Rahul Sharma',   'Head Strength & Conditioning Coach', 'Powerlifting, Strength & Hypertrophy', 10, 'Rahul has over 10 years of experience training state-level powerlifters and strength athletes across Andhra Pradesh.', 'CSCS, NASM-CPT, IPF Certified', 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?auto=format&fit=crop&w=700&q=80', 'https://facebook.com', 'https://instagram.com', 'Mon-Sat, 6:00 AM - 1:00 PM', TRUE),
('Priya Reddy',    'Functional Mobility & Yoga Specialist', 'Yoga, Mobility & Rehabilitation',     7, 'Priya specializes in postural alignment, athletic recovery, and therapeutic yoga flows for all ages.', 'RYT-500, FMS Level 2, Certified Yoga Master', 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=700&q=80', 'https://facebook.com', 'https://instagram.com', 'Mon-Sat, 7:00 AM - 12:00 PM', TRUE),
('Vikram Varma',   'HIIT & CrossFit Coach',              'CrossFit, Athletic Conditioning & Boxing', 8, 'Vikram brings high-energy conditioning routines designed to shred body fat and build explosive functional stamina.', 'CrossFit Level 2, ACE-CPT, TRX Master', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=80', 'https://facebook.com', 'https://instagram.com', 'Mon-Fri, 4:00 PM - 10:00 PM', TRUE),
('Ananya Deshmukh','Clinical Nutrition & Posture Specialist', 'Nutrition Science & Body Recomposition', 6, 'Ananya designs customized, sustainable Indian nutrition strategies and corrective movement programs.', 'ISSA Sports Nutritionist, M.Sc Clinical Nutrition', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=700&q=80', 'https://facebook.com', 'https://instagram.com', 'Tue-Sun, 8:00 AM - 2:00 PM', TRUE);

-- SERVICES -------------------------------------------------------------------
INSERT INTO services (title, description, icon, is_active) VALUES
('Personal Training',      'One-on-one coaching customized for your body composition and goals.',     'Dumbbell', TRUE),
('Strength & Conditioning','Structured barbell and dumbbell programming to build pure physical power.', 'Activity', TRUE),
('Cardio & Endurance',     'Guided cardio cycles and rowers for stamina and heart health.',            'HeartPulse', TRUE),
('Weight Loss & Shred',    'Caloric-deficit training plans combined with sustainable Indian nutrition.', 'TrendingDown', TRUE),
('Muscle Hypertrophy',     'Hypertrophy-focused volume training for lean athletic mass.',             'Zap', TRUE),
('Functional Mobility',    'Movement patterns, joint health, and posture restoration.',               'Move', TRUE),
('Group HIIT Classes',     'High-energy group workouts with motivating community vibes.',              'Users', TRUE),
('Clinical Diet Guidance', 'Custom Indian meal planning from certified nutrition specialists.',        'Apple', TRUE);

-- FACILITIES -----------------------------------------------------------------
INSERT INTO facilities (title, description, icon, image_url, is_active) VALUES
('Modern Equipment', 'Imported biomechanically engineered pin-loaded and plate-loaded machines.', 'Dumbbell', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80', TRUE),
('Cardio Zone',      'Full lineup of commercial treadmills, assault bikes, and rowing machines.', 'HeartPulse','https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1200&q=80', TRUE),
('Free Weights Area','Olympic lifting platforms, bumper plates, and rubber hex dumbbells.',        'Activity',  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80', TRUE),
('Clean Locker Rooms','Spacious personal lockers with digital pin locking mechanisms.',           'Lock',      'https://images.unsplash.com/photo-1558611848-73f7eb4001a1?auto=format&fit=crop&w=1200&q=80', TRUE),
('Shower Facilities','Hygienic private shower stalls and changing suites.',                      'ShowerHead','https://images.unsplash.com/photo-1600965962361-9035dbfd1c50?auto=format&fit=crop&w=1200&q=80', TRUE),
('Nutrition Pro Shop','Verified sports supplements, protein powders, and gym accessories.',      'Package',   'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=1200&q=80', TRUE);

-- PRODUCT CATEGORIES ---------------------------------------------------------
INSERT INTO product_categories (name, slug) VALUES
('Protein', 'protein'),
('Mass Gainer', 'mass-gainer'),
('Creatine', 'creatine'),
('Pre-Workout', 'pre-workout'),
('Vitamins', 'vitamins'),
('Accessories', 'accessories');

-- PRODUCTS -------------------------------------------------------------------
INSERT INTO products (category_id, name, brand, sku, description, price, sale_price, stock, image_url, is_featured, is_active) VALUES
(1, 'Whey Protein Isolate 1kg', 'PowerFuel', 'WHEY-001', '27g pure whey isolate protein per scoop for lean muscle growth.', 4500.00, 3999.00, 120, 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=600&q=80', TRUE, TRUE),
(2, 'Extreme Mass Gainer 3kg',  'BulkPro',   'MASS-002', 'High-calorie complex carb & protein blend for hard gainers.',       3800.00, NULL,     80,  'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=600&q=80', TRUE, TRUE),
(3, 'Micronized Creatine 250g', 'PurePump',  'CREA-003', 'Ultra-pure creatine monohydrate for strength, power, and size.',   1400.00, 1199.00, 200, 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=600&q=80', TRUE, TRUE),
(4, 'Hex Dumbbell Pair (10kg)', 'KFC-Iron',  'DUMB-004', 'Professional rubber-coated hexagonal dumbbell pair with chrome grip.', 3200.00, 2899.00, 45, 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=600&q=80', TRUE, TRUE),
(1, 'BCAA Intra-Workout 300g',  'RecoverPlus','BCAA-005', 'Branch-chain amino acids in 2:1:1 ratio for endurance & hydration.', 1900.00, 1699.00,  60, 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?auto=format&fit=crop&w=600&q=80', FALSE, TRUE),
(5, 'Daily Multivitamin (60 tabs)', 'VitaCore', 'VIT-006', 'Essential vitamins and minerals formulated for high-intensity athletes.', 850.00, NULL, 150, 'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=600&q=80', FALSE, TRUE),
(6, 'Heavy-Duty Lifting Straps', 'GripMax',   'ACC-007',  'Reinforced cotton lifting straps with neoprene padding for deadlifts.', 450.00,  NULL, 300, 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=600&q=80', FALSE, TRUE),
(6, 'KFC Pro Shaker 700ml',     'KFC-Gear',  'ACC-008',  'BPA-free leak-proof cyclone shaker bottle with wire whisk ball.',     350.00, 299.00, 400, 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=600&q=80', FALSE, TRUE);

-- ORDERS + ITEMS -------------------------------------------------------------
INSERT INTO orders (order_code, member_id, customer_name, email, phone, address, total_amount, status) VALUES
('ORD-501', 1, 'Manoj Kumar',   'member@kurnoolfitness.com', '+91 83280 75915', 'Near Bellary Road, Kurnool, Andhra Pradesh', 3999.00, 'completed'),
('ORD-502', 2, 'Karthik Rao',   'karthik.rao@gmail.com',     '+91 98480 12345', 'Gayatri Estate, Kurnool, Andhra Pradesh',    1199.00, 'completed'),
('ORD-503', 3, 'Sneha K.',      'sneha.k@gmail.com',        '+91 94401 56789', 'Nandyal Check Post, Kurnool, Andhra Pradesh', 4598.00, 'processing'),
('ORD-504', 5, 'Divya Teja',    'divya.teja@gmail.com',      '+91 97012 34567', 'Mourya Inn Area, Kurnool, Andhra Pradesh',   2899.00, 'pending');

INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total) VALUES
(1, 1, 'Whey Protein Isolate 1kg', 3999.00, 1, 3999.00),
(2, 3, 'Micronized Creatine 250g', 1199.00, 1, 1199.00),
(3, 1, 'Whey Protein Isolate 1kg', 3999.00, 1, 3999.00),
(3, 6, 'KFC Pro Shaker 700ml',      299.00, 2,  598.00),
(4, 4, 'Hex Dumbbell Pair (10kg)', 2899.00, 1, 2899.00);

-- TIMETABLE SLOTS -----------------------------------------------------------
INSERT INTO timetable_slots (trainer_id, service_id, slot_date, start_time, end_time, capacity, booked_count, is_active) VALUES
(1, 1, CURRENT_DATE + 1, '06:00', '07:00', 8, 3, TRUE),
(1, 1, CURRENT_DATE + 1, '08:00', '09:00', 6, 2, TRUE),
(2, 6, CURRENT_DATE + 1, '07:00', '08:00', 10, 4, TRUE),
(3, 7, CURRENT_DATE + 2, '17:00', '18:00', 8, 1, TRUE),
(4, 8, CURRENT_DATE + 2, '10:00', '11:00', 5, 2, TRUE),
(3, 7, CURRENT_DATE + 3, '18:00', '19:00', 10, 0, TRUE);

-- APPOINTMENTS ---------------------------------------------------------------
INSERT INTO appointments (slot_id, member_id, trainer_id, service_id, customer_name, email, phone, appointment_date, appointment_time, status) VALUES
(1, 1, 1, 1, 'Manoj Kumar',  'member@kurnoolfitness.com', '+91 83280 75915', CURRENT_DATE + 1, '06:00', 'confirmed'),
(3, 2, 2, 6, 'Sneha K.',     'sneha.k@gmail.com',        '+91 94401 56789', CURRENT_DATE + 1, '07:00', 'pending'),
(4, 5, 3, 7, 'Divya Teja',   'divya.teja@gmail.com',      '+91 97012 34567', CURRENT_DATE + 2, '17:00', 'confirmed'),
(2, NULL, 1, 1, 'Karthik Rao','karthik.rao@gmail.com',    '+91 98480 12345', CURRENT_DATE + 1, '08:00', 'confirmed');

-- AUDIT LOGS -----------------------------------------------------------------
INSERT INTO audit_logs (event_type, description, metadata) VALUES
('SYSTEM_INITIALIZATION', 'Kurnool Fitness Centre dataset initialized with concurrency-controlled timetable and Indian athletic profiles.', '{"initialized_by": "Manoj Kumar", "version": "2.0.0"}');

-- REVIEWS (Indian Members) ----------------------------------------------------
INSERT INTO reviews (member_id, customer_name, role_label, rating, message, is_approved) VALUES
(2, 'Karthik Rao',   'Gold Member',          5, 'Kurnool Fitness Centre is genuinely the best gym in Rayalaseema. The trainers are top-notch and the equipment is state-of-the-art.', TRUE),
(1, 'Manoj Kumar',   'Gold Member',          5, 'Transformed my physique completely over the past year. Outstanding strength equipment, real-time slot bookings, and disciplined environment.', TRUE),
(3, 'Sneha K.',      'Platinum Member',      5, 'Priya Reddy’s yoga and mobility training helped cure my chronic posture issues. Highly recommended for working professionals in Kurnool.', TRUE),
(4, 'Arun Kumar',    'Strength Athlete',     5, 'Clean locker rooms, international standard barbells, and dumbells. Best fitness facility near Bellary Road!', TRUE);

-- GALLERY --------------------------------------------------------------------
INSERT INTO gallery_images (title, category, image_url) VALUES
('Main Free Weights Arena', 'Equipment', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80'),
('Cardio & Endurance Suite', 'Facilities','https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1200&q=80'),
('Functional Mobility Studio','Training', 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80'),
('Heavy Dumbbell Section',   'Equipment', 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=1200&q=80'),
('Yoga & Recovery Hall',     'Community', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80'),
('Locker & Wellness Area',   'Facilities','https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1200&q=80');

-- BANNERS --------------------------------------------------------------------
INSERT INTO banners (title, subtitle, image_url, position, sort_order) VALUES
('Kurnool’s Premier Athletic Training Hub', 'Certified Indian coaches, concurrency-safe timetable scheduling, and pro gym facilities.', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80', 'home', 1),
('Authentic Sports Supplements & Gear',    '100% genuine lab-tested proteins and accessories in Kurnool.',                             'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=1200&q=80', 'home', 2);

-- SITE CONTENT ---------------------------------------------------------------
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
