import nodemailer from "nodemailer";

// Configure SMTP transporter, with Docker-friendly defaults
const mailHost = process.env.MAIL_HOST || 'mailhog';        // default to Mailhog container
const mailPort = process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT, 10) : 1025;
const mailSecure = process.env.MAIL_SECURE === 'true';      // use TLS if explicitly enabled
const transporterConfig: any = {
  host: mailHost,
  port: mailPort,
  secure: mailSecure,
  auth: {
    user: process.env.MAIL_ADRESS,
    pass: process.env.MAIL_PASSWORD,
  },
};
// If a well-known service (e.g. Gmail) is specified, include it
if (process.env.MAIL_SERVICE) {
  transporterConfig.service = process.env.MAIL_SERVICE;
}
const transporter = nodemailer.createTransport(transporterConfig);

export default async function sendMail(to: string, subject: string, text: string) {
    const mailOptions = {
        from: `ft_transcendence`,
        to,
        subject,
        text,
    };
    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.log(error)
    }
};