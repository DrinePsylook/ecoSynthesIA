// Enum for the 8 fixed categories
export enum CategoryName {
    CLIMATE_AND_EMISSIONS = 'CLIMATE AND EMISSIONS',
    BIODIVERSITY_AND_ECOSYSTEMS = 'BIODIVERSITY AND ECOSYSTEMS',
    POLLUTION_AND_ENVIRONMENTAL_QUALITY = 'POLLUTION AND ENVIRONMENTAL QUALITY',
    NATURAL_RESOURCES = 'NATURAL RESOURCES',
    ENERGY_AND_TRANSITION = 'ENERGY AND TRANSITION',
    POLICIES_AND_REGULATION = 'POLICIES AND REGULATION',
    SOCIO_ECONOMIC_IMPACT = 'SOCIO-ECONOMIC IMPACT',
    RISKS_AND_DISASTERS = 'RISKS AND DISASTERS'
}

// Interface for the categories table
export interface Category {
    id: number;
    name:string;
    description?:string;
}

// Array of all category names for validation
export const ALL_CATEGORY_NAMES = Object.values(CategoryName);