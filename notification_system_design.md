# Notification System Design
A real-time campus notification platform for students covering **Placements**, **Events**, and **Results**.

---

## Stage 1 — REST API Design & Real-Time Mechanism

### Base URL
```
http://localhost:4000/api
```

### 1.1 Notification Endpoints

#### `GET /api/notifications`
Fetch a paginated, filterable list of notifications.

**Query Parameters:**
| Parameter           | Type     | Default | Description                              |
|---------------------|----------|---------|------------------------------------------|
| `page`              | integer  | 1       | Page number (1-indexed)                  |
| `limit`             | integer  | 10      | Items per page (max 100)                 |
| `notification_type` | string   | —       | Filter: `Placement`, `Event`, `Result`   |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "d47a7a90-e1a4-4388-b4c9-f6bba1435e46",
        "type": "Placement",
        "message": "Microsoft Corporation hiring",
        "timestamp": "2026-06-08T11:39:37Z",
        "isViewed": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 150,
      "totalPages": 15
    }
  }
}
```

---

#### `GET /api/notifications/:id`
Fetch a single notification by UUID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "d47a7a90-e1a4-4388-b4c9-f6bba1435e46",
    "type": "Placement",
    "message": "Microsoft Corporation hiring",
    "timestamp": "2026-06-08T11:39:37Z",
    "isViewed": true
  }
}
```

**Response (404):**
```json
{
  "success": false,
  "error": "Notification not found"
}
```

---

#### `PUT /api/notifications/:id/read`
Mark a notification as viewed/read.

**Request Body:** _(none required)_

**Response (200):**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

#### `GET /api/notifications/priority`
Fetch the top-10 priority notifications (Placement > Result > Event, with recency weighting).

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "d47a7a90-e1a4-4388-b4c9-f6bba1435e46",
      "type": "Placement",
      "message": "Microsoft Corporation hiring",
      "timestamp": "2026-06-08T11:39:37Z",
      "priorityScore": 3.95,
      "isViewed": false
    }
  ]
}
```

---

#### `POST /api/notifications`
Create a new notification (admin use).

**Request Body:**
```json
{
  "type": "Placement",
  "message": "Google hiring for SDE roles"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-...",
    "type": "Placement",
    "message": "Google hiring for SDE roles",
    "timestamp": "2026-06-09T10:00:00Z",
    "isViewed": false
  }
}
```

---

#### `DELETE /api/notifications/:id`
Soft-delete a notification.

**Response (200):**
```json
{
  "success": true,
  "message": "Notification deleted"
}
```

---

### 1.2 Real-Time Notification Mechanism

**Approach: Server-Sent Events (SSE)**

```
GET /api/notifications/stream
```

The client opens a persistent HTTP connection. The server pushes new notifications as they arrive:

```
event: notification
data: {"id":"...","type":"Placement","message":"Amazon hiring","timestamp":"..."}
```

**Why SSE over WebSocket?**
| Criteria          | SSE                           | WebSocket                     |
|-------------------|-------------------------------|-------------------------------|
| Direction         | Server → Client (one-way)     | Bidirectional                 |
| Complexity        | Simple HTTP                   | Separate protocol (ws://)     |
| Reconnection      | Built-in auto-reconnect       | Manual implementation         |
| Use case fit      | Notifications = push-only     | Chat, gaming                  |

Since notifications are **server-to-client push only**, SSE is the simpler, more appropriate choice. It works over standard HTTP, requires no protocol upgrade, and browsers handle reconnection automatically.

**Fallback:** For clients that don't support SSE, a polling endpoint at `GET /api/notifications?since=<timestamp>` can be used with a 30-second interval.

---

## Stage 2 — Database Design & Scaling

### 2.1 Database Choice: PostgreSQL (NeonDB)

**Justification:**
- UUID support via `gen_random_uuid()`
- Enum types for notification categories
- Full ACID compliance
- Rich indexing (B-tree, GIN, partial indexes)
- JSON support for extensibility
- NeonDB provides serverless auto-scaling, branching, and zero cold-start

### 2.2 Schema Definition

```sql
-- Enum for notification types
CREATE TYPE notification_type AS ENUM ('Placement', 'Event', 'Result');

-- Core notifications table
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type            notification_type NOT NULL,
    message         TEXT NOT NULL,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users table (pre-authenticated, so minimal)
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    roll_no         VARCHAR(50) UNIQUE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tracks which user has viewed which notification
CREATE TABLE notification_views (
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (notification_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_timestamp ON notifications(timestamp DESC);
CREATE INDEX idx_notifications_type_timestamp ON notifications(type, timestamp DESC);
CREATE INDEX idx_notification_views_user ON notification_views(user_id);
```

### 2.3 Scaling Issues & Solutions

| Issue                        | Solution                                                |
|------------------------------|---------------------------------------------------------|
| High read volume             | Read replicas + connection pooling (PgBouncer/NeonDB)   |
| Large table growth           | Table partitioning by month on `timestamp`              |
| Slow type-filtered queries   | Composite index on `(type, timestamp DESC)`             |
| Global distribution          | Multi-region read replicas                              |
| Connection exhaustion        | Connection pooling (NeonDB built-in)                    |
| Hot notification_views table | Partition by `user_id` hash                             |

### 2.4 Sample Queries (aligned to Stage 1 APIs)

**GET /api/notifications (paginated, filtered):**
```sql
SELECT n.id, n.type, n.message, n.timestamp,
       CASE WHEN nv.viewed_at IS NOT NULL THEN TRUE ELSE FALSE END AS is_viewed
FROM notifications n
LEFT JOIN notification_views nv
  ON n.id = nv.notification_id AND nv.user_id = $1
WHERE n.is_deleted = FALSE
  AND ($2::notification_type IS NULL OR n.type = $2)
ORDER BY n.timestamp DESC
LIMIT $3 OFFSET $4;
```

**GET /api/notifications/:id:**
```sql
SELECT n.id, n.type, n.message, n.timestamp,
       CASE WHEN nv.viewed_at IS NOT NULL THEN TRUE ELSE FALSE END AS is_viewed
FROM notifications n
LEFT JOIN notification_views nv
  ON n.id = nv.notification_id AND nv.user_id = $1
WHERE n.id = $2 AND n.is_deleted = FALSE;
```

**PUT /api/notifications/:id/read:**
```sql
INSERT INTO notification_views (notification_id, user_id, viewed_at)
VALUES ($1, $2, NOW())
ON CONFLICT (notification_id, user_id) DO NOTHING;
```

**POST /api/notifications:**
```sql
INSERT INTO notifications (type, message)
VALUES ($1, $2)
RETURNING id, type, message, timestamp;
```

**DELETE /api/notifications/:id (soft delete):**
```sql
UPDATE notifications SET is_deleted = TRUE, updated_at = NOW()
WHERE id = $1;
```

---

## Stage 3 — Query Performance Analysis

### 3.1 Analyzing the Slow Query

Consider this commonly written query over a large `notifications` table (10M+ rows):

```sql
SELECT * FROM notifications
WHERE type = 'Placement'
  AND timestamp >= NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;
```

#### Accuracy Assessment
- **Correct results:** Yes — it correctly filters Placement notifications from the last 7 days.
- **Performance problem:** On a 10M-row table without proper indexes, this query performs a **sequential full-table scan** (Seq Scan) because:
  1. No index exists on `type` or `timestamp`
  2. `SELECT *` fetches all columns, preventing index-only scans
  3. `ORDER BY timestamp DESC` requires an in-memory sort of all matched rows

#### Expected EXPLAIN ANALYZE output (no indexes):
```
Sort (cost=450000..451000 rows=50000 width=128)
  Sort Key: timestamp DESC
  Sort Method: external merge Disk: 8192kB
  -> Seq Scan on notifications (cost=0..350000 rows=50000 width=128)
       Filter: (type = 'Placement' AND timestamp >= ...)
       Rows Removed by Filter: 9950000
```

The planner scans all 10M rows, filters down to ~50K matches, then sorts them on disk.

### 3.2 Indexing Strategy

**Step 1: Composite B-tree index (most impactful)**
```sql
CREATE INDEX idx_notifications_type_ts
ON notifications (type, timestamp DESC);
```
This allows PostgreSQL to:
- Jump directly to `type = 'Placement'` entries
- Scan backwards on `timestamp DESC` to find the last 7 days
- Avoid any separate sort step (the index is already sorted)

**Step 2: Partial index (for this specific query pattern)**
```sql
CREATE INDEX idx_recent_placements
ON notifications (timestamp DESC)
WHERE type = 'Placement'
  AND timestamp >= NOW() - INTERVAL '30 days');
```
This is a much smaller index that covers only recent placements, making it very fast.

**Step 3: Select only needed columns**
```sql
SELECT id, type, message, timestamp
FROM notifications
WHERE type = 'Placement'
  AND timestamp >= NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;
```

#### Expected EXPLAIN ANALYZE output (with composite index):
```
Index Scan using idx_notifications_type_ts on notifications
  (cost=0..1500 rows=50000 width=64)
  Index Cond: (type = 'Placement' AND timestamp >= ...)
```

**Performance improvement: ~300x faster** (from ~450K cost to ~1.5K cost).

### 3.3 Optimized Query for Placement Notifications in Last 7 Days

```sql
SELECT id, type, message, timestamp
FROM notifications
WHERE type = 'Placement'
  AND timestamp >= NOW() - INTERVAL '7 days'
  AND is_deleted = FALSE
ORDER BY timestamp DESC
LIMIT 50;
```

**Supporting index:**
```sql
CREATE INDEX idx_placement_recent
ON notifications (type, timestamp DESC)
WHERE is_deleted = FALSE;
```

This query uses the composite index for both the `WHERE` filter and the `ORDER BY`, avoids sorting, and the `LIMIT 50` allows PostgreSQL to stop scanning early once 50 rows are found.

---

## Stage 4 — Reducing Database Load

### 4.1 Problem Statement
Currently, every page load triggers a database query to fetch the latest notifications. With 50,000 students hitting the platform, this creates unsustainable load on the database.

### 4.2 Solutions

#### Solution 1: In-Memory Cache (Redis)
**Implementation:**
```
Page Load → Check Redis cache → Cache HIT → Return cached data
                               → Cache MISS → Query DB → Store in Redis (TTL: 30s) → Return
```

**Trade-offs:**
| Pro                                    | Con                                          |
|----------------------------------------|----------------------------------------------|
| Reduces DB queries by 90%+             | Stale data for up to TTL duration             |
| Sub-millisecond response times         | Additional infrastructure (Redis)             |
| Easy to implement                      | Cache invalidation complexity                 |

**Cache key strategy:**
```
notifications:page:{page}:limit:{limit}:type:{type}
```
Invalidate on new notification creation.

---

#### Solution 2: Server-Sent Events (SSE) Push Model
Instead of polling, push new notifications to connected clients in real-time.

**Trade-offs:**
| Pro                                     | Con                                         |
|-----------------------------------------|---------------------------------------------|
| Zero unnecessary DB queries             | Persistent connections consume memory        |
| Instant delivery of new notifications   | Harder to scale horizontally                 |
| Great user experience                   | Need sticky sessions or pub/sub              |

---

#### Solution 3: HTTP Conditional Requests (ETags)
The server includes an `ETag` header. On subsequent requests, the client sends `If-None-Match`. If nothing changed, the server returns `304 Not Modified` (no body).

**Trade-offs:**
| Pro                                     | Con                                          |
|-----------------------------------------|-----------------------------------------------|
| Saves bandwidth when data unchanged     | Still requires a DB query to compute ETag     |
| Standard HTTP mechanism                 | Only saves bandwidth, not DB load             |

---

#### Solution 4: Client-Side Cache + Polling Interval
Cache notifications locally (localStorage) and poll every 60 seconds instead of every page load.

**Trade-offs:**
| Pro                                     | Con                                          |
|-----------------------------------------|-----------------------------------------------|
| No server changes needed                | Notifications delayed up to 60s               |
| Simple implementation                   | Storage limits in localStorage                |

---

### 4.3 Recommended Approach (Combined)

```
                    ┌──────────────┐
                    │   Client     │
                    └──────┬───────┘
                           │
           SSE connection for real-time push
                           │
                    ┌──────▼───────┐
                    │   Backend    │
                    └──────┬───────┘
                           │
                  ┌────────▼────────┐
                  │   Redis Cache   │  TTL: 30s
                  └────────┬────────┘
                           │ cache miss
                  ┌────────▼────────┐
                  │   PostgreSQL    │
                  └─────────────────┘
```

**Result:** DB queries reduced by **~95%** through Redis caching + real-time push eliminates polling entirely.

---

## Stage 5 — notify_all Redesign

### 5.1 Original Pseudocode (Problematic)

```pseudo
function notify_all(notification):
    students = db.get_all_students()       // 50,000 students
    for each student in students:
        db.save_notification(student, notification)
        email.send(student.email, notification)
    return "done"
```

### 5.2 Critique

| Issue                        | Impact                                              |
|------------------------------|------------------------------------------------------|
| **Synchronous loop**         | 50,000 sequential operations → request timeout       |
| **DB + email coupling**      | Email failure also blocks DB write for that student   |
| **No error handling**        | 200 email failures = 200 students get no notification |
| **No batching**              | 50,000 individual DB writes instead of bulk insert    |
| **No retry mechanism**       | Transient email failures are permanent                |
| **Single-threaded**          | Cannot utilize multiple cores/workers                 |
| **No idempotency**           | Rerunning sends duplicate emails                      |

### 5.3 Handling 200 Failed Email Sends

If 200 out of 50,000 emails fail:
1. The DB notification should still be saved (decouple email from DB)
2. Failed emails go into a **dead-letter queue (DLQ)** with the student ID and notification
3. A separate retry worker processes the DLQ with exponential backoff (1s, 2s, 4s, 8s)
4. After 3 retries, mark as permanently failed and alert an admin
5. The student still sees the in-app notification even if the email never arrives

### 5.4 Revised Pseudocode

```pseudo
function notify_all(notification):
    // Step 1: Bulk insert in-app notifications (single DB call)
    students = db.get_all_student_ids()
    db.bulk_insert_notifications(students, notification)     // one batch INSERT

    // Step 2: Queue email jobs (non-blocking)
    for each batch of 500 students:
        messageQueue.publish("email_notifications", {
            studentBatch: batch,
            notification: notification,
            attemptNumber: 1
        })

    log("info", "service", "Queued email jobs for ${students.length} students")
    return { status: "processing", totalStudents: students.length }


// Separate worker process (runs independently)
worker.subscribe("email_notifications", async (job) => {
    results = { sent: [], failed: [] }

    for each student in job.studentBatch:
        try:
            await email.send(student.email, job.notification)
            results.sent.push(student.id)
        catch (error):
            results.failed.push({ studentId: student.id, error: error.message })

    // Handle failures
    if results.failed.length > 0:
        if job.attemptNumber < 3:
            // Retry failed ones with exponential backoff
            messageQueue.publish("email_notifications", {
                studentBatch: results.failed.map(f => f.studentId),
                notification: job.notification,
                attemptNumber: job.attemptNumber + 1
            }, { delay: 2^job.attemptNumber * 1000 })
        else:
            // After 3 retries, send to dead-letter queue
            deadLetterQueue.publish("failed_emails", {
                failedStudents: results.failed,
                notification: job.notification
            })
            alertAdmin("${results.failed.length} emails permanently failed")

    log("info", "service",
        "Batch complete: ${results.sent.length} sent, ${results.failed.length} failed")
)
```

### 5.5 Architecture Diagram

```
  API Request: notify_all(notification)
        │
        ▼
  ┌─────────────────┐
  │  Bulk DB Insert  │  ← Single batch INSERT (fast)
  │  50,000 records  │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  Message Queue   │  ← 100 batches of 500
  │  (Bull/RabbitMQ) │
  └────────┬────────┘
           │
     ┌─────┼─────┐
     ▼     ▼     ▼
  Worker Worker Worker   ← Parallel email sending
     │     │     │
     └─────┼─────┘
           │
     Failed emails
           │
           ▼
  ┌─────────────────┐
  │ Retry Queue     │  ← Exponential backoff
  │ (max 3 attempts)│
  └────────┬────────┘
           │ (still failing)
           ▼
  ┌─────────────────┐
  │ Dead Letter Queue│  ← Alert admin
  └─────────────────┘
```

### 5.6 Key Improvements

| Original                    | Redesigned                                   |
|-----------------------------|----------------------------------------------|
| 50K sequential DB writes    | 1 bulk INSERT                                |
| Email blocks DB write       | Fully decoupled (DB first, email async)      |
| No error recovery           | 3 retries + dead-letter queue                |
| Synchronous, single-thread  | Queue-based, multi-worker parallelism        |
| Request timeout likely      | Returns immediately, processes asynchronously|
| No idempotency              | Job IDs prevent duplicate sends              |

---

## Stage 6 — Top-10 Priority Notifications Computation

### 6.1 Priority Logic and Weights
We compute the priority of each notification using:
$$\text{Priority Score} = \text{Type Weight} + \text{Recency Bonus}$$

1. **Type Weights**:
   - `Placement`: $3.0$
   - `Result`: $2.0$
   - `Event`: $1.0$
2. **Recency Bonus**:
   - Linearly decays from $1.0$ (brand new) down to $0.0$ over 7 days:
     $$\text{Recency Bonus} = \max\left(0, 1 - \frac{\text{Age in milliseconds}}{7 \text{ days in milliseconds}}\right)$$
     This ensures a very recent Result (priority $\approx 2.99$) can rank higher than an old Placement (priority $\approx 3.00$), maintaining dynamic recency balance.

### 6.2 Data Structure: Min-Heap
To compute the top $K$ ($K=10$) items efficiently out of $N$ notifications:
- We initialize a min-heap of maximum size $K$.
- For each notification, we compute its score:
  - If the heap has less than $K$ elements, we push it.
  - If the heap is full and the score is greater than the root (the minimum score currently in the top-10), we replace the root and sink it down.
- **Time Complexity**: $O(N \log K)$. This is extremely memory-efficient and fast compared to sorting the entire array which takes $O(N \log N)$ time and $O(N)$ extra memory.
- **Library Compliance**: Built entirely from scratch in `priorityQueue.ts` without any external algorithm libraries.
