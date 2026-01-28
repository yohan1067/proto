import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../src/generated/prisma';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in the .env file');
}

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello from the backend server!');
});

app.get('/api/auth/kakao/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is missing' });
  }

  try {
    const tokenResponse = await axios.post(
      'https://kauth.kakao.com/oauth/token',
      null,
      {
        params: {
          grant_type: 'authorization_code',
          client_id: process.env.KAKAO_CLIENT_ID,
          redirect_uri: 'http://localhost:3000/api/auth/kakao/callback',
          code,
        },
        headers: {
          'Content-type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
      }
    );

    const { access_token } = tokenResponse.data;

    const userResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    });

    const { id: kakaoId, kakao_account } = userResponse.data;
    const { profile, email } = kakao_account;

    let user = await prisma.user.findUnique({
      where: { kakaoId: BigInt(kakaoId) },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          kakaoId: BigInt(kakaoId),
          nickname: profile.nickname,
          email: email,
        },
      });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    
    res.redirect(`http://localhost:5173/?token=${token}`);

  } catch (error) {
    console.error('Kakao login error:', error);
    res.status(500).json({ error: 'Failed to login with Kakao' });
  }
});


app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});
