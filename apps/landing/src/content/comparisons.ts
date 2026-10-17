/**
 * Every /vs page. The index renders it as the same editorial list the homepage uses for the five
 * it features: name, what the tool is, arrow. The old cards added a sales line
 * and three mono feature tags each, which made sixteen cards of near-identical
 * noise; what a visitor is scanning for here is their own tool's name.
 */
export const COMPARISONS: {name: string; slug: string; category: string}[] = [
  {name: 'Resend', slug: 'resend', category: 'Transactional email API'},
  {name: 'SendGrid', slug: 'sendgrid', category: 'Email API and marketing platform'},
  {name: 'Mailgun', slug: 'mailgun', category: 'Email API for developers'},
  {name: 'Mailchimp', slug: 'mailchimp', category: 'Marketing email platform'},
  {name: 'Postmark', slug: 'postmark', category: 'Transactional email service'},
  {name: 'Customer.io', slug: 'customerio', category: 'Behavioural messaging platform'},
  {name: 'Loops', slug: 'loops', category: 'Email for software companies'},
  {name: 'Brevo', slug: 'brevo', category: 'Marketing and CRM suite'},
  {name: 'Kit (ConvertKit)', slug: 'convertkit', category: 'Email for creators'},
  {name: 'ActiveCampaign', slug: 'activecampaign', category: 'Marketing automation and CRM'},
  {name: 'MailerLite', slug: 'mailerlite', category: 'Newsletters and marketing email'},
  {name: 'Klaviyo', slug: 'klaviyo', category: 'E-commerce marketing platform'},
  {name: 'Bento', slug: 'bento', category: 'Email marketing and automation'},
  {name: 'Mailjet', slug: 'mailjet', category: 'Email API and newsletters'},
  {name: 'Buttondown', slug: 'buttondown', category: 'Newsletter publishing'},
  {name: 'Amazon SES', slug: 'amazon-ses', category: 'Raw sending infrastructure'},
  {name: 'useSend', slug: 'usesend', category: 'Open-source email API'},
];
