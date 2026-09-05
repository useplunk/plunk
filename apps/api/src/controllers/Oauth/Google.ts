import {Controller, Get} from '@overnightjs/core';
import type {NextFunction, Request, Response} from 'express';

import {
  API_URI,
  DASHBOARD_URI,
  DISABLE_SIGNUPS,
  GOOGLE_OAUTH_CLIENT,
  GOOGLE_OAUTH_ENABLED,
  GOOGLE_OAUTH_SECRET,
} from '../../app/constants.js';
import {prisma} from '../../database/prisma.js';
import {BadRequest} from '../../exceptions/index.js';
import {jwt} from '../../middleware/auth.js';
import {NtfyService} from '../../services/NtfyService.js';
import {UserService} from '../../services/UserService.js';
import {CatchAsync} from '../../utils/asyncHandler.js';

@Controller('google')
export class Google {
  @Get('outbound')
  public sendToOutbound(req: Request, res: Response) {
    if (!GOOGLE_OAUTH_ENABLED) {
      return res.status(404).json({error: 'Google OAuth is not configured'});
    }

    return res.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?scope=https://www.googleapis.com/auth/userinfo.email&access_type=offline&include_granted_scopes=true&prompt=select_account&response_type=code&redirect_uri=${API_URI}/oauth/google/callback&client_id=${GOOGLE_OAUTH_CLIENT}`,
    );
  }

  @Get('callback')
  @CatchAsync
  public async callback(req: Request, res: Response, _next: NextFunction) {
    if (!GOOGLE_OAUTH_ENABLED) {
      return res.status(404).json({error: 'Google OAuth is not configured'});
    }
    const {code} = req.query;

    if (!code || typeof code !== 'string') {
      return res.redirect(DASHBOARD_URI + '/auth/login?message=Invalid OAuth callback');
    }

    const data = new URLSearchParams({
      client_id: GOOGLE_OAUTH_CLIENT,
      client_secret: GOOGLE_OAUTH_SECRET,
      code: code as string,
      redirect_uri: `${API_URI}/oauth/google/callback`,
      grant_type: 'authorization_code',
    });

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {'Content-type': 'application/x-www-form-urlencoded'},
      body: data,
    }).then(res => res.json());

    if (!tokenResponse.access_token) {
      return res.redirect(DASHBOARD_URI + '/auth/login?message=Failed to authenticate with Google');
    }

    const userInfoResponse = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokenResponse.access_token}`,
    ).then(res => res.json());

    if (!userInfoResponse.email || typeof userInfoResponse.email !== 'string') {
      return res.redirect(DASHBOARD_URI + '/auth/login?message=Failed to retrieve email from Google');
    }

    const email = userInfoResponse.email;

    let user = await UserService.email(email);
    let isNewUser = false;

    if (!user) {
      // Check if signups are disabled
      if (DISABLE_SIGNUPS) {
        throw new BadRequest('New user signups are currently disabled');
      }

      user = await prisma.user.create({
        data: {
          email,
          type: 'GOOGLE_OAUTH',
          emailVerified: true,
        },
      });
      isNewUser = true;
    }

    if (user.type !== 'GOOGLE_OAUTH') {
      return res.redirect(DASHBOARD_URI + '/auth/login?message=You used another form of authentication');
    }

    // Send notification if this is a new user
    if (isNewUser) {
      await NtfyService.notifyUserOAuthSignup(user.email, user.id, 'Google');
    }

    const token = jwt.sign(user.id);
    UserService.setAuthCookie(res, token).redirect(DASHBOARD_URI);
  }
}
