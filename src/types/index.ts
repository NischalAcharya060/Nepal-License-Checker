// src/types/index.ts
export interface License {
    license_number: string;
    holder_name: string;
    office: string;
    category: string;
    createdAt: Date | any;
    updatedAt: Date | any;
}

export interface APIResponse {
    status: 'success' | 'error';
    data?: License | null;
    message?: string;
    error?: string;
}