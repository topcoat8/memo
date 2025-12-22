export default function handler(req, res) {
    if (req.method === 'POST') {
        const { message, stack, type, info, url, userAgent } = req.body;

        // Log to Vercel's server-side logs
        console.error(JSON.stringify({
            level: 'error',
            timestamp: new Date().toISOString(),
            type: type || 'client-error',
            message,
            stack,
            info,
            url,
            userAgent
        }));

        return res.status(200).json({ status: 'ok' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
