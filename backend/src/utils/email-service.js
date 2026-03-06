// ========================================
// EMAIL SERVICE - Gửi email (sử dụng Cloudflare Email Workers hoặc service khác)
// ========================================

/**
 * Send email using Cloudflare Email Workers or external service
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (optional)
 */
export async function sendEmail(options, env) {
  const { to, subject, html, text } = options;

  try {
    // Option 1: Use Cloudflare Email Workers (if configured)
    if (env.EMAIL_WORKER_URL) {
      const response = await fetch(env.EMAIL_WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject,
          html,
          text: text || html.replace(/<[^>]*>/g, ''),
        }),
      });

      if (!response.ok) {
        throw new Error('Email service error');
      }

      return { success: true };
    }

    // Option 2: Use external email service (Resend, SendGrid, etc.)
    // Example with Resend API:
    if (env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.FROM_EMAIL || '[email protected]',
          to: [to],
          subject,
          html,
          text: text || html.replace(/<[^>]*>/g, ''),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Email service error');
      }

      return { success: true };
    }

    // Fallback: Log email (for development)
    console.log('Email would be sent:', {
      to,
      subject,
      html,
    });

    return { success: true, message: 'Email logged (development mode)' };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email, resetToken, frontendUrl, env) {
  const resetLink = `${frontendUrl}/admin/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { margin-top: 20px; font-size: 12px; color: #777; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Đặt lại mật khẩu</h1>
        </div>
        <div class="content">
          <p>Xin chào,</p>
          <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản admin.</p>
          <p>Vui lòng nhấp vào nút bên dưới để đặt lại mật khẩu:</p>
          <a href="${resetLink}" class="button">Đặt lại mật khẩu</a>
          <p>Hoặc copy link sau vào trình duyệt:</p>
          <p style="word-break: break-all; color: #4CAF50;">${resetLink}</p>
          <p><strong>Lưu ý:</strong> Link này sẽ hết hạn sau 1 giờ.</p>
          <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        </div>
        <div class="footer">
          <p>Công ty TNHH Tư vấn Giáo dục Sơn Trang</p>
          <p>Email này được gửi tự động, vui lòng không trả lời.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Đặt lại mật khẩu

Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản admin.

Vui lòng truy cập link sau để đặt lại mật khẩu:
${resetLink}

Link này sẽ hết hạn sau 1 giờ.

Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.

Công ty TNHH Tư vấn Giáo dục Sơn Trang
  `;

  return sendEmail({
    to: email,
    subject: 'Đặt lại mật khẩu - Công ty TNHH Tư vấn Giáo dục Sơn Trang',
    html,
    text,
  }, env);
}
