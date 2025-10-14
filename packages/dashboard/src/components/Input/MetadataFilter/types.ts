export const conditions = ['is', 'is not', 'contains', 'does not contain', 'starts with', 'does not start with', 'ends with', 'does not end with'] as const;
export type Condition = typeof conditions[number];

export const combinations = ['and', 'or'] as const;
export type Combination = typeof combinations[number];

export type MetadataFilterType = {
    field?: string;
    value?: string;
    condition?: Condition;
}

export type MetadataFilterGroupType = {
    combination?: Combination;
    filters: MetadataFilterType[];
}