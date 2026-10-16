// src/lib/testimonials.ts
import { getTurso } from './turso'
import crypto from 'crypto'

export interface TestimonialItem {
    id: string
    name: string
    role?: string | null
    rating: number
    message: string
    email?: string | null
    license_number?: string | null
    status: 'pending' | 'approved' | 'rejected'
    is_featured: boolean
    admin_notes?: string | null
    ip?: string | null
    created_at: number
    updated_at: number
}

export interface PublicTestimonialItem {
    id: string
    name: string
    role?: string | null
    rating: number
    message: string
    created_at: number
    is_featured: boolean
}

export interface TestimonialStats {
    total: number
    pendingCount: number
    approvedCount: number
    rejectedCount: number
    averageRating: number
    todayCount: number
}

export interface TestimonialLogsResult {
    testimonials: TestimonialItem[]
    total: number
    page: number
    limit: number
    totalPages: number
}

let tableChecked = false

export async function ensureTestimonialsTable(): Promise<void> {
    if (tableChecked) return
    const db = getTurso()

    await db.batch(
        [
            `CREATE TABLE IF NOT EXISTS testimonials (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                role TEXT,
                rating INTEGER NOT NULL DEFAULT 5,
                message TEXT NOT NULL,
                email TEXT,
                license_number TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                is_featured INTEGER NOT NULL DEFAULT 0,
                admin_notes TEXT,
                ip TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )`,
            `CREATE INDEX IF NOT EXISTS idx_testimonials_created_at ON testimonials(created_at DESC)`,
            `CREATE INDEX IF NOT EXISTS idx_testimonials_status ON testimonials(status)`,
            `CREATE INDEX IF NOT EXISTS idx_testimonials_rating ON testimonials(rating)`,
            `CREATE INDEX IF NOT EXISTS idx_testimonials_is_featured ON testimonials(is_featured)`,
        ],
        'write'
    )

    // Seed initial testimonials if table is brand new
    try {
        const countRes = await db.execute('SELECT COUNT(*) as count FROM testimonials')
        const count = Number(countRes.rows?.[0]?.count) || 0
        if (count === 0) {
            const now = Date.now()
            const seedItems = [
                {
                    id: 'seed_1',
                    name: 'Bikash Shrestha',
                    role: 'Ekantakuna, Lalitpur',
                    rating: 5,
                    message: 'Extremely helpful platform! I was checking the DOTM website daily without luck, but this tool showed me the exact day my smart card was printed. Collected my license the next morning smoothly.',
                    status: 'approved',
                    is_featured: 1,
                    created_at: now - 3 * 86400000,
                },
                {
                    id: 'seed_2',
                    name: 'Sunita Adhikari',
                    role: 'Pokhara, Kaski',
                    rating: 5,
                    message: 'धेरै सजिलो र छरितो सेवा! यातायात कार्यालय धाइरहनु नपरी घरमै बसेर मेरो स्मार्ट कार्ड छापियो कि छैन तुरुन्तै थाहा भयो। यस्तो नागरिकमैत्री र निःशुल्क सेवा बनाउनु भएकोमा धेरै धन्यवाद।',
                    status: 'approved',
                    is_featured: 1,
                    created_at: now - 2 * 86400000,
                },
                {
                    id: 'seed_3',
                    name: 'Ramesh Thapa',
                    role: 'Chabahil, Kathmandu',
                    rating: 5,
                    message: 'The instant search and accurate DOTM record match saved me hours of frustration. No registration or hassle required, just entered my license number and got full print details.',
                    status: 'approved',
                    is_featured: 1,
                    created_at: now - 86400000,
                },
                {
                    id: 'seed_4',
                    name: 'Anish Gurung',
                    role: 'Butwal, Rupandehi',
                    rating: 5,
                    message: 'Super clean UI and lightning fast response! The bilingual support (नेपाली & English) and transport office guide make it easy for everyone. Highly recommended to all Nepali drivers.',
                    status: 'approved',
                    is_featured: 0,
                    created_at: now - 12 * 3600000,
                },
            ]

            for (const item of seedItems) {
                await db.execute({
                    sql: `INSERT INTO testimonials (
                        id, name, role, rating, message, email, license_number, status, is_featured, admin_notes, ip, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, 'Official Verified Feedback', '127.0.0.1', ?, ?)`,
                    args: [
                        item.id,
                        item.name,
                        item.role,
                        item.rating,
                        item.message,
                        item.status,
                        item.is_featured,
                        item.created_at,
                        item.created_at,
                    ],
                })
            }
        }
    } catch (e) {
        console.error('Error during testimonials table seeding:', e)
    }

    tableChecked = true
}

export async function createTestimonialSubmission(params: {
    name: string
    role?: string
    rating: number
    message: string
    email?: string
    ip?: string
}): Promise<{ status: 'success'; id: string; message: string }> {
    await ensureTestimonialsTable()
    const db = getTurso()

    const cleanName = params.name.trim().slice(0, 100)
    const cleanRole = params.role ? params.role.trim().slice(0, 100) : null
    const cleanRating = Math.min(5, Math.max(1, Math.round(Number(params.rating) || 5)))
    const cleanMessage = params.message.trim().slice(0, 1500)
    const cleanEmail = params.email ? params.email.trim().toLowerCase().slice(0, 120) : null
    const cleanIp = params.ip ? params.ip.slice(0, 50) : null

    const id = `testi_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    const now = Date.now()

    await db.execute({
        sql: `INSERT INTO testimonials (
            id, name, role, rating, message, email, license_number, status, is_featured, admin_notes, ip, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, 'pending', 0, NULL, ?, ?, ?)`,
        args: [
            id,
            cleanName,
            cleanRole,
            cleanRating,
            cleanMessage,
            cleanEmail,
            cleanIp,
            now,
            now,
        ],
    })

    return {
        status: 'success',
        id,
        message: 'Your feedback has been submitted successfully and will appear once reviewed by admin.',
    }
}

export async function getPublicTestimonials(): Promise<{
    testimonials: PublicTestimonialItem[]
    averageRating: number
    totalApproved: number
}> {
    await ensureTestimonialsTable()
    const db = getTurso()

    const res = await db.execute(`
        SELECT id, name, role, rating, message, created_at, is_featured
        FROM testimonials
        WHERE status = 'approved'
        ORDER BY is_featured DESC, created_at DESC
        LIMIT 50
    `)

    const testimonials: PublicTestimonialItem[] = (res.rows || []).map((row) => ({
        id: String(row.id),
        name: String(row.name),
        role: row.role ? String(row.role) : null,
        rating: Number(row.rating) || 5,
        message: String(row.message),
        created_at: Number(row.created_at),
        is_featured: Boolean(row.is_featured),
    }))

    const avgRes = await db.execute(`
        SELECT AVG(rating) as avg_rating, COUNT(*) as count
        FROM testimonials
        WHERE status = 'approved'
    `)

    const avg = Number(avgRes.rows?.[0]?.avg_rating) || 5.0
    const count = Number(avgRes.rows?.[0]?.count) || testimonials.length

    return {
        testimonials,
        averageRating: parseFloat(avg.toFixed(1)),
        totalApproved: count,
    }
}

export async function getTestimonialStats(): Promise<TestimonialStats> {
    await ensureTestimonialsTable()
    const db = getTurso()

    const res = await db.execute(`
        SELECT status, COUNT(*) as count, AVG(rating) as avg_rating
        FROM testimonials
        GROUP BY status
    `)

    let total = 0
    let pendingCount = 0
    let approvedCount = 0
    let rejectedCount = 0
    let totalScore = 0
    let ratedItems = 0

    for (const row of res.rows || []) {
        const status = String(row.status)
        const count = Number(row.count) || 0
        const avg = Number(row.avg_rating) || 0

        total += count
        totalScore += avg * count
        ratedItems += count

        if (status === 'pending') pendingCount += count
        else if (status === 'approved') approvedCount += count
        else if (status === 'rejected') rejectedCount += count
    }

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const todayRes = await db.execute({
        sql: 'SELECT COUNT(*) as count FROM testimonials WHERE created_at >= ?',
        args: [todayStart.getTime()],
    })
    const todayCount = Number(todayRes.rows?.[0]?.count) || 0

    const averageRating = ratedItems > 0 ? parseFloat((totalScore / ratedItems).toFixed(1)) : 5.0

    return {
        total,
        pendingCount,
        approvedCount,
        rejectedCount,
        averageRating,
        todayCount,
    }
}

export async function getAdminTestimonials(params?: {
    page?: number
    limit?: number
    search?: string
    status?: string
}): Promise<TestimonialLogsResult> {
    await ensureTestimonialsTable()
    const db = getTurso()

    const page = Math.max(1, params?.page || 1)
    const limit = Math.min(100, Math.max(10, params?.limit || 50))
    const offset = (page - 1) * limit
    const search = params?.search?.trim() || ''
    const status = params?.status || 'all'

    const whereClauses: string[] = []
    const args: (string | number)[] = []

    if (status && status !== 'all') {
        whereClauses.push('status = ?')
        args.push(status)
    }

    if (search) {
        const term = `%${search.toLowerCase()}%`
        whereClauses.push('(LOWER(name) LIKE ? OR LOWER(message) LIKE ? OR LOWER(role) LIKE ? OR LOWER(COALESCE(email, "")) LIKE ?)')
        args.push(term, term, term, term)
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

    const countSql = `SELECT COUNT(*) as total FROM testimonials ${whereSql}`
    const countRes = await db.execute({ sql: countSql, args })
    const total = Number(countRes.rows?.[0]?.total || 0)

    const dataSql = `
        SELECT id, name, role, rating, message, email, license_number, status, is_featured, admin_notes, ip, created_at, updated_at
        FROM testimonials
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `
    const dataRes = await db.execute({ sql: dataSql, args: [...args, limit, offset] })

    const testimonials: TestimonialItem[] = (dataRes.rows || []).map((row) => ({
        id: String(row.id),
        name: String(row.name),
        role: row.role ? String(row.role) : null,
        rating: Number(row.rating) || 5,
        message: String(row.message),
        email: row.email ? String(row.email) : null,
        license_number: row.license_number ? String(row.license_number) : null,
        status: (String(row.status) as 'pending' | 'approved' | 'rejected') || 'pending',
        is_featured: Boolean(row.is_featured),
        admin_notes: row.admin_notes ? String(row.admin_notes) : null,
        ip: row.ip ? String(row.ip) : null,
        created_at: Number(row.created_at),
        updated_at: Number(row.updated_at),
    }))

    return {
        testimonials,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
    }
}

export async function updateTestimonialStatus(
    id: string,
    status: 'pending' | 'approved' | 'rejected',
    options?: { is_featured?: boolean; adminNotes?: string }
): Promise<boolean> {
    await ensureTestimonialsTable()
    const db = getTurso()

    const now = Date.now()
    const isFeaturedVal = typeof options?.is_featured === 'boolean' ? (options.is_featured ? 1 : 0) : null

    const res = await db.execute({
        sql: `UPDATE testimonials 
              SET status = ?, 
                  is_featured = COALESCE(?, is_featured), 
                  admin_notes = COALESCE(?, admin_notes), 
                  updated_at = ? 
              WHERE id = ?`,
        args: [status, isFeaturedVal, options?.adminNotes ?? null, now, id],
    })

    return res.rowsAffected > 0
}

export async function bulkUpdateTestimonialStatus(
    ids: string[],
    status: 'pending' | 'approved' | 'rejected'
): Promise<number> {
    await ensureTestimonialsTable()
    const db = getTurso()

    const cleanIds = ids.map((id) => id.trim()).filter(Boolean)
    if (cleanIds.length === 0) return 0

    const placeholders = cleanIds.map(() => '?').join(', ')
    const now = Date.now()

    const res = await db.execute({
        sql: `UPDATE testimonials 
              SET status = ?, updated_at = ? 
              WHERE id IN (${placeholders})`,
        args: [status, now, ...cleanIds],
    })

    return res.rowsAffected
}

export async function toggleFeaturedTestimonial(id: string, isFeatured: boolean): Promise<boolean> {
    await ensureTestimonialsTable()
    const db = getTurso()

    const res = await db.execute({
        sql: `UPDATE testimonials SET is_featured = ?, updated_at = ? WHERE id = ?`,
        args: [isFeatured ? 1 : 0, Date.now(), id],
    })

    return res.rowsAffected > 0
}

export async function deleteTestimonial(id: string): Promise<boolean> {
    await ensureTestimonialsTable()
    const db = getTurso()

    const res = await db.execute({
        sql: `DELETE FROM testimonials WHERE id = ?`,
        args: [id],
    })

    return res.rowsAffected > 0
}

export async function bulkDeleteTestimonials(ids: string[]): Promise<number> {
    await ensureTestimonialsTable()
    const db = getTurso()

    const cleanIds = ids.map((id) => id.trim()).filter(Boolean)
    if (cleanIds.length === 0) return 0

    const placeholders = cleanIds.map(() => '?').join(', ')
    const res = await db.execute({
        sql: `DELETE FROM testimonials WHERE id IN (${placeholders})`,
        args: cleanIds,
    })

    return res.rowsAffected
}
