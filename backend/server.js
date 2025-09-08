import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Middleware
app.use(cors({ origin: "*" })); // allow all origins (or restrict if needed)
app.use(bodyParser.json());

// ✅ Configure Nodemailer (Gmail + App Password)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // your Gmail
    pass: process.env.EMAIL_PASS, // your Gmail App Password
  },
});

// ✅ Test transporter connection
transporter.verify((err, success) => {
  if (err) {
    console.error("❌ SMTP connection error:", err);
  } else {
    console.log("✅ SMTP Server is ready to take messages");
  }
});

// ✅ Email API endpoint
app.post("/send-email", async (req, res) => {
  const { to, subject, html } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    await transporter.sendMail({
      from: `"Roommate Splitter" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`📧 Email sent to ${to}`);
    res.json({ success: true, message: "Email sent!" });
  } catch (err) {
    console.error("❌ Email error:", err);
    res.status(500).json({
      success: false,
      message: "Email failed",
      error: err.message,
    });
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});

