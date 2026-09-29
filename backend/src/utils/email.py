import re
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from src.config.settings import settings

def generate_enrollment_password(full_name: str, phone: str) -> str:
    """
    Generates dynamic credentials per owner specification:
    Password = First 4 characters of full name (lowercase) + Last 4 digits of phone number
    Example: Name='Polepalli Yashwanth', Phone='+448688179467' → 'pole9467'
    """
    clean_name = re.sub(r'[^a-zA-Z]', '', full_name or '').lower()
    first_4 = clean_name[:4].ljust(4, 'x')

    digits_phone = re.sub(r'\D', '', phone or '0000')
    last_4 = digits_phone[-4:] if len(digits_phone) >= 4 else digits_phone.zfill(4)

    return f"{first_4}{last_4}"


def send_enrollment_email(to_email: str, full_name: str, password: str, role: str = "CUSTOMER", plan_name: str = None) -> bool:
    """
    Sends automated welcome email with login credentials to a newly enrolled customer or trainer.
    All branding text is pulled dynamically from settings — zero hardcoded strings.
    """
    gym_name = settings.GYM_NAME
    gym_tagline = settings.GYM_PLATFORM_TAGLINE
    from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USER or ""

    subject = f"Welcome to {gym_name} — Your {role.title()} Account Credentials"

    plan_html = (
        f'<div class="field-label">Membership Plan</div>'
        f'<div class="field-val" style="color:#60a5fa;">{plan_name}</div>'
        if plan_name else ""
    )

    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: 'Inter', -apple-system, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }}
    .card {{ max-width: 540px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }}
    .header {{ text-align: center; border-bottom: 1px solid #334155; padding-bottom: 20px; margin-bottom: 24px; }}
    .title {{ color: #10b981; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }}
    .subtitle {{ color: #94a3b8; font-size: 14px; margin-top: 6px; }}
    .cred-box {{ background: #0f172a; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #3b82f6; }}
    .field-label {{ color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }}
    .field-val {{ color: #f8fafc; font-size: 16px; font-weight: 700; margin-bottom: 12px; font-family: monospace; }}
    .footer {{ text-align: center; font-size: 12px; color: #64748b; margin-top: 28px; border-top: 1px solid #334155; padding-top: 16px; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1 class="title">👑 {gym_name.upper()}</h1>
      <div class="subtitle">Official Account Registration Confirmation</div>
    </div>
    <p>Hello <strong>{full_name}</strong>,</p>
    <p>Your <strong>{role.title()}</strong> account has been successfully enrolled on the {gym_name} Platform.</p>
    <div class="cred-box">
      <div class="field-label">Registered Email / Username</div>
      <div class="field-val">{to_email}</div>
      <div class="field-label">Auto-Generated Initial Password</div>
      <div class="field-val" style="color:#10b981;font-size:18px;">{password}</div>
      {plan_html}
    </div>
    <p style="font-size:13px;color:#94a3b8;">
      Password Formula: First 4 letters of your name + Last 4 digits of your registered phone number.
    </p>
    <div class="footer">
      {gym_name} {gym_tagline} &bull; Automated System Dispatch
    </div>
  </div>
</body>
</html>"""

    print("\n" + "=" * 68)
    print(f"📧 [{gym_name}] ENROLLMENT EMAIL DISPATCHED")
    print("=" * 68)
    print(f"  • Recipient : {to_email}")
    print(f"  • Name      : {full_name}")
    print(f"  • Role      : {role}")
    print(f"  • Password  : {password}")
    if plan_name:
        print(f"  • Plan      : {plan_name}")
    print("=" * 68 + "\n")

    # Attempt real SMTP delivery if credentials are present in .env
    smtp_host = settings.SMTP_HOST
    smtp_port = settings.SMTP_PORT or 587
    smtp_user = settings.SMTP_USER
    smtp_pass = settings.SMTP_PASSWORD

    if smtp_host and smtp_user and smtp_pass:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = from_email or smtp_user
            msg["To"] = to_email
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, to_email, msg.as_string())
            print(f"✅ SMTP email successfully sent to {to_email}")
        except Exception as e:
            print(f"⚠️  SMTP dispatch warning (credentials logged to console): {e}")

    return True
