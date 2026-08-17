import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Forward,
  Info,
  Mail,
  Server,
  Shield,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import type {EmailVerificationResult as VerificationResult} from '@plunk/types';

interface EmailVerificationResultProps {
  result: VerificationResult;
}

export function EmailVerificationResult({result}: EmailVerificationResultProps) {
  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <div
        className={`rounded-lg border-2 p-6 ${
          result.valid ? 'border-ok/25 bg-ok-surface' : 'border-err/25 bg-err-surface'
        }`}
      >
        <div className="flex items-center gap-3">
          {result.valid ? (
            <CheckCircle className="h-8 w-8 text-ok" />
          ) : (
            <XCircle className="h-8 w-8 text-err" />
          )}
          <div>
            <h3 className={`text-xl font-semibold ${result.valid ? 'text-ok' : 'text-err'}`}>
              {result.valid ? 'Valid Email' : 'Invalid Email'}
            </h3>
            <p className={`text-ui ${result.valid ? 'text-ok' : 'text-err'}`}>{result.email}</p>
          </div>
        </div>
      </div>

      {/* Detailed Checks */}
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
          <h4 className="font-semibold text-neutral-900">Verification Details</h4>
        </div>
        <div className="divide-y divide-neutral-200">
          {/* Domain Exists */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Server className="h-5 w-5 text-neutral-600" />
              <div>
                <p className="font-medium text-neutral-900">Domain Exists</p>
                <p className="text-ui text-neutral-600">Domain has nameservers (NS records)</p>
              </div>
            </div>
            {result.domainExists ? (
              <CheckCircle className="h-5 w-5 text-ok" />
            ) : (
              <XCircle className="h-5 w-5 text-err" />
            )}
          </div>

          {/* MX Records */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-neutral-600" />
              <div>
                <p className="font-medium text-neutral-900">MX Records</p>
                <p className="text-ui text-neutral-600">Mail server configured</p>
              </div>
            </div>
            {result.hasMxRecords ? (
              <CheckCircle className="h-5 w-5 text-ok" />
            ) : (
              <XCircle className="h-5 w-5 text-err" />
            )}
          </div>

          {/* Website/A Records */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Server className="h-5 w-5 text-neutral-600" />
              <div>
                <p className="font-medium text-neutral-900">Has Website</p>
                <p className="text-ui text-neutral-600">DNS A/AAAA records found</p>
              </div>
            </div>
            {result.hasWebsite ? (
              <CheckCircle className="h-5 w-5 text-ok" />
            ) : (
              <Info className="h-5 w-5 text-neutral-500" />
            )}
          </div>

          {/* Disposable Email */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-neutral-600" />
              <div>
                <p className="font-medium text-neutral-900">Disposable Email</p>
                <p className="text-ui text-neutral-600">Temporary email service</p>
              </div>
            </div>
            {result.isDisposable ? (
              <AlertTriangle className="h-5 w-5 text-warn" />
            ) : (
              <CheckCircle className="h-5 w-5 text-ok" />
            )}
          </div>

          {/* Personal Email */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-neutral-600" />
              <div>
                <p className="font-medium text-neutral-900">Personal Email</p>
                <p className="text-ui text-neutral-600">Free email provider (Gmail, Hotmail, etc.)</p>
              </div>
            </div>
            {result.isPersonalEmail ? (
              <Info className="h-5 w-5 text-neutral-900" />
            ) : (
              <span className="text-ui text-neutral-500">No</span>
            )}
          </div>

          {/* Alias/Forwarding Email */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Forward className="h-5 w-5 text-neutral-600" />
              <div>
                <p className="font-medium text-neutral-900">Forwarding Service</p>
                <p className="text-ui text-neutral-600">Email alias/forwarding detected</p>
              </div>
            </div>
            {result.isAlias ? (
              <Info className="h-5 w-5 text-neutral-900" />
            ) : (
              <CheckCircle className="h-5 w-5 text-ok" />
            )}
          </div>

          {/* Typo Detection */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-neutral-600" />
              <div>
                <p className="font-medium text-neutral-900">Typo Check</p>
                <p className="text-ui text-neutral-600">Common spelling errors</p>
              </div>
            </div>
            {result.isTypo ? (
              <AlertTriangle className="h-5 w-5 text-warn" />
            ) : (
              <CheckCircle className="h-5 w-5 text-ok" />
            )}
          </div>

          {/* Plus Addressing */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-neutral-600" />
              <div>
                <p className="font-medium text-neutral-900">Plus Addressing</p>
                <p className="text-ui text-neutral-600">Uses + tag (user+tag@domain.com)</p>
              </div>
            </div>
            {result.isPlusAddressed ? (
              <Info className="h-5 w-5 text-neutral-900" />
            ) : (
              <span className="text-ui text-neutral-500">No</span>
            )}
          </div>
        </div>
      </div>

      {/* Suggested Email (if typo detected) */}
      {result.suggestedEmail && (
        <div className="rounded-lg border border-warn/25 bg-warn-surface p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warn mt-0.5" />
            <div>
              <p className="font-medium text-warn">Did you mean?</p>
              <p className="text-ui text-warn mt-1">
                <span className="font-mono bg-warn-surface px-2 py-0.5 rounded">{result.suggestedEmail}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reasons */}
      {result.reasons && result.reasons.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h4 className="font-semibold text-neutral-900 mb-3">Analysis</h4>
          <ul className="space-y-2">
            {result.reasons.map((reason, index) => (
              <li key={index} className="flex items-start gap-2 text-ui text-neutral-700 list-disc list-inside">
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
