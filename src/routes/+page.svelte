<script>
  let eventName = "";
  let joinSlug = "";

  let isCreating = false;
  let isJoining = false;
  let joinError = "";

  async function createEvent() {
    if (!eventName.trim()) return;

    isCreating = true;
    try {
      const res = await fetch("/server/events/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: eventName }),
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = `/${data.slug}`;
      } else {
        alert("Error: " + data.message);
      }
    } catch (e) {
      alert("Network error");
    } finally {
      isCreating = false;
    }
  }

  async function joinEvent() {
    if (!joinSlug.trim()) return;

    isJoining = true;
    joinError = "";

    try {
      // Clean up input slightly (remove spaces, just in case user pastes weirdly)
      const cleanSlug = joinSlug.trim().toLowerCase().replace(/\s+/g, "-");

      const res = await fetch("/server/events/check", {
        method: "POST",
        body: JSON.stringify({ slug: cleanSlug }),
      });
      const data = await res.json();

      if (data.exists) {
        window.location.href = `/${data.slug}`;
      } else {
        joinError = "Event not found or expired.";
      }
    } catch (e) {
      joinError = "Could not connect.";
    } finally {
      isJoining = false;
    }
  }
</script>

<main>
  <div class="hero">
    <h1>piclinq</h1>
    <p class="subtitle">Share photos instantly. 7 days retention. No Signup.</p>

    <div class="cards-container">
      <!-- Create Card -->
      <div class="card create-card">
        <h2>New Event</h2>
        <p>Create a temporary space for photos.</p>
        <div class="form-group">
            <input
              type="text"
              placeholder="e.g. Luca's Party"
              bind:value={eventName}
              on:keydown={(e) => e.key === "Enter" && createEvent()}
            />
          <button on:click={createEvent} disabled={isCreating || !eventName}>
            {isCreating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>

      <div class="divider">OR</div>

      <!-- Join Card -->
      <div class="card join-card">
        <h2>Join Event</h2>
        <p>Already have a code? Enter it below.</p>
        <div class="form-group">
          <input
            type="text"
            placeholder="lucas-party"
            bind:value={joinSlug}
            class:error={!!joinError}
            on:input={() => (joinError = "")}
            on:keydown={(e) => e.key === "Enter" && joinEvent()}
          />
          <button
            class="secondary"
            on:click={joinEvent}
            disabled={isJoining || !joinSlug}
          >
            {isJoining ? "Checking..." : "Go"}
          </button>
        </div>
        {#if joinError}
          <div class="error-msg">{joinError}</div>
        {/if}
      </div>
    </div>
  </div>
  <div class="footer">
    <p>&copy; 2026 Luca Carnegie</p>
    <p><i>Made with care, coffee and Google Antigravity</i></p>
  </div>
</main>

<style>
  main {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 2rem 1rem;
    text-align: center;
  }

  .hero {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: 100%;
  }

  .hero h1 {
    font-size: 3.5rem;
    margin-bottom: 0.5rem;
    color: var(--primary);
  }

  .subtitle {
    color: #64748b;
    margin-bottom: 3rem;
    font-size: 1.1rem;
  }

  .cards-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    align-items: center;
    max-width: 900px;
    margin: 0 auto;
  }

  @media (min-width: 768px) {
    .cards-container {
      flex-direction: row;
      align-items: stretch;
      justify-content: center;
    }
  }

  .card {
    background: white;
    padding: 2rem;
    border-radius: 16px;
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.05),
      0 10px 15px -3px rgba(0, 0, 0, 0.05);
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 300px;
    transition: transform 0.2s;
    border: 1px solid var(--border-color);
  }

  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  }

  .card h2 {
    margin-bottom: 0.5rem;
    color: var(--text-main);
  }
  .card p {
    color: #94a3b8;
    margin-bottom: 1.5rem;
    font-size: 0.95rem;
  }

  .form-group {
    display: flex;
    gap: 0.5rem;
  }

  input {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 1rem;
    font-style: italic;
    outline: none;
  }

  input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px var(--border-color);
  }
  input.error {
    border-color: #ef4444;
    background: #fef2f2;
  }

  button {
    padding: 0.75rem 1.25rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: bold;
    white-space: nowrap;
    cursor: pointer;
  }

  button.secondary {
    background: #475569;
  }

  button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .divider {
    display: flex;
    align-items: center;
    color: #cbd5e1;
    font-weight: bold;
    font-size: 0.9rem;
  }

  .error-msg {
    color: #ef4444;
    font-size: 0.9rem;
    margin-top: 0.75rem;
    font-weight: 500;
  }

  .footer {
    margin-top: auto;
    color: #94a3b8;
    font-size: 0.9rem;
    padding-bottom: 1rem;
  }
</style>
