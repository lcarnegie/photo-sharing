
import { json } from '@sveltejs/kit';
import { createEvent, getEvent } from '$lib/server/azure';

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')     // Replace spaces with -
        .replace(/[^\w-]+/g, '')  // Remove all non-word chars
        .replace(/--+/g, '-');    // Replace multiple - with single -
}

export async function POST({ request }) {
    const { name } = await request.json();

    if (!name) {
        return json({ message: 'Name is required' }, { status: 400 });
    }

    let slug = slugify(name);
    if (!slug) slug = 'event-' + Math.random().toString(36).substring(7);

    try {
        // Simple collision resolution (append random)
        const existing = await getEvent(slug);
        if (existing) {
            slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
        }

        const event = await createEvent(slug, name);
        return json({ slug: event.rowKey, expiresAt: event.expiresAt });
    } catch (e) {
        console.error(e);
        return json({ message: e.message || 'Failed to create event' }, { status: 500 });
    }
}
