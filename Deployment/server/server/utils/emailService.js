import nodemailer from 'nodemailer'

let transporter = null

function getTransporter() {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT, 10) || 587
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    })
  } else {
    // Development fallback
    transporter = null
  }

  return transporter
}

export async function sendPasswordResetEmail(toEmail, code, fullName = 'User') {
  const mailTransporter = getTransporter()
  const fromAddress = process.env.SMTP_FROM || '"Sellvro Security" <no-reply@sellvro.com>'

  const subject = `Your Sellvro Account Recovery Code: ${code}`
  const textContent = `Hello ${fullName},\n\nYour 6-digit verification code to recover your Sellvro account is: ${code}\n\nThis code will expire in 15 minutes. If you did not request this, please ignore this email.`

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { background: #0f172a; padding: 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
          .content { padding: 32px 24px; }
          .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
          .description { font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 24px; }
          .code-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px; }
          .code { font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0284c7; }
          .notice { font-size: 12px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px; }
          .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sellvro Security</h1>
          </div>
          <div class="content">
            <div class="greeting">Hello ${fullName},</div>
            <div class="description">
              We received a request to recover or reset the password for your Sellvro account. Use the 6-digit verification code below to complete the process.
            </div>
            <div class="code-box">
              <div class="code">${code}</div>
            </div>
            <div class="notice">
              This code will expire in <strong>15 minutes</strong>.<br>
              If you didn't request a password reset, please ensure your account remains safe and ignore this message.
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Sellvro Inc. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📧 [Sellvro Mailer] Password Recovery Verification Code`)
  console.log(`Recipient: ${toEmail} (${fullName})`)
  console.log(`CODE:      ${code}`)
  console.log(`Expires:   15 minutes`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (mailTransporter) {
    try {
      await mailTransporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      })
      console.log(`✅ [Sellvro Mailer] Email dispatched successfully to ${toEmail}`)
    } catch (err) {
      console.error(`⚠️ [Sellvro Mailer] Failed to dispatch email via SMTP:`, err.message)
      // We do not throw error so local testing still proceeds via console code
    }
  }

  return { success: true, code }
}
