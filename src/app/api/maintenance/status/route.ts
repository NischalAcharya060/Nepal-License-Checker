import { NextResponse } from 'next/server'
import { getTurso } from '@/lib/turso'
import { getSystemMode } from '@/lib/systemMode'
import { isMaintenanceEnabled } from '@/lib/maintenanceAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Public liveness probe used by the maintenance notice.
 * Returns ok: true only when DB is alive AND maintenance mode is inactive.
 */
export async function GET() {
    try {
        await getTurso().execute('SELECT 1')
        const systemModeConfig = await getSystemMode()
        const maintenanceActive = systemModeConfig.mode === 'maintenance' || isMaintenanceEnabled()

        return NextResponse.json({
            status: 'success',
            data: {
                ok: !maintenanceActive,
                mode: systemModeConfig.mode,
            },
        })
    } catch {
        return NextResponse.json({ status: 'success', data: { ok: false } })
    }
}
