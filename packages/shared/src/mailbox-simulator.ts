/**
 * The Amazon SES mailbox simulator. Mail addressed here never leaves AWS: the simulator
 * answers with whatever outcome the local part asks for (`bounce@`, `complaint@`,
 * `success@`, `ooto@`, `suppressionlist@`), which is how senders rehearse their bounce
 * handling without harming anyone's reputation.
 *
 * https://docs.aws.amazon.com/ses/latest/dg/send-an-email-from-console.html
 */
export const MAILBOX_SIMULATOR_DOMAIN = 'simulator.amazonses.com';

/**
 * Whether an address belongs to the SES mailbox simulator.
 *
 * Matching is on the exact domain, so labelled addresses such as
 * `bounce+test@simulator.amazonses.com` -- the documented way to tell several simulated
 * bounces apart -- are recognised, while a lookalike domain that merely ends in the same
 * text (`simulator.amazonses.com.example.org`) is not.
 */
export function isMailboxSimulatorAddress(address: string | null | undefined): boolean {
  if (!address) {
    return false;
  }

  const at = address.lastIndexOf('@');

  if (at === -1) {
    return false;
  }

  return address.slice(at + 1).trim().toLowerCase() === MAILBOX_SIMULATOR_DOMAIN;
}
