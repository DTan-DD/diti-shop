import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

(async () => {
  const data = await resend.emails.send({
    from: "DiTi Shop <diti-shop@resend.dev>",
    to: "tan.ddd03979@gmail.com",
    subject: "Test Email",
    text: "Hello from Resend!",
  });
  console.log(data);
})();
