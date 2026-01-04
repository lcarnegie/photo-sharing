
import { error } from '@sveltejs/kit';
import { getEvent, getPhotos } from '$lib/server/azure';

export async function load({ params }) {
    const { eventSlug } = params;

    try {
        const event = await getEvent(eventSlug);

        if (!event) {
            throw error(404, 'Event not found');
        }

        // Check expiry
        if (new Date(event.expiresAt) < new Date()) {
            throw error(410, 'This event has expired and photos have been deleted.');
        }

        const photos = await getPhotos(eventSlug);

        return {
            event,
            photos
        };
    } catch (e) {
        if (e.status === 404 || e.status === 410) throw e;
        console.error(e);
        throw error(500, 'Error loading event');
    }
}
