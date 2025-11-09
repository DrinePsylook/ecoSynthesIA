-- Seed the categories table with the 8 fixed categories
-- Ony insert if categories don't already exist

INSERT INTO categories (name) 
VALUES
    ('CLIMATE AND EMISSIONS'),
    ('BIODIVERSITY AND ECOSYSTEMS'),
    ('POLLUTION AND ENVIRONMENTAL QUALITY'),
    ('NATURAL RESOURCES'),
    ('ENERGY AND TRANSITION'),
    ('POLICIES AND REGULATION'),
    ('SOCIO-ECONOMIC IMPACT'),
    ('RISKS AND DISASTERS')
ON CONFLICT (name) DO NOTHING;