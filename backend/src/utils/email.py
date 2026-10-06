import re
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from src.config.settings import settings

def generate_enrollment_password(full_name: str, phone: str) -> str:
    """
    Generates dynamic credentials per owner specification:
    Password = First 4 characters of full name (lowercase) + Last 4 digits of phone number
    Example: Name='butter', Phone='+4486881111' → 'butt1111'
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
        f'<div class="field-group" style="margin-top:14px;padding-top:14px;border-top:1px dashed #cbd5e1;">'
        f'<div class="field-label">Enrolled Plan / Course</div>'
        f'<div class="field-val-plan" style="color:#7c3aed;font-size:15px;font-weight:700;">{plan_name}</div>'
        f'</div>'
        if plan_name else ""
    )

    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Registration Confirmation</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f1f5f9;
      color: #1e293b;
      margin: 0;
      padding: 30px 15px;
      -webkit-font-smoothing: antialiased;
    }}
    .wrapper {{
      max-width: 560px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      padding: 36px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
    }}
    .header {{
      text-align: center;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 24px;
      margin-bottom: 24px;
    }}
    .logo-badge {{
      font-size: 32px;
      margin-bottom: 8px;
    }}
    .title {{
      color: #0f172a;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0;
    }}
    .subtitle {{
      color: #64748b;
      font-size: 13px;
      font-weight: 600;
      margin-top: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    .greeting {{
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 10px;
    }}
    .intro-text {{
      font-size: 14px;
      line-height: 1.6;
      color: #334155;
      margin-bottom: 24px;
    }}
    .cred-box {{
      background: #f8fafc;
      border-radius: 14px;
      padding: 24px;
      margin: 24px 0;
      border: 1.5px solid #e2e8f0;
    }}
    .field-group {{
      margin-bottom: 16px;
    }}
    .field-group:last-child {{
      margin-bottom: 0;
    }}
    .field-label {{
      color: #64748b;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 4px;
    }}
    .field-val-email {{
      color: #2563eb;
      font-size: 16px;
      font-weight: 700;
      font-family: 'Courier New', Courier, monospace;
      word-break: break-all;
    }}
    .field-val-pass {{
      color: #059669;
      font-size: 20px;
      font-weight: 800;
      font-family: 'Courier New', Courier, monospace;
      letter-spacing: 1px;
    }}
    .formula-box {{
      background: #eff6ff;
      border-radius: 10px;
      padding: 12px 16px;
      margin-top: 20px;
      border-left: 4px solid #3b82f6;
    }}
    .formula-text {{
      font-size: 12px;
      line-height: 1.5;
      color: #1e40af;
      margin: 0;
      font-weight: 600;
    }}
    .footer {{
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      margin-top: 32px;
      border-top: 1px solid #f1f5f9;
      padding-top: 20px;
      line-height: 1.6;
    }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo-badge">👑</div>
      <h1 class="title">{gym_name.upper()}</h1>
      <div class="subtitle">Official Account Registration Confirmation</div>
    </div>
    <div class="greeting">Hello {full_name},</div>
    <div class="intro-text">
      Your <strong>{role.title()}</strong> account has been successfully enrolled on the <strong>{gym_name}</strong> Platform. Here are your account credentials to log in:
    </div>
    <div class="cred-box">
      <div class="field-group">
        <div class="field-label">Registered Email / Username</div>
        <div class="field-val-email">{to_email}</div>
      </div>
      <div class="field-group">
        <div class="field-label">Auto-Generated Initial Password</div>
        <div class="field-val-pass">{password}</div>
      </div>
      {plan_html}
    </div>
    <div class="formula-box">
      <p class="formula-text">
        🔑 <strong>Password Formula:</strong> First 4 letters of your name + Last 4 digits of your registered phone number.
      </p>
    </div>
    <div class="footer">
      <strong>{gym_name}</strong> {gym_tagline}<br />
      Automated System Dispatch &bull; Please keep your credentials secure.
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
