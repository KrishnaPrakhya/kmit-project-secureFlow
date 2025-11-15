"use client";
import React, { useState } from "react";
import dynamic from "next/dynamic";
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
  Wand2,
  Hand,
  ArrowRight,
  ArrowLeft,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import EntitySelect from "./EntitySelect";
import { RedactionLevel1 } from "./RedactionLevel1";

// Load ManualRedaction component only on client-side
const ManualRedaction = dynamic(() => import("./ManualRedaction"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading manual redaction...</p>
      </div>
    </div>
  ),
});

interface RedactionWorkflowProps {
  file: File | null;
}

type WorkflowStep = "choose" | "automated" | "manual" | "review";

const RedactionWorkflow: React.FC<RedactionWorkflowProps> = ({ file }) => {
  const dispatch: AppDispatch = useDispatch();
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("choose");
  const [automatedComplete, setAutomatedComplete] = useState(false);
  const [manualComplete, setManualComplete] = useState(false);
  const [redactionMode, setRedactionMode] = useState<
    "automated" | "manual" | "hybrid" | null
  >(null);

  const { entities } = useSelector((state: RootState) => state.options);
  const { progressNum, redactStatus } = useSelector(
    (state: RootState) => state.ProgressSlice
  );

  const handleModeSelection = (mode: "automated" | "manual" | "hybrid") => {
    setRedactionMode(mode);
    if (mode === "automated") {
      setCurrentStep("automated");
    } else if (mode === "manual") {
      setCurrentStep("manual");
    } else if (mode === "hybrid") {
      setCurrentStep("automated");
    }
  };

  const handleAutomatedComplete = () => {
    setAutomatedComplete(true);
    if (redactionMode === "hybrid") {
      // Show option to enhance with manual redaction
      setCurrentStep("manual");
    } else {
      setCurrentStep("review");
    }
  };

  const handleManualComplete = () => {
    setManualComplete(true);
    setCurrentStep("review");
  };

  const handleProceedToManual = () => {
    setCurrentStep("manual");
  };

  const handleStartOver = () => {
    setCurrentStep("choose");
    setRedactionMode(null);
    setAutomatedComplete(false);
    setManualComplete(false);
  };

  if (!file) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2">No File Selected</h3>
          <p className="text-gray-500">
            Please upload a document or image to begin redaction
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            {[
              { step: "choose", label: "Choose Mode", icon: Hand },
              { step: "automated", label: "Auto Redact", icon: Wand2 },
              { step: "manual", label: "Manual Edit", icon: Hand },
              { step: "review", label: "Review", icon: CheckCircle2 },
            ].map((item, index) => (
              <React.Fragment key={item.step}>
                <div
                  className={`flex flex-col items-center ${
                    currentStep === item.step
                      ? "text-blue-600"
                      : "text-gray-400"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                      currentStep === item.step
                        ? "bg-blue-600 text-white scale-110"
                        : "bg-gray-200"
                    }`}
                  >
                    <item.icon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                {index < 3 && (
                  <ArrowRight
                    className={`w-6 h-6 ${
                      currentStep === item.step
                        ? "text-blue-600"
                        : "text-gray-300"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full"
              initial={{ width: "0%" }}
              animate={{
                width:
                  currentStep === "choose"
                    ? "0%"
                    : currentStep === "automated"
                    ? "33%"
                    : currentStep === "manual"
                    ? "66%"
                    : "100%",
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {/* Step 1: Choose Mode */}
        {currentStep === "choose" && (
          <motion.div
            key="choose"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">
                  Choose Redaction Method
                </CardTitle>
                <CardDescription>
                  Select how you want to redact sensitive information from your
                  document
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Automated Option */}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Card
                      className="cursor-pointer border-2 border-blue-200 hover:border-blue-500 transition-all h-full"
                      onClick={() => handleModeSelection("automated")}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Wand2 className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">
                          Automated Redaction
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          AI-powered entity detection automatically identifies
                          and redacts sensitive information
                        </p>
                        <div className="space-y-2 text-left text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span>Fast & Efficient</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span>150+ Entity Types</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span>Consistent Results</span>
                          </div>
                        </div>
                        <Button className="w-full mt-6">
                          Choose Automated
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Manual Option */}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Card
                      className="cursor-pointer border-2 border-purple-200 hover:border-purple-500 transition-all h-full"
                      onClick={() => handleModeSelection("manual")}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Hand className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">
                          Manual Redaction
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Draw and select areas to redact with full control over
                          every detail
                        </p>
                        <div className="space-y-2 text-left text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span>Precision Control</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span>Multiple Tools</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span>Visual Feedback</span>
                          </div>
                        </div>
                        <Button className="w-full mt-6" variant="secondary">
                          Choose Manual
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Hybrid Option */}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Card
                      className="cursor-pointer border-2 border-gradient-to-r from-blue-200 to-purple-200 hover:border-gradient-to-r hover:from-blue-500 hover:to-purple-500 transition-all h-full"
                      onClick={() => handleModeSelection("hybrid")}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <div className="flex items-center">
                            <Wand2 className="w-6 h-6 text-white" />
                            <Hand className="w-6 h-6 text-white -ml-2" />
                          </div>
                        </div>
                        <h3 className="text-xl font-bold mb-2">
                          Hybrid Mode
                          <span className="ml-2 text-xs bg-gradient-to-r from-blue-500 to-purple-500 text-white px-2 py-1 rounded">
                            RECOMMENDED
                          </span>
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Start with automated detection, then enhance with
                          manual precision
                        </p>
                        <div className="space-y-2 text-left text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span>Best of Both Worlds</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span>Catch Missed Items</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span>Maximum Accuracy</span>
                          </div>
                        </div>
                        <Button
                          className="w-full mt-6 bg-gradient-to-r from-blue-500 to-purple-500"
                          variant="default"
                        >
                          Choose Hybrid
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Automated Redaction */}
        {currentStep === "automated" && (
          <motion.div
            key="automated"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-6 h-6 text-blue-500" />
                  Automated Redaction
                </CardTitle>
                <CardDescription>
                  Select entities to redact automatically
                </CardDescription>
              </CardHeader>
            </Card>

            {entities.length === 0 ? (
              <RedactionLevel1 File={file} />
            ) : (
              <div className="space-y-4">
                <EntitySelect File={file} />

                {redactStatus && (
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-8 h-8 text-green-600" />
                          <div>
                            <h3 className="font-semibold text-green-900">
                              Automated Redaction Complete!
                            </h3>
                            <p className="text-sm text-green-700">
                              {redactionMode === "hybrid"
                                ? "Would you like to enhance with manual redaction?"
                                : "Your document has been successfully redacted"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {redactionMode === "hybrid" && (
                            <Button onClick={handleProceedToManual}>
                              Enhance Manually
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            onClick={handleAutomatedComplete}
                          >
                            Finish
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {entities.length > 0 && !redactStatus && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-blue-700">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm">
                          No entities detected? You can skip to manual redaction
                          to redact the content yourself.
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleProceedToManual}
                          className="ml-auto"
                        >
                          Skip to Manual
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handleStartOver}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Choose
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Manual Redaction */}
        {currentStep === "manual" && (
          <motion.div
            key="manual"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <ManualRedaction
              {...({ file, automatedRedactionComplete: automatedComplete, onComplete: handleManualComplete } as any)}
            />

            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={() =>
                  setCurrentStep(automatedComplete ? "automated" : "choose")
                }
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              {manualComplete && (
                <Button onClick={() => setCurrentStep("review")}>
                  Review Redactions
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 4: Review */}
        {currentStep === "review" && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  Redaction Complete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 p-8 rounded-lg text-center">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">
                      Successfully Redacted!
                    </h2>
                    <p className="text-gray-600 mb-6">
                      Your document has been processed and is ready for download
                    </p>

                    <div className="grid md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-white p-4 rounded-lg shadow">
                        <p className="text-sm text-gray-600">Method Used</p>
                        <p className="text-lg font-semibold capitalize">
                          {redactionMode}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow">
                        <p className="text-sm text-gray-600">Automated</p>
                        <p className="text-lg font-semibold">
                          {automatedComplete ? "Yes" : "No"}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow">
                        <p className="text-sm text-gray-600">Manual Edits</p>
                        <p className="text-lg font-semibold">
                          {manualComplete ? "Yes" : "No"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 justify-center">
                      <Button size="lg" onClick={handleStartOver}>
                        Redact Another File
                      </Button>
                      <Button size="lg" variant="outline">
                        View in Dashboard
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RedactionWorkflow;
