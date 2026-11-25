// src/lib/push.ts
import { getTurso } from './turso'

// Re-export methods from scripts/pushNotifications
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pushService = require('../../scripts/pushNotifications')

export interface PushSubscriptionKeys {
  p256dh: string
  auth: string
}

export interface SavePushSubscriptionParams {
  endpoint: string
  p256dh: string
  auth: string
  licenseNumber?: string | null
  userAgent?: string
}

export interface PushSubscriptionResult {
  status: 'created' | 'updated'
  id: string
  licenseNumber?: string | null
}

export interface PushStats {
  total: number
  active: number
  unsubscribed: number
  expired: number
  notified: number
}

export function getVapidPublicKey(): string {
  const cfg = pushService.getVapidConfig()
  return cfg.publicKey || ''
}

export async function ensurePushTable() {
  const db = getTurso()
  return pushService.ensurePushTable(db)
}

export async function savePushSubscription(
  params: SavePushSubscriptionParams
): Promise<PushSubscriptionResult> {
  const db = getTurso()
  return pushService.savePushSubscription(db, params)
}

export async function unsubscribePushSubscription(params: {
  endpoint: string
  licenseNumber?: string | null
}): Promise<{ success: boolean; affected: number }> {
  const db = getTurso()
  return pushService.unsubscribePushSubscription(db, params)
}

export async function processPendingPushNotifications() {
  const db = getTurso()
  return pushService.processPendingPushNotifications(db)
}

export async function sendTestPush(params: {
  endpoint: string
  p256dh: string
  auth: string
}): Promise<{ success: boolean; expired?: boolean; error?: string }> {
  const db = getTurso()
  return pushService.sendTestPush(db, params)
}

export async function getPushStats(): Promise<PushStats> {
  const db = getTurso()
  return pushService.getPushStats(db)
}

export interface PushSubscriptionItem {
  id: string
  endpoint: string
  p256dh: string
  auth: string
  license_number: string | null
  user_agent: string | null
  status: 'active' | 'unsubscribed' | 'expired'
  created_at: number
  updated_at: number
  last_notified_at: number | null
}

export interface PushLogsResult {
  logs: PushSubscriptionItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export async function getPushLogs(params?: {
  page?: number
  limit?: number
  search?: string
  status?: string
}): Promise<PushLogsResult> {
  const db = getTurso()
  return pushService.getPushLogs(db, params)
}

export async function broadcastPushNotification(params: {
  title: string
  body: string
  url?: string
  tag?: string
  targetLicense?: string | null
}): Promise<{ total: number; sentCount: number; expiredCount: number; failedCount: number }> {
  const db = getTurso()
  return pushService.broadcastPushNotification(db, params)
}

export async function deletePushSubscriptionById(
  id: string
): Promise<{ success: boolean; affected: number }> {
  const db = getTurso()
  return pushService.deletePushSubscriptionById(db, id)
}

export async function deletePushSubscriptionsByStatus(
  status: 'expired' | 'unsubscribed'
): Promise<{ success: boolean; affected: number }> {
  const db = getTurso()
  return pushService.deletePushSubscriptionsByStatus(db, status)
}
