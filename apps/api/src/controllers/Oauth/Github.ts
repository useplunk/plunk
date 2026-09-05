import {Controller, Get} from '@overnightjs/core';
import type {NextFunction, Request, Response} from 'express';

import {
  API_URI,
  DASHBOARD_URI,
  DISABLE_SIGNUPS,
  GITHUB_OAUTH_CLIENT,
  GITHUB_OAUTH_ENABLED,
  GITHUB_OAUTH_SECRET,
} from '../../app/constants.js';
import {prisma} from '../../database/prisma.js';
import {BadRequest} from '../../exceptions/index.js';
import {jwt} from '../../middleware/auth.js';
import {NtfyService} from '../../services/NtfyService.js';
import {UserService} from '../../services/UserService.js';
import {CatchAsync} from '../../utils/asyncHandler.js';

@Controller('github')
export class Github {
  @Get('outbound')
  public sendToOutbound(req: Request, res: Response) {
    if (!GITHUB_OAUTH_ENABLED) {
      return res.status(404).json({error: 'GitHub OAuth is not configured'});
    }

    const OAUTH_QS = new URLSearchParams({
      client_id: GITHUB_OAUTH_CLIENT,
      redirect_uri: `${API_URI}/oauth/github/callback`,
      response_type: 'code',
      scope: 'user:email',
    });

    return res.redirect(`https://github.com/login/oauth/authorize?${OAUTH_QS.toString()}`);
  }

  @Get('callback')
  @CatchAsync
  public async callback(req: Request, res: Response, _next: NextFunction) {
    if (!GITHUB_OAUTH_ENABLED) {
      return res.status(404).json({error: 'GitHub OAuth is not configured'});
    }
    const {code} = req.query;

    if (!code || typeof code !== 'string') {
      return res.redirect(DASHBOARD_URI + '/auth/login?message=Invalid OAuth callback');
    }

    const data = new URLSearchParams({
      client_id: GITHUB_OAUTH_CLIENT,
      client_secret: GITHUB_OAUTH_SECRET,
      code: code as string,
      redirect_uri: `${API_URI}/oauth/github/callback`,
    });

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {'Content-type': 'application/x-www-form-urlencoded', 'Accept': 'application/json'},
      body: data,
    }).then(res => res.json());

    if (!tokenResponse.access_token || !tokenResponse.token_type) {
      return res.redirect(DASHBOARD_URI + '/auth/login?message=Failed to authenticate with GitHub');
    }

    const emails = await fetch(`https://api.github.com/user/emails`, {
      headers: {Authorization: `${tokenResponse.token_type} ${tokenResponse.access_token}`},
    }).then(res => res.json());

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.redirect(DASHBOARD_URI + '/auth/login?message=Failed to retrieve emails from GitHub');
    }

    const primaryEmail = emails.find((e: {primary: boolean; email: string}) => e.primary);

    if (!primaryEmail || !primaryEmail.email || typeof primaryEmail.email !== 'string') {
      return res.redirect(DASHBOARD_URI + '/auth/login?message=Failed to retrieve primary email from GitHub');
    }

    const email = primaryEmail.email;

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
          type: 'GITHUB_OAUTH',
          emailVerified: true,
        },
      });
      isNewUser = true;
    }

    if (user.type !== 'GITHUB_OAUTH') {
      return res.redirect(DASHBOARD_URI + '/auth/login?message=You used another form of authentication');
    }

    // Send notification if this is a new user
    if (isNewUser) {
      await NtfyService.notifyUserOAuthSignup(user.email, user.id, 'GitHub');
    }

    const token = jwt.sign(user.id);
    UserService.setAuthCookie(res, token).redirect(DASHBOARD_URI);
  }
}
