import {Controller, Get, Post} from '@overnightjs/core';
import {AuthenticationSchemas} from '@plunk/shared';
import {EmailVerificationEmail, PasswordResetEmail, sendPlatformEmail} from '@plunk/email';
import {randomBytes} from 'node:crypto';
import type {NextFunction, Request, Response} from 'express';
import * as React from 'react';

import {
  DASHBOARD_URI,
  DISABLE_SIGNUPS,
  EMAIL_VERIFICATION_RATE_LIMIT,
  EMAIL_VERIFICATION_RATE_WINDOW,
  GITHUB_OAUTH_ENABLED,
  GOOGLE_OAUTH_ENABLED,
  LANDING_URI,
  PASSWORD_RESET_RATE_LIMIT,
  PLUNK_ENABLED,
  TOKEN_EXPIRY_SECONDS,
  VERIFY_EMAIL_ON_SIGNUP,
} from '../app/constants.js';
import {prisma} from '../database/prisma.js';
import {redis, REDIS_ONE_MINUTE} from '../database/redis.js';
import {BadRequest, NotAuthenticated, RateLimitError} from '../exceptions/index.js';
import {jwt, parseJwt} from '../middleware/auth.js';
import {AuthService} from '../services/AuthService.js';
import {EmailVerificationService} from '../services/EmailVerificationService.js';
import {NtfyService} from '../services/NtfyService.js';
import {UserService} from '../services/UserService.js';
import {Keys} from '../services/keys.js';
import {CatchAsync} from '../utils/asyncHandler.js';

@Controller('auth')
export class Auth {
  @Post('login')
  @CatchAsync
  public async login(req: Request, res: Response, _next: NextFunction) {
    const {email, password} = AuthenticationSchemas.login.parse(req.body);

    const user = await UserService.email(email);

    if (!user) {
      return res.json({success: false, data: 'Incorrect email or password'});
    }

    if (user.type === 'PASSWORD' && !user.password) {
      return res.json({success: 'redirect', redirect: `/auth/reset?id=${user.id}`});
    }

    const verified = await AuthService.verifyCredentials(email, password);

    if (!verified) {
      return res.json({success: false, data: 'Incorrect email or password'});
    }

    await redis.set(Keys.User.id(user.id), JSON.stringify(user), 'EX', REDIS_ONE_MINUTE * 60);

    const token = jwt.sign(user.id);
    const cookie = UserService.cookieOptions();

    return res
      .cookie(UserService.COOKIE_NAME, token, cookie)
      .json({success: true, data: {id: user.id, email: user.email}});
  }

  @Post('signup')
  @CatchAsync
  public async signup(req: Request, res: Response, _next: NextFunction) {
    // Check if signups are disabled
    if (DISABLE_SIGNUPS) {
      return res.json({
        success: false,
        data: 'New user signups are currently disabled',
      });
    }

    const {email, password} = AuthenticationSchemas.login.parse(req.body);

    // Verify email is valid and not disposable/plus-addressed (if verification enabled)
    if (VERIFY_EMAIL_ON_SIGNUP) {
      const verification = await EmailVerificationService.verifyEmail(email);

      if (
        verification.isDisposable ||
        verification.isPlusAddressed ||
        !verification.domainExists ||
        !verification.hasMxRecords
      ) {
        // Build list of reasons for notification
        const reasons: string[] = [];
        if (verification.isDisposable) reasons.push('disposable email');
        if (verification.isPlusAddressed) reasons.push('plus addressing');
        if (!verification.domainExists) reasons.push('domain does not exist');
        if (!verification.hasMxRecords) reasons.push('no MX records');

        // Send notification about failed signup attempt
        await NtfyService.notifyFailedSignupAttempt(email, reasons);

        return res.json({
          success: false,
          data: 'This email address cannot be used for signup',
        });
      }
    }

    const user = await UserService.email(email);

    if (user) {
      return res.json({
        success: false,
        data: 'That email is already associated with another user',
      });
    }

    const created_user = await prisma.user.create({
      data: {
        email,
        password: await AuthService.generateHash(password),
        type: 'PASSWORD',
        // Auto-verify email if platform emails are disabled
        emailVerified: !PLUNK_ENABLED,
      },
    });

    await redis.set(Keys.User.id(created_user.id), JSON.stringify(created_user), 'EX', REDIS_ONE_MINUTE * 60);

    // Send notification about new user signup
    await NtfyService.notifyUserSignup(created_user.email, created_user.id);

    // Send email verification if platform emails are enabled
    if (PLUNK_ENABLED) {
      const verificationToken = randomBytes(32).toString('hex');
      await redis.setex(
        Keys.User.emailVerificationToken(verificationToken),
        TOKEN_EXPIRY_SECONDS,
        JSON.stringify({userId: created_user.id, email: created_user.email, createdAt: Date.now()}),
      );

      const verificationUrl = `${DASHBOARD_URI}/auth/verify-email?token=${verificationToken}`;
      await sendPlatformEmail(
        created_user.email,
        'Verify your email address',
        React.createElement(EmailVerificationEmail, {
          email: created_user.email,
          verificationUrl,
          landingUrl: LANDING_URI,
        }),
      );
    }

    const token = jwt.sign(created_user.id);
    const cookie = UserService.cookieOptions();

    return res.cookie(UserService.COOKIE_NAME, token, cookie).json({
      success: true,
      data: {id: created_user.id, email: created_user.email},
    });
  }

  @Get('logout')
  public logout(req: Request, res: Response) {
    res.cookie(UserService.COOKIE_NAME, '', UserService.cookieOptions(new Date()));
    return res.json(true);
  }

  @Get('oauth-config')
  public oauthConfig(req: Request, res: Response) {
    return res.json({
      success: true,
      data: {
        github: GITHUB_OAUTH_ENABLED,
        google: GOOGLE_OAUTH_ENABLED,
      },
    });
  }

  @Post('verify-email')
  @CatchAsync
  public async verifyEmail(req: Request, res: Response, _next: NextFunction) {
    const {token} = AuthenticationSchemas.verifyEmail.parse(req.body);

    // Look up token in Redis
    const data = await redis.get(Keys.User.emailVerificationToken(token));

    if (!data) {
      throw new BadRequest('Invalid or expired verification token');
    }

    const {userId} = JSON.parse(data);

    // Update user
    await prisma.user.update({
      where: {id: userId},
      data: {emailVerified: true},
    });

    // Delete token (single use) and invalidate cache
    await redis.del(Keys.User.emailVerificationToken(token));
    await redis.del(Keys.User.id(userId));

    return res.json({success: true, data: {message: 'Email verified successfully'}});
  }

  @Post('request-verification')
  @CatchAsync
  public async requestVerification(req: Request, res: Response, _next: NextFunction) {
    const userId = parseJwt(req);
    const user = await UserService.id(userId);

    if (!user) {
      throw new NotAuthenticated();
    }

    if (user.emailVerified) {
      return res.json({success: true, data: {message: 'Email already verified'}});
    }

    // Check rate limit
    const rateLimitKey = Keys.User.emailVerificationRateLimit(userId);
    const count = await redis.get(rateLimitKey);

    if (count && parseInt(count) >= EMAIL_VERIFICATION_RATE_LIMIT) {
      throw new RateLimitError('Too many verification emails sent. Please try again later.');
    }

    // Generate token
    const token = randomBytes(32).toString('hex');
    await redis.setex(
      Keys.User.emailVerificationToken(token),
      TOKEN_EXPIRY_SECONDS,
      JSON.stringify({userId, email: user.email, createdAt: Date.now()}),
    );

    // Send email
    const verificationUrl = `${DASHBOARD_URI}/auth/verify-email?token=${token}`;
    await sendPlatformEmail(
      user.email,
      'Verify your email address',
      React.createElement(EmailVerificationEmail, {email: user.email, verificationUrl, landingUrl: LANDING_URI}),
    );

    // Increment rate limit
    if (count) {
      await redis.incr(rateLimitKey);
    } else {
      await redis.setex(rateLimitKey, EMAIL_VERIFICATION_RATE_WINDOW, '1');
    }

    return res.json({success: true, data: {message: 'Verification email sent'}});
  }

  @Post('request-password-reset')
  @CatchAsync
  public async requestPasswordReset(req: Request, res: Response, _next: NextFunction) {
    const {email} = AuthenticationSchemas.requestPasswordReset.parse(req.body);

    // Check rate limit
    const rateLimitKey = Keys.User.passwordResetRateLimit(email);
    const count = await redis.get(rateLimitKey);

    if (count && parseInt(count) >= PASSWORD_RESET_RATE_LIMIT) {
      // Still return success to prevent enumeration
      return res.json({success: true, data: {message: 'If that email exists, a reset link has been sent'}});
    }

    // Look up user
    const user = await UserService.email(email);

    // Only send email if user exists and is PASSWORD type
    if (user && user.type === 'PASSWORD') {
      const token = randomBytes(32).toString('hex');
      await redis.setex(
        Keys.User.passwordResetToken(token),
        TOKEN_EXPIRY_SECONDS,
        JSON.stringify({userId: user.id, email: user.email, createdAt: Date.now()}),
      );

      const resetUrl = `${DASHBOARD_URI}/auth/reset-password?token=${token}`;
      await sendPlatformEmail(
        user.email,
        'Reset your password',
        React.createElement(PasswordResetEmail, {email: user.email, resetUrl, landingUrl: LANDING_URI}),
      );

      // Increment rate limit
      if (count) {
        await redis.incr(rateLimitKey);
      } else {
        await redis.setex(rateLimitKey, EMAIL_VERIFICATION_RATE_WINDOW, '1');
      }
    }

    // Always return success (prevent enumeration)
    return res.json({success: true, data: {message: 'If that email exists, a reset link has been sent'}});
  }

  @Post('reset-password')
  @CatchAsync
  public async resetPassword(req: Request, res: Response, _next: NextFunction) {
    const {token, newPassword} = AuthenticationSchemas.resetPassword.parse(req.body);

    // Look up token
    const data = await redis.get(Keys.User.passwordResetToken(token));

    if (!data) {
      throw new BadRequest('Invalid or expired reset token');
    }

    const {userId} = JSON.parse(data);

    // Get user and verify type
    const user = await prisma.user.findUnique({where: {id: userId}});

    if (!user || user.type !== 'PASSWORD') {
      throw new BadRequest('Invalid reset token');
    }

    // Hash new password and update
    const hashedPassword = await AuthService.generateHash(newPassword);
    await prisma.user.update({
      where: {id: userId},
      data: {password: hashedPassword},
    });

    // Delete token and invalidate cache (id + email projections both cache the password hash)
    await redis.del(Keys.User.passwordResetToken(token));
    await redis.del(Keys.User.id(userId));
    if (user.email) {
      await redis.del(Keys.User.email(user.email));
    }

    return res.json({success: true, data: {message: 'Password reset successfully'}});
  }
}
