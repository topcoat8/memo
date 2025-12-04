import { jsPDF } from "jspdf";

export const generateContractPDF = (title, content, signature) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxLineWidth = pageWidth - (margin * 2);

    // Colors
    const COLOR_PRIMARY = [79, 70, 229]; // Indigo 600
    const COLOR_TEXT_MAIN = [15, 23, 42]; // Slate 900
    const COLOR_TEXT_MUTED = [100, 116, 139]; // Slate 500
    const COLOR_ACCENT = [226, 232, 240]; // Slate 200
    const COLOR_SUCCESS = [5, 150, 105]; // Emerald 600
    const COLOR_BG_SIGNATURE = [240, 253, 244]; // Emerald 50

    let currentY = 20;

    // Helper: Header
    const drawHeader = () => {
        // Top colored bar
        doc.setFillColor(...COLOR_PRIMARY);
        doc.rect(0, 0, pageWidth, 4, 'F');

        // Branding
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLOR_PRIMARY);
        doc.text("MEMO PROTOCOL", margin, 18);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLOR_TEXT_MUTED);
        doc.text("SECURE ON-CHAIN CONTRACT", pageWidth - margin, 18, { align: "right" });

        // Divider line
        doc.setDrawColor(...COLOR_ACCENT);
        doc.setLineWidth(0.5);
        doc.line(margin, 24, pageWidth - margin, 24);
    };

    // Helper: Footer
    const drawFooter = (pageNumber) => {
        const footerY = pageHeight - 15;
        doc.setDrawColor(...COLOR_ACCENT);
        doc.line(margin, footerY, pageWidth - margin, footerY);

        doc.setFontSize(8);
        doc.setTextColor(...COLOR_TEXT_MUTED);
        doc.text(`Page ${pageNumber}`, pageWidth - margin, footerY + 8, { align: "right" });
        doc.text(`Generated on ${new Date().toLocaleString()}`, margin, footerY + 8);
        doc.text("Memo Protocol Enterprise", pageWidth / 2, footerY + 8, { align: "center" });
    };

    // Initial Header
    drawHeader();
    currentY = 45;

    // Contract Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLOR_TEXT_MAIN);

    const titleLines = doc.splitTextToSize(title, maxLineWidth);
    doc.text(titleLines, margin, currentY);
    currentY += (titleLines.length * 10) + 15;

    // Content
    doc.setFontSize(11);
    doc.setFont("times", "normal"); // Serif font looks more official for contracts
    doc.setTextColor(51, 65, 85); // Slate 700

    const splitText = doc.splitTextToSize(content, maxLineWidth);
    const lineHeight = 6;

    let pageNumber = 1;

    splitText.forEach(line => {
        if (currentY + lineHeight > pageHeight - 35) { // 35 for footer space
            drawFooter(pageNumber);
            doc.addPage();
            pageNumber++;
            drawHeader();
            currentY = 35;
        }
        doc.text(line, margin, currentY);
        currentY += lineHeight;
    });

    // Signature Section
    if (signature) {
        const boxHeight = 60;
        if (currentY + boxHeight > pageHeight - 35) {
            drawFooter(pageNumber);
            doc.addPage();
            pageNumber++;
            drawHeader();
            currentY = 35;
        } else {
            currentY += 20;
        }

        // Signature Box Background
        doc.setDrawColor(...COLOR_SUCCESS);
        doc.setLineWidth(0.5);
        doc.setFillColor(...COLOR_BG_SIGNATURE);
        doc.roundedRect(margin, currentY, maxLineWidth, boxHeight, 2, 2, 'FD');

        const boxY = currentY + 15;

        // "Signed" Badge/Header
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLOR_SUCCESS);
        doc.text("DIGITALLY SIGNED", margin + 10, boxY);

        // Signature Details
        doc.setFontSize(9);
        doc.setFont("courier", "normal");
        doc.setTextColor(...COLOR_TEXT_MAIN);

        const sigY = boxY + 10;
        const lineHeightSig = 6;

        doc.text(`Signer ID:   ${signature.signerId}`, margin + 10, sigY);
        doc.text(`Timestamp:   ${new Date(signature.timestamp).toLocaleString()}`, margin + 10, sigY + lineHeightSig);
        doc.text(`Contract ID: ${signature.timestamp}`, margin + 10, sigY + (lineHeightSig * 2));

        // Visual "Verified" Stamp effect
        doc.setTextColor(16, 185, 129); // Emerald 500
        doc.setDrawColor(16, 185, 129);
        doc.setLineWidth(1);

        // Draw a circle for the stamp
        const stampX = pageWidth - margin - 30;
        const stampY = currentY + (boxHeight / 2);
        doc.circle(stampX, stampY, 18);

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("VERIFIED", stampX, stampY, { align: "center", baseline: "middle" });
        doc.setFontSize(6);
        doc.text("ON-CHAIN", stampX, stampY + 4, { align: "center", baseline: "middle" });
    }

    drawFooter(pageNumber);

    doc.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_contract.pdf`);
};
