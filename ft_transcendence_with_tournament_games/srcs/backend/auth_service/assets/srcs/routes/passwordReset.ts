import { FastifyInstance } from "fastify";
import jwt , { JwtPayload } from 'jsonwebtoken';
import sendMail from '../mail';
import bcrypt from 'bcrypt';

const expireIn = 5;

export default function passwordResetRoutes(app: FastifyInstance, options: any, done: any)
{
    interface passwordResetAskBody {
        email: string,
    }

    app.post<{Body: passwordResetAskBody}>('/passwordReset/ask', async (req, res) => {
        try {
            const email = req.body.email;
            if (!email)
                return res.status(230).send({ error: "email not found" });
            const userLookupResponse = await fetch(`http://user_service:3000/api/user/lookup/${email}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    credential: process.env.API_CREDENTIAL}),
            });
            const data = await userLookupResponse.json();
            if (!userLookupResponse.ok)
                return res.status(userLookupResponse.status).send({ error: data.error });
            const user = data;
            if (!user)
                return res.status(230).send({ error: "1006" });
            const passwordResetToken = jwt.sign({
            data: {
                email
            }
            }, process.env.JWT_SECRET as string, { expiresIn: expireIn * 60 * 1000 });
            const link : string = `https://localhost:3000/forgot-password/new-password?token=${passwordResetToken}`
            if (data)
                await sendMail(email, 'Password reset', `You asked for a password reset, here is your link ${link}\nIt will expire at ${expireIn} minutes`);
            res.status(200).send({ message: "mail sent" });
        } catch (error) {
            console.log(error)
            res.status(230).send({ error: "0500" });
        }
    });

    interface passwordResetSubmitBody {
        token: string,
        actual_password:string,
        new_password:string
    }

    app.post<{ Body: passwordResetSubmitBody }>('/passwordReset/submit', {}, async (req, res) => {
        try {
            const actual_password = req.body.actual_password;
            const new_password = req.body.new_password;
            const token = req.body.token;
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
            const email = decoded.data.email;
            if (!email)
                return res.status(230).send({ error: "1016" });
            const response = await fetch(`http://user_service:3000/api/user/lookup/${email}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    credential: process.env.API_CREDENTIAL
                }),
            });
            const data = await response.json();
            if (response.status != 200)
                res.status(response.status).send({ error: data.error})
            const user = data;
            if (!user)
                return res.status(230).send({ error: "1006" });
            if (!user.password)
                return res.status(230).send({ error: "1014" });
            const isCorrect = await bcrypt.compare(actual_password as string, user.password);
            if (!isCorrect)
                return res.status(230).send({ error: "1006"});
            const newPassword = await bcrypt.hash(new_password, 12);
            const userPasswordUpdate = await fetch(`http://user_service:3000/api/user/password/${email}`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    credential: process.env.API_CREDENTIAL,
                    password: newPassword,
                }),
            }); 
            if (userPasswordUpdate.status != 200)
                return res.status(userPasswordUpdate.status).send({ error: "1016"})
            res.status(200).send();
        } catch (error) {
            res.status(230).send({ error: "1016" });
        }
    });
    done();
}