document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const fileListContainer = document.getElementById('file-list-container');
    const fileList = document.getElementById('file-list');
    const mergeBtn = document.getElementById('merge-btn');

    // App State
    let selectedFiles = [];

    // --- Drag and Drop Logic ---
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });

    // --- File Browsing Logic ---
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => handleFiles(fileInput.files));

    // --- Core Functions ---
    const handleFiles = (files) => {
        const newFiles = Array.from(files)
            .filter(file => file.type === 'application/pdf')
            .filter(file => !selectedFiles.some(f => f.name === file.name)); // Prevent duplicates
        
        selectedFiles.push(...newFiles);
        updateUI();
    };

    const updateUI = () => {
        // Show file list container if there are files
        fileListContainer.hidden = selectedFiles.length === 0;

        // Render file list
        fileList.innerHTML = '';
        selectedFiles.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'file-item';
            li.setAttribute('draggable', 'true');
            li.setAttribute('data-index', index);
            
            li.innerHTML = `
                <svg class="drag-handle" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                <span class="file-name">${file.name}</span>
                <button class="remove-btn" data-index="${index}">&times;</button>
            `;
            fileList.appendChild(li);
        });

        // Update merge button state
        mergeBtn.disabled = selectedFiles.length < 2;
        mergeBtn.textContent = selectedFiles.length < 2 ? 'Add at least 2 files' : 'Merge PDFs';
    };

    // --- File List Interaction (Remove & Reorder) ---
    fileList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-btn')) {
            const indexToRemove = parseInt(e.target.dataset.index, 10);
            selectedFiles.splice(indexToRemove, 1);
            updateUI();
        }
    });

    let dragStartIndex;
    fileList.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('file-item')) {
            dragStartIndex = parseInt(e.target.dataset.index, 10);
            e.target.classList.add('dragging');
        }
    });

    fileList.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('file-item')) {
            e.target.classList.remove('dragging');
        }
    });
    
    fileList.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingItem = document.querySelector('.dragging');
        const afterElement = getDragAfterElement(fileList, e.clientY);
        if (afterElement == null) {
            fileList.appendChild(draggingItem);
        } else {
            fileList.insertBefore(draggingItem, afterElement);
        }
    });

    fileList.addEventListener('drop', () => {
        const reorderedDOM = Array.from(fileList.querySelectorAll('.file-item'));
        const newOrder = reorderedDOM.map(item => selectedFiles[parseInt(item.dataset.index, 10)]);
        selectedFiles = newOrder;
        updateUI();
    });

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.file-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }


    // --- PDF Merging Logic ---
    mergeBtn.addEventListener('click', async () => {
        if (selectedFiles.length < 2) return;

        mergeBtn.disabled = true;
        mergeBtn.textContent = 'Merging...';

        try {
            const { PDFDocument } = PDFLib;
            const mergedPdf = await PDFDocument.create();

            for (const file of selectedFiles) {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }

            const mergedPdfBytes = await mergedPdf.save();
            download(mergedPdfBytes, `merged-${Date.now()}.pdf`, 'application/pdf');

        } catch (error) {
            console.error('Error merging PDFs:', error);
            alert('An error occurred while merging the PDFs. Please check the console for details.');
        } finally {
            // Reset state
            selectedFiles = [];
            updateUI();
        }
    });

    // --- Download Helper ---
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

