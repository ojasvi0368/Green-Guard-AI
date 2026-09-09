/**
 * Email Alert Service
 * Sends notifications via Nodemailer
 */

import nodemailer from 'nodemailer';
import { Alert } from '@/types';

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: { user, pass }
      });
    }
  }

  /**
   * Send alert email
   */
  async sendAlertEmail(
    to: string,
    alert: Alert
  ): Promise<boolean> {
    if (!this.transporter) {
      console.log('Email configured - would send:', alert.title);
      return false;
    }

    const html = this.generateEmailHTML(alert);

    try {
      await this.transporter.sendMail({
        from: '"GreenGuard AI" <noreply@greenguard.ai>',
        to,
        subject: `${this.getSeverityEmoji(alert.severity)} ${alert.title}`,
        html
      });

      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  /**
   * Generate green-themed HTML email
   */
  private generateEmailHTML(alert: Alert): string {
    const severityColor = this.getSeverityColor(alert.severity);
    const icon = this.getSeverityEmoji(alert.severity);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${alert.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #F0FDF4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0FDF4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700;">
                🌿 GreenGuard AI
              </h1>
              <p style="margin: 10px 0 0 0; color: #D1FAE5; font-size: 14px;">
                Smart Irrigation & Crop Wellness System
              </p>
            </td>
          </tr>
          
          <!-- Alert Badge -->
          <tr>
            <td style="padding: 30px 30px 20px 30px; text-align: center;">
              <div style="display: inline-block; background-color: ${severityColor}; color: #FFFFFF; padding: 10px 20px; border-radius: 20px; font-weight: 600; font-size: 14px;">
                ${icon} ${alert.severity.toUpperCase()} ALERT
              </div>
            </td>
          </tr>
          
          <!-- Alert Title -->
          <tr>
            <td style="padding: 0 30px 15px 30px;">
              <h2 style="margin: 0; color: #064E3B; font-size: 24px; text-align: center;">
                ${alert.title}
              </h2>
            </td>
          </tr>
          
          <!-- Alert Message -->
          <tr>
            <td style="padding: 0 30px 25px 30px;">
              <p style="margin: 0; color: #047857; font-size: 16px; line-height: 1.6; text-align: center;">
                ${alert.message}
              </p>
            </td>
          </tr>
          
          <!-- Action Required -->
          ${alert.actionRequired ? `
          <tr>
            <td style="padding: 0 30px 25px 30px; text-align: center;">
              <div style="background-color: #FEF3C7; border-left: 4px solid #FBBF24; padding: 15px; border-radius: 8px;">
                <p style="margin: 0; color: #78350F; font-weight: 600;">
                  ⚠️ Action Required
                </p>
              </div>
            </td>
          </tr>
          ` : ''}
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 30px 30px 30px; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);">
                View Dashboard
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #ECFDF5; padding: 20px; text-align: center; border-top: 1px solid #D1FAE5;">
              <p style="margin: 0; color: #6B7280; font-size: 12px;">
                Sent: ${new Date(alert.timestamp).toLocaleString()}
              </p>
              <p style="margin: 10px 0 0 0; color: #6B7280; font-size: 12px;">
                © 2026 GreenGuard AI. Nurturing fields with intelligence.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Get severity color
   */
  private getSeverityColor(severity: string): string {
    const colors = {
      low: '#10B981',
      medium: '#FBBF24',
      high: '#F97316',
      critical: '#EF4444'
    };
    return colors[severity as keyof typeof colors] || colors.low;
  }

  /**
   * Get severity emoji
   */
  private getSeverityEmoji(severity: string): string {
    const emojis = {
      low: '💚',
      medium: '⚠️',
      high: '🔶',
      critical: '🚨'
    };
    return emojis[severity as keyof typeof emojis] || '💚';
  }

  /**
   * Send daily summary email
   */
  async sendDailySummary(
    to: string,
    summary: {
      soilMoisture: number;
      waterUsed: number;
      waterSaved: number;
      nextIrrigation: Date | null;
      alerts: Alert[];
    }
  ): Promise<boolean> {
    if (!this.transporter) return false;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Daily Summary - GreenGuard AI</title>
</head>
<body style="font-family: 'Inter', sans-serif; background-color: #F0FDF4; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; padding: 30px;">
    <h1 style="color: #10B981; text-align: center;">🌾 Daily Farm Summary</h1>
    
    <div style="margin: 20px 0; padding: 15px; background: #ECFDF5; border-radius: 12px;">
      <p style="margin: 5px 0;"><strong>Soil Moisture:</strong> ${summary.soilMoisture.toFixed(1)}%</p>
      <p style="margin: 5px 0;"><strong>Water Used Today:</strong> ${summary.waterUsed.toFixed(0)} liters</p>
      <p style="margin: 5px 0;"><strong>Water Saved:</strong> ${summary.waterSaved.toFixed(0)} liters vs traditional</p>
      <p style="margin: 5px 0;"><strong>Next Irrigation:</strong> ${summary.nextIrrigation ? new Date(summary.nextIrrigation).toLocaleString() : 'Not scheduled'}</p>
    </div>
    
    ${summary.alerts.length > 0 ? `
    <div style="margin: 20px 0;">
      <h3 style="color: #047857;">Recent Alerts (${summary.alerts.length})</h3>
      ${summary.alerts.map(alert => `
        <div style="margin: 10px 0; padding: 10px; background: #FEF3C7; border-left: 4px solid #FBBF24; border-radius: 4px;">
          <strong>${alert.title}</strong><br>
          <span style="font-size: 14px;">${alert.message}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    <div style="text-align: center; margin-top: 30px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
        View Full Dashboard
      </a>
    </div>
  </div>
</body>
</html>
    `;

    try {
      await this.transporter.sendMail({
        from: '"GreenGuard AI" <noreply@greenguard.ai>',
        to,
        subject: '🌿 GreenGuard AI - Daily Farm Summary',
        html
      });
      return true;
    } catch (error) {
      console.error('Summary email failed:', error);
      return false;
    }
  }
}
