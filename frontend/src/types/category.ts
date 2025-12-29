// Constant object matching the backend categories
export const CategoryName = {
    CLIMATE_AND_EMISSIONS: 'CLIMATE AND EMISSIONS',
    BIODIVERSITY_AND_ECOSYSTEMS: 'BIODIVERSITY AND ECOSYSTEMS',
    POLLUTION_AND_ENVIRONMENTAL_QUALITY: 'POLLUTION AND ENVIRONMENTAL QUALITY',
    NATURAL_RESOURCES: 'NATURAL RESOURCES',
    ENERGY_AND_TRANSITION: 'ENERGY AND TRANSITION',
    POLICIES_AND_REGULATION: 'POLICIES AND REGULATION',
    SOCIO_ECONOMIC_IMPACT: 'SOCIO-ECONOMIC IMPACT',
    RISKS_AND_DISASTERS: 'RISKS AND DISASTERS'
} as const;

export type CategoryName = typeof CategoryName[keyof typeof CategoryName];

// Interface for a category with document count
export interface Category {
    id: number;
    name: string;
    description: string;
    documentsTotal: number;
}