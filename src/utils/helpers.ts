// src/utils/helpers.ts
export function formatDate(date: Date | string | any, locale: string = 'en-NP'): string {
    if (!date) return 'N/A';

    let d;
    if (date.toDate) {
        // Firestore Timestamp
        d = date.toDate();
    } else {
        d = new Date(date);
    }

    return d.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
