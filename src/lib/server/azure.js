
import { BlobServiceClient } from '@azure/storage-blob';
import { TableClient } from '@azure/data-tables';
import { v4 as uuidv4 } from 'uuid';
import { env } from '$env/dynamic/private';

// Environment variables must be set: AZURE_STORAGE_CONNECTION_STRING
const CONNECTION_STRING = env.AZURE_STORAGE_CONNECTION_STRING;
const IS_MOCK = !CONNECTION_STRING;

if (IS_MOCK) {
    console.warn("⚠️ NO AZURE CONNECTION STRING FOUND. RUNNING IN MOCK MODE.");
}

const EVENTS_TABLE = 'events';
const PHOTOS_TABLE = 'photos';
const PHOTOS_CONTAINER = 'photos';

// --- MOCK DATA STORE (In-memory, resets on server restart) ---
const mockEvents = new Map();
const mockPhotos = [];

function getMockEvent(slug) {
    return mockEvents.get(slug);
}

// -------------------------------------------------------------

export async function getTables() {
    if (IS_MOCK) return null;

    const eventsClient = TableClient.fromConnectionString(CONNECTION_STRING, EVENTS_TABLE);
    const photosClient = TableClient.fromConnectionString(CONNECTION_STRING, PHOTOS_TABLE);

    try {
        await eventsClient.createTable();
        await photosClient.createTable();
    } catch (e) {
        if (e.statusCode !== 409) console.error("Table create error", e);
    }

    return { eventsClient, photosClient };
}

export async function getContainer() {
    if (IS_MOCK) return null;

    const blobServiceClient = BlobServiceClient.fromConnectionString(CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(PHOTOS_CONTAINER);

    try {
        await containerClient.create({ access: 'blob' }); // Public read access for blobs
    } catch (e) {
        if (e.statusCode !== 409) console.error("Container create error", e);
    }
    return containerClient;
}

export async function createEvent(slug, name) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const event = {
        partitionKey: 'event',
        rowKey: slug,
        name: name,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString()
    };

    if (IS_MOCK) {
        console.log(`[MOCK] Creating event: ${name} (${slug})`);
        mockEvents.set(slug, event);
        return event;
    }

    const { eventsClient } = await getTables();
    await eventsClient.createEntity(event);
    return event;
}

export async function getEvent(slug) {
    if (IS_MOCK) {
        const event = mockEvents.get(slug);
        // If not found in mock memory, create a fake one on the fly for better dev experience
        // or return null to test 404. Let's return a fake one if it looks like a test.
        if (!event) {
            return {
                partitionKey: 'event',
                rowKey: slug,
                name: 'Mock Event (' + slug + ')',
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 86400000 * 7).toISOString()
            };
        }
        return event;
    }

    const { eventsClient } = await getTables();
    try {
        return await eventsClient.getEntity('event', slug);
    } catch (e) {
        if (e.statusCode === 404) return null;
        throw e;
    }
}

/**
 * Uploads a file buffer/stream to Blob storage and records it in Table storage
 * @param {string} eventSlug 
 * @param {File} file 
 * @param {string} uploaderName 
 */
export async function uploadPhoto(eventSlug, file, uploaderName) {
    const photoId = uuidv4();

    if (IS_MOCK) {
        await new Promise(r => setTimeout(r, 1000)); // Simulate upload lag
        const mockPhoto = {
            partitionKey: eventSlug,
            rowKey: photoId,
            uploaderName,
            fileName: file.name,
            // Use a random picsum image to simulate an upload
            blobUrl: `https://picsum.photos/seed/${photoId}/800/600`,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString()
        };
        mockPhotos.push(mockPhoto);
        return mockPhoto;
    }

    const containerClient = await getContainer();
    const blobName = `${eventSlug}/${photoId}-${file.name}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload buffer
    const arrayBuffer = await file.arrayBuffer();
    await blockBlobClient.uploadData(arrayBuffer, {
        blobHTTPHeaders: { blobContentType: file.type }
    });

    const { photosClient } = await getTables();
    const photoEntity = {
        partitionKey: eventSlug,
        rowKey: photoId,
        uploaderName,
        fileName: file.name,
        blobUrl: blockBlobClient.url,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString()
    };

    await photosClient.createEntity(photoEntity);
    return photoEntity;
}

export async function getPhotos(eventSlug) {
    if (IS_MOCK) {
        // Return photos for this slug + some random ones if empty for demo
        let photos = mockPhotos.filter(p => p.partitionKey === eventSlug);
        if (photos.length === 0) {
            // Add some default mock photos for the preview
            photos = [
                { partitionKey: eventSlug, rowKey: '1', uploaderName: 'Alice', blobUrl: 'https://picsum.photos/seed/alice/400/300', fileName: 'mock1.jpg', uploadedAt: new Date().toISOString() },
                { partitionKey: eventSlug, rowKey: '2', uploaderName: 'Bob', blobUrl: 'https://picsum.photos/seed/bob/400/500', fileName: 'mock2.jpg', uploadedAt: new Date().toISOString() },
                { partitionKey: eventSlug, rowKey: '3', uploaderName: 'Charlie', blobUrl: 'https://picsum.photos/seed/charlie/400/400', fileName: 'mock3.jpg', uploadedAt: new Date().toISOString() },
            ];
        }
        return photos.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    }

    const { photosClient } = await getTables();
    const photos = [];
    const query = photosClient.listEntities({
        queryOptions: { filter: `PartitionKey eq '${eventSlug}'` }
    });

    for await (const photo of query) {
        photos.push(photo);
    }

    return photos.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}
