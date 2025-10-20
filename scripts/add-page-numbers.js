document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const optionsPanel = document.getElementById('options-panel');
    const fileInfoDisplay = document.getElementById('file-info-display');
    const addNumbersBtn = document.getElementById('add-numbers-btn');
    const positionCells = document.querySelectorAll('.grid-cell');
    const pageRangeInput = document.getElementById('page-range-input');
    const formatSelect = document.getElementById('format-select');
    const fontSizeInput = document.getElementById('font-size-input');
    const fontColorInput = document.getElementById('font-color-input');
    const errorMessage = document.getElementById('error-message');

    // App State
    let selectedFile = null;
    let selectedPosition = 'bottom-center';

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
    positionCells.forEach(cell => {
        cell.addEventListener('click', () => {
            positionCells.forEach(c => c.classList.remove('selected'));
            cell.classList.add('selected');
            selectedPosition = cell.dataset.position;
        });
    });
    addNumbersBtn.addEventListener('click', processPdf);

    // --- Core Functions ---
    function handleFile(file) {
        if (file.type !== 'application/pdf') {
            showError('Please select a PDF file.');
            return;
        }
        reset();
        selectedFile = file;
        
        fileInfoDisplay.innerHTML = `File: <strong>${file.name}</strong>`;
        pageRangeInput.placeholder = `e.g., all, 1-5, 8-10`;
        updateUI(false);
    }

    async function processPdf() {
        if (!selectedFile) return;

        addNumbersBtn.disabled = true;
        addNumbersBtn.textContent = 'Processing...';
        hideError();

        try {
            const { PDFDocument, rgb, StandardFonts } = PDFLib;
            const existingPdfBytes = await selectedFile.arrayBuffer();
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            
            const totalPages = pdfDoc.getPageCount();
            const pagesToNumber = parsePageRange(pageRangeInput.value, totalPages);
            
            if (pagesToNumber.size === 0) {
                showError('Please enter a valid page range.');
                addNumbersBtn.disabled = false;
                addNumbersBtn.textContent = 'Add Page Numbers';
                return;
            }

            const fontSize = parseInt(fontSizeInput.value) || 12;
            const color = hexToRgb(fontColorInput.value);
            const pageNumbersColor = rgb(color.r / 255, color.g / 255, color.b / 255);

            for (let i = 0; i < totalPages; i++) {
                if (pagesToNumber.has(i + 1)) {
                    const page = pdfDoc.getPage(i);
                    const { width, height } = page.getSize();
                    
                    const format = formatSelect.value;
                    const text = format
                        .replace('{page}', i + 1)
                        .replace('{total}', totalPages);
                    
                    const textWidth = font.widthOfTextAtSize(text, fontSize);
                    
                    const { x, y } = getCoordinates(selectedPosition, width, height, textWidth, fontSize);

                    page.drawText(text, { x, y, font, size: fontSize, color: pageNumbersColor });
                }
            }

            const pdfBytes = await pdfDoc.save();
            download(pdfBytes, `numbered-${selectedFile.name}`, 'application/pdf');
            reset();

        } catch (error) {
            showError('An error occurred. The PDF might be corrupted or protected.');
            console.error(error);
            addNumbersBtn.textContent = 'Add Page Numbers';
            addNumbersBtn.disabled = false;
        }
    }

    function getCoordinates(position, width, height, textWidth, fontSize) {
        const margin = 30;
        const coords = { x: 0, y: 0 };
        
        // Vertical alignment
        if (position.includes('top')) {
            coords.y = height - margin;
        } else if (position.includes('middle')) {
            coords.y = height / 2 - fontSize / 2;
        } else { // bottom
            coords.y = margin;
        }

        // Horizontal alignment
        if (position.includes('left')) {
            coords.x = margin;
        } else if (position.includes('center')) {
            coords.x = (width - textWidth) / 2;
        } else { // right
            coords.x = width - margin - textWidth;
        }

        return coords;
    }
    
    // --- UI & Utility Functions ---
    function updateUI(isLoading) {
        if (isLoading) {
            optionsPanel.hidden = true;
            dropZone.hidden = false;
            addNumbersBtn.disabled = true;
        } else {
            dropZone.hidden = true;
            optionsPanel.hidden = false;
            addNumbersBtn.disabled = false;
        }
    }

    function reset() {
        selectedFile = null;
        fileInput.value = '';
        pageRangeInput.value = '';
        addNumbersBtn.textContent = 'Add Page Numbers';
        updateUI(true);
        hideError();
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.hidden = false;
    }

    function hideError() {
        errorMessage.hidden = true;
    }

    function parsePageRange(rangeStr, totalPages) {
        const pages = new Set();
        if (rangeStr.trim().toLowerCase() === 'all' || rangeStr.trim() === '') {
            for (let i = 1; i <= totalPages; i++) pages.add(i);
            return pages;
        }
        
        const parts = rangeStr.split(',');
        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(num => parseInt(num.trim()));
                if (!isNaN(start) && !isNaN(end) && start <= end) {
                    for (let i = start; i <= end; i++) {
                        if (i > 0 && i <= totalPages) pages.add(i);
                    }
                }
            } else {
                const pageNum = parseInt(part.trim());
                if (!isNaN(pageNum) && pageNum > 0 && pageNum <= totalPages) {
                    pages.add(pageNum);
                }
            }
        }
        return pages;
    }

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
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

