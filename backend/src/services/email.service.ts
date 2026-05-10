import { Resend } from "resend";
import { env } from "../config/env";

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

export async function sendResetPasswordEmail(email: string, token: string) {
  const resetLink = `${env.appBaseUrl}/reset-password?token=${token}`;
  if (!resend) return { sent: false, resetLink };
  await resend.emails.send({
    from: "NeuroLearn AI <no-reply@neurolearn.ai>",
    to: email,
    subject: "Reset your NeuroLearn password",
    html: `<p>Reset your password using this link:</p><p><a href="${resetLink}">${resetLink}</a></p>`
  });
  return { sent: true, resetLink };
}
