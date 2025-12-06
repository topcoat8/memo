import { jsPDF } from "jspdf";

// Brand Colors
const COLORS = {
    BG: [10, 10, 15], // #0a0a0f (Deep Dark Navy)
    TEXT_MAIN: [226, 232, 240], // Slate 200
    TEXT_MUTED: [148, 163, 184], // Slate 400
    PRIMARY: [99, 102, 241], // Indigo 500 (#6366f1)
    SECONDARY: [168, 85, 247], // Purple 500 (#a855f7)
    ACCENT: [34, 211, 238], // Cyan 400 (#22d3ee)
    GLASS_BORDER: [51, 65, 85], // Slate 700 (Simulating low opacity white)
    GLASS_BG: [23, 23, 30], // Slightly lighter than BG
    SUCCESS: [34, 197, 94], // Green 500
    SUCCESS_BG: [6, 78, 59], // Emerald 900
};

const MARGIN = 20;

// Helper: Draw Background
const drawBackground = (doc, width, height) => {
    doc.setFillColor(...COLORS.BG);
    doc.rect(0, 0, width, height, 'F');
};

// Helper: Draw Header
const drawHeader = (doc, width, title) => {
    // Gradient Line (Simulated with segments)
    const segmentWidth = width / 3;
    doc.setFillColor(...COLORS.PRIMARY);
    doc.rect(0, 0, segmentWidth, 4, 'F');
    doc.setFillColor(...COLORS.SECONDARY);
    doc.rect(segmentWidth, 0, segmentWidth, 4, 'F');
    doc.setFillColor(...COLORS.ACCENT);
    doc.rect(segmentWidth * 2, 0, segmentWidth, 4, 'F');

    // Branding: $MEMO
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.ACCENT);
    doc.text("$MEMO", MARGIN, 20);

    // Title
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.TEXT_MUTED);
    doc.text(title, width - MARGIN, 20, { align: "right" });

    // Glass Divider
    doc.setDrawColor(...COLORS.GLASS_BORDER);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, 26, width - MARGIN, 26);
};

// Helper: Draw Footer
const drawFooter = (doc, width, height, pageNumber) => {
    const footerY = height - 15;
    doc.setDrawColor(...COLORS.GLASS_BORDER);
    doc.line(MARGIN, footerY, width - MARGIN, footerY);

    doc.setFontSize(8);
    doc.setTextColor(...COLORS.TEXT_MUTED);
    doc.text(`Page ${pageNumber}`, width - MARGIN, footerY + 8, { align: "right" });
    doc.text(`Generated on ${new Date().toLocaleString()}`, MARGIN, footerY + 8);

    doc.setTextColor(...COLORS.PRIMARY);
    doc.text("Memo Protocol Enterprise", width / 2, footerY + 8, { align: "center" });
};

// Helper: Check Page Break
const checkPageBreak = (doc, currentY, heightNeeded, pageHeight, pageWidth, pageNumber, title) => {
    if (currentY + heightNeeded > pageHeight - 30) { // 30 for footer
        drawFooter(doc, pageWidth, pageHeight, pageNumber);
        doc.addPage();
        pageNumber++;
        drawBackground(doc, pageWidth, pageHeight);
        drawHeader(doc, pageWidth, title);
        return { newY: 40, newPageNumber: pageNumber };
    }
    return { newY: currentY, newPageNumber: pageNumber };
};

export const generateContractPDF = (title, content, signature) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxLineWidth = pageWidth - (MARGIN * 2);

    let currentY = 40;
    let pageNumber = 1;

    // Initial Setup
    drawBackground(doc, pageWidth, pageHeight);
    drawHeader(doc, pageWidth, "SECURE ON-CHAIN CONTRACT");

    // Contract Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.TEXT_MAIN);

    const titleLines = doc.splitTextToSize(title, maxLineWidth);
    doc.text(titleLines, MARGIN, currentY);
    currentY += (titleLines.length * 10) + 15;

    // Content
    doc.setFontSize(11);
    doc.setFont("times", "normal");
    doc.setTextColor(...COLORS.TEXT_MAIN);

    const splitText = doc.splitTextToSize(content, maxLineWidth);
    const lineHeight = 6;

    splitText.forEach(line => {
        const check = checkPageBreak(doc, currentY, lineHeight, pageHeight, pageWidth, pageNumber, "SECURE ON-CHAIN CONTRACT");
        currentY = check.newY;
        pageNumber = check.newPageNumber;
        doc.text(line, MARGIN, currentY);
        currentY += lineHeight;
    });

    // Signature Section
    if (signature) {
        const boxHeight = 70;
        const check = checkPageBreak(doc, currentY, boxHeight + 20, pageHeight, pageWidth, pageNumber, "SECURE ON-CHAIN CONTRACT");
        currentY = check.newY + 10;
        pageNumber = check.newPageNumber;

        // Signature Box Background (Glass/Dark)
        doc.setDrawColor(...COLORS.SUCCESS);
        doc.setLineWidth(0.5);
        doc.setFillColor(...COLORS.SUCCESS_BG);
        doc.roundedRect(MARGIN, currentY, maxLineWidth, boxHeight, 2, 2, 'FD');

        const boxY = currentY + 15;

        // "Signed" Badge
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.SUCCESS);
        doc.text("DIGITALLY SIGNED", MARGIN + 10, boxY);

        // Signature Details
        doc.setFontSize(9);
        doc.setFont("courier", "normal");
        doc.setTextColor(...COLORS.TEXT_MAIN);

        const sigY = boxY + 10;
        const lineHeightSig = 6;

        doc.text(`Signer ID:   ${signature.signerId}`, MARGIN + 10, sigY);
        doc.text(`Timestamp:   ${new Date(signature.timestamp).toLocaleString()}`, MARGIN + 10, sigY + lineHeightSig);
        doc.text(`Contract ID: ${signature.timestamp}`, MARGIN + 10, sigY + (lineHeightSig * 2));

        // Verified Stamp
        const stampX = pageWidth - MARGIN - 30;
        const stampY = currentY + (boxHeight / 2);

        doc.setDrawColor(...COLORS.SUCCESS);
        doc.setLineWidth(1);
        doc.circle(stampX, stampY, 18);

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.SUCCESS);
        doc.text("VERIFIED", stampX, stampY, { align: "center", baseline: "middle" });
        doc.setFontSize(6);
        doc.text("ON-CHAIN", stampX, stampY + 4, { align: "center", baseline: "middle" });
    }

    drawFooter(doc, pageWidth, pageHeight, pageNumber);
    doc.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_contract.pdf`);
};

export const generateHistoryPDF = (messages, userId, contactId) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxLineWidth = pageWidth - (MARGIN * 2);

    let currentY = 40;
    let pageNumber = 1;

    // Initial Setup
    drawBackground(doc, pageWidth, pageHeight);
    drawHeader(doc, pageWidth, "NEGOTIATION HISTORY");

    // Title Section
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.TEXT_MAIN);
    doc.text("Negotiation History", MARGIN, currentY);
    currentY += 20;

    messages.forEach(msg => {
        const isMe = msg.senderId === userId;
        const senderLabel = isMe ? "You" : (msg.senderId.slice(0, 8) + "...");
        const timestamp = msg.createdAt ? new Date(msg.createdAt).toLocaleString() : "Unknown Time";

        // Handle Contract Messages (Full Display)
        if (msg.data && msg.data.type === 'contract') {
            const contractTitle = msg.data.title || "Contract Proposal";
            const contractContent = msg.data.content || "";

            // Header for Contract
            const check = checkPageBreak(doc, currentY, 40, pageHeight, pageWidth, pageNumber, "NEGOTIATION HISTORY");
            currentY = check.newY;
            pageNumber = check.newPageNumber;

            // Contract Container
            doc.setDrawColor(...COLORS.PRIMARY);
            doc.setLineWidth(0.5);
            doc.setFillColor(...COLORS.GLASS_BG);

            // We need to calculate height of contract content to draw the box? 
            // Drawing a box around a multi-page contract is hard. 
            // Instead, we will use a distinct style (Serif font, indented) without a bounding box for the whole thing if it's long.
            // Or just a header.

            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...COLORS.PRIMARY);
            doc.text(`[CONTRACT PROPOSAL: ${contractTitle}]`, MARGIN, currentY);
            currentY += 8;

            doc.setFontSize(11);
            doc.setFont("times", "normal");
            doc.setTextColor(...COLORS.TEXT_MAIN);

            const splitContent = doc.splitTextToSize(contractContent, maxLineWidth - 10);
            splitContent.forEach(line => {
                const checkC = checkPageBreak(doc, currentY, 6, pageHeight, pageWidth, pageNumber, "NEGOTIATION HISTORY");
                currentY = checkC.newY;
                pageNumber = checkC.newPageNumber;
                doc.text(line, MARGIN + 5, currentY);
                currentY += 6;
            });

            currentY += 10; // Spacing after contract
            return;
        }

        // Handle Signature Messages
        if (msg.data && msg.data.type === 'contract_signature') {
            const boxHeight = 70;
            const check = checkPageBreak(doc, currentY, boxHeight + 10, pageHeight, pageWidth, pageNumber, "NEGOTIATION HISTORY");
            currentY = check.newY;
            pageNumber = check.newPageNumber;

            // Signature Box
            doc.setDrawColor(...COLORS.SUCCESS);
            doc.setLineWidth(0.5);
            doc.setFillColor(...COLORS.SUCCESS_BG);
            doc.roundedRect(MARGIN, currentY, maxLineWidth, boxHeight, 2, 2, 'FD');

            const boxY = currentY + 15;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...COLORS.SUCCESS);
            doc.text("DIGITALLY SIGNED", MARGIN + 10, boxY);

            doc.setFontSize(9);
            doc.setFont("courier", "normal");
            doc.setTextColor(...COLORS.TEXT_MAIN);

            const sigY = boxY + 10;
            const lineHeightSig = 6;
            const signature = msg.data.signature || {};

            doc.text(`Signer ID:   ${signature.signerId || msg.senderId}`, MARGIN + 10, sigY);
            doc.text(`Timestamp:   ${signature.timestamp ? new Date(signature.timestamp).toLocaleString() : timestamp}`, MARGIN + 10, sigY + lineHeightSig);

            // Verified Stamp
            const stampX = pageWidth - MARGIN - 30;
            const stampY = currentY + (boxHeight / 2);
            doc.setDrawColor(...COLORS.SUCCESS);
            doc.setLineWidth(1);
            doc.circle(stampX, stampY, 18);
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...COLORS.SUCCESS);
            doc.text("VERIFIED", stampX, stampY, { align: "center", baseline: "middle" });

            currentY += boxHeight + 15;
            return;
        }

        // Normal Messages
        const content = msg.decrypted || "";

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...(isMe ? COLORS.PRIMARY : COLORS.TEXT_MAIN));

        // Header Check
        const checkH = checkPageBreak(doc, currentY, 15, pageHeight, pageWidth, pageNumber, "NEGOTIATION HISTORY");
        currentY = checkH.newY;
        pageNumber = checkH.newPageNumber;

        doc.text(`${senderLabel} • ${timestamp}`, MARGIN, currentY);
        currentY += 6;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.TEXT_MAIN);

        const splitText = doc.splitTextToSize(content, maxLineWidth - 10);
        const textHeight = splitText.length * 5;

        // Content Check
        const checkC = checkPageBreak(doc, currentY, textHeight + 10, pageHeight, pageWidth, pageNumber, "NEGOTIATION HISTORY");
        currentY = checkC.newY;
        pageNumber = checkC.newPageNumber;

        // Message Bubble
        doc.setDrawColor(...COLORS.GLASS_BORDER);
        doc.setLineWidth(0.1);
        doc.setFillColor(...COLORS.GLASS_BG);
        doc.roundedRect(MARGIN, currentY - 4, maxLineWidth, textHeight + 8, 2, 2, 'FD');

        doc.text(splitText, MARGIN + 5, currentY);
        currentY += textHeight + 15;
    });

    drawFooter(doc, pageWidth, pageHeight, pageNumber);
    doc.save(`negotiation_history_${Date.now()}.pdf`);
};
