import React from 'react';
import {GuideLayout, InfoBox} from '../../components/guides';
import {CodeBlock} from '../../components/CodeBlock';
import Link from 'next/link';

export default function EmailAPIGuide() {
  return (
    <GuideLayout
      title="What is an Email API? Complete Guide with Code Examples | Plunk"
      description="An email API lets you send, receive, and manage emails programmatically. Learn how they work, see code examples in Node.js, Python, PHP, Ruby, and Go, and choose the right provider."
      lastUpdated="2025-12-20"
      readTime="12 min"
      canonical="https://www.useplunk.com/guides/email-api-guide"
    >
      {/* Introduction */}
      <section id="introduction" className="mb-12">
        <p className="text-neutral-700 leading-relaxed">
          Email APIs allow developers to programmatically send, receive, and manage emails from applications. Whether
          you're sending order confirmations, password resets, or marketing campaigns, email APIs provide a reliable,
          scalable way to integrate email into your software.
        </p>
        <p className="mt-4 text-neutral-700 leading-relaxed">
          This guide covers everything you need to know: how email APIs work, implementation examples in multiple
          languages, best practices, and choosing the right provider.
        </p>
      </section>

      {/* What is an Email API */}
      <section id="what-is-email-api" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">What is an Email API?</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          An email API is a programmatic interface that lets you send and manage emails via HTTP requests instead of
          manually configuring SMTP servers. APIs abstract away the complexity of email delivery, providing simple HTTP
          endpoints to send emails and webhooks to track delivery status.
        </p>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">SMTP (Traditional)</h3>
              <ul className="space-y-2 text-ui text-neutral-700">
                <li>• Direct protocol for sending email</li>
                <li>• Requires managing connections</li>
                <li>• Manual error handling</li>
                <li>• Limited delivery tracking</li>
                <li>• More complex implementation</li>
                <li>• Port 25, 587, or 465</li>
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">Email API (Modern)</h3>
              <ul className="space-y-2 text-ui text-neutral-700">
                <li>• HTTP-based RESTful interface</li>
                <li>• No connection management needed</li>
                <li>• Structured error responses</li>
                <li>• Built-in tracking & analytics</li>
                <li>• Simpler to implement</li>
                <li>• Standard HTTP/HTTPS</li>
              </ul>
            </div>
          </div>
        </div>

        <InfoBox type="tip" title="When to Use Email APIs">
          <p>
            Email APIs are ideal for transactional emails (order confirmations, password resets), automated
            notifications, and programmatic campaigns. If you're building software that sends emails, APIs are almost
            always the better choice over SMTP.
          </p>
        </InfoBox>
      </section>

      {/* How Email APIs Work */}
      <section id="how-it-works" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">How Email APIs Work</h2>

        <div className="space-y-6">
          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">1. Authentication</h3>
            <p className="text-neutral-700">
              You authenticate requests using an API key (usually passed in headers). This identifies your account and
              authorizes API access.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">2. Make HTTP Request</h3>
            <p className="text-neutral-700">
              Send a POST request to the API endpoint with email details (recipient, subject, body, etc.) as JSON.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">3. API Validates & Queues</h3>
            <p className="text-neutral-700">
              The API validates your request, queues the email for delivery, and returns a response with the email ID
              and status.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">4. Email Delivery</h3>
            <p className="text-neutral-700">
              The service handles SMTP connections, retry logic, and delivery to the recipient's mail server.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">5. Webhooks & Tracking</h3>
            <p className="text-neutral-700">
              You receive webhook notifications for delivery events (delivered, bounced, opened, clicked) and can query
              the API for email status.
            </p>
          </div>
        </div>
      </section>

      {/* Code Examples */}
      <section id="examples" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Email API Code Examples</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          Here's how to send an email using Plunk's API in various languages:
        </p>

        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-4">JavaScript / Node.js</h3>
            <CodeBlock
              language="javascript"
              title="Node.js Example"
              code={`// Using fetch (Node.js 18+ or with node-fetch)
const response = await fetch('https://next-api.useplunk.com/v1/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Welcome to our platform!',
    body: '<h1>Welcome!</h1><p>Thanks for signing up.</p>',
    // Optional fields
    from: 'noreply@yourdomain.com',
    name: 'Your Company',
    replyTo: 'support@yourdomain.com'
  })
});

const data = await response.json();

if (response.ok) {
  console.log('Email sent!', data.emailId);
} else {
  console.error('Failed to send:', data.error);
}`}
            />
          </div>

          <div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-4">Python</h3>
            <CodeBlock
              language="python"
              title="Python Example"
              code={`import requests

response = requests.post(
    'https://next-api.useplunk.com/v1/send',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY'
    },
    json={
        'to': 'user@example.com',
        'subject': 'Welcome to our platform!',
        'body': '<h1>Welcome!</h1><p>Thanks for signing up.</p>',
        'from': 'noreply@yourdomain.com',
        'name': 'Your Company'
    }
)

if response.status_code == 200:
    data = response.json()
    print(f"Email sent! ID: {data['emailId']}")
else:
    print(f"Error: {response.json()['error']}")`}
            />
          </div>

          <div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-4">PHP</h3>
            <CodeBlock
              language="php"
              title="PHP Example"
              code={`<?php
$ch = curl_init('https://next-api.useplunk.com/v1/send');

curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer YOUR_API_KEY'
]);

curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'to' => 'user@example.com',
    'subject' => 'Welcome to our platform!',
    'body' => '<h1>Welcome!</h1><p>Thanks for signing up.</p>',
    'from' => 'noreply@yourdomain.com',
    'name' => 'Your Company'
]));

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$data = json_decode($response, true);

if ($httpCode === 200) {
    echo "Email sent! ID: " . $data['emailId'];
} else {
    echo "Error: " . $data['error'];
}
?>`}
            />
          </div>

          <div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-4">Ruby</h3>
            <CodeBlock
              language="ruby"
              title="Ruby Example"
              code={`require 'net/http'
require 'json'

uri = URI('https://next-api.useplunk.com/v1/send')
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true

request = Net::HTTP::Post.new(uri.path)
request['Content-Type'] = 'application/json'
request['Authorization'] = 'Bearer YOUR_API_KEY'
request.body = {
  to: 'user@example.com',
  subject: 'Welcome to our platform!',
  body: '<h1>Welcome!</h1><p>Thanks for signing up.</p>',
  from: 'noreply@yourdomain.com',
  name: 'Your Company'
}.to_json

response = http.request(request)
data = JSON.parse(response.body)

if response.code.to_i == 200
  puts "Email sent! ID: #{data['emailId']}"
else
  puts "Error: #{data['error']}"
end`}
            />
          </div>

          <div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-4">Go</h3>
            <CodeBlock
              language="go"
              title="Go Example"
              code={`package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

type EmailRequest struct {
    To      string \`json:"to"\`
    Subject string \`json:"subject"\`
    Body    string \`json:"body"\`
    From    string \`json:"from"\`
    Name    string \`json:"name"\`
}

func main() {
    email := EmailRequest{
        To:      "user@example.com",
        Subject: "Welcome to our platform!",
        Body:    "<h1>Welcome!</h1><p>Thanks for signing up.</p>",
        From:    "noreply@yourdomain.com",
        Name:    "Your Company",
    }

    jsonData, _ := json.Marshal(email)

    req, _ := http.NewRequest("POST", "https://next-api.useplunk.com/v1/send", bytes.NewBuffer(jsonData))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer YOUR_API_KEY")

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)

    if resp.StatusCode == 200 {
        var result map[string]interface{}
        json.Unmarshal(body, &result)
        fmt.Printf("Email sent! ID: %v\\n", result["emailId"])
    } else {
        fmt.Println("Error:", string(body))
    }
}`}
            />
          </div>
        </div>
      </section>

      {/* Common Features */}
      <section id="features" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Common Email API Features</h2>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">Sending Features</h3>
              <ul className="space-y-2 text-ui text-neutral-700">
                <li>• Send individual or batch emails</li>
                <li>• HTML and plain text support</li>
                <li>• Attachments</li>
                <li>• CC, BCC recipients</li>
                <li>• Custom headers</li>
                <li>• Template rendering</li>
                <li>• Scheduled sending</li>
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">Tracking & Analytics</h3>
              <ul className="space-y-2 text-ui text-neutral-700">
                <li>• Delivery status tracking</li>
                <li>• Open tracking</li>
                <li>• Click tracking</li>
                <li>• Bounce detection</li>
                <li>• Spam complaint monitoring</li>
                <li>• Unsubscribe management</li>
                <li>• Real-time analytics</li>
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">Webhooks & Events</h3>
              <ul className="space-y-2 text-ui text-neutral-700">
                <li>• Delivery notifications</li>
                <li>• Bounce notifications</li>
                <li>• Spam complaint alerts</li>
                <li>• Unsubscribe events</li>
                <li>• Open and click events</li>
                <li>• Custom event triggers</li>
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">Management Features</h3>
              <ul className="space-y-2 text-ui text-neutral-700">
                <li>• Suppression list management</li>
                <li>• Contact management</li>
                <li>• Domain verification</li>
                <li>• Template management</li>
                <li>• API key management</li>
                <li>• Rate limiting</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Best Practices */}
      <section id="best-practices" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Email API Best Practices</h2>

        <div className="space-y-4">
          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              1
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Secure Your API Keys</h3>
              <p className="text-neutral-700">
                Store API keys in environment variables, never in code. Use separate keys for development, staging, and
                production. Rotate keys periodically and immediately if compromised.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              2
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Implement Proper Error Handling</h3>
              <p className="text-neutral-700 mb-3">Handle different HTTP status codes appropriately:</p>
              <ul className="list-disc list-inside space-y-1 text-ui text-neutral-700">
                <li>200: Success</li>
                <li>400-499: Client errors (bad request, validation failed) - don't retry</li>
                <li>500-599: Server errors - retry with exponential backoff</li>
                <li>429: Rate limit exceeded - back off and retry later</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              3
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Use Webhooks for Delivery Status</h3>
              <p className="text-neutral-700">
                Don't poll the API for email status. Set up webhooks to receive real-time delivery notifications
                (delivered, bounced, opened, clicked). This is more efficient and provides faster updates.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              4
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Respect Rate Limits</h3>
              <p className="text-neutral-700">
                Implement rate limiting in your code to stay within API limits. Queue emails and send in batches. Use
                exponential backoff when you receive 429 rate limit errors.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              5
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Validate Email Addresses</h3>
              <p className="text-neutral-700">
                Validate email format before making API calls. Check for common typos. Consider using email validation
                APIs to verify deliverability before sending.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              6
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Use Templates</h3>
              <p className="text-neutral-700">
                Store email templates in your email service provider rather than hardcoding HTML in your application.
                This allows non-developers to update email content without code changes.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              7
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Monitor Deliverability Metrics</h3>
              <p className="text-neutral-700">
                Track bounce rates, spam complaints, and engagement metrics. Set up alerts for anomalies. Address
                deliverability issues proactively.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              8
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Test in Sandbox/Development Mode</h3>
              <p className="text-neutral-700">
                Use sandbox or test mode during development. Test error scenarios, retry logic, and webhook handling
                before deploying to production.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              9
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Log API Requests & Responses</h3>
              <p className="text-neutral-700">
                Log all API interactions (but redact sensitive data like API keys). This helps debug issues and
                understand email sending patterns.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              10
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Handle Timeouts</h3>
              <p className="text-neutral-700">
                Set appropriate timeouts for API requests (typically 10-30 seconds). Don't block user requests waiting
                for email API responses—queue emails asynchronously if needed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Choosing a Provider */}
      <section id="choosing-provider" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Choosing an Email API Provider</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          Consider these factors when selecting an email API provider:
        </p>

        <div className="space-y-6">
          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">Deliverability Reputation</h3>
            <p className="text-neutral-700">
              Choose providers with strong deliverability rates and sender reputation. Poor deliverability means your
              emails land in spam, defeating the purpose.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">Feature Set</h3>
            <p className="text-neutral-700">
              Ensure the API supports your needs: templates, webhooks, analytics, scheduling, attachments, etc. Some
              providers specialize in transactional emails, others in marketing.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">Pricing Model</h3>
            <p className="text-neutral-700">
              Understand pricing: per-email charges, monthly tiers, overage fees. Calculate costs for your expected
              volume. Watch for hidden fees and price increases at higher volumes.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">Developer Experience</h3>
            <p className="text-neutral-700">
              Good documentation, SDKs in your language, clear error messages, and responsive support make
              implementation much easier.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">Scalability & Reliability</h3>
            <p className="text-neutral-700">
              Can the provider handle your peak volumes? What's their uptime guarantee (SLA)? Do they have redundancy
              and failover systems?
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">Compliance & Security</h3>
            <p className="text-neutral-700">
              Ensure the provider complies with GDPR, CAN-SPAM, and other relevant regulations. Check their security
              certifications (SOC 2, ISO 27001).
            </p>
          </div>
        </div>
      </section>

      {/* Related Guides */}
      <section id="related-guides" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Related Email Guides</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/guides/transactional-vs-marketing-email"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Transactional vs Marketing Email</h3>
              <p className="text-ui text-neutral-600">Understand email types for APIs.</p>
            </div>
          </Link>
          <Link
            href="/guides/email-deliverability"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Email Deliverability</h3>
              <p className="text-ui text-neutral-600">Ensure API-sent emails reach the inbox.</p>
            </div>
          </Link>
          <Link
            href="/guides/email-sender-reputation"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Email Sender Reputation</h3>
              <p className="text-ui text-neutral-600">Maintain good sender reputation.</p>
            </div>
          </Link>
        </div>
      </section>
    </GuideLayout>
  );
}
