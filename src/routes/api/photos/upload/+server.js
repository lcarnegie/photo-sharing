
import { json } from '@sveltejs/kit';
import { uploadPhoto } from '$lib/server/azure';

export async function POST({ request, url }) {
    try {
        const formData = await request.formData();
        const file = formData.get('photo');
        const uploader = formData.get('uploader');
        const eventSlug = formData.get('eventSlug');

        if (!file || !eventSlug) {
            return json({ message: 'Missing file or eventSlug' }, { status: 400 });
        }

        if (file.size > 50 * 1024 * 1024) { // 50MB
            return json({ message: 'File too large' }, { status: 400 });
        }

        const photo = await uploadPhoto(eventSlug, file, uploader || 'Anonymous');
        return json({ status: 'success', photo });
    } catch (e) {
        console.error(e);
        return json({ message: 'Upload failed', error: e.message }, { status: 500 });
    }
}
