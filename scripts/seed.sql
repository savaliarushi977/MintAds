-- MintAds Seed Data
-- Angles, Hooks, Personas, Config

-- Angles
INSERT INTO angles (id, name, description, motivation, kills_objection, example_line, sort_order) VALUES
('A1', 'The Iconic Moment',    'Sell the dream-state of being there. Pure wanderlust. Brand in background.',                                                 'Stimulus-avoidance + Intellectual',  NULL,              '"This is what 7am at the Taj Mahal feels like."',          1),
('A2', 'Bucket-List FOMO',     'Frame as un-missable. Pain of regret. Loss aversion.',                                                                        'Social / esteem',                    '#5 later',        '"You flew 8 hours to Rome and DIDN''T go inside?"',        2),
('A3', 'Skip-the-Line',        'Queues = wasted holiday. Dramatize 3-hour line, rescue with skip-the-line.',                                                  'Competence + Stimulus-avoidance',    '#3 wasted time',  '"They waited 3 hours. We walked straight in."',            3),
('A4', 'Is It Worth It?',      'Meet price objection head-on. Show what you get. Free cancellation close.',                                                    'Determinants (price/risk)',           '#1 trust, #2 value', '"$68 for the Vatican — worth it? Watch this."',         4),
('A5', 'Social Proof',         'Rating + review count + real traveller reactions. Crowd confidence.',                                                          'Social / esteem',                    '#1 is it legit',  '"4.8★ from 2M+ travellers. Here''s why."',                5)
ON CONFLICT (id) DO NOTHING;

-- Hooks
INSERT INTO hooks (id, name, template, description, sort_order) VALUES
('problem',        'Problem',        'Going to {city} and dreading the {POI} queue?',           'Problem-aware audience; dramatize the pain',              1),
('outcome',        'Outcome',        'This is how you skip every line at {POI}.',               'Show the end state fast',                                 2),
('fomo',           'FOMO',           'You''re in {city} and NOT doing {POI}??',                 'Social/esteem driver',                                    3),
('curiosity',      'Curiosity',      '{price} for {POI} — worth it?',                           'Open a loop; invite click-through',                       4),
('social_proof',   'Social Proof',   '{rating}★ from {review_count}+ travellers.',              'De-risk with numbers',                                    5),
('mistake',        'Mistake',        'The #1 mistake tourists make at {POI}.',                  'Authority pattern interrupt',                              6),
('transformation', 'Transformation', 'I almost skipped {POI}. Biggest regret-saver of the trip.', 'Before/after arc; relatable hesitation',               7)
ON CONFLICT (id) DO NOTHING;

-- Personas
INSERT INTO personas (id, name, description, sort_order) VALUES
('solo',           'Solo Traveller',    'Personal discovery, "I" language, independent explorer energy',         1),
('couple',         'Couple',            'Shared romantic moments, "we" language, adventurous or romantic',       2),
('art_enthusiast', 'Art Enthusiast',    'Aesthetic depth, artistic appreciation, visual beauty',                 3),
('cultural',       'Cultural Traveller','Historical significance, authentic local perspective',                  4),
('family',         'Family',            'Safety, ease, kids-friendly framing, value',                           5),
('budget',         'Budget Traveller',  'Smart spending, value framing, cost-per-memory',                       6)
ON CONFLICT (id) DO NOTHING;

-- Config
INSERT INTO config (key, value) VALUES
('brand_assets',  '{"logo_url": "/static/headout-logo-white.png", "primary_color": "#ff5a5f", "secondary_color": "#1a1a2e"}'),
('voice_config',  '{"voice_id": "JBFqnCBsd6RMkjVDRZzb", "voice_name": "George", "model_id": "eleven_multilingual_v2", "stability": 0.35, "similarity_boost": 0.75, "style": 0.5}'),
('cost_rates',    '{"seedance_high": 0.30, "seedance_basic": 0.15, "claude_input_per_1k": 0.003, "claude_output_per_1k": 0.015, "elevenlabs_per_1k_chars": 0.03}'),
('higgsfield',    '{"model": "seedance-v2.0-i2v", "master_aspect_ratio": "9:16", "hook_quality": "high", "body_quality": "basic", "payoff_quality": "basic", "generate_audio": false}')
ON CONFLICT (key) DO NOTHING;
