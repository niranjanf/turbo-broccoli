import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

// configure nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

app.post("/send-email", async (req, res) => {
  const { to, subject, text, html } = req.body;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
    res.json({ success: true, message: "Email sent!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Email failed", error: err });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

