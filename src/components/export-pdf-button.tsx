"use client";

import { Download } from "lucide-react";
import type { CategoryStandingRow } from "@/lib/types";

type ExportPdfButtonProps = {
  categoryName: string;
  sport: string;
  standings: CategoryStandingRow[];
};

export function ExportPdfButton({ categoryName, sport, standings }: ExportPdfButtonProps) {
  async function handleExport() {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Background
    doc.setFillColor(11, 15, 26);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text(`Clasificacion — ${categoryName}`, 14, 20);

    // Subtitle
    doc.setTextColor(159, 179, 217);
    doc.setFontSize(12);
    doc.text(`Torneo Escolar 2026 · ${sport}`, 14, 28);

    // Table data
    const tableData = standings.map((row, index) => [
      index + 1,
      row.team_name,
      row.total_points,
      row.played,
      row.wins,
      row.draws,
      row.losses,
      row.goals_for,
      row.goals_against,
      row.goal_difference,
    ]);

    autoTable(doc, {
      startY: 35,
      head: [["Pos", "Equipo", "PTS", "PJ", "G", "E", "P", "GF", "GC", "DG"]],
      body: tableData,
      theme: "grid",
      styles: {
        fillColor: [16, 22, 40],
        textColor: [214, 225, 243],
        lineColor: [40, 50, 70],
        lineWidth: 0.3,
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [38, 70, 28],
        textColor: [141, 246, 95],
        fontStyle: "bold",
        fontSize: 9,
        halign: "center",
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 14 },
        1: { halign: "left", cellWidth: 60 },
        2: { halign: "center", fontStyle: "bold", textColor: [141, 246, 95] },
        3: { halign: "center" },
        4: { halign: "center" },
        5: { halign: "center" },
        6: { halign: "center" },
        7: { halign: "center" },
        8: { halign: "center" },
        9: { halign: "center" },
      },
      alternateRowStyles: {
        fillColor: [11, 15, 26],
      },
    });

    // Footer
    const now = new Date();
    const dateStr = now.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    doc.setTextColor(143, 161, 194);
    doc.setFontSize(8);
    doc.text(`Generado el ${dateStr} · torneo-web`, 14, pageHeight - 8);

    const safeName = categoryName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
    doc.save(`clasificacion-${safeName}.pdf`);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="public-tag"
      style={{ cursor: "pointer", transition: "all 0.18s ease" }}
      title="Descargar clasificacion en PDF"
    >
      <Download className="h-3.5 w-3.5" />
      PDF
    </button>
  );
}
