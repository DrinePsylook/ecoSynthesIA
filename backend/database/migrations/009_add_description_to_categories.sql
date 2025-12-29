-- Add description column to categories table
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS description TEXT;

-- Seed the categories table with the 8 fixed categories and descriptions
-- Update existing categories or insert new ones

INSERT INTO categories (name, description) 
VALUES
    ('CLIMATE AND EMISSIONS', 'Topics related to global warming, greenhouse gas emissions, international climate conferences (COP), carbon accounting methodologies, and climate change mitigation targets and strategies.'),
    ('BIODIVERSITY AND ECOSYSTEMS', 'Coverage of species protection initiatives, deforestation issues, natural habitat preservation, ocean and marine ecosystem health, and the conservation of fauna and flora worldwide.'),
    ('POLLUTION AND ENVIRONMENTAL QUALITY', 'Articles addressing air quality concerns, water pollution incidents, soil contamination, waste management systems, and pollution from plastics, noise, or other environmental contaminants.'),
    ('NATURAL RESOURCES', 'Discussion of water resource management including droughts, sustainable forestry practices, responsible fishing policies, agricultural sustainability, and land use planning.'),
    ('ENERGY AND TRANSITION', 'News about renewable energy sources (solar, wind, hydroelectric), nuclear power developments, energy efficiency improvements, and policies for phasing out fossil fuels.'),
    ('POLICIES AND REGULATION', 'Information on national environmental laws, international treaties and agreements, government environmental policies, ecological taxation systems, and regulatory enforcement actions.'),
    ('SOCIO-ECONOMIC IMPACT', 'Analysis of environmental justice issues, health impacts of environmental factors, economic consequences of environmental policies, green job creation, and social inequalities related to environmental issues.'),
    ('RISKS AND DISASTERS', 'Reports on natural disasters including floods, wildfires, extreme weather events, and industrial catastrophes with significant environmental impacts.')
ON CONFLICT (name) 
DO UPDATE SET description = EXCLUDED.description;