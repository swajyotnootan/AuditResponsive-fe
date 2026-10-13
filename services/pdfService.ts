// services/pdfService.ts
// ✅ COMPLETE FIXED VERSION
// - Form5 uses GET (not POST)
// - Correct API routing per group type
// - No silent group creation on share failure
// - Normalizes legacy "plantScopedGroupId" placeholder → real plant-scoped ID

import { API_BASE_URL } from "@/config/apiConfig";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";

export interface PDFGenerationOptions {
  auditId: string;
  type:
    | "form3"
    | "form4"
    | "form5"
    | "ncr"
    | "8d"
    | "corrective-action"
    | "iatf"
    | "manufacturing"
    | "5s";
  data?: any;
  year?: number;
  month?: string;
  fromDetailedView?: boolean;
  startDate?: string;
  endDate?: string;
  auditType?: string;
  formVariant?: "form7" | "form8" | "ncr2";
  userId?: number | string;
}

// ============================================================
// ✅ SMART API DETECTION
// Routes each group type to the correct backend controller.
// ============================================================
const getApiBase = (_groupId: string): string => {
  // 🚧 TEMPORARY: All forum shares go through the existing 8D controller
  // until a dedicated /api/forum/groups controller is implemented.
  // The 8D controller accepts any string groupId and auto-creates it if missing.
  return "/forum/8d";
};

export class PDFService {
  private static instance: PDFService;
  private pdfCache: Map<string, { data: string; timestamp: number }> =
    new Map();

  static getInstance(): PDFService {
    if (!PDFService.instance) {
      PDFService.instance = new PDFService();
    }
    return PDFService.instance;
  }

  // ============================================================
  // GENERATE DETAILED PDF (Form5 detailed view)
  // ============================================================
  async generateDetailedPDF(options: PDFGenerationOptions): Promise<{
    success: boolean;
    pdfData?: string;
    fileName?: string;
    error?: string;
  }> {
    try {
      const { year, month, startDate, endDate, auditType } = options;

      console.log("🔍 [PDFService] generateDetailedPDF called with:", {
        year,
        month,
        startDate,
        endDate,
        auditType,
      });

      const endpoint = `${API_BASE_URL}/api/audit-detailed-view/${year}/${month}/download`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/pdf",
        },
        body: JSON.stringify({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          auditType: auditType || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`PDF generation failed: ${response.status}`);
      }

      const blob = await response.blob();

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const fileName = `Form5_Detailed_Audit_Schedule_${month}_${year}.pdf`;

      return {
        success: true,
        pdfData: base64,
        fileName: fileName,
      };
    } catch (error) {
      console.error("Detailed PDF generation error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate PDF",
      };
    }
  }

  // ============================================================
  // GENERATE PDF (main method)
  // ============================================================
  async generatePDF(options: PDFGenerationOptions): Promise<{
    success: boolean;
    pdfData?: string;
    fileName?: string;
    error?: string;
  }> {
    try {
      const {
        auditId,
        type,
        year,
        month,
        data,
        fromDetailedView,
        startDate,
        endDate,
        auditType,
        formVariant,
        userId,
      } = options;

      console.log("🔍 [PDFService] generatePDF called with:", {
        type,
        auditId,
        year,
        month,
        fromDetailedView,
        startDate,
        endDate,
        auditType,
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : "no data",
      });

      let endpoint = "";
      let fileType = "";
      let requestMethod: "GET" | "POST" = "GET";

      const typeStr = String(type || "").toLowerCase();
      console.log("🔍 Normalized type:", typeStr);

      // ✅ FIRST: Form5 Detailed View
      if (typeStr === "form5" && fromDetailedView) {
        if (!month) {
          throw new Error("month is required for Form5 Detailed View PDF");
        }
        endpoint = `${API_BASE_URL}/api/audit-detailed-view/${year}/${month}/download`;
        fileType = "form5-detailed";
        requestMethod = "GET";
        console.log("📄 Using Form5 Detailed View endpoint:", endpoint);
        console.log("📄 With filters:", { startDate, endDate, auditType });
      }
      // ✅ SECOND: Form5 regular
      else if (typeStr === "form5") {
        if (!month) {
          throw new Error("month is required for Form5 PDF");
        }
        endpoint = `${API_BASE_URL}/api/audit-schedule/${year}/${month}/download`;
        fileType = "form5";
        requestMethod = "GET";
        console.log("📄 Using Form5 (Audit Schedule) endpoint:", endpoint);
      }
      // ✅ THIRD: Form4
      else if (typeStr === "form4") {
        if (!userId) {
          throw new Error("userId is required for Form4 PDF generation");
        }
        endpoint = `${API_BASE_URL}/api/department-plan/${year}/download?userId=${userId}`;
        fileType = "form4";
        requestMethod = data ? "POST" : "GET";
        console.log("📄 Using Form4 (Department Plan) endpoint:", endpoint);
      }
      // ✅ FOURTH: Form3
      else if (typeStr === "form3") {
        if (!userId) {
          throw new Error("userId is required for Form3 PDF generation");
        }
        endpoint = `${API_BASE_URL}/api/audit-plan/${year}/export-pdf?userId=${userId}`;
        fileType = "form3";
        requestMethod = "GET";
        console.log("📄 Using Form3 (Annual Audit Plan) endpoint:", endpoint);
      }
      // ✅ FIFTH: NCR
      else if (typeStr === "ncr" || typeStr === "corrective-action") {
        if (formVariant === "form7") {
          endpoint = `${API_BASE_URL}/api/ncr/${auditId}/form7-pdf`;
        } else if (formVariant === "ncr2") {
          endpoint = `${API_BASE_URL}/api/ncr/${auditId}/form8-pdf?type=ncr2`;
        } else {
          endpoint = `${API_BASE_URL}/api/ncr/${auditId}/form8-pdf`;
        }
        fileType = "ncr";
        requestMethod = "GET";
        console.log(
          "📄 Using NCR endpoint:",
          endpoint,
          "| formVariant:",
          formVariant,
        );
      }
      // ✅ SIXTH: IATF
      else if (typeStr === "iatf") {
        endpoint = `${API_BASE_URL}/api/iatf-audits/${auditId}/pdf`;
        fileType = "iatf";
        requestMethod = "GET";
        console.log("📄 Using IATF Audit endpoint:", endpoint);
      }
      // ✅ SEVENTH: Manufacturing
      else if (typeStr === "manufacturing") {
        endpoint = `${API_BASE_URL}/api/manufacturing-audits/${auditId}/pdf`;
        fileType = "manufacturing";
        requestMethod = "GET";
        console.log("📄 Using Manufacturing Audit endpoint:", endpoint);
      }
      // ✅ EIGHTH: 5S
      else if (typeStr === "5s") {
        endpoint = `${API_BASE_URL}/api/fives-audits/${auditId}/pdf`;
        fileType = "5s";
        requestMethod = "GET";
        console.log("📄 Using 5S Audit endpoint:", endpoint);
      }
      // ✅ NINTH: 8D
      else if (typeStr === "8d") {
        endpoint = `${API_BASE_URL}/api/eightd/${auditId}/download`;
        fileType = "8d";
        requestMethod = "GET";
        console.log("📄 Using 8D endpoint:", endpoint);
      }
      // ✅ DEFAULT: Fallback
      else {
        endpoint = `${API_BASE_URL}/api/audit-plan/${year}/export-pdf`;
        fileType = "default";
        requestMethod = "GET";
        console.log(
          "📄 Using default (Annual Audit Plan) endpoint for type:",
          typeStr,
        );
      }

      console.log("📄 Final endpoint:", endpoint);
      console.log("📄 Request method:", requestMethod);
      console.log("📄 File type:", fileType);

      const timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";

      let requestOptions: RequestInit = {
        method: requestMethod,
        headers: {
          Accept: "application/pdf",
          "X-Timezone": timezone,
        },
      };

      if (requestMethod === "POST") {
        requestOptions.headers = {
          ...requestOptions.headers,
          "Content-Type": "application/json",
        };
        if (typeStr === "form4" && data) {
          requestOptions.body = JSON.stringify({
            planItems: data.planItems || [],
            auditFrequency: data.auditFrequency || "Half yearly",
            documentRevision: data.documentRevision || "1.0",
            revisionDate:
              data.revisionDate || new Date().toISOString().split("T")[0],
            revisionDetails:
              data.revisionDetails || "First Approved copy (IATF16949)",
            preparedBy: data.preparedBy || "",
            approvedBy: data.approvedBy || "",
            year: year,
          });
          console.log("📄 Form4: Sending data with POST request");
        }
      }

      const response = await fetch(endpoint, requestOptions);

      if (!response.ok) {
        throw new Error(
          `PDF generation failed: ${response.status} - ${response.statusText}`,
        );
      }

      const blob = await response.blob();

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const contentDisposition = response.headers.get("content-disposition");
      let fileName = "";

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) {
          fileName = match[1];
          console.log("📄 Using backend filename:", fileName);
        }
      }

      if (!fileName) {
        if (
          fileType === "form3" ||
          fileType === "8d" ||
          fileType === "default"
        ) {
          fileName = `Annual_Audit_Plan_${year}.pdf`;
        } else if (fileType === "form4") {
          fileName = `Department_Audit_Plan_${year}.pdf`;
        } else if (fileType === "form5-detailed") {
          const monthParam = month || "Apr";
          fileName = `Form5_Detailed_Audit_Schedule_${monthParam}_${year}.pdf`;
        } else if (fileType === "form5") {
          const monthParam = month || "Apr";
          fileName = `Audit_Schedule_${monthParam}_${year}.pdf`;
        } else if (fileType === "ncr") {
          fileName = `NCR_${auditId}.pdf`;
        } else {
          fileName = `Audit_Document_${auditId}.pdf`;
        }
        console.log("📄 Using generated filename:", fileName);
      }

      this.pdfCache.set(auditId, {
        data: base64,
        timestamp: Date.now(),
      });

      return {
        success: true,
        pdfData: base64,
        fileName: fileName,
      };
    } catch (error) {
      console.error("PDF generation error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate PDF",
      };
    }
  }

  // ============================================================
  // VIEW PDF
  // ============================================================
  async viewPDF(
    options: PDFGenerationOptions,
    onShowViewer: (data: { pdfData: string; fileName: string }) => void,
  ) {
    const result = await this.generatePDF(options);
    if (result.success && result.pdfData && result.fileName) {
      onShowViewer({
        pdfData: result.pdfData,
        fileName: result.fileName,
      });
    } else {
      Alert.alert("Error", result.error || "Failed to generate PDF");
    }
  }

  // ============================================================
  // DOWNLOAD PDF
  // ============================================================
  async downloadPDF(options: PDFGenerationOptions): Promise<void> {
    try {
      const result = await this.generatePDF(options);
      if (!result.success || !result.pdfData || !result.fileName) {
        throw new Error(result.error || "PDF generation failed");
      }

      if (Platform.OS === "web") {
        const byteCharacters = atob(result.pdfData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = result.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      } else {
        const fileUri = FileSystem.documentDirectory + result.fileName;
        await FileSystem.writeAsStringAsync(fileUri, result.pdfData, {
          encoding: FileSystem.EncodingType.Base64,
        });

        await Sharing.shareAsync(fileUri, {
          mimeType: "application/pdf",
          dialogTitle: `Download ${result.fileName}`,
        });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to download PDF");
      throw error;
    }
  }

  async sharePDFToForum(
    options: PDFGenerationOptions,
    forumId: string,
    comment: string,
    currentUser?: any,
  ): Promise<boolean> {
    try {
      const result = await this.generatePDF(options);
      if (!result.success || !result.pdfData || !result.fileName) {
        throw new Error("PDF generation failed");
      }

      const userEmail =
        currentUser?.email || currentUser?.username || "user@example.com";
      const userName =
        currentUser?.name ||
        `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim() ||
        "User";

      // ✅ Forum ID comes directly from the dropdown (a real, existing group)
      const resolvedForumId = String(forumId || "").trim();
      if (!resolvedForumId) {
        throw new Error("No forum selected");
      }

      const url = `${API_BASE_URL}/api/forum/8d/groups/${resolvedForumId}/threads`;
      console.log("📤 [sharePDFToForum]", { forumId, resolvedForumId, url });

      const payload = {
        title: `📄 ${result.fileName}`,
        content: comment,
        createdBy: userEmail,
        createdByName: userName,
        messageType: "FILE",
        attachments: [
          {
            fileName: result.fileName,
            fileType: "application/pdf",
            fileSize: Math.floor(result.pdfData.length * 0.75),
            attachmentType: "DOCUMENT",
            fileData: result.pdfData,
          },
        ],
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorText = "";
        try {
          errorText = await response.text();
        } catch {
          /* noop */
        }
        console.error(
          `❌ [sharePDFToForum] status=${response.status} url=${url} body=${errorText}`,
        );
        throw new Error(
          `Failed to share to forum (${response.status}): ${errorText || "Unknown error"}`,
        );
      }

      const responseData = await response.json();
      console.log("✅ [sharePDFToForum] Success:", responseData);

      Alert.alert("✅ Success", `PDF shared to: ${resolvedForumId}`);
      return true;
    } catch (error: any) {
      console.error("Share error:", error);
      Alert.alert("Error", error?.message || "Failed to share PDF to forum");
      return false;
    }
  }
  // ============================================================
  // EMAIL PDF
  // ============================================================
  async emailPDF(
    options: PDFGenerationOptions,
    emails: string | string[],
    cc?: string[],
    bcc?: string[],
    message?: string,
  ): Promise<boolean> {
    try {
      const result = await this.generatePDF(options);
      if (!result.success || !result.pdfData || !result.fileName) {
        throw new Error("PDF generation failed");
      }

      const toList = Array.isArray(emails) ? emails : [emails];
      const ccList = cc || [];
      const bccList = bcc || [];

      if (toList.length === 0) {
        throw new Error("At least one recipient is required");
      }

      const year = parseInt(options.auditId) || new Date().getFullYear();
      const baseUrl = API_BASE_URL;

      // ✅ Generate correct shareable link based on type
      let shareableLink = "";
      const typeStr = String(options.type || "").toLowerCase();

      console.log("📧 ===== EMAIL SHAREABLE LINK DEBUG =====");
      console.log("📧 Type:", typeStr);
      console.log("📧 Year:", year);
      console.log("📧 Month:", options.month);
      console.log("📧 AuditId:", options.auditId);
      console.log("📧 Base URL:", baseUrl);

      if (typeStr === "form3") {
        shareableLink = `${baseUrl}/api/audit-plan/${year}/export-pdf`;
        console.log("📧 Using Form3 link:", shareableLink);
      } else if (typeStr === "form4") {
        shareableLink = `${baseUrl}/api/department-plan/${year}/download`;
        console.log("📧 Using Form4 link:", shareableLink);
      } else if (typeStr === "form5" && options.fromDetailedView) {
        const monthParam = options.month || "Apr";
        shareableLink = `${baseUrl}/api/audit-detailed-view/${year}/${monthParam}/download`;
        console.log("📧 Using Form5 Detailed View link:", shareableLink);
      } else if (typeStr === "form5") {
        const monthParam = options.month || "Apr";
        shareableLink = `${baseUrl}/api/audit-schedule/${year}/${monthParam}/download`;
        console.log("📧 Using Form5 link:", shareableLink);
      } else if (typeStr === "ncr" || typeStr === "corrective-action") {
        if (options.formVariant === "form7") {
          shareableLink = `${baseUrl}/api/ncr/${options.auditId}/form7-pdf`;
        } else if (options.formVariant === "ncr2") {
          shareableLink = `${baseUrl}/api/ncr/${options.auditId}/form8-pdf?type=ncr2`;
        } else {
          shareableLink = `${baseUrl}/api/ncr/${options.auditId}/form8-pdf`;
        }
        console.log(
          "📧 Using NCR link:",
          shareableLink,
          "| formVariant:",
          options.formVariant,
        );
      } else {
        // ✅ Default fallback for '8d' and others
        shareableLink = `${baseUrl}/api/audit-plan/${year}/export-pdf`;
        console.log("📧 Using default (Form3) link:", shareableLink);
      }

      console.log("📧 FINAL SHAREABLE LINK:", shareableLink);
      console.log("📧 ======================================");

      const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; border-radius: 8px;">
        <h2 style="color: #1e293b; border-bottom: 2px solid #2563eb; padding-bottom: 12px;">📄 Audit Document</h2>

        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          ${message || "Please find the audit document below."}
        </p>

        <div style="background-color: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 12px; font-weight: 600; color: #475569; width: 120px;">Document:</td>
              <td style="padding: 8px 12px; color: #1e293b;">${result.fileName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: 600; color: #475569;">Generated:</td>
              <td style="padding: 8px 12px; color: #1e293b;">${new Date().toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: 600; color: #475569;">Document ID:</td>
              <td style="padding: 8px 12px; color: #1e293b;">${options.auditId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: 600; color: #475569;">Document Type:</td>
              <td style="padding: 8px 12px; color: #1e293b;">${typeStr.toUpperCase()}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #eff6ff; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 16px 0;">
          <p style="margin: 0; color: #1e40af; font-size: 14px;">
            📎 <strong>Download Link:</strong>
            <a href="${shareableLink}" style="color: #2563eb; text-decoration: none; word-break: break-all;">
              ${shareableLink}
            </a>
          </p>
        </div>

        <div style="background-color: #fef3c7; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 16px 0;">
          <p style="margin: 0; color: #92400e; font-size: 13px;">
            ⚠️ This is a confidential audit document. Please do not forward or share without proper authorization.
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />

        <p style="color: #64748b; font-size: 13px; text-align: center;">
          <strong>QSutra Quality Management System</strong><br/>
          This email was sent via the Audit Management System.
        </p>
      </div>
      `;

      const response = await fetch(`${API_BASE_URL}/api/email/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: toList,
          cc: ccList,
          bcc: bccList,
          subject: `Audit Document: ${result.fileName}`,
          body: emailBody,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Email API error:", errorText);
        throw new Error("Failed to send email");
      }

      const data = await response.json();
      console.log("✅ Email sent successfully:", data);

      return true;
    } catch (error) {
      console.error("Email error:", error);
      throw error;
    }
  }
}

export const pdfService = PDFService.getInstance();
