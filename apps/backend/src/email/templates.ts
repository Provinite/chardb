/**
 * Email template contexts
 */
export interface PasswordResetContext {
  username: string;
  resetUrl: string;
  expiryHours: number;
}

export interface PasswordChangedContext {
  username: string;
  supportEmail: string;
}

export interface ImageApprovedContext {
  username: string;
  imageName: string;
}

export interface ImageRejectedContext {
  username: string;
  imageName: string;
  reason: string;
  reasonText?: string;
}

/**
 * Password reset email template
 */
export const passwordResetTemplate = (
  context: PasswordResetContext,
): string => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 30px;
            margin-top: 20px;
        }
        h1 {
            color: #2c3e50;
            font-size: 24px;
            margin-bottom: 20px;
        }
        .button {
            display: inline-block;
            background-color: #8b5cf6;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
        .button:hover {
            background-color: #7c3aed;
        }
        .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 12px;
            margin: 20px 0;
        }
        .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #7f8c8d;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
        .link {
            color: #8b5cf6;
            word-break: break-all;
        }
        .header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 2px solid #8b5cf6;
            margin-bottom: 30px;
        }
        .brand {
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
        }
        .brand-domain {
            font-size: 14px;
            color: #7f8c8d;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="brand">CharDB</div>
        <div class="brand-domain">chardb.cc</div>
    </div>
    <div class="container">
        <h1>Reset Your Password</h1>

        <p>Hi ${context.username},</p>

        <p>We received a request to reset your CharDB password. Click the button below to create a new password:</p>

        <a href="${context.resetUrl}" class="button">Reset Password</a>

        <p>Or copy and paste this link into your browser:</p>
        <p class="link">${context.resetUrl}</p>

        <div class="warning">
            <strong>Important:</strong> This link will expire in ${context.expiryHours} hour(s). If you didn't request a password reset, you can safely ignore this email.
        </div>

        <p>For security reasons, we cannot tell you your current password. If you didn't request this reset, please make sure your account is secure.</p>
    </div>

    <div class="footer">
        <p>This is an automated email from <strong>CharDB.cc</strong>. Please do not reply to this message.</p>
        <p>If you have any questions, please contact our support team.</p>
    </div>
</body>
</html>`;

/**
 * Password changed notification email template
 */
export const passwordChangedTemplate = (
  context: PasswordChangedContext,
): string => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 30px;
            margin-top: 20px;
        }
        h1 {
            color: #059669;
            font-size: 24px;
            margin-bottom: 20px;
        }
        .success-icon {
            font-size: 48px;
            color: #059669;
            text-align: center;
            margin-bottom: 20px;
        }
        .alert {
            background-color: #fee;
            border-left: 4px solid #e74c3c;
            padding: 12px;
            margin: 20px 0;
        }
        .alert strong {
            color: #c0392b;
        }
        .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #7f8c8d;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
        .contact {
            background-color: #e8f5e9;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
        }
        .header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 2px solid #059669;
            margin-bottom: 30px;
        }
        .brand {
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
        }
        .brand-domain {
            font-size: 14px;
            color: #7f8c8d;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="brand">CharDB</div>
        <div class="brand-domain">chardb.cc</div>
    </div>
    <div class="container">
        <div class="success-icon">✓</div>
        <h1>Password Changed Successfully</h1>

        <p>Hi ${context.username},</p>

        <p>This email confirms that your CharDB password was successfully changed.</p>

        <div class="alert">
            <strong>Did you make this change?</strong><br>
            If you did not change your password, your account may have been compromised. Please contact our support team immediately at ${context.supportEmail}.
        </div>

        <div class="contact">
            <p><strong>Security Tips:</strong></p>
            <ul>
                <li>Never share your password with anyone</li>
                <li>Use a unique password for this account</li>
                <li>Enable two-factor authentication if available</li>
                <li>Be cautious of phishing emails</li>
            </ul>
        </div>

        <p>If you made this change, no further action is needed. Your new password is now active.</p>
    </div>

    <div class="footer">
        <p>This is an automated security notification from <strong>CharDB.cc</strong>. Please do not reply to this message.</p>
        <p>If you have concerns about your account security, please contact our support team.</p>
    </div>
</body>
</html>`;

/**
 * Image approved notification email template
 */
export const imageApprovedTemplate = (
  context: ImageApprovedContext,
): string => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Image Approved</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 30px;
            margin-top: 20px;
        }
        h1 {
            color: #059669;
            font-size: 24px;
            margin-bottom: 20px;
        }
        .success-icon {
            font-size: 48px;
            color: #059669;
            text-align: center;
            margin-bottom: 20px;
        }
        .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #7f8c8d;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
        .header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 2px solid #059669;
            margin-bottom: 30px;
        }
        .brand {
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
        }
        .brand-domain {
            font-size: 14px;
            color: #7f8c8d;
            margin-top: 5px;
        }
        .image-name {
            background-color: #e8f5e9;
            padding: 10px 15px;
            border-radius: 5px;
            font-family: monospace;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="brand">CharDB</div>
        <div class="brand-domain">chardb.cc</div>
    </div>
    <div class="container">
        <div class="success-icon">✓</div>
        <h1>Your Image Has Been Approved</h1>

        <p>Hi ${context.username},</p>

        <p>Great news! Your uploaded image has been reviewed and approved by our moderation team.</p>

        <div class="image-name">${context.imageName}</div>

        <p>Your image is now visible to others based on its visibility settings.</p>
    </div>

    <div class="footer">
        <p>This is an automated notification from <strong>CharDB.cc</strong>. Please do not reply to this message.</p>
    </div>
</body>
</html>`;

/**
 * Image rejected notification email template
 */
export const imageRejectedTemplate = (
  context: ImageRejectedContext,
): string => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Image Not Approved</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 30px;
            margin-top: 20px;
        }
        h1 {
            color: #dc2626;
            font-size: 24px;
            margin-bottom: 20px;
        }
        .reject-icon {
            font-size: 48px;
            color: #dc2626;
            text-align: center;
            margin-bottom: 20px;
        }
        .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #7f8c8d;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
        .header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 2px solid #dc2626;
            margin-bottom: 30px;
        }
        .brand {
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
        }
        .brand-domain {
            font-size: 14px;
            color: #7f8c8d;
            margin-top: 5px;
        }
        .image-name {
            background-color: #fee2e2;
            padding: 10px 15px;
            border-radius: 5px;
            font-family: monospace;
            margin: 15px 0;
        }
        .reason-box {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
        }
        .reason-title {
            font-weight: bold;
            color: #92400e;
            margin-bottom: 5px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="brand">CharDB</div>
        <div class="brand-domain">chardb.cc</div>
    </div>
    <div class="container">
        <div class="reject-icon">✕</div>
        <h1>Your Image Was Not Approved</h1>

        <p>Hi ${context.username},</p>

        <p>Unfortunately, your uploaded image could not be approved by our moderation team.</p>

        <div class="image-name">${context.imageName}</div>

        <div class="reason-box">
            <div class="reason-title">Reason:</div>
            <p>${context.reason}</p>
            ${context.reasonText ? `<p><strong>Details:</strong> ${context.reasonText}</p>` : ''}
        </div>

        <p>If you believe this was a mistake, please review our community guidelines and contact support if you have questions.</p>
    </div>

    <div class="footer">
        <p>This is an automated notification from <strong>CharDB.cc</strong>. Please do not reply to this message.</p>
    </div>
</body>
</html>`;
