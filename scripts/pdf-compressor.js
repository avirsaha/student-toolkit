document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const compressOptions = document.getElementById('compress-options');
    const fileInfoDisplay = document.getElementById('file-info-display');
    const compressBtn = document.getElementById('compress-btn');
    const compressionRadios = document.querySelectorAll('input[name="compress-level"]');
    const errorMessage = document.getElementById('error-message');
    const previewSection = document.getElementById('preview-section');
    const previewLoader = document.getElementById('preview-loader');
    const previewContent = document.getElementById('preview-content');
    const canvasBefore = document.getElementById('preview-canvas-before');
    const canvasAfter = document.getElementById('preview-canvas-after');
    const originalSizeDisplay = document.getElementById('original-size');
    const estimatedSizeDisplay = document.getElementById('estimated-size');

    // App State
    let selectedFile = null;
    let pdfDocument = null;
    
    // Setup pdf.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

    // --- Event Listeners ---
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) handleFile(fileInput.files[0]);
    });
    compressionRadios.forEach(radio => radio.addEventListener('change', () => renderPreview(pdfDocument)));
    compressBtn.addEventListener('click', compressPdf);

    // --- Core Functions ---
    async function handleFile(file) {
        if (file.type !== 'application/pdf') {
            showError('Please select a PDF file.');
            return;
        }
        reset();
        selectedFile = file;
        
        fileInfoDisplay.innerHTML = `Loading <strong>${file.name}</strong>...`;
        updateUI(true);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const typedarray = new Uint8Array(arrayBuffer);
            pdfDocument = await pdfjsLib.getDocument(typedarray).promise;
            
            fileInfoDisplay.innerHTML = `File: <strong>${file.name}</strong> <span>(${pdfDocument.numPages} pages)</span>`;
            updateUI(false);
            renderPreview(pdfDocument);
        } catch (error) {
            showError('Could not read the PDF. It may be corrupted or protected.');
            reset();
        }
    }

    async function renderPreview(pdf) {
        if (!pdf) return;
        
        previewSection.hidden = false;
        previewContent.hidden = true;
        previewLoader.hidden = false;
        
        const page = await pdf.getPage(1); // Preview first page
        const viewport = page.getViewport({ scale: 1.5 });

        // Render "Before" canvas
        canvasBefore.height = viewport.height;
        canvasBefore.width = viewport.width;
        const contextBefore = canvasBefore.getContext('2d');
        await page.render({ canvasContext: contextBefore, viewport: viewport }).promise;
        originalSizeDisplay.textContent = `Original: ${formatBytes(selectedFile.size)}`;

        // Render "After" canvas
        const quality = parseFloat(document.querySelector('input[name="compress-level"]:checked').value);
        const imageDataUrl = canvasBefore.toDataURL('image/jpeg', quality);
        
        const contextAfter = canvasAfter.getContext('2d');
        const img = new Image();
        img.onload = () => {
            canvasAfter.height = img.height;
            canvasAfter.width = img.width;
            contextAfter.drawImage(img, 0, 0);
            
            // Estimate size
            const estimatedBytes = imageDataUrl.length * 0.75 * (pdf.numPages); // Rough estimation
            estimatedSizeDisplay.textContent = `Estimated: ~${formatBytes(estimatedBytes)}`;

            previewLoader.hidden = true;
            previewContent.hidden = false;
        };
        img.src = imageDataUrl;
    }

    async function compressPdf() {
        if (!selectedFile || !pdfDocument) return;

        compressBtn.disabled = true;
        compressBtn.textContent = 'Compressing...';
        hideError();

        try {
            const { PDFDocument } = PDFLib;
            const newPdfDoc = await PDFDocument.create();
            const quality = parseFloat(document.querySelector('input[name="compress-level"]:checked').value);

            for (let i = 1; i <= pdfDocument.numPages; i++) {
                // Render page to an in-memory canvas
                const page = await pdfDocument.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 }); // Higher scale for better quality
                const tempCanvas = document.createElement('canvas');
                tempCanvas.height = viewport.height;
                tempCanvas.width = viewport.width;
                const tempContext = tempCanvas.getContext('2d');
                await page.render({ canvasContext: tempContext, viewport: viewport }).promise;
                
                // Get JPEG image bytes
                const imageData = tempCanvas.toDataURL('image/jpeg', quality);
                const jpegImageBytes = await fetch(imageData).then(res => res.arrayBuffer());

                // Embed JPEG into the new PDF
                const jpegImage = await newPdfDoc.embedJpg(jpegImageBytes);
                const newPage = newPdfDoc.addPage([jpegImage.width, jpegImage.height]);
                newPage.drawImage(jpegImage, {
                    x: 0,
                    y: 0,
                    width: newPage.getWidth(),
                    height: newPage.getHeight(),
                });
            }

            const pdfBytes = await newPdfDoc.save();
            download(pdfBytes, `compressed-${selectedFile.name}`, 'application/pdf');
        } catch (error) {
            showError('An error occurred during compression.');
            console.error(error);
        } finally {
            reset();
        }
    }

    // --- UI & Utility Functions ---
    function updateUI(isLoading) {
        hideError();
        if (isLoading || !selectedFile) {
            compressOptions.hidden = true;
            previewSection.hidden = true;
            dropZone.hidden = false;
            compressBtn.disabled = true;
        } else {
            dropZone.hidden = true;
            compressOptions.hidden = false;
            compressBtn.disabled = false;
        }
    }

    function reset() {
        selectedFile = null;
        pdfDocument = null;
        fileInput.value = '';
        compressBtn.textContent = 'Compress PDF';
        updateUI(false);
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.hidden = false;
    }

    function hideError() {
        errorMessage.hidden = true;
    }

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
    
    function download(data, filename, type) {
        const blob = new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});

