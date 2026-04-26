"use client";

import { useState, useEffect, useCallback } from "react";
import { Webhook, Plus, RotateCw, Trash2, Copy, Check, Eye, EyeOff, Pause, Play, RefreshCw, AlertTriangle } from "lucide-react";

interface ApiKeyLite {
  _id: string;
  name: string;
  keyType: string;
  keyPrefix: string;
}

interface Endpoint {
  _id: string;
  apiKeyId: string;
  url: string;
  events: string[];
  description?: string;
  active: boolean;
  lastDeliveryAt?: string | null;
  lastDeliveryStatus?: 'success' | 'failed' | 'dead-letter' | null;
  consecutiveFailures: number;
  createdAt: string;
}

interface Delivery {
  deliveryId: string;
  event: string;
  status: 'pending' | 'success' | 'failed' | 'dead-letter';
  attemptNumber: number;
  lastAttemptAt: string;
  nextAttemptAt?: string | null;
  lastResponseStatus?: number;
  lastError?: string;
  createdAt: string;
}

const STATUS_BADGES: Record<Delivery['status'], string> = {
  pending: "bg-gray-100 text-gray-700",
  success: "bg-emerald-100 text-emerald-800",
  failed: "bg-amber-100 text-amber-800",
  'dead-letter': "bg-red-100 text-red-800",
};

const ENDPOINT_STATUS_BADGES: Record<NonNullable<Endpoint['lastDeliveryStatus']>, string> = {
  success: "bg-emerald-100 text-emerald-800",
  failed: "bg-amber-100 text-amber-800",
  'dead-letter': "bg-red-100 text-red-800",
};

export default function WebhooksPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [keys, setKeys] = useState<ApiKeyLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newApiKeyId, setNewApiKeyId] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  const fetchEndpoints = useCallback(async () => {
    const res = await fetch('/api/developer/webhooks');
    if (res.ok) {
      const data = await res.json();
      setEndpoints(data.endpoints);
      setKeys(data.keys);
      if (!newApiKeyId && data.keys.length > 0) setNewApiKeyId(data.keys[0]._id);
    }
    setLoading(false);
  }, [newApiKeyId]);

  useEffect(() => { fetchEndpoints(); }, [fetchEndpoints]);

  const fetchDeliveries = useCallback(async (endpointId: string) => {
    setDeliveriesLoading(true);
    const res = await fetch(`/api/developer/webhooks/${endpointId}/deliveries`);
    if (res.ok) {
      const data = await res.json();
      setDeliveries(data.deliveries);
    }
    setDeliveriesLoading(false);
  }, []);

  useEffect(() => {
    if (selectedEndpointId) fetchDeliveries(selectedEndpointId);
  }, [selectedEndpointId, fetchDeliveries]);

  const createEndpoint = async () => {
    if (!newUrl.trim() || !newApiKeyId) return;
    setCreating(true);
    const res = await fetch('/api/developer/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKeyId: newApiKeyId,
        url: newUrl.trim(),
        description: newDescription.trim() || undefined,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setRevealedSecret(data.secret);
      setNewUrl("");
      setNewDescription("");
      setShowCreate(false);
      await fetchEndpoints();
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to create webhook.');
    }
    setCreating(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    const res = await fetch(`/api/developer/webhooks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    });
    if (res.ok) await fetchEndpoints();
  };

  const deleteEndpoint = async (id: string) => {
    if (!confirm('Delete this webhook endpoint? Pending deliveries will dead-letter.')) return;
    const res = await fetch(`/api/developer/webhooks/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchEndpoints();
      if (selectedEndpointId === id) setSelectedEndpointId(null);
    }
  };

  const rotateSecret = async (id: string) => {
    if (!confirm('Rotate the signing secret? Your consumer must update its verification key immediately or signatures will fail.')) return;
    const res = await fetch(`/api/developer/webhooks/${id}/rotate-secret`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setRevealedSecret(data.secret);
    }
  };

  const replayDelivery = async (deliveryId: string) => {
    if (!selectedEndpointId) return;
    const res = await fetch(`/api/developer/webhooks/${selectedEndpointId}/deliveries/${deliveryId}/replay`, { method: 'POST' });
    if (res.ok) {
      await fetchDeliveries(selectedEndpointId);
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to replay delivery.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <main aria-labelledby="webhooks-heading" className="space-y-6">
      <h1 id="webhooks-heading" className="sr-only">Webhooks</h1>

      {revealedSecret && (
        <div role="alert" className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            Save this signing secret now — it won&apos;t be shown again
          </h2>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border rounded px-3 py-2 text-sm font-mono text-gray-800 overflow-x-auto">
              {showSecret ? revealedSecret : revealedSecret.slice(0, 12) + "•".repeat(40)}
            </code>
            <button
              onClick={() => setShowSecret(!showSecret)}
              className="p-2 hover:bg-amber-100 rounded"
              aria-label={showSecret ? "Hide secret" : "Show secret"}
            >
              {showSecret ? <EyeOff className="w-4 h-4 text-amber-700" /> : <Eye className="w-4 h-4 text-amber-700" />}
            </button>
            <button
              onClick={() => copyToClipboard(revealedSecret)}
              className="p-2 hover:bg-amber-100 rounded"
              aria-label="Copy secret to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-amber-700" />}
            </button>
          </div>
          <button
            onClick={() => { setRevealedSecret(null); setShowSecret(false); }}
            className="mt-2 text-xs text-amber-600 hover:underline"
          >
            I&apos;ve saved it, dismiss
          </button>
        </div>
      )}

      <section aria-labelledby="endpoints-heading" className="bg-white rounded-lg border">
        <header className="p-4 border-b flex items-center justify-between">
          <h2 id="endpoints-heading" className="text-sm font-semibold text-gray-700">Webhook Endpoints</h2>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
            disabled={keys.length === 0}
            aria-expanded={showCreate}
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            New Endpoint
          </button>
        </header>

        {keys.length === 0 && (
          <p className="p-4 text-sm text-gray-500">
            Create an API key first at <a href="/developer/keys" className="text-blue-600 hover:underline">/developer/keys</a>, then come back to register a webhook.
          </p>
        )}

        {showCreate && keys.length > 0 && (
          <div className="p-4 bg-gray-50 border-b space-y-3">
            <div>
              <label htmlFor="webhook-key" className="block text-xs font-medium text-gray-700 mb-1">API Key</label>
              <select
                id="webhook-key"
                value={newApiKeyId}
                onChange={(e) => setNewApiKeyId(e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2"
              >
                {keys.map((k) => (
                  <option key={k._id} value={k._id}>{k.name} ({k.keyPrefix}…)</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="webhook-url" className="block text-xs font-medium text-gray-700 mb-1">URL</label>
              <input
                id="webhook-url"
                type="url"
                placeholder="https://your-app.example.com/api/flashlearn/webhook"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label htmlFor="webhook-desc" className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
              <input
                id="webhook-desc"
                type="text"
                placeholder="Production handler"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2"
                maxLength={500}
              />
            </div>
            <button
              onClick={createEndpoint}
              disabled={creating || !newUrl.trim() || !newApiKeyId}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        )}

        {endpoints.length === 0 ? (
          <div className="p-8 text-center">
            <Webhook className="w-8 h-8 text-gray-500 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm text-gray-500">No webhooks yet. Add one to receive session.completed events.</p>
          </div>
        ) : (
          <ul className="divide-y" role="list">
            {endpoints.map((ep) => {
              const isSelected = selectedEndpointId === ep._id;
              return (
                <li key={ep._id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-sm font-mono text-gray-800 truncate" title={ep.url}>{ep.url}</code>
                        {!ep.active && (
                          <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">disabled</span>
                        )}
                        {ep.lastDeliveryStatus && (
                          <span className={`px-1.5 py-0.5 rounded text-xs ${ENDPOINT_STATUS_BADGES[ep.lastDeliveryStatus]}`}>
                            last: {ep.lastDeliveryStatus}
                          </span>
                        )}
                        {ep.consecutiveFailures > 0 && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-xs">
                            {ep.consecutiveFailures} consecutive failures
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Events: {ep.events.join(', ')}
                        {ep.description && ` · ${ep.description}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setSelectedEndpointId(isSelected ? null : ep._id)}
                        className="text-xs px-2 py-1 text-gray-700 hover:bg-gray-100 rounded"
                        aria-expanded={isSelected}
                      >
                        {isSelected ? 'Hide' : 'View'} deliveries
                      </button>
                      <button
                        onClick={() => toggleActive(ep._id, ep.active)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                        aria-label={ep.active ? "Pause endpoint" : "Resume endpoint"}
                        title={ep.active ? "Pause" : "Resume"}
                      >
                        {ep.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => rotateSecret(ep._id)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                        aria-label="Rotate signing secret"
                        title="Rotate secret"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteEndpoint(ep._id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                        aria-label="Delete endpoint"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-4 border-t pt-4">
                      <h3 className="text-xs font-semibold text-gray-700 mb-2">Recent deliveries</h3>
                      {deliveriesLoading ? (
                        <p className="text-xs text-gray-500">Loading…</p>
                      ) : deliveries.length === 0 ? (
                        <p className="text-xs text-gray-500">No deliveries yet.</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead className="text-left text-gray-500">
                            <tr>
                              <th scope="col" className="py-1 pr-3">When</th>
                              <th scope="col" className="py-1 pr-3">Event</th>
                              <th scope="col" className="py-1 pr-3">Status</th>
                              <th scope="col" className="py-1 pr-3">Attempt</th>
                              <th scope="col" className="py-1 pr-3">HTTP</th>
                              <th scope="col" className="py-1"></th>
                            </tr>
                          </thead>
                          <tbody className="text-gray-700">
                            {deliveries.map((d) => (
                              <tr key={d.deliveryId} className="border-t">
                                <td className="py-2 pr-3 text-gray-500">{new Date(d.createdAt).toLocaleString()}</td>
                                <td className="py-2 pr-3 font-mono">{d.event}</td>
                                <td className="py-2 pr-3">
                                  <span className={`px-1.5 py-0.5 rounded ${STATUS_BADGES[d.status]}`}>{d.status}</span>
                                </td>
                                <td className="py-2 pr-3">{d.attemptNumber}/7</td>
                                <td className="py-2 pr-3">{d.lastResponseStatus ?? '—'}</td>
                                <td className="py-2 text-right">
                                  {(d.status === 'failed' || d.status === 'dead-letter') && (
                                    <button
                                      onClick={() => replayDelivery(d.deliveryId)}
                                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                                      aria-label={`Replay delivery ${d.deliveryId}`}
                                    >
                                      <RefreshCw className="w-3 h-3" aria-hidden="true" />
                                      Replay
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
