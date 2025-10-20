document.addEventListener('DOMContentLoaded', () => {
    const markdownInput = document.getElementById('markdown-input');
    const previewOutput = document.getElementById('preview-output');
    const copyHtmlBtn = document.getElementById('copy-html-btn');

    // --- Core Functions ---
    function renderMarkdown(markdownText) {
        // Use the marked library to convert markdown to HTML
        const html = marked.parse(markdownText);
        previewOutput.innerHTML = html;
    }

    // --- Event Listeners ---
    markdownInput.addEventListener('input', () => {
        renderMarkdown(markdownInput.value);
    });

    copyHtmlBtn.addEventListener('click', () => {
        const htmlToCopy = previewOutput.innerHTML;
        navigator.clipboard.writeText(htmlToCopy).then(() => {
            // Success feedback
            const originalText = copyHtmlBtn.textContent;
            copyHtmlBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyHtmlBtn.textContent = originalText;
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy HTML: ', err);
            // You could show an error message to the user here
        });
    });

    // --- Initial Render ---
    function init() {
        const initialText = `# Welcome to the Markdown Previewer!

This is a real-time editor. Type your Markdown in the left panel, and you'll see the formatted HTML on the right.

## Features

- **Live Preview:** Updates as you type.
- **Easy to Use:** Just start typing.
- **HTML Export:** Copy the generated HTML with one click.

### Example List

* Item one
* Item two
    * Sub-item A
    * Sub-item B

### Example Code Block

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}
\`\`\`

> This is a blockquote. A great way to highlight important text.
`;
        markdownInput.value = initialText;
        renderMarkdown(initialText);
    }

    init();
});

