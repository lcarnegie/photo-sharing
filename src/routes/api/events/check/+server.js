
import { json } from '@sveltejs/kit';
import { getEvent } from '$lib/server/azure';

export async function POST({ request }) {
    const { slug } = await request.json();

    if (!slug) {
        return json({ exists: false }, { status: 400 });
    }

    try {
        const event = await getEvent(slug);
        if (event) {
            // Also check if expired
            const isExpired = new Date(event.expiresAt) < new Date();
            if (isExpired) {
                return json({ exists: false, message: 'Event expired' });
            }
            return json({ exists: true, slug: event.rowKey });
        }
        return json({ exists: false });
    } catch (e) {
        console.error(e);
        return json({ exists: false }, { status: 500 });
    }
}
