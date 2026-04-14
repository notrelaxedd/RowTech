#pragma once
#include "packets.h"

// =============================================================================
// HTTP Forwarder
// POSTs telemetry batch and stroke summaries to Vercel API endpoints.
// Buffers packets in memory during WiFi outages and flushes on reconnect.
// Implements exponential backoff on API errors.
// =============================================================================

void http_forwarder_init();

// Serialize and POST all current sensor states to /api/telemetry.
// Call every TELEMETRY_POST_INTERVAL_MS.
void http_forwarder_post_telemetry();

// Immediately POST a stroke summary to /api/strokes.
// If WiFi is down, buffer the packet (up to HTTP_BUFFER_MAX_PACKETS).
void http_forwarder_post_stroke(const StrokeSummaryPacket* pkt);

// Flush buffered stroke packets. Call when WiFi reconnects.
void http_forwarder_flush_buffer();

// Returns count of packets currently in buffer.
int http_forwarder_buffer_count();
