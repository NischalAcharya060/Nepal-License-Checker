// src/utils/helpers.ts

type DateInput = Date | string | number | { toDate?: () => Date } | null | undefined

export function formatDate(date: DateInput, locale: string = 'en-NP'): string {
    if (!date) return 'N/A'

    let d: Date
    if (typeof date === 'object' && date !== null && 'toDate' in date && typeof date.toDate === 'function') {
        // Firestore / Firebase Timestamp
        d = date.toDate()
    } else {
        d = new Date(date as string | number | Date)
    }

    if (isNaN(d.getTime())) return 'N/A'

    return d.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })
}

export function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout

    return (...args: Parameters<T>) => {
        clearTimeout(timeout)
        timeout = setTimeout(() => func(...args), wait)
    }
}
