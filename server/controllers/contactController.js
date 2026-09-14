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

    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; background-color: #0A0A0A; color: #ffffff; padding: 40px; text-align: center; border-radius: 10px; max-width: 600px; margin: 0 auto; border: 4px solid #4D4C7D; box-shadow: 8px 8px 0px #4D4C7D;">
        <img src="https://reckonme.vercel.app/RMeLogo.png" alt="ReckonMe Logo" style="width: 150px; margin-bottom: 20px;" />
        <h1 style="color: #00E5FF; text-transform: uppercase; letter-spacing: 2px;">New Support Ticket</h1>
        <p style="font-size: 18px; color: #E48F45; font-weight: bold;">You have received a new message from the contact form!</p>
        
        <div style="background-color: rgba(255,255,255,0.05); padding: 20px; border-radius: 5px; text-align: left; margin: 30px 0; border: 2px solid rgba(255,255,255,0.1);">
          <p style="margin: 5px 0;"><strong style="color: #87CEFA;">Name:</strong> ${name}</p>
          <p style="margin: 5px 0;"><strong style="color: #87CEFA;">Email:</strong> ${email}</p>
          <hr style="border-color: rgba(255,255,255,0.1); margin: 15px 0;" />
          <p style="margin: 0; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
        </div>
        
        <a href="mailto:${email}" style="display: inline-block; background-color: #E48F45; color: #0A0A0A; padding: 12px 24px; text-decoration: none; font-weight: bold; font-size: 16px; border: 2px solid #ffffff; box-shadow: 3px 3px 0px #ffffff; text-transform: uppercase;">
          Reply to Player
        </a>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.RECEIVER_EMAIL,
      subject: "🚨 New ReckonMe Contact Request",
      html: htmlTemplate,
    });

    res.status(201).json({ success: true, message: "Message sent successfully" });
  } catch (error) {
    console.error("❌ Contact form error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
