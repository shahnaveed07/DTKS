import { logAdminActivity } from './auditService.js';

/**
 * Configurable Transactional Email Notification Service (Resend HTTP API)
 *
 * Standardized Secret Name:
 *   - `RESEND_API_KEY` (also accepts legacy alias `EMAIL_PROVIDER_API_KEY`)
 *   - `EMAIL_FROM_ADDRESS` (default: `notifications@dreamtechkashmirsolutions.studio`)
 *   - `ADMIN_NOTIFICATION_EMAIL` (default: `contact@dreamtechkashmirsolutions.studio`)
 *
 * Non-Blocking Guarantee:
 *   Core order and contact workflows always succeed even if `RESEND_API_KEY` is unconfigured
 *   or the upstream email API returns an error. All dispatch outcomes are recorded in `activity_logs`.
 */

export async function dispatchEmail(
  env,
  { recipientEmail, recipientType, subject, bodyText, eventType, relatedEntityId }
) {
  const apiKey = (env?.RESEND_API_KEY || env?.EMAIL_PROVIDER_API_KEY || '').trim();
  const fromAddress = env?.EMAIL_FROM_ADDRESS || 'notifications@dreamtechkashmirsolutions.studio';

  let status = 'skipped_unconfigured';
  let detailMessage = 'RESEND_API_KEY not configured; skipped live dispatch';

  if (
    apiKey &&
    !apiKey.startsWith('re_replace_') &&
    recipientEmail &&
    !recipientEmail.endsWith('.example') &&
    !recipientEmail.endsWith('@example.com')
  ) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `DreamTech Kashmir Solutions <${fromAddress}>`,
          to: [recipientEmail],
          subject,
          text: bodyText,
        }),
      });

      if (response.ok) {
        status = 'sent';
        detailMessage = `Dispatched email to ${recipientEmail}`;
      } else {
        const errBody = await response.text().catch(() => '');
        status = 'failed';
        detailMessage = `Resend API returned HTTP ${response.status}${errBody ? `: ${errBody.slice(0, 200)}` : ''}`;
      }
    } catch (err) {
      status = 'failed';
      detailMessage = err?.message || 'Network error while contacting Resend API';
    }
  }

  await logAdminActivity(env, {
    adminId: null,
    action: `EMAIL_NOTIFICATION_${eventType}`,
    entityType: recipientType === 'admin' ? 'AdminNotification' : 'CustomerNotification',
    entityId: relatedEntityId || '',
    details: JSON.stringify({
      recipientEmail,
      subject,
      status,
      note: detailMessage,
    }),
  });

  return { status, detailMessage };
}

export async function notifyOrderCreated(env, order) {
  const adminEmail = env?.ADMIN_NOTIFICATION_EMAIL || 'contact@dreamtechkashmirsolutions.studio';
  const orderNumber = order.orderNumber || order.order_number || order.referenceId;

  // 1. Customer confirmation notification
  await dispatchEmail(env, {
    recipientEmail: order.customerEmail || order.customer_email,
    recipientType: 'customer',
    subject: `[DTKS] Website Order Received — Reference ${orderNumber}`,
    bodyText: [
      `Hello ${order.customerName || order.customer_name},`,
      '',
      `Thank you for submitting your website development order with DreamTech Kashmir Solutions (DTKS).`,
      `Order Number: ${orderNumber}`,
      `Website Category: ${order.service || order.service_name || 'Website Development'}`,
      `Selected Package: ${order.packageTitle || 'Custom Website Quote'}`,
      `Current Status: ${order.status}`,
      '',
      `You can track your project status anytime at https://dreamtechkashmirsolutions.studio/track-order using your Order Number (${orderNumber}) and email address.`,
      '',
      `Best regards,`,
      `DreamTech Kashmir Solutions (DTKS)`,
    ].join('\n'),
    eventType: 'ORDER_RECEIVED_CUSTOMER',
    relatedEntityId: order.id,
  });

  // 2. Admin new order notification
  await dispatchEmail(env, {
    recipientEmail: adminEmail,
    recipientType: 'admin',
    subject: `[DTKS Admin] New Website Order ${orderNumber} from ${order.customerName || order.customer_name}`,
    bodyText: [
      `A new website development order has been submitted on DTKS:`,
      `Order Number: ${orderNumber}`,
      `Customer: ${order.customerName || order.customer_name} (${order.customerEmail || order.customer_email} | ${order.customerPhone || order.customer_phone})`,
      `Budget: ${order.budget || order.estimatedBudget}`,
      `Description: ${order.projectDescription || order.project_description}`,
    ].join('\n'),
    eventType: 'ORDER_RECEIVED_ADMIN',
    relatedEntityId: order.id,
  });
}

export async function notifyOrderStatusUpdated(env, order, previousStatus) {
  const customerEmail = order?.customerEmail || order?.customer_email;
  const orderNumber = order?.orderNumber || order?.order_number || order?.referenceId;
  if (!customerEmail || order.status === previousStatus) return;

  await dispatchEmail(env, {
    recipientEmail: customerEmail,
    recipientType: 'customer',
    subject: `[DTKS] Order ${orderNumber} Status Updated to "${order.status}"`,
    bodyText: [
      `Hello ${order.customerName || order.customer_name},`,
      '',
      `Your website development order (${orderNumber}) has been updated.`,
      `Previous Status: ${previousStatus}`,
      `New Status: ${order.status}`,
      ...(order.quotationAmount ? [`Quotation Amount: INR ${order.quotationAmount}`] : []),
      ...(order.customerUpdate ? [`Team Update: ${order.customerUpdate}`] : []),
      '',
      `Track full details at https://dreamtechkashmirsolutions.studio/track-order`,
      '',
      `DreamTech Kashmir Solutions (DTKS)`,
    ].join('\n'),
    eventType: 'ORDER_STATUS_UPDATED_CUSTOMER',
    relatedEntityId: order.id,
  });
}

export async function notifyContactSubmitted(env, inquiry) {
  const adminEmail = env?.ADMIN_NOTIFICATION_EMAIL || 'contact@dreamtechkashmirsolutions.studio';

  await dispatchEmail(env, {
    recipientEmail: adminEmail,
    recipientType: 'admin',
    subject: `[DTKS Admin] New Contact Message: ${inquiry.subject}`,
    bodyText: [
      `New contact message received on DreamTech Kashmir Solutions:`,
      `From: ${inquiry.name} (${inquiry.email}${inquiry.phone ? ` | ${inquiry.phone}` : ''})`,
      `Subject: ${inquiry.subject}`,
      '',
      inquiry.message,
    ].join('\n'),
    eventType: 'CONTACT_RECEIVED_ADMIN',
    relatedEntityId: inquiry.id,
  });
}
