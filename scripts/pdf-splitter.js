document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const splitOptions = document.getElementById('split-options');
    const fileInfoDisplay = document.getElementById('file-info-display');
    const splitBtn = document.getElementById('split-btn');
    const pageRangesInput = document.getElementById('page-ranges');
    const splitModeRadios = document.querySelectorAll('input[name="split-mode"]');
    const extractOptions = document.getElementById('extract-options');
    const errorMessage = document.getElementById('error-message');
    const previewContainer = document.getElementById('preview-container');
    const previewPages = document.getElementById('preview-pages');
    const previewLoader = document.getElementById('preview-loader');

    // App State
    let selectedFile = null;
    let totalPages = 0;
    
    // Setup pdf.js worker (FIXED CDN LINK)
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

    // --- File Input Logic ---
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            handleFile(fileInput.files[0]);
        }
    });

    const handleFile = async (file) => {
        if (file.type !== 'application/pdf') {
            showError('Please select a PDF file.');
            return;
        }
        reset(); // Reset previous state
        selectedFile = file;
        
        fileInfoDisplay.innerHTML = `Processing <strong>${file.name}</strong>...`;
        updateUI(true);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            totalPages = pdfDoc.getPageCount();
            fileInfoDisplay.innerHTML = `File: <strong>${file.name}</strong> <span>(${totalPages} pages)</span>`;
            updateUI(false);
            renderPreview(file);
        } catch (error) {
            showError('Could not read the PDF file. It might be corrupted or protected.');
            reset();
        }
    };

    // --- UI Update Logic ---
    const updateUI = (isLoading) => {
        hideError();
        if (isLoading || !selectedFile) {
            splitOptions.hidden = true;
            previewContainer.hidden = true;
            dropZone.hidden = false;
            splitBtn.disabled = true;
        } else {
            dropZone.hidden = true;
            splitOptions.hidden = false;
            splitBtn.disabled = false;
        }
    };
    
    splitModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            extractOptions.hidden = e.target.value !== 'extract';
        });
    });

    const reset = () => {
        selectedFile = null;
        totalPages = 0;
        fileInput.value = '';
        pageRangesInput.value = '';
        previewPages.innerHTML = '';
        updateUI(false);
    };

    const showError = (message) => {
        errorMessage.textContent = message;
        errorMessage.hidden = false;
    };

    const hideError = () => {
        errorMessage.hidden = true;
    };
    
    // --- Preview Rendering ---
    const renderPreview = async (file) => {
        previewContainer.hidden = false;
        previewLoader.hidden = false;
        previewPages.innerHTML = '';

        const fileReader = new FileReader();
        fileReader.onload = async function() {
            const typedarray = new Uint8Array(this.result);
            const pdf = await pdfjsLib.getDocument(typedarray).promise;

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.5 });
                
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const pageWrapper = document.createElement('div');
                pageWrapper.className = 'preview-page';
                pageWrapper.innerHTML = `<span class="page-number">Page ${i}</span>`;
                pageWrapper.prepend(canvas);

                previewPages.appendChild(pageWrapper);

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                await page.render(renderContext).promise;
            }
            previewLoader.hidden = true;
        };
        fileReader.readAsArrayBuffer(file);
    };


    // --- Core Splitting Logic ---
    splitBtn.addEventListener('click', async () => {
        if (!selectedFile) return;
        
        splitBtn.disabled = true;
        splitBtn.textContent = 'Splitting...';
        hideError();
        
        const splitMode = document.querySelector('input[name="split-mode"]:checked').value;

        try {
            const arrayBuffer = await selectedFile.arrayBuffer();
            const { PDFDocument } = PDFLib;
            const originalPdf = await PDFDocument.load(arrayBuffer);

            if (splitMode === 'extract') {
                await handleExtract(originalPdf);
            } else {
                await handleSplitAll(originalPdf);
            }
        } catch (error) {
            showError('An error occurred during splitting. The PDF may be invalid.');
            console.error(error);
        } finally {
            reset();
        }
    });

    const handleExtract = async (originalPdf) => {
        const ranges = parsePageRanges(pageRangesInput.value, totalPages);
        if (!ranges || ranges.length === 0) {
            showError('Invalid page range. Please use numbers and hyphens (e.g., 1-3, 5).');
            splitBtn.disabled = false;
            splitBtn.textContent = 'Split PDF';
            return;
        }

        const newPdf = await PDFLib.PDFDocument.create();
        const copiedPages = await newPdf.copyPages(originalPdf, ranges.map(p => p - 1)); // pdf-lib is 0-indexed
        copiedPages.forEach(page => newPdf.addPage(page));

        const pdfBytes = await newPdf.save();
        download(pdfBytes, `split-${selectedFile.name}`, 'application/pdf');
    };

    const handleSplitAll = async (originalPdf) => {
        const zip = new JSZip();
        for (let i = 0; i < totalPages; i++) {
            const newPdf = await PDFLib.PDFDocument.create();
            const [copiedPage] = await newPdf.copyPages(originalPdf, [i]);
            newPdf.addPage(copiedPage);
            const pdfBytes = await newPdf.save();
            zip.file(`page_${i + 1}_${selectedFile.name}`, pdfBytes);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        download(zipBlob, `all-pages-${selectedFile.name.replace('.pdf', '.zip')}`, 'application/zip');
    };

    // --- Utility Functions ---
    const parsePageRanges = (rangeStr, max) => {
        const pageNumbers = new Set();
        const parts = rangeStr.replace(/\s/g, '').split(',');
        for (const part of parts) {
            if (!part) continue;
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                if (isNaN(start) || isNaN(end) || start < 1 || end > max || start > end) return null;
                for (let i = start; i <= end; i++) {
                    pageNumbers.add(i);
                }
            } else {
                const num = Number(part);
                if (isNaN(num) || num < 1 || num > max) return null;
                pageNumbers.add(num);
            }
        }
        return Array.from(pageNumbers).sort((a, b) => a - b);
    };

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


