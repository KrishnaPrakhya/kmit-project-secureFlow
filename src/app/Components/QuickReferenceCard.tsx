"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Info, Keyboard } from "lucide-react";

const QuickReferenceCard: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const shortcuts = [
    { key: "Left Click + Drag", action: "Draw redaction" },
    { key: "Right Click", action: "Cancel current action" },
    { key: "Scroll Wheel", action: "Zoom in/out" },
    { key: "Space + Drag", action: "Pan canvas" },
  ];

  const tools = [
    { name: "Rectangle", desc: "Draw rectangular redaction areas" },
    { name: "Circle", desc: "Draw circular redaction areas" },
    { name: "Freehand", desc: "Draw custom shapes" },
    { name: "Eraser", desc: "Remove specific redactions" },
    { name: "Select", desc: "Select and modify redactions" },
  ];

  const styles = [
    { name: "Blackout", desc: "Solid black fill" },
    { name: "Whiteout", desc: "Solid white fill" },
    { name: "Blur", desc: "Gaussian blur effect" },
    { name: "Pixelate", desc: "Mosaic effect" },
  ];

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50 shadow-lg"
      >
        <Info className="w-4 h-4 mr-2" />
        Quick Reference
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Keyboard className="w-6 h-6 text-blue-600" />
                    <CardTitle>Manual Redaction Quick Reference</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Mouse Controls */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">
                      Mouse Controls
                    </h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {shortcuts.map((shortcut, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <kbd className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm font-mono shadow-sm min-w-[120px] text-center">
                            {shortcut.key}
                          </kbd>
                          <span className="text-sm text-gray-700">
                            {shortcut.action}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Drawing Tools */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">
                      Drawing Tools
                    </h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {tools.map((tool, index) => (
                        <div
                          key={index}
                          className="p-3 bg-blue-50 rounded-lg border border-blue-200"
                        >
                          <h4 className="font-semibold text-blue-900 mb-1">
                            {tool.name}
                          </h4>
                          <p className="text-sm text-blue-700">{tool.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Redaction Styles */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-900">
                      Redaction Styles
                    </h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {styles.map((style, index) => (
                        <div
                          key={index}
                          className="p-3 bg-purple-50 rounded-lg border border-purple-200"
                        >
                          <h4 className="font-semibold text-purple-900 mb-1">
                            {style.name}
                          </h4>
                          <p className="text-sm text-purple-700">
                            {style.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tips */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-semibold mb-2 text-gray-900">
                      💡 Pro Tips
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>
                        • Use <strong>Freehand</strong> tool for irregular
                        shapes and handwritten text
                      </li>
                      <li>
                        • Adjust <strong>Brush Size</strong> for precise control
                        over redaction areas
                      </li>
                      <li>
                        • Use <strong>Layers Panel</strong> to manage and toggle
                        visibility of multiple redactions
                      </li>
                      <li>
                        • <strong>Zoom In</strong> for detailed work on small
                        text or areas
                      </li>
                      <li>
                        • Lower <strong>Opacity</strong> to preview underlying
                        content while redacting
                      </li>
                      <li>
                        • Use <strong>Undo/Redo</strong> freely - your history
                        is preserved
                      </li>
                    </ul>
                  </div>

                  {/* Workflow Tips */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-lg font-semibold mb-2 text-gray-900">
                      🔄 Workflow Recommendations
                    </h3>
                    <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                      <li>
                        <strong>Start with Automated</strong>: Let AI detect
                        obvious entities first
                      </li>
                      <li>
                        <strong>Review Detections</strong>: Check automated
                        redactions for accuracy
                      </li>
                      <li>
                        <strong>Enhance Manually</strong>: Add missed items or
                        custom redactions
                      </li>
                      <li>
                        <strong>Use Layers</strong>: Keep automated and manual
                        redactions organized
                      </li>
                      <li>
                        <strong>Preview Before Save</strong>: Toggle visibility
                        to ensure complete coverage
                      </li>
                      <li>
                        <strong>Download & Archive</strong>: Save both original
                        and redacted versions
                      </li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default QuickReferenceCard;
