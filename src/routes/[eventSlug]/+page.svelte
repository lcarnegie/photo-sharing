<script>
  import { invalidateAll } from "$app/navigation";
  import { onMount, onDestroy } from "svelte";

  export let data;

  let isUploading = false;
  let uploadFiles;
  let uploaderName = "";

  // Filtering
  let filterUploader = "All";
  $: uniqueUploaders = [
    "All",
    ...new Set(data.photos.map((p) => p.uploaderName)),
  ];
  $: filteredPhotos =
    filterUploader === "All"
      ? data.photos
      : data.photos.filter((p) => p.uploaderName === filterUploader);

  // Selection
  let selectedPhotoIds = new Set();
  // We need to re-assign to trigger reactivity updates
  function toggleSelection(photo) {
    if (selectedPhotoIds.has(photo.rowKey)) {
      selectedPhotoIds.delete(photo.rowKey);
    } else {
      selectedPhotoIds.add(photo.rowKey);
    }
    selectedPhotoIds = selectedPhotoIds; // trigger update
  }

  function downloadSelected() {
    // Loop through selected IDs and trigger download
    // Note: Browsers might block multiple automatic downloads.
    // Usually user interaction allows it.
    const photosToDownload = data.photos.filter((p) =>
      selectedPhotoIds.has(p.rowKey),
    );
    photosToDownload.forEach((photo, i) => {
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = photo.blobUrl;
        link.download = photo.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, i * 300); // 300ms delay between start to be polite
    });

    selectedPhotoIds = new Set();
    selectedPhotoIds = selectedPhotoIds;
  }

  // Countdown
  let timeLeft = "";
  let interval;

  function updateTimer() {
    const diff = new Date(data.event.expiresAt) - new Date();
    if (diff <= 0) {
      timeLeft = "Event Expired";
      return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    timeLeft = `${days}d ${hours}h ${minutes}m left`;
  }

  onMount(() => {
    updateTimer();
    interval = setInterval(updateTimer, 60000);
  });

  onDestroy(() => {
    clearInterval(interval);
  });

  async function handleUpload() {
    if (!uploadFiles || uploadFiles.length === 0) return;
    if (!uploaderName.trim()) {
      alert("Please enter a name to upload.");
      return;
    }

    isUploading = true;
    const uploadPromises = Array.from(uploadFiles).map(async (file) => {
      const fd = new FormData();
      fd.append("eventSlug", data.event.rowKey);
      fd.append("uploader", uploaderName);
      fd.append("photo", file);

      const res = await fetch("/api/photos/upload", {
        method: "POST",
        body: fd,
      });
      return res.json();
    });

    await Promise.all(uploadPromises);

    isUploading = false;
    uploadFiles = null;
    await invalidateAll();
  }

  // Date Formatter
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Share Logic
  let shareUrl = "";
  let copied = false;

  onMount(() => {
    shareUrl = window.location.href;
    updateTimer();
    interval = setInterval(updateTimer, 60000);
  });

  function copyLink() {
    navigator.clipboard.writeText(shareUrl);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<div class="event-page">
  <header>
    <div class="top-nav">
      <a href="/" class="back-btn">← Back</a>
      <div class="countdown">{timeLeft}</div>
    </div>

    <div class="header-content">
      <h1>{data.event.name}</h1>
      <p class="expiry-date">
        Available until {dateFormatter.format(new Date(data.event.expiresAt))}
      </p>
    </div>
  </header>

  <div class="panels-grid">
    <section class="panel share-section">
      <h3>Invite Friends</h3>
      <p class="share-desc">Anyone with the link can view and add photos.</p>
      <div class="copy-row">
        <input type="text" readonly value={shareUrl} class="share-input" />
        <button class="copy-btn" on:click={copyLink}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </section>

    <section class="panel upload-section">
      <h3>Add Photos</h3>
      <div class="upload-controls">
        <input
          type="text"
          placeholder="Your Name (Required)"
          bind:value={uploaderName}
          class="name-input"
        />
        <div class="file-input-wrapper">
          <input
            type="file"
            id="fileInput"
            multiple
            accept="image/*"
            bind:files={uploadFiles}
          />
          <label for="fileInput" class="file-label">
            {#if uploadFiles && uploadFiles.length > 0}
              {uploadFiles.length} photos selected
            {:else}
              Choose Photos
            {/if}
          </label>
        </div>
      </div>
      {#if uploadFiles && uploadFiles.length > 0}
        <button
          class="upload-btn"
          on:click={handleUpload}
          disabled={isUploading}
        >
          {isUploading ? "Uploading..." : "Upload Now"}
        </button>
      {/if}
    </section>
  </div>

  <section class="filter-section">
    <div class="filter-label">Filter by:</div>
    <div class="chips">
      {#each uniqueUploaders as name}
        <button
          class="chip {filterUploader === name ? 'active' : ''}"
          on:click={() => (filterUploader = name)}
        >
          {name}
        </button>
      {/each}
    </div>
  </section>

  <section class="gallery">
    {#if filteredPhotos.length === 0}
      <div class="empty-state">No photos found for this filter.</div>
    {:else}
      <div class="grid">
        {#each filteredPhotos as photo (photo.rowKey)}
          <div
            class="photo-card {selectedPhotoIds.has(photo.rowKey)
              ? 'selected'
              : ''}"
            on:click={() => toggleSelection(photo)}
            role="button"
            tabindex="0"
            on:keydown={(e) => e.key === "Enter" && toggleSelection(photo)}
          >
            <img src={photo.blobUrl} alt={photo.fileName} loading="lazy" />

            <div class="checkbox">
              {#if selectedPhotoIds.has(photo.rowKey)}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  ><polyline points="20 6 9 17 4 12"></polyline></svg
                >
              {/if}
            </div>

            <button
              class="download-icon"
              on:click|stopPropagation={() => {
                const link = document.createElement("a");
                link.href = photo.blobUrl;
                link.download = photo.fileName;
                link.click();
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                stroke="currentColor"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                ></path><polyline points="7 10 12 15 17 10"></polyline><line
                  x1="12"
                  y1="15"
                  x2="12"
                  y2="3"
                ></line></svg
              >
            </button>

            <div class="name-tag">{photo.uploaderName}</div>
            <div class="overlay"></div>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  {#if selectedPhotoIds.size > 0}
    <div class="sticky-bar">
      <div class="selection-count">{selectedPhotoIds.size} selected</div>
      <button class="bulk-download-btn" on:click={downloadSelected}>
        Download All ({selectedPhotoIds.size})
      </button>
    </div>
  {/if}
</div>

<style>
  .event-page {
    padding-bottom: 100px; /* Space for sticky bar */
    color: var(--text-main);
  }

  /* Header */
  header {
    background: var(--bg-color);
    padding: 1rem;
    position: sticky;
    top: 0;
    z-index: 10;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .top-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .back-btn {
    text-decoration: none;
    color: var(--primary);
  }

  .countdown {
    color: #64748b;
    font-variant-numeric: tabular-nums;
  }

  .header-content h1 {
    font-size: 1.75rem;
    margin-bottom: 0.25rem;
  }

  .expiry-date {
    font-size: 0.9rem;
    color: #64748b;
  }

  /* Panels (Upload & Share) */
  .panels-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin: 1rem;
  }

  @media (min-width: 768px) {
    .panels-grid {
      flex-direction: row;
      align-items: stretch;
    }
  }

  .panel {
    flex: 1;
    padding: 1.5rem;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  /* Specific resets/adjustments if needed */
  .upload-section {
    /* override any legacy margins if they exist, though we removed them */
    margin: 0;
  }

  .panel h3 {
    margin-bottom: 0.75rem;
    font-size: 1.1rem;
    color: var(--text-main);
  }

  .upload-controls {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
  }

  .name-input {
    flex: 1;
    min-width: 140px;
    padding: 0.6rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
  }

  .file-input-wrapper {
    position: relative;
    overflow: hidden;
    display: inline-block;
  }

  .file-input-wrapper input[type="file"] {
    position: absolute;
    left: 0;
    top: 0;
    opacity: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
  }

  .file-label {
    display: inline-block;
    padding: 0.6rem 1rem;
    background: #f1f5f9;
    color: #334155;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
  }

  .upload-btn {
    width: 100%;
    padding: 0.75rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 1rem;
    margin-top: auto; /* Push to bottom if height varies */
  }
  .upload-btn:disabled {
    opacity: 0.5;
  }

  /* Share Section Specifics */
  .share-desc {
    font-size: 0.9rem;
    color: #64748b;
    margin-bottom: 1rem;
  }

  .copy-row {
    display: flex;
    gap: 0.5rem;
  }

  .share-input {
    flex: 1;
    padding: 0.6rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: #f8fafc;
    color: #64748b;
    font-size: 0.9rem;
    text-overflow: ellipsis;
  }

  .copy-btn {
    padding: 0.6rem 1.2rem;
    background: #e2e8f0;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
    min-width: 80px;
  }
  .copy-btn:hover {
    background: #cbd5e1;
  }

  /* Filters */
  .filter-section {
    padding: 0 1rem;
    margin-bottom: 1.5rem;
  }
  .filter-label {
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
    color: #64748b;
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 0.05em;
  }
  .chips {
    display: flex;
    overflow-x: auto;
    gap: 0.5rem;
    padding-bottom: 0.5rem; /* Scrollbar space */
    scrollbar-width: none;
  }
  .chips::-webkit-scrollbar {
    display: none;
  }

  .chip {
    padding: 0.4rem 1rem;
    border-radius: 20px;
    border: 1px solid var(--border-color);
    background: white;
    font-size: 0.9rem;
    white-space: nowrap;
    transition: all 0.2s;
  }
  .chip.active {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
  }

  /* Grid & Cards */
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr); /* 2 columns on mobile */
    gap: 0.5rem;
    padding: 0 0.5rem;
  }
  @media (min-width: 640px) {
    .grid {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
      padding: 0 1rem;
    }
  }

  .photo-card {
    position: relative;
    aspect-ratio: 1; /* Square */
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    isolation: isolate;
  }

  .photo-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.2s;
  }

  .photo-card.selected img {
    transform: scale(0.95);
  }

  .photo-card.selected {
    box-shadow: 0 0 0 3px var(--primary);
  }

  /* Overlay Gradient */
  .overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 40%;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
    pointer-events: none;
    z-index: 1;
  }

  /* Elements */
  .checkbox {
    position: absolute;
    top: 8px;
    left: 8px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid white;
    background: rgba(0, 0, 0, 0.3);
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }
  .photo-card.selected .checkbox {
    background: var(--primary);
    border-color: var(--primary);
  }

  .download-icon {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 32px;
    height: 32px;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    color: #333;
    z-index: 2;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .name-tag {
    position: absolute;
    bottom: 8px;
    right: 8px;
    color: white;
    font-weight: 600;
    font-size: 0.85rem;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
    z-index: 2;
  }

  /* Sticky Bottom Bar */
  .sticky-bar {
    position: fixed;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    width: 90%;
    max-width: 500px;
    background: #1c1917;
    color: white;
    padding: 1rem;
    border-radius: 50px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 100;
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes slideUp {
    from {
      transform: translate(-50%, 100%);
      opacity: 0;
    }
    to {
      transform: translate(-50%, 0);
      opacity: 1;
    }
  }

  .selection-count {
    padding-left: 0.5rem;
    font-weight: 500;
  }

  .bulk-download-btn {
    background: white;
    color: black;
    padding: 0.5rem 1.25rem;
    border-radius: 30px;
    border: none;
    font-weight: 700;
    font-size: 0.9rem;
  }

  .empty-state {
    padding: 2rem;
    text-align: center;
    color: #94a3b8;
  }
</style>
