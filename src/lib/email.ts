// src/lib/email.ts
import nodemailer from 'nodemailer'
import axios from 'axios'
import { getSiteUrl } from './siteUrl'
import { formatNepalDateTime } from './cronHelper'
import { logSentEmail } from './emailLogs'

export interface SendMailOptions {
    to: string
    subject: string
    html: string
    text: string
    from?: string
}

export interface MailDeliveryResult {
    success: boolean
    provider: 'resend' | 'gmail' | 'smtp' | 'simulated'
    id?: string
    messageId?: string
    error?: string
}

function getSanitizedFromAddress(): string {
    const defaultSender = 'Nepal License Checker <nepallicensechecker@gmail.com>'
    let fromAddress = (process.env.SMTP_FROM || defaultSender).trim()

    if (fromAddress.includes('<') && fromAddress.includes('>')) {
        fromAddress = fromAddress.replace(/<\s+/g, '<').replace(/\s+>/g, '>')
        if (!fromAddress.includes('@') && fromAddress.toLowerCase().includes('acharyanischal.com.np')) {
            fromAddress = fromAddress.replace(/<([^@>]+)\.acharyanischal\.com\.np>/i, '<$1@acharyanischal.com.np>')
        }
    }
    return fromAddress
}

/**
 * Universal email sender: checks Resend API, Gmail SMTP, custom SMTP, or simulation mode.
 */
export async function sendEmail(options: SendMailOptions): Promise<MailDeliveryResult> {
    const { to, subject, html, text, from } = options
    const fromAddress = from || getSanitizedFromAddress()

    // 1. Resend API (HTTP REST)
    if (process.env.RESEND_API_KEY) {
        try {
            const payload = {
                from: fromAddress.includes('<') ? fromAddress : `Nepal License Checker <${fromAddress}>`,
                to: [to],
                subject,
                html,
                text,
            }

            const res = await axios.post('https://api.resend.com/emails', payload, {
                headers: {
                    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                timeout: 15000,
            })

            return {
                success: true,
                provider: 'resend',
                id: res.data?.id,
            }
        } catch (err: unknown) {
            console.error('[Email] Resend API error:', err)
            // Fall through to SMTP if configured
        }
    }

    // 2. SMTP with Nodemailer (Gmail, Brevo, AWS SES, etc.)
    if (process.env.SMTP_HOST || process.env.SMTP_SERVICE || process.env.SMTP_USER) {
        try {
            const isGmail =
                process.env.SMTP_SERVICE === 'gmail' ||
                (process.env.SMTP_HOST && process.env.SMTP_HOST.includes('gmail'))

            const rawPass = process.env.SMTP_PASS ? String(process.env.SMTP_PASS).trim() : ''
            const cleanPass = isGmail ? rawPass.replace(/\s+/g, '') : rawPass
            const port = Number(process.env.SMTP_PORT) || (isGmail ? 465 : 587)

            const transportConfig =
                process.env.SMTP_SERVICE === 'gmail' && !process.env.SMTP_HOST
                    ? {
                          service: 'gmail',
                          auth: {
                              user: process.env.SMTP_USER,
                              pass: cleanPass,
                          },
                      }
                    : {
                          host: process.env.SMTP_HOST || 'smtp.gmail.com',
                          port,
                          secure: port === 465,
                          auth: process.env.SMTP_USER
                              ? {
                                    user: process.env.SMTP_USER,
                                    pass: cleanPass,
                                }
                              : undefined,
                      }

            const transporter = nodemailer.createTransport(transportConfig)

            const info = await transporter.sendMail({
                from: fromAddress,
                to,
                subject,
                html,
                text,
            })

            return {
                success: true,
                provider: isGmail ? 'gmail' : 'smtp',
                messageId: info.messageId,
            }
        } catch (err: unknown) {
            const error = err as Error
            console.error('[Email] SMTP send error:', error.message)
            return {
                success: false,
                provider: 'smtp',
                error: error.message,
            }
        }
    }

    // 3. Fallback: Simulation Mode for Local Development without credentials
    console.log(`\n======================================================`)
    console.log(`[SIMULATED EMAIL - NO SMTP CONFIGURED]`)
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log(`Text preview: ${text.slice(0, 160)}...`)
    console.log(`======================================================\n`)

    return {
        success: true,
        provider: 'simulated',
    }
}

/**
 * Format and send an email notification when an Admin replies or changes status on a contact/problem inquiry.
 */
export async function sendFeedbackStatusEmail(params: {
    to: string
    name: string
    ticketId: string
    subject: string
    category: string
    licenseNumber?: string | null
    userMessage: string
    status: 'new' | 'in_progress' | 'resolved'
    adminNotes?: string | null
    updatedAt?: number
}): Promise<MailDeliveryResult> {
    const siteUrl = getSiteUrl()
    const trackingUrl = `${siteUrl}/feedback?email=${encodeURIComponent(params.to)}&id=${encodeURIComponent(params.ticketId)}`
    const formattedDate = formatNepalDateTime(params.updatedAt || Date.now(), 'en', true)

    const statusBadge =
        params.status === 'resolved'
            ? {
                  title: 'RESOLVED & ANSWERED',
                  nepaliTitle: 'समस्या समाधान / जवाफ पठाइयो',
                  bg: '#ecfdf5',
                  border: '#a7f3d0',
                  color: '#065f46',
                  tagBg: '#059669',
              }
            : params.status === 'in_progress'
            ? {
                  title: 'UNDER INVESTIGATION / IN PROGRESS',
                  nepaliTitle: 'सोधपुछ अनुसन्धान तथा प्रक्रियामा',
                  bg: '#eff6ff',
                  border: '#bfdbfe',
                  color: '#1e40af',
                  tagBg: '#2563eb',
              }
            : {
                  title: 'SUPPORT UPDATE',
                  nepaliTitle: 'प्रतिक्रिया सम्बन्धी जानकारी',
                  bg: '#f8fafc',
                  border: '#e2e8f0',
                  color: '#334155',
                  tagBg: '#475569',
              }

    const emailSubject = `Update on your inquiry [${params.subject || 'Support'}] - Nepal License Checker`

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9; color: #1e293b; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    td { vertical-align: top; }
    .btn:hover { background: #002666 !important; }
  </style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
    
    <!-- Top Header -->
    <div style="background: linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%); border-top: 5px solid #003893; border-bottom: 1px solid #e2e8f0; padding: 30px 24px 24px; text-align: center;">
      <div style="display: inline-block; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 20px; padding: 5px 14px; font-size: 11px; font-weight: 800; color: #0369a1; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 12px;">
        🇳🇵 Nepal License Checker Support
      </div>
      <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 800; line-height: 1.3; color: #003893;">
        Support Response to Your Inquiry
      </h1>
      <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5; font-weight: 500;">
        तपाईंको समस्या वा सोधपुछ सम्बन्धी एड्मिन टोलीबाट नयाँ जानकारी उपलब्ध छ।
      </p>
    </div>

    <!-- Main Body -->
    <div style="padding: 24px 24px;">
      
      <!-- Status Pill Box -->
      <div style="background-color: ${statusBadge.bg}; border: 1px solid ${statusBadge.border}; border-radius: 12px; padding: 16px 20px; margin-bottom: 22px; text-align: center;">
        <span style="display: inline-block; background-color: ${statusBadge.tagBg}; color: #ffffff; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 20px; letter-spacing: 0.05em; margin-bottom: 6px;">
          STATUS UPDATE
        </span>
        <div style="color: ${statusBadge.color}; font-size: 17px; font-weight: 800;">
          ${statusBadge.title}
        </div>
        <div style="color: ${statusBadge.color}; font-size: 12px; margin-top: 4px; font-weight: 600;">
          ${statusBadge.nepaliTitle}
        </div>
      </div>

      <!-- Greeting -->
      <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #1e293b;">
        Namaste <strong>${params.name || 'User'}</strong>,
      </p>
      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #334155;">
        Our team has reviewed your inquiry submitted on the Nepal Driving License Checker portal. Below is the official response regarding your reported issue.
      </p>

      ${
          params.adminNotes
              ? `<!-- Admin Reply Highlight Box -->
      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-left: 5px solid #003893; border-radius: 10px; padding: 18px 20px; margin-bottom: 24px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
          <h3 style="margin: 0; font-size: 13px; font-weight: 800; color: #003893; text-transform: uppercase; letter-spacing: 0.04em;">
            🛡️ Official Admin Response:
          </h3>
          <span style="font-size: 11px; color: #64748b; font-weight: 600;">
            ${formattedDate} (NPT)
          </span>
        </div>
        <div style="font-size: 14px; color: #0f172a; line-height: 1.7; white-space: pre-wrap; word-break: break-word;">
${params.adminNotes}
        </div>
      </div>`
              : ''
      }

      <!-- Inquiry Details Summary Table -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: separate; border-spacing: 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
        <tbody>
          <tr style="background-color: #f8fafc;">
            <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0; width: 35%;">
              Reference ID :
            </td>
            <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; font-family: monospace; color: #003893; border-bottom: 1px solid #e2e8f0;">
              ${params.ticketId}
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #f1f5f9;">
              Inquiry Subject :
            </td>
            <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">
              ${params.subject}
            </td>
          </tr>
          ${
              params.licenseNumber
                  ? `<tr>
            <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #f1f5f9;">
              License Number :
            </td>
            <td style="padding: 12px 16px; font-size: 13px; font-weight: 800; font-family: monospace; color: #003893; border-bottom: 1px solid #f1f5f9;">
              ${params.licenseNumber}
            </td>
          </tr>`
                  : ''
          }
          <tr>
            <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #475569;">
              Your Original Message :
            </td>
            <td style="padding: 12px 16px; font-size: 12px; font-style: italic; color: #64748b; line-height: 1.5;">
              "${params.userMessage.length > 250 ? `${params.userMessage.slice(0, 250)}...` : params.userMessage}"
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Track Online Button -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
        <tr>
          <td align="center">
            <a href="${trackingUrl}" target="_blank" rel="noopener" class="btn" style="display: inline-block; background: #003893; color: #ffffff !important; text-decoration: none; padding: 14px 34px; border-radius: 12px; font-size: 14px; font-weight: 800; letter-spacing: 0.02em; box-shadow: 0 4px 14px rgba(0, 56, 147, 0.3); text-align: center;">
              Track Inquiry Status Online →
            </a>
          </td>
        </tr>
      </table>

      <!-- Helpful Notice -->
      <div style="background-color: #f1f5f9; border-radius: 10px; padding: 12px 16px; font-size: 12px; color: #475569; line-height: 1.6; text-align: center;">
        💡 <strong>Quick Note:</strong> You can enter your email anytime on our <a href="${siteUrl}/feedback" style="color: #003893; font-weight: 700; text-decoration: underline;">Contact &amp; Support page</a> to view real-time status and replies of all your inquiries.
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.6;">
      <div><strong>Nepal Driving License Checker</strong></div>
      <div>Real-time Smart License Print Verification Platform (DoTM Nepal)</div>
      <div style="margin-top: 6px;">
        Portal: <a href="${siteUrl}" style="color: #003893; text-decoration: none;">${siteUrl.replace(/^https?:\/\//, '')}</a>
      </div>
    </div>

  </div>
</body>
</html>`

    const text = `🇳🇵 Nepal License Checker Support Update\n\n` +
        `Namaste ${params.name || 'User'},\n\n` +
        `Our team has responded to your inquiry:\n` +
        `Subject: ${params.subject}\n` +
        `Status : ${statusBadge.title}\n` +
        (params.licenseNumber ? `License: ${params.licenseNumber}\n` : '') +
        `Updated: ${formattedDate} (NPT)\n\n` +
        (params.adminNotes ? `Admin Response:\n${params.adminNotes}\n\n` : '') +
        `You can track the live status of your message anytime online:\n` +
        `${trackingUrl}\n\n` +
        `---\n` +
        `Nepal License Checker Support\n` +
        `${siteUrl}`

    const res = await sendEmail({
        to: params.to,
        subject: emailSubject,
        html,
        text,
    })

    // Record email in email_logs table for administrative history
    await logSentEmail({
        recipient: params.to,
        recipientName: params.name,
        subject: emailSubject,
        templateType: 'feedback_status',
        referenceId: params.ticketId,
        status: res.success ? 'sent' : 'failed',
        provider: res.provider,
        messageId: res.messageId || res.id,
        errorMessage: res.error,
        snippet: params.adminNotes || `Status updated to ${params.status}`,
        metadata: {
            status: params.status,
            adminNotes: params.adminNotes,
            licenseNumber: params.licenseNumber,
        },
        createdAt: params.updatedAt || Date.now(),
    })

    return res
}

/**
 * Send an immediate auto-acknowledgment email when a user submits a contact/problem report.
 */
export async function sendFeedbackConfirmationEmail(params: {
    to: string
    name: string
    ticketId: string
    subject: string
    category: string
    licenseNumber?: string | null
    userMessage: string
}): Promise<MailDeliveryResult> {
    const siteUrl = getSiteUrl()
    const trackingUrl = `${siteUrl}/feedback?email=${encodeURIComponent(params.to)}&id=${encodeURIComponent(params.ticketId)}`
    const emailSubject = `Inquiry Received [${params.subject || 'Support'}] - Nepal License Checker`

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9; color: #1e293b; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    td { vertical-align: top; }
  </style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
    
    <div style="background: linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%); border-top: 5px solid #003893; border-bottom: 1px solid #e2e8f0; padding: 30px 24px 24px; text-align: center;">
      <div style="display: inline-block; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 20px; padding: 5px 14px; font-size: 11px; font-weight: 800; color: #0369a1; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 12px;">
        🇳🇵 Inquiry Received · सन्देश प्राप्त भयो
      </div>
      <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 800; line-height: 1.3; color: #003893;">
        We Received Your Message
      </h1>
      <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
        तपाईंको समस्या वा सोधपुछ दर्ता गरिएको छ। हाम्रो टोलीले यसको समीक्षा गर्नेछ।
      </p>
    </div>

    <div style="padding: 24px 24px;">
      <p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.6; color: #1e293b;">
        Namaste <strong>${params.name || 'User'}</strong>,
      </p>
      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #334155;">
        Thank you for contacting Nepal License Checker. Your inquiry has been successfully registered under tracking reference:
      </p>

      <div style="background-color: #f0f7ff; border: 1px dashed #93c5fd; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 22px;">
        <span style="font-size: 11px; font-weight: 700; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.05em;">Your Tracking Reference ID:</span>
        <div style="font-family: monospace; font-size: 18px; font-weight: 800; color: #003893; margin-top: 4px;">
          ${params.ticketId}
        </div>
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: separate; border-spacing: 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
        <tbody>
          <tr>
            <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #f1f5f9; width: 35%;">Subject :</td>
            <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${params.subject}</td>
          </tr>
          ${
              params.licenseNumber
                  ? `<tr>
            <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #f1f5f9;">License Number :</td>
            <td style="padding: 12px 16px; font-size: 13px; font-weight: 800; font-family: monospace; color: #003893; border-bottom: 1px solid #f1f5f9;">${params.licenseNumber}</td>
          </tr>`
                  : ''
          }
          <tr>
            <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #475569;">Initial Status :</td>
            <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #d97706;">Pending Review (नयाँ दर्ता)</td>
          </tr>
        </tbody>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
        <tr>
          <td align="center">
            <a href="${trackingUrl}" target="_blank" rel="noopener" style="display: inline-block; background: #003893; color: #ffffff !important; text-decoration: none; padding: 13px 30px; border-radius: 12px; font-size: 14px; font-weight: 800;">
              Track Status with Your Email →
            </a>
          </td>
        </tr>
      </table>

      <div style="background-color: #f8fafc; border-radius: 10px; padding: 12px 16px; font-size: 12px; color: #64748b; line-height: 1.6; text-align: center;">
        You will receive another email as soon as an admin reviews or responds to your inquiry.
      </div>
    </div>

    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b;">
      Nepal Driving License Checker · <a href="${siteUrl}" style="color: #003893;">${siteUrl.replace(/^https?:\/\//, '')}</a>
    </div>

  </div>
</body>
</html>`

    const text = `Inquiry Received: ${params.subject}\n` +
        `Tracking ID: ${params.ticketId}\n` +
        `Hi ${params.name || 'User'}, we received your inquiry and our team will review it shortly.\n` +
        `Track status: ${trackingUrl}\n`

    const res = await sendEmail({
        to: params.to,
        subject: emailSubject,
        html,
        text,
    })

    // Record email in email_logs table for administrative history
    await logSentEmail({
        recipient: params.to,
        recipientName: params.name,
        subject: emailSubject,
        templateType: 'feedback_confirmation',
        referenceId: params.ticketId,
        status: res.success ? 'sent' : 'failed',
        provider: res.provider,
        messageId: res.messageId || res.id,
        errorMessage: res.error,
        snippet: params.userMessage ? params.userMessage.slice(0, 150) : null,
        metadata: {
            subject: params.subject,
            licenseNumber: params.licenseNumber,
            category: params.category,
        },
        createdAt: Date.now(),
    })

    return res
}

/**
 * Manually send / resend tracking reference number and status link to the user's email.
 */
export async function sendFeedbackTrackingEmail(params: {
    to: string
    name: string
    ticketId: string
    subject: string
    category?: string
    status?: 'new' | 'in_progress' | 'resolved'
    licenseNumber?: string | null
    userMessage?: string
    adminNotes?: string | null
}): Promise<MailDeliveryResult> {
    const siteUrl = getSiteUrl()
    const trackingUrl = `${siteUrl}/feedback?email=${encodeURIComponent(params.to)}&id=${encodeURIComponent(params.ticketId)}`
    const emailSubject = `Your Tracking Reference No. [${params.ticketId}] - Nepal License Checker`

    const statusTitle =
        params.status === 'resolved'
            ? 'Resolved (समाधान भयो)'
            : params.status === 'in_progress'
            ? 'In Progress (प्रक्रियामा)'
            : 'Pending Review (नयाँ दर्ता)'

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9; color: #1e293b; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    td { vertical-align: top; }
  </style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
    
    <div style="background: linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%); border-top: 5px solid #003893; border-bottom: 1px solid #e2e8f0; padding: 30px 24px 24px; text-align: center;">
      <div style="display: inline-block; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 20px; padding: 5px 14px; font-size: 11px; font-weight: 800; color: #0369a1; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 12px;">
        🇳🇵 Tracking Information · ट्र्याकिङ विवरण
      </div>
      <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 800; line-height: 1.3; color: #003893;">
        Your Inquiry Tracking Reference
      </h1>
      <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
        तपाईंको सोधपुछ ट्र्याक गर्ने आधिकारिक सन्दर्भ नम्बर र पोर्टल लिङ्क।
      </p>
    </div>

    <div style="padding: 24px 24px;">
      <p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.6; color: #1e293b;">
        Namaste <strong>${params.name || 'User'}</strong>,
      </p>
      <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.6; color: #334155;">
        Here is your official tracking reference number for your inquiry regarding <strong>${params.subject}</strong>:
      </p>

      <div style="background-color: #f0f7ff; border: 2px dashed #93c5fd; border-radius: 14px; padding: 18px; text-align: center; margin-bottom: 22px;">
        <span style="font-size: 11px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.05em;">Tracking Reference Number:</span>
        <div style="font-family: monospace; font-size: 20px; font-weight: 900; color: #003893; letter-spacing: 0.03em; margin: 6px 0;">
          ${params.ticketId}
        </div>
        <div style="display: inline-block; background: #e0e7ff; color: #3730a3; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 9999px;">
          Current Status: ${statusTitle}
        </div>
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: separate; border-spacing: 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
        <tbody>
          <tr>
            <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #f1f5f9; width: 35%;">Subject :</td>
            <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${params.subject}</td>
          </tr>
          ${
              params.licenseNumber
                  ? `<tr>
            <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #f1f5f9;">License Number :</td>
            <td style="padding: 12px 16px; font-size: 13px; font-weight: 800; font-family: monospace; color: #003893; border-bottom: 1px solid #f1f5f9;">${params.licenseNumber}</td>
          </tr>`
                  : ''
          }
          ${
              params.adminNotes
                  ? `<tr>
            <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #f1f5f9;">Admin Response :</td>
            <td style="padding: 12px 16px; font-size: 12px; font-weight: 600; color: #003893; border-bottom: 1px solid #f1f5f9; line-height: 1.5;">${params.adminNotes}</td>
          </tr>`
                  : ''
          }
          ${
              params.userMessage
                  ? `<tr>
            <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #475569;">Original Inquiry :</td>
            <td style="padding: 12px 16px; font-size: 12px; font-style: italic; color: #64748b; line-height: 1.5;">"${params.userMessage.length > 200 ? `${params.userMessage.slice(0, 200)}...` : params.userMessage}"</td>
          </tr>`
                  : ''
          }
        </tbody>
      </table>

      <!-- Track Online Button -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 22px;">
        <tr>
          <td align="center">
            <a href="${trackingUrl}" target="_blank" rel="noopener" style="display: inline-block; background: #003893; color: #ffffff !important; text-decoration: none; padding: 14px 34px; border-radius: 12px; font-size: 14px; font-weight: 800; box-shadow: 0 4px 14px rgba(0, 56, 147, 0.3);">
              Track Inquiry Status Online →
            </a>
          </td>
        </tr>
      </table>

      <!-- Helpful Notice -->
      <div style="background-color: #f1f5f9; border-radius: 10px; padding: 12px 16px; font-size: 12px; color: #475569; line-height: 1.6; text-align: center;">
        💡 <strong>Tip:</strong> You can enter your email (<strong>${params.to}</strong>) or this reference ID anytime on our <a href="${siteUrl}/feedback" style="color: #003893; font-weight: 700; text-decoration: underline;">Contact &amp; Support page</a> to check status and replies.
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b;">
      Nepal Driving License Checker · <a href="${siteUrl}" style="color: #003893; text-decoration: none;">${siteUrl.replace(/^https?:\/\//, '')}</a>
    </div>

  </div>
</body>
</html>`

    const text = `Your Tracking Reference No: ${params.ticketId}\n\n` +
        `Namaste ${params.name || 'User'},\n` +
        `Here is your tracking reference for your inquiry regarding "${params.subject}".\n\n` +
        `Tracking ID: ${params.ticketId}\n` +
        `Current Status: ${statusTitle}\n` +
        (params.licenseNumber ? `License Number: ${params.licenseNumber}\n` : '') +
        (params.adminNotes ? `Admin Note: ${params.adminNotes}\n` : '') +
        `\nTrack live status online:\n${trackingUrl}\n\n` +
        `Nepal License Checker Support`

    const res = await sendEmail({
        to: params.to,
        subject: emailSubject,
        html,
        text,
    })

    // Record email in email_logs table for administrative history
    await logSentEmail({
        recipient: params.to,
        recipientName: params.name,
        subject: emailSubject,
        templateType: 'feedback_tracking',
        referenceId: params.ticketId,
        status: res.success ? 'sent' : 'failed',
        provider: res.provider,
        messageId: res.messageId || res.id,
        errorMessage: res.error,
        snippet: `Manual tracking reference email sent for #${params.ticketId}`,
        metadata: {
            status: params.status,
            licenseNumber: params.licenseNumber,
            adminNotes: params.adminNotes,
        },
        createdAt: Date.now(),
    })

    return res
}

/**
 * Send an immediate confirmation email when a user subscribes for license print notifications.
 * Includes license details, explanation of automated monitoring, and a prominent 1-click unsubscribe button.
 */
export async function sendSubscriptionConfirmationEmail(params: {
    to: string
    licenseNumber: string
    unsubscribeToken: string
    isResend?: boolean
}): Promise<MailDeliveryResult> {
    const siteUrl = getSiteUrl()
    const checkUrl = `${siteUrl}/?number=${encodeURIComponent(params.licenseNumber)}`
    const unsubscribeUrl = `${siteUrl}/unsubscribe?token=${encodeURIComponent(params.unsubscribeToken)}`

    const emailSubject = params.isResend
        ? `[Alert Details] License Notification Subscription for ${params.licenseNumber} - Nepal License Checker`
        : `🇳🇵 Notification Confirmed: Driving License ${params.licenseNumber} - Nepal License Checker`

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9; color: #1e293b; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    td { vertical-align: top; }
    .btn-primary:hover { background: #002566 !important; }
    .btn-unsubscribe:hover { background: #fef2f2 !important; border-color: #ef4444 !important; color: #dc2626 !important; }
  </style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
    
    <!-- Top Header -->
    <div style="background: linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%); border-top: 5px solid #003893; border-bottom: 1px solid #e2e8f0; padding: 32px 24px 26px; text-align: center;">
      <div style="display: inline-block; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 20px; padding: 5px 16px; font-size: 11px; font-weight: 800; color: #0369a1; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 12px;">
        🇳🇵 Nepal License Verification · आधिकारिक सूचना
      </div>
      <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; line-height: 1.3; color: #003893;">
        ${params.isResend ? 'Your License Alert Subscription Details' : 'License Notification Alert Activated'}
      </h1>
      <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5; font-weight: 500;">
        तपाईंको लाइसेन्स विभागको सूचीमा छापिएर आउनासाथ तुरुन्त इमेलमा सूचना पठाइनेछ।
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 26px 24px;">
      
      <!-- Status Box -->
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px 20px; margin-bottom: 22px; text-align: center;">
        <span style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 20px; letter-spacing: 0.05em; margin-bottom: 6px;">
          MONITORING ACTIVE
        </span>
        <div style="color: #1e3a8a; font-size: 17px; font-weight: 800;">
          ⏳ WAITING FOR DOTM PRINT RECORD
        </div>
        <div style="color: #1e40af; font-size: 12px; margin-top: 4px; font-weight: 500;">
          लाइसेन्स हाल छपाइ प्रक्रियामा छ, प्रणालीले नियमित रूपमा जाँच गरिरहनेछ।
        </div>
      </div>

      <!-- Greeting -->
      <p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.6; color: #1e293b;">
        Namaste,
      </p>
      <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.6; color: #334155;">
        ${params.isResend
            ? `You requested the subscription information for driving license <strong>${params.licenseNumber}</strong>.`
            : `You have successfully subscribed to receive automatic email notifications for Nepal Driving License <strong>${params.licenseNumber}</strong>.`
        }
      </p>

      <!-- Subscription Details Table -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: separate; border-spacing: 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 22px;">
        <tbody>
          <tr style="background-color: #f0f7ff;">
            <td style="padding: 13px 18px; width: 38%; font-size: 13px; font-weight: 700; color: #1e3a8a; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">
              License Number :
            </td>
            <td style="padding: 13px 18px; width: 62%; font-size: 15px; font-weight: 800; color: #003893; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; border-bottom: 1px solid #e2e8f0;">
              <span style="background-color: #dbeafe; padding: 4px 10px; border-radius: 6px; border: 1px solid #bfdbfe; display: inline-block;">
                ${params.licenseNumber}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 18px; font-size: 13px; font-weight: 700; color: #475569; border-bottom: 1px solid #f1f5f9; white-space: nowrap;">
              Notification Email :
            </td>
            <td style="padding: 12px 18px; font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9;">
              ${params.to}
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 18px; font-size: 13px; font-weight: 700; color: #475569; border-bottom: 1px solid #f1f5f9; white-space: nowrap;">
              Current Status :
            </td>
            <td style="padding: 12px 18px; font-size: 13px; font-weight: 700; color: #d97706; border-bottom: 1px solid #f1f5f9;">
              Not Yet Printed (छपाइ हुन बाँकी)
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 18px; font-size: 13px; font-weight: 700; color: #475569; white-space: nowrap;">
              Data Source :
            </td>
            <td style="padding: 12px 18px; font-size: 13px; font-weight: 600; color: #166534;">
              Department of Transport Management (DoTM Nepal)
            </td>
          </tr>
        </tbody>
      </table>

      <!-- What to Expect Next Info Box -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 5px solid #003893; padding: 16px 18px; border-radius: 10px; margin-bottom: 22px;">
        <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 800; color: #003893;">
          💡 तपाईंले केही गर्नुपर्दैन (What Happens Next):
        </h4>
        <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.6;">
          You do not need to check the website manually every day. As soon as the Department of Transport Management (DoTM) prints your smart license card and updates the official records, our automated system will send you an immediate collection notification with your holder name, issuing office, and mandatory collection documents checklist.
        </p>
      </div>

      <!-- Action Button: Check Status Online -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
        <tr>
          <td align="center">
            <a href="${checkUrl}" target="_blank" rel="noopener" class="btn-primary" style="display: inline-block; background: #003893; color: #ffffff !important; text-decoration: none; padding: 14px 34px; border-radius: 12px; font-size: 14px; font-weight: 800; letter-spacing: 0.02em; box-shadow: 0 4px 14px rgba(0, 56, 147, 0.3); text-align: center;">
              Check Current Status Online →
            </a>
          </td>
        </tr>
      </table>

      <!-- Prominent One-Click Unsubscribe Box -->
      <div style="background-color: #fffaf0; border: 1px solid #fed7aa; border-radius: 12px; padding: 18px 20px; text-align: center; margin-bottom: 20px;">
        <div style="font-size: 11px; font-weight: 800; color: #9a3412; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
          Wrong Number or No Longer Need This Alert?
        </div>
        <p style="margin: 0 0 14px 0; font-size: 13px; color: #7c2d12; line-height: 1.5;">
          यदि तपाईंले गल्तीले यो इमेल दर्ता गर्नुभएको हो वा अब सूचना चाहिँदैन भने, तलको बटनबाट १-क्लिकमा रद्द गर्न सक्नुहुन्छ:
        </p>
        <a href="${unsubscribeUrl}" target="_blank" rel="noopener" class="btn-unsubscribe" style="display: inline-block; background: #ffffff; color: #b91c1c !important; text-decoration: none; padding: 11px 26px; border-radius: 10px; font-size: 13px; font-weight: 800; border: 1px solid #fca5a5; box-shadow: 0 2px 6px rgba(185, 28, 28, 0.08);">
          ✕ Unsubscribe / Cancel Notification Alert
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 24px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.6;">
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #475569;">
        Subscription active for license: <strong style="color: #0f172a; font-family: ui-monospace, monospace;">${params.licenseNumber}</strong>
      </p>
      <p style="margin: 0 0 12px 0;">
        <a href="${unsubscribeUrl}" style="color: #dc2626; text-decoration: underline; font-weight: 600;">1-Click Unsubscribe from this alert</a> · <a href="${siteUrl}" style="color: #003893; text-decoration: underline; font-weight: 600;">Visit Nepal License Checker</a>
      </p>
      <div style="font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; line-height: 1.5;">
        ⚠️ <strong>Notice:</strong> Nepal License Checker (license-checker.acharyanischal.com.np) is an independent public utility portal indexing publicly published records from dotm.gov.np. This notification is purely informational and holds no legal authority.
      </div>
    </div>

  </div>
</body>
</html>`

    const text = `🇳🇵 Nepal Smart Driving License - Notification Alert Confirmed\n\n` +
        `Namaste,\n\n` +
        `You have successfully subscribed to receive automatic email notifications for license number ${params.licenseNumber}.\n\n` +
        `Current Status : NOT YET PRINTED (Monitoring DoTM Records)\n` +
        `License Number : ${params.licenseNumber}\n` +
        `Recipient      : ${params.to}\n\n` +
        `What happens next:\n` +
        `You do not need to check the website manually every day. As soon as the Department of Transport Management (DoTM) prints your card and updates the official records, our automated system will immediately send you an email alert.\n\n` +
        `Check current status online: ${checkUrl}\n\n` +
        `To CANCEL or UNSUBSCRIBE from this alert at any time (1-click):\n` +
        `${unsubscribeUrl}\n\n` +
        `---\n` +
        `Nepal License Checker (license-checker.acharyanischal.com.np)`

    const res = await sendEmail({
        to: params.to,
        subject: emailSubject,
        html,
        text,
    })

    // Record email in email_logs table for administrative history
    await logSentEmail({
        recipient: params.to,
        subject: emailSubject,
        templateType: 'license_subscription',
        referenceId: params.licenseNumber,
        status: res.success ? 'sent' : 'failed',
        provider: res.provider,
        messageId: res.messageId || res.id,
        errorMessage: res.error,
        snippet: `Subscription confirmation email sent for license #${params.licenseNumber}`,
        metadata: {
            licenseNumber: params.licenseNumber,
            unsubscribeToken: params.unsubscribeToken,
            isResend: Boolean(params.isResend),
        },
        createdAt: Date.now(),
    })

    return res
}

/**
 * Sends a 6-digit one-time password (OTP) email for passwordless user login.
 */
export async function sendOtpEmail(params: {
    to: string
    otp: string
    expiryMinutes?: number
}): Promise<MailDeliveryResult> {
    const siteUrl = getSiteUrl()
    const expiryMinutes = params.expiryMinutes || 10
    const emailSubject = `🔐 Your Nepal License Checker Login Code: ${params.otp}`

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 540px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #003893 0%, #002666 100%); padding: 28px 24px; text-align: center;">
      <div style="display: inline-block; background-color: #ffffff; border-radius: 12px; padding: 6px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <img src="${siteUrl}/License-Checker-Nepal-logo.png" alt="Nepal License Checker" width="48" height="48" style="display: block; border-radius: 8px;">
      </div>
      <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: -0.01em;">
        Nepal License Checker 🇳🇵
      </h1>
      <p style="margin: 6px 0 0; color: #cbd5e1; font-size: 13px; font-weight: 500;">
        सुरक्षित लगइन प्रमाणीकरण कोड • Secure Login Verification
      </p>
    </div>

    <!-- Body -->
    <div style="padding: 30px 24px; text-align: center;">
      <h2 style="margin: 0 0 10px; font-size: 17px; font-weight: 700; color: #0f172a;">
        Your 6-Digit Verification Code
      </h2>
      <p style="margin: 0 0 24px; font-size: 14px; color: #475569; line-height: 1.5;">
        Use this single-use code to sign in to your Nepal License Checker user dashboard. It will expire in <strong>${expiryMinutes} minutes</strong>.
      </p>

      <!-- OTP Display Box -->
      <div style="background-color: #f8fafc; border: 2px dashed #003893; border-radius: 14px; padding: 18px 24px; margin: 0 auto 26px; display: inline-block; min-width: 260px;">
        <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 36px; font-weight: 800; letter-spacing: 0.25em; color: #003893; margin-left: 0.25em; display: block;">
          ${params.otp}
        </span>
      </div>

      <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 10px; padding: 12px 16px; margin-bottom: 24px; text-align: left;">
        <p style="margin: 0; font-size: 12px; color: #991b1b; line-height: 1.5;">
          ⚠️ <strong>सुरक्षा सुझाव (Security Warning):</strong> Never share this code with anyone. Nepal License Checker team will never ask for your code.
        </p>
      </div>

      <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
        If you did not request this login code, you can safely ignore this email. No changes have been made to your account.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 18px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
      <p style="margin: 0 0 6px;">
        Nepal License Checker • Department of Transport Management (DoTM) Public Mirror
      </p>
      <p style="margin: 0;">
        <a href="${siteUrl}" style="color: #003893; text-decoration: none; font-weight: 600;">Visit Website</a>
      </p>
    </div>

  </div>
</body>
</html>`

    const text = `Nepal License Checker - Login Verification Code\n\n` +
        `Your 6-digit login verification code is: ${params.otp}\n\n` +
        `This code will expire in ${expiryMinutes} minutes.\n` +
        `If you did not request this code, please ignore this email.\n\n` +
        `---\n` +
        `Nepal License Checker (${siteUrl})`

    const res = await sendEmail({
        to: params.to,
        subject: emailSubject,
        html,
        text,
    })

    // Log the OTP email
    await logSentEmail({
        recipient: params.to,
        subject: emailSubject,
        templateType: 'user_otp',
        referenceId: params.to,
        status: res.success ? 'sent' : 'failed',
        provider: res.provider,
        messageId: res.messageId || res.id,
        errorMessage: res.error,
        snippet: `Login OTP sent to ${params.to}`,
        metadata: {
            expiryMinutes,
        },
        createdAt: Date.now(),
    }).catch(() => {})

    return res
}
