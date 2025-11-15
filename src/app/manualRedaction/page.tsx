"use client";
import React, { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Image as ImageIcon } from "lucide-react";

// Dynamically import ManualRedaction and disable SSR
const ManualRedaction = dynamic(() => import("../Components/ManualRedaction"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[600px]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading Redaction Tools...</p>
      </div>
    </div>
  ),
});

const ManualRedactionPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8 mt-14">
      <div className="max-w-[1800px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {!file ? (
            <Card className="max-w-3xl mx-auto">
              <CardHeader>
                <CardTitle className="text-3xl text-center font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Manual Redaction Tool
                </CardTitle>
                <CardDescription className="text-center text-lg">
                  Upload your document or image to begin manual redaction with
                  precision control
                </CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors">
                  <div className="flex justify-center mb-6">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                        <FileText className="w-8 h-8 text-purple-600" />
                      </div>
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-blue-600" />
                      </div>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Upload your file
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Supports PDF documents and images (PNG, JPG, JPEG)
                  </p>
                  <Button
                    onClick={handleButtonClick}
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    Select File
                  </Button>
                </div>

                <div className="mt-8 grid md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 text-blue-900">
                      Precision Tools
                    </h4>
                    <p className="text-blue-700">
                      Rectangle, circle, and freehand drawing tools for precise
                      redaction
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 text-purple-900">
                      Multiple Styles
                    </h4>
                    <p className="text-purple-700">
                      Blackout, blur, pixelate, or whiteout redaction styles
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 text-green-900">
                      Full Control
                    </h4>
                    <p className="text-green-700">
                      Undo/redo, layers, and adjustable opacity for complete
                      control
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <ManualRedaction file={file} />
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ManualRedactionPage;
