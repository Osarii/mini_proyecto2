/**
 * Servicio de Envío de Correos Electrónicos
 * Innovatech Solutions S.A.
 * Soporta SMTP (Gmail, Microsoft 365, Brevo, Sendgrid o SMTP corporativo)
 */
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

class EmailService {
  constructor() {
    this.targetEmail = process.env.HR_NOTIFICATION_EMAIL || 'ssalasl@fwdcostarica.com';
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (user && pass) {
      if (host && host.includes('gmail')) {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user, pass }
        });
      } else if (host) {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass }
        });
      } else {
        // Fallback servicio gmail si no hay host explícito pero hay user y pass
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user, pass }
        });
      }
      console.log(`[EmailService] Transporter SMTP configurado para usuario: ${user}`);
    } else {
      this.transporter = null;
      console.log(`[EmailService] SMTP no configurado en .env. Se usará registro en base de datos.`);
    }
  }

  getTargetEmail() {
    return process.env.HR_NOTIFICATION_EMAIL || 'ssalasl@fwdcostarica.com';
  }

  isConfigured() {
    return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
  }

  getStatus() {
    return {
      configured: this.isConfigured(),
      targetEmail: this.getTargetEmail(),
      smtpHost: process.env.SMTP_HOST || 'No definido (ej. smtp.gmail.com)',
      smtpPort: process.env.SMTP_PORT || '587',
      smtpUser: process.env.SMTP_USER ? `${process.env.SMTP_USER.slice(0, 3)}...` : 'No configurado',
      from: process.env.SMTP_FROM || `"Innovatech RRHH" <${process.env.SMTP_USER || 'rrhh@innovatech.cr'}>`
    };
  }

  async sendMail({ to, subject, text, html }) {
    const destination = to || this.getTargetEmail();
    const fromAddress = process.env.SMTP_FROM || (process.env.SMTP_USER ? `"Portal RRHH Innovatech" <${process.env.SMTP_USER}>` : '"Innovatech RRHH" <notificaciones@innovatech.cr>');

    if (!this.transporter) {
      this.initTransporter();
    }

    if (!this.transporter) {
      return {
        success: false,
        sentRealEmail: false,
        destination,
        message: 'No hay credenciales SMTP configuradas en .env. El correo se guardó en la bandeja interna del sistema.'
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: destination,
        subject,
        text,
        html: html || `<pre style="font-family: sans-serif; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${text}</pre>`
      });

      console.log(`[EmailService] Correo real enviado exitosamente a ${destination} (MessageId: ${info.messageId})`);
      return {
        success: true,
        sentRealEmail: true,
        destination,
        messageId: info.messageId,
        message: `Correo real enviado con éxito a ${destination}`
      };
    } catch (error) {
      console.error(`[EmailService] Error enviando correo real a ${destination}:`, error.message);
      return {
        success: false,
        sentRealEmail: false,
        destination,
        error: error.message,
        message: `Fallo al enviar correo real a ${destination}: ${error.message}`
      };
    }
  }

  updateCredentials({ smtpHost, smtpPort, smtpUser, smtpPass, targetEmail }) {
    const envPath = path.resolve(__dirname, '../../../.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

    const updateOrAppend = (key, value) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
      process.env[key] = value;
    };

    if (targetEmail) updateOrAppend('HR_NOTIFICATION_EMAIL', targetEmail);
    if (smtpHost) updateOrAppend('SMTP_HOST', smtpHost);
    if (smtpPort) updateOrAppend('SMTP_PORT', smtpPort);
    if (smtpUser) updateOrAppend('SMTP_USER', smtpUser);
    if (smtpPass) updateOrAppend('SMTP_PASS', smtpPass);

    fs.writeFileSync(envPath, envContent, 'utf8');
    this.initTransporter();

    return this.getStatus();
  }
}

module.exports = new EmailService();
