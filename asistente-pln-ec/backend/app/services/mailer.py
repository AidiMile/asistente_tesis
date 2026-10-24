import logging
import smtplib
from email.message import EmailMessage

from ..config import settings

log = logging.getLogger("mailer")


def send_mail(to: str, subject: str, body: str) -> None:
    if not settings.smtp_host:
        log.warning("SMTP no configurado. Correo para %s | %s\n%s", to, subject, body)
        return
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = settings.smtp_from, to, subject
    msg.set_content(body)
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as s:
            s.starttls()
            if settings.smtp_user:
                s.login(settings.smtp_user, settings.smtp_password)
            s.send_message(msg)
    except Exception as exc:  # no bloquear el registro por fallo de correo
        log.error("No se pudo enviar correo a %s: %s", to, exc)
