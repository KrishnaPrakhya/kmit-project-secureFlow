"use client";

import { useEffect } from "react";

interface PDFLoaderProps {
  onLoad: (pdfjs: any) => void;
  onError: (error: Error) => void;
}

const PDFLoader: React.FC<PDFLoaderProps> = ({ onLoad, onError }) => {
  useEffect(() => {
    const loadPdfJs = () => {
      try {
        // Load PDF.js entirely from CDN to avoid Next.js build issues
        // This is the most reliable approach for Next.js applications
        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs";
        script.type = "module";

        script.onload = async () => {
          try {
            // Access the global pdfjsLib object
            const pdfjsLib = (window as any).pdfjsLib;

            if (!pdfjsLib) {
              throw new Error("PDF.js library not found on window object");
            }

            // Set worker source from CDN
            pdfjsLib.GlobalWorkerOptions.workerSrc =
              "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs";

            onLoad(pdfjsLib);
          } catch (err) {
            console.error("Error initializing PDF.js:", err);
            onError(err instanceof Error ? err : new Error(String(err)));
          }
        };

        script.onerror = () => {
          const error = new Error("Failed to load PDF.js script from CDN");
          console.error(error);
          onError(error);
        };

        document.head.appendChild(script);

        return () => {
          // Cleanup: remove script when component unmounts
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
        };
      } catch (error) {
        console.error("Failed to load PDF.js library:", error);
        if (error instanceof Error) {
          onError(error);
        } else {
          onError(new Error(String(error)));
        }
      }
    };

    loadPdfJs();
  }, [onLoad, onError]);

  // This component does not render anything itself.
  return null;
};

export default PDFLoader;
