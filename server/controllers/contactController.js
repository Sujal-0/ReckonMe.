import Message from "../models/Message.js";
import nodemailer from "nodemailer";

// Email transporter (use Gmail or any SMTP)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,   // your email
    pass: process.env.EMAIL_PASS    // app password
  }
});

export const submitMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // save to DB
    const newMessage = new Message({ name, email, message });
    await newMessage.save();

    // send email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.RECEIVER_EMAIL,
      subject: "New Contact Form Message",
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
    });

    res.status(201).json({ success: true, message: "Message sent successfully" });
  } catch (error) {
    console.error("❌ Contact form error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
