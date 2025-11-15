"use client";
import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import RedactionConfig from "../Components/RedactionConfig";
import RedactionWorkflow from "../Components/RedactionWorkflow";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import {
  FileText,
  Image,
  Upload,
  CheckCircle,
  AlertCircle,
  Wand2,
  Hand,
  ArrowRight,
  Edit,
  Download,
  Eye,
} from "lucide-react";
import { AppDispatch, RootState } from "@/redux/store";
import { setEntities } from "@/features/Options/OptionsSlice";
import axios from "axios";
import DocumentViewer from "../Components/DocumentViewer";

// Load EnhancedManualRedaction dynamically
const EnhancedManualRedaction = dynamic(
  () => import("../Components/EnhancedManualRedaction"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading manual redaction tools...</p>
        </div>
      </div>
    ),
  }
);

function GradationalRedaction() {
  const [file, setFile] = useState<File | null>(null);
  const [showConfigs, setShowConfigs] = useState(false);
  const [fileActive, setFileActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pdfRedaction, setPdfRedaction] = useState<boolean | null>(null);
  const [imageRedaction, setImageRedaction] = useState<boolean | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [useWorkflow, setUseWorkflow] = useState(false);
  const [showManualEnhancement, setShowManualEnhancement] = useState(false);
  const [manualEnhancementComplete, setManualEnhancementComplete] =
    useState(false);
  const dispatch: AppDispatch = useDispatch();

  const uploadSuccessRef = useRef<HTMLDivElement>(null);
  const configSectionRef = useRef<HTMLDivElement>(null);
  const { progressNum, redactStatus } = useSelector(
    (state: RootState) => state.ProgressSlice
  );
  useEffect(() => {
    if (fileActive && uploadSuccessRef.current) {
      uploadSuccessRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [fileActive]);

  useEffect(() => {
    if (showConfigs && configSectionRef.current) {
      configSectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [showConfigs]);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);

      const response = await fetch("http://127.0.0.1:5000/api/entities", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();

        // Check if entities were detected
        if (data.entities && data.entities.length > 0) {
          dispatch(setEntities(data.entities));
          setShowConfigs(true);
        } else {
          // No entities detected, show workflow with option to go manual
          dispatch(setEntities([]));
          setUseWorkflow(true);
          setShowConfigs(true);
        }
      }
    } catch (err) {
      console.error("Error uploading file:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileActive(true);
    }
  };

  const handleManualEnhancementComplete = () => {
    // Mark manual enhancement as complete
    setManualEnhancementComplete(true);
    setShowManualEnhancement(false);

    // Show success message
    alert(
      "Manual enhancement saved successfully! Your redacted document has been updated."
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8 mt-14">
      <div className="max-w-[1600px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-3xl text-center font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Intelligent Document Redaction System
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center text-gray-600">
              Choose your redaction type and follow the simple steps to secure
              your documents
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className={`p-6 rounded-xl shadow-lg transition-colors ${
                pdfRedaction
                  ? "bg-purple-100 border-2 border-purple-500"
                  : "bg-white"
              }`}
              onClick={() => {
                setPdfRedaction(true);
                setImageRedaction(false);
              }}
            >
              <div className="flex items-center gap-4 mb-4">
                <FileText size={32} className="text-purple-600" />
                <h2 className="text-xl font-semibold">PDF Redaction</h2>
              </div>
              <p className="text-gray-600">
                Securely redact sensitive information from PDF documents while
                maintaining document structure and formatting.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className={`p-6 rounded-xl shadow-lg transition-colors ${
                imageRedaction
                  ? "bg-blue-100 border-2 border-blue-500"
                  : "bg-white"
              }`}
              onClick={() => {
                setImageRedaction(true);
                setPdfRedaction(false);
              }}
            >
              <div className="flex items-center gap-4 mb-4">
                <Image size={32} className="text-blue-600" />
                <h2 className="text-xl font-semibold">Image Redaction</h2>
              </div>
              <p className="text-gray-600">
                Protect sensitive information in images with advanced redaction
                techniques and customizable masking options.
              </p>
            </motion.div>
          </div>

          {(pdfRedaction || imageRedaction) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Card>
                <CardContent className="p-6">
                  {!fileActive ? (
                    <div className="text-center">
                      <input
                        type="file"
                        accept={pdfRedaction ? ".pdf" : "image/*"}
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-4">
                        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Upload your {pdfRedaction ? "PDF" : "image"} file
                        </h3>
                        <p className="text-gray-500 mb-4">
                          Click to select or drag and drop your file here
                        </p>
                        <Button
                          onClick={handleButtonClick}
                          variant="secondary"
                          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                        >
                          Select File
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div ref={uploadSuccessRef} className="text-center">
                      <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        File uploaded successfully!
                      </h3>
                      <Button
                        onClick={handleFileUpload}
                        disabled={isUploading}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                      >
                        {isUploading ? "Processing..." : "Start Redaction"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {showConfigs && file && (
            <>
              {!showManualEnhancement ? (
                <>
                  {/* Automated Redaction View */}
                  <div className="flex gap-4 h-[calc(100vh-200px)] mb-6">
                    <div className="w-[60%]">
                      <DocumentViewer
                        file={file}
                        isPDF={pdfRedaction!}
                        progressNum={progressNum}
                      />
                    </div>

                    <div className="w-[40%]">
                      <motion.div
                        ref={configSectionRef}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="rounded-xl shadow-lg overflow-y-auto h-full"
                      >
                        <RedactionConfig File={file} />
                      </motion.div>
                    </div>
                  </div>

                  {/* Manual Enhancement Prompt - Shows after automated redaction */}
                  {redactStatus && !manualEnhancementComplete && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6"
                    >
                      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 shadow-lg">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-purple-900 mb-2">
                                Automated Redaction Complete! 🎉
                              </h3>
                              <p className="text-purple-800 mb-4">
                                Your document has been automatically redacted.
                                Would you like to review and add manual
                                enhancements for maximum accuracy?
                              </p>

                              <div className="grid md:grid-cols-2 gap-4 mb-4">
                                <div className="flex items-start gap-2 text-sm text-purple-700">
                                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                  <span>Catch any missed entities</span>
                                </div>
                                <div className="flex items-start gap-2 text-sm text-purple-700">
                                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                  <span>Add custom redactions</span>
                                </div>
                                <div className="flex items-start gap-2 text-sm text-purple-700">
                                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                  <span>Fine-tune sensitive areas</span>
                                </div>
                                <div className="flex items-start gap-2 text-sm text-purple-700">
                                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                  <span>Quality assurance review</span>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-3">
                                <Button
                                  onClick={() => setShowManualEnhancement(true)}
                                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg"
                                  size="lg"
                                >
                                  <Hand className="w-5 h-5 mr-2" />
                                  Enhance with Manual Redaction
                                  <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="lg"
                                  onClick={() => {
                                    const url = pdfRedaction
                                      ? "http://127.0.0.1:5000/api/downloadRedactedFile?type=pdf"
                                      : "http://127.0.0.1:5000/api/downloadRedactedFile?type=image";
                                    window.location.href = url;
                                  }}
                                  className="border-2 border-purple-200"
                                >
                                  Skip & Download
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* Manual Enhancement Complete Card */}
                  {manualEnhancementComplete && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6"
                    >
                      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 shadow-lg">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-green-900 mb-2">
                                Manual Enhancement Complete! ✅
                              </h3>
                              <p className="text-green-800 mb-4">
                                Your document has been enhanced with additional
                                manual redactions. It's now ready for download!
                              </p>

                              <div className="flex flex-wrap gap-3">
                                <Button
                                  onClick={() => {
                                    const url = pdfRedaction
                                      ? "http://127.0.0.1:5000/api/downloadRedactedFile?type=pdf"
                                      : "http://127.0.0.1:5000/api/downloadRedactedFile?type=image";
                                    window.location.href = url;
                                  }}
                                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg"
                                  size="lg"
                                >
                                  <Download className="w-5 h-5 mr-2" />
                                  Download Redacted File
                                </Button>
                                <Button
                                  variant="outline"
                                  size="lg"
                                  onClick={() => {
                                    const url = pdfRedaction
                                      ? "/redacted_document.pdf"
                                      : "/redacted_image.jpg";
                                    window.open(url, "_blank");
                                  }}
                                  className="border-2 border-green-200"
                                >
                                  <Eye className="w-5 h-5 mr-2" />
                                  Preview
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="lg"
                                  onClick={() => {
                                    setFileActive(false);
                                    setShowConfigs(false);
                                    setFile(null);
                                    setManualEnhancementComplete(false);
                                    setPdfRedaction(null);
                                    setImageRedaction(null);
                                  }}
                                  className="text-gray-600"
                                >
                                  Start New Redaction
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </>
              ) : (
                <>
                  {/* Manual Enhancement View */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                  >
                    <Card className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Edit className="w-6 h-6" />
                            <div>
                              <h3 className="font-bold text-lg">
                                Manual Enhancement Mode
                              </h3>
                              <p className="text-sm text-blue-100">
                                Review and enhance the automated redaction
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="secondary"
                            onClick={() => setShowManualEnhancement(false)}
                            className="bg-white text-purple-600 hover:bg-gray-100"
                          >
                            Back to Preview
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <EnhancedManualRedaction
                    file={file}
                    automatedRedactionComplete={true}
                    onComplete={handleManualEnhancementComplete}
                  />
                </>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default GradationalRedaction;
