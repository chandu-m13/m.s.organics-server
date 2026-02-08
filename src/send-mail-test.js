const nodemailer = require("nodemailer");

async function sendEmail() {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "rakeshb1602@gmail.com",
      pass: "R@ki6305393112", // Use App Passwords if you have 2FA enabled
    },
  });

  let info = await transporter.sendMail({
    from: '"Rakesh Reddy" <rakeshb1602@gmail.com>',
    to: "rakeshreddy1542@gmail.com",
    subject: "Test Email",
    text: "Hello from Node.js!",
    html: "<b>Hello from Node.js!</b>",
  });

  console.log("Email sent: %s", info.messageId);
}

sendEmail().catch(console.error);
