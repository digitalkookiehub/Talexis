"""Email notification service using SMTP."""
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import settings

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an email via SMTP. Returns True on success."""
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.warning("SMTP not configured — email not sent to %s: %s", to_email, subject)
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM_EMAIL
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, to_email, msg.as_string())

        logger.info("Email sent to %s: %s", to_email, subject)
        return True

    except Exception as e:
        logger.error("Email send failed: %s", repr(e))
        return False


def send_demo_request_notification(
    contact_name: str, company_name: str, email: str, phone: str, message: str
) -> bool:
    """Send demo request notification to admin."""
    admin_email = settings.ADMIN_EMAIL
    if not admin_email:
        logger.warning("ADMIN_EMAIL not configured — demo request notification skipped")
        return False

    subject = f"New Demo Request: {company_name} — {contact_name}"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981, #14b8a6); padding: 20px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">New Demo Request</h1>
            <p style="color: #d1fae5; margin: 5px 0 0 0; font-size: 14px;">Talexis Platform</p>
        </div>
        <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr><td style="padding: 8px 0; color: #6b7280; width: 120px;">Contact Name</td><td style="padding: 8px 0; font-weight: 600;">{contact_name}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Company</td><td style="padding: 8px 0; font-weight: 600;">{company_name}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Email</td><td style="padding: 8px 0;"><a href="mailto:{email}" style="color: #10b981;">{email}</a></td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Phone</td><td style="padding: 8px 0;">{phone or 'Not provided'}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Message</td><td style="padding: 8px 0;">{message or 'No message'}</td></tr>
            </table>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
            <p style="font-size: 12px; color: #9ca3af;">
                Action required: Review this request and create a company account if approved.
                Log in to the <a href="{settings.FRONTEND_URL}/login" style="color: #10b981;">Admin Dashboard</a> to manage demo requests.
            </p>
        </div>
    </div>
    """
    return send_email(admin_email, subject, html_body)
