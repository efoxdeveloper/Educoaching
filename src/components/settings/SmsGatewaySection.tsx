"use client";

import { useEffect, useState } from "react";
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  Send,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";
import type { PublicSmsConfig, SmsProviderType } from "@/lib/institute-settings";

export function SmsGatewaySection({ canManage }: { canManage: boolean }) {
  const [config, setConfig] = useState<PublicSmsConfig>({
    provider: "MSG91",
    senderId: "",
    dltTemplateIds: {},
    enabled: false,
    isConfigured: false,
  });

  const [provider, setProvider] = useState<SmsProviderType>("MSG91");
  const [senderId, setSenderId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isReplacingKey, setIsReplacingKey] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [dltTemplateIds, setDltTemplateIds] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Test SMS State
  const [testMobile, setTestMobile] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/institutes/sms-config");
      if (!res.ok) throw new Error("Failed to load SMS gateway settings");
      const data: PublicSmsConfig = await res.json();
      setConfig(data);
      setProvider(data.provider || "MSG91");
      setSenderId(data.senderId || "");
      setEnabled(data.enabled || false);
      setDltTemplateIds(data.dltTemplateIds || {});
      setIsReplacingKey(!data.isConfigured);
    } catch {
      setError("Unable to load SMS gateway configuration.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSavedSuccess(false);

    if (enabled && !config.isConfigured && !apiKey.trim()) {
      setError("Please provide an API Key before enabling the SMS Gateway.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        provider,
        senderId: senderId.trim(),
        dltTemplateIds,
        enabled,
      };

      if (apiKey.trim()) {
        payload.apiKey = apiKey.trim();
      }

      const res = await fetch("/api/institutes/sms-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save SMS gateway settings.");

      setSavedSuccess(true);
      setApiKey("");
      setIsReplacingKey(false);
      fetchConfig();
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save SMS configuration.");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestSms = async () => {
    if (!testMobile || !testMobile.trim()) {
      setTestResult({ success: false, message: "Please enter a test recipient mobile number." });
      return;
    }

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/institutes/sms-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: testMobile.trim(),
          provider,
          senderId: senderId.trim(),
          apiKey: apiKey.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.reason || data.error || "Provider rejected the test SMS dispatch.");
      }

      setTestResult({
        success: true,
        message: data.message || `Test SMS delivered successfully to ${testMobile.trim()}!`,
      });
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Test SMS dispatch failed.",
      });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-xs text-scholar-500">
          <Loader2 size={16} className="animate-spin text-scholar-600" />
          <span>Loading SMS Gateway configuration...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-scholar-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
            <Smartphone size={20} />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
              SMS Gateway (BYOK — Bring Your Own Key)
            </h3>
            <p className="text-xs text-scholar-500">
              Send promotional & transactional SMS via your own MSG91, Textlocal, or Fast2SMS account.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {config.isConfigured ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
              <ShieldCheck size={14} /> Key Configured
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-scholar-100 px-3 py-1 text-xs font-semibold text-scholar-600">
              Not Configured
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-danger-200 bg-danger-50 p-3.5 text-xs text-danger-700 flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {savedSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>SMS Gateway settings saved securely!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Enable Gateway Toggle */}
        <div className="flex items-center justify-between rounded-xl bg-scholar-50/70 p-4 border border-scholar-200/80">
          <div>
            <span className="text-xs font-bold text-ink block">Enable SMS Channel</span>
            <span className="text-[11px] text-scholar-500">
              When enabled, SMS option appears in broadcast communications and alerts.
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              disabled={!canManage}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-scholar-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-scholar-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {/* Provider & Sender ID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="SMS Provider">
            <select
              value={provider}
              disabled={!canManage}
              onChange={(e) => setProvider(e.target.value as SmsProviderType)}
              className={inputClass}
            >
              <option value="MSG91">MSG91 (Flow API & Transactional)</option>
              <option value="TEXTLOCAL">Textlocal India</option>
              <option value="FAST2SMS">Fast2SMS (Quick DLT / Transactional)</option>
            </select>
          </Field>

          <Field label="DLT-Approved Sender ID / Header">
            <input
              type="text"
              placeholder="e.g. VIDYAL / APEXAC"
              value={senderId}
              disabled={!canManage}
              onChange={(e) => setSenderId(e.target.value.toUpperCase())}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 p-3 text-[11px] text-amber-900 flex items-start gap-2">
          <HelpCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>TRAI DLT Compliance Note:</strong> In India, SMS headers (Sender IDs) and message templates must be
            registered on your telecom DLT portal (e.g. Jio / Airtel / Vodafone). Unregistered headers will be rejected by carriers.
          </span>
        </div>

        {/* API Key Input */}
        <div>
          <label className="text-xs font-semibold text-scholar-700 block mb-1.5">
            Provider Auth Key / API Secret (Write-Only & Encrypted)
          </label>

          {config.isConfigured && !isReplacingKey ? (
            <div className="flex items-center justify-between rounded-xl border border-scholar-200 bg-scholar-50/50 p-3.5">
              <div className="flex items-center gap-2">
                <KeyRound size={15} className="text-scholar-500" />
                <span className="font-mono text-xs font-bold text-ink">•••••••••••••••••••••••• (Encrypted at rest)</span>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setIsReplacingKey(true)}
                  className="text-xs font-bold text-scholar-600 hover:underline"
                >
                  Replace Key
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <input
                type="password"
                autoComplete="new-password"
                placeholder={config.isConfigured ? "Enter new API key to replace..." : "Paste your provider API auth key here..."}
                value={apiKey}
                disabled={!canManage}
                onChange={(e) => setApiKey(e.target.value)}
                className={inputClass}
              />
              <div className="flex items-center justify-between text-[11px] text-scholar-500">
                <span>Encrypted via AES-256-GCM. Never transmitted back to browsers.</span>
                {config.isConfigured && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsReplacingKey(false);
                      setApiKey("");
                    }}
                    className="text-scholar-600 hover:underline font-semibold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* DLT Template IDs Map */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-scholar-700 block">
            DLT Template IDs (Optional mapping for pre-approved templates)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: "GENERAL_BROADCAST", label: "General Announcements Template ID" },
              { key: "FEE_REMINDER", label: "Fee Reminder Template ID" },
              { key: "ADMISSION_INQUIRY", label: "Admission Follow-up Template ID" },
              { key: "TEST_SCORE", label: "Exam / Marks Alert Template ID" },
            ].map((tpl) => (
              <div key={tpl.key} className="space-y-1">
                <span className="text-[11px] text-scholar-600 font-medium">{tpl.label}</span>
                <input
                  type="text"
                  placeholder="e.g. 1707161829384729102"
                  value={dltTemplateIds[tpl.key] || ""}
                  disabled={!canManage}
                  onChange={(e) =>
                    setDltTemplateIds((prev) => ({
                      ...prev,
                      [tpl.key]: e.target.value.trim(),
                    }))
                  }
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        {canManage && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-scholar-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-scholar-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              <span>{saving ? "Saving Credentials..." : "Save SMS Gateway Config"}</span>
            </button>
          </div>
        )}
      </form>

      {/* Test SMS Dispatch Card */}
      <div className="rounded-2xl border border-scholar-200 bg-scholar-50/50 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-display font-bold text-xs text-ink flex items-center gap-1.5">
              <Send size={13} className="text-scholar-600" />
              Live Test SMS Dispatch
            </h4>
            <p className="text-[11px] text-scholar-500">
              Send a test SMS to verify your sender ID and API credentials before live broadcasting.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <input
            type="tel"
            placeholder="Enter 10-digit test mobile number (e.g. 9876543210)"
            value={testMobile}
            onChange={(e) => setTestMobile(e.target.value)}
            className={`w-full sm:flex-1 ${inputClass}`}
          />
          <button
            type="button"
            disabled={sendingTest || (!config.isConfigured && !apiKey.trim())}
            onClick={handleSendTestSms}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-scholar-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-scholar-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {sendingTest ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            <span>{sendingTest ? "Dispatching..." : "Send Test SMS"}</span>
          </button>
        </div>

        {testResult && (
          <div
            className={`rounded-xl p-3 text-xs flex items-start gap-2 ${
              testResult.success
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-rose-50 border border-rose-200 text-rose-800"
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="font-medium">{testResult.message}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
