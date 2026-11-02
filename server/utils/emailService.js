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

/**
 * Send official performance warning email to a supplier regarding low ratings or delivery delays
 */
export async function sendSupplierWarningEmail(
  toEmail,
  {
    supplierName = 'Vendor',
    warningNumber = 1,
    maxWarnings = 3,
    reason = 'Low Customer Rating & Performance SLA Breach',
    details = '',
    averageRating = 0,
    onTimeDeliveryPercent = 100,
  } = {},
) {
  const mailTransporter = getTransporter()
  const fromAddress = process.env.SMTP_FROM || '"Sellvro Merchant Compliance" <compliance@sellvro.com>'

  const subject = `⚠️ Official Performance Warning #${warningNumber} of ${maxWarnings} - Sellvro Vendor Compliance`
  const textContent = `Hello ${supplierName},\n\nThis is official performance warning #${warningNumber} of ${maxWarnings} regarding your supplier account on Sellvro.\n\nReason: ${reason}\n${details ? `Details: ${details}\n` : ''}Current Rating: ${averageRating} / 5.0\nOn-Time Delivery Rate: ${onTimeDeliveryPercent}%\n\nPlease note: Receiving more than ${maxWarnings} warnings will result in immediate suspension of your supplier account and deactivation of your listings.\n\nPlease take immediate steps to improve order fulfillment speed and product quality.\n\nSellvro Compliance Team`

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #fde68a; overflow: hidden; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.08); }
          .header { background: linear-gradient(135deg, #78350f, #b45309); padding: 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
          .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-top: 8px; }
          .content { padding: 32px 24px; }
          .greeting { font-size: 16px; font-weight: 700; margin-bottom: 12px; color: #0f172a; }
          .alert-box { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 12px; padding: 16px; margin: 20px 0; }
          .alert-title { font-weight: 700; font-size: 14px; color: #92400e; margin-bottom: 6px; }
          .alert-desc { font-size: 13px; color: #78350f; line-height: 1.5; margin: 0; }
          .metrics { display: flex; gap: 12px; margin: 20px 0; background: #f8fafc; border-radius: 12px; padding: 14px; border: 1px solid #e2e8f0; }
          .metric-item { flex: 1; text-align: center; }
          .metric-label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }
          .metric-val { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 2px; }
          .warning-tracker { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px; margin-top: 20px; font-size: 12px; color: #991b1b; line-height: 1.5; }
          .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sellvro Compliance</h1>
            <div class="badge">Official Warning #${warningNumber} of ${maxWarnings}</div>
          </div>
          <div class="content">
            <div class="greeting">Dear ${supplierName},</div>
            <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0;">
              Our quality assurance team has monitored your recent customer reviews, order delivery speed, and fulfillment punctuality. We noticed an unsatisfactory trend that violates Sellvro Marketplace Quality Standards.
            </p>

            <div class="alert-box">
              <div class="alert-title">⚠️ Reason for Warning:</div>
              <p class="alert-desc">${reason}</p>
              ${details ? `<p style="font-size: 12px; color: #78350f; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #fcd34d;"><strong>Admin Note:</strong> ${details}</p>` : ''}
            </div>

            <div class="metrics">
              <div class="metric-item">
                <div class="metric-label">Product Rating</div>
                <div class="metric-val" style="color: ${averageRating < 3 ? '#dc2626' : '#d97706'}">${Number(averageRating || 0).toFixed(1)} ★</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">On-Time Delivery</div>
                <div class="metric-val" style="color: ${onTimeDeliveryPercent < 70 ? '#dc2626' : '#16a34a'}">${onTimeDeliveryPercent}%</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Warning Status</div>
                <div class="metric-val" style="color: #dc2626">${warningNumber} / ${maxWarnings}</div>
              </div>
            </div>

            <div class="warning-tracker">
              <strong>Crucial Policy Notice:</strong> You have received <strong>${warningNumber}</strong> of <strong>${maxWarnings}</strong> allowable warnings. Reaching more than 3 warnings will result in <strong>immediate suspension of your supplier account</strong> and all your product listings will be removed from the marketplace.
            </div>

            <p style="font-size: 13px; color: #475569; line-height: 1.6; margin-top: 20px;">
              <strong>Required Next Steps:</strong><br>
              1. Ensure packages are handed over to couriers strictly within your handling time.<br>
              2. Inspect your products before packing to prevent customer returns.<br>
              3. Check the reviews section in your portal to see specific customer feedback.
            </p>
          </div>
          <div class="footer">
            Sellvro Marketplace Trust &amp; Safety Division &bull; &copy; ${new Date().getFullYear()} Sellvro Inc.
          </div>
        </div>
      </body>
    </html>
  `

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`⚠️ [Sellvro Mailer] Official Supplier Performance Warning #${warningNumber}`)
  console.log(`Recipient: ${toEmail} (${supplierName})`)
  console.log(`Reason:    ${reason}`)
  console.log(`Warnings:  ${warningNumber} / ${maxWarnings}`)
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
      console.log(`✅ [Sellvro Mailer] Warning email dispatched to ${toEmail}`)
    } catch (err) {
      console.error(`⚠️ [Sellvro Mailer] Failed to dispatch warning email via SMTP:`, err.message)
    }
  }

  return { success: true }
}

/**
 * Send official account suspension email to a supplier after exceeding warnings or bad ratings
 */
export async function sendSupplierSuspensionEmail(
  toEmail,
  {
    supplierName = 'Vendor',
    reason = 'Exceeded maximum allowable performance warnings (3 warnings).',
    totalWarnings = 3,
    averageRating = 0,
    onTimeDeliveryPercent = 100,
  } = {},
) {
  const mailTransporter = getTransporter()
  const fromAddress = process.env.SMTP_FROM || '"Sellvro Merchant Enforcement" <enforcement@sellvro.com>'

  const subject = `🚫 Urgent Notice: Your Sellvro Supplier Account Has Been Suspended`
  const textContent = `Hello ${supplierName},\n\nWe regret to inform you that your supplier account has been suspended due to persistent low customer ratings, delivery delays, and exceeding the maximum allowable threshold of 3 warnings.\n\nReason: ${reason}\nTotal Warnings Issued: ${totalWarnings}\nFinal Average Rating: ${averageRating} / 5.0\nOn-Time Delivery Rate: ${onTimeDeliveryPercent}%\n\nConsequences of Suspension:\n- All your active product listings have been deactivated.\n- You cannot accept or fulfill new orders.\n- Your store is no longer visible to buyers on Sellvro.\n\nIf you wish to appeal this decision, please reach out to compliance@sellvro.com.\n\nSellvro Trust & Safety Team`

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #fca5a5; overflow: hidden; box-shadow: 0 4px 16px rgba(239, 68, 68, 0.12); }
          .header { background: linear-gradient(135deg, #7f1d1d, #b91c1c); padding: 26px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
          .badge { display: inline-block; background: #fee2e2; color: #991b1b; padding: 4px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-top: 8px; }
          .content { padding: 32px 24px; }
          .greeting { font-size: 16px; font-weight: 700; margin-bottom: 12px; color: #0f172a; }
          .alert-box { background: #fef2f2; border: 1px solid #f87171; border-radius: 12px; padding: 18px; margin: 20px 0; }
          .alert-title { font-weight: 800; font-size: 14px; color: #991b1b; margin-bottom: 6px; }
          .alert-desc { font-size: 13px; color: #7f1d1d; line-height: 1.5; margin: 0; }
          .impact-list { background: #f8fafc; border-radius: 12px; padding: 16px 20px; margin: 20px 0; border: 1px solid #e2e8f0; font-size: 13px; color: #475569; }
          .impact-list li { margin-bottom: 6px; }
          .appeal-box { background: #f1f5f9; border-radius: 10px; padding: 14px; font-size: 12px; color: #475569; line-height: 1.5; }
          .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Account Suspended</h1>
            <div class="badge">Vendor Enforcement Action</div>
          </div>
          <div class="content">
            <div class="greeting">Dear ${supplierName},</div>
            <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0;">
              This email serves as official notification that your Sellvro Supplier Account has been <strong>suspended</strong>. You have exceeded the maximum threshold of <strong>3 performance warnings</strong> due to repeated low product ratings, delivery delays, and customer dissatisfaction.
            </p>

            <div class="alert-box">
              <div class="alert-title">🚫 Reason for Suspension:</div>
              <p class="alert-desc">${reason}</p>
              <p style="font-size: 12px; color: #991b1b; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #fca5a5;">
                <strong>Performance Summary:</strong> Total Warnings: ${totalWarnings} &bull; Rating: ${Number(averageRating || 0).toFixed(1)} ★ &bull; On-Time Delivery: ${onTimeDeliveryPercent}%
              </p>
            </div>

            <div class="impact-list">
              <strong style="color: #0f172a;">Effects of Account Suspension:</strong>
              <ul style="margin: 8px 0 0; padding-left: 18px;">
                <li>All active product listings have been immediately removed from the buyer marketplace.</li>
                <li>Your supplier catalog and storefront have been locked from receiving new orders.</li>
                <li>Payouts will be subject to a review period to settle any pending buyer disputes or claims.</li>
              </ul>
            </div>

            <div class="appeal-box">
              <strong>Submitting an Appeal:</strong><br>
              If you believe this suspension is in error or you have a concrete remediation plan, please contact our Merchant Trust Team at <strong>compliance@sellvro.com</strong> with your Supplier ID and corrective action plan.
            </div>
          </div>
          <div class="footer">
            Sellvro Marketplace Trust &amp; Safety Division &bull; &copy; ${new Date().getFullYear()} Sellvro Inc.
          </div>
        </div>
      </body>
    </html>
  `

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`🚫 [Sellvro Mailer] Supplier Account Suspended`)
  console.log(`Recipient: ${toEmail} (${supplierName})`)
  console.log(`Reason:    ${reason}`)
  console.log(`Warnings:  ${totalWarnings}`)
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
      console.log(`✅ [Sellvro Mailer] Suspension email dispatched to ${toEmail}`)
    } catch (err) {
      console.error(`⚠️ [Sellvro Mailer] Failed to dispatch suspension email via SMTP:`, err.message)
    }
  }

  return { success: true }
}

