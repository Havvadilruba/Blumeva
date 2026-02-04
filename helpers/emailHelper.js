import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();


async function sendVerificationEmail(email, otp) {
  try {
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

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending verification email:", error);
    return false;
  }
}

export { sendVerificationEmail };

