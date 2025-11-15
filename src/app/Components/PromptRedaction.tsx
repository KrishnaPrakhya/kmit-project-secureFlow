"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Eye,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
  Zap,
  Undo2,
  Play,
  Layers,
  Info,
  Shield,
  Lock,
} from "lucide-react";
import axios from "axios";

interface Entity {
  text: string;
  label: string;
  reason: string;
  confidence: number;
  isRedacted?: boolean;
}

interface RedactionPlan {
  entities: Entity[];
  redaction_strategy: string;
  summary: string;
  total_entities: number;
}

interface RedactionResult {
  message: string;
  redacted_file_url: string;
  file_type: string;
  total_redactions: number;
  original_filename: string;
}

const PromptRedaction: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [intent, setIntent] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRedacting, setIsRedacting] = useState(false);
  const [redactionPlan, setRedactionPlan] = useState<RedactionPlan | null>(
    null
  );
  const [extractedText, setExtractedText] = useState("");
  const [livePreviewHtml, setLivePreviewHtml] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [redactionResult, setRedactionResult] =
    useState<RedactionResult | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [autoRedact, setAutoRedact] = useState(true);
  const [timestamp, setTimestamp] = useState(Date.now());
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.9); // Only high confidence by default

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Generate live preview whenever entities change
  useEffect(() => {
    if (extractedText && redactionPlan?.entities) {
      generateLivePreview();
    }
  }, [redactionPlan, extractedText]);

  // Auto-redact after analysis if enabled
  useEffect(() => {
    if (autoRedact && redactionPlan && !redactionResult && !isRedacting) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        executeRedaction();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [redactionPlan, autoRedact]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setRedactionPlan(null);
      setRedactionResult(null);
      setExtractedText("");
      setLivePreviewHtml("");

      // Create preview URL for images
      if (selectedFile.type.startsWith("image/")) {
        const url = URL.createObjectURL(selectedFile);
        setFilePreviewUrl(url);
      } else {
        setFilePreviewUrl(null);
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const analyzeIntent = async () => {
    if (!file || !intent.trim()) {
      setError("Please upload a file and describe what you want to redact");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setRedactionResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("intent", intent);
    formData.append("min_confidence", confidenceThreshold.toString());

    try {
      const response = await axios.post(
        "http://localhost:5000/api/promptRedaction/analyze",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Mark all entities as redacted by default
      const entitiesWithState = response.data.entities.map((e: Entity) => ({
        ...e,
        isRedacted: true,
      }));

      setRedactionPlan({
        ...response.data,
        entities: entitiesWithState,
      });
      setExtractedText(response.data.extractedText);
    } catch (err: any) {
      console.error("Error analyzing intent:", err);
      setError(
        err.response?.data?.error || "Failed to analyze redaction intent"
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateLivePreview = () => {
    if (!extractedText || !redactionPlan?.entities) return;

    let previewText = extractedText;
    const redactedEntities = redactionPlan.entities.filter(
      (e) => e.isRedacted !== false
    );

    // Sort by position to handle overlapping
    const entitiesWithPos = redactedEntities
      .map((entity) => {
        const pos = extractedText
          .toLowerCase()
          .indexOf(entity.text.toLowerCase());
        return pos !== -1 ? { entity, position: pos } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b!.position - a!.position); // Reverse order for replacement

    // Replace entities with redacted spans
    entitiesWithPos.forEach((item) => {
      if (!item) return;
      const { entity, position } = item;
      const originalText = extractedText.substr(position, entity.text.length);

      // Different colors based on confidence
      let bgColor = "rgba(0, 0, 0, 0.85)";
      let textColor = "white";

      if (entity.confidence >= 0.9) {
        bgColor = "rgba(0, 0, 0, 0.9)";
      } else if (entity.confidence >= 0.75) {
        bgColor = "rgba(0, 0, 0, 0.75)";
      } else {
        bgColor = "rgba(0, 0, 0, 0.6)";
      }

      const replacement = `<span style="background-color: ${bgColor}; color: ${textColor}; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-weight: 500;" title="${
        entity.label
      } - ${entity.reason} (${(entity.confidence * 100).toFixed(
        0
      )}% confidence)">[REDACTED]</span>`;

      previewText =
        previewText.substring(0, position) +
        replacement +
        previewText.substring(position + entity.text.length);
    });

    // Convert newlines to <br> for HTML display
    previewText = previewText.replace(/\n/g, "<br>");

    setLivePreviewHtml(previewText);
  };

  const toggleEntityRedaction = (index: number) => {
    if (!redactionPlan) return;

    const updatedEntities = [...redactionPlan.entities];
    updatedEntities[index] = {
      ...updatedEntities[index],
      isRedacted: !updatedEntities[index].isRedacted,
    };

    setRedactionPlan({
      ...redactionPlan,
      entities: updatedEntities,
    });
  };

  const executeRedaction = async () => {
    if (!file || !redactionPlan?.entities) return;

    setIsRedacting(true);
    setError(null);

    // Only send entities that are marked for redaction
    const entitiesToRedact = redactionPlan.entities.filter(
      (e) => e.isRedacted !== false
    );

    const formData = new FormData();
    formData.append("file", file);
    formData.append("entities", JSON.stringify(entitiesToRedact));
    formData.append("type", redactionPlan.redaction_strategy);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/promptRedaction/execute",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setRedactionResult(response.data);
      setTimestamp(Date.now()); // Update timestamp to force reload
    } catch (err: any) {
      console.error("Error executing redaction:", err);
      setError(err.response?.data?.error || "Failed to execute redaction");
    } finally {
      setIsRedacting(false);
    }
  };

  const downloadRedactedFile = async () => {
    if (!redactionResult) return;

    try {
      const downloadUrl = `http://localhost:5000/api/promptRedaction/download/${redactionResult.file_type}`;

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `redacted_${redactionResult.original_filename}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error downloading file:", err);
      setError("Failed to download redacted file");
    }
  };

  const getRedactedUrl = (path: string) => {
    return `${path}?t=${timestamp}`;
  };

  const resetRedaction = () => {
    setRedactionPlan(null);
    setRedactionResult(null);
    setLivePreviewHtml("");
    setShowOriginal(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "text-red-600 bg-red-50 border-red-200";
    if (confidence >= 0.75)
      return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-yellow-600 bg-yellow-50 border-yellow-200";
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) return { text: "High", icon: "🔴" };
    if (confidence >= 0.75) return { text: "Medium", icon: "🟡" };
    return { text: "Low", icon: "⚪" };
  };

  const redactedCount =
    redactionPlan?.entities.filter((e) => e.isRedacted !== false).length || 0;

  return (
    <div className="min-h-screen mt-14 p-4 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 overflow-hidden">
      <div className="max-w-[1920px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <motion.h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-3 flex items-center justify-center gap-3">
              <Sparkles className="w-10 h-10 text-purple-600" />
              AI-Powered Prompt Redaction
            </motion.h1>
            <p className="text-lg text-gray-600">
              Real-time intelligent redaction powered by AI - Just describe,
              we'll handle the rest
            </p>
          </div>

          {/* Main Split View */}
          <div className="grid lg:grid-cols-2 gap-4 h-[calc(100vh-200px)]">
            {/* LEFT PANEL - Input & Controls */}
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {/* File Upload Card */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-purple-600" />
                    Upload Document
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {!file ? (
                    <div
                      onClick={handleButtonClick}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-all cursor-pointer bg-white hover:bg-gray-50"
                    >
                      <div className="flex justify-center mb-4">
                        <div className="flex gap-3">
                          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                            <FileText className="w-6 h-6 text-purple-600" />
                          </div>
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-blue-600" />
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700 font-medium">
                        Click to upload
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        PDF, PNG, JPG, JPEG
                      </p>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {file.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleButtonClick}
                      >
                        Change
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Intent Input Card */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Redaction Intent
                  </CardTitle>
                  <CardDescription>
                    Describe what to redact in natural language
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <textarea
                      value={intent}
                      onChange={(e) => setIntent(e.target.value)}
                      placeholder="Example: Remove all personal information and contact details but keep job titles and company names..."
                      className="w-full h-32 p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Quick Intents */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Quick Intents:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { text: "Remove all PII", icon: "🔒" },
                        { text: "Hide financial data", icon: "💰" },
                        { text: "Redact contacts only", icon: "📧" },
                        { text: "Remove names & addresses", icon: "👤" },
                      ].map((quickIntent) => (
                        <button
                          key={quickIntent.text}
                          onClick={() => setIntent(quickIntent.text)}
                          className="px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
                        >
                          {quickIntent.icon} {quickIntent.text}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Auto-redact toggle */}
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-gray-700">
                        Auto-redact after analysis
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoRedact}
                        onChange={(e) => setAutoRedact(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {/* Confidence Threshold Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Confidence Threshold: {confidenceThreshold === 0.9 ? "High (90%+)" : confidenceThreshold === 0.75 ? "Medium (75%+)" : "All (60%+)"}
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfidenceThreshold(0.9)}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg transition-all ${
                          confidenceThreshold === 0.9
                            ? "bg-red-100 text-red-700 border-2 border-red-500 font-semibold"
                            : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
                        }`}
                      >
                        🔴 High Only
                      </button>
                      <button
                        onClick={() => setConfidenceThreshold(0.75)}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg transition-all ${
                          confidenceThreshold === 0.75
                            ? "bg-orange-100 text-orange-700 border-2 border-orange-500 font-semibold"
                            : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
                        }`}
                      >
                        🟡 Medium+
                      </button>
                      <button
                        onClick={() => setConfidenceThreshold(0.6)}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg transition-all ${
                          confidenceThreshold === 0.6
                            ? "bg-yellow-100 text-yellow-700 border-2 border-yellow-500 font-semibold"
                            : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
                        }`}
                      >
                        ⚪ All
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      {confidenceThreshold === 0.9 && "Only entities with 90%+ confidence will be redacted"}
                      {confidenceThreshold === 0.75 && "Entities with 75%+ confidence will be redacted"}
                      {confidenceThreshold === 0.6 && "All detected entities (60%+) will be redacted"}
                    </p>
                  </div>

                  <Button
                    onClick={analyzeIntent}
                    disabled={!file || !intent.trim() || isAnalyzing}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                    size="lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        AI is analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Analyze with AI
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Error Display */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <Card className="border-red-500/50 bg-red-900/20 backdrop-blur">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                          <div>
                            <p className="font-medium text-red-300">Error</p>
                            <p className="text-sm text-red-400">{error}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Entities List */}
              {redactionPlan && (
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-blue-600" />
                        Detected Entities ({redactedCount}/
                        {redactionPlan.entities.length})
                      </CardTitle>
                      {redactionResult && (
                        <Button
                          onClick={resetRedaction}
                          variant="outline"
                          size="sm"
                        >
                          <Undo2 className="w-4 h-4 mr-2" />
                          Reset
                        </Button>
                      )}
                    </div>
                    <CardDescription>
                      Click to toggle redaction for each entity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                      {redactionPlan.entities.map((entity, index) => {
                        const badge = getConfidenceBadge(entity.confidence);
                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => toggleEntityRedaction(index)}
                            className={`border rounded-lg p-3 cursor-pointer transition-all ${
                              entity.isRedacted !== false
                                ? "bg-purple-50 border-purple-300 hover:bg-purple-100"
                                : "bg-gray-50 border-gray-300 opacity-50 hover:opacity-70"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {entity.isRedacted !== false ? (
                                    <Lock className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                  ) : (
                                    <Eye className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                  )}
                                  <p className="font-medium text-gray-900 truncate">
                                    {entity.text}
                                  </p>
                                </div>
                                <p className="text-sm text-gray-600 pl-6">
                                  {entity.reason}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-700">
                                  {entity.label}
                                </span>
                                <span
                                  className={`text-xs font-medium px-2 py-1 rounded border ${getConfidenceColor(
                                    entity.confidence
                                  )}`}
                                >
                                  {badge.icon} {badge.text}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Action Buttons */}
                    {!autoRedact && !redactionResult && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <Button
                          onClick={executeRedaction}
                          disabled={isRedacting || redactedCount === 0}
                          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"
                          size="lg"
                        >
                          {isRedacting ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Redacting {redactedCount} items...
                            </>
                          ) : (
                            <>
                              <Play className="w-5 h-5 mr-2" />
                              Execute Redaction ({redactedCount} items)
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Summary Card */}
              {redactionPlan && (
                <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-purple-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-purple-700">
                            Strategy
                          </p>
                          <p className="text-gray-900">
                            {redactionPlan.redaction_strategy}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-700">
                            Summary
                          </p>
                          <p className="text-sm text-gray-700">
                            {redactionPlan.summary}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* RIGHT PANEL - Live Preview */}
            <div className="space-y-4 overflow-hidden flex flex-col">
              <Card className="flex-1 flex flex-col overflow-hidden">
                <CardHeader className="pb-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-green-600" />
                      {redactionResult ? "Redacted Document" : "Live Preview"}
                      {isRedacting && (
                        <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                      )}
                    </CardTitle>
                    {(livePreviewHtml || redactionResult) && (
                      <div className="flex gap-2">
                        {redactionResult && (
                          <Button
                            onClick={downloadRedactedFile}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        )}
                        {livePreviewHtml && (
                          <Button
                            onClick={() => setShowOriginal(!showOriginal)}
                            variant="outline"
                            size="sm"
                          >
                            {showOriginal ? (
                              <>
                                <Lock className="w-4 h-4 mr-2" />
                                Show Redacted
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-2" />
                                Show Original
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <CardDescription>
                    {!file &&
                      "Upload a file and analyze to see live redaction preview"}
                    {file && !redactionPlan && "Waiting for AI analysis..."}
                    {redactionPlan &&
                      !redactionResult &&
                      "Real-time preview - toggle entities on the left"}
                    {redactionResult &&
                      `✓ ${redactionResult.total_redactions} items redacted successfully`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden flex flex-col">
                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <AnimatePresence mode="wait">
                      {!file ? (
                        <motion.div
                          key="no-file"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="h-full flex items-center justify-center"
                        >
                          <div className="text-center text-gray-500">
                            <Upload className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>No document uploaded</p>
                          </div>
                        </motion.div>
                      ) : isAnalyzing ? (
                        <motion.div
                          key="analyzing"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="h-full flex items-center justify-center"
                        >
                          <div className="text-center">
                            <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
                            <p className="text-gray-700">
                              AI is analyzing your document...
                            </p>
                          </div>
                        </motion.div>
                      ) : redactionResult ? (
                        <motion.div
                          key="result"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="h-full"
                        >
                          {redactionResult.file_type === "pdf" ? (
                            <iframe
                              src={getRedactedUrl(redactionResult.redacted_file_url)}
                              className="w-full h-full rounded border border-gray-300"
                              title="Redacted PDF"
                              key={timestamp}
                            />
                          ) : (
                            <img
                              src={getRedactedUrl(redactionResult.redacted_file_url)}
                              alt="Redacted"
                              className="max-w-full h-auto rounded border border-gray-300"
                              key={timestamp}
                            />
                          )}
                        </motion.div>
                      ) : livePreviewHtml ? (
                        <motion.div
                          key="preview"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-gray-800 leading-relaxed whitespace-pre-wrap font-mono text-sm"
                          dangerouslySetInnerHTML={{
                            __html: showOriginal
                              ? extractedText.replace(/\n/g, "<br>")
                              : livePreviewHtml,
                          }}
                        />
                      ) : filePreviewUrl ? (
                        <motion.div
                          key="file-preview"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <img
                            src={filePreviewUrl}
                            alt="Original"
                            className="max-w-full h-auto rounded border border-gray-300"
                          />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="waiting"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="h-full flex items-center justify-center"
                        >
                          <div className="text-center text-gray-500">
                            <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>Click "Analyze with AI" to start</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(243, 244, 246, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.7);
        }
      `}</style>
    </div>
  );
};

export default PromptRedaction;
