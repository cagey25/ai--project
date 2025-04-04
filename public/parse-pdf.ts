import { NextApiRequest, NextApiResponse } from 'next';
import pdfParse from 'pdf-parse';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { pdfBuffer } = req.body;

    if (!pdfBuffer) {
      return res.status(400).json({ error: 'No PDF buffer provided' });
    }

    // Convert the array back to a Buffer
    const buffer = Buffer.from(pdfBuffer);
    const data = await pdfParse(buffer);

    res.status(200).json({ text: data.text });
  } catch (error) {
    console.error('Error parsing PDF:', error);
    res.status(500).json({ error: 'Failed to parse PDF', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}