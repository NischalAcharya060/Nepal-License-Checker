// src/lib/notifications.ts
import { getTurso } from './turso'

// Re-export methods from scripts/notifications
// eslint-disable-next-line @typescript-eslint/no-require-imports
const notificationService = require('../../scripts/notifications')

export interface NotificationRecord {
  id: string
  license_number: string
  email: string
  status: 'pending' | 'processing' | 'sent' | 'cancelled'
  unsubscribe_token: string
  created_at: number
  updated_at: number
  sent_at?: number | null
  cancelled_at?: number | null
}

export interface CreateNotificationResult {
  status: 'success' | 'already_subscribed' | 'already_printed'
  message: string
  id?: string
  licenseNumber?: string
  email?: string
  unsubscribeToken?: string
  license?: {
    license_number: string
    holder_name: string
    office: string
    category: string
    updatedAt: number
  }
}

export interface CancelNotificationResult {
  status: 'success' | 'not_found' | 'already_cancelled' | 'already_sent'
  message: string
  licenseNumber?: string
  email?: string
}

export async function ensureNotificationsTable() {
  const db = getTurso()
  return notificationService.ensureNotificationsTable(db)
}

export async function createNotification(params: {
  licenseNumber: string
  email: string
}): Promise<CreateNotificationResult> {
  const db = getTurso()
  return notificationService.createNotification(db, params)
}

export async function cancelNotification(params: {
  token?: string
  licenseNumber?: string
  email?: string
}): Promise<CancelNotificationResult> {
  const db = getTurso()
  return notificationService.cancelNotification(db, params)
}

export async function getNotificationByToken(token: string): Promise<NotificationRecord | null> {
  const db = getTurso()
  return notificationService.getNotificationByToken(db, token)
}

export async function processPendingNotifications() {
  const db = getTurso()
  return notificationService.processPendingNotifications(db)
}

export interface NotificationStats {
  total: number
  pending: number
  sent: number
  cancelled: number
  deliveryRate: number
}

export interface NotificationLogItem {
  id: string
  license_number: string
  email: string
  status: 'pending' | 'processing' | 'sent' | 'cancelled'
  created_at: number
  updated_at: number
  sent_at?: number | null
  cancelled_at?: number | null
  holder_name?: string | null
  office?: string | null
}

export interface NotificationLogsResult {
  logs: NotificationLogItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export async function getNotificationStats(): Promise<NotificationStats> {
  const db = getTurso()
  return notificationService.getNotificationStats(db)
}

export async function getNotificationLogs(params?: {
  page?: number
  limit?: number
  search?: string
  status?: string
}): Promise<NotificationLogsResult> {
  const db = getTurso()
  return notificationService.getNotificationLogs(db, params)
}

export function maskEmail(email: string): string {
  return notificationService.maskEmail(email)
}

