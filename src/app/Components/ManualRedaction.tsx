"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Square,
  Eraser,
  Undo,
  Redo,
  Download,
  Trash2,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Layers,
  Save,
  MousePointer2,
  Pencil,
  Circle,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
  Hand,
} from "lucide-react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/redux/store";
import { setProgressNum } from "@/features/progress/ProgressSlice";
import PDFLoader from "./PDFLoader";

interface ManualRedactionProps {
  file: File | null;
  onComplete?: () => void;
  automatedRedactionComplete?: boolean;
}

interface RedactionBox {
  id: string;
  type: "rectangle" | "freehand" | "circle";
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: { x: number; y: number }[];
  style: "blackout" | "blur" | "pixelate" | "whiteout";
  visible: boolean;
  pageNumber: number;
}

const ManualRedaction: React.FC<ManualRedactionProps> = ({
  file,
  onComplete,
  automatedRedactionComplete = false,
}) => {
  const dispatch: AppDispatch = useDispatch();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // File and loading state
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPDF, setIsPDF] = useState(false);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [pdfLib, setPdfLib] = useState<any>(null);
  const [pdfError, setPdfError] = useState<Error | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isLoadingRedacted, setIsLoadingRedacted] = useState(false);

  // PDF Page state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pdfPages, setPdfPages] = useState<Map<number, HTMLCanvasElement>>(
    new Map()
  );

  // Tool state
  const [activeTool, setActiveTool] = useState<
    "select" | "rectangle" | "freehand" | "circle" | "eraser"
  >("select");
  const [redactionStyle, setRedactionStyle] = useState<
    "blackout" | "blur" | "pixelate" | "whiteout"
  >("blackout");
  const [brushSize, setBrushSize] = useState(20);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentPoints, setCurrentPoints] = useState<
    { x: number; y: number }[]
  >([]);

  // Redaction state
  const [redactions, setRedactions] = useState<RedactionBox[]>([]);
  const [history, setHistory] = useState<RedactionBox[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedRedactionId, setSelectedRedactionId] = useState<string | null>(
    null
  );

  // View state
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showLayers, setShowLayers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Effect to handle file loading
  useEffect(() => {
    if (!file) return;

    // Reset state for new file
    resetState();

    // If automated redaction was completed, load the redacted version
    if (automatedRedactionComplete) {
      loadRedactedFile(file);
    } else if (file.type === "application/pdf") {
      setIsPDF(true);
      if (pdfLib) {
        loadPDF(file);
      }
    } else if (file.type.startsWith("image/")) {
      setIsPDF(false);
      loadImage(file);
    }
  }, [file, pdfLib, automatedRedactionComplete]);

  const resetState = () => {
    setImage(null);
    setImageLoaded(false);
    setIsPDF(false);
    setPdfDocument(null);
    setCurrentPage(1);
    setTotalPages(1);
    setPdfPages(new Map());
    setRedactions([]);
    setHistory([]);
    setHistoryIndex(-1);
    setZoom(1);
    setRotation(0);
  };

  const loadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setImageLoaded(true);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const loadRedactedFile = async (file: File) => {
    setIsLoadingRedacted(true);
    try {
      const isPDFFile = file.type === "application/pdf";
      setIsPDF(isPDFFile);

      // Load the redacted version from server
      const redactedUrl = isPDFFile
        ? "/redacted_document.pdf"
        : "/redacted_image.jpg";

      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const urlWithTimestamp = `${redactedUrl}?t=${timestamp}`;

      if (isPDFFile) {
        if (!pdfLib) {
          setIsLoadingRedacted(false);
          return;
        }
        // Fetch the redacted PDF
        const response = await fetch(urlWithTimestamp);
        if (!response.ok) throw new Error("Failed to load redacted PDF");
        const arrayBuffer = await response.arrayBuffer();
        const loadingTask = pdfLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        setImageLoaded(true);
      } else {
        // Fetch the redacted image
        const response = await fetch(urlWithTimestamp);
        if (!response.ok) throw new Error("Failed to load redacted image");
        const blob = await response.blob();
        const img = new Image();
        img.onload = () => {
          setImage(img);
          setImageLoaded(true);
        };
        img.src = URL.createObjectURL(blob);
      }
    } catch (error) {
      console.error("Error loading redacted file:", error);
      // Fallback to loading original file
      if (file.type === "application/pdf") {
        setIsPDF(true);
        if (pdfLib) loadPDF(file);
      } else {
        setIsPDF(false);
        loadImage(file);
      }
    } finally {
      setIsLoadingRedacted(false);
    }
  };

  const loadPDF = async (file: File) => {
    if (!pdfLib) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);
      setImageLoaded(true); // Indicates that the file is ready to be rendered
    } catch (error) {
      console.error("Error loading PDF:", error);
      setPdfError(error instanceof Error ? error : new Error(String(error)));
    }
  };

  // Effect to render the current page when it changes or file loads
  useEffect(() => {
    if (imageLoaded) {
      if (isPDF && pdfDocument) {
        renderPDFPage(pdfDocument, currentPage);
      } else if (!isPDF && image) {
        drawCanvas();
      }
    }
  }, [imageLoaded, isPDF, pdfDocument, currentPage, image]);

  // Effect to redraw canvases when view changes
  useEffect(() => {
    drawCanvas();
    drawRedactions();
  }, [zoom, rotation, redactions, selectedRedactionId, pdfPages, currentPage]);

  const renderPDFPage = async (pdf: any, pageNumber: number) => {
    if (pdfPages.has(pageNumber)) {
      drawCanvas();
      return;
    }
    setIsRendering(true);
    try {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 }); // Render at a higher scale for quality
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
        setPdfPages((prev) => new Map(prev).set(pageNumber, canvas));
      }
    } catch (error) {
      console.error(`Error rendering PDF page ${pageNumber}:`, error);
    } finally {
      setIsRendering(false);
    }
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let sourceCanvas: HTMLCanvasElement | HTMLImageElement | null = null;
    if (isPDF) {
      sourceCanvas = pdfPages.get(currentPage) || null;
    } else {
      sourceCanvas = image;
    }

    if (!sourceCanvas) {
      // Clear canvas if no source
      canvas.width = overlayCanvasRef.current?.width || 800;
      canvas.height = overlayCanvasRef.current?.height || 600;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    console.log(
      "Drawing canvas with source dimensions:",
      sourceCanvas.width,
      "x",
      sourceCanvas.height
    );

    const scaledWidth = sourceCanvas.width * zoom;
    const scaledHeight = sourceCanvas.height * zoom;

    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
    if (overlayCanvasRef.current) {
      overlayCanvasRef.current.width = scaledWidth;
      overlayCanvasRef.current.height = scaledHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(
      sourceCanvas,
      -scaledWidth / 2,
      -scaledHeight / 2,
      scaledWidth,
      scaledHeight
    );
    ctx.restore();
  };

  const drawRedactions = () => {
    const canvas = overlayCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    const pageRedactions = redactions.filter(
      (r) => r.pageNumber === currentPage
    );

    pageRedactions.forEach((redaction) => {
      if (!redaction.visible) return;

      const x = redaction.x * zoom;
      const y = redaction.y * zoom;

      ctx.fillStyle = "#000"; // For blackout
      ctx.strokeStyle = "#000";
      ctx.lineWidth = brushSize * zoom;

      switch (redaction.type) {
        case "rectangle":
          ctx.fillRect(x, y, redaction.width! * zoom, redaction.height! * zoom);
          break;
        case "circle":
          ctx.beginPath();
          ctx.arc(
            x + (redaction.width! * zoom) / 2,
            y + (redaction.height! * zoom) / 2,
            (redaction.width! * zoom) / 2,
            0,
            2 * Math.PI
          );
          ctx.fill();
          break;
        case "freehand":
          if (redaction.points && redaction.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(
              redaction.points[0].x * zoom,
              redaction.points[0].y * zoom
            );
            for (let i = 1; i < redaction.points.length; i++) {
              ctx.lineTo(
                redaction.points[i].x * zoom,
                redaction.points[i].y * zoom
              );
            }
            ctx.stroke();
          }
          break;
      }
    });
    ctx.restore();
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    // Transform coordinates to account for zoom and rotation
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Inverse transform
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const angle = (-rotation * Math.PI) / 180;

    const rotatedX =
      (x - centerX) * Math.cos(angle) -
      (y - centerY) * Math.sin(angle) +
      centerX;
    const rotatedY =
      (x - centerX) * Math.sin(angle) +
      (y - centerY) * Math.cos(angle) +
      centerY;

    return { x: rotatedX / zoom, y: rotatedY / zoom };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPoint(pos);
    if (activeTool === "freehand") {
      setCurrentPoints([pos]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getMousePos(e);
    if (activeTool === "freehand") {
      setCurrentPoints((prev) => [...prev, pos]);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getMousePos(e);

    let newRedaction: RedactionBox | null = null;
    const baseRedaction = {
      id: Date.now().toString(),
      visible: true,
      style: redactionStyle,
      pageNumber: currentPage,
    };

    if (activeTool === "rectangle") {
      const rectX = Math.min(startPoint.x, pos.x);
      const rectY = Math.min(startPoint.y, pos.y);
      const rectWidth = Math.abs(pos.x - startPoint.x);
      const rectHeight = Math.abs(pos.y - startPoint.y);

      console.log("Creating rectangle redaction:", {
        startPoint,
        endPoint: pos,
        rectangle: { x: rectX, y: rectY, width: rectWidth, height: rectHeight },
        zoom,
        rotation,
      });

      newRedaction = {
        ...baseRedaction,
        type: "rectangle",
        x: rectX,
        y: rectY,
        width: rectWidth,
        height: rectHeight,
      };
    } else if (activeTool === "circle") {
      const width = Math.abs(pos.x - startPoint.x);
      const height = Math.abs(pos.y - startPoint.y);
      newRedaction = {
        ...baseRedaction,
        type: "circle",
        x: Math.min(startPoint.x, pos.x),
        y: Math.min(startPoint.y, pos.y),
        width: width,
        height: height,
      };
    } else if (activeTool === "freehand") {
      newRedaction = {
        ...baseRedaction,
        type: "freehand",
        points: [...currentPoints, pos],
        x: Math.min(...currentPoints.map((p) => p.x)),
        y: Math.min(...currentPoints.map((p) => p.y)),
      };
    }

    if (newRedaction) {
      const newRedactions = [...redactions, newRedaction];
      console.log("=== New redaction added ===");
      console.log("New redaction:", newRedaction);
      console.log("Total redactions now:", newRedactions.length);
      setRedactions(newRedactions);
      addToHistory(newRedactions);
    }

    setIsDrawing(false);
    setCurrentPoints([]);
    dispatch(setProgressNum(85));
  };

  const addToHistory = (newRedactions: RedactionBox[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newRedactions);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setRedactions(history[newIndex]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setRedactions([]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setRedactions(history[newIndex]);
    }
  };

  const handleClearAll = () => {
    setRedactions([]);
    addToHistory([]);
  };

  const handleSaveRedactions = async () => {
    console.log("=== handleSaveRedactions called ===");
    console.log("Redactions array:", redactions);
    console.log("Redactions length:", redactions.length);
    console.log("Automated redaction complete:", automatedRedactionComplete);

    if (redactions.length === 0 && !automatedRedactionComplete) {
      alert("No redactions to save. Please add some redactions first.");
      return;
    }

    setIsSaving(true);
    try {
      if (isPDF) {
        // For PDF: Send all pages with redactions to backend
        await savePDFWithRedactions();

        // Reload the PDF to show the updated version
        await reloadRedactedPDF();
      } else {
        // For images: Save the merged canvas directly
        console.log("Saving image with redactions...");
        await saveImageWithRedactions();

        console.log("Reloading redacted image...");
        // Reload the image to show the updated version
        await reloadRedactedImage();
        console.log("Image reload complete");
      }

      alert(
        `${
          automatedRedactionComplete ? "Manual enhancement" : "Manual redaction"
        } saved successfully!`
      );

      // Clear the redactions since they're now baked into the file
      setRedactions([]);
      addToHistory([]);

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Error saving redactions:", error);
      alert(
        `Failed to save redactions: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const reloadRedactedPDF = async () => {
    if (!pdfLib) return;

    try {
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const redactedUrl = `/redacted_document.pdf?t=${timestamp}`;

      // Fetch the updated redacted PDF
      const response = await fetch(redactedUrl);
      if (!response.ok) throw new Error("Failed to reload redacted PDF");

      const arrayBuffer = await response.arrayBuffer();
      const loadingTask = pdfLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      // Clear the cached pages
      setPdfPages(new Map());

      // Update the PDF document
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);

      // Re-render the current page
      await renderPDFPage(pdf, currentPage);
    } catch (error) {
      console.error("Error reloading PDF:", error);
      throw error;
    }
  };

  const reloadRedactedImage = async () => {
    try {
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const redactedUrl = `/redacted_image.jpg?t=${timestamp}`;

      console.log("Reloading redacted image from:", redactedUrl);

      // Fetch the updated redacted image with cache-busting headers
      const response = await fetch(redactedUrl, {
        cache: "no-cache",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) throw new Error("Failed to reload redacted image");

      const blob = await response.blob();
      console.log("Reloaded image blob size:", blob.size);

      const img = new Image();

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          console.log(
            "Image reloaded successfully, dimensions:",
            img.width,
            "x",
            img.height
          );
          setImage(img);
          drawCanvas();
          resolve();
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = URL.createObjectURL(blob);
      });
    } catch (error) {
      console.error("Error reloading image:", error);
      throw error;
    }
  };

  const saveImageWithRedactions = async () => {
    // Create a merged canvas with both the document and redactions
    const mergedCanvas = document.createElement("canvas");
    const mergedCtx = mergedCanvas.getContext("2d");

    if (!mergedCtx || !canvasRef.current || !overlayCanvasRef.current) {
      throw new Error("Canvas not available");
    }

    // Set merged canvas size
    mergedCanvas.width = canvasRef.current.width;
    mergedCanvas.height = canvasRef.current.height;

    // Draw the document
    mergedCtx.drawImage(canvasRef.current, 0, 0);

    // Draw the redactions on top
    mergedCtx.drawImage(overlayCanvasRef.current, 0, 0);

    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      mergedCanvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create blob"));
        },
        "image/jpeg",
        0.95
      );
    });

    console.log("Saving merged canvas with blob size:", blob.size);

    // Create form data to update the redacted file directly
    const updateFormData = new FormData();
    updateFormData.append("file", blob, "redacted_image.jpg");

    // Update the redacted file in the public folder
    const updateResponse = await fetch(
      "http://127.0.0.1:5000/api/updateRedactedFile",
      {
        method: "POST",
        body: updateFormData,
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      throw new Error(errorData.error || "Failed to save redactions");
    }

    const responseData = await updateResponse.json();
    console.log("Save response:", responseData);

    // Add a small delay to ensure file is fully written
    await new Promise((resolve) => setTimeout(resolve, 500));
  };

  const savePDFWithRedactions = async () => {
    console.log("=== savePDFWithRedactions called ===");
    // For PDF, we need to send redaction coordinates to backend
    // The backend will apply redactions to the original PDF
    const formData = new FormData();

    if (!pdfDocument) {
      throw new Error("No PDF document loaded");
    }

    // Get the original PDF page dimensions (not scaled dimensions)
    const firstPage = await pdfDocument.getPage(1);
    const originalViewport = firstPage.getViewport({ scale: 1.0 }); // Original size
    const scaledViewport = firstPage.getViewport({ scale: 1.5 }); // Rendered size
    const pdfPageWidth = originalViewport.width; // Use original dimensions
    const pdfPageHeight = originalViewport.height;

    // Get canvas dimensions
    const canvas = canvasRef.current;
    if (!canvas) {
      throw new Error("Canvas not available");
    }
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    console.log("About to calculate scale factors...");
    // Calculate scale factors (canvas to ORIGINAL PDF coordinates)
    // Canvas is rendered at 1.5x, so we need to convert back to 1.0x
    const scaleX = pdfPageWidth / canvasWidth;
    const scaleY = pdfPageHeight / canvasHeight;

    console.log("=== PDF Coordinate Conversion ===");
    console.log("Canvas dimensions:", canvasWidth, "x", canvasHeight);
    console.log(
      "PDF page dimensions (original):",
      pdfPageWidth,
      "x",
      pdfPageHeight
    );
    console.log(
      "PDF page dimensions (scaled 1.5x):",
      scaledViewport.width,
      "x",
      scaledViewport.height
    );
    console.log("Scale factors (canvas to PDF):", scaleX, scaleY);
    console.log("Current zoom:", zoom);
    console.log("Current rotation:", rotation);

    // Group redactions by page and convert coordinates
    const redactionsByPage: { [key: number]: RedactionBox[] } = {};
    redactions.forEach((redaction) => {
      const pageNum = redaction.pageNumber;
      if (!redactionsByPage[pageNum]) {
        redactionsByPage[pageNum] = [];
      }

      // Convert canvas coordinates (top-left origin, scaled 1.5x) 
      // to PDF coordinates (bottom-left origin, scale 1.0x)
      const convertedRedaction = {
        ...redaction,
        x: redaction.x * scaleX,
        y: redaction.y * scaleY,
        width: (redaction.width || 0) * scaleX,
        height: (redaction.height || 0) * scaleY,
      };

      console.log(`Redaction on page ${pageNum}:`, {
        original: {
          x: redaction.x,
          y: redaction.y,
          w: redaction.width,
          h: redaction.height,
        },
        converted: {
          x: convertedRedaction.x,
          y: convertedRedaction.y,
          w: convertedRedaction.width,
          h: convertedRedaction.height,
        },
        pdfDimensions: { w: pdfPageWidth, h: pdfPageHeight },
        factors: { scaleX, scaleY },
      });

      redactionsByPage[pageNum].push(convertedRedaction);
    });

    console.log("=== Saving PDF Redactions ===");
    console.log("Total redactions:", redactions.length);
    console.log(
      "Redactions by page:",
      Object.keys(redactionsByPage).map(
        (k) => `Page ${k}: ${redactionsByPage[parseInt(k)].length} redactions`
      )
    );
    console.log("Current page:", currentPage);
    console.log("Total pages:", totalPages);

    // Send redaction data
    formData.append("redactions", JSON.stringify(redactionsByPage));
    formData.append("total_pages", totalPages.toString());
    formData.append("is_enhancement", automatedRedactionComplete.toString());

    // If we have the original file, send it
    if (file) {
      formData.append("file", file);
    }

    console.log("Sending to /api/applyManualPDFRedactions");

    const response = await fetch(
      "http://127.0.0.1:5000/api/applyManualPDFRedactions",
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to save PDF redactions");
    }

    const result = await response.json();
    console.log("Save result:", result);
    console.log("=== PDF Redactions Saved ===");
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Show loading/error state for PDF library
  if (isPDF && !pdfLib) {
    return (
      <div>
        <PDFLoader onLoad={setPdfLib} onError={setPdfError} />
        <div className="flex items-center justify-center min-h-[600px]">
          <div className="text-center">
            {pdfError ? (
              <div className="text-red-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                <p>Failed to load PDF library.</p>
                <p className="text-sm">{pdfError.message}</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading PDF Library...</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Controls Panel */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Hand className="w-5 h-5 text-purple-500" />
            Manual Redaction Tools
          </CardTitle>
          {automatedRedactionComplete && (
            <p className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded mt-2">
              ✓ Editing automated redaction
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drawing Tools */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">Drawing Tools</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={activeTool === "select" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTool("select")}
                className="flex flex-col items-center p-5"
              >
                <MousePointer2 className="-mb-2" />
                <span className="text-xs">Select</span>
              </Button>
              <Button
                variant={activeTool === "rectangle" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTool("rectangle")}
                className="flex flex-col items-center p-5"
              >
                <Square className="-mb-2" />
                <span className="text-xs">Rectangle</span>
              </Button>
              <Button
                variant={activeTool === "circle" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTool("circle")}
                className="flex flex-col items-center p-5"
              >
                <Circle className="-mb-2" />
                <span className="text-xs">Circle</span>
              </Button>
              <Button
                variant={activeTool === "freehand" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTool("freehand")}
                className="flex flex-col items-center p-5"
              >
                <Pencil className="-mb-2" />
                <span className="text-xs">Freehand</span>
              </Button>
              <Button
                variant={activeTool === "eraser" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTool("eraser")}
                className="flex flex-col items-center p-5"
              >
                <Eraser className="-mb-2" />
                <span className="text-xs">Eraser</span>
              </Button>
            </div>
          </div>

          {/* View Controls */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">View</p>
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.min(3, zoom + 0.1))}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRotation((rotation + 90) % 360)}
              >
                <RotateCw className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLayers(!showLayers)}
              >
                <Layers className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* History Controls */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">History</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={historyIndex < 0}
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
              >
                <Redo className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearAll}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Redaction Stats */}
          {automatedRedactionComplete && (
            <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs font-semibold text-blue-900">
                Enhancement Mode
              </p>
              <div className="space-y-1 text-xs text-blue-700">
                <div className="flex justify-between">
                  <span>Additional Redactions:</span>
                  <span className="font-semibold">{redactions.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t">
            <Button
              onClick={handleSaveRedactions}
              disabled={isSaving}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save & Complete"}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              {automatedRedactionComplete
                ? "Save to apply manual enhancements"
                : "Save to complete manual redaction"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Canvas Area */}
      <div className="lg:col-span-3 space-y-4">
        {/* Header Card with Instructions */}
        {automatedRedactionComplete && (
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                  <Hand className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-purple-900 mb-1">
                    Final Review & Enhancement
                  </h3>
                  <p className="text-sm text-purple-700">
                    You're now viewing the automated redaction result. Add
                    additional redactions if needed or fix any missed items. Use
                    the drawing tools on the left to mark additional sensitive
                    areas.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="bg-white px-3 py-1 rounded-full text-purple-700 border border-purple-200">
                      ✓ Automated redaction complete
                    </span>
                    <span className="bg-white px-3 py-1 rounded-full text-purple-700 border border-purple-200">
                      🎨 Drawing tools active
                    </span>
                    <span className="bg-white px-3 py-1 rounded-full text-purple-700 border border-purple-200">
                      💾 Save when done
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!automatedRedactionComplete && (
          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Pencil className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-1">
                    Manual Redaction Mode
                  </h3>
                  <p className="text-sm text-blue-700">
                    Use the drawing tools to manually select and redact
                    sensitive information. Choose from rectangles, circles, or
                    freehand drawing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <div
              className="relative bg-gray-100 rounded-lg overflow-auto"
              style={{ minHeight: "600px" }}
            >
              <div className="flex items-center justify-center">
                {(!imageLoaded ||
                  (isPDF && isRendering) ||
                  isLoadingRedacted) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">
                        {isLoadingRedacted
                          ? "Loading redacted document..."
                          : isPDF
                          ? `Rendering Page ${currentPage}...`
                          : "Loading Image..."}
                      </p>
                    </div>
                  </div>
                )}
                <div className="relative">
                  <canvas ref={canvasRef} className="absolute top-0 left-0" />
                  <canvas
                    ref={overlayCanvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    className="relative cursor-crosshair"
                  />
                </div>
              </div>
            </div>

            {/* Info Bar */}
            <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-700">
                      <span className="font-semibold">{redactions.length}</span>{" "}
                      Redaction{redactions.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {isPDF && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-700">
                        Page{" "}
                        <span className="font-semibold">{currentPage}</span> of{" "}
                        <span className="font-semibold">{totalPages}</span>
                      </span>
                    </div>
                  )}
                  {automatedRedactionComplete && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-700 text-xs font-medium">
                        Enhancement Mode
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <ZoomIn className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-700">
                      <span className="font-semibold">
                        {Math.round(zoom * 100)}%
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MousePointer2 className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-700 capitalize">
                      <span className="font-semibold">{activeTool}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* PDF Navigation Controls */}
            {isPDF && totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded border">
                  <span className="font-medium">Page</span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => setCurrentPage(Number(e.target.value))}
                    className="w-16 text-center border rounded px-2 py-1"
                  />
                  <span className="text-gray-500">of {totalPages}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManualRedaction;
