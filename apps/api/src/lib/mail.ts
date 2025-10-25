import { ENV } from "./env";
import nodemailer from "nodemailer";

const devTransport = { host: "localhost", port: 1025, secure: false };
export const transporter =
  process.env.NODE_ENV === "production"
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
    : nodemailer.createTransport(devTransport);

export async function sendOtpEmail(to: string, code: string, magicUrl: string) {
  const subject = "Your apply.ai sign-in code";
  const html = `
<table role="presentation" width="100%" style="font-family:ui-sans-serif,system-ui,-apple-system">
<tr><td style="padding:24px">
<h2 style="margin:0 0 12px">Here’s your code</h2>
<p style="font-size:16px;margin:0 0 12px">Use this code within 10 minutes:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:2px">${code}</p>
<p style="margin:16px 0">Or <a href="${magicUrl}">click to sign in</a>.</p>
<p style="color:#64748b;font-size:12px">If you didn’t request this, you can ignore this email.</p>
</td></tr>
</table>`;
  await transporter.sendMail({ from: ENV.EMAIL_FROM, to, subject, html });
}
