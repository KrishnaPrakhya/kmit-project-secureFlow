# PDF.js SSR Compatibility Fix

## Problem

The ManualRedaction component was experiencing a Server-Side Rendering (SSR) error when importing PDF.js:

```
TypeError: Object.defineProperty called on non-object
at ManualRedaction.tsx:36:68
```

**Root Cause**: PDF.js requires browser APIs (Canvas, DOM) that aren't available during Next.js server-side rendering. When `import * as pdfjsLib from "pdfjs-dist"` was used at the top level, it executed during SSR and caused the application to crash.

## Solution

Implemented dynamic client-side-only loading of PDF.js using React hooks.

### Changes Made

#### 1. Added PDF Library State

```typescript
const [pdfLib, setPdfLib] = useState<any>(null);
```

#### 2. Dynamic Import with useEffect

```typescript
// Load PDF.js dynamically on client side only
useEffect(() => {
  if (typeof window !== "undefined") {
    import("pdfjs-dist")
      .then((pdfjsLib) => {
        setPdfLib(pdfjsLib);
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      })
      .catch((error) => {
        console.error("Failed to load PDF.js:", error);
      });
  }
}, []);
```

#### 3. Updated File Loading Logic

```typescript
// Load file (image or PDF)
useEffect(() => {
  if (file && pdfLib) {
    const fileType = file.type;

    if (fileType === "application/pdf") {
      setIsPDF(true);
      loadPDF(file);
    } else if (fileType.startsWith("image/")) {
      setIsPDF(false);
      loadImage(file);
    }
  }
}, [file, pdfLib]);
```

#### 4. Updated loadPDF Function

```typescript
const loadPDF = async (file: File) => {
  if (!pdfLib) {
    console.error("PDF.js library not loaded yet");
    return;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    setPdfDocument(pdf);
    setTotalPages(pdf.numPages);
    setCurrentPage(1);
    setImageLoaded(true);

    await renderPDFPage(pdf, 1);
  } catch (error) {
    console.error("Error loading PDF:", error);
  }
};
```

#### 5. Added Loading State UI

```typescript
{!pdfLib && file?.type === "application/pdf" ? (
  <div className="text-center">
    <p className="text-gray-500">Loading PDF library...</p>
    <div className="mt-4 w-12 h-12 border-4 border-blue-500
         border-t-transparent rounded-full animate-spin mx-auto"></div>
  </div>
) : imageLoaded ? (
  // Canvas rendering...
) : (
  <p className="text-gray-500">Loading image...</p>
)}
```

## Benefits

1. ✅ **SSR Compatible**: PDF.js only loads in the browser, avoiding server-side errors
2. ✅ **Graceful Loading**: Loading indicator shown while PDF.js initializes
3. ✅ **Error Handling**: Catches and logs PDF.js loading failures
4. ✅ **Conditional Execution**: All PDF operations check for library availability
5. ✅ **Type Safety**: Maintained TypeScript compatibility
6. ✅ **Performance**: PDF.js only loads when needed (client-side)

## Testing Checklist

- [ ] Navigate to `/manualRedaction` - no SSR errors
- [ ] Upload PDF file - PDF.js loads dynamically
- [ ] PDF renders correctly on canvas
- [ ] Multi-page PDF navigation works
- [ ] Redaction tools work on PDF pages
- [ ] Save PDF with redactions
- [ ] Upload image file - works without PDF.js
- [ ] No console errors during operation

## Technical Details

- **Framework**: Next.js 14 with App Router
- **PDF Library**: pdfjs-dist (dynamically imported)
- **Rendering**: Client-side only via useEffect
- **Worker**: CDN-hosted PDF.js worker
- **State Management**: React useState for library reference

## Related Files

- `src/app/Components/ManualRedaction.tsx` - Main component with PDF support
- `server/main.py` - Backend endpoints for PDF redaction saving

## Notes

- This pattern should be used for any browser-only libraries in Next.js SSR
- The `typeof window !== 'undefined'` check ensures client-side execution
- Dynamic import returns a Promise, requiring `.then()` handling
- Worker source must be set after library loads
