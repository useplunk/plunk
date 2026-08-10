import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@plunk/ui';
import {Mail, Server} from 'lucide-react';
import {ApiKeyDisplay} from './ApiKeyDisplay';
import {useActiveProject} from '../lib/contexts/ActiveProjectProvider';

interface SmtpSettingsProps {
  smtpConfig: {
    enabled: boolean;
    domain?: string;
    portSecure?: number;
    portSubmission?: number;
  };
}

export function SmtpSettings({smtpConfig}: SmtpSettingsProps) {
  const {activeProject} = useActiveProject();

  if (!smtpConfig.enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            SMTP server
          </CardTitle>
          <CardDescription>SMTP server is not configured on this instance</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-600">
            The SMTP relay server is not enabled. Contact your administrator to enable SMTP support for sending emails
            via standard mail clients.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isDevelopment = smtpConfig.domain === 'localhost';

  return (
    <div className="space-y-6">
      {isDevelopment && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-900 text-base flex items-center gap-2">
              <Server className="h-4 w-4" />
              Development mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-800">
              SMTP server is running in development mode without TLS encryption. Only use for local testing. For
              production, configure the <code className="bg-yellow-100 px-1 py-0.5 rounded text-xs">SMTP_DOMAIN</code>{' '}
              environment variable and mount TLS certificates.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            SMTP server configuration
          </CardTitle>
          <CardDescription>
            Send through any SMTP client — Outlook, Thunderbird, or your own.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Server Details */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-700 block mb-2">SMTP server</label>
                <code className="flex-1 px-3 py-2 bg-neutral-50 rounded-lg text-xs font-mono text-neutral-900 border border-neutral-200 block">
                  {smtpConfig.domain}
                </code>
                <p className="text-xs text-neutral-500 mt-1">Use this hostname in your email client configuration</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-neutral-700 block mb-2">
                    Port (STARTTLS)
                    <span className="ml-2 text-xs font-normal text-neutral-500">
                      {isDevelopment ? 'Plaintext in dev' : 'Recommended'}
                    </span>
                  </label>
                  <code className="flex-1 px-3 py-2 bg-neutral-50 rounded-lg text-xs font-mono text-neutral-900 border border-neutral-200 block">
                    {smtpConfig.portSubmission}
                  </code>
                  <p className="text-xs text-neutral-500 mt-1">
                    {isDevelopment
                      ? 'Runs without encryption in development'
                      : 'Submission port with STARTTLS encryption'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-700 block mb-2">
                    Port (SSL/TLS)
                    {isDevelopment && (
                      <span className="ml-2 text-xs font-normal text-neutral-500">Not available in dev</span>
                    )}
                  </label>
                  <code className="flex-1 px-3 py-2 bg-neutral-50 rounded-lg text-xs font-mono text-neutral-900 border border-neutral-200 block">
                    {smtpConfig.portSecure}
                  </code>
                  <p className="text-xs text-neutral-500 mt-1">
                    {isDevelopment ? 'Requires TLS certificates in production' : 'Implicit TLS encryption'}
                  </p>
                </div>
              </div>
            </div>

            {/* Credentials */}
            <div className="pt-4 border-t border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-900 mb-4">Authentication credentials</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-neutral-700 block mb-2">Username</label>
                  <code className="flex-1 px-3 py-2 bg-neutral-50 rounded-lg text-xs font-mono text-neutral-900 border border-neutral-200 block">
                    plunk
                  </code>
                  <p className="text-xs text-neutral-500 mt-1">Always use &quot;plunk&quot; as the username</p>
                </div>

                {activeProject && (
                  <ApiKeyDisplay
                    label="Password"
                    value={activeProject.secret}
                    description="Use your project secret key as the SMTP password"
                    isSecret
                  />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
