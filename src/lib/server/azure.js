import { BlobServiceClient } from '@azure/storage-blob';
import { TableClient } from '@azure/data-tables';
import { v4 as uuidv4 } from 'uuid';
import { env } from '$env/dynamic/private';

// Environment variables must be set: AZURE_STORAGE_CONNECTION_STRING
const CONNECTION_STRING = env.AZURE_STORAGE_CONNECTION_STRING;

if (!CONNECTION_STRING) {
    console.error("❌ CRITICAL: AZURE_STORAGE_CONNECTION_STRING is missing.");
    // In production, we want to fail hard if this is missing.
    // For local dev without a string, we can throw an error to prompt the user to set it up.
}

const EVENTS_TABLE = 'events';
const PHOTOS_TABLE = 'photos';
const PHOTOS_CONTAINER = 'photos';

// Helper to get clients (lazy initialization)
// We won't use a global connection check at module level to allow build time to pass without env var,
// but runtime usage will fail if missing.
async function getClients() {
    if (!CONNECTION_STRING) {
        throw new Error("AZURE_STORAGE_CONNECTION_STRING is not defined");
    }

    const eventsClient = TableClient.fromConnectionString(CONNECTION_STRING, EVENTS_TABLE);
    const photosClient = TableClient.fromConnectionString(CONNECTION_STRING, PHOTOS_TABLE);
    const blobServiceClient = BlobServiceClient.fromConnectionString(CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(PHOTOS_CONTAINER);

    // Create tables/containers if they don't exist (Idempotent)
    // In a high-traffic production app, you might move this to a startup script,
    // but for this scale, ensuring existence on use is fine or we can do it once.
    // Let's do a quick lazy init pattern or just try-catch create.
    try {
        await Promise.all([
            eventsClient.createTable(),
            photosClient.createTable(),
            containerClient.create({ access: 'blob' }) // Public read access
        ]);
    } catch (e) {
        // Ignore 409 (Conflict) which means already exists
        if (e.statusCode !== 409) {
            // We continue anyway, as it might be a permissions issue that strictly prohibits create
            // but allows read/write.
            console.log("Note: Resource creation skipped/failed (might already exist):", e.message);
        }
    }

    return { eventsClient, photosClient, containerClient };
}


export async function createEvent(slug, name) {
    const clients = await getClients();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const event = {
        partitionKey: 'event',
        rowKey: slug,
        name: name,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString()
    };

    await clients.eventsClient.createEntity(event);
    return event;
}

export async function getEvent(slug) {
    const clients = await getClients();
    try {
        return await clients.eventsClient.getEntity('event', slug);
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
    const clients = await getClients();
    const photoId = uuidv4();

    // 1. Upload Blob
    const blobName = `${eventSlug}/${photoId}-${file.name}`;
    const blockBlobClient = clients.containerClient.getBlockBlobClient(blobName);

    const arrayBuffer = await file.arrayBuffer();
    await blockBlobClient.uploadData(arrayBuffer, {
        blobHTTPHeaders: { blobContentType: file.type }
    });

    // 2. Save Metadata to Table
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

    await clients.photosClient.createEntity(photoEntity);
    return photoEntity;
}

export async function getPhotos(eventSlug) {
    const clients = await getClients();
    const photos = [];

    const query = clients.photosClient.listEntities({
        queryOptions: { filter: `PartitionKey eq '${eventSlug}'` }
    });

    for await (const photo of query) {
        photos.push(photo);
    }

    // Sort by newest first
    return photos.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}