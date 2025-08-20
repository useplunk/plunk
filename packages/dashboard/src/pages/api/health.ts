import type { NextApiRequest, NextApiResponse } from 'next'

import { network } from './../../lib/network'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Timeout'));
      }, 2000);
    });

    const healthPromise = network.fetch("GET", "/api/health");

    await Promise.race([healthPromise, timeoutPromise]);

    return res.status(200).json({ message: 'OK' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
