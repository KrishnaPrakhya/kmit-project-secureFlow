"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Eye,
  EyeOff,
  Download,
  Share2,
  Info,
  CheckCircle2,
} from "lucide-react";
import ManualRedaction from "./ManualRedaction";

interface EnhancedManualRedactionProps {
  file: File | null;
  automatedRedactionComplete?: boolean;
  onComplete?: () => void;
}

const EnhancedManualRedaction: React.FC<EnhancedManualRedactionProps> = ({
  file,
  automatedRedactionComplete = false,
  onComplete,
}) => {
  const [showComparison, setShowComparison] = useState(false);
  const [showTips, setShowTips] = useState(true);

  return (
    <div className="space-y-6">
      {/* Quick Tips */}
      {showTips && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <Info className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">
                      Quick Tips for Manual Redaction
                    </h3>
                    <div className="grid md:grid-cols-2 gap-3 text-sm text-blue-800">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                          Use <strong>Rectangle</strong> tool for text blocks
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                          Use <strong>Circle</strong> tool for faces or logos
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                          Use <strong>Freehand</strong> for irregular shapes
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong>Zoom in</strong> for precise redaction
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong>Undo/Redo</strong> available in toolbar
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>Review each page carefully for PDFs</span>
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTips(false)}
                  className="flex-shrink-0"
                >
                  <EyeOff className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!showTips && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTips(true)}
          className="flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          Show Tips
        </Button>
      )}

      {/* Main Manual Redaction Component */}
      <ManualRedaction
        file={file}
        automatedRedactionComplete={automatedRedactionComplete}
        onComplete={onComplete}
      />

      {/* Additional Actions Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Info className="w-4 h-4" />
              <span>Remember to save your changes before leaving</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Preview
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedManualRedaction;
