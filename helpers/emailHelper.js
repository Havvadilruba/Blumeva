import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();


async function sendVerificationEmail(email, otp) {
  try {
    // Always log OTP to console for debugging and visibility
    console.log(`\n=== OTP Generated ===\nEmail: ${email}\nOTP Code: ${otp}\n====================\n`);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your Blumeva account",
      text: `Your OTP is ${otp}`,
      html: `<b>Your OTP is: ${otp}</b>`,
    });

    console.log(`✓ Email sent successfully to ${email}`);
    return info.accepted.length > 0;
  } catch (error) {
    console.error("⚠ Email send failed:", error.message);
    console.log(`✓ OTP is still valid and available above. Use it manually in development.`);
    return false;
  }
}

export { sendVerificationEmail };

